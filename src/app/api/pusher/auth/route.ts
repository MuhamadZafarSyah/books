import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  authorizePresenceChannel,
  authorizePrivateChannel,
  conversationChannelName,
  getPusherServer,
  userChannelName,
} from "@/lib/chat/pusher-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHANNEL_PATTERN = /^presence-conversation-([a-zA-Z0-9_-]+)$/;
const USER_CHANNEL_PATTERN = /^private-user-([a-zA-Z0-9_-]+)$/;

/**
 * POST /api/pusher/auth
 *
 * Pusher calls this endpoint when the browser subscribes to a private or
 * presence channel. We validate the channel name, ensure the requesting
 * user is a participant of the targeted conversation (or owner of the user
 * channel), then return Pusher's authorization payload.
 *
 * IMPORTANT: This route MUST always respond with JSON. The framework proxy
 * (src/proxy.ts) explicitly excludes `api/pusher` from its matcher so this
 * endpoint never gets redirected to the login page.
 */
export async function POST(request: NextRequest) {
  if (!getPusherServer()) {
    return NextResponse.json(
      { error: "Realtime tidak dikonfigurasi." },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    console.warn("[pusher-auth] No session for incoming auth request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let socketId: string | null = null;
  let channelName: string | null = null;

  try {
    const formData = await request.formData();
    const sid = formData.get("socket_id");
    const cn = formData.get("channel_name");
    if (typeof sid === "string") socketId = sid;
    if (typeof cn === "string") channelName = cn;
  } catch (error) {
    console.error("[pusher-auth] Failed to parse formData", error);
  }

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Presence channel: presence-conversation-<conversationId>
  const presenceMatch = CHANNEL_PATTERN.exec(channelName);
  if (presenceMatch) {
    const conversationId = presenceMatch[1] ?? "";
    if (channelName !== conversationChannelName(conversationId)) {
      return NextResponse.json({ error: "Channel tidak valid." }, { status: 403 });
    }

    const participant = await prisma.chatConversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: session.user.id,
        },
      },
      select: { userId: true },
    });

    if (!participant) {
      console.warn(
        `[pusher-auth] User ${session.user.id} not in conversation ${conversationId}`,
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const authResponse = authorizePresenceChannel(socketId, channelName, {
      user_id: session.user.id,
      user_info: {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      },
    });

    if (!authResponse) {
      return NextResponse.json(
        { error: "Realtime tidak dikonfigurasi." },
        { status: 503 },
      );
    }

    return NextResponse.json(authResponse);
  }

  // Private user inbox channel: private-user-<userId>
  const userMatch = USER_CHANNEL_PATTERN.exec(channelName);
  if (userMatch) {
    const userId = userMatch[1] ?? "";
    if (userId !== session.user.id || channelName !== userChannelName(userId)) {
      console.warn(
        `[pusher-auth] User ${session.user.id} attempted to subscribe to ${channelName}`,
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const authResponse = authorizePrivateChannel(socketId, channelName);
    if (!authResponse) {
      return NextResponse.json(
        { error: "Realtime tidak dikonfigurasi." },
        { status: 503 },
      );
    }

    return NextResponse.json(authResponse);
  }

  console.warn(`[pusher-auth] Unknown channel format: ${channelName}`);
  return NextResponse.json({ error: "Channel tidak valid." }, { status: 403 });
}
