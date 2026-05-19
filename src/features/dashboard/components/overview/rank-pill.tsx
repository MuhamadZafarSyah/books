import Link from "next/link";
import { Trophy } from "lucide-react";

import { formatNumber } from "@/features/dashboard/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardLeaderboardSnippet } from "@/lib/dashboard/overview-types";

type RankPillProps = {
  data: DashboardLeaderboardSnippet;
  href?: string;
  className?: string;
  /** Label opsional di atas rank (mis. "Minggu ini"). */
  label?: string;
};

/**
 * Pill ringkas yang menampilkan posisi viewer di leaderboard.
 *
 * Mengikuti pola minimalis halaman Leaderboard: ikon `Trophy` kecil, rank
 * besar, poin di samping. Saat viewer belum punya rank, pill tetap
 * muncul tapi dengan teks pemicu agar mereka mulai aktif.
 */
export function RankPill({ data, href, label, className }: RankPillProps) {
  const hasRank = typeof data.rank === "number";
  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-full border border-primary/30 bg-primary/5 px-4 py-2",
        href &&
          "transition-colors duration-200 hover:border-primary/40 hover:bg-primary/10",
        className,
      )}
    >
      <Trophy aria-hidden="true" className="size-4 shrink-0 text-primary" />
      <div className="flex flex-col">
        {label ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            {label}
          </span>
        ) : null}
        {hasRank ? (
          <span className="font-heading text-sm font-semibold text-foreground">
            #{formatNumber(data.rank!)}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {formatNumber(data.totalPoints)} poin
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Mulai aktif untuk masuk papan peringkat
          </span>
        )}
      </div>
    </div>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="inline-flex">
      {inner}
    </Link>
  );
}
