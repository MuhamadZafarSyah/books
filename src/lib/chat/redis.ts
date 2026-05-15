import { Redis } from "@upstash/redis";

import type { ChatMessageSummary } from "@/lib/chat/types";

const RECENT_MESSAGE_LIMIT = 50;
const ONLINE_TTL_SECONDS = 90;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function keyConversationRecent(conversationId: string) {
  return `chat:conversation:${conversationId}:recent`;
}

function keyUserOnline(userId: string) {
  return `chat:user:${userId}:online`;
}

function keyUserUnread(userId: string) {
  return `chat:user:${userId}:unread`;
}

function keyActiveConversations() {
  return "chat:conversations:active";
}

export async function cacheRecentMessage(message: ChatMessageSummary) {
  if (!redis) return;

  try {
    const key = keyConversationRecent(message.conversationId);
    await redis.lpush(key, JSON.stringify(message));
    await redis.ltrim(key, 0, RECENT_MESSAGE_LIMIT - 1);
    await redis.expire(key, 60 * 60 * 24 * 7);
  } catch (error) {
    console.error("cacheRecentMessage failed", error);
  }
}

export async function getRecentMessages(conversationId: string): Promise<ChatMessageSummary[]> {
  if (!redis) return [];

  try {
    const rawMessages = await redis.lrange<string>(keyConversationRecent(conversationId), 0, RECENT_MESSAGE_LIMIT - 1);
    return rawMessages
      .map((message) => {
        try {
          return JSON.parse(message) as ChatMessageSummary;
        } catch {
          return null;
        }
      })
      .filter((message): message is ChatMessageSummary => Boolean(message))
      .reverse();
  } catch (error) {
    console.error("getRecentMessages failed", error);
    return [];
  }
}

export async function setUserOnline(userId: string) {
  if (!redis) return;

  try {
    await redis.set(keyUserOnline(userId), "1", { ex: ONLINE_TTL_SECONDS });
  } catch (error) {
    console.error("setUserOnline failed", error);
  }
}

export async function getOnlineUserIds(userIds: string[]) {
  if (!redis || userIds.length === 0) return new Set<string>();

  try {
    const values = await Promise.all(userIds.map((userId) => redis.get(keyUserOnline(userId))));
    return new Set(userIds.filter((userId, index) => Boolean(values[index])));
  } catch (error) {
    console.error("getOnlineUserIds failed", error);
    return new Set<string>();
  }
}

export async function incrementUnread(userId: string, conversationId: string) {
  if (!redis) return;

  try {
    await redis.hincrby(keyUserUnread(userId), conversationId, 1);
  } catch (error) {
    console.error("incrementUnread failed", error);
  }
}

export async function clearUnread(userId: string, conversationId: string) {
  if (!redis) return;

  try {
    await redis.hdel(keyUserUnread(userId), conversationId);
  } catch (error) {
    console.error("clearUnread failed", error);
  }
}

export async function getUnreadCounts(userId: string): Promise<Record<string, number>> {
  if (!redis) return {};

  try {
    const counts = await redis.hgetall<Record<string, string | number>>(keyUserUnread(userId));
    if (!counts) return {};

    return Object.fromEntries(
      Object.entries(counts).map(([conversationId, value]) => [conversationId, Number(value) || 0]),
    );
  } catch (error) {
    console.error("getUnreadCounts failed", error);
    return {};
  }
}

export async function markConversationActive(conversationId: string, lastMessageAt: Date) {
  if (!redis) return;

  try {
    const key = keyActiveConversations();
    await redis.zadd(key, { score: lastMessageAt.getTime(), member: conversationId });
    await redis.expire(key, 60 * 60 * 24 * 7);
  } catch (error) {
    console.error("markConversationActive failed", error);
  }
}
