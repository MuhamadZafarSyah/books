import { Fragment } from "react";
import Link from "next/link";
import { Star } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { BookCover } from "@/features/dashboard/components/overview/book-cover";
import { SectionHeading } from "@/features/dashboard/components/overview/section-heading";
import { formatRelativeTime } from "@/features/dashboard/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardReviewCard } from "@/lib/dashboard/overview-types";

type ProfileReviewsListProps = {
  reviews: DashboardReviewCard[];
  emptyHint?: string;
};

/**
 * Daftar review buku terbaru dari pemilik profil.
 *
 * Menampilkan rating bintang (jika ada), kutipan singkat dari body, plus
 * waktu relatif. Card-style dihindari demi konsistensi rhythm minimalis.
 */
export function ProfileReviewsList({
  reviews,
  emptyHint = "Belum ada review yang dipublikasikan.",
}: ProfileReviewsListProps) {
  return (
    <section aria-labelledby="profile-reviews">
      <SectionHeading
        title="Review terbaru"
        description="Ulasan buku yang dibagikan ke komunitas."
      />

      {reviews.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-2xl border border-border/60">
          {reviews.map((review, index) => (
            <Fragment key={review.id}>
              {index > 0 ? <Separator /> : null}
              <li>
                <Link
                  href={`/dashboard/explore/books/${review.book.id}/reviews`}
                  className="flex items-start gap-3 px-3 py-3 transition-colors duration-200 hover:bg-muted/40 sm:gap-4 sm:px-4"
                >
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted">
                    <BookCover
                      src={review.book.coverUrl}
                      alt={review.book.title}
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="line-clamp-1 text-sm font-medium text-foreground">
                        {review.book.title}
                      </p>
                      {typeof review.rating === "number" ? (
                        <ReviewStars value={review.rating} />
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {review.body}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      {formatRelativeTime(review.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReviewStars({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(5, value));
  const full = Math.floor(safe);
  const half = safe - full >= 0.5;
  return (
    <span
      className="flex items-center gap-0.5 text-primary"
      aria-label={`Rating ${safe} dari 5`}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const isFull = index < full;
        const isHalf = !isFull && index === full && half;
        return (
          <Star
            key={index}
            aria-hidden="true"
            className={cn(
              "size-3",
              isFull
                ? "fill-current"
                : isHalf
                  ? "fill-current opacity-50"
                  : "text-muted-foreground/40",
            )}
          />
        );
      })}
    </span>
  );
}
