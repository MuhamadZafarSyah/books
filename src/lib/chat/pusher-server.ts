import "server-only";

import Pusher from "pusher";

import { getPusherServerConfig } from "@/lib/chat/pusher-config";
import type { ChatSocketEvent } from "@/lib/chat/types";

type PresenceAuthUser = {
  user_id: string;
  user_info: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

const warnedConfigErrors = new Set<string>();
let cachedPusher: Pusher | null = null;

function reportConfigError(message: string) {
  if (warnedConfigErrors.has(message)) return;
  warnedConfigErrors.add(message);
  console.error(message);
}

/**
 * Lazily build the singleton Pusher Node SDK instance.
 * Returns `null` when credentials are not configured so callers can no-op.
 */
export function getPusherServer(): Pusher | null {
  if (cachedPusher) return cachedPusher;

  const config = getPusherServerConfig();
  if (!config) {
    reportConfigError(
      '[pusher] Missing or invalid config. Set PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, and a valid PUSHER_CLUSTER like "ap1".',
    );
    return null;
  }

  cachedPusher = new Pusher({
    appId: config.appId,
    key: config.key,
    secret: config.secret,
    cluster: config.cluster,
    useTLS: true,
  });
  return cachedPusher;
}

export function isPusherConfigured() {
  return getPusherServerConfig() !== null;
}

export function conversationChannelName(conversationId: string) {
  return `presence-conversation-${conversationId}`;
}

export function userChannelName(userId: string) {
  return `private-user-${userId}`;
}

export function authorizePresenceChannel(
  socketId: string,
  channelName: string,
  user: PresenceAuthUser,
) {
  const pusher = getPusherServer();
  if (!pusher) return null;

  return pusher.authorizeChannel(socketId, channelName, {
    user_id: user.user_id,
    user_info: user.user_info,
  });
}

export function authorizePrivateChannel(socketId: string, channelName: string) {
  const pusher = getPusherServer();
  if (!pusher) return null;

  return pusher.authorizeChannel(socketId, channelName);
}

/**
 * Push the given event to every participant's private inbox channel
 * (`private-user-<id>`). This is the single broadcast path for chat events
 * that all participants should receive — it works even when a participant
 * has not subscribed to the conversation's presence channel yet (e.g. they
 * have the chat list open but not the specific room).
 *
 * Conversation-level presence channels are reserved for transient state:
 * presence membership and `client-typing` events.
 */
export async function triggerUserInboxMessage(
  userIds: string[],
  event: Extract<ChatSocketEvent, { type: "message.created" }>,
) {
  const pusher = getPusherServer();
  if (!pusher) return;

  const channels = [...new Set(userIds)]
    .filter(Boolean)
    .map(userChannelName);
  if (channels.length === 0) return;

  try {
    await pusher.trigger(channels, event.type, event);
  } catch (error) {
    console.error("[pusher] triggerUserInboxMessage failed", error);
  }
}
