"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import {
  cacheRecentMessage,
  clearUnread,
  getOnlineUserIds,
  getRecentMessages,
  getUnreadCounts,
  incrementUnread,
  markConversationActive,
  setUserOnline,
} from "@/lib/chat/redis";
import {
  triggerUserInboxMessage,
} from "@/lib/chat/pusher-server";
import type {
  ChatBootstrap,
  ChatConversationSummary,
  ChatMessageSummary,
  ChatUserSummary,
} from "@/lib/chat/types";

const MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_CLIENT_ID_LENGTH = 100;

const conversationDetailsArgs = {
  include: {
    participants: {
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    },
    messages: {
      orderBy: { createdAt: "desc" },
      take: 1,
      include: {
        sender: { select: { name: true } },
      },
    },
  },
} satisfies Prisma.ChatConversationDefaultArgs;

type ConversationWithDetails = Prisma.ChatConversationGetPayload<
  typeof conversationDetailsArgs
>;
type ConversationParticipantWithUser = ConversationWithDetails["participants"][number];

async function requireChatUser() {
  const user = await requireAuth();

  if (!user.id) {
    throw new Error("Authenticated user id is missing.");
  }

  return { ...user, id: user.id };
}

function directKeyFor(userA: string, userB: string) {
  return [userA, userB].sort().join(":");
}

function serializeUser(
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  },
  onlineUserIds: Set<string>,
): ChatUserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    online: onlineUserIds.has(user.id),
  };
}

function serializeMessage(message: {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  type: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
  clientId?: string | null;
  createdAt: Date;
  sender?: { name: string | null } | null;
}): ChatMessageSummary {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName: message.sender?.name ?? null,
    body: message.body,
    type: message.type,
    createdAt: message.createdAt.toISOString(),
    clientId: message.clientId ?? undefined,
  };
}

function conversationTitle(
  conversation: ConversationWithDetails,
  currentUserId: string,
) {
  if (conversation.title) return conversation.title;

  const otherParticipants = conversation.participants
    .filter(
      (participant: ConversationParticipantWithUser) =>
        participant.userId !== currentUserId,
    )
    .map(
      (participant: ConversationParticipantWithUser) =>
        participant.user.name ||
        participant.user.email?.split("@")[0] ||
        "Pembaca",
    );

  if (otherParticipants.length > 0) return otherParticipants.join(", ");

  return "Catatan pribadi";
}

function serializeConversation(
  conversation: ConversationWithDetails,
  currentUserId: string,
  onlineUserIds: Set<string>,
  unreadCounts: Record<string, number>,
): ChatConversationSummary {
  const lastMessage = conversation.messages[0]
    ? serializeMessage(conversation.messages[0])
    : null;

  return {
    id: conversation.id,
    title: conversationTitle(conversation, currentUserId),
    type: conversation.type,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    unreadCount: unreadCounts[conversation.id] ?? 0,
    participants: conversation.participants.map((participant) =>
      serializeUser(participant.user, onlineUserIds),
    ),
    lastMessage,
  };
}

async function getUserConversations(userId: string) {
  return prisma.chatConversation.findMany({
    where: {
      participants: {
        some: { userId },
      },
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    ...conversationDetailsArgs,
  });
}

async function assertConversationParticipant(
  conversationId: string,
  userId: string,
) {
  const participant = await prisma.chatConversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });

  if (!participant) {
    throw new Error("Conversation not found.");
  }
}

export async function getChatBootstrap(activeConversationId?: string): Promise<ChatBootstrap> {
  const currentUser = await requireChatUser();
  const currentUserId = currentUser.id;

  await setUserOnline(currentUserId);

  const [conversations, suggestedUsers, unreadCounts] = await Promise.all([
    getUserConversations(currentUserId),
    prisma.user.findMany({
      where: { id: { not: currentUserId } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, image: true },
    }),
    getUnreadCounts(currentUserId),
  ]);

  const allUserIds = new Set<string>([currentUserId]);
  for (const conversation of conversations) {
    for (const participant of conversation.participants) {
      allUserIds.add(participant.userId);
    }
  }
  for (const user of suggestedUsers) {
    allUserIds.add(user.id);
  }

  const onlineUserIds = await getOnlineUserIds([...allUserIds]);
  const activeConversation = activeConversationId
    ? conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0]
    : conversations[0];
  const initialMessages = activeConversation
    ? await getConversationMessages(activeConversation.id)
    : [];

  return {
    currentUser: serializeUser(
      {
        id: currentUserId,
        name: currentUser.name ?? null,
        email: currentUser.email ?? null,
        image: currentUser.image ?? null,
      },
      onlineUserIds,
    ),
    activeConversationId: activeConversation?.id ?? null,
    conversations: conversations.map((conversation) =>
      serializeConversation(
        conversation,
        currentUserId,
        onlineUserIds,
        unreadCounts,
      ),
    ),
    suggestedUsers: suggestedUsers.map((user) =>
      serializeUser(user, onlineUserIds),
    ),
    messagesByConversation: activeConversation
      ? { [activeConversation.id]: initialMessages }
      : {},
  };
}

