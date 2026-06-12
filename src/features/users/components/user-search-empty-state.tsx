"use client";

import { Search, SearchX, AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MIN_USER_SEARCH_QUERY_LENGTH } from "@/features/users/search-constants";
import { cn } from "@/lib/utils";

type UserSearchEmptyStateProps = {
  variant: "idle" | "no-results" | "error";
  query?: string;
  errorMessage?: string | null;
  onRetry?: () => void;
};

const VARIANT_META = {
  idle: {
    icon: Search,
    title: "Mulai cari pembaca lain",
    description: `Ketik minimal ${MIN_USER_SEARCH_QUERY_LENGTH} karakter nama atau username untuk menemukan pembaca lain di Shelfgram.`,
    tone: "bg-secondary text-secondary-foreground",
  },
  "no-results": {
    icon: SearchX,
    title: "Belum ada pembaca yang cocok",
    description:
      "Coba kata kunci lain, periksa ejaan, atau gunakan username yang lebih spesifik.",
    tone: "bg-secondary text-secondary-foreground",
  },
  error: {
    icon: AlertTriangle,
    title: "Pencarian sedang bermasalah",
    description:
      "Server tidak bisa memuat hasil. Coba lagi sebentar lagi.",
    tone: "bg-destructive/10 text-destructive",
  },
} as const;

export function UserSearchEmptyState({
  variant,
  query,
  errorMessage,
  onRetry,
}: UserSearchEmptyStateProps) {
  const meta = VARIANT_META[variant];
  const Icon = meta.icon;
  const description =
    variant === "no-results" && query
      ? `Tidak ada pembaca yang cocok untuk "${query}". ${meta.description}`
      : variant === "error" && errorMessage
        ? errorMessage
        : meta.description;

  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 py-12 text-center">
      <span
        className={cn(
          "mx-auto grid size-11 place-items-center rounded-2xl",
          meta.tone,
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <h2 className="mt-4 font-heading text-base font-semibold tracking-tight">
        {meta.title}
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {variant === "error" && onRetry && (
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            size="sm"
            onClick={onRetry}
            className="cursor-pointer rounded-full"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Coba lagi
          </Button>
        </div>
      )}
    </div>
  );
}
