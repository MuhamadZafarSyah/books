"use server";

import { revalidatePath } from "next/cache";
import type { UserBookStatus, UserBookVisibility } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { profileSlugFor } from "@/lib/public-profile";
import { requireAuth } from "@/lib/session";
import {
  USER_BOOK_STARTED_STATUSES,
  USER_BOOK_STATUS_VALUES,
  USER_BOOK_VISIBILITY_VALUES,
} from "@/lib/user-books/status";

const updateUserBookStatusSchema = z.object({
  bookId: z.string().min(1),
  status: z.enum(USER_BOOK_STATUS_VALUES),
  visibility: z.enum(USER_BOOK_VISIBILITY_VALUES).optional(),
  isBorrowable: z.boolean().optional(),
  progress: z
    .number()
    .int("Progres harus bilangan bulat.")
    .min(0, "Progres minimal 0%.")
    .max(100, "Progres maksimal 100%.")
    .nullable()
    .optional(),
});

export type UpdateUserBookStatusInput = z.infer<
  typeof updateUserBookStatusSchema
>;

export type MyShelfBoardItem = {
  bookId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  status: UserBookStatus;
  visibility: UserBookVisibility;
  isBorrowable: boolean;
  progress: number | null;
  updatedAt: string;
};

async function requireUserId() {
  const user = await requireAuth();
  if (!user.id) throw new Error("Sesi tidak valid.");
  return user.id;
}

async function revalidateAfterUserBookMutation(userId: string, bookId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath(`/dashboard/explore/books/${bookId}/reviews`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true, email: true },
  });
  if (user) {
    revalidatePath(`/u/${profileSlugFor(user)}`);
  }
}

/**
 * Upsert satu entri `UserBook` untuk pasangan (viewer, bookId).
 *
 * Logika tambahan:
 * - `startedAt` otomatis diisi bila belum ada saat status pindah ke status
 *   yang menandai buku "sudah pernah disentuh"
 *   (`READING/ON_HOLD/ABANDONED/FINISHED`).
 * - `finishedAt` otomatis diisi bila status pindah ke `FINISHED`, dan
 *   dikosongkan ulang bila berpindah keluar dari `FINISHED` (mis. user
 *   sengaja menarik kembali ke `READING`).
 * - `progress` di-clamp 0-100, set ke `100` saat status `FINISHED`, dan
 *   dikosongkan saat status `WANT_TO_READ` agar tidak menampilkan progres
 *   menyesatkan.
 */
export async function updateUserBookStatus(
  rawInput: UpdateUserBookStatusInput,
): Promise<{ id: string }> {
  const userId = await requireUserId();
  const input = updateUserBookStatusSchema.parse(rawInput);

  const book = await prisma.book.findUnique({
    where: { id: input.bookId },
    select: { id: true },
  });
  if (!book) throw new Error("Buku tidak ditemukan.");

  const now = new Date();

  const existing = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId, bookId: input.bookId } },
    select: {
      id: true,
      visibility: true,
      isBorrowable: true,
      startedAt: true,
      finishedAt: true,
      progress: true,
    },
  });

  const startedAt =
    existing?.startedAt ??
    (USER_BOOK_STARTED_STATUSES.has(input.status) ? now : null);

  const finishedAt =
    input.status === "FINISHED"
      ? existing?.finishedAt ?? now
      : null;

  let progress: number | null;
  if (input.progress !== undefined) {
    progress = input.progress;
  } else if (input.status === "FINISHED") {
    progress = 100;
  } else if (input.status === "WANT_TO_READ") {
    progress = null;
  } else {
    progress = existing?.progress ?? null;
  }

  const visibility = input.visibility ?? existing?.visibility ?? "PRIVATE";
  const isBorrowable = input.isBorrowable ?? existing?.isBorrowable ?? false;

  const upserted = await prisma.userBook.upsert({
    where: { userId_bookId: { userId, bookId: input.bookId } },
    create: {
      userId,
      bookId: input.bookId,
      status: input.status,
      visibility,
      isBorrowable,
      startedAt,
      finishedAt,
      progress,
    },
    update: {
      status: input.status,
      visibility,
      isBorrowable,
      startedAt,
      finishedAt,
      progress,
    },
    select: { id: true },
  });

  await revalidateAfterUserBookMutation(userId, input.bookId);
  return { id: upserted.id };
}

/**
 * Hapus entri `UserBook` viewer untuk buku tertentu (mis. dari menu
 * "Hapus dari rak"). Aman dipanggil walau entry tidak ada — kita pakai
 * `deleteMany` agar P2025 tidak dilemparkan.
 */
export async function removeUserBook(bookId: string): Promise<void> {
  const userId = await requireUserId();
  if (typeof bookId !== "string" || bookId.length === 0) {
    throw new Error("ID buku tidak valid.");
  }
  await prisma.userBook.deleteMany({
    where: { userId, bookId },
  });
  await revalidateAfterUserBookMutation(userId, bookId);
}

/**
 * Snapshot rak viewer untuk buku tertentu. Dipakai oleh dialog
 * personalisasi rak supaya picker langsung tahu nilai awal tanpa harus
 * memuat seluruh halaman review dulu.
 */
export async function getMyShelfState(bookId: string): Promise<{
  id: string;
  status: UserBookStatus;
  visibility: UserBookVisibility;
  isBorrowable: boolean;
  progress: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
} | null> {
  const userId = await requireUserId();
  if (typeof bookId !== "string" || bookId.length === 0) return null;

  const row = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId, bookId } },
    select: {
      id: true,
      status: true,
      visibility: true,
      isBorrowable: true,
      progress: true,
      startedAt: true,
      finishedAt: true,
      updatedAt: true,
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    status: row.status,
    visibility: row.visibility,
    isBorrowable: row.isBorrowable,
    progress: row.progress,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Snapshot mini-kanban rak viewer. Dipakai oleh drawer status supaya saat
 * dibuka pengguna langsung melihat tumpukan buku yang sudah tersimpan pada
 * tiap status baca, bukan hanya status buku yang sedang diedit.
 */
export async function getMyShelfBoard(): Promise<MyShelfBoardItem[]> {
  const userId = await requireUserId();

  const rows = await prisma.userBook.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          coverUrl: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    bookId: row.book.id,
    title: row.book.title,
    author: row.book.author,
    coverUrl: row.book.coverUrl,
    status: row.status,
    visibility: row.visibility,
    isBorrowable: row.isBorrowable,
    progress: row.progress,
    updatedAt: row.updatedAt.toISOString(),
  }));
}
