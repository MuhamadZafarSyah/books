"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { startDirectConversation } from "@/actions/chat";
import {
  blindMatchCandidateIdSchema,
  blindMatchProfileSchema,
} from "@/features/blind-match/schemas/blind-match-schemas";
import {
  buildBlindMatchCandidateDrafts,
  getBlindMatchEligibility,
} from "@/features/blind-match/lib/matching";
import type {
  BlindMatchBookPreview,
  BlindMatchCandidateView,
  BlindMatchHomeData,
  BlindMatchInboxItem,
  BlindMatchProfileView,
  BlindMatchReaderProfile,
  BlindMatchReason,
} from "@/features/blind-match/types";
import { prisma } from "@/lib/db";
import { profileSlugFor } from "@/lib/public-profile";
import { requireAuth } from "@/lib/session";

const CANDIDATE_TTL_HOURS = 168;
const DISCOVERY_DAILY_LIMIT = 8;
const DISCOVERY_DECK_LIMIT = 8;
const INBOX_LIMIT = 8;
const MATCH_LIMIT = 8;

const readerProfileSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  bio: true,
  blindMatchProfile: {
    select: {
      intent: true,
      preferredGenres: true,
      discussionStyle: true,
    },
  },
  books: {
    where: { visibility: "PUBLIC" },
    orderBy: { updatedAt: "desc" },
    take: 32,
    select: {
      id: true,
      bookId: true,
      status: true,
      progress: true,
      updatedAt: true,
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          coverUrl: true,
        },
      },
    },
  },
  reviews: {
    where: { visibility: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      body: true,
      book: { select: { title: true } },
    },
  },
  quotes: {
    where: { visibility: "PUBLIC" },
    orderBy: [{ isFavorite: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: {
      quote: true,
      book: { select: { title: true } },
    },
  },
} satisfies Prisma.UserSelect;

const candidateWithTargetInclude = {
  target: { select: readerProfileSelect },
} satisfies Prisma.BlindMatchCandidateInclude;

const candidateWithViewerInclude = {
  viewer: { select: readerProfileSelect },
} satisfies Prisma.BlindMatchCandidateInclude;

const candidateWithPairInclude = {
  viewer: { select: readerProfileSelect },
  target: { select: readerProfileSelect },
} satisfies Prisma.BlindMatchCandidateInclude;

type ReaderProfileRecord = Prisma.UserGetPayload<{
  select: typeof readerProfileSelect;
}>;

type CandidateWithTarget = Prisma.BlindMatchCandidateGetPayload<{
  include: typeof candidateWithTargetInclude;
}>;

type CandidateWithViewer = Prisma.BlindMatchCandidateGetPayload<{
  include: typeof candidateWithViewerInclude;
}>;

type CandidateWithPair = Prisma.BlindMatchCandidateGetPayload<{
  include: typeof candidateWithPairInclude;
}>;

async function requireUserId() {
  const user = await requireAuth();
  if (!user.id) throw new Error("Sesi tidak valid.");
  return user.id;
}

export async function getBlindMatchHome(): Promise<BlindMatchHomeData> {
  const userId = await requireUserId();
  await expireOldCandidates(userId);

  const [profile, eligibility, viewerBooks] = await Promise.all([
    prisma.blindMatchProfile.findUnique({ where: { userId } }),
    getBlindMatchEligibility(userId),
    prisma.userBook.findMany({
      where: { userId },
      select: { bookId: true },
      take: 160,
    }),
  ]);
  const viewerBookIds = new Set(viewerBooks.map((book) => book.bookId));

  if (!profile) {
    return {
      profile: null,
      eligibility,
      candidates: [],
      incomingInterests: [],
      sentInterests: [],
      matches: [],
      dailyRemaining: 0,
    };
  }

  const dailyLimit = effectiveDailyLimit(profile.dailyLimit);

  const [todayCount, candidates, incomingInterests, sentInterests, matches] =
    await Promise.all([
      prisma.blindMatchCandidate.count({
        where: {
          viewerId: userId,
          createdAt: { gte: startOfToday() },
        },
      }),
      prisma.blindMatchCandidate.findMany({
        where: {
          viewerId: userId,
          status: "PRESENTED",
          expiresAt: { gt: new Date() },
        },
        orderBy: [{ compatibilityScore: "desc" }, { createdAt: "desc" }],
        take: DISCOVERY_DECK_LIMIT,
        include: candidateWithTargetInclude,
      }),
      prisma.blindMatchCandidate.findMany({
        where: {
          targetId: userId,
          status: "INTERESTED",
          viewerInterestAt: { not: null },
        },
        orderBy: { viewerInterestAt: "desc" },
        take: INBOX_LIMIT,
        include: candidateWithViewerInclude,
      }),
      prisma.blindMatchCandidate.findMany({
        where: {
          viewerId: userId,
          status: "INTERESTED",
          viewerInterestAt: { not: null },
        },
        orderBy: { viewerInterestAt: "desc" },
        take: INBOX_LIMIT,
        include: candidateWithTargetInclude,
      }),
      prisma.blindMatchCandidate.findMany({
        where: {
          status: { in: ["MUTUAL", "REVEALED"] },
          OR: [{ viewerId: userId }, { targetId: userId }],
        },
        orderBy: [{ mutualAt: "desc" }, { updatedAt: "desc" }],
        take: MATCH_LIMIT * 2,
        include: candidateWithPairInclude,
      }),
    ]);

  return {
    profile: serializeProfile(profile, dailyLimit),
    eligibility,
    candidates: candidates.map((candidate) =>
      serializeDiscoveryCandidate(candidate, viewerBookIds),
    ),
    incomingInterests: incomingInterests.map((candidate) =>
      serializeIncomingInterest(candidate, viewerBookIds),
    ),
    sentInterests: sentInterests.map((candidate) =>
      serializeSentInterest(candidate, viewerBookIds),
    ),
    matches: serializeMatches(matches, userId, viewerBookIds),
    dailyRemaining: Math.max(0, dailyLimit - todayCount),
  };
}

export async function saveBlindMatchProfile(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = blindMatchProfileSchema.parse(input);

  await prisma.blindMatchProfile.upsert({
    where: { userId },
    update: {
      status: "ACTIVE",
      dailyLimit: DISCOVERY_DAILY_LIMIT,
      intent: parsed.intent,
      preferredGenres: normalizeGenres(parsed.preferredGenres),
      discussionStyle: normalizeNullableText(parsed.discussionStyle),
    },
    create: {
      userId,
      status: "ACTIVE",
      dailyLimit: DISCOVERY_DAILY_LIMIT,
      intent: parsed.intent,
      preferredGenres: normalizeGenres(parsed.preferredGenres),
      discussionStyle: normalizeNullableText(parsed.discussionStyle),
    },
  });

  revalidatePath("/dashboard/blind-match");
}

export async function setBlindMatchPaused(paused: boolean): Promise<void> {
  const userId = await requireUserId();
  await prisma.blindMatchProfile.update({
    where: { userId },
    data: { status: paused ? "PAUSED" : "ACTIVE" },
  });
  revalidatePath("/dashboard/blind-match");
}

export async function generateBlindMatchCandidates(): Promise<number> {
  const userId = await requireUserId();
  await expireOldCandidates(userId);

  const [profile, todayCount] = await Promise.all([
    prisma.blindMatchProfile.findUnique({ where: { userId } }),
    prisma.blindMatchCandidate.count({
      where: { viewerId: userId, createdAt: { gte: startOfToday() } },
    }),
  ]);

  if (!profile) throw new Error("Join Blind Reading dulu untuk mulai swipe.");
  if (profile.status !== "ACTIVE") throw new Error("Blind Reading sedang dijeda.");

  const remaining = Math.max(0, effectiveDailyLimit(profile.dailyLimit) - todayCount);
  if (remaining === 0) return 0;

  const drafts = await buildBlindMatchCandidateDrafts({
    viewerId: userId,
    limit: Math.min(remaining, DISCOVERY_DECK_LIMIT),
  });
  const expiresAt = new Date(Date.now() + CANDIDATE_TTL_HOURS * 3_600_000);
  let created = 0;

  for (const draft of drafts) {
    await prisma.blindMatchCandidate.upsert({
      where: {
        viewerId_targetId: { viewerId: userId, targetId: draft.targetId },
      },
      update: {
        status: "PRESENTED",
        revealStage: "NONE",
        compatibilityScore: draft.compatibilityScore,
        persona: draft.persona,
        reasonsJson: draft.reasons as unknown as Prisma.InputJsonValue,
        cluesJson: draft.clues as unknown as Prisma.InputJsonValue,
        viewerInterestAt: null,
        targetInterestAt: null,
        mutualAt: null,
        revealedAt: null,
        skippedAt: null,
        expiresAt,
      },
      create: {
        viewerId: userId,
        targetId: draft.targetId,
        status: "PRESENTED",
        revealStage: "NONE",
        compatibilityScore: draft.compatibilityScore,
        persona: draft.persona,
        reasonsJson: draft.reasons as unknown as Prisma.InputJsonValue,
        cluesJson: draft.clues as unknown as Prisma.InputJsonValue,
        expiresAt,
      },
    });
    created += 1;
  }

  await prisma.blindMatchProfile.update({
    where: { userId },
    data: { lastMatchedAt: new Date(), dailyLimit: DISCOVERY_DAILY_LIMIT },
  });

  revalidatePath("/dashboard/blind-match");
  return created;
}

export async function skipBlindCandidate(candidateId: string): Promise<void> {
  const userId = await requireUserId();
  const { candidateId: id } = blindMatchCandidateIdSchema.parse({ candidateId });

  const candidate = await prisma.blindMatchCandidate.findFirst({
    where: { id, viewerId: userId, status: "PRESENTED" },
    select: { id: true },
  });
  if (!candidate) throw new Error("Kartu ini tidak tersedia lagi.");

  await prisma.blindMatchCandidate.update({
    where: { id: candidate.id },
    data: { status: "SKIPPED", skippedAt: new Date() },
  });
  revalidatePath("/dashboard/blind-match");
}

export async function sendBlindInterest(candidateId: string): Promise<boolean> {
  const userId = await requireUserId();
  const { candidateId: id } = blindMatchCandidateIdSchema.parse({ candidateId });
  const now = new Date();

  const becameMutual = await prisma.$transaction(async (tx) => {
    const candidate = await tx.blindMatchCandidate.findFirst({
      where: { id, viewerId: userId },
      select: {
        id: true,
        viewerId: true,
        targetId: true,
        status: true,
        expiresAt: true,
        viewerInterestAt: true,
      },
    });
    if (!candidate) throw new Error("Kartu ini tidak ditemukan.");
    if (candidate.status === "SKIPPED" || candidate.status === "EXPIRED") {
      throw new Error("Kartu ini tidak aktif lagi.");
    }
    if (candidate.status === "MUTUAL" || candidate.status === "REVEALED") {
      return true;
    }
    if (candidate.expiresAt < now) throw new Error("Kartu ini sudah kedaluwarsa.");

    const reverse = await tx.blindMatchCandidate.findUnique({
      where: {
        viewerId_targetId: {
          viewerId: candidate.targetId,
          targetId: candidate.viewerId,
        },
      },
      select: { id: true, viewerInterestAt: true, status: true },
    });
    const mutual = Boolean(
      reverse?.viewerInterestAt &&
        (reverse.status === "INTERESTED" ||
          reverse.status === "MUTUAL" ||
          reverse.status === "REVEALED"),
    );

    await tx.blindMatchCandidate.update({
      where: { id: candidate.id },
      data: {
        status: mutual ? "MUTUAL" : "INTERESTED",
        revealStage: mutual ? "MUTUAL" : "NONE",
        viewerInterestAt: candidate.viewerInterestAt ?? now,
        targetInterestAt: mutual ? reverse?.viewerInterestAt ?? now : null,
        mutualAt: mutual ? now : null,
      },
    });

    if (mutual && reverse) {
      await tx.blindMatchCandidate.update({
        where: { id: reverse.id },
        data: {
          status: reverse.status === "REVEALED" ? "REVEALED" : "MUTUAL",
          revealStage: "MUTUAL",
          targetInterestAt: now,
          mutualAt: now,
        },
      });
    }

    return mutual;
  });

  revalidatePath("/dashboard/blind-match");
  return becameMutual;
}

export async function acceptBlindInterest(candidateId: string): Promise<void> {
  const userId = await requireUserId();
  const { candidateId: id } = blindMatchCandidateIdSchema.parse({ candidateId });
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const incoming = await tx.blindMatchCandidate.findFirst({
      where: {
        id,
        targetId: userId,
        status: "INTERESTED",
        viewerInterestAt: { not: null },
      },
      select: {
        id: true,
        viewerId: true,
        targetId: true,
        viewerInterestAt: true,
      },
    });
    if (!incoming) throw new Error("Interest ini tidak tersedia lagi.");

    await tx.blindMatchCandidate.update({
      where: { id: incoming.id },
      data: {
        status: "MUTUAL",
        revealStage: "MUTUAL",
        targetInterestAt: now,
        mutualAt: now,
      },
    });

    await tx.blindMatchCandidate.updateMany({
      where: {
        viewerId: incoming.targetId,
        targetId: incoming.viewerId,
        status: { in: ["PRESENTED", "INTERESTED", "SKIPPED", "EXPIRED"] },
      },
      data: {
        status: "MUTUAL",
        revealStage: "MUTUAL",
        viewerInterestAt: now,
        targetInterestAt: incoming.viewerInterestAt ?? now,
        mutualAt: now,
      },
    });
  });

  revalidatePath("/dashboard/blind-match");
}

