import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type {
  BlindMatchCandidateDraft,
  BlindMatchClue,
  BlindMatchReason,
} from "@/features/blind-match/types";

const RECENT_SKIP_COOLDOWN_DAYS = 14;
const MIN_SCORE = 20;

type ViewerSignal = {
  bookIds: Set<string>;
  authors: Set<string>;
  preferredGenres: Set<string>;
  circleIds: Set<string>;
  eventIds: Set<string>;
  keywords: Set<string>;
};

type CandidateProfile = Prisma.BlindMatchProfileGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        bio: true;
        location: true;
        books: {
          where: { visibility: "PUBLIC" };
          include: { book: { select: { id: true; title: true; author: true } } };
        };
        reviews: {
          where: { visibility: "PUBLIC" };
          take: 5;
          orderBy: { createdAt: "desc" };
          include: { book: { select: { title: true; author: true } } };
        };
        quotes: {
          where: { visibility: "PUBLIC" };
          take: 5;
          orderBy: { createdAt: "desc" };
          include: { book: { select: { title: true; author: true } } };
        };
        readingCircleMemberships: { select: { circleId: true } };
        readingEventParticipations: { select: { eventId: true } };
      };
    };
  };
}>;

export async function getBlindMatchEligibility(userId: string) {
  const [shelfCount, reviewCount, quoteCount] = await Promise.all([
    prisma.userBook.count({ where: { userId } }),
    prisma.bookReview.count({ where: { userId } }),
    prisma.bookQuote.count({ where: { userId } }),
  ]);

  const hasShelf = shelfCount >= 3;
  const hasWriting = reviewCount >= 1 || quoteCount >= 1;
  const eligible = hasShelf || hasWriting;
  const missing: string[] = [];

  if (!eligible) {
    missing.push("Tambahkan minimal 3 buku ke rak, atau tulis 1 review/quote.");
  }

  return { eligible, shelfCount, reviewCount, quoteCount, missing };
}

export async function buildBlindMatchCandidateDrafts({
  viewerId,
  limit,
}: {
  viewerId: string;
  limit: number;
}): Promise<BlindMatchCandidateDraft[]> {
  const viewerProfile = await prisma.blindMatchProfile.findUnique({
    where: { userId: viewerId },
    select: { preferredGenres: true, intent: true },
  });
  if (!viewerProfile) return [];

  const [viewerSignal, excludedTargetIds, candidateProfiles] = await Promise.all([
    getViewerSignal(viewerId, viewerProfile.preferredGenres),
    getExcludedTargetIds(viewerId),
    prisma.blindMatchProfile.findMany({
      where: {
        status: "ACTIVE",
        userId: { not: viewerId },
      },
      take: 80,
      include: {
        user: {
          select: {
            id: true,
            bio: true,
            location: true,
            books: {
              where: { visibility: "PUBLIC" },
              take: 24,
              orderBy: { updatedAt: "desc" },
              include: {
                book: { select: { id: true, title: true, author: true } },
              },
            },
            reviews: {
              where: { visibility: "PUBLIC" },
              take: 5,
              orderBy: { createdAt: "desc" },
              include: { book: { select: { title: true, author: true } } },
            },
            quotes: {
              where: { visibility: "PUBLIC" },
              take: 5,
              orderBy: { createdAt: "desc" },
              include: { book: { select: { title: true, author: true } } },
            },
            readingCircleMemberships: { select: { circleId: true } },
            readingEventParticipations: { select: { eventId: true } },
          },
        },
      },
    }),
  ]);

  return candidateProfiles
    .filter((profile) => !excludedTargetIds.has(profile.userId))
    .map((profile) => scoreCandidate(viewerSignal, profile))
    .filter((draft): draft is BlindMatchCandidateDraft => draft !== null)
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, limit);
}

