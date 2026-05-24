"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  ExternalLink,
  Globe,
  Lock,
  LogOut,
  EyeOff,
  Sparkles,
  UserPlus,
} from "lucide-react";

import {
  joinReadingCircle,
  leaveReadingCircle,
} from "@/actions/reading-circle";
import { Button } from "@/components/ui/button";
import { ReadingCircleHistoryDrawer } from "@/features/reading-circle/components/reading-circle-history-drawer";
import { ReadingCircleInfoDrawer } from "@/features/reading-circle/components/reading-circle-info-drawer";
import { ReadingCirclePostDialog } from "@/features/reading-circle/components/reading-circle-post-dialog";
import { cn } from "@/lib/utils";
import type {
  ReadingCircleDetail,
  ReadingCirclePrivacy,
  ReadingCircleSummary,
} from "@/features/reading-circle/types";

type ReadingCircleHeaderProps = {
  circle: ReadingCircleDetail;
  history: ReadingCircleSummary[];
  onUpdated: (next: ReadingCircleDetail) => void;
};

const PRIVACY_META: Record<
  ReadingCirclePrivacy,
  { label: string; icon: typeof Globe; tone: string }
> = {
  PUBLIC: { label: "Publik", icon: Globe, tone: "bg-primary/10 text-primary" },
  PRIVATE: {
    label: "Privat",
    icon: Lock,
    tone: "bg-destructive/10 text-destructive",
  },
  UNLISTED: {
    label: "Unlisted",
    icon: EyeOff,
    tone: "bg-secondary text-secondary-foreground",
  },
};

export function ReadingCircleHeader({
  circle,
  history,
  onUpdated,
}: ReadingCircleHeaderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const privacy = PRIVACY_META[circle.privacy];
  const isOwner = circle.myRole === "OWNER";
  const isMember = circle.myRole !== null;

  const target = formatTarget(circle);

  const handleJoin = () =>
    startTransition(async () => {
      try {
        const next = await joinReadingCircle(circle.id);
        onUpdated(next);
        router.refresh();
        toast.success("Anda bergabung ke circle.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal bergabung.",
        );
      }
    });

  const handleLeave = () =>
    startTransition(async () => {
      try {
        const next = await leaveReadingCircle(circle.id);
        onUpdated(next);
        router.refresh();
        toast.success("Anda keluar dari circle.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal meninggalkan circle.",
        );
      }
    });

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-start gap-3 px-4 pb-4 pt-4 sm:gap-4 sm:px-6">
        <ReadingCircleHistoryDrawer
          history={history}
          activeCircleId={circle.id}
        />

        <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-muted shadow-sm sm:h-24 sm:w-16">
          {circle.context.coverUrl ? (
            <Image
              src={circle.context.coverUrl}
              alt={`Cover ${circle.context.title}`}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-secondary via-muted to-accent/40 p-2 text-center">
              <BookOpen
                aria-hidden="true"
                className="size-4 text-muted-foreground/70"
              />
              <span className="line-clamp-2 text-[9px] font-medium leading-tight text-muted-foreground">
                {circle.context.title}
              </span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              <Sparkles aria-hidden="true" className="size-3" />
              Reading Circle
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                privacy.tone,
              )}
            >
              <privacy.icon aria-hidden="true" className="size-3" />
              {privacy.label}
            </span>
          </div>
          <h1 className="font-heading text-base font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
            {circle.title}
          </h1>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {circle.context.title} · oleh {circle.context.authorText}
          </p>
        </div>

        {circle.openLibraryUrl && (
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="hidden cursor-pointer rounded-full sm:inline-flex"
            aria-label={`Buka ${circle.context.title} di Open Library`}
          >
            <Link
              href={circle.openLibraryUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-card/60 px-4 py-3 sm:px-6">
        {target && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
            {target}
          </span>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {circle.canView && isMember && (
            <ReadingCirclePostDialog
              circleId={circle.id}
              onPosted={onUpdated}
            />
          )}
          {isMember && (
            <ReadingCircleInfoDrawer circle={circle} />
          )}
          {!isMember && circle.privacy !== "PRIVATE" && (
            <Button
              type="button"
              size="sm"
              onClick={handleJoin}
              disabled={pending}
              className="cursor-pointer rounded-full"
            >
              <UserPlus aria-hidden="true" className="size-3.5" />
              Gabung
            </Button>
          )}
          {isMember && !isOwner && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleLeave}
              disabled={pending}
              className="cursor-pointer rounded-full"
            >
              <LogOut aria-hidden="true" className="size-3.5" />
              Keluar
            </Button>
          )}
        </div>
      </div>

      {circle.description && (
        <p className="border-t border-border/60 bg-background px-4 py-3 text-xs leading-relaxed text-muted-foreground sm:px-6">
          {circle.description}
        </p>
      )}
    </header>
  );
}

function formatTarget(circle: ReadingCircleDetail): string | null {
  const parts: string[] = [];
  if (circle.targetLabel) parts.push(circle.targetLabel);
  if (circle.targetChapterFrom && circle.targetChapterTo) {
    parts.push(`Bab ${circle.targetChapterFrom}-${circle.targetChapterTo}`);
  } else if (circle.targetChapterFrom) {
    parts.push(`Bab ${circle.targetChapterFrom}`);
  }
  if (circle.currentChapterFocus)
    parts.push(`Fokus: ${circle.currentChapterFocus}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}
