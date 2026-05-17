import { z } from "zod";

/**
 * Validasi query string untuk endpoint `/api/leaderboard*`.
 *
 * Skema sengaja dipakai di route handler (server) **dan** di hook fetcher
 * (klien) supaya satu sumber kebenaran untuk nilai yang valid.
 */

export const leaderboardPeriodSchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "all-time",
]);

export const leaderboardScopeSchema = z.enum([
  "overall",
  "circles",
  "events",
  "reviews",
  "social",
]);

export const leaderboardQuerySchema = z.object({
  period: leaderboardPeriodSchema.default("weekly"),
  scope: leaderboardScopeSchema.default("overall"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const leaderboardMeQuerySchema = z.object({
  period: leaderboardPeriodSchema.default("weekly"),
  scope: leaderboardScopeSchema.default("overall"),
});

export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
export type LeaderboardMeQuery = z.infer<typeof leaderboardMeQuerySchema>;
