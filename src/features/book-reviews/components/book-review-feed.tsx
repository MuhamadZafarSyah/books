import { MessageCircleHeart } from "lucide-react";

import { BookReviewItem } from "@/features/book-reviews/components/book-review-item";
import type { BookReviewSummary } from "@/features/book-reviews/types";

type BookReviewFeedProps = {
  reviews: BookReviewSummary[];
};

export function BookReviewFeed({ reviews }: BookReviewFeedProps) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 py-10 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
          <MessageCircleHeart aria-hidden="true" className="size-5" />
        </span>
        <h3 className="mt-4 font-heading text-base font-semibold tracking-tight">
          Belum ada review pembaca lain
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Jadilah yang pertama atau ajak teman untuk membagikan review mereka di buku ini.
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          Review pembaca lain
        </h2>
        <span className="text-xs text-muted-foreground">
          {reviews.length.toLocaleString("id-ID")} review
        </span>
      </div>
      <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card/70">
        {reviews.map((review) => (
          <BookReviewItem key={review.id} review={review} />
        ))}
      </ul>
    </section>
  );
}
