"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type RatingInputProps = {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  id?: string;
};

const LABELS = [
  "",
  "Tidak suka",
  "Kurang",
  "Cukup",
  "Bagus",
  "Sangat bagus",
] as const;

export function RatingInput({
  value,
  onChange,
  disabled = false,
  id,
}: RatingInputProps) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  const label = LABELS[display] ?? "";

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(null)}
        role="radiogroup"
        aria-label="Beri rating bintang"
        id={id}
      >
        {[1, 2, 3, 4, 5].map((index) => {
          const filled = index <= display;
          return (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={value === index}
              aria-label={`${index} bintang`}
              disabled={disabled}
              onMouseEnter={() => !disabled && setHover(index)}
              onFocus={() => !disabled && setHover(index)}
              onClick={() => !disabled && onChange(index)}
              className={cn(
                "rounded-full p-1 outline-none transition-transform duration-150",
                "hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring/50",
                disabled && "cursor-not-allowed opacity-60",
                !disabled && "cursor-pointer",
              )}
            >
              <Star
                className={cn(
                  "size-6",
                  filled
                    ? "fill-chart-5 text-chart-5"
                    : "text-muted-foreground/40",
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
      <span
        aria-live="polite"
        className="min-w-[6.5rem] text-xs text-muted-foreground"
      >
        {label || "Pilih rating"}
      </span>
    </div>
  );
}
