"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Channel, PresenceChannel } from "pusher-js";

import { sendConversationMessage } from "@/actions/chat";
import {
  getPusherClient,
  isPusherClientConfigured,
} from "@/lib/chat/pusher-client";
import type {
  ChatClientSocketEvent,
  ChatMessageSummary,
  ChatSocketEvent,
} from "@/lib/chat/types";

type SocketStatus = "disabled" | "connecting" | "open" | "closed";

const TYPING_EVENT = "client-typing";
const MESSAGE_CREATED_EVENT = "message.created";

function conversationChannelName(conversationId: string) {
  return `presence-conversation-${conversationId}`;
}

function userChannelName(userId: string) {
  return `private-user-${userId}`;
}

type PresenceMember = {
  id: string;
  info?: unknown;
};

type PresenceMembers = {
  count: number;
  members: Record<string, unknown>;
  myID: string;
  each: (callback: (member: PresenceMember) => void) => void;
};

type TypingPayload = {
  conversationId?: unknown;
  userId?: unknown;
  isTyping?: unknown;
};

type SubscriptionError = {
  status?: number;
  error?: string;
  type?: string;
};

/**
 * Realtime hook backed by Pusher Channels.
 *
 * Channel responsibilities are split to keep Pusher event volume minimal:
 *
 * - `private-user-<id>` (always-on inbox)
 *     Receives every `message.created` event for any conversation the user
 *     participates in. This is the single broadcast path so receivers get
 *     new messages whether or not they have the conversation open.
 *
 * - `presence-conversation-<id>` (per-conversation presence)
 *     Used only for transient state: presence membership (online/offline)
 *     and `client-typing` events. No DB-backed events run here, so each
 *     trigger costs just one Pusher message.
 */
