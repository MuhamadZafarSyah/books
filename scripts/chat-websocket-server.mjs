import crypto from "node:crypto";
import http from "node:http";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Redis } from "@upstash/redis";
import pg from "pg";
import { WebSocket, WebSocketServer } from "ws";

const port = Number(process.env.CHAT_WS_PORT || 3001);
const internalSecret = process.env.CHAT_WS_INTERNAL_SECRET || "dev-chat-secret";
const authSecret = process.env.AUTH_SECRET || internalSecret;
const flushIntervalMs = 10_000;
const maxMessageLength = 2000;
const recentMessageLimit = 50;
const onlineTtlSeconds = 90;
const typingTtlSeconds = 8;

const { Pool } = pg;
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
const prisma = pool ? new PrismaClient({ adapter: new PrismaPg(pool) }) : null;
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const rooms = new Map();
const clients = new Set();
const pendingMessages = [];
const pendingClientIds = new Set();
let flushingMessages = false;

function keyConversationRecent(conversationId) {
  return `chat:conversation:${conversationId}:recent`;
}

function keyTyping(conversationId, userId) {
  return `chat:conversation:${conversationId}:typing:${userId}`;
}

function keyUserOnline(userId) {
  return `chat:user:${userId}:online`;
}

function keyUserUnread(userId) {
  return `chat:user:${userId}:unread`;
}

function keyActiveConversations() {
  return "chat:conversations:active";
}

async function cacheRecentMessage(message) {
  if (!redis) return;

  const key = keyConversationRecent(message.conversationId);
  await redis.lpush(key, JSON.stringify(message));
  await redis.ltrim(key, 0, recentMessageLimit - 1);
  await redis.expire(key, 60 * 60 * 24 * 7);
}

async function setTyping(conversationId, userId, isTyping) {
  if (!redis) return;

  const key = keyTyping(conversationId, userId);
  if (isTyping) {
    await redis.set(key, "1", { ex: typingTtlSeconds });
    return;
  }

  await redis.del(key);
}

async function setUserOnline(userId) {
  if (!redis) return;

  await redis.set(keyUserOnline(userId), "1", { ex: onlineTtlSeconds });
}

async function incrementUnread(userId, conversationId) {
  if (!redis) return;

  await redis.hincrby(keyUserUnread(userId), conversationId, 1);
}

async function markConversationActive(conversationId, createdAt) {
  if (!redis) return;

  const key = keyActiveConversations();
  await redis.zadd(key, { score: createdAt.getTime(), member: conversationId });
  await redis.expire(key, 60 * 60 * 24 * 7);
}

async function updateRealtimeCaches(message, participantIds) {
  const otherParticipantIds = participantIds.filter((userId) => userId !== message.senderId);
  const results = await Promise.allSettled([
    cacheRecentMessage(message),
    setTyping(message.conversationId, message.senderId, false),
    markConversationActive(message.conversationId, new Date(message.createdAt)),
    ...otherParticipantIds.map((userId) => incrementUnread(userId, message.conversationId)),
  ]);

  for (const result of results) {
    if (result.status === "rejected") console.error("Realtime chat cache update failed", result.reason);
  }
}

function maxDate(dates) {
  return dates.reduce((latest, date) => date > latest ? date : latest, dates[0]);
}

async function flushPendingMessages() {
  if (!prisma || pendingMessages.length === 0 || flushingMessages) return;

  flushingMessages = true;
  const batch = pendingMessages.splice(0, pendingMessages.length);

  try {
    await prisma.$transaction(async (tx) => {
      const lastMessageByConversation = new Map();

      for (const pending of batch) {
        const message = await tx.chatMessage.upsert({
          where: { clientId: pending.clientId },
          update: {},
          create: {
            id: pending.id,
            conversationId: pending.conversationId,
            senderId: pending.senderId,
            body: pending.body,
            clientId: pending.clientId,
            createdAt: pending.createdAt,
          },
          select: { id: true, conversationId: true, createdAt: true },
        });

        await tx.chatMessageRead.upsert({
          where: {
            messageId_userId: {
              messageId: message.id,
              userId: pending.senderId,
            },
          },
          update: {},
          create: {
            messageId: message.id,
            userId: pending.senderId,
          },
        });

        const existingDates = lastMessageByConversation.get(message.conversationId) ?? [];
        existingDates.push(message.createdAt);
        lastMessageByConversation.set(message.conversationId, existingDates);
      }

      for (const [conversationId, dates] of lastMessageByConversation) {
        const lastMessageAt = maxDate(dates);
        await tx.chatConversation.updateMany({
          where: {
            id: conversationId,
            OR: [{ lastMessageAt: null }, { lastMessageAt: { lt: lastMessageAt } }],
          },
          data: { lastMessageAt },
        });
      }
    });

    for (const message of batch) {
      pendingClientIds.delete(message.clientId);
    }
  } catch (error) {
    pendingMessages.unshift(...batch);
    console.error("Failed to flush chat messages", error);
  } finally {
    flushingMessages = false;
  }
}

setInterval(() => {
  void flushPendingMessages();
}, flushIntervalMs).unref();

function signPayload(payload) {
  return crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");
}

