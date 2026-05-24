"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { recordActivityEvent } from "@/lib/leaderboard/record-activity";
import { requireAuth } from "@/lib/session";
import {
  serializeCircleDetail,
  serializeCircleSummary,
} from "@/features/reading-circle/lib/serializers";
import type {
  ReadingCircleBookContext,
  ReadingCircleDetail,
  ReadingCirclePageData,
  ReadingCirclePrivacy,
  ReadingCirclePostType,
  ReadingCircleSpoilerLevel,
  ReadingCircleSummary,
} from "@/features/reading-circle/types";
import type { BookResult } from "@/features/books/types";

const CIRCLE_HISTORY_LIMIT = 30;
const POSTS_LIMIT = 50;
const COMMENTS_LIMIT = 100;

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

async function requireUserId() {
  const user = await requireAuth();
  if (!user.id) throw new Error("Authenticated user id is missing.");
  return user.id;
}

function snapshotFromBook(book: BookResult): ReadingCircleBookContext {
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

export type CreateReadingCircleInput = {
  title: string;
  description?: string | null;
  privacy?: ReadingCirclePrivacy;
  targetLabel?: string | null;
};

/** Create a circle for a book and add the creator as OWNER member. */
export async function createReadingCircleFromBook(
  book: BookResult,
  input: CreateReadingCircleInput,
): Promise<{ circleId: string }> {
  if (!book || typeof book.title !== "string" || book.title.trim().length === 0) {
    throw new Error("Buku tidak valid.");
  }

  const trimmedTitle = (input.title ?? "").trim();
  if (trimmedTitle.length === 0) {
    throw new Error("Judul circle wajib diisi.");
  }
  if (trimmedTitle.length > 120) {
    throw new Error("Judul circle terlalu panjang.");
  }

  const userId = await requireUserId();
  const snapshot = snapshotFromBook(book);
  const description = (input.description ?? "").trim().slice(0, 500) || null;
  const targetLabel = (input.targetLabel ?? "").trim().slice(0, 80) || null;
  const privacy: ReadingCirclePrivacy = input.privacy ?? "PUBLIC";
  const now = new Date();

  const created = await prisma.$transaction(async (tx) => {
    const circle = await tx.readingCircle.create({
      data: {
        ownerId: userId,
        title: trimmedTitle,
        description,
        privacy,
        bookTitle: snapshot.title,
        bookAuthor: snapshot.authorText,
        bookCoverUrl: snapshot.coverUrl,
        workKey: snapshot.workKey,
        editionKey: snapshot.editionKey,
        openLibraryUrl: snapshot.openLibraryUrl,
        contextJson: snapshot,
        targetLabel,
        memberCount: 1,
        lastActivityAt: now,
      },
      select: { id: true },
    });

    await tx.readingCircleMember.create({
      data: {
        circleId: circle.id,
        userId,
        role: "OWNER",
      },
    });

    return circle;
  });

  await recordActivityEvent({
    userId,
    type: "READING_CIRCLE_CREATED",
    sourceType: "READING_CIRCLE",
    sourceId: created.id,
    dedupeKey: `reading-circle:create:${created.id}`,
  });

  revalidatePath("/dashboard/circles");
  revalidatePath("/dashboard/explore");
  return { circleId: created.id };
}

async function getMyMembership(circleId: string, userId: string) {
  return prisma.readingCircleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
    select: { role: true },
  });
}

async function loadDetailRaw(circleId: string, userId: string) {
  const circle = await prisma.readingCircle.findUnique({
    where: { id: circleId },
  });
  if (!circle) return null;

  const membership = await getMyMembership(circleId, userId);
  const isMember = membership !== null;
  const canView =
    circle.privacy === "PUBLIC" ||
    circle.privacy === "UNLISTED" ||
    isMember;

  const [posts, members] = await Promise.all([
    canView
      ? prisma.readingCirclePost.findMany({
          where: { circleId },
          orderBy: { createdAt: "desc" },
          take: POSTS_LIMIT,
          include: {
            author: { select: PUBLIC_USER_SELECT },
            comments: {
              orderBy: { createdAt: "asc" },
              take: COMMENTS_LIMIT,
              include: { author: { select: PUBLIC_USER_SELECT } },
            },
          },
        })
      : Promise.resolve([]),
    prisma.readingCircleMember.findMany({
      where: { circleId },
      orderBy: { joinedAt: "asc" },
      include: { user: { select: PUBLIC_USER_SELECT } },
    }),
  ]);

  return serializeCircleDetail({
    circle,
    posts,
    members,
    myRole: membership?.role ?? null,
    canView,
  });
}

