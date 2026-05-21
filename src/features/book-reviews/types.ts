export type BookReviewVisibility = "PUBLIC" | "PRIVATE" | "FOLLOWERS";

export type BookReviewAuthor = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  slug: string;
};

export type BookReviewSummary = {
  id: string;
  rating: number | null;
  body: string;
  visibility: BookReviewVisibility;
  createdAt: string;
  updatedAt: string;
  user: BookReviewAuthor;
};

export type BookReviewBookContext = {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  openLibraryUrl: string | null;
  firstPublishYear: number | null;
};

export type BookReviewSummaryStats = {
  averageRating: number | null;
  reviewCount: number;
  ratingCounts: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type BookReviewPageData = {
  book: BookReviewBookContext;
  summary: BookReviewSummaryStats;
  currentUserReview: BookReviewSummary | null;
  currentUserShelf: BookReviewShelfState | null;
  reviews: BookReviewSummary[];
};

/**
 * Snapshot rak (status + visibility + progres) viewer untuk buku ini.
 *
 * `null` saat viewer belum pernah meletakkan buku tersebut di rak — UI
 * akan menampilkan tombol "Tambahkan ke rak" yang mendefault ke
 * `WANT_TO_READ`.
 */
export type BookReviewShelfState = {
  id: string;
  status:
    | "WANT_TO_READ"
    | "TO_BE_READ"
    | "READING"
    | "FINISHED"
    | "ON_HOLD"
    | "ABANDONED";
  visibility: BookReviewVisibility;
  progress: number | null;
  isBorrowable: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
};
