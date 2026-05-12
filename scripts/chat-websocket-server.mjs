import crypto from "node:crypto";
import http from "node:http";
import { WebSocketServer } from "ws";

const port = Number(process.env.CHAT_WS_PORT || 3001);
const internalSecret = process.env.CHAT_WS_INTERNAL_SECRET || "dev-chat-secret";
const authSecret = process.env.AUTH_SECRET || internalSecret;

const rooms = new Map();
const clients = new Set();

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
    if (socket.readyState === socket.OPEN) {
      socket.send(payload);
    }
  }
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
  socket.conversationIds = new Set(session.conversationIds);
  clients.add(socket);
  for (const conversationId of session.conversationIds) {
    addToRoom(conversationId, socket);
  }

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
        broadcast({
          type: "typing.updated",
          conversationId: event.conversationId,
          userId: socket.userId,
          isTyping: Boolean(event.isTyping),
        });
      }
    } catch {
      // Ignore malformed client events; writes happen through Server Actions.
    }
  });

  socket.on("close", () => removeSocket(socket));
  socket.on("error", () => removeSocket(socket));
});

server.listen(port, () => {
  console.log(`Shelfgram chat WebSocket server listening on ws://localhost:${port}/chat`);
});