async function getViewerSignal(
  userId: string,
  preferredGenres: string[],
): Promise<ViewerSignal> {
  const [books, reviews, quotes, circles, events] = await Promise.all([
    prisma.userBook.findMany({
      where: { userId },
      take: 80,
      include: { book: { select: { id: true, title: true, author: true } } },
    }),
    prisma.bookReview.findMany({
      where: { userId },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { book: { select: { title: true, author: true } } },
    }),
    prisma.bookQuote.findMany({
      where: { userId },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { book: { select: { title: true, author: true } } },
    }),
    prisma.readingCircleMember.findMany({
      where: { userId },
      select: { circleId: true },
    }),
    prisma.readingEventParticipant.findMany({
      where: { userId },
      select: { eventId: true },
    }),
  ]);

  const keywords = new Set<string>();
  for (const item of [...reviews, ...quotes]) {
    addKeywords(keywords, "body" in item ? item.body : item.quote);
    addKeywords(keywords, item.book.title);
    addKeywords(keywords, item.book.author);
  }
  for (const book of books) {
    addKeywords(keywords, book.book.title);
    addKeywords(keywords, book.book.author);
  }

  return {
    bookIds: new Set(books.map((item) => item.bookId)),
    authors: new Set(books.map((item) => normalize(item.book.author))),
    preferredGenres: new Set(preferredGenres.map(normalize).filter(Boolean)),
    circleIds: new Set(circles.map((item) => item.circleId)),
    eventIds: new Set(events.map((item) => item.eventId)),
    keywords,
  };
}

async function getExcludedTargetIds(viewerId: string): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - RECENT_SKIP_COOLDOWN_DAYS * 86_400_000);
  const rows = await prisma.blindMatchCandidate.findMany({
    where: {
      viewerId,
      OR: [
        { status: { in: ["PRESENTED", "INTERESTED", "MUTUAL", "REVEALED"] } },
        { status: "SKIPPED", skippedAt: { gte: cutoff } },
      ],
    },
    select: { targetId: true },
  });

  return new Set(rows.map((row) => row.targetId));
}

function scoreCandidate(
  viewer: ViewerSignal,
  candidate: CandidateProfile,
): BlindMatchCandidateDraft | null {
  const targetBooks = candidate.user.books;
  const targetAuthors = new Set(
    targetBooks.map((item) => normalize(item.book.author)).filter(Boolean),
  );
  const targetPrefs = new Set(
    candidate.preferredGenres.map(normalize).filter(Boolean),
  );
  const targetKeywords = collectTargetKeywords(candidate);
  const targetCircleIds = new Set(
    candidate.user.readingCircleMemberships.map((item) => item.circleId),
  );
  const targetEventIds = new Set(
    candidate.user.readingEventParticipations.map((item) => item.eventId),
  );

  const sharedBookTitles = targetBooks
    .filter((item) => viewer.bookIds.has(item.bookId))
    .slice(0, 3)
    .map((item) => item.book.title);
  const sharedAuthorCount = intersectionCount(viewer.authors, targetAuthors);
  const genreOverlap = intersectionCount(viewer.preferredGenres, targetPrefs);
  const keywordOverlap = intersectionCount(viewer.keywords, targetKeywords);
  const circleOverlap = intersectionCount(viewer.circleIds, targetCircleIds);
  const eventOverlap = intersectionCount(viewer.eventIds, targetEventIds);

  let score = 10;
  score += Math.min(sharedBookTitles.length * 18, 30);
  score += Math.min(sharedAuthorCount * 7, 14);
  score += Math.min(genreOverlap * 8, 16);
  score += Math.min(keywordOverlap * 3, 15);
  score += Math.min(circleOverlap * 9, 12);
  score += Math.min(eventOverlap * 8, 10);
  score += targetBooks.length > 0 ? 5 : 0;
  score += candidate.user.reviews.length > 0 ? 4 : 0;
  score += candidate.user.quotes.length > 0 ? 4 : 0;

  const compatibilityScore = Math.max(0, Math.min(100, Math.round(score)));
  if (compatibilityScore < MIN_SCORE) return null;

  const reasons = buildReasons({
    sharedBookTitles,
    sharedAuthorCount,
    genreOverlap,
    keywordOverlap,
    circleOverlap,
    eventOverlap,
  });
  const persona = personaFor(candidate);
  const clues = buildClues(candidate, persona, sharedBookTitles, reasons);

  if (clues.length < 3) return null;

  return {
    targetId: candidate.userId,
    compatibilityScore,
    persona,
    reasons,
    clues,
  };
}

