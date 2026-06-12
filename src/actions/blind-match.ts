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
  BlindMatchCandidateView,
  BlindMatchClue,
  BlindMatchHomeData,
  BlindMatchProfileView,
  BlindMatchReason,
} from "@/features/blind-match/types";
import { prisma } from "@/lib/db";
import { profileSlugFor } from "@/lib/public-profile";
import { requireAuth } from "@/lib/session";

const CANDIDATE_TTL_HOURS = 72;
const HOME_CANDIDATE_LIMIT = 6;

const activeCandidateStatuses = [
  "PRESENTED",
  "INTERESTED",
  "MUTUAL",
  "REVEALED",
] as const;

const candidateInclude = {
  target: {
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
      bio: true,
      location: true,
    },
  },
} satisfies Prisma.BlindMatchCandidateInclude;

type CandidateWithTarget = Prisma.BlindMatchCandidateGetPayload<{
  include: typeof candidateInclude;
}>;

async function requireUserId() {
  const user = await requireAuth();
  if (!user.id) throw new Error("Sesi tidak valid.");
  return user.id;
}

export async function getBlindMatchHome(): Promise<BlindMatchHomeData> {
  const userId = await requireUserId();
  await expireOldCandidates(userId);

  const [profile, eligibility] = await Promise.all([
    prisma.blindMatchProfile.findUnique({ where: { userId } }),
    getBlindMatchEligibility(userId),
  ]);

  if (!profile) {
    return {
      profile: null,
      eligibility,
      candidates: [],
      dailyRemaining: 0,
    };
  }

  const [todayCount, candidates] = await Promise.all([
    prisma.blindMatchCandidate.count({
      where: {
        viewerId: userId,
        createdAt: { gte: startOfToday() },
      },
    }),
    prisma.blindMatchCandidate.findMany({
      where: {
        viewerId: userId,
        status: { in: [...activeCandidateStatuses] },
      },
      orderBy: [{ mutualAt: "desc" }, { createdAt: "desc" }],
      take: HOME_CANDIDATE_LIMIT,
      include: candidateInclude,
    }),
  ]);

  return {
    profile: serializeProfile(profile),
    eligibility,
    candidates: candidates.map(serializeCandidate),
    dailyRemaining: Math.max(0, profile.dailyLimit - todayCount),
  };
}

