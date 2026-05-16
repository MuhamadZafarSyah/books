import Link from "next/link";
import { MessageSquarePlus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BookAiChatClient } from "@/features/book-ai-chat/components/book-ai-chat-client";
import { BookAiChatHeader } from "@/features/book-ai-chat/components/book-ai-chat-header";
import { BookAiChatHistoryDrawer } from "@/features/book-ai-chat/components/book-ai-chat-history-drawer";
import { BookAiChatSidebar } from "@/features/book-ai-chat/components/book-ai-chat-sidebar";
import type { BookAiBootstrap } from "@/features/book-ai-chat/types";

type BookAiChatShellProps = {
  data: BookAiBootstrap;
};

export function BookAiChatShell({ data }: BookAiChatShellProps) {
  const { conversation, history } = data;
  const activeConversationId = conversation?.id ?? null;

  return (
    <div className="grid h-full min-h-0 overflow-hidden rounded-2xl border border-border bg-card/70 shadow-sm md:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="hidden min-h-0 md:block">
        <BookAiChatSidebar
          history={history}
          activeConversationId={activeConversationId}
        />
      </div>
      <section className="flex min-h-0 min-w-0 flex-col">
        {conversation ? (
          <>
            <BookAiChatHeader
              title={conversation.title}
              context={conversation.context}
              openLibraryUrl={conversation.openLibraryUrl}
              history={history}
              activeConversationId={conversation.id}
            />
            <BookAiChatClient conversation={conversation} />
          </>
        ) : (
          <EmptyMainPanel
            history={history}
            activeConversationId={activeConversationId}
          />
        )}
      </section>
    </div>
  );
}

function EmptyMainPanel({
  history,
  activeConversationId,
}: {
  history: BookAiBootstrap["history"];
  activeConversationId: string | null;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-col">
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
          <h1 className="mt-1 font-heading text-base font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
            Pilih diskusi
          </h1>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {history.length > 0
              ? "Buka salah satu diskusi dari daftar di samping."
              : "Belum ada diskusi. Mulai dari halaman Jelajahi."}
          </p>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="max-w-md text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-4 font-heading text-lg font-semibold tracking-tight">
            {history.length > 0
              ? "Belum ada buku yang dipilih"
              : "Mulai diskusi pertama Anda"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {history.length > 0
              ? "Pilih diskusi dari panel history untuk melanjutkan, atau buka halaman Jelajahi untuk mulai diskusi baru."
              : "Cari buku di halaman Jelajahi, lalu tekan tombol \"Diskusi buku ini\" untuk mulai chatting dengan AI."}
          </p>
          <Button
            asChild
            size="sm"
            className="mt-4 cursor-pointer rounded-full"
          >
            <Link href="/dashboard/explore">
              <MessageSquarePlus aria-hidden="true" className="size-3.5" />
              {history.length > 0 ? "Diskusi baru" : "Mulai dari Jelajahi"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
