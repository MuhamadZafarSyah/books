import { BookAiChatClient } from "@/features/book-ai-chat/components/book-ai-chat-client";
import { BookAiChatHeader } from "@/features/book-ai-chat/components/book-ai-chat-header";
import { BookAiChatSidebar } from "@/features/book-ai-chat/components/book-ai-chat-sidebar";
import type { BookAiBootstrap } from "@/features/book-ai-chat/types";

type BookAiChatShellProps = {
  data: BookAiBootstrap;
};

export function BookAiChatShell({ data }: BookAiChatShellProps) {
  const { conversation, history } = data;

  return (
    <div className="grid h-full min-h-0 overflow-hidden rounded-2xl border border-border bg-card/70 shadow-sm md:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="hidden min-h-0 md:block">
        <BookAiChatSidebar
          history={history}
          activeConversationId={conversation.id}
        />
      </div>
      <section className="flex min-h-0 min-w-0 flex-col">
        <BookAiChatHeader
          title={conversation.title}
          context={conversation.context}
          openLibraryUrl={conversation.openLibraryUrl}
        />
        <BookAiChatClient conversation={conversation} />
      </section>
    </div>
  );
}
