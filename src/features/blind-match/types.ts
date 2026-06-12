import type {
  BlindMatchCandidateStatus,
  BlindMatchIntent,
  BlindMatchRevealStage,
  BlindMatchStatus,
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

export type BlindMatchCandidateView = {
  id: string;
  status: BlindMatchCandidateStatus;
  revealStage: BlindMatchRevealStage;
  compatibilityScore: number;
  persona: string;
  reasons: BlindMatchReason[];
  clues: BlindMatchClue[];
  visibleClues: BlindMatchClue[];
  expiresAt: string;
  createdAt: string;
  isMutual: boolean;
  canBookmarkInterest: boolean;
  revealedUser: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    slug: string;
    bio: string | null;
    location: string | null;
  } | null;
};

export type BlindMatchHomeData = {
  profile: BlindMatchProfileView | null;
  eligibility: BlindMatchEligibility;
  candidates: BlindMatchCandidateView[];
  dailyRemaining: number;
};

export type BlindMatchCandidateDraft = {
  targetId: string;
  compatibilityScore: number;
  persona: string;
  reasons: BlindMatchReason[];
  clues: BlindMatchClue[];
};
