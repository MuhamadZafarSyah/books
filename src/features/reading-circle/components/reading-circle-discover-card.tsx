"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpen, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ReadingCircleSummary } from "@/features/reading-circle/types";

type ReadingCircleDiscoverCardProps = {
  circle: ReadingCircleSummary;
};

function formatRelative(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}j lalu`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}h lalu`;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

/**
 * Kartu discover circle — layout horizontal kompak.
 *
 * Terinspirasi dari pola list-row modern (Spotify playlist, Apple Music):
 * thumbnail kecil di kiri, teks di kanan, tanpa hero image besar yang
 * memotong cover buku. Hasilnya lebih scannable dan tidak terasa generic.
 */
export function ReadingCircleDiscoverCard({
  circle,
}: ReadingCircleDiscoverCardProps) {
  const lastActivity = formatRelative(circle.lastActivityAt ?? circle.updatedAt);

  return (
    <Link
      href={`/dashboard/circles/${circle.id}`}
      aria-label={circle.title}
      className={cn(
        "group flex cursor-pointer border border-border items-start gap-3 rounded-xl p-3 transition-colors duration-150",
        "hover:bg-muted/60",
        "focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
      )}
    >
      {/* Thumbnail buku — portrait aspect ratio, tidak terpotong */}
      <div className="relative aspect-[2/3] w-11 shrink-0 overflow-hidden rounded-md bg-muted sm:w-12">
        {circle.bookCoverUrl ? (
          <Image
            src={circle.bookCoverUrl}
            alt=""
            fill
            sizes="48px"
            className="object-contain"
          />
        ) : (
          <span className="flex size-full items-center justify-center bg-secondary">
            <BookOpen
              aria-hidden="true"
              className="size-4 text-muted-foreground/60"
            />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground transition-colors duration-150 group-hover:text-primary">
          {circle.title}
        </h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {circle.bookTitle} · {circle.bookAuthor}
        </p>
        <div className="mt-1 flex items-center gap-2.5 text-[11px] text-muted-foreground/80">
          <span className="inline-flex items-center gap-1">
            <Users aria-hidden="true" className="size-3" />
            {circle.memberCount}
          </span>
          {lastActivity ? <span>{lastActivity}</span> : null}
          {circle.myRole ? (
            <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
              {circle.myRole === "OWNER"
                ? "Owner"
                : circle.myRole === "MODERATOR"
                  ? "Mod"
                  : "Joined"}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
