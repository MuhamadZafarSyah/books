"use client";

import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { LeaderboardUserRow } from "@/features/leaderboard/types";

const NUMBER_FORMATTER = new Intl.NumberFormat("id-ID");

function getInitials(name: string | null): string {
  if (!name) return "P";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "P").toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export type LeaderboardRankRowProps = {
  row: LeaderboardUserRow;
  isViewer?: boolean;
};

/**
 * Satu baris ranking pada list utama leaderboard.
 *
 * Komposisi minimalis sesuai panduan plan dan rhythm `event-list-row.tsx`:
 * rank, avatar, name, dan poin dalam satu baris tanpa subtitle deskriptif
 * agar list tidak terasa ramai. Aksen warna hanya muncul untuk top-3 dan
 * baris milik viewer (tag "Kamu" tipis, bukan badge berwarna penuh).
 */
export function LeaderboardRankRow({ row, isViewer }: LeaderboardRankRowProps) {
  const isTopThree = row.rank <= 3;

  return (
    <Link
      href={`/u/${row.user.slug}`}
      className={cn(
        "flex items-center gap-4 px-4 py-3 transition-colors duration-200",
        "hover:bg-muted/40",
        isViewer && "bg-primary/5 hover:bg-primary/10",
      )}
    >
      <span
        className={cn(
          "w-8 shrink-0 text-right font-heading text-sm font-semibold tabular-nums sm:w-10 sm:text-base",
          isTopThree ? "text-primary" : "text-muted-foreground",
        )}
      >
        {row.rank}.
      </span>

      <Avatar className="size-9 shrink-0 sm:size-10">
        <AvatarImage
          src={row.user.image ?? undefined}
          alt={row.user.name ?? "Pembaca"}
        />
        <AvatarFallback>{getInitials(row.user.name)}</AvatarFallback>
      </Avatar>

      <p className="line-clamp-1 min-w-0 flex-1 text-sm font-medium text-foreground">
        {row.user.name ?? row.user.username ?? "Pembaca"}
        {/* {isViewer ? (
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Kamu
          </span>
        ) : null} */}
      </p>

      <span className="shrink-0 font-heading text-sm font-semibold tabular-nums text-foreground sm:text-base">
        {NUMBER_FORMATTER.format(row.totalPoints)}
      </span>
    </Link>
  );
}
