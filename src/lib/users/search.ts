import "server-only";

import type { Prisma } from "@prisma/client";

import { MIN_USER_SEARCH_QUERY_LENGTH } from "@/features/users/search-constants";
import type { UserSearchResult } from "@/features/users/types";
import { prisma } from "@/lib/db";
import { profileSlugFor } from "@/lib/public-profile";

const MIN_CANDIDATE_LIMIT = 30;
const MAX_CANDIDATE_LIMIT = 100;
const MAX_QUERY_TOKENS = 4;

type RawUser = {
  id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  location: string | null;
};

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  name: true,
  email: true,
  image: true,
  bio: true,
  location: true,
} as const;

function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^@+/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeDatabaseText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/^@+/, "").replace(/\s+/g, " ");
}

function tokenizeSearchText(value: string): string[] {
  return Array.from(
    new Set(
      normalizeSearchText(value)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= MIN_USER_SEARCH_QUERY_LENGTH),
    ),
  ).slice(0, MAX_QUERY_TOKENS);
}

function tokenizeDatabaseText(value: string): string[] {
  return Array.from(
    new Set(
      normalizeDatabaseText(value)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= MIN_USER_SEARCH_QUERY_LENGTH),
    ),
  ).slice(0, MAX_QUERY_TOKENS);
}

function rankScore(user: RawUser, query: string, tokens: string[]): number {
  const username = normalizeSearchText(user.username);
  const name = normalizeSearchText(user.name);
  const bio = normalizeSearchText(user.bio);
  const location = normalizeSearchText(user.location);
  const nameTokens = tokenizeSearchText(name);

  // Lower score = better match.
  if (username && username === query) return 0;
  if (name && name === query) return 1;
  if (username && username.startsWith(query)) return 2;
  if (name && name.startsWith(query)) return 3;
  if (
    tokens.length > 0 &&
    tokens.every((token) =>
      nameTokens.some((nameToken) => nameToken.startsWith(token)),
    )
  ) {
    return 4;
  }
  if (username && username.includes(query)) return 5;
  if (name && name.includes(query)) return 6;
  if (
    tokens.length > 0 &&
    tokens.every((token) => username.includes(token) || name.includes(token))
  ) {
    return 7;
  }
  if (bio.includes(query)) return 8;
  if (location.includes(query)) return 9;
  if (
    tokens.length > 0 &&
    tokens.every((token) => bio.includes(token) || location.includes(token))
  ) {
    return 10;
  }

  return 99;
}

function profileCompletenessScore(user: RawUser): number {
  let score = 0;
  if (user.username) score += 2;
  if (user.name) score += 2;
  if (user.image) score += 1;
  if (user.bio) score += 1;
  if (user.location) score += 1;
  return score;
}

function sortLabel(user: RawUser): string {
  return normalizeSearchText(user.username ?? user.name ?? user.email ?? user.id);
}

function uniqueTerms(terms: string[]): string[] {
  return Array.from(new Set(terms.map((term) => term.trim()).filter(Boolean)));
}

function candidateLimitFor(limit: number): number {
  return Math.min(
    Math.max(limit * 6, MIN_CANDIDATE_LIMIT),
    MAX_CANDIDATE_LIMIT,
  );
}

function userMatchesTerms(terms: string[]): Prisma.UserWhereInput[] {
  const filters: Prisma.UserWhereInput[] = [];

  for (const term of terms) {
    filters.push(
      { username: { contains: term, mode: "insensitive" } },
      { name: { contains: term, mode: "insensitive" } },
    );
  }

  return filters;
}

function secondaryMatches(query: string): Prisma.UserWhereInput[] {
  return [
    { bio: { contains: query, mode: "insensitive" } },
    { location: { contains: query, mode: "insensitive" } },
  ];
}

function dedupeUsers(users: RawUser[]): RawUser[] {
  const seen = new Set<string>();
  const deduped: RawUser[] = [];

  for (const user of users) {
    if (seen.has(user.id)) continue;
    seen.add(user.id);
    deduped.push(user);
  }

  return deduped;
}

