"use client";

import { cn } from "@/lib/utils";
import type { LeaderboardPeriodKey } from "@/features/leaderboard/types";

const PERIODS: Array<{ key: LeaderboardPeriodKey; label: string }> = [
  { key: "daily", label: "Hari" },
  { key: "weekly", label: "Minggu" },
  { key: "monthly", label: "Bulan" },
  { key: "all-time", label: "Semua" },
];

export type LeaderboardPeriodSwitchProps = {
  value: LeaderboardPeriodKey;
  onChange: (next: LeaderboardPeriodKey) => void;
  disabled?: boolean;
};

/**
 * Segmented control horizontal untuk periode leaderboard.
 *
 * Mengikuti gaya filter pada `event-list-client.tsx`: pill kompak dengan
 * label pendek satu kata. Active state pakai border + warna primer
 * supaya kontras kuat tanpa fill berat.
 */
export function LeaderboardPeriodSwitch({
  value,
  onChange,
  disabled,
}: LeaderboardPeriodSwitchProps) {
  return (
    <div
      role="tablist"
      aria-label="Pilih periode leaderboard"
      className="-mx-2 flex gap-1 overflow-x-auto px-2 sm:mx-0 sm:px-0"
    >
      {PERIODS.map((option) => {
        const isActive = option.key === value;
        return (
          <button
            key={option.key}
            role="tab"
            type="button"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => onChange(option.key)}
            className={cn(
              "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200",
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              "disabled:pointer-events-none disabled:opacity-60",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