function verifyToken(token) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.userId || !Array.isArray(parsed.conversationIds) || Date.now() > parsed.exp) return null;
    if (!parsed.rooms || typeof parsed.rooms !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function addToRoom(conversationId, socket) {
  if (!rooms.has(conversationId)) rooms.set(conversationId, new Set());
  rooms.get(conversationId).add(socket);
}

function removeSocket(socket) {
  clients.delete(socket);
  for (const sockets of rooms.values()) {
    sockets.delete(socket);
  }
}

function broadcast(event) {
  const payload = JSON.stringify(event);
  const targetSockets = event.conversationId ? rooms.get(event.conversationId) : clients;

  if (!targetSockets) return;

  for (const socket of targetSockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  }
}

function sendSocketEvent(socket, event) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(event));
  }
}

function sendMessageFailure(socket, event, reason) {
  sendSocketEvent(socket, {
    type: "message.failed",
    conversationId: typeof event.conversationId === "string" ? event.conversationId : "",
    clientId: typeof event.clientId === "string" ? event.clientId : "",
    reason,
  });
}

function getRoomParticipantIds(socket, conversationId) {
  const participantIds = socket.roomParticipants?.[conversationId];
  if (!Array.isArray(participantIds) || !participantIds.includes(socket.userId)) return null;

  return participantIds;
}

function handleMessageSend(socket, event) {
  if (typeof event.conversationId !== "string" || !socket.conversationIds?.has(event.conversationId)) {
    sendMessageFailure(socket, event, "Conversation not found.");
    return;
  }

  const participantIds = getRoomParticipantIds(socket, event.conversationId);
  if (!participantIds) {
    sendMessageFailure(socket, event, "Conversation not found.");
    return;
  }

  const body = typeof event.body === "string" ? event.body.trim() : "";
  const clientId = typeof event.clientId === "string" ? event.clientId.trim() : "";

  if (!body) {
    sendMessageFailure(socket, event, "Message cannot be empty.");
    return;
  }

  if (body.length > maxMessageLength) {
    sendMessageFailure(socket, event, "Message is too long.");
    return;
  }

  if (!clientId || clientId.length > 100) {
    sendMessageFailure(socket, event, "Invalid message id.");
    return;
  }

  if (pendingClientIds.has(clientId)) {
    return;
  }

  const createdAt = new Date();
  const message = {
    id: crypto.randomUUID(),
    conversationId: event.conversationId,
    senderId: socket.userId,
    senderName: socket.userName ?? null,
    body,
    type: "TEXT",
    createdAt: createdAt.toISOString(),
    clientId,
  };

  if (prisma) {
    pendingClientIds.add(clientId);
    pendingMessages.push({ ...message, createdAt });
  }
  broadcast({ type: "message.created", conversationId: message.conversationId, message });
  void updateRealtimeCaches(message, participantIds);
}

const server = http.createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/broadcast") {
    response.writeHead(404);
    response.end();
    return;
  }

  if (request.headers["x-chat-secret"] !== internalSecret) {
    response.writeHead(401);
    response.end();
    return;
  }

  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
  });
  request.on("end", () => {
    try {
      broadcast(JSON.parse(body));
      response.writeHead(204);
      response.end();
    } catch {
      response.writeHead(400);
      response.end();
    }
  });
});

const wss = new WebSocketServer({ server, path: "/chat" });

wss.on("connection", (socket, request) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  const token = url.searchParams.get("token");
  const session = verifyToken(token);

  if (!session) {
    socket.close(1008, "Invalid chat token");
    return;
  }

  socket.userId = session.userId;
  socket.userName = session.userName ?? null;
  socket.conversationIds = new Set(session.conversationIds);
  socket.roomParticipants = session.rooms;
  clients.add(socket);
  for (const conversationId of session.conversationIds) {
    addToRoom(conversationId, socket);
  }

  void setUserOnline(session.userId).catch((error) => console.error("setUserOnline failed", error));
  broadcast({ type: "presence.updated", userId: session.userId, online: true });
  socket.send(JSON.stringify({ type: "socket.ready", userId: session.userId }));

  socket.on("message", (raw) => {
    try {
      const event = JSON.parse(raw.toString());
      if (event.type === "ping") {
        socket.send(JSON.stringify({ type: "pong", ts: Date.now() }));
      }
      if (
        event.type === "typing.update" &&
        typeof event.conversationId === "string" &&
        socket.conversationIds?.has(event.conversationId)
      ) {
        void setTyping(event.conversationId, socket.userId, Boolean(event.isTyping))
          .catch((error) => console.error("setTyping failed", error));
        broadcast({
          type: "typing.updated",
          conversationId: event.conversationId,
          userId: socket.userId,
          isTyping: Boolean(event.isTyping),
        });
      }
      if (event.type === "message.send") {
        handleMessageSend(socket, event);
      }
    } catch {
      // Ignore malformed client events.
    }
  });

  socket.on("close", () => removeSocket(socket));
  socket.on("error", () => removeSocket(socket));
});

server.listen(port, () => {
  console.log(`Shelfgram chat WebSocket server listening on ws://localhost:${port}/chat`);
  if (!prisma) console.warn("DATABASE_URL is missing; chat messages will not be persisted.");
  if (!redis) console.warn("Upstash Redis is not configured; recent, unread, presence, and typing caches are disabled.");
});

async function shutdown() {
  await flushPendingMessages();
  server.close();
  await prisma?.$disconnect();
  await pool?.end();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
