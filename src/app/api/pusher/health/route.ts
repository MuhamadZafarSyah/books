import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getPusherServer } from "@/lib/chat/pusher-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pusher/health
 *
 * Lightweight diagnostic endpoint that confirms:
 *  - the user is authenticated
 *  - server-side Pusher credentials are configured
 *  - the Pusher cluster + key + secret can actually trigger an event
 *
 * Use this to debug realtime issues without sending a chat message.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const pusher = getPusherServer();
  if (!pusher) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Pusher server config missing. Periksa PUSHER_APP_ID/KEY/SECRET/CLUSTER.",
      },
      { status: 503 },
    );
  }

  try {
    await pusher.trigger("private-user-" + session.user.id, "chat.health.ping", {
      ts: Date.now(),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[pusher-health] trigger failed", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Pusher trigger failed. Periksa cluster dan secret.",
      },
      { status: 500 },
    );
  }
}
