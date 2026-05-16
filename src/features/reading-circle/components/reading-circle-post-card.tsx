"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, MessageCircle, Eye, Send } from "lucide-react";

import { createReadingCircleComment } from "@/actions/reading-circle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ReadingCircleDetail,
  ReadingCirclePostSummary,
  ReadingCircleSpoilerLevel,
} from "@/features/reading-circle/types";

type ReadingCirclePostCardProps = {
  post: ReadingCirclePostSummary;
  isMember: boolean;
  onUpdated: (next: ReadingCircleDetail) => void;
};

const SPOILER_LABEL: Record<ReadingCircleSpoilerLevel, string> = {
  NONE: "Aman",
  CHAPTER_RANGE: "Spoiler bab",
  MAJOR: "Spoiler besar",
  ENDING: "Spoiler ending",
};

const SPOILER_TONE: Record<ReadingCircleSpoilerLevel, string> = {
  NONE: "bg-secondary text-secondary-foreground",
  CHAPTER_RANGE: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  MAJOR: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  ENDING: "bg-destructive/12 text-destructive",
};

function getInitials(name: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  return parts[0]?.slice(0, 2).toUpperCase() ?? "U";
}

function formatRelative(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} jam lalu`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}

export function ReadingCirclePostCard({
  post,
  isMember,
  onUpdated,
}: ReadingCirclePostCardProps) {
  const [revealed, setRevealed] = useState(post.spoilerLevel === "NONE");
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const submitComment = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        const next = await createReadingCircleComment(post.id, { body: trimmed });
        onUpdated(next);
        setDraft("");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal mengirim komentar.",
        );
      }
    });
  };

  const chapterRange = formatChapterRange(post);
  const hasTitle = Boolean(post.title);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card/80 shadow-sm">
      {hasTitle && (
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/8 via-card to-card px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-1.5 h-6 w-1 shrink-0 rounded-full bg-primary"
            />
            <h3 className="font-heading text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
              {post.title}
            </h3>
          </div>
        </div>
      )}

      <div className="p-4">
        <header className="flex items-start gap-3">
          <Avatar className="size-9 shrink-0">
            {post.authorImage && (
              <AvatarImage
                src={post.authorImage}
                alt={post.authorName ?? "Anggota"}
              />
            )}
            <AvatarFallback className="text-[11px]">
              {getInitials(post.authorName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold text-foreground">
                {post.authorName ?? "Pembaca"}
              </p>
              <span className="text-[11px] text-muted-foreground">
                · {formatRelative(post.createdAt)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {post.spoilerLevel !== "NONE" && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                    SPOILER_TONE[post.spoilerLevel],
                  )}
                >
                  <AlertTriangle aria-hidden="true" className="size-3" />
                  {SPOILER_LABEL[post.spoilerLevel]}
                </span>
              )}
              {chapterRange && (
                <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  {chapterRange}
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="mt-3">
          {revealed ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
              {post.body}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-secondary/30 p-3 text-left text-xs text-muted-foreground transition-colors hover:bg-secondary/60"
            >
              <span className="flex items-center gap-2">
                <Eye aria-hidden="true" className="size-4 text-muted-foreground" />
                Klik untuk menampilkan post yang ditandai{" "}
                <span className="font-semibold">
                  {SPOILER_LABEL[post.spoilerLevel].toLowerCase()}
                </span>
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Tampilkan
              </span>
            </button>
          )}
        </div>

        <footer className="mt-4 flex items-center gap-2 border-t border-border/50 pt-3">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="cursor-pointer rounded-full"
            onClick={() => setShowComposer((prev) => !prev)}
            aria-expanded={showComposer}
          >
            <MessageCircle aria-hidden="true" className="size-3.5" />
            {post.commentCount.toLocaleString("id-ID")} komentar
          </Button>
        </footer>

        {post.comments.length > 0 && (
          <ul className="mt-3 space-y-2 border-t border-border/50 pt-3">
            {post.comments.map((comment) => (
              <li
                key={comment.id}
                className="flex items-start gap-2.5 rounded-lg bg-secondary/30 p-2"
              >
                <Avatar className="size-7 shrink-0">
                  {comment.authorImage && (
                    <AvatarImage
                      src={comment.authorImage}
                      alt={comment.authorName ?? "Anggota"}
                    />
                  )}
                  <AvatarFallback className="text-[10px]">
                    {getInitials(comment.authorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-xs font-semibold text-foreground">
                      {comment.authorName ?? "Pembaca"}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelative(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
                    {comment.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {showComposer && (
          <div className="mt-3 rounded-xl border border-border/70 bg-background p-2">
            {isMember ? (
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Tulis komentar..."
                  rows={1}
                  className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-5 outline-none placeholder:text-muted-foreground/80"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  onClick={submitComment}
                  disabled={pending || draft.trim().length === 0}
                  className="cursor-pointer rounded-full"
                  aria-label="Kirim komentar"
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            ) : (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                Bergabung ke circle untuk berkomentar.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function formatChapterRange(post: ReadingCirclePostSummary): string | null {
  if (post.spoilerFromChapter && post.spoilerToChapter) {
    return `Bab ${post.spoilerFromChapter}-${post.spoilerToChapter}`;
  }
  if (post.spoilerFromChapter) return `Bab ${post.spoilerFromChapter}`;
  return null;
}
