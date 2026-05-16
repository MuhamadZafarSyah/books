"use client";

import { useCallback, useState } from "react";

import { BookAiChatComposer } from "@/features/book-ai-chat/components/book-ai-chat-composer";
import { BookAiChatThread } from "@/features/book-ai-chat/components/book-ai-chat-thread";
import { getFallbackUnavailableMessage } from "@/features/book-ai-chat/lib/prompt-public";
import type {
  BookAiConversationDetail,
  BookAiMessageSummary,
} from "@/features/book-ai-chat/types";

type BookAiChatClientProps = {
  conversation: BookAiConversationDetail;
};

type ApiResponse =
  | {
      userMessage: BookAiMessageSummary;
      assistantMessage: BookAiMessageSummary;
    }
  | { error: string };

export function BookAiChatClient({ conversation }: BookAiChatClientProps) {
  const [messages, setMessages] = useState<BookAiMessageSummary[]>(
    conversation.messages,
  );
  const [pending, setPending] = useState(false);

  const handleSubmit = useCallback(
    async (body: string) => {
      const optimisticId = `tmp-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const optimistic: BookAiMessageSummary = {
        id: optimisticId,
        role: "USER",
        body,
        createdAt: new Date().toISOString(),
        pending: true,
      };

      setMessages((current) => [...current, optimistic]);
      setPending(true);

      try {
        const res = await fetch(
          `/api/ai/book-chat/${encodeURIComponent(conversation.id)}/messages`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ message: body }),
          },
        );

        const data = (await res.json()) as ApiResponse;

        if (!res.ok || "error" in data) {
          const errorMessage =
            "error" in data && typeof data.error === "string"
              ? data.error
              : getFallbackUnavailableMessage();
          setMessages((current) =>
            current.map((message) =>
              message.id === optimisticId
                ? {
                    ...message,
                    pending: false,
                    failed: true,
                    body: `${body}\n\n(${errorMessage})`,
                  }
                : message,
            ),
          );
          return;
        }

        setMessages((current) => [
          ...current.filter((message) => message.id !== optimisticId),
          data.userMessage,
          data.assistantMessage,
        ]);
      } catch (error) {
        console.error("[book-ai] submit failed", error);
        setMessages((current) =>
          current.map((message) =>
            message.id === optimisticId
              ? { ...message, pending: false, failed: true }
              : message,
          ),
        );
      } finally {
        setPending(false);
      }
    },
    [conversation.id],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BookAiChatThread
        messages={messages}
        isThinking={pending}
        bookTitle={conversation.context.title}
      />
      <BookAiChatComposer
        onSubmit={handleSubmit}
        pending={pending}
        disabled={pending}
      />
    </div>
  );
}
