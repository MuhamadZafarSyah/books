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
 * Trigger a Pusher event scoped to a single conversation channel. Failures
 * are logged but never propagated so DB writes that already succeeded are
 * not rolled back by transient broadcast errors.
 */
export async function triggerConversationEvent(
  conversationId: string,
  event: ChatSocketEvent,
) {
  const pusher = getPusherServer();
  if (!pusher) return;

  const channel = conversationChannelName(conversationId);
  try {
    await pusher.trigger(channel, event.type, event);
  } catch (error) {
    console.error(`[pusher] triggerConversationEvent failed (${channel})`, error);
  }
}

/**
 * Trigger an event on every conversation channel in the list. Used for
 * app-wide updates (e.g. presence) that should reach all open chat rooms.
 */
export async function triggerUserConversations(
  conversationIds: string[],
  event: ChatSocketEvent,
) {
  const pusher = getPusherServer();
  if (!pusher) return;

  const channels = [...new Set(conversationIds)]
    .filter(Boolean)
    .map(conversationChannelName);
  if (channels.length === 0) return;

  try {
    await pusher.trigger(channels, event.type, event);
  } catch (error) {
    console.error("[pusher] triggerUserConversations failed", error);
  }
}

/**
 * Notify each user's private inbox channel that a new message arrived for
 * one of their conversations, even if they have not yet opened that room.
 * This is the safety net that keeps unread counts and previews in sync when
 * the receiver has not subscribed to the conversation channel yet.
 */
export async function triggerUserInboxInvalidation(userIds: string[]) {
  const pusher = getPusherServer();
  if (!pusher) return;

  const channels = [...new Set(userIds)]
    .filter(Boolean)
    .map(userChannelName);
  if (channels.length === 0) return;

  try {
    await pusher.trigger(channels, "chat.bootstrap.invalidated", { ts: Date.now() });
  } catch (error) {
    console.error("[pusher] triggerUserInboxInvalidation failed", error);
  }
}

/**
 * Push the full message payload to every participant's private inbox
 * channel. This complements the conversation-scoped broadcast: if the
 * receiver has not yet subscribed to `presence-conversation-<id>` they will
 * still get the message via their always-on `private-user-<id>` channel.
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
