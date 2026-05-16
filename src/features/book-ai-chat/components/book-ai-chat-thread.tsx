"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Sparkles, BookOpen, User2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BookAiMessageSummary } from "@/features/book-ai-chat/types";

type BookAiChatThreadProps = {
  messages: BookAiMessageSummary[];
  isThinking: boolean;
  bookTitle: string;
};

export function BookAiChatThread({
  messages,
  isThinking,
  bookTitle,
}: BookAiChatThreadProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => cancelAnimationFrame(id);
  }, [messages.length, isThinking]);

  if (messages.length === 0 && !isThinking) {
    return <EmptyState bookTitle={bookTitle} />;
  }

  return (
    <div className="hide-scrollbar flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
        {messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
        {isThinking && <ThinkingBubble />}
        <div ref={endRef} aria-hidden="true" />
      </div>
    </div>
  );
}

function Bubble({ message }: { message: BookAiMessageSummary }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        node,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.22, ease: "power2.out" },
      );
    }, node);
    return () => ctx.revert();
  }, []);

  const isUser = message.role === "USER";

  return (
    <div
      ref={ref}
      className={cn(
        "flex min-w-0 gap-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && <RoleAvatar role="ASSISTANT" />}
      <div
        className={cn(
          "min-w-0 max-w-[86%] break-words whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[78%]",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-secondary text-foreground",
          message.pending && "opacity-60",
          message.failed &&
            "border border-destructive/30 bg-destructive/10 text-destructive opacity-100",
        )}
      >
        <p>{message.body}</p>
        <p
          className={cn(
            "mt-1 text-[10px]",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {message.failed
            ? "Gagal menerima jawaban"
            : new Date(message.createdAt).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
        </p>
      </div>
      {isUser && <RoleAvatar role="USER" />}
    </div>
  );
}

function ThinkingBubble() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        node,
        { opacity: 0, scale: 0.92, y: 6, transformOrigin: "0% 100%" },
        { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: "back.out(1.6)" },
      );
      const dots = node.querySelectorAll<HTMLSpanElement>("[data-think-dot]");
      if (dots.length > 0) {
        gsap.to(dots, {
          y: -3,
          duration: 0.45,
          ease: "sine.inOut",
          stagger: { each: 0.12, repeat: -1, yoyo: true },
          repeat: -1,
          yoyo: true,
        });
      }
    }, node);

    return () => ctx.revert();
  }, []);

  return (
    <div className="flex items-end gap-3">
      <RoleAvatar role="ASSISTANT" />
      <div
        ref={containerRef}
        className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-secondary px-4 py-3 shadow-sm"
      >
        <span data-think-dot className="size-1.5 rounded-full bg-muted-foreground" />
        <span data-think-dot className="size-1.5 rounded-full bg-muted-foreground" />
        <span data-think-dot className="size-1.5 rounded-full bg-muted-foreground" />
        <span className="sr-only">Sedang menyusun jawaban</span>
      </div>
    </div>
  );
}

function RoleAvatar({ role }: { role: "USER" | "ASSISTANT" }) {
  if (role === "ASSISTANT") {
    return (
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
        <Sparkles aria-hidden="true" className="size-4" />
      </span>
    );
  }
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
      <User2 aria-hidden="true" className="size-4" />
    </span>
  );
}

function EmptyState({ bookTitle }: { bookTitle: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <BookOpen aria-hidden="true" className="size-5" />
        </span>
        <h2 className="mt-4 font-heading text-lg font-semibold tracking-tight">
          Mulai diskusi tentang {bookTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tanyakan ringkasan, tema, karakter, atau interpretasi tertentu.
          AI hanya akan menjawab seputar buku ini.
        </p>
      </div>
    </div>
  );
}
