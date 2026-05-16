import { BookReviewFeed } from "@/features/book-reviews/components/book-review-feed";
import { BookReviewHeader } from "@/features/book-reviews/components/book-review-header";
import { BookReviewSummaryPanel } from "@/features/book-reviews/components/book-review-summary";
import { UserReviewPanel } from "@/features/book-reviews/components/user-review-panel";
import type { BookReviewPageData } from "@/features/book-reviews/types";

type BookReviewShellProps = {
  data: BookReviewPageData;
};

export function BookReviewShell({ data }: BookReviewShellProps) {
  return (
    <div className="space-y-8">
      <BookReviewHeader book={data.book} />
      <BookReviewSummaryPanel summary={data.summary} />
      <UserReviewPanel
        bookId={data.book.id}
        existing={data.currentUserReview}
      />
      <BookReviewFeed reviews={data.reviews} />
    </div>
  );
}