export async function declineBlindInterest(candidateId: string): Promise<void> {
  const userId = await requireUserId();
  const { candidateId: id } = blindMatchCandidateIdSchema.parse({ candidateId });

  const result = await prisma.blindMatchCandidate.updateMany({
    where: {
      id,
      targetId: userId,
      status: "INTERESTED",
      viewerInterestAt: { not: null },
    },
    data: { status: "SKIPPED", skippedAt: new Date() },
  });

  if (result.count === 0) throw new Error("Interest ini tidak tersedia lagi.");
  revalidatePath("/dashboard/blind-match");
}

export async function startBlindMatchChat(candidateId: string): Promise<string> {
  const userId = await requireUserId();
  const { candidateId: id } = blindMatchCandidateIdSchema.parse({ candidateId });

  const candidate = await prisma.blindMatchCandidate.findFirst({
    where: {
      id,
      status: { in: ["MUTUAL", "REVEALED"] },
      OR: [{ viewerId: userId }, { targetId: userId }],
    },
    select: { id: true, viewerId: true, targetId: true },
  });
  if (!candidate) throw new Error("Chat hanya terbuka setelah match.");

  const otherUserId = candidate.viewerId === userId ? candidate.targetId : candidate.viewerId;

  await prisma.blindMatchCandidate.updateMany({
    where: {
      status: { in: ["MUTUAL", "REVEALED"] },
      OR: [
        { viewerId: userId, targetId: otherUserId },
        { viewerId: otherUserId, targetId: userId },
      ],
    },
    data: { status: "REVEALED", revealStage: "MUTUAL", revealedAt: new Date() },
  });

  const conversationId = await startDirectConversation(otherUserId);
  revalidatePath("/dashboard/blind-match");
  return conversationId;
}

