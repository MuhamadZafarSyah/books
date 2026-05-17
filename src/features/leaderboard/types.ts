/**
 * View-models untuk fitur Leaderboard.
 *
 * Semua field primitif/ISO string supaya aman dilewatkan dari Server
 * Component / route handler ke Client Component.
 */

export type LeaderboardPeriodKey = "daily" | "weekly" | "monthly" | "all-time";

export type LeaderboardScopeKey =
  | "overall"
  | "circles"
  | "events"
  | "reviews"
  | "social";

export type LeaderboardBreakdown = {
  circles: number;
  events: number;
  reviews: number;
  social: number;
};

export type LeaderboardUserRow = {
  rank: number;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    slug: string;
  };
  totalPoints: number;
  breakdown: LeaderboardBreakdown;
  latestActivityAt: string | null;
};

export type LeaderboardResponse = {
  period: LeaderboardPeriodKey;
  scope: LeaderboardScopeKey;
  topThree: LeaderboardUserRow[];
  rows: LeaderboardUserRow[];
  total: number;
};

export type LeaderboardMeResponse = {
  rank: number | null;
  totalPoints: number;
  percentile: number | null;
  breakdown: LeaderboardBreakdown;
};

export type LeaderboardScoringRule = {
  type: string;
  label: string;
  points: number;
  scope: Exclude<LeaderboardScopeKey, "overall">;
  notes?: string;
};

export type LeaderboardScoringResponse = {
  rules: LeaderboardScoringRule[];
};
