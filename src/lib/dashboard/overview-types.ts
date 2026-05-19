/**
 * Tipe view-model bersama untuk Beranda dan Profil pengguna.
 *
 * Semua field primitif/ISO string supaya aman dilewatkan dari Server
 * Component ke Client island tanpa risiko bocornya objek `Date` Prisma.
 */

import type {
  UserActivitySourceType,
  UserActivityType,
} from "@prisma/client";

export type DashboardBookCard = {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  status: "WANT_TO_READ" | "READING" | "FINISHED";
  progress: number | null;
  updatedAt: string;
};

export type DashboardReviewCard = {
  id: string;
  rating: number | null;
  body: string;
  createdAt: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
  };
};

export type DashboardCircleCard = {
  id: string;
  title: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl: string | null;
  memberCount: number;
  lastActivityAt: string | null;
  isOwner: boolean;
};

export type DashboardEventCard = {
  id: string;
  title: string;
  locationAddress: string;
  startsAt: string;
  participantCount: number;
  quota: number;
  status: "SCHEDULED" | "FULL" | "ONGOING" | "COMPLETED" | "CANCELLED";
  isHost: boolean;
};

export type DashboardActivityActor = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  slug: string;
};

export type DashboardActivityItem = {
  id: string;
  type: UserActivityType;
  sourceType: UserActivitySourceType;
  sourceId: string;
  points: number;
  createdAt: string;
  actor: DashboardActivityActor;
  /** Subjek aksi — judul circle/event/buku atau nama user yang di-follow. */
  subjectTitle: string | null;
  /** Link tujuan saat user mengetuk row (sudah relatif). `null` = no-op. */
  href: string | null;
};

export type DashboardLeaderboardSnippet = {
  rank: number | null;
  totalPoints: number;
  percentile: number | null;
};

export type DashboardOverview = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  /** Buku yang sedang dibaca viewer (status `READING`). */
  currentlyReading: DashboardBookCard[];
  /** Total buku publik viewer di setiap status. */
  shelfCounts: {
    reading: number;
    finished: number;
    wantToRead: number;
  };
  reviewCount: number;
  followerCount: number;
  followingCount: number;
  myCircles: DashboardCircleCard[];
  upcomingEvents: DashboardEventCard[];
  recentActivity: DashboardActivityItem[];
  leaderboard: DashboardLeaderboardSnippet;
};

export type ProfileOverviewReview = DashboardReviewCard;

export type ProfileOverview = {
  user: {
    id: string;
    slug: string;
    name: string | null;
    username: string | null;
    email: string | null;
    image: string | null;
    banner: string | null;
    bio: string | null;
    location: string | null;
    createdAt: string;
  };
  stats: {
    booksReading: number;
    booksFinished: number;
    booksWantToRead: number;
    reviewCount: number;
    followerCount: number;
    followingCount: number;
  };
  recentlyRead: DashboardBookCard[];
  recentReviews: ProfileOverviewReview[];
  myCircles: DashboardCircleCard[];
  hostedEvents: DashboardEventCard[];
  joinedEvents: DashboardEventCard[];
  leaderboardWeekly: DashboardLeaderboardSnippet;
  leaderboardAllTime: DashboardLeaderboardSnippet;
};
