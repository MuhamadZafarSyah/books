"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { recordActivityEvent } from "@/lib/leaderboard/record-activity";
import { profileSlugFor } from "@/lib/public-profile";
import { requireAuth } from "@/lib/session";
import {
  serializeBookContext,
  serializeBookReview,
} from "@/features/book-reviews/lib/serializers";
import { bookReviewFormSchema } from "@/features/book-reviews/schemas/book-review-schemas";
import type {
  BookReviewFormValues,
} from "@/features/book-reviews/schemas/book-review-schemas";
import type {
  BookReviewPageData,
  BookReviewSummaryStats,
} from "@/features/book-reviews/types";
import type { BookResult } from "@/features/books/types";

const REVIEW_LIMIT = 50;

const PUBLIC_AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  image: true,
} as const;

async function requireUserId() {
  const user = await requireAuth();
  if (!user.id) throw new Error("Authenticated user id is missing.");
  return user.id;
}

function pickFirstAuthor(book: BookResult): string {
  const trimmed = book.authorText?.trim();
  if (trimmed && trimmed.length > 0) return trimmed.slice(0, 200);
  if (book.authors.length > 0) return book.authors[0]!.slice(0, 200);
  return "Penulis tidak diketahui";
}

/**
 * Make sure a Book row exists locally for the given Open Library payload.
 * Lookup priority:
 *   1. workKey (unique)
 *   2. editionKey (we use first match)
 *
 * On match, we patch any null fields from the upstream payload so the local
 * record gets richer metadata over time without overwriting user-edited
 * data.
 */
export async function ensureLocalBookFromResult(
  book: BookResult,
): Promise<{ bookId: string }> {
  if (!book || typeof book.title !== "string" || book.title.trim().length === 0) {
    throw new Error("Buku tidak valid.");
  }

  await requireUserId();

  const workKey = book.workKey?.trim() || null;
  const editionKey = book.editionKey?.trim() || null;
  const author = pickFirstAuthor(book);
  const title = book.title.trim().slice(0, 300);
  const coverUrl = book.coverUrl ?? null;
  const description = book.description?.trim() || null;
  const openLibraryUrl = book.openLibraryUrl ?? null;
  const firstPublishYear =
    typeof book.firstPublishYear === "number" ? book.firstPublishYear : null;

  // 1) Try matching by workKey first.
  if (workKey) {
    const existing = await prisma.book.findUnique({
      where: { workKey },
      select: { id: true },
    });
    if (existing) {
      await patchEmptyFields(existing.id, {
        editionKey,
        coverUrl,
        description,
        openLibraryUrl,
        firstPublishYear,
      });
      return { bookId: existing.id };
    }
  }

  // 2) Fallback: editionKey (not unique but typically distinct enough).
  if (editionKey) {
    const existing = await prisma.book.findFirst({
      where: { editionKey },
      select: { id: true },
    });
    if (existing) {
      await patchEmptyFields(existing.id, {
        workKey,
        coverUrl,
        description,
        openLibraryUrl,
        firstPublishYear,
      });
      return { bookId: existing.id };
    }
  }

  // 3) Create a fresh row.
  const created = await prisma.book.create({
    data: {
      title,
      author,
      coverUrl,
      description,
      workKey,
      editionKey,
      openLibraryUrl,
      firstPublishYear,
    },
    select: { id: true },
  });

  return { bookId: created.id };
}

async function patchEmptyFields(
  bookId: string,
  incoming: {
    workKey?: string | null;
    editionKey?: string | null;
    coverUrl?: string | null;
    description?: string | null;
    openLibraryUrl?: string | null;
    firstPublishYear?: number | null;
  },
) {
  const current = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      workKey: true,
      editionKey: true,
      coverUrl: true,
      description: true,
      openLibraryUrl: true,
      firstPublishYear: true,
    },
  });
  if (!current) return;

  const patch: Record<string, unknown> = {};
  if (!current.workKey && incoming.workKey) patch.workKey = incoming.workKey;
  if (!current.editionKey && incoming.editionKey)
    patch.editionKey = incoming.editionKey;
  if (!current.coverUrl && incoming.coverUrl) patch.coverUrl = incoming.coverUrl;
  if (!current.description && incoming.description)
    patch.description = incoming.description;
  if (!current.openLibraryUrl && incoming.openLibraryUrl)
    patch.openLibraryUrl = incoming.openLibraryUrl;
  if (!current.firstPublishYear && incoming.firstPublishYear)
    patch.firstPublishYear = incoming.firstPublishYear;

  if (Object.keys(patch).length === 0) return;

  await prisma.book.update({ where: { id: bookId }, data: patch });
}

function computeRatingSummary(
  reviews: Array<{ rating: number | null }>,
): BookReviewSummaryStats {
  const counts: BookReviewSummaryStats["ratingCounts"] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let sum = 0;
  let rated = 0;
  for (const review of reviews) {
    if (typeof review.rating === "number" && review.rating >= 1 && review.rating <= 5) {
      const key = review.rating as 1 | 2 | 3 | 4 | 5;
      counts[key] += 1;
      sum += review.rating;
      rated += 1;
    }
  }
  return {
    averageRating: rated > 0 ? Math.round((sum / rated) * 10) / 10 : null,
    reviewCount: reviews.length,
    ratingCounts: counts,
  };
}

