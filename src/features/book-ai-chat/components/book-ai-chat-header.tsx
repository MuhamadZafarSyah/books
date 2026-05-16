import { Sparkles, ExternalLink, BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { BookAiChatHistoryDrawer } from "@/features/book-ai-chat/components/book-ai-chat-history-drawer";
import type {
  BookAiConversationSummary,
  BookContextSnapshot,
} from "@/features/book-ai-chat/types";

type BookAiChatHeaderProps = {
  title: string;
  context: BookContextSnapshot;
  openLibraryUrl: string | null;
  history: BookAiConversationSummary[];
  activeConversationId: string;
};

export function BookAiChatHeader({
  title,
  context,
  openLibraryUrl,
  history,
  activeConversationId,
}: BookAiChatHeaderProps) {
  const meta = [
    context.firstPublishYear ? `${context.firstPublishYear}` : null,
    context.subjects[0] ?? null,
    typeof context.pageCount === "number" ? `${context.pageCount} hal.` : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <header className="flex items-start gap-3 border-b border-border bg-card px-4 py-4 sm:gap-4 sm:px-6">


      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-muted shadow-sm sm:h-24 sm:w-16">
        {context.coverUrl ? (
          <Image
            src={context.coverUrl}
            alt={`Cover ${context.title}`}
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
              {context.title}
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex relative justify-between items-center">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles aria-hidden="true" className="size-3" />
            Diskusi AI
          </span>
          <div className="absolute -top-2 -right-2">
            <BookAiChatHistoryDrawer
              history={history}
              activeConversationId={activeConversationId}
            />
          </div>
        </div>
        <h1 className="font-heading text-base font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
          {title}
        </h1>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          oleh {context.authorText}
        </p>
        {meta.length > 0 && (
          <p className="line-clamp-1 text-[11px] text-muted-foreground/80">
            {meta.join(" · ")}
          </p>
        )}
      </div>

      {openLibraryUrl && (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="hidden cursor-pointer rounded-full sm:inline-flex"
        >
          <Link
            href={openLibraryUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Buka ${context.title} di Open Library`}
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
            Open Library
          </Link>
        </Button>
      )}
    </header>
  );
}
