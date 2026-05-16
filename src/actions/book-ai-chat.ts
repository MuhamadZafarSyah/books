"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import {
  serializeBookAiConversationDetail,
  serializeBookAiConversationSummary,
} from "@/features/book-ai-chat/lib/serializers";
import type {
  BookAiBootstrap,
  BookAiConversationSummary,
  BookContextSnapshot,
} from "@/features/book-ai-chat/types";
import type { BookResult } from "@/features/books/types";

const MESSAGE_LIMIT = 100;
const HISTORY_LIMIT = 30;

async function requireUserId() {
  const user = await requireAuth();
  if (!user.id) throw new Error("Authenticated user id is missing.");
  return user.id;
}

function snapshotFromBook(book: BookResult): BookContextSnapshot {
  return {
    id: book.id,
    workKey: book.workKey,
    editionKey: book.editionKey,
    title: book.title,
    subtitle: book.subtitle ?? null,
    authorText: book.authorText,
    authors: book.authors,
    coverUrl: book.coverUrl,
    firstPublishYear: book.firstPublishYear,
    publishDate: book.publishDate,
    languages: book.languages,
    publishers: book.publishers,
    subjects: book.subjects,
    pageCount: book.pageCount,
    description: book.description,
    openLibraryUrl: book.openLibraryUrl ?? null,
  };
}

/**
 * Create a fresh AI discussion room for the given book, or reuse the most
 * recent empty room for the same book/user (avoids creating chains of empty
 * rooms when the user clicks the CTA repeatedly).
 */
export async function createBookAiConversation(book: BookResult): Promise<{
  conversationId: string;
}> {
  if (!book || typeof book.title !== "string" || book.title.trim().length === 0) {
    throw new Error("Buku tidak valid.");
  }

  const userId = await requireUserId();
  const snapshot = snapshotFromBook(book);
  const title = `Diskusi: ${snapshot.title}`;
  const matchKey = snapshot.workKey ?? snapshot.editionKey ?? snapshot.id ?? null;

  if (matchKey) {
    const existingEmpty = await prisma.bookAiConversation.findFirst({
      where: {
        userId,
        OR: [
          { workKey: matchKey },
          { editionKey: matchKey },
        ],
        messages: { none: {} },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (existingEmpty) {
      revalidatePath("/dashboard/explore");
      return { conversationId: existingEmpty.id };
    }
  }

  const conversation = await prisma.bookAiConversation.create({
    data: {
      userId,
      title,
      bookTitle: snapshot.title,
      bookAuthor: snapshot.authorText,
      bookCoverUrl: snapshot.coverUrl,
      workKey: snapshot.workKey,
      editionKey: snapshot.editionKey,
      openLibraryUrl: snapshot.openLibraryUrl,
      contextJson: snapshot,
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/explore");
  return { conversationId: conversation.id };
}

async function loadConversationOwned(conversationId: string, userId: string) {
  return prisma.bookAiConversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: MESSAGE_LIMIT,
      },
    },
  });
}

export async function getBookAiConversationPageData(
  conversationId: string,
): Promise<BookAiBootstrap | null> {
  const userId = await requireUserId();

  const [conversation, history] = await Promise.all([
    loadConversationOwned(conversationId, userId),
    prisma.bookAiConversation.findMany({
      where: { userId },
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      take: HISTORY_LIMIT,
      select: {
        id: true,
        title: true,
        bookTitle: true,
        bookAuthor: true,
        bookCoverUrl: true,
        lastMessageAt: true,
        updatedAt: true,
      },
    }),
  ]);

  if (!conversation) return null;

  return {
    conversation: serializeBookAiConversationDetail(conversation),
    history: history.map(serializeBookAiConversationSummary),
  };
}

export async function getBookAiConversationHistory(): Promise<
  BookAiConversationSummary[]
> {
  const userId = await requireUserId();

  const rows = await prisma.bookAiConversation.findMany({
    where: { userId },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    take: HISTORY_LIMIT,
    select: {
      id: true,
      title: true,
      bookTitle: true,
      bookAuthor: true,
      bookCoverUrl: true,
      lastMessageAt: true,
      updatedAt: true,
    },
  });

  return rows.map(serializeBookAiConversationSummary);
}
