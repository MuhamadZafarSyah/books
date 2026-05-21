import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { profileSlugFor } from "@/lib/public-profile";
import { deriveEventStatus } from "@/features/reading-events/lib/derive-status";
import { getLeaderboardForViewer } from "@/lib/leaderboard/queries";
import type {
  DashboardActivityItem,
  DashboardBookCard,
  DashboardCircleCard,
  DashboardEventCard,
  DashboardOverview,
  ProfileOverview,
} from "@/lib/dashboard/overview-types";

const RECENT_ACTIVITY_LIMIT = 10;
const CURRENTLY_READING_LIMIT = 6;
const MY_CIRCLES_LIMIT = 4;
const UPCOMING_EVENTS_LIMIT = 4;
const RECENT_BOOKS_PROFILE_LIMIT = 8;
const RECENT_REVIEWS_PROFILE_LIMIT = 4;

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  image: true,
} as const;

type PublicUserRow = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  image: string | null;
};

type SimpleBook = {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
};

function serializeBookCard(item: {
  id: string;
  status: import("@prisma/client").UserBookStatus;
  progress: number | null;
  updatedAt: Date;
  book: SimpleBook;
}): DashboardBookCard {
  return {
    id: item.book.id,
    shelfRowId: item.id,
    title: item.book.title,
    author: item.book.author,
    coverUrl: item.book.coverUrl,
    status: item.status,
    progress: item.progress,
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeCircleCard(
  circle: {
    id: string;
    title: string;
    bookTitle: string;
    bookAuthor: string;
    bookCoverUrl: string | null;
    memberCount: number;
    lastActivityAt: Date | null;
  },
  isOwner: boolean,
): DashboardCircleCard {
  return {
    id: circle.id,
    title: circle.title,
    bookTitle: circle.bookTitle,
    bookAuthor: circle.bookAuthor,
    bookCoverUrl: circle.bookCoverUrl,
    memberCount: circle.memberCount,
    lastActivityAt: circle.lastActivityAt
      ? circle.lastActivityAt.toISOString()
      : null,
    isOwner,
  };
}

function serializeEventCard(
  event: {
    id: string;
    hostId: string;
    title: string;
    locationAddress: string;
    startsAt: Date;
    endsAt: Date;
    quota: number;
    participantCount: number;
    statusFlag: "ACTIVE" | "CANCELLED";
  },
  viewerUserId: string,
): DashboardEventCard {
  return {
    id: event.id,
    title: event.title,
    locationAddress: event.locationAddress,
    startsAt: event.startsAt.toISOString(),
    participantCount: event.participantCount,
    quota: event.quota,
    status: deriveEventStatus({
      statusFlag: event.statusFlag,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      participantCount: event.participantCount,
      quota: event.quota,
    }),
    isHost: event.hostId === viewerUserId,
  };
}

/**
 * Bangun snippet aktivitas terbaru untuk feed beranda.
 *
 * Karena `UserActivityEvent.sourceId` hanya menyimpan ID polos, kita perlu
 * resolve subject (judul circle / event / buku / nama user yang di-follow)
 * lewat lookup batch satu kali per source type. Pendekatan ini menjaga
 * query feed tetap cepat tanpa N+1.
 */
async function buildRecentActivity(options?: {
  userId?: string;
  limit?: number;
}): Promise<DashboardActivityItem[]> {
  const where: Prisma.UserActivityEventWhereInput = options?.userId
    ? { userId: options.userId }
    : {};
  const events = await prisma.userActivityEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? RECENT_ACTIVITY_LIMIT,
    include: { user: { select: PUBLIC_USER_SELECT } },
  });

  if (events.length === 0) return [];

  // Group sourceIds per sourceType untuk batch lookup.
  const byType = new Map<string, Set<string>>();
  for (const event of events) {
    const set = byType.get(event.sourceType) ?? new Set<string>();
    set.add(event.sourceId);
    byType.set(event.sourceType, set);
  }

  const [
    circles,
    circlePosts,
    circleComments,
    readingEvents,
    bookReviews,
    followTargets,
  ] = await Promise.all([
    fetchManyById(byType.get("READING_CIRCLE"), (ids) =>
      prisma.readingCircle.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true },
      }),
    ),
    fetchManyById(byType.get("READING_CIRCLE_POST"), (ids) =>
      prisma.readingCirclePost.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          title: true,
          circle: { select: { id: true, title: true } },
        },
      }),
    ),
    fetchManyById(byType.get("READING_CIRCLE_COMMENT"), (ids) =>
      prisma.readingCircleComment.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          post: {
            select: {
              id: true,
              circle: { select: { id: true, title: true } },
            },
          },
        },
      }),
    ),
    fetchManyById(byType.get("READING_EVENT"), (ids) =>
      prisma.readingEvent.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true },
      }),
    ),
    fetchManyById(byType.get("BOOK_REVIEW"), (ids) =>
      prisma.bookReview.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          book: { select: { id: true, title: true } },
        },
      }),
    ),
    fetchManyById(byType.get("USER_FOLLOW"), (ids) =>
      prisma.user.findMany({
        where: { id: { in: ids } },
        select: PUBLIC_USER_SELECT,
      }),
    ),
  ]);

  return events.map((event) => {
    const actor = serializeActor(event.user);
    let subjectTitle: string | null = null;
    let href: string | null = null;

    switch (event.sourceType) {
      case "READING_CIRCLE": {
        const circle = circles.get(event.sourceId);
        if (circle) {
          subjectTitle = circle.title;
          href = `/dashboard/circles/${circle.id}`;
        }
        break;
      }
      case "READING_CIRCLE_POST": {
        const post = circlePosts.get(event.sourceId);
        if (post) {
          subjectTitle = post.title?.trim() || post.circle.title;
          href = `/dashboard/circles/${post.circle.id}`;
        }
        break;
      }
      case "READING_CIRCLE_COMMENT": {
        const comment = circleComments.get(event.sourceId);
        if (comment) {
          subjectTitle = comment.post.circle.title;
          href = `/dashboard/circles/${comment.post.circle.id}`;
        }
        break;
      }
      case "READING_EVENT": {
        const ev = readingEvents.get(event.sourceId);
        if (ev) {
          subjectTitle = ev.title;
          href = `/dashboard/events/${ev.id}`;
        }
        break;
      }
      case "BOOK_REVIEW": {
        const review = bookReviews.get(event.sourceId);
        if (review) {
          subjectTitle = review.book.title;
          href = `/dashboard/explore/books/${review.book.id}/reviews`;
        }
        break;
      }
      case "USER_FOLLOW": {
        const target = followTargets.get(event.sourceId);
        if (target) {
          subjectTitle = target.name ?? target.username ?? "Pembaca";
          href = `/u/${profileSlugFor(target)}`;
        }
        break;
      }
    }

    return {
      id: event.id,
      type: event.type,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
      points: event.points,
      createdAt: event.createdAt.toISOString(),
      actor,
      subjectTitle,
      href,
    };
  });
}

