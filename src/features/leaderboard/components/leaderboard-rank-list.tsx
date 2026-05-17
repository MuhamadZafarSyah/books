"use client";

import { Fragment } from "react";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { LeaderboardRankRow } from "@/features/leaderboard/components/leaderboard-rank-row";
import type { LeaderboardUserRow } from "@/features/leaderboard/types";

export type LeaderboardRankListProps = {
  rows: LeaderboardUserRow[];
  isLoading: boolean;
  viewerUserId: string | null;
};

/**
 * List ranking utama. Mengikuti pola `event-list-client.tsx`: satu
 * container list besar dengan `Separator` antar baris, tanpa heading
 * sub-section internal supaya halaman terasa flow tunggal.
 */
export function LeaderboardRankList({
  rows,
  isLoading,
  viewerUserId,
}: LeaderboardRankListProps) {
  if (isLoading && rows.length === 0) {
    return <RankListSkeleton />;
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Belum ada peringkat untuk filter ini.
        </p>
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-2xl border border-border/60">
      {rows.map((row, index) => (
        <Fragment key={row.user.id}>
          {index > 0 ? <Separator /> : null}
          <li>
            <LeaderboardRankRow
              row={row}
              isViewer={row.user.id === viewerUserId}
            />
          </li>
        </Fragment>
      ))}
    </ul>
  );
}

function RankListSkeleton() {
  return (
    <ul
      aria-busy="true"
      aria-live="polite"
      className="overflow-hidden rounded-2xl border border-border/60"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <Fragment key={index}>
          {index > 0 ? <Separator /> : null}
          <li className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-6 rounded-sm" />
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-4 flex-1 rounded-sm" />
            <Skeleton className="h-4 w-10 rounded-sm" />
          </li>
        </Fragment>
      ))}
    </ul>
  );
}
