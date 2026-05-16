"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BookOpen, MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { BookAiConversationSummary } from "@/features/book-ai-chat/types";

type BookAiChatSidebarProps = {
  history: BookAiConversationSummary[];
  activeConversationId: string;
};

function formatRelative(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}j lalu`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}h lalu`;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}

export function BookAiChatSidebar({
  history,
  activeConversationId,
}: BookAiChatSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-border bg-card/60">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            History
          </span>
          <p className="truncate text-sm font-semibold text-foreground">
            Diskusi AI
          </p>
        </div>
        <Button
          asChild
          size="icon-sm"
          variant="ghost"
          className="cursor-pointer"
          aria-label="Kembali ke Jelajahi"
        >
          <Link href="/dashboard/explore">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="space-y-1 p-2">
          {history.map((item) => {
            const isActive = item.id === activeConversationId;
            return (
              <li key={item.id}>
                <Link
                  href={`/dashboard/explore/discussions/${item.id}`}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-colors duration-200",
                    isActive
                      ? "border-primary/30 bg-primary/8 text-foreground shadow-sm"
                      : "hover:border-border hover:bg-secondary/60",
                  )}
                >
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.bookCoverUrl ? (
                      <Image
                        src={item.bookCoverUrl}
                        alt={`Cover ${item.bookTitle}`}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-muted-foreground/70">
                        <BookOpen aria-hidden="true" className="size-4" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-xs font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">
                      {item.bookAuthor}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground/80">
                    {formatRelative(item.lastMessageAt ?? item.updatedAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {history.length === 0 && (
          <div className="px-4 py-6 text-xs text-muted-foreground">
            Belum ada diskusi. Mulai dari halaman Jelajahi.
          </div>
        )}
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-3">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full cursor-pointer rounded-full"
        >
          <Link href="/dashboard/explore">
            <MessageSquarePlus aria-hidden="true" className="size-3.5" />
            Diskusi baru
          </Link>
        </Button>
      </div>
    </aside>
  );
}