function toResult(
  user: RawUser,
  followingIds: Set<string>,
  currentUserId: string | null,
): UserSearchResult {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    slug: profileSlugFor({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
    }),
    image: user.image,
    bio: user.bio,
    location: user.location,
    isFollowing: followingIds.has(user.id),
    isSelf: currentUserId === user.id,
  };
}

/**
 * Search users by username/name/bio/location with ranked results.
 * The active user is excluded from the list. Empty or too-short queries are
 * intentionally ignored so the UI never queries the database on first load.
 */
export async function searchUsers({
  query,
  limit,
  currentUserId,
}: {
  query: string;
  limit: number;
  currentUserId: string | null;
}): Promise<UserSearchResult[]> {
  const normalizedQuery = normalizeSearchText(query);
  const databaseQuery = normalizeDatabaseText(query);

  if (normalizedQuery.length < MIN_USER_SEARCH_QUERY_LENGTH) return [];

  const tokens = tokenizeSearchText(normalizedQuery);
  const databaseTokens = tokenizeDatabaseText(databaseQuery);
  const terms = uniqueTerms([databaseQuery, ...databaseTokens]);
  if (terms.length === 0) return [];

  const excludeCurrentUser: Prisma.UserWhereInput = currentUserId
    ? { id: { not: currentUserId } }
    : {};
  const candidateLimit = candidateLimitFor(limit);

  const exactWhere: Prisma.UserWhereInput = {
    AND: [
      excludeCurrentUser,
      {
        OR: [
          { username: { equals: databaseQuery, mode: "insensitive" } },
          { name: { equals: databaseQuery, mode: "insensitive" } },
        ],
      },
    ],
  };
  const prefixWhere: Prisma.UserWhereInput = {
    AND: [
      excludeCurrentUser,
      {
        OR: [
          { username: { startsWith: databaseQuery, mode: "insensitive" } },
          { name: { startsWith: databaseQuery, mode: "insensitive" } },
        ],
      },
    ],
  };
  const broadWhere: Prisma.UserWhereInput = {
    AND: [
      excludeCurrentUser,
      {
        OR: [...userMatchesTerms(terms), ...secondaryMatches(databaseQuery)],
      },
    ],
  };

  const [exactCandidates, prefixCandidates, broadCandidates] =
    await Promise.all([
      prisma.user.findMany({
        where: exactWhere,
        take: limit,
        select: PUBLIC_USER_SELECT,
      }),
      prisma.user.findMany({
        where: prefixWhere,
        orderBy: [{ username: "asc" }, { name: "asc" }],
        take: candidateLimit,
        select: PUBLIC_USER_SELECT,
      }),
      prisma.user.findMany({
        where: broadWhere,
        orderBy: { createdAt: "desc" },
        take: candidateLimit,
        select: PUBLIC_USER_SELECT,
      }),
    ]);

  const candidates = dedupeUsers([
    ...exactCandidates,
    ...prefixCandidates,
    ...broadCandidates,
  ]);
  const followingIds = await getFollowingIds(currentUserId, candidates);

  const ranked = candidates
    .map((user) => ({
      user,
      score: rankScore(user, normalizedQuery, tokens),
      profileScore: profileCompletenessScore(user),
      isFollowing: followingIds.has(user.id),
    }))
    .filter((entry) => entry.score < 99)
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.isFollowing !== b.isFollowing) return a.isFollowing ? -1 : 1;
      if (a.profileScore !== b.profileScore) {
        return b.profileScore - a.profileScore;
      }
      return sortLabel(a.user).localeCompare(sortLabel(b.user));
    })
    .slice(0, limit)
    .map((entry) => entry.user);

  return ranked.map((user) => toResult(user, followingIds, currentUserId));
}

async function getFollowingIds(
  currentUserId: string | null,
  users: Array<{ id: string }>,
): Promise<Set<string>> {
  if (!currentUserId || users.length === 0) return new Set<string>();
  const ids = users.map((user) => user.id);
  const follows = await prisma.userFollow.findMany({
    where: {
      followerId: currentUserId,
      followingId: { in: ids },
    },
    select: { followingId: true },
  });
  return new Set(follows.map((follow) => follow.followingId));
}
