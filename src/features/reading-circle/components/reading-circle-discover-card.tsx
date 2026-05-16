"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, BookOpen, Globe, Lock, EyeOff, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  ReadingCirclePrivacy,
  ReadingCircleSummary,
} from "@/features/reading-circle/types";

type ReadingCircleDiscoverCardProps = {
  circle: ReadingCircleSummary;
};

const PRIVACY_META: Record<
  ReadingCirclePrivacy,
  { label: string; icon: typeof Globe }
> = {
  PUBLIC: { label: "Publik", icon: Globe },
  PRIVATE: { label: "Privat", icon: Lock },
  UNLISTED: { label: "Unlisted", icon: EyeOff },
};

function formatRelative(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}j`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}h`;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export function ReadingCircleDiscoverCard({
  circle,
}: ReadingCircleDiscoverCardProps) {
  const privacy = PRIVACY_META[circle.privacy];
  const lastActivity = formatRelative(circle.lastActivityAt ?? circle.updatedAt);

  return (
    <Link
      href={`/dashboard/circles/${circle.id}`}
      aria-label={circle.title}
      className={cn(
        "group flex h-full cursor-pointer flex-col gap-3 rounded-2xl border border-border bg-card p-3 outline-none transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
        "focus-visible:-translate-y-0.5 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/40",
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted">
        {circle.bookCoverUrl ? (
          <Image
            src={circle.bookCoverUrl}
            alt={`Cover ${circle.bookTitle}`}
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-secondary via-muted to-accent/40 p-3 text-center">
            <BookOpen
              aria-hidden="true"
              className="size-5 text-muted-foreground/70"
            />
            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-muted-foreground">
              {circle.bookTitle}
            </span>
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"
        />
        <span
          className={cn(
            "absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/85 shadow-sm backdrop-blur-sm",
          )}
        >
          <privacy.icon aria-hidden="true" className="size-3" />
          {privacy.label}
        </span>
        {circle.myRole && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground shadow-sm">
            {circle.myRole === "OWNER"
              ? "Owner"
              : circle.myRole === "MODERATOR"
                ? "Mod"
                : "Member"}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-1">
        <h3 className="line-clamp-2 font-heading text-sm font-semibold leading-snug tracking-tight text-foreground">
          {circle.title}
        </h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {circle.bookTitle} · {circle.bookAuthor}
        </p>
        {circle.description && (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/85">
            {circle.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border/60 px-1 pt-3 text-[11px] text-muted-foreground/85">
        <span className="inline-flex items-center gap-1.5">
          <Users aria-hidden="true" className="size-3" />
          {circle.memberCount.toLocaleString("id-ID")} anggota
          {lastActivity && (
            <>
              <span aria-hidden="true">·</span>
              <span>{lastActivity}</span>
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-1 text-primary transition-transform duration-200 group-hover:translate-x-0.5">
          {circle.myRole ? "Buka" : "Lihat"}
          <ArrowUpRight aria-hidden="true" className="size-3" />
        </span>
      </div>
    </Link>
  );
}
