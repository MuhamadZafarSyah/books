"use client";

import PusherClient from "pusher-js";

import { getPusherClientConfig } from "@/lib/chat/pusher-config";

let cachedClient: PusherClient | null = null;
let warnedMissingConfig = false;

export function isPusherClientConfigured() {
  return getPusherClientConfig() !== null;
}

/**
 * Lazily build the singleton Pusher browser client. Returns `null` if Pusher
 * env vars are not configured, so callers can fall back to a "standby" UI.
 *
 * One shared client is reused across all subscriptions per tab to keep a
 * single websocket connection to Pusher (per their best practice).
 */
export function getPusherClient(): PusherClient | null {
  if (typeof window === "undefined") return null;
  if (cachedClient) return cachedClient;

  const config = getPusherClientConfig();
  if (!config) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.error(
        "[pusher] NEXT_PUBLIC_PUSHER_KEY / NEXT_PUBLIC_PUSHER_CLUSTER missing in client bundle. " +
          "Restart `npm run dev` after editing .env. Realtime chat is disabled.",
      );
    }
    return null;
  }

  if (process.env.NODE_ENV !== "production") {
    PusherClient.logToConsole = true;
  }

  cachedClient = new PusherClient(config.key, {
    cluster: config.cluster,
    forceTLS: true,
    channelAuthorization: {
      endpoint: "/api/pusher/auth",
      transport: "ajax",
    },
  });

  cachedClient.connection.bind("error", (error: unknown) => {
    console.error("[pusher] connection error", error);
  });

  return cachedClient;
}
