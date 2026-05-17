"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LeaderboardMeResponse } from "@/features/leaderboard/types";

const NUMBER_FORMATTER = new Intl.NumberFormat("id-ID");

export type LeaderboardViewerPanelProps = {
  data: LeaderboardMeResponse | null;
  isLoading: boolean;
  className?: string;
};

/**
 * Strip horizontal "Posisi kamu" yang ringkas.
 *
 * Sengaja dirender sebagai satu baris flex (bukan grid 4-kolom) supaya
 * konsisten dengan rhythm minimalist halaman lain. Hanya menampilkan
 * informasi inti: rank, total poin, dan persentil bila ada. Detail
 * breakdown dipindahkan ke profil pengguna agar list ini tidak tebal.
 */
export function LeaderboardViewerPanel({
  data,
  isLoading,
  className,
}: LeaderboardViewerPanelProps) {
  return (
    <aside
      aria-label="Posisi kamu"
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          Kamu
        </span>
        {isLoading || !data ? (
          <Skeleton className="h-4 w-32 rounded-sm" />
        ) : (
          <ViewerSummary data={data} />
        )}
      </div>

      {data && data.rank !== null ? (
        <span className="font-heading text-lg font-semibold tabular-nums text-foreground sm:text-xl">
          #{NUMBER_FORMATTER.format(data.rank)}
        </span>
      ) : null}
    </aside>
  );
}

function ViewerSummary({ data }: { data: LeaderboardMeResponse }) {
  if (data.rank === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Mulai aktif untuk masuk papan peringkat.
      </p>
    );
  }

  const segments: string[] = [`${NUMBER_FORMATTER.format(data.totalPoints)} poin`];
  if (data.percentile !== null) {
    segments.push(`top ${Math.max(1, 100 - data.percentile)}%`);
  }

  return (
    <p className="text-sm text-foreground">
      <span className="text-muted-foreground">{segments.join(" · ")}</span>
    </p>
  );
}
