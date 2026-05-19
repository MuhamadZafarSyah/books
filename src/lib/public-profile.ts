import { prisma } from "@/lib/db";
import { deriveEventStatus } from "@/features/reading-events/lib/derive-status";
import { getLeaderboardForViewer } from "@/lib/leaderboard/queries";
import { getCurrentUser } from "@/lib/session";
import type {
  DashboardCircleCard,
  DashboardEventCard,
  DashboardLeaderboardSnippet,
} from "@/lib/dashboard/overview-types";

type ProfileUserRecord = {
  id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  banner?: string | null;
};

export function profileSlugFor(user: ProfileUserRecord) {
  const source =
    user.username || user.name || user.email?.split("@")[0] || user.id;

  return (
    source
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || user.id
  );
}

function serializeUserBook(item: {
  id: string;
  status: "WANT_TO_READ" | "READING" | "FINISHED";
  isBorrowable: boolean;
  progress: number | null;
  updatedAt: Date;
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
    description: string | null;
  };
}) {
  return {
    id: item.id,
    status: item.status,
    isBorrowable: item.isBorrowable,
    progress: item.progress,
    updatedAt: item.updatedAt.toISOString(),
    book: item.book,
  };
}

function serializeReview(item: {
  id: string;
  rating: number | null;
  body: string;
  createdAt: Date;
  book: {
    id: string;
    title: string;
    author: string;
  };
}) {
  return {
    id: item.id,
    rating: item.rating,
    body: item.body,
    createdAt: item.createdAt.toISOString(),
    book: item.book,
  };
}

export async function getPublicProfileBySlug(slug: string) {
  const normalizedSlug = slug.toLowerCase();
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      image: true,
      banner: true,
      bio: true,
      location: true,
      createdAt: true,
    },
  });
  const profile = users.find((user) => profileSlugFor(user) === normalizedSlug);

  if (!profile) return null;

  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const isOwnProfile = currentUserId === profile.id;

  const [
    followerCount,
    followingCount,
    publicBookCount,
    booksReadCount,
    reviewCount,
    isFollowing,
    currentlyReading,
    publicShelf,
    borrowableBooks,
    latestReviews,
  ] = await Promise.all([
    prisma.userFollow.count({ where: { followingId: profile.id } }),
    prisma.userFollow.count({ where: { followerId: profile.id } }),
    prisma.userBook.count({
      where: { userId: profile.id, visibility: "PUBLIC" },
    }),
    prisma.userBook.count({
      where: { userId: profile.id, visibility: "PUBLIC", status: "FINISHED" },
    }),
    prisma.bookReview.count({
      where: { userId: profile.id, visibility: "PUBLIC" },
    }),
    currentUserId && !isOwnProfile
      ? prisma.userFollow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUserId,
              followingId: profile.id,
            },
          },
        })
      : null,
    prisma.userBook.findMany({
      where: { userId: profile.id, visibility: "PUBLIC", status: "READING" },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: { book: true },
    }),
    prisma.userBook.findMany({
      where: { userId: profile.id, visibility: "PUBLIC" },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { book: true },
    }),
    prisma.userBook.findMany({
      where: { userId: profile.id, visibility: "PUBLIC", isBorrowable: true },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { book: true },
    }),
    prisma.bookReview.findMany({
      where: { userId: profile.id, visibility: "PUBLIC" },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { book: { select: { id: true, title: true, author: true } } },
    }),
  ]);

  const now = new Date();

  // Tambahan publik: circle yang dia miliki/ikuti, agenda mendatang yang
  // dia host atau ikuti, plus rank leaderboard. Diletakkan setelah
  // `Promise.all` utama agar parallelism awal tetap maksimal.
  const [circleMemberships, hostedEvents, joinedEvents, leaderboardWeekly, leaderboardAllTime] =
    await Promise.all([
      prisma.readingCircleMember.findMany({
        where: { userId: profile.id, circle: { privacy: "PUBLIC" } },
        orderBy: { joinedAt: "desc" },
        take: 4,
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
        where: { hostId: profile.id, statusFlag: "ACTIVE", endsAt: { gt: now } },
        orderBy: { startsAt: "asc" },
        take: 4,
      }),
      prisma.readingEvent.findMany({
        where: {
          statusFlag: "ACTIVE",
          endsAt: { gt: now },
          participants: { some: { userId: profile.id } },
          NOT: { hostId: profile.id },
        },
        orderBy: { startsAt: "asc" },
        take: 4,
      }),
      getLeaderboardForViewer({
        userId: profile.id,
        period: "weekly",
        scope: "overall",
      }),
      getLeaderboardForViewer({
        userId: profile.id,
        period: "all-time",
        scope: "overall",
      }),
    ]);

  const myCircles: DashboardCircleCard[] = circleMemberships.map((membership) => ({
    id: membership.circle.id,
    title: membership.circle.title,
    bookTitle: membership.circle.bookTitle,
    bookAuthor: membership.circle.bookAuthor,
    bookCoverUrl: membership.circle.bookCoverUrl,
    memberCount: membership.circle.memberCount,
    lastActivityAt: membership.circle.lastActivityAt
      ? membership.circle.lastActivityAt.toISOString()
      : null,
    isOwner: membership.circle.ownerId === profile.id,
  }));

  const upcomingEvents: DashboardEventCard[] = [...hostedEvents, ...joinedEvents]
    .map((event) => ({
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
      isHost: event.hostId === profile.id,
    }))
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    .slice(0, 4);

  return {
    user: {
      id: profile.id,
      slug: profileSlugFor(profile),
      username: profile.username,
      name: profile.name,
      email: profile.email,
      image: profile.image,
      banner: profile.banner,
      bio: profile.bio,
      location: profile.location,
      createdAt: profile.createdAt.toISOString(),
    },
    viewer: {
      isAuthenticated: Boolean(currentUserId),
      isOwnProfile,
      isFollowing: Boolean(isFollowing),
    },
    stats: {
      followerCount,
      followingCount,
      publicBookCount,
      booksReadCount,
      reviewCount,
    },
    currentlyReading: currentlyReading.map(serializeUserBook),
    publicShelf: publicShelf.map(serializeUserBook),
    borrowableBooks: borrowableBooks.map(serializeUserBook),
    latestReviews: latestReviews.map(serializeReview),
    myCircles,
    upcomingEvents,
    leaderboardWeekly: leaderboardWeekly satisfies DashboardLeaderboardSnippet,
    leaderboardAllTime: leaderboardAllTime satisfies DashboardLeaderboardSnippet,
  };
}
