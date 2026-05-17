"use client";

import { cn } from "@/lib/utils";
import type { LeaderboardScopeKey } from "@/features/leaderboard/types";

const SCOPES: Array<{ key: LeaderboardScopeKey; label: string }> = [
  { key: "overall", label: "Semua" },
  { key: "circles", label: "Circle" },
  { key: "events", label: "Agenda" },
  { key: "reviews", label: "Review" },
  { key: "social", label: "Sosial" },
];

export type LeaderboardScopeSwitchProps = {
  value: LeaderboardScopeKey;
  onChange: (next: LeaderboardScopeKey) => void;
  disabled?: boolean;
};

/**
 * Pemilih scope kategori leaderboard.
 *
 * Visualnya identik dengan `LeaderboardPeriodSwitch` agar dua axis filter
 * terasa satu bahasa. Disengaja tanpa uppercase atau border tebal supaya
 * tidak bersaing dengan rank list di bawahnya.
 */
export function LeaderboardScopeSwitch({
  value,
  onChange,
  disabled,
}: LeaderboardScopeSwitchProps) {
  return (
    <div
      role="tablist"
      aria-label="Pilih kategori leaderboard"
      className="-mx-2 flex gap-1 overflow-x-auto px-2 sm:mx-0 sm:px-0"
    >
      {SCOPES.map((option) => {
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
