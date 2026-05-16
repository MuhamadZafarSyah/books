"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type RatingStarsProps = {
  value: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_MAP = {
  sm: "size-3",
  md: "size-4",
  lg: "size-5",
};

/** Read-only star display. Renders 5 stars with `value` filled. */
export function RatingStars({
  value,
  size = "md",
  className,
}: RatingStarsProps) {
  const safe = typeof value === "number" ? Math.max(0, Math.min(5, value)) : 0;
  const cls = SIZE_MAP[size];

  return (
    <span
      role="img"
      aria-label={value ? `${safe} dari 5 bintang` : "Tanpa rating"}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((index) => {
        const filled = index <= safe;
        return (
          <Star
            key={index}
            aria-hidden="true"
            className={cn(
              cls,
              filled ? "fill-chart-5 text-chart-5" : "text-muted-foreground/30",
            )}
          />
        );
      })}
    </span>
  );
}
