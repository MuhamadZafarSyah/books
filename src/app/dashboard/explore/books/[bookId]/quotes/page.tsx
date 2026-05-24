import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { BookQuotesShell } from "@/features/book-quotes/components/book-quotes-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bookId: string }>;
}): Promise<Metadata> {
  const { bookId } = await params;
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { title: true, author: true },
  });
  if (!book) return { title: "Buku tidak ditemukan | Shelfgram" };
  return {
    title: `Kutipan dari ${book.title} | Shelfgram`,
    description: `Kutipan dan highlight dari ${book.title} oleh ${book.author}.`,
  };
}

export default async function BookQuotesPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  await requireAuth();

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { id: true, title: true, author: true, coverUrl: true },
  });
  if (!book) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <BookQuotesShell book={book} />
    </div>
  );
}
