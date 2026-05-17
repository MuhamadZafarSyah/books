"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LeaderboardPeriodSwitch } from "@/features/leaderboard/components/leaderboard-period-switch";
import { LeaderboardPodium } from "@/features/leaderboard/components/leaderboard-podium";
import { LeaderboardRankList } from "@/features/leaderboard/components/leaderboard-rank-list";
import { LeaderboardScopeSwitch } from "@/features/leaderboard/components/leaderboard-scope-switch";
import { LeaderboardScoringDrawer } from "@/features/leaderboard/components/leaderboard-scoring-drawer";
import { LeaderboardViewerPanel } from "@/features/leaderboard/components/leaderboard-viewer-panel";
import type {
  LeaderboardMeResponse,
  LeaderboardPeriodKey,
  LeaderboardResponse,
  LeaderboardScopeKey,
} from "@/features/leaderboard/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export type LeaderboardPageClientProps = {
  viewerUserId: string;
  initialPeriod: LeaderboardPeriodKey;
  initialScope: LeaderboardScopeKey;
};

/**
 * Client island halaman leaderboard.
 *
 * Layout single-column mengikuti rhythm Agenda Baca: toolbar di atas,
 * viewer strip ringkas, podium minimalis, dan list panjang dengan
 * separator. Tidak ada sidebar sticky atau heading sub-section internal
 * agar halaman terasa flow tunggal.
 */
export function LeaderboardPageClient({
  viewerUserId,
  initialPeriod,
  initialScope,
}: LeaderboardPageClientProps) {
  const [period, setPeriod] = useState<LeaderboardPeriodKey>(initialPeriod);
  const [scope, setScope] = useState<LeaderboardScopeKey>(initialScope);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [viewer, setViewer] = useState<LeaderboardMeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isFirstFilterChangeRef = useRef(true);
  useEffect(() => {
    if (isFirstFilterChangeRef.current) {
      isFirstFilterChangeRef.current = false;
      return;
    }
    setPage(1);
  }, [period, scope]);

  const fetchData = useCallback(() => {
    const offset = (page - 1) * PAGE_SIZE;
    const queryList = new URLSearchParams({
      period,
      scope,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    const queryMe = new URLSearchParams({ period, scope });

    startTransition(async () => {
      try {
        const [listResponse, meResponse] = await Promise.all([
          fetch(`/api/leaderboard?${queryList.toString()}`),
          fetch(`/api/leaderboard/me?${queryMe.toString()}`),
        ]);

        if (!listResponse.ok) throw new Error("Gagal memuat leaderboard.");
        if (!meResponse.ok) throw new Error("Gagal memuat posisi kamu.");

        const [listData, meData] = await Promise.all([
          listResponse.json() as Promise<LeaderboardResponse>,
          meResponse.json() as Promise<LeaderboardMeResponse>,
        ]);

        setData(listData);
        setViewer(meData);
        setErrorMessage(null);
      } catch (cause) {
        setErrorMessage(
          cause instanceof Error
            ? cause.message
            : "Gagal memuat leaderboard. Coba lagi.",
        );
      }
    });
  }, [page, period, scope]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / PAGE_SIZE))
    : 1;
  const hasNext = data ? page * PAGE_SIZE < data.total : false;
  const hasPrev = page > 1;
  const isInitialLoad = isPending && data === null;
  const showPagination = data !== null && data.total > PAGE_SIZE;

  return (
    <div className="space-y-6">
      {/* Toolbar: period kiri, drawer kanan */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <LeaderboardPeriodSwitch
          value={period}
          onChange={setPeriod}
          disabled={isPending}
        />
        <LeaderboardScoringDrawer />
      </div>

      <LeaderboardScopeSwitch
        value={scope}
        onChange={setScope}
        disabled={isPending}
      />

      <LeaderboardViewerPanel data={viewer} isLoading={isInitialLoad} />

      <div
        className={cn(
          "space-y-6",
          isPending && data && "opacity-80 transition-opacity duration-150",
        )}
      >
        <LeaderboardPodium topThree={data?.topThree ?? []} />

        <LeaderboardRankList
          rows={data?.rows ?? []}
          isLoading={isInitialLoad}
          viewerUserId={viewerUserId}
        />
      </div>

      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {showPagination ? (
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev || isPending}
            >
              <ChevronLeft aria-hidden="true" className="size-3.5" />
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext || isPending}
            >
              Berikutnya
              <ChevronRight aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

      {isPending && data ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-2 z-10 flex justify-center"
        >
          <span className="flex items-center gap-2 rounded-full border border-border/60 bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <Loader2 className="size-3 animate-spin" />
            Memuat
          </span>
        </div>
      ) : null}
    </div>
  );
}
