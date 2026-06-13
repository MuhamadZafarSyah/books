import type {
  BlindMatchCandidateStatus,
  BlindMatchIntent,
  BlindMatchRevealStage,
  BlindMatchStatus,
  UserBookStatus,
} from "@prisma/client";

export type BlindMatchClue = {
  stage: 1 | 2 | 3;
  title: string;
  body: string;
  sourceType: "BOOK" | "QUOTE" | "REVIEW" | "CIRCLE" | "EVENT" | "PERSONA";
  confidence: number;
};

export type BlindMatchReason = {
  label: string;
  detail: string;
};

export type BlindMatchProfileView = {
  id: string;
  status: BlindMatchStatus;
  intent: BlindMatchIntent;
  preferredGenres: string[];
  discussionStyle: string | null;
  dailyLimit: number;
};

export type BlindMatchEligibility = {
  eligible: boolean;
  shelfCount: number;
  reviewCount: number;
  quoteCount: number;
  missing: string[];
};

export type BlindMatchBookPreview = {
  id: string;
  bookId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  status: UserBookStatus;
  progress: number | null;
  updatedAt: string;
};

export type BlindMatchReaderProfile = {
  id: string | null;
  displayName: string;
  handle: string | null;
  slug: string | null;
  bio: string | null;
  readingVibe: string;
  preferredGenres: string[];
  discussionStyle: string | null;
  topAuthors: string[];
  publicBookCount: number;
  publicReviewCount: number;
  publicQuoteCount: number;
  bookshelf: {
    currentlyReading: BlindMatchBookPreview[];
    finished: BlindMatchBookPreview[];
    recent: BlindMatchBookPreview[];
    shared: BlindMatchBookPreview[];
  };
  latestReview: {
    bookTitle: string;
    body: string;
  } | null;
  favoriteQuote: {
    bookTitle: string;
    quote: string;
  } | null;
};

export type BlindMatchCandidateView = {
  id: string;
  status: BlindMatchCandidateStatus;
  revealStage: BlindMatchRevealStage;
  compatibilityScore: number;
  persona: string;
  reasons: BlindMatchReason[];
  matchHint: string;
  profile: BlindMatchReaderProfile;
  expiresAt: string;
  createdAt: string;
  interestSentAt: string | null;
  mutualAt: string | null;
  isMutual: boolean;
  canSendInterest: boolean;
};

export type BlindMatchInboxItem = {
  id: string;
  direction: "incoming" | "sent" | "match";
  status: BlindMatchCandidateStatus;
  compatibilityScore: number;
  persona: string;
  profile: BlindMatchReaderProfile;
  reasons: BlindMatchReason[];
  matchHint: string;
  createdAt: string;
  interestAt: string | null;
  mutualAt: string | null;
};

export type BlindMatchHomeData = {
  profile: BlindMatchProfileView | null;
  eligibility: BlindMatchEligibility;
  candidates: BlindMatchCandidateView[];
  incomingInterests: BlindMatchInboxItem[];
  sentInterests: BlindMatchInboxItem[];
  matches: BlindMatchInboxItem[];
  dailyRemaining: number;
};

export type BlindMatchCandidateDraft = {
  targetId: string;
  compatibilityScore: number;
  persona: string;
  reasons: BlindMatchReason[];
  clues: BlindMatchClue[];
};
