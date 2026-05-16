import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getBookReviewPageData } from "@/actions/book-reviews";
import { BookReviewShell } from "@/features/book-reviews/components/book-review-shell";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bookId: string }>;
}): Promise<Metadata> {
  const { bookId } = await params;
  await requireAuth();
  const data = await getBookReviewPageData(bookId);
  if (!data) return { title: "Buku tidak ditemukan | Shelfgram" };
  return {
    title: `Review ${data.book.title} | Shelfgram`,
    description: `Review dan rating untuk ${data.book.title} oleh ${data.book.author}.`,
  };
}

export default async function BookReviewsPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  await requireAuth();
  const data = await getBookReviewPageData(bookId);
  if (!data) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <BookReviewShell data={data} />
    </div>
  );
}
