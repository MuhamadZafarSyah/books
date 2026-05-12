"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getChatSocketAccess } from "@/actions/chat";
import type { ChatClientSocketEvent, ChatSocketEvent } from "@/lib/chat/types";

type SocketStatus = "disabled" | "connecting" | "open" | "closed";

function isChatSocketEvent(event: unknown): event is ChatSocketEvent {
  if (!event || typeof event !== "object" || !("type" in event)) return false;
  const type = (event as { type: string }).type;
  return type === "message.created" || type === "message.failed" || type === "typing.updated" || type === "presence.updated" || type === "conversation.read";
}

export function useChatSocket({
  conversationIds,
  onEvent,
}: {
  conversationIds: string[];
  onEvent: (event: ChatSocketEvent) => void;
}) {
  const [status, setStatus] = useState<SocketStatus>("disabled");
  const socketRef = useRef<WebSocket | null>(null);
  const conversationKey = useMemo(() => [...conversationIds].sort().join("|"), [conversationIds]);

  useEffect(() => {
    if (!conversationKey) {
      return;
    }

    let socket: WebSocket | null = null;
    let cancelled = false;

    async function connect() {
      setStatus("connecting");
      const access = await getChatSocketAccess(conversationKey.split("|").filter(Boolean));

      if (cancelled || !access.socketUrl) {
        return;
      }

      const url = new URL(access.socketUrl);
      url.searchParams.set("token", access.token);

      socket = new WebSocket(url.toString());
      socketRef.current = socket;
      socket.onopen = () => setStatus("open");
      socket.onclose = () => setStatus("closed");
      socket.onerror = () => setStatus("closed");
      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as unknown;
          if (isChatSocketEvent(event)) {
            onEvent(event);
          }
        } catch {
          // Ignore malformed socket payloads.
        }
      };
    }

    void connect();

    return () => {
      cancelled = true;
      socketRef.current = null;
      socket?.close();
    };
  }, [conversationKey, onEvent]);

  const send = useCallback((event: ChatClientSocketEvent) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;

    socket.send(JSON.stringify(event));
    return true;
  }, []);

  return {
    send,
    status: conversationKey ? status : "disabled",
  };
}
