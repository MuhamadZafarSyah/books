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

type PodiumSlotProps = {
  row: LeaderboardUserRow | null;
  rank: 1 | 2 | 3;
};

/**
 * Slot podium minimalis. Hierarchy didapat lewat ukuran avatar dan bobot
 * tipografi, bukan pedestal block atau ikon dekoratif. Slot kosong
 * dirender sebagai placeholder ringan agar layout tetap stabil.
 */
function PodiumSlot({ row, rank }: PodiumSlotProps) {
  const isPrimary = rank === 1;

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span
        className={cn(
          "font-heading font-semibold tabular-nums",
          isPrimary
            ? "text-3xl text-primary"
            : "text-xl text-muted-foreground",
        )}
      >
        #{rank}
      </span>

      {row ? (
        <Link
          href={`/u/${row.user.slug}`}
          className="flex flex-col items-center gap-2 transition-opacity duration-200 hover:opacity-80"
        >
          <Avatar
            className={cn(
              "ring-2 ring-background",
              isPrimary
                ? "size-20 ring-primary/30 sm:size-24"
                : "size-14 sm:size-16",
            )}
          >
            <AvatarImage
              src={row.user.image ?? undefined}
              alt={row.user.name ?? "Pembaca"}
            />
            <AvatarFallback>{getInitials(row.user.name)}</AvatarFallback>
          </Avatar>
          <p
            className={cn(
              "line-clamp-1 max-w-[10rem] font-heading text-foreground",
              isPrimary ? "text-base font-semibold" : "text-sm font-medium",
            )}
          >
            {row.user.name ?? row.user.username ?? "Pembaca"}
          </p>
          <p
            className={cn(
              "tabular-nums text-muted-foreground",
              isPrimary ? "text-sm" : "text-xs",
            )}
          >
            {NUMBER_FORMATTER.format(row.totalPoints)} poin
          </p>
        </Link>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "rounded-full border border-dashed border-border bg-muted/30",
              isPrimary ? "size-20 sm:size-24" : "size-14 sm:size-16",
            )}
          />
          <p className="text-xs text-muted-foreground">Slot terbuka</p>
        </div>
      )}
    </div>
  );
}

export type LeaderboardPodiumProps = {
  topThree: LeaderboardUserRow[];
};

/**
 * Top-3 podium dengan rhythm editorial: surface tipis, tiga slot sejajar,
 * tidak ada pedestal block atau gradien. #1 dibesarkan lewat ukuran
 * avatar dan warna primer; #2 dan #3 dijaga lebih kecil agar #1 jadi
 * pusat visual tanpa ornamen tambahan.
 *
 * Pada mobile slot diatur dengan `order` agar #1 tetap berada di tengah
 * walau jumlah baris bertambah.
 */
export function LeaderboardPodium({ topThree }: LeaderboardPodiumProps) {
  const first = topThree[0] ?? null;
  const second = topThree[1] ?? null;
  const third = topThree[2] ?? null;

  return (
    <section
      aria-label="Tiga teratas"
      className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-8 sm:px-8"
    >
      <div className="grid grid-cols-3 items-end gap-4 sm:gap-8">
        <div className="order-2 sm:order-1">
          <PodiumSlot row={second} rank={2} />
        </div>
        <div className="order-1 sm:order-2">
          <PodiumSlot row={first} rank={1} />
        </div>
        <div className="order-3">
          <PodiumSlot row={third} rank={3} />
        </div>
      </div>
    </section>
  );
}