async function expireOldCandidates(userId: string) {
  await prisma.blindMatchCandidate.updateMany({
    where: {
      viewerId: userId,
      status: "PRESENTED",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
}

function serializeProfile(
  profile: {
    id: string;
    status: "ACTIVE" | "PAUSED";
    intent: "CASUAL_DISCUSSION" | "GENRE_BUDDY" | "EVENT_BUDDY" | "SURPRISE_ME";
    preferredGenres: string[];
    discussionStyle: string | null;
    dailyLimit: number;
  },
  dailyLimit = effectiveDailyLimit(profile.dailyLimit),
): BlindMatchProfileView {
  return {
    id: profile.id,
    status: profile.status,
    intent: profile.intent,
    preferredGenres: profile.preferredGenres,
    discussionStyle: profile.discussionStyle,
    dailyLimit,
  };
}

function serializeDiscoveryCandidate(
  candidate: CandidateWithTarget,
  viewerBookIds: Set<string>,
): BlindMatchCandidateView {
  const reasons = parseReasons(candidate.reasonsJson);
  const isMutual = candidate.status === "MUTUAL" || candidate.status === "REVEALED";

  return {
    id: candidate.id,
    status: candidate.status,
    revealStage: candidate.revealStage,
    compatibilityScore: candidate.compatibilityScore,
    persona: candidate.persona,
    reasons,
    matchHint: buildMatchHint(reasons, candidate.target),
    profile: serializeReaderProfile(candidate.target, candidate.persona, viewerBookIds),
    expiresAt: candidate.expiresAt.toISOString(),
    createdAt: candidate.createdAt.toISOString(),
    interestSentAt: candidate.viewerInterestAt?.toISOString() ?? null,
    mutualAt: candidate.mutualAt?.toISOString() ?? null,
    isMutual,
    canSendInterest: candidate.status === "PRESENTED" && candidate.expiresAt > new Date(),
  };
}

function serializeIncomingInterest(
  candidate: CandidateWithViewer,
  viewerBookIds: Set<string>,
): BlindMatchInboxItem {
  const reasons = parseReasons(candidate.reasonsJson);

  return {
    id: candidate.id,
    direction: "incoming",
    status: candidate.status,
    compatibilityScore: candidate.compatibilityScore,
    persona: candidate.persona,
    profile: serializeReaderProfile(candidate.viewer, candidate.persona, viewerBookIds),
    reasons,
    matchHint: "Dia tertarik dengan vibe bacamu.",
    createdAt: candidate.createdAt.toISOString(),
    interestAt: candidate.viewerInterestAt?.toISOString() ?? null,
    mutualAt: candidate.mutualAt?.toISOString() ?? null,
  };
}

function serializeSentInterest(
  candidate: CandidateWithTarget,
  viewerBookIds: Set<string>,
): BlindMatchInboxItem {
  const reasons = parseReasons(candidate.reasonsJson);

  return {
    id: candidate.id,
    direction: "sent",
    status: candidate.status,
    compatibilityScore: candidate.compatibilityScore,
    persona: candidate.persona,
    profile: serializeReaderProfile(candidate.target, candidate.persona, viewerBookIds),
    reasons,
    matchHint: buildMatchHint(reasons, candidate.target),
    createdAt: candidate.createdAt.toISOString(),
    interestAt: candidate.viewerInterestAt?.toISOString() ?? null,
    mutualAt: candidate.mutualAt?.toISOString() ?? null,
  };
}

function serializeMatches(
  candidates: CandidateWithPair[],
  userId: string,
  viewerBookIds: Set<string>,
): BlindMatchInboxItem[] {
  const byOtherUser = new Map<string, BlindMatchInboxItem>();

  for (const candidate of candidates) {
    const other = candidate.viewerId === userId ? candidate.target : candidate.viewer;
    const otherId = candidate.viewerId === userId ? candidate.targetId : candidate.viewerId;
    if (byOtherUser.has(otherId)) continue;

    const reasons = parseReasons(candidate.reasonsJson);
    byOtherUser.set(otherId, {
      id: candidate.id,
      direction: "match",
      status: candidate.status,
      compatibilityScore: candidate.compatibilityScore,
      persona: candidate.persona,
      profile: serializeReaderProfile(other, candidate.persona, viewerBookIds, true),
      reasons,
      matchHint: "Kalian sama-sama mengirim interest.",
      createdAt: candidate.createdAt.toISOString(),
      interestAt: candidate.viewerInterestAt?.toISOString() ?? null,
      mutualAt: candidate.mutualAt?.toISOString() ?? null,
    });
  }

  return Array.from(byOtherUser.values()).slice(0, MATCH_LIMIT);
}

function serializeReaderProfile(
  user: ReaderProfileRecord,
  persona: string,
  viewerBookIds: Set<string>,
  revealIdentity = false,
): BlindMatchReaderProfile {
  const publicBooks = user.books.map(serializeBookPreview);
  const currentlyReading = publicBooks
    .filter((book) => book.status === "READING")
    .slice(0, 3);
  const finished = publicBooks
    .filter((book) => book.status === "FINISHED")
    .slice(0, 4);
  const shared = publicBooks
    .filter((book) => viewerBookIds.has(book.bookId))
    .slice(0, 4);

  return {
    id: revealIdentity ? user.id : null,
    displayName: displayNameFor(user),
    handle: revealIdentity && user.username ? `@${user.username}` : null,
    slug: revealIdentity ? profileSlugFor(user) : null,
    bio: normalizeNullableText(user.bio),
    readingVibe: persona,
    preferredGenres: user.blindMatchProfile?.preferredGenres.slice(0, 4) ?? [],
    discussionStyle: user.blindMatchProfile?.discussionStyle ?? null,
    topAuthors: topAuthorsFrom(publicBooks),
    publicBookCount: publicBooks.length,
    publicReviewCount: user.reviews.length,
    publicQuoteCount: user.quotes.length,
    bookshelf: {
      currentlyReading,
      finished,
      recent: publicBooks.slice(0, 6),
      shared,
    },
    latestReview: user.reviews[0]
      ? {
          bookTitle: user.reviews[0].book.title,
          body: truncate(user.reviews[0].body, 120),
        }
      : null,
    favoriteQuote: user.quotes[0]
      ? {
          bookTitle: user.quotes[0].book.title,
          quote: truncate(user.quotes[0].quote, 120),
        }
      : null,
  };
}

function serializeBookPreview(
  item: ReaderProfileRecord["books"][number],
): BlindMatchBookPreview {
  return {
    id: item.id,
    bookId: item.bookId,
    title: item.book.title,
    author: item.book.author,
    coverUrl: item.book.coverUrl,
    status: item.status,
    progress: item.progress,
    updatedAt: item.updatedAt.toISOString(),
  };
}

function parseReasons(value: Prisma.JsonValue): BlindMatchReason[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      if (typeof record.label !== "string" || typeof record.detail !== "string") {
        return null;
      }
      return { label: record.label, detail: record.detail };
    })
    .filter((item): item is BlindMatchReason => item !== null);
}

function buildMatchHint(reasons: BlindMatchReason[], user: ReaderProfileRecord) {
  if (reasons[0]?.detail) return reasons[0].detail;
  const currentBook = user.books.find((book) => book.status === "READING")?.book.title;
  if (currentBook) return `Sedang membaca ${currentBook}.`;
  return "Rak publiknya punya sinyal menarik untuk dicek.";
}

function topAuthorsFrom(books: BlindMatchBookPreview[]) {
  const counts = new Map<string, number>();
  for (const book of books) {
    const author = book.author.trim();
    if (!author) continue;
    counts.set(author, (counts.get(author) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([author]) => author)
    .slice(0, 3);
}

function displayNameFor(user: Pick<ReaderProfileRecord, "name" | "username">) {
  return normalizeNullableText(user.name) ?? user.username ?? "Pembaca Shelfgram";
}

function effectiveDailyLimit(value: number) {
  return Math.max(value, DISCOVERY_DAILY_LIMIT);
}

function normalizeGenres(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).slice(0, 8);
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function truncate(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trim()}…`;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
