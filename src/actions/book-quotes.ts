"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { recordActivityEvent } from "@/lib/leaderboard/record-activity";
import { requireAuth } from "@/lib/session";
import {
  bookQuoteSchema,
  type BookQuoteFormValues,
} from "@/features/book-quotes/schemas/book-quote-schemas";
import type { BookQuoteSummary } from "@/features/book-quotes/types";

function normalizeEmpty(value: string | undefined | number): string | null {
  if (value === undefined || value === "") return null;
  if (typeof value === "number") return null;
  return value.trim() || null;
}

async function requireUserId() {
  const user = await requireAuth();
  if (!user.id) throw new Error("Sesi tidak valid.");
  return user.id;
}

export async function createBookQuote(
  bookId: string,
  input: BookQuoteFormValues,
) {
  const userId = await requireUserId();
  const parsed = bookQuoteSchema.parse(input);

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw new Error("Buku tidak ditemukan.");

  const quote = await prisma.bookQuote.create({
    data: {
      userId,
      bookId,
      quote: parsed.quote,
      note: normalizeEmpty(parsed.note),
      page: parsed.page ? parseInt(parsed.page, 10) || null : null,
      chapter: normalizeEmpty(parsed.chapter),
      visibility: parsed.visibility,
      isFavorite: parsed.isFavorite,
    },
  });

  await recordActivityEvent({
    userId,
    type: "BOOK_QUOTE_CREATED",
    sourceType: "BOOK_QUOTE",
    sourceId: quote.id,
    dedupeKey: `book-quote:create:${quote.id}`,
    metadata: { bookId, visibility: parsed.visibility },
  });

  revalidatePath(`/dashboard/explore/books/${bookId}/reviews`);
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/leaderboard");

  return { success: true, quoteId: quote.id };
}

export async function updateBookQuote(
  quoteId: string,
  input: BookQuoteFormValues,
) {
  const userId = await requireUserId();
  const parsed = bookQuoteSchema.parse(input);

  const existing = await prisma.bookQuote.findUnique({
    where: { id: quoteId },
  });
  if (!existing) throw new Error("Kutipan tidak ditemukan.");
  if (existing.userId !== userId)
    throw new Error("Kamu tidak memiliki kutipan ini.");

  await prisma.bookQuote.update({
    where: { id: quoteId },
    data: {
      quote: parsed.quote,
      note: normalizeEmpty(parsed.note),
      page: parsed.page ? parseInt(parsed.page, 10) || null : null,
      chapter: normalizeEmpty(parsed.chapter),
      visibility: parsed.visibility,
      isFavorite: parsed.isFavorite,
    },
  });

  revalidatePath(`/dashboard/explore/books/${existing.bookId}/reviews`);
  revalidatePath("/dashboard/profile");

  return { success: true };
}

export async function deleteBookQuote(quoteId: string) {
  const userId = await requireUserId();

  const existing = await prisma.bookQuote.findUnique({
    where: { id: quoteId },
  });
  if (!existing) throw new Error("Kutipan tidak ditemukan.");
  if (existing.userId !== userId)
    throw new Error("Kamu tidak memiliki kutipan ini.");

  await prisma.bookQuote.delete({ where: { id: quoteId } });

  revalidatePath(`/dashboard/explore/books/${existing.bookId}/reviews`);
  revalidatePath("/dashboard/profile");

  return { success: true };
}

export async function getMyBookQuotesForBook(
  bookId: string,
): Promise<BookQuoteSummary[]> {
  const userId = await requireUserId();

  const quotes = await prisma.bookQuote.findMany({
    where: { userId, bookId },
    orderBy: { createdAt: "desc" },
    include: {
      book: { select: { id: true, title: true, author: true, coverUrl: true } },
    },
  });

  return quotes.map((q) => ({
    id: q.id,
    quote: q.quote,
    note: q.note,
    page: q.page,
    chapter: q.chapter,
    visibility: q.visibility,
    isFavorite: q.isFavorite,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    book: q.book,
  }));
}

export async function getPublicProfileQuotes(
  userId: string,
): Promise<BookQuoteSummary[]> {
  const quotes = await prisma.bookQuote.findMany({
    where: { userId, visibility: "PUBLIC" },
    orderBy: [{ isFavorite: "desc" }, { createdAt: "desc" }],
    take: 6,
    include: {
      book: { select: { id: true, title: true, author: true, coverUrl: true } },
    },
  });

  return quotes.map((q) => ({
    id: q.id,
    quote: q.quote,
    note: q.note,
    page: q.page,
    chapter: q.chapter,
    visibility: q.visibility,
    isFavorite: q.isFavorite,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    book: q.book,
  }));
}