async function fetchManyById<TRow extends { id: string }>(
  ids: Set<string> | undefined,
  loader: (ids: string[]) => Promise<TRow[]>,
): Promise<Map<string, TRow>> {
  if (!ids || ids.size === 0) return new Map();
  const rows = await loader(Array.from(ids));
  return new Map(rows.map((row) => [row.id, row]));
}

function serializeActor(user: PublicUserRow) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    image: user.image,
    slug: profileSlugFor(user),
  };
}

/**
 * Memuat seluruh data yang dibutuhkan halaman Beranda dalam satu jaringan
 * `Promise.all` agar latency dari banyak query independen tidak menumpuk
 * secara serial.
 */
export async function getDashboardOverview(input: {
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
}): Promise<DashboardOverview> {
  const { userId } = input;
  const now = new Date();

  const [
    currentlyReading,
    shelfCounts,
    reviewCount,
    followerCount,
    followingCount,
    circleMemberships,
    upcomingHosted,
    upcomingJoined,
    recentActivity,
    leaderboardWeekly,
  ] = await Promise.all([
    prisma.userBook.findMany({
      where: { userId, status: "READING" },
      orderBy: { updatedAt: "desc" },
      take: CURRENTLY_READING_LIMIT,
      include: { book: true },
    }),
    prisma.userBook.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.bookReview.count({ where: { userId } }),
    prisma.userFollow.count({ where: { followingId: userId } }),
    prisma.userFollow.count({ where: { followerId: userId } }),
    prisma.readingCircleMember.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      take: MY_CIRCLES_LIMIT,
      include: {
        circle: {
          select: {
            id: true,
            ownerId: true,
            title: true,
            bookTitle: true,
            bookAuthor: true,
            bookCoverUrl: true,
            memberCount: true,
            lastActivityAt: true,
          },
        },
      },
    }),
    prisma.readingEvent.findMany({
      where: {
        hostId: userId,
        statusFlag: "ACTIVE",
        endsAt: { gt: now },
      },
      orderBy: { startsAt: "asc" },
      take: UPCOMING_EVENTS_LIMIT,
    }),
    prisma.readingEvent.findMany({
      where: {
        statusFlag: "ACTIVE",
        endsAt: { gt: now },
        participants: { some: { userId } },
        NOT: { hostId: userId },
      },
      orderBy: { startsAt: "asc" },
      take: UPCOMING_EVENTS_LIMIT,
    }),
    buildRecentActivity(),
    getLeaderboardForViewer({
      userId,
      period: "weekly",
      scope: "overall",
    }),
  ]);

  const counts = { reading: 0, finished: 0, wantToRead: 0 };
  for (const row of shelfCounts) {
    if (row.status === "READING") counts.reading = row._count._all;
    if (row.status === "FINISHED") counts.finished = row._count._all;
    if (row.status === "WANT_TO_READ") counts.wantToRead = row._count._all;
  }

  const myCircles = circleMemberships.map((membership) =>
    serializeCircleCard(
      membership.circle,
      membership.circle.ownerId === userId,
    ),
  );

  // Gabungkan upcoming hosted + joined, urutkan ascending, dan dedupe id.
  const eventMap = new Map<string, DashboardEventCard>();
  for (const event of upcomingHosted) {
    eventMap.set(event.id, serializeEventCard(event, userId));
  }
  for (const event of upcomingJoined) {
    if (!eventMap.has(event.id)) {
      eventMap.set(event.id, serializeEventCard(event, userId));
    }
  }
  const upcomingEvents = Array.from(eventMap.values())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, UPCOMING_EVENTS_LIMIT);

  return {
    user: {
      id: userId,
      name: input.name,
      email: input.email,
      image: input.image,
    },
    currentlyReading: currentlyReading.map(serializeBookCard),
    shelfCounts: counts,
    reviewCount,
    followerCount,
    followingCount,
    myCircles,
    upcomingEvents,
    recentActivity,
    leaderboard: leaderboardWeekly,
  };
}