async function getMyCircles(userId: string): Promise<ReadingCircleSummary[]> {
  const memberships = await prisma.readingCircleMember.findMany({
    where: { userId },
    orderBy: { joinedAt: "desc" },
    take: CIRCLE_HISTORY_LIMIT,
    select: {
      role: true,
      circle: {
        select: {
          id: true,
          title: true,
          description: true,
          privacy: true,
          bookTitle: true,
          bookAuthor: true,
          bookCoverUrl: true,
          memberCount: true,
          lastActivityAt: true,
          updatedAt: true,
          ownerId: true,
        },
      },
    },
  });

  return memberships
    .filter((membership) => membership.circle !== null)
    .map((membership) =>
      serializeCircleSummary(membership.circle, membership.role),
    )
    .sort((a, b) => {
      const aTime = a.lastActivityAt
        ? new Date(a.lastActivityAt).getTime()
        : new Date(a.updatedAt).getTime();
      const bTime = b.lastActivityAt
        ? new Date(b.lastActivityAt).getTime()
        : new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });
}

export async function getReadingCirclePageData(
  circleId: string,
): Promise<ReadingCirclePageData | null> {
  const userId = await requireUserId();

  const [detail, history] = await Promise.all([
    loadDetailRaw(circleId, userId),
    getMyCircles(userId),
  ]);

  if (!detail) return null;
  // Private circles are hidden from non-members entirely.
  if (!detail.canView && detail.privacy === "PRIVATE") return null;

  return { circle: detail, history };
}

export async function getMyReadingCircles(): Promise<ReadingCircleSummary[]> {
  const userId = await requireUserId();
  return getMyCircles(userId);
}

export async function getPublicReadingCirclesForBook(
  workKey: string | null,
  editionKey: string | null,
): Promise<ReadingCircleSummary[]> {
  if (!workKey && !editionKey) return [];
  const matchClauses: Array<{ workKey?: string; editionKey?: string }> = [];
  if (workKey) matchClauses.push({ workKey });
  if (editionKey) matchClauses.push({ editionKey });

  const circles = await prisma.readingCircle.findMany({
    where: {
      privacy: "PUBLIC",
      OR: matchClauses,
    },
    orderBy: [{ lastActivityAt: "desc" }, { updatedAt: "desc" }],
    take: 12,
  });
  return circles.map((circle) => serializeCircleSummary(circle, null));
}

export async function joinReadingCircle(circleId: string): Promise<ReadingCircleDetail> {
  const userId = await requireUserId();
  const circle = await prisma.readingCircle.findUnique({
    where: { id: circleId },
    select: { id: true, privacy: true },
  });
  if (!circle) throw new Error("Circle tidak ditemukan.");
  if (circle.privacy === "PRIVATE") {
    throw new Error("Circle ini bersifat privat dan butuh undangan.");
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.readingCircleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: { id: true },
    });
    if (existing) return;

    await tx.readingCircleMember.create({
      data: { circleId, userId, role: "MEMBER" },
    });
    await tx.readingCircle.update({
      where: { id: circleId },
      data: {
        memberCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });
  });

  await recordActivityEvent({
    userId,
    type: "READING_CIRCLE_JOINED",
    sourceType: "READING_CIRCLE",
    sourceId: circleId,
    dedupeKey: `reading-circle:join:${circleId}:${userId}`,
    bypassDailyCap: true,
  });

  revalidatePath(`/dashboard/circles/${circleId}`);
  revalidatePath("/dashboard/circles");
  revalidatePath("/dashboard/circles/discover");

  const detail = await loadDetailRaw(circleId, userId);
  if (!detail) throw new Error("Circle tidak ditemukan.");
  return detail;
}

export async function leaveReadingCircle(circleId: string): Promise<ReadingCircleDetail> {
  const userId = await requireUserId();

  await prisma.$transaction(async (tx) => {
    const existing = await tx.readingCircleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: { role: true },
    });
    if (!existing) return;
    if (existing.role === "OWNER") {
      throw new Error("Owner tidak bisa meninggalkan circle.");
    }
    await tx.readingCircleMember.delete({
      where: { circleId_userId: { circleId, userId } },
    });
    await tx.readingCircle.update({
      where: { id: circleId },
      data: {
        memberCount: { decrement: 1 },
        lastActivityAt: new Date(),
      },
    });
  });

  revalidatePath(`/dashboard/circles/${circleId}`);
  revalidatePath("/dashboard/circles");
  revalidatePath("/dashboard/circles/discover");

  const detail = await loadDetailRaw(circleId, userId);
  if (!detail) throw new Error("Circle tidak ditemukan.");
  return detail;
}

