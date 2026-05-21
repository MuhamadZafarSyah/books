import { BookReviewFeed } from "@/features/book-reviews/components/book-review-feed";
import { BookReviewHeader } from "@/features/book-reviews/components/book-review-header";
import { BookReviewSummaryPanel } from "@/features/book-reviews/components/book-review-summary";
import { UserReviewPanel } from "@/features/book-reviews/components/user-review-panel";
import { BookShelfPicker } from "@/features/user-books/components/book-shelf-picker";
import type { BookReviewPageData } from "@/features/book-reviews/types";

type BookReviewShellProps = {
  data: BookReviewPageData;
};

export function BookReviewShell({ data }: BookReviewShellProps) {
  return (
    <div className="space-y-8">
      <BookReviewHeader book={data.book} />
{/* 
      <section
        aria-labelledby="book-shelf-picker"
        className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 sm:px-5"
      >
        <h2
          id="book-shelf-picker"
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
        >
          Rak kamu
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Atur status baca dan siapa saja yang bisa melihat di profilmu.
        </p>
        <div className="mt-3">
          <BookShelfPicker
            bookId={data.book.id}
            initial={
              data.currentUserShelf
                ? {
                    status: data.currentUserShelf.status,
                    visibility: data.currentUserShelf.visibility,
                    isBorrowable: data.currentUserShelf.isBorrowable,
                    progress: data.currentUserShelf.progress,
                  }
                : null
            }
          />
        </div>
      </section> */}

      <BookReviewSummaryPanel summary={data.summary} />
      <UserReviewPanel
        bookId={data.book.id}
        existing={data.currentUserReview}
      />
      <BookReviewFeed reviews={data.reviews} />
    </div>
  );
}