/**
 * Memuat data Profil pengguna sendiri. Berbeda dari `getPublicProfileBySlug`,
 * di sini kita menyertakan circle yang owner/member dan event yang di-host
 * atau di-join supaya halaman profil pribadi terasa hidup.
 */
export async function getProfileOverview(input: {
  userId: string;
  name: string | null;
  username: string | null;
  email: string;
  image: string | null;
  banner: string | null;
  bio: string | null;
  location: string | null;
  createdAt: Date;
}): Promise<ProfileOverview> {
  const { userId } = input;
  const now = new Date();

  const [
    shelfCounts,
    recentlyRead,
    recentReviews,
    reviewCount,
    followerCount,
    followingCount,
    circleMemberships,
    hostedEvents,
    joinedEvents,
    leaderboardWeekly,
    leaderboardAllTime,
  ] = await Promise.all([
    prisma.userBook.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.userBook.findMany({
      where: { userId, status: { in: ["READING", "FINISHED"] } },
      orderBy: { updatedAt: "desc" },
      take: RECENT_BOOKS_PROFILE_LIMIT,
      include: { book: true },
    }),
    prisma.bookReview.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: RECENT_REVIEWS_PROFILE_LIMIT,
      include: { book: true },
    }),
    prisma.bookReview.count({ where: { userId } }),
    prisma.userFollow.count({ where: { followingId: userId } }),
    prisma.userFollow.count({ where: { followerId: userId } }),
    prisma.readingCircleMember.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      take: MY_CIRCLES_LIMIT,
      include: {
        circle: {
          select: {
            id: true,
            ownerId: true,
            title: true,
            bookTitle: true,
            bookAuthor: true,
            bookCoverUrl: true,
            memberCount: true,
            lastActivityAt: true,
          },
        },
      },
    }),
    prisma.readingEvent.findMany({
      where: { hostId: userId, statusFlag: "ACTIVE", endsAt: { gt: now } },
      orderBy: { startsAt: "asc" },
      take: UPCOMING_EVENTS_LIMIT,
    }),
    prisma.readingEvent.findMany({
      where: {
        statusFlag: "ACTIVE",
        endsAt: { gt: now },
        participants: { some: { userId } },
        NOT: { hostId: userId },
      },
      orderBy: { startsAt: "asc" },
      take: UPCOMING_EVENTS_LIMIT,
    }),
    getLeaderboardForViewer({ userId, period: "weekly", scope: "overall" }),
    getLeaderboardForViewer({ userId, period: "all-time", scope: "overall" }),
  ]);

  const counts = { reading: 0, finished: 0, wantToRead: 0 };
  for (const row of shelfCounts) {
    if (row.status === "READING") counts.reading = row._count._all;
    if (row.status === "FINISHED") counts.finished = row._count._all;
    if (row.status === "WANT_TO_READ") counts.wantToRead = row._count._all;
  }

  const slug = profileSlugFor({
    id: userId,
    name: input.name,
    username: input.username,
    email: input.email,
  });

  return {
    user: {
      id: userId,
      slug,
      name: input.name,
      username: input.username,
      email: input.email,
      image: input.image,
      banner: input.banner,
      bio: input.bio,
      location: input.location,
      createdAt: input.createdAt.toISOString(),
    },
    stats: {
      booksReading: counts.reading,
      booksFinished: counts.finished,
      booksWantToRead: counts.wantToRead,
      reviewCount,
      followerCount,
      followingCount,
    },
    recentlyRead: recentlyRead.map(serializeBookCard),
    recentReviews: recentReviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      body: review.body,
      createdAt: review.createdAt.toISOString(),
      book: {
        id: review.book.id,
        title: review.book.title,
        author: review.book.author,
        coverUrl: review.book.coverUrl,
      },
    })),
    myCircles: circleMemberships.map((membership) =>
      serializeCircleCard(membership.circle, membership.circle.ownerId === userId),
    ),
    hostedEvents: hostedEvents.map((event) =>
      serializeEventCard(event, userId),
    ),
    joinedEvents: joinedEvents.map((event) =>
      serializeEventCard(event, userId),
    ),
    leaderboardWeekly,
    leaderboardAllTime,
  };
}

/**
 * Helper publik untuk memuat aktivitas spesifik satu user. Dipakai oleh
 * halaman Profil untuk section "Aktivitas kamu". Dipisah dari
 * `getProfileOverview` agar aktivitas bisa di-fetch bersama overview
 * tanpa membuat fungsi overview menjadi parameterized.
 */
export async function getRecentActivityForUser(input: {
  userId: string;
  limit?: number;
}): Promise<DashboardActivityItem[]> {
  return buildRecentActivity({
    userId: input.userId,
    limit: input.limit ?? RECENT_ACTIVITY_LIMIT,
  });
}

// `Prisma` import di-keep untuk konsumen lain bila perlu where-builder helper
// di masa depan; ts-prune-style di repo ini belum aktif jadi unused-type tidak
// memunculkan warning.
export type { Prisma };
