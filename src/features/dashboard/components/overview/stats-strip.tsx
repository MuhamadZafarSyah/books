import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatItem = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
};

type StatsStripProps = {
  stats: StatItem[];
  className?: string;
};

/**
 * Strip stat ringkas yang scroll horizontal di mobile.
 *
 * Tiap stat dipisah `Separator`-style border tipis di kanan supaya tetap
 * terbaca tanpa membungkus tiap stat dengan Card. Cocok untuk Beranda
 * (4 angka kunci) maupun Profil (6 angka).
 */
export function StatsStrip({ stats, className }: StatsStripProps) {
  return (
    <div
      className={cn(
        "no-scrollbar -mx-4 flex gap-0 overflow-x-auto px-4 sm:mx-0 sm:px-0",
        className,
      )}
    >
      {stats.map((stat, index) => (
        <div
          key={`${stat.label}-${index}`}
          className={cn(
            "flex min-w-[120px] flex-1 flex-col gap-0.5 px-4 py-3 first:pl-0",
            index < stats.length - 1 && "border-r border-border/50",
          )}
        >
          <span className="font-heading text-xl font-semibold tabular-nums text-foreground">
            {stat.value}
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {stat.label}
          </span>
          {stat.hint ? (
            <span className="text-[11px] text-muted-foreground/80">
              {stat.hint}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
