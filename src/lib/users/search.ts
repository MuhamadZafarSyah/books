import "server-only";

import { prisma } from "@/lib/db";
import { profileSlugFor } from "@/lib/public-profile";
import type { UserSearchResult } from "@/features/users/types";

const SUGGESTED_LIMIT_DEFAULT = 12;

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

function rankScore(user: RawUser, queryLower: string): number {
  if (!queryLower) return 0;
  const username = (user.username ?? "").toLowerCase();
  const name = (user.name ?? "").toLowerCase();

  // Lower score = better match
  if (username && username === queryLower) return 0;
  if (username && username.startsWith(queryLower)) return 1;
  if (name && name.startsWith(queryLower)) return 2;
  if (username && username.includes(queryLower)) return 3;
  if (name && name.includes(queryLower)) return 4;

  // Bio/location matches are weakest signals.
  const bio = (user.bio ?? "").toLowerCase();
  if (bio.includes(queryLower)) return 5;
  const location = (user.location ?? "").toLowerCase();
  if (location.includes(queryLower)) return 6;

  return 99;
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
 * Search users by username/name/bio/location with simple ranked results.
 * The active user is excluded from the list. When the query is empty we
 * return a small set of recently-joined users so the page never feels dead.
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
  const trimmed = (query ?? "").trim();
  const lower = trimmed.toLowerCase();

  if (!lower) {
    const users = await prisma.user.findMany({
      where: currentUserId ? { id: { not: currentUserId } } : undefined,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, SUGGESTED_LIMIT_DEFAULT),
      select: PUBLIC_USER_SELECT,
    });
    const followingIds = await getFollowingIds(currentUserId, users);
    return users.map((user) => toResult(user, followingIds, currentUserId));
  }

  // Pull a generous candidate set first so we can rank in memory. The query
  // is bounded to fields we display, with `mode: insensitive` so Postgres
  // accepts queries regardless of casing.
  const candidates = await prisma.user.findMany({
    where: {
      AND: [
        currentUserId ? { id: { not: currentUserId } } : {},
        {
          OR: [
            { username: { contains: trimmed, mode: "insensitive" } },
            { name: { contains: trimmed, mode: "insensitive" } },
            { bio: { contains: trimmed, mode: "insensitive" } },
            { location: { contains: trimmed, mode: "insensitive" } },
          ],
        },
      ],
    },
    take: Math.max(limit * 4, 24),
    select: PUBLIC_USER_SELECT,
  });

  const ranked = candidates
    .map((user) => ({ user, score: rankScore(user, lower) }))
    .filter((entry) => entry.score < 99)
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      // Stable tie-breaker: prefer those with username, then alphabetical.
      const aLabel = (a.user.username ?? a.user.name ?? "").toLowerCase();
      const bLabel = (b.user.username ?? b.user.name ?? "").toLowerCase();
      return aLabel.localeCompare(bLabel);
    })
    .slice(0, limit)
    .map((entry) => entry.user);

  const followingIds = await getFollowingIds(currentUserId, ranked);
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
