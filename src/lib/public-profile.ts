import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

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
  };
}