export async function getBookReviewPageData(
  bookId: string,
): Promise<BookReviewPageData | null> {
  const userId = await requireUserId();

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return null;

  const [allReviews, currentUserReview, currentUserShelf] = await Promise.all([
    prisma.bookReview.findMany({
      where: { bookId, visibility: "PUBLIC" },
      orderBy: { createdAt: "desc" },
      take: REVIEW_LIMIT,
      include: { user: { select: PUBLIC_AUTHOR_SELECT } },
    }),
    prisma.bookReview.findUnique({
      where: { userId_bookId: { userId, bookId } },
      include: { user: { select: PUBLIC_AUTHOR_SELECT } },
    }),
    prisma.userBook.findUnique({
      where: { userId_bookId: { userId, bookId } },
      select: {
        id: true,
        status: true,
        visibility: true,
        progress: true,
        isBorrowable: true,
        startedAt: true,
        finishedAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const summary = computeRatingSummary(allReviews);

  const otherReviews = allReviews.filter((review) => review.userId !== userId);

  return {
    book: serializeBookContext(book),
    summary,
    currentUserReview: currentUserReview
      ? serializeBookReview(currentUserReview)
      : null,
    currentUserShelf: currentUserShelf
      ? {
          id: currentUserShelf.id,
          status: currentUserShelf.status,
          visibility: currentUserShelf.visibility,
          progress: currentUserShelf.progress,
          isBorrowable: currentUserShelf.isBorrowable,
          startedAt: currentUserShelf.startedAt
            ? currentUserShelf.startedAt.toISOString()
            : null,
          finishedAt: currentUserShelf.finishedAt
            ? currentUserShelf.finishedAt.toISOString()
            : null,
          updatedAt: currentUserShelf.updatedAt.toISOString(),
        }
      : null,
    reviews: otherReviews.map(serializeBookReview),
  };
}

/**
 * Create or update the current user's review for the given book.
 * Side-effect: marks the book as FINISHED on the user's shelf and
 * promotes its visibility to PUBLIC so it shows up on the public profile.
 */
export async function upsertBookReview(
  bookId: string,
  values: BookReviewFormValues,
): Promise<{ reviewId: string }> {
  const userId = await requireUserId();
  const parsed = bookReviewFormSchema.safeParse(values);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Review tidak valid.";
    throw new Error(message);
  }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { id: true },
  });
  if (!book) throw new Error("Buku tidak ditemukan.");

  const now = new Date();
  const data = parsed.data;

  // Penanda apakah panggilan ini benar-benar review baru. Hanya pembuatan
  // pertama yang menghasilkan poin leaderboard (Plan: "edit review = 0").
  // Disimpan di luar transaksi agar dapat dibaca setelah commit untuk
  // memutuskan pemanggilan `recordActivityEvent`.
  let isFirstReview = false;

  const review = await prisma.$transaction(async (tx) => {
    const existingReview = await tx.bookReview.findUnique({
      where: { userId_bookId: { userId, bookId } },
      select: { id: true },
    });
    isFirstReview = existingReview === null;

    const upserted = await tx.bookReview.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: {
        userId,
        bookId,
        rating: data.rating,
        body: data.body,
        visibility: "PUBLIC",
      },
      update: {
        rating: data.rating,
        body: data.body,
        visibility: "PUBLIC",
      },
      select: { id: true },
    });

    // Promote the user's shelf entry to FINISHED + PUBLIC. Preserve any
    // earlier finishedAt / startedAt so reading history stays intact.
    const existingShelf = await tx.userBook.findUnique({
      where: { userId_bookId: { userId, bookId } },
      select: { id: true, finishedAt: true, startedAt: true },
    });

    if (existingShelf) {
      await tx.userBook.update({
        where: { id: existingShelf.id },
        data: {
          status: "FINISHED",
          visibility: "PUBLIC",
          finishedAt: existingShelf.finishedAt ?? now,
        },
      });
    } else {
      await tx.userBook.create({
        data: {
          userId,
          bookId,
          status: "FINISHED",
          visibility: "PUBLIC",
          finishedAt: now,
        },
      });
    }

    return upserted;
  });

  // `recordActivityEvent` sengaja dipanggil di luar transaksi: pencatatan
  // leaderboard tidak boleh memblokir commit review utama, dan
  // `dedupeKey` `book-review:create:${userId}:${bookId}` memastikan
  // edit ulang tetap idempotent (Plan: "edit review = 0").
  if (isFirstReview) {
    await recordActivityEvent({
      userId,
      type: "BOOK_REVIEW_CREATED",
      sourceType: "BOOK_REVIEW",
      sourceId: review.id,
      dedupeKey: `book-review:create:${userId}:${bookId}`,
      bypassDailyCap: true,
    });
  }

  await revalidateAfterReviewMutation(userId, bookId);
  return { reviewId: review.id };
}

export async function deleteBookReview(reviewId: string): Promise<void> {
  const userId = await requireUserId();

  const review = await prisma.bookReview.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, bookId: true },
  });
  if (!review) throw new Error("Review tidak ditemukan.");
  if (review.userId !== userId) {
    throw new Error("Hanya pemilik review yang bisa menghapus.");
  }

  await prisma.bookReview.delete({ where: { id: reviewId } });

  // Per the plan: deleting a review does not reset the FINISHED status.
  await revalidateAfterReviewMutation(userId, review.bookId);
}

async function revalidateAfterReviewMutation(userId: string, bookId: string) {
  revalidatePath(`/dashboard/explore/books/${bookId}/reviews`);
  revalidatePath("/dashboard/profile");

  // Build slug for /u/[slug] revalidation.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true, email: true },
  });
  if (user) {
    const slug = profileSlugFor(user);
    revalidatePath(`/u/${slug}`);
  }
}
