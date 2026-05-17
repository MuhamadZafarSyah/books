import type { Prisma, UserActivityType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { profileSlugFor } from "@/lib/public-profile";
import { resolvePeriodRange } from "@/lib/leaderboard/periods";
import {
  ACTIVITY_SCOPE,
  SCOPE_ACTIVITY_TYPES,
  type ScopeKey,
} from "@/lib/leaderboard/scoring";
import type {
  LeaderboardBreakdown,
  LeaderboardMeResponse,
  LeaderboardPeriodKey,
  LeaderboardResponse,
  LeaderboardUserRow,
} from "@/features/leaderboard/types";

const TOP_THREE_LIMIT = 3;

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  image: true,
} as const;

/**
 * Bentuk satu baris hasil aggregate per user (sebelum di-rank).
 */
type AggregateRow = {
  userId: string;
  totalPoints: number;
  latestActivityAt: Date | null;
  breakdown: LeaderboardBreakdown;
};

/**
 * Bangun where-clause activity yang konsisten dengan periode + scope.
 *
 * - `period` membatasi window waktu (lihat `resolvePeriodRange`).
 * - `scope` membatasi `type IN (...)` kecuali `overall` yang membiarkan
 *   semua tipe.
 */
function buildActivityWhere(input: {
  period: LeaderboardPeriodKey;
  scope: ScopeKey;
}): Prisma.UserActivityEventWhereInput {
  const range = resolvePeriodRange(input.period);
  const where: Prisma.UserActivityEventWhereInput = {};

  if (range.start && range.end) {
    where.createdAt = { gte: range.start, lt: range.end };
  }

  if (input.scope !== "overall") {
    const types = SCOPE_ACTIVITY_TYPES[input.scope];
    if (types && types.length > 0) {
      where.type = { in: types };
    }
  }

  return where;
}

/**
 * Aggregate poin total + breakdown per user untuk window terpilih.
 *
 * Strategi:
 * 1. `groupBy(["userId", "type"])` untuk total + count per pasangan.
 * 2. Fold tiap baris ke `breakdown[scopeOf(type)]` plus `totalPoints`.
 * 3. Ambil `latestActivityAt` lewat `groupBy` kedua agar tie-breaker stabil.
 *
 * Pendekatan ini memakai indeks `[type, createdAt]` dan `[userId, createdAt]`
 * yang sudah ada di skema, jadi tetap performant tanpa raw SQL.
 */
async function aggregatePoints(input: {
  period: LeaderboardPeriodKey;
  scope: ScopeKey;
}): Promise<Map<string, AggregateRow>> {
  const where = buildActivityWhere(input);

  const [pointsRows, latestRows] = await Promise.all([
    prisma.userActivityEvent.groupBy({
      by: ["userId", "type"],
      where,
      _sum: { points: true },
    }),
    prisma.userActivityEvent.groupBy({
      by: ["userId"],
      where,
      _max: { createdAt: true },
    }),
  ]);

  const map = new Map<string, AggregateRow>();

  for (const row of pointsRows) {
    const sum = row._sum.points ?? 0;
    if (sum <= 0) continue;
    const scopeKey = ACTIVITY_SCOPE[row.type as UserActivityType];
    const existing = map.get(row.userId) ?? createEmptyAggregate(row.userId);
    existing.totalPoints += sum;
    existing.breakdown[scopeKey] += sum;
    map.set(row.userId, existing);
  }

  for (const row of latestRows) {
    const existing = map.get(row.userId);
    if (!existing) continue;
    existing.latestActivityAt = row._max.createdAt ?? null;
  }

  return map;
}

function createEmptyAggregate(userId: string): AggregateRow {
  return {
    userId,
    totalPoints: 0,
    latestActivityAt: null,
    breakdown: { circles: 0, events: 0, reviews: 0, social: 0 },
  };
}

/**
 * Tie-breaker stabil:
 * 1. `totalPoints` desc
 * 2. `latestActivityAt` desc (yang baru saja aktif lebih tinggi)
 * 3. `userId` asc — fallback deterministik agar rank tidak goyang
 *    saat dua user benar-benar identik.
 */