export async function getConversationMessages(
  conversationId: string,
): Promise<ChatMessageSummary[]> {
  const currentUser = await requireChatUser();
  await assertConversationParticipant(conversationId, currentUser.id);

  const cachedMessages = await getRecentMessages(conversationId);
  if (cachedMessages.length > 0) return cachedMessages;

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: MESSAGE_LIMIT,
    include: {
      sender: { select: { name: true } },
    },
  });

  return messages.reverse().map(serializeMessage);
}

export async function startDirectConversation(targetUserId: string) {
  const currentUser = await requireChatUser();
  const currentUserId = currentUser.id;

  if (targetUserId === currentUserId) {
    throw new Error("Cannot start a conversation with yourself.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });

  if (!targetUser) {
    throw new Error("User not found.");
  }

  const directKey = directKeyFor(currentUserId, targetUserId);

  const conversation = await prisma.chatConversation.upsert({
    where: { directKey },
    update: {},
    create: {
      type: "DIRECT",
      directKey,
      participants: {
        create: [{ userId: currentUserId }, { userId: targetUserId }],
      },
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/chat");
  return conversation.id;
}

export async function markConversationRead(conversationId: string) {
  const currentUser = await requireChatUser();
  await assertConversationParticipant(conversationId, currentUser.id);

  const readAt = new Date();

  await prisma.chatConversationParticipant.update({
    where: {
      conversationId_userId: { conversationId, userId: currentUser.id },
    },
    data: { lastReadAt: readAt },
  });
  await clearUnread(currentUser.id, conversationId);

  // No Pusher broadcast: read receipts are not consumed by the UI and would
  // double the realtime traffic for every conversation switch.
}

export type SendConversationMessageResult =
  | { ok: true; message: ChatMessageSummary }
  | { ok: false; error: string };

/**
 * Persist a chat message to the database, update unread counts and recent
 * cache, then broadcast `message.created` via Pusher. The optimistic
 * `clientId` survives the round trip so the client can reconcile.
 */
export async function sendConversationMessage(
  conversationId: string,
  body: string,
  clientId: string,
): Promise<SendConversationMessageResult> {
  const currentUser = await requireChatUser();

  const trimmedBody = typeof body === "string" ? body.trim() : "";
  const trimmedClientId = typeof clientId === "string" ? clientId.trim() : "";

  if (!trimmedBody) {
    return { ok: false, error: "Pesan tidak boleh kosong." };
  }
  if (trimmedBody.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: "Pesan terlalu panjang." };
  }
  if (!trimmedClientId || trimmedClientId.length > MAX_CLIENT_ID_LENGTH) {
    return { ok: false, error: "ID pesan tidak valid." };
  }

  const participants = await prisma.chatConversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });

  if (!participants.some((participant) => participant.userId === currentUser.id)) {
    return { ok: false, error: "Conversation tidak ditemukan." };
  }

  // Already-persisted optimistic message? Return the existing record so the
  // client can dedupe via clientId.
  const existing = await prisma.chatMessage.findUnique({
    where: { clientId: trimmedClientId },
    include: { sender: { select: { name: true } } },
  });
  if (existing) {
    return { ok: true, message: serializeMessage(existing) };
  }

  let persisted;
  try {
    persisted = await prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          conversationId,
          senderId: currentUser.id,
          body: trimmedBody,
          clientId: trimmedClientId,
        },
        include: { sender: { select: { name: true } } },
      });

      await tx.chatMessageRead.upsert({
        where: {
          messageId_userId: { messageId: created.id, userId: currentUser.id },
        },
        update: {},
        create: { messageId: created.id, userId: currentUser.id },
      });

      await tx.chatConversation.updateMany({
        where: {
          id: conversationId,
          OR: [{ lastMessageAt: null }, { lastMessageAt: { lt: created.createdAt } }],
        },
        data: { lastMessageAt: created.createdAt },
      });

      return created;
    });
  } catch (error) {
    console.error("sendConversationMessage failed", error);
    return { ok: false, error: "Gagal mengirim pesan." };
  }

  const message = serializeMessage(persisted);

  // Side effects after successful DB write. Failures here only log.
  const otherParticipantIds = participants
    .map((participant) => participant.userId)
    .filter((userId) => userId !== currentUser.id);

  await Promise.allSettled([
    cacheRecentMessage(message),
    markConversationActive(conversationId, persisted.createdAt),
    ...otherParticipantIds.map((userId) =>
      incrementUnread(userId, conversationId),
    ),
    // Single broadcast path: each participant has an always-on
    // `private-user-<id>` channel, so one trigger reaches sender + every
    // receiver regardless of whether they have the conversation open.
    // Conversation channels stay reserved for typing + presence.
    triggerUserInboxMessage(
      participants.map((participant) => participant.userId),
      {
        type: "message.created",
        conversationId,
        message,
      },
    ),
  ]);

  return { ok: true, message };
}
