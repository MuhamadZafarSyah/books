"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import {
  broadcastChatEvent,
  cacheRecentMessage,
  clearUnread,
  getOnlineUserIds,
  getRecentMessages,
  getUnreadCounts,
  incrementUnread,
  setTyping,
  setUserOnline,
} from "@/lib/chat/redis";
import { createChatSocketToken } from "@/lib/chat/socket-token";
import type {
  ChatBootstrap,
  ChatConversationSummary,
  ChatMessageSummary,
  ChatUserSummary,
  SendMessageInput,
} from "@/lib/chat/types";

const MESSAGE_LIMIT = 50;

type ConversationWithDetails = Awaited<
  ReturnType<typeof getUserConversations>
>[number];

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
  };
}

function conversationTitle(
  conversation: ConversationWithDetails,
  currentUserId: string,
) {
  if (conversation.title) return conversation.title;

  const otherParticipants = conversation.participants
    .filter((participant) => participant.userId !== currentUserId)
    .map(
      (participant) =>
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

export async function getChatBootstrap(): Promise<ChatBootstrap> {
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
  const activeConversation = conversations[0];
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
    socketUrl: process.env.NEXT_PUBLIC_CHAT_WS_URL ?? null,
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

export async function sendChatMessage(
  input: SendMessageInput,
): Promise<ChatMessageSummary> {
  const currentUser = await requireChatUser();
  const body = input.body.trim();

  if (!body) {
    throw new Error("Message cannot be empty.");
  }

  if (body.length > 2000) {
    throw new Error("Message is too long.");
  }

  await assertConversationParticipant(input.conversationId, currentUser.id);

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.chatMessage.create({
      data: {
        conversationId: input.conversationId,
        senderId: currentUser.id,
        body,
        clientId: input.clientId,
      },
      include: {
        sender: { select: { name: true } },
      },
    });

    await tx.chatConversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: created.createdAt },
    });

    await tx.chatMessageRead.create({
      data: {
        messageId: created.id,
        userId: currentUser.id,
      },
    });

    return created;
  });

  const serialized = serializeMessage(message);
  const participants = await prisma.chatConversationParticipant.findMany({
    where: { conversationId: input.conversationId },
    select: { userId: true },
  });

  await Promise.all([
    cacheRecentMessage(serialized),
    setTyping(input.conversationId, currentUser.id, false),
    ...participants
      .filter((participant) => participant.userId !== currentUser.id)
      .map((participant) =>
        incrementUnread(participant.userId, input.conversationId),
      ),
    broadcastChatEvent({
      type: "message.created",
      conversationId: input.conversationId,
      message: serialized,
    }),
  ]);

  revalidatePath("/dashboard/chat");
  return serialized;
}

export async function markConversationRead(conversationId: string) {
  const currentUser = await requireChatUser();
  await assertConversationParticipant(conversationId, currentUser.id);

  const readAt = new Date();

  await Promise.all([
    prisma.chatConversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId: currentUser.id },
      },
      data: { lastReadAt: readAt },
    }),
    clearUnread(currentUser.id, conversationId),
    broadcastChatEvent({
      type: "conversation.read",
      conversationId,
      userId: currentUser.id,
      readAt: readAt.toISOString(),
    }),
  ]);
}

export async function setChatTyping(conversationId: string, isTyping: boolean) {
  const currentUser = await requireChatUser();
  await assertConversationParticipant(conversationId, currentUser.id);

  await Promise.all([
    setTyping(conversationId, currentUser.id, isTyping),
    broadcastChatEvent({
      type: "typing.updated",
      conversationId,
      userId: currentUser.id,
      isTyping,
    }),
  ]);
}

export async function getChatSocketAccess(conversationIds: string[]) {
  const currentUser = await requireChatUser();
  const uniqueConversationIds = [...new Set(conversationIds)].filter(Boolean);

  if (uniqueConversationIds.length > 0) {
    const participantCount = await prisma.chatConversationParticipant.count({
      where: {
        userId: currentUser.id,
        conversationId: { in: uniqueConversationIds },
      },
    });

    if (participantCount !== uniqueConversationIds.length) {
      throw new Error("Conversation not found.");
    }
  }

  return {
    socketUrl: process.env.NEXT_PUBLIC_CHAT_WS_URL ?? null,
    token: createChatSocketToken(currentUser.id, uniqueConversationIds),
  };
}
