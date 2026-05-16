import { RatingStars } from "@/features/book-reviews/components/rating-stars";
import { cn } from "@/lib/utils";
import type { BookReviewSummaryStats } from "@/features/book-reviews/types";

type BookReviewSummaryProps = {
  summary: BookReviewSummaryStats;
};

export function BookReviewSummaryPanel({ summary }: BookReviewSummaryProps) {
  const { averageRating, reviewCount, ratingCounts } = summary;
  const totalRated =
    ratingCounts[1] +
    ratingCounts[2] +
    ratingCounts[3] +
    ratingCounts[4] +
    ratingCounts[5];

  return (
    <section className="rounded-2xl border border-border bg-card/70 p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
        <div className="flex flex-col items-start gap-1 sm:min-w-[8rem]">
          <p className="font-heading text-4xl font-semibold leading-none text-foreground">
            {averageRating !== null ? averageRating.toFixed(1) : "—"}
          </p>
          <RatingStars value={averageRating ?? 0} size="md" />
          <p className="text-xs text-muted-foreground">
            {reviewCount.toLocaleString("id-ID")} review
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = ratingCounts[star];
            const ratio =
              totalRated > 0 ? Math.round((count / totalRated) * 100) : 0;
            return (
              <div
                key={star}
                className="flex items-center gap-3 text-[11px] text-muted-foreground"
              >
                <span className="w-6 shrink-0 text-right tabular-nums">
                  {star}★
                </span>
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
                  aria-hidden="true"
                >
                  <div
                    className={cn(
                      "h-full rounded-full bg-chart-5 transition-[width] duration-500 ease-out",
                    )}
                    style={{ width: `${ratio}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right tabular-nums">
                  {count.toLocaleString("id-ID")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