function buildReasons({
  sharedBookTitles,
  sharedAuthorCount,
  genreOverlap,
  keywordOverlap,
  circleOverlap,
  eventOverlap,
}: {
  sharedBookTitles: string[];
  sharedAuthorCount: number;
  genreOverlap: number;
  keywordOverlap: number;
  circleOverlap: number;
  eventOverlap: number;
}): BlindMatchReason[] {
  const reasons: BlindMatchReason[] = [];

  if (sharedBookTitles.length > 0) {
    reasons.push({
      label: "Buku bertemu",
      detail: `Kalian punya overlap di ${sharedBookTitles.slice(0, 2).join(", ")}.`,
    });
  }
  if (sharedAuthorCount > 0) {
    reasons.push({
      label: "Penulis sefrekuensi",
      detail: `Ada ${sharedAuthorCount} penulis yang sama-sama muncul di rak kalian.`,
    });
  }
  if (genreOverlap > 0) {
    reasons.push({
      label: "Genre cocok",
      detail: "Preferensi genre kalian saling bersinggungan.",
    });
  }
  if (keywordOverlap > 2) {
    reasons.push({
      label: "Tema obrolan kuat",
      detail: "Review/quote kalian mengarah ke tema bacaan yang mirip.",
    });
  }
  if (circleOverlap > 0 || eventOverlap > 0) {
    reasons.push({
      label: "Jejak komunitas",
      detail: "Kalian pernah muncul di ruang komunitas Shelfgram yang berdekatan.",
    });
  }

  if (reasons.length === 0) {
    reasons.push({
      label: "Ritme baca menarik",
      detail: "Sinyal rak dan aktivitas bacanya cukup kuat untuk dicoba.",
    });
  }

  return reasons.slice(0, 3);
}

function buildClues(
  candidate: CandidateProfile,
  persona: string,
  sharedBookTitles: string[],
  reasons: BlindMatchReason[],
): BlindMatchClue[] {
  const topBook = candidate.user.books[0]?.book;
  const topQuote = candidate.user.quotes[0];
  const topReview = candidate.user.reviews[0];
  const clues: BlindMatchClue[] = [
    {
      stage: 1,
      title: "Persona baca",
      body: `Pembaca ini punya aura ${persona.toLowerCase()} dan terlihat nyaman ngobrol lewat buku, bukan basa-basi.`,
      sourceType: "PERSONA",
      confidence: 0.72,
    },
    {
      stage: 2,
      title: sharedBookTitles.length > 0 ? "Buku yang mempertemukan" : "Sinyal rak",
      body:
        sharedBookTitles.length > 0
          ? `Ada titik temu di ${sharedBookTitles.slice(0, 2).join(", ")}.`
          : topBook
            ? `Salah satu buku publik di raknya adalah ${topBook.title} karya ${topBook.author}.`
            : reasons[0]?.detail ?? "Rak publiknya memberi sinyal cocok untuk dicoba.",
      sourceType: "BOOK",
      confidence: 0.81,
    },
    {
      stage: 3,
      title: topQuote ? "Jejak quote" : topReview ? "Jejak review" : "Icebreaker",
      body: topQuote
        ? `Ia pernah menyimpan quote publik dari ${topQuote.book.title}. Cocok untuk membuka obrolan tentang kalimat yang membekas.`
        : topReview
          ? `Ia pernah menulis review publik tentang ${topReview.book.title}. Mulai dari pertanyaan: bagian mana yang paling menempel?`
          : "Coba tanyakan: buku apa yang paling mengubah cara pandangnya tahun ini?",
      sourceType: topQuote ? "QUOTE" : topReview ? "REVIEW" : "PERSONA",
      confidence: 0.76,
    },
  ];

  return clues;
}

function personaFor(candidate: CandidateProfile): string {
  if (candidate.user.quotes.length >= 3) return "The Quote Collector";
  if (candidate.user.reviews.length >= 3) return "The Deep Reviewer";
  if (candidate.intent === "EVENT_BUDDY") return "The Meetup Reader";
  if (candidate.intent === "GENRE_BUDDY") return "The Genre Twin";
  if (candidate.user.books.some((item) => item.status === "READING")) {
    return "The Active Reader";
  }
  return "The Cozy Reader";
}

function collectTargetKeywords(candidate: CandidateProfile): Set<string> {
  const keywords = new Set<string>();
  for (const item of candidate.user.books) {
    addKeywords(keywords, item.book.title);
    addKeywords(keywords, item.book.author);
  }
  for (const review of candidate.user.reviews) {
    addKeywords(keywords, review.body);
    addKeywords(keywords, review.book.title);
  }
  for (const quote of candidate.user.quotes) {
    addKeywords(keywords, quote.quote);
    addKeywords(keywords, quote.book.title);
  }
  for (const genre of candidate.preferredGenres) {
    addKeywords(keywords, genre);
  }
  return keywords;
}

function addKeywords(target: Set<string>, value: string | null | undefined) {
  for (const token of tokenize(value ?? "")) target.add(token);
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4)
    .slice(0, 24);
}

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function intersectionCount<T>(left: Set<T>, right: Set<T>): number {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) count += 1;
  }
  return count;
}