export function useChatSocket({
  conversationIds,
  currentUserId,
  onEvent,
  onBootstrapInvalidated,
}: {
  conversationIds: string[];
  currentUserId?: string;
  onEvent: (event: ChatSocketEvent) => void;
  /**
   * Reserved for callers that want to refetch chat bootstrap when realtime
   * tells them their cached state is stale. Currently unused — the new
   * single-broadcast model keeps state in sync via `message.created` only.
   */
  onBootstrapInvalidated?: () => void;
}) {
  const conversationKey = useMemo(
    () => [...conversationIds].sort().join("|"),
    [conversationIds],
  );
  const userKey = currentUserId?.trim() ?? "";
  const userKeyRef = useRef(userKey);
  useEffect(() => {
    userKeyRef.current = userKey;
  }, [userKey]);

  const channelsRef = useRef<Map<string, Channel>>(new Map());
  const onlineUsersRef = useRef<Map<string, Set<string>>>(new Map());
  const onEventRef = useRef(onEvent);
  const onBootstrapInvalidatedRef = useRef(onBootstrapInvalidated);

  const [status, setStatus] = useState<SocketStatus>(() => {
    if (!conversationKey && !userKey) return "disabled";
    if (!isPusherClientConfigured()) return "disabled";
    if (typeof window === "undefined") return "connecting";
    const pusher = getPusherClient();
    if (!pusher) return "disabled";
    return pusher.connection.state === "connected" ? "open" : "connecting";
  });

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onBootstrapInvalidatedRef.current = onBootstrapInvalidated;
  }, [onBootstrapInvalidated]);

  useEffect(() => {
    if (!conversationKey && !userKey) return;
    if (!isPusherClientConfigured()) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const ids = conversationKey.split("|").filter(Boolean);
    const channelsMap = channelsRef.current;
    const onlineUsersMap = onlineUsersRef.current;
    const userChannelKey = userKey ? userChannelName(userKey) : null;

    const handleConnectionState = (state: { current: string }) => {
      if (state.current === "connected") setStatus("open");
      else if (state.current === "connecting" || state.current === "initialized") setStatus("connecting");
      else setStatus("closed");
    };
    pusher.connection.bind("state_change", handleConnectionState);

    const handleConnectionError = (error: unknown) => {
      console.error("[chat] Pusher connection error", error);
      setStatus("closed");
    };
    pusher.connection.bind("error", handleConnectionError);

    const emit = (event: ChatSocketEvent) => onEventRef.current(event);

    const logSubscriptionError = (scope: string, error: SubscriptionError) => {
      console.error(`[chat] Pusher subscription error (${scope})`, error);
    };

    const aggregatePresence = (userId: string) => {
      let online = false;
      for (const peers of onlineUsersMap.values()) {
        if (peers.has(userId)) {
          online = true;
          break;
        }
      }
      emit({ type: "presence.updated", userId, online });
    };

    const handleSubscriptionSucceeded = (
      conversationId: string,
      members: PresenceMembers,
    ) => {
      const peers = new Set<string>();
      members.each((member) => {
        if (typeof member.id === "string" && member.id.length > 0) {
          peers.add(member.id);
        }
      });
      onlineUsersMap.set(conversationId, peers);
      for (const userId of peers) aggregatePresence(userId);
    };

    const handleMemberAdded = (conversationId: string, member: PresenceMember) => {
      if (typeof member.id !== "string" || member.id.length === 0) return;
      const peers = onlineUsersMap.get(conversationId) ?? new Set<string>();
      peers.add(member.id);
      onlineUsersMap.set(conversationId, peers);
      aggregatePresence(member.id);
    };

    const handleMemberRemoved = (conversationId: string, member: PresenceMember) => {
      if (typeof member.id !== "string" || member.id.length === 0) return;
      const peers = onlineUsersMap.get(conversationId);
      if (peers) peers.delete(member.id);
      aggregatePresence(member.id);
    };

    const handleMessageCreated = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const data = payload as {
        conversationId?: unknown;
        message?: ChatMessageSummary;
      };
      if (typeof data.conversationId !== "string") return;
      if (!data.message || typeof data.message !== "object") return;
      emit({
        type: "message.created",
        conversationId: data.conversationId,
        message: data.message,
      });
    };

    const handleTyping = (conversationId: string, payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const data = payload as TypingPayload;
      if (typeof data.userId !== "string") return;
      emit({
        type: "typing.updated",
        conversationId,
        userId: data.userId,
        isTyping: Boolean(data.isTyping),
      });
    };

    // 1) Always-on inbox channel: single source of truth for `message.created`.
    let userChannel: Channel | null = null;
    if (userChannelKey) {
      userChannel = pusher.subscribe(userChannelKey);
      userChannel.bind("pusher:subscription_error", (error: SubscriptionError) =>
        logSubscriptionError(userChannelKey, error),
      );
      userChannel.bind(MESSAGE_CREATED_EVENT, handleMessageCreated);
    }

    // 2) Per-conversation presence channels: presence + typing only.
    for (const conversationId of ids) {
      const name = conversationChannelName(conversationId);
      const channel = pusher.subscribe(name) as PresenceChannel;
      channelsMap.set(conversationId, channel);

      channel.bind("pusher:subscription_error", (error: SubscriptionError) =>
        logSubscriptionError(name, error),
      );
      channel.bind("pusher:subscription_succeeded", (members: PresenceMembers) =>
        handleSubscriptionSucceeded(conversationId, members),
      );
      channel.bind("pusher:member_added", (member: PresenceMember) =>
        handleMemberAdded(conversationId, member),
      );
      channel.bind("pusher:member_removed", (member: PresenceMember) =>
        handleMemberRemoved(conversationId, member),
      );
      channel.bind(TYPING_EVENT, (payload: unknown) =>
        handleTyping(conversationId, payload),
      );
    }

    return () => {
      pusher.connection.unbind("state_change", handleConnectionState);
      pusher.connection.unbind("error", handleConnectionError);

      if (userChannelKey && userChannel) {
        userChannel.unbind_all();
        pusher.unsubscribe(userChannelKey);
      }

      for (const conversationId of ids) {
        const name = conversationChannelName(conversationId);
        const channel = channelsMap.get(conversationId);
        channel?.unbind_all();
        pusher.unsubscribe(name);
        channelsMap.delete(conversationId);
        onlineUsersMap.delete(conversationId);
      }
    };
  }, [conversationKey, userKey]);

  const send = useCallback((event: ChatClientSocketEvent) => {
    if (event.type === "ping") return true;

    if (event.type === "typing.update") {
      const channel = channelsRef.current.get(event.conversationId);
      if (!channel) return false;
      const senderUserId = userKeyRef.current;
      if (!senderUserId) return false;
      try {
        return channel.trigger(TYPING_EVENT, {
          conversationId: event.conversationId,
          userId: senderUserId,
          isTyping: event.isTyping,
        });
      } catch (error) {
        console.error("[chat] typing trigger failed", error);
        return false;
      }
    }

    if (event.type === "message.send") {
      const { conversationId, body, clientId } = event;
      sendConversationMessage(conversationId, body, clientId)
        .then((result) => {
          if (result.ok) {
            // Reconcile the optimistic bubble even if the realtime broadcast
            // did not reach this tab (e.g. Pusher disabled, network blip).
            onEventRef.current({
              type: "message.created",
              conversationId,
              message: result.message,
            });
          } else {
            onEventRef.current({
              type: "message.failed",
              conversationId,
              clientId,
              reason: result.error,
            });
          }
        })
        .catch((error) => {
          console.error("[chat] sendConversationMessage failed", error);
          onEventRef.current({
            type: "message.failed",
            conversationId,
            clientId,
            reason: "Gagal mengirim pesan.",
          });
        });
      return true;
    }

    return false;
  }, []);

  return {
    send,
    status: conversationKey || userKey ? status : "disabled",
  };
}
