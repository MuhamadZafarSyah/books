import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingStars } from "@/features/book-reviews/components/rating-stars";
import type { BookReviewSummary } from "@/features/book-reviews/types";

type BookReviewItemProps = {
  review: BookReviewSummary;
};

function getInitials(name: string | null, username: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    return parts[0]?.slice(0, 2).toUpperCase() ?? "U";
  }
  if (username) return username.slice(0, 2).toUpperCase();
  return "U";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BookReviewItem({ review }: BookReviewItemProps) {
  const profileHref = `/u/${review.user.slug}`;

  return (
    <li className="flex items-start gap-3 px-4 py-4 sm:gap-4 sm:px-5">
      <Link href={profileHref} className="shrink-0" aria-label={`Profil ${review.user.name ?? "pembaca"}`}>
        <Avatar className="size-10">
          {review.user.image && (
            <AvatarImage
              src={review.user.image}
              alt={review.user.name ?? "Avatar"}
            />
          )}
          <AvatarFallback className="text-[11px]">
            {getInitials(review.user.name, review.user.username)}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link
            href={profileHref}
            className="text-sm font-semibold text-foreground hover:underline"
          >
            {review.user.name ?? review.user.username ?? "Pembaca"}
          </Link>
          {review.user.username && (
            <Link
              href={profileHref}
              className="text-xs text-muted-foreground hover:underline"
            >
              @{review.user.username}
            </Link>
          )}
          <span className="text-[11px] text-muted-foreground/80">
            · {formatDate(review.createdAt)}
          </span>
        </div>
        <div className="mt-1">
          <RatingStars value={review.rating} size="sm" />
        </div>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
          {review.body}
        </p>
      </div>
    </li>
  );
}
