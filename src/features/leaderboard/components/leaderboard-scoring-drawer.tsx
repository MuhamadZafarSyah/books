"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  LeaderboardScopeKey,
  LeaderboardScoringResponse,
  LeaderboardScoringRule,
} from "@/features/leaderboard/types";

const NUMBER_FORMATTER = new Intl.NumberFormat("id-ID");

const SCOPE_BADGE: Record<
  Exclude<LeaderboardScopeKey, "overall">,
  string
> = {
  circles: "Circle",
  events: "Agenda",
  reviews: "Review",
  social: "Sosial",
};

/**
 * Drawer (`Sheet` shadcn) untuk menjelaskan cara perhitungan poin.
 *
 * Memuat data dari `GET /api/leaderboard/scoring` lazily — fetch baru
 * dimulai saat user pertama kali membuka drawer agar halaman utama tidak
 * memuat payload tambahan untuk fitur yang mungkin tidak dilihat.
 */
export function LeaderboardScoringDrawer() {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<LeaderboardScoringRule[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || rules !== null || isLoading) return;
    let cancelled = false;

    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/leaderboard/scoring");
        if (!response.ok) {
          throw new Error("Gagal memuat aturan poin.");
        }
        const data = (await response.json()) as LeaderboardScoringResponse;
        if (cancelled) return;
        setRules(data.rules);
      } catch (cause) {
        if (cancelled) return;
        setError(
          cause instanceof Error ? cause.message : "Gagal memuat aturan poin.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, rules, isLoading]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <Info aria-hidden="true" className="size-3.5" />
          Cara perhitungan
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Cara perhitungan poin</SheetTitle>
          <SheetDescription>
            Aktivitas berikut menambah poin leaderboard. Edit dan hapus tidak
            menambah atau mengurangi poin.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          {isLoading || rules === null ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-2/3 rounded-sm" />
                  <Skeleton className="h-3 w-1/2 rounded-sm" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-border/60">
              {rules.map((rule, index) => (
                <li key={rule.type}>
                  {index > 0 ? <Separator /> : null}
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="line-clamp-1 text-sm font-medium text-foreground">
                        {rule.label}
                      </p>
                      {rule.notes ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {rule.notes}
                        </p>
                      ) : null}
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
                        )}
                      >
                        {SCOPE_BADGE[rule.scope]}
                      </span>
                    </div>
                    <span className="font-heading text-base font-semibold tabular-nums text-foreground">
                      +{NUMBER_FORMATTER.format(rule.points)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