function compareAggregate(a: AggregateRow, b: AggregateRow): number {
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  const ta = a.latestActivityAt?.getTime() ?? 0;
  const tb = b.latestActivityAt?.getTime() ?? 0;
  if (tb !== ta) return tb - ta;
  return a.userId.localeCompare(b.userId);
}

/**
 * Tangkap data user publik untuk daftar `userIds` yang relevan saja.
 * Memakai `select` minimal yang dibutuhkan view-model.
 */
async function loadUserMap(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, PublicUserRecord>();
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: PUBLIC_USER_SELECT,
  });
  return new Map(users.map((user) => [user.id, user]));
}

type PublicUserRecord = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  image: string | null;
};

function toLeaderboardRow(
  rank: number,
  aggregate: AggregateRow,
  userMap: Map<string, PublicUserRecord>,
): LeaderboardUserRow | null {
  const user = userMap.get(aggregate.userId);
  if (!user) return null;
  return {
    rank,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      slug: profileSlugFor(user),
    },
    totalPoints: aggregate.totalPoints,
    breakdown: aggregate.breakdown,
    latestActivityAt: aggregate.latestActivityAt
      ? aggregate.latestActivityAt.toISOString()
      : null,
  };
}

/**
 * Bangun seluruh response leaderboard utama (`GET /api/leaderboard`).
 *
 * Catatan performa: aggregator memuat semua user yang punya event di window
 * terpilih ke memori. Untuk MVP volume Shelfgram, jumlah user aktif per
 * minggu/bulan masih nyaman di-handle in-memory. Saat volume bertumbuh,
 * fase 2 dapat menggantinya dengan snapshot table.
 */
export async function getLeaderboardPage(input: {
  period: LeaderboardPeriodKey;
  scope: ScopeKey;
  limit: number;
  offset: number;
}): Promise<LeaderboardResponse> {
  const aggregateMap = await aggregatePoints({
    period: input.period,
    scope: input.scope,
  });

  const sorted = Array.from(aggregateMap.values()).sort(compareAggregate);

  const sliced = sorted.slice(input.offset, input.offset + input.limit);
  const topThreeSource = sorted.slice(0, TOP_THREE_LIMIT);

  const userIds = Array.from(
    new Set([...sliced, ...topThreeSource].map((row) => row.userId)),
  );
  const userMap = await loadUserMap(userIds);

  const rows = sliced
    .map((aggregate, index) =>
      toLeaderboardRow(input.offset + index + 1, aggregate, userMap),
    )
    .filter((row): row is LeaderboardUserRow => row !== null);

  const topThree = topThreeSource
    .map((aggregate, index) => toLeaderboardRow(index + 1, aggregate, userMap))
    .filter((row): row is LeaderboardUserRow => row !== null);

  return {
    period: input.period,
    scope: input.scope,
    topThree,
    rows,
    total: sorted.length,
  };
}

/**
 * Posisi viewer pada leaderboard saat ini. `rank` bernilai `null` ketika
 * viewer belum punya aktivitas yang dihitung pada window terpilih.
 */
export async function getLeaderboardForViewer(input: {
  userId: string;
  period: LeaderboardPeriodKey;
  scope: ScopeKey;
}): Promise<LeaderboardMeResponse> {
  const aggregateMap = await aggregatePoints({
    period: input.period,
    scope: input.scope,
  });

  const sorted = Array.from(aggregateMap.values()).sort(compareAggregate);
  const total = sorted.length;
  const index = sorted.findIndex((row) => row.userId === input.userId);

  if (index === -1) {
    return {
      rank: null,
      totalPoints: 0,
      percentile: null,
      breakdown: { circles: 0, events: 0, reviews: 0, social: 0 },
    };
  }

  const aggregate = sorted[index]!;
  const rank = index + 1;
  const percentile =
    total > 1
      ? Math.max(0, Math.min(100, Math.round(((total - rank) / (total - 1)) * 100)))
      : 100;

  return {
    rank,
    totalPoints: aggregate.totalPoints,
    percentile,
    breakdown: aggregate.breakdown,
  };
}