export async function saveBlindMatchProfile(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const parsed = blindMatchProfileSchema.parse(input);

  await prisma.blindMatchProfile.upsert({
    where: { userId },
    update: {
      status: "ACTIVE",
      intent: parsed.intent,
      preferredGenres: normalizeGenres(parsed.preferredGenres),
      discussionStyle: normalizeNullableText(parsed.discussionStyle),
    },
    create: {
      userId,
      status: "ACTIVE",
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

  const [profile, eligibility, todayCount] = await Promise.all([
    prisma.blindMatchProfile.findUnique({ where: { userId } }),
    getBlindMatchEligibility(userId),
    prisma.blindMatchCandidate.count({
      where: { viewerId: userId, createdAt: { gte: startOfToday() } },
    }),
  ]);

  if (!profile) throw new Error("Aktifkan Blind Reading Match terlebih dahulu.");
  if (profile.status !== "ACTIVE") throw new Error("Blind Match sedang dijeda.");
  if (!eligibility.eligible) throw new Error(eligibility.missing[0] ?? "Data baca belum cukup.");

  const remaining = Math.max(0, profile.dailyLimit - todayCount);
  if (remaining === 0) return 0;

  const drafts = await buildBlindMatchCandidateDrafts({
    viewerId: userId,
    limit: remaining,
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
        revealStage: "CHAPTER_1",
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
        revealStage: "CHAPTER_1",
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
    data: { lastMatchedAt: new Date() },
  });

  revalidatePath("/dashboard/blind-match");
  return created;
}

export async function revealNextBlindChapter(candidateId: string): Promise<void> {
  const userId = await requireUserId();
  const { candidateId: id } = blindMatchCandidateIdSchema.parse({ candidateId });

  const candidate = await prisma.blindMatchCandidate.findFirst({
    where: { id, viewerId: userId },
    select: { id: true, status: true, revealStage: true, expiresAt: true },
  });
  if (!candidate) throw new Error("Match tidak ditemukan.");
  if (candidate.expiresAt < new Date() && candidate.status !== "MUTUAL") {
    throw new Error("Match ini sudah kedaluwarsa.");
  }

  const nextStage =
    candidate.revealStage === "CHAPTER_1"
      ? "CHAPTER_2"
      : candidate.revealStage === "CHAPTER_2"
        ? "CHAPTER_3"
        : candidate.revealStage;

  await prisma.blindMatchCandidate.update({
    where: { id: candidate.id },
    data: { revealStage: nextStage },
  });
  revalidatePath("/dashboard/blind-match");
}

export async function skipBlindCandidate(candidateId: string): Promise<void> {
  const userId = await requireUserId();
  const { candidateId: id } = blindMatchCandidateIdSchema.parse({ candidateId });

  const candidate = await prisma.blindMatchCandidate.findFirst({
    where: { id, viewerId: userId },
    select: { id: true, status: true },
  });
  if (!candidate) throw new Error("Match tidak ditemukan.");
  if (candidate.status === "MUTUAL" || candidate.status === "REVEALED") {
    throw new Error("Match mutual tidak bisa di-skip dari kartu ini.");
  }

  await prisma.blindMatchCandidate.update({
    where: { id: candidate.id },
    data: { status: "SKIPPED", skippedAt: new Date() },
  });
  revalidatePath("/dashboard/blind-match");
}

export async function bookmarkBlindInterest(candidateId: string): Promise<boolean> {
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
        revealStage: true,
        expiresAt: true,
      },
    });
    if (!candidate) throw new Error("Match tidak ditemukan.");
    if (candidate.expiresAt < now) throw new Error("Match ini sudah kedaluwarsa.");
    if (candidate.revealStage === "CHAPTER_1") {
      throw new Error("Buka minimal 2 chapter sebelum mengirim interest.");
    }
    if (candidate.status === "SKIPPED" || candidate.status === "EXPIRED") {
      throw new Error("Match ini tidak aktif lagi.");
    }

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
        revealStage: mutual ? "MUTUAL" : candidate.revealStage,
        viewerInterestAt: now,
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

export async function startBlindMatchChat(candidateId: string): Promise<string> {
  const userId = await requireUserId();
  const { candidateId: id } = blindMatchCandidateIdSchema.parse({ candidateId });

  const candidate = await prisma.blindMatchCandidate.findFirst({
    where: { id, viewerId: userId },
    select: { id: true, targetId: true, status: true },
  });
  if (!candidate) throw new Error("Match tidak ditemukan.");
  if (candidate.status !== "MUTUAL" && candidate.status !== "REVEALED") {
    throw new Error("Chat hanya terbuka setelah mutual reveal.");
  }

  await prisma.blindMatchCandidate.update({
    where: { id: candidate.id },
    data: { status: "REVEALED", revealStage: "MUTUAL", revealedAt: new Date() },
  });

  const conversationId = await startDirectConversation(candidate.targetId);
  revalidatePath("/dashboard/blind-match");
  return conversationId;
}

async function expireOldCandidates(userId: string) {
  await prisma.blindMatchCandidate.updateMany({
    where: {
      viewerId: userId,
      status: { in: ["PRESENTED", "INTERESTED"] },
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
}

function serializeProfile(profile: {
  id: string;
  status: "ACTIVE" | "PAUSED";
  intent: "CASUAL_DISCUSSION" | "GENRE_BUDDY" | "EVENT_BUDDY" | "SURPRISE_ME";
  preferredGenres: string[];
  discussionStyle: string | null;
  dailyLimit: number;
}): BlindMatchProfileView {
  return {
    id: profile.id,
    status: profile.status,
    intent: profile.intent,
    preferredGenres: profile.preferredGenres,
    discussionStyle: profile.discussionStyle,
    dailyLimit: profile.dailyLimit,
  };
}

function serializeCandidate(candidate: CandidateWithTarget): BlindMatchCandidateView {
  const clues = parseClues(candidate.cluesJson);
  const reasons = parseReasons(candidate.reasonsJson);
  const isMutual = candidate.status === "MUTUAL" || candidate.status === "REVEALED";
  const visibleClues = isMutual
    ? clues
    : clues.filter((clue) => clue.stage <= visibleStageNumber(candidate.revealStage));

  return {
    id: candidate.id,
    status: candidate.status,
    revealStage: candidate.revealStage,
    compatibilityScore: candidate.compatibilityScore,
    persona: candidate.persona,
    reasons,
    clues,
    visibleClues,
    expiresAt: candidate.expiresAt.toISOString(),
    createdAt: candidate.createdAt.toISOString(),
    isMutual,
    canBookmarkInterest:
      !isMutual &&
      candidate.status !== "INTERESTED" &&
      visibleStageNumber(candidate.revealStage) >= 2,
    revealedUser: isMutual
      ? {
          id: candidate.target.id,
          name: candidate.target.name,
          username: candidate.target.username,
          image: candidate.target.image,
          bio: candidate.target.bio,
          location: candidate.target.location,
          slug: profileSlugFor(candidate.target),
        }
      : null,
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

function parseClues(value: Prisma.JsonValue): BlindMatchClue[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      if (
        (record.stage !== 1 && record.stage !== 2 && record.stage !== 3) ||
        typeof record.title !== "string" ||
        typeof record.body !== "string" ||
        typeof record.sourceType !== "string" ||
        typeof record.confidence !== "number"
      ) {
        return null;
      }
      return {
        stage: record.stage,
        title: record.title,
        body: record.body,
        sourceType: record.sourceType as BlindMatchClue["sourceType"],
        confidence: record.confidence,
      };
    })
    .filter((item): item is BlindMatchClue => item !== null);
}

function visibleStageNumber(stage: string): 0 | 1 | 2 | 3 {
  if (stage === "CHAPTER_1") return 1;
  if (stage === "CHAPTER_2") return 2;
  if (stage === "CHAPTER_3" || stage === "MUTUAL") return 3;
  return 0;
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

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