export type CreateReadingCirclePostInput = {
  title?: string | null;
  body: string;
  type?: ReadingCirclePostType;
  spoilerLevel?: ReadingCircleSpoilerLevel;
  spoilerFromChapter?: number | null;
  spoilerToChapter?: number | null;
};

export async function createReadingCirclePost(
  circleId: string,
  input: CreateReadingCirclePostInput,
): Promise<ReadingCircleDetail> {
  const userId = await requireUserId();
  const trimmedBody = (input.body ?? "").trim();
  if (trimmedBody.length === 0) throw new Error("Isi post tidak boleh kosong.");
  if (trimmedBody.length > 4000) throw new Error("Post terlalu panjang.");

  const trimmedTitle = (input.title ?? "").trim().slice(0, 200) || null;
  const type: ReadingCirclePostType = input.type ?? "DISCUSSION";
  const spoilerLevel: ReadingCircleSpoilerLevel = input.spoilerLevel ?? "NONE";
  const spoilerFromChapter =
    typeof input.spoilerFromChapter === "number" && input.spoilerFromChapter > 0
      ? Math.min(99999, Math.floor(input.spoilerFromChapter))
      : null;
  const spoilerToChapter =
    typeof input.spoilerToChapter === "number" && input.spoilerToChapter > 0
      ? Math.min(99999, Math.floor(input.spoilerToChapter))
      : null;

  const membership = await getMyMembership(circleId, userId);
  if (!membership) throw new Error("Bergabung dulu untuk memposting.");

  const postId = await prisma.$transaction(async (tx) => {
    const created = await tx.readingCirclePost.create({
      data: {
        circleId,
        authorId: userId,
        type,
        title: trimmedTitle,
        body: trimmedBody,
        spoilerLevel,
        spoilerFromChapter,
        spoilerToChapter,
      },
      select: { id: true },
    });
    await tx.readingCircle.update({
      where: { id: circleId },
      data: { lastActivityAt: new Date() },
    });
    return created.id;
  });

  await recordActivityEvent({
    userId,
    type: "READING_CIRCLE_POST_CREATED",
    sourceType: "READING_CIRCLE_POST",
    sourceId: postId,
    dedupeKey: `reading-circle-post:create:${postId}`,
  });

  revalidatePath(`/dashboard/circles/${circleId}`);

  const detail = await loadDetailRaw(circleId, userId);
  if (!detail) throw new Error("Circle tidak ditemukan.");
  return detail;
}

export type CreateReadingCircleCommentInput = {
  body: string;
};

export async function createReadingCircleComment(
  postId: string,
  input: CreateReadingCircleCommentInput,
): Promise<ReadingCircleDetail> {
  const userId = await requireUserId();
  const trimmedBody = (input.body ?? "").trim();
  if (trimmedBody.length === 0) throw new Error("Komentar tidak boleh kosong.");
  if (trimmedBody.length > 2000) throw new Error("Komentar terlalu panjang.");

  const post = await prisma.readingCirclePost.findUnique({
    where: { id: postId },
    select: { id: true, circleId: true },
  });
  if (!post) throw new Error("Post tidak ditemukan.");

  const membership = await getMyMembership(post.circleId, userId);
  if (!membership) throw new Error("Bergabung dulu untuk berkomentar.");

  const commentId = await prisma.$transaction(async (tx) => {
    const created = await tx.readingCircleComment.create({
      data: { postId, authorId: userId, body: trimmedBody },
      select: { id: true },
    });
    await tx.readingCirclePost.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });
    await tx.readingCircle.update({
      where: { id: post.circleId },
      data: { lastActivityAt: new Date() },
    });
    return created.id;
  });

  await recordActivityEvent({
    userId,
    type: "READING_CIRCLE_COMMENT_CREATED",
    sourceType: "READING_CIRCLE_COMMENT",
    sourceId: commentId,
    dedupeKey: `reading-circle-comment:create:${commentId}`,
  });

  revalidatePath(`/dashboard/circles/${post.circleId}`);
  const detail = await loadDetailRaw(post.circleId, userId);
  if (!detail) throw new Error("Circle tidak ditemukan.");
  return detail;
}
