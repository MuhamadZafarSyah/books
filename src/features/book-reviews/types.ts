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
  reviews: BookReviewSummary[];
};
