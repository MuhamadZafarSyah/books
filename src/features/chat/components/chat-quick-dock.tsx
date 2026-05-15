"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { MessageCircle, X } from "lucide-react";
import gsap from "gsap";

import { getChatBootstrap } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { ChatWorkspace } from "@/features/chat/components/chat-workspace";
import { useChatSocket } from "@/features/chat/hooks/use-chat-socket";
import type { ChatBootstrap } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

type DockPhase = "idle" | "opening" | "open" | "closing";

export function ChatQuickDock() {
  const pathname = usePathname();
  const onChatPage = pathname === "/dashboard/chat";

  const [phase, setPhase] = useState<DockPhase>("idle");
  const [hidden, setHidden] = useState(false);
  const [data, setData] = useState<ChatBootstrap | null>(null);
  const [isPending, startTransition] = useTransition();

  const cardRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const dockMounted = phase !== "idle";

  // Load bootstrap + subscribe to Pusher only after the dock has been opened
  // at least once. This keeps every other dashboard page free of Pusher
  // connections, channel subscriptions, and `setUserOnline` writes until the
  // user actually engages with chat.
  const realtimeEnabled = !onChatPage && data !== null;

  const conversationIds = useMemo(
    () =>
      realtimeEnabled
        ? data?.conversations.map((conversation) => conversation.id) ?? []
        : [],
    [data, realtimeEnabled],
  );

  useChatSocket({
    conversationIds: realtimeEnabled ? conversationIds : [],
    currentUserId: realtimeEnabled ? data?.currentUser.id : undefined,
    onEvent: () => {
      // Background updates are reflected via the next bootstrap; the
      // workspace owns the active session UI.
    },
  });

  // ---------- GSAP enter / exit animations ----------

  // Animate the floating action button in when it (re)appears.
  useEffect(() => {
    if (dockMounted || hidden) return;
    const node = buttonRef.current;
    if (!node) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        node,
        { scale: 0.6, opacity: 0, y: 12 },
        { scale: 1, opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.6)" },
      );
    }, node);

    return () => ctx.revert();
  }, [dockMounted, hidden]);

  // Animate the dock card when it appears.
  useEffect(() => {
    if (phase !== "opening") return;
    const node = cardRef.current;
    if (!node) {
      setPhase("open");
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        node,
        {
          scale: 0.6,
          opacity: 0,
          y: 36,
          transformOrigin: "100% 100%",
        },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.42,
          ease: "expo.out",
          onComplete: () => setPhase("open"),
        },
      );
    }, node);

    return () => ctx.revert();
  }, [phase]);

  const openDock = useCallback(() => {
    if (phase !== "idle" && phase !== "closing") return;
    setHidden(false);
    setPhase("opening");
    if (!data) {
      startTransition(async () => {
        setData(await getChatBootstrap());
      });
    }
  }, [phase, data]);

  const closeDock = useCallback(
    (hideAfterClose = false) => {
      const node = cardRef.current;
      if (!node) {
        setPhase("idle");
        if (hideAfterClose) setHidden(true);
        return;
      }

      setPhase("closing");
      gsap.to(node, {
        scale: 0.6,
        opacity: 0,
        y: 28,
        duration: 0.24,
        ease: "power2.in",
        onComplete: () => {
          setPhase("idle");
          if (hideAfterClose) setHidden(true);
        },
      });
    },
    [],
  );

  if (onChatPage) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-40",
        dockMounted
          ? "inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-5 sm:right-5"
          : "bottom-4 right-4 sm:bottom-5 sm:right-5",
      )}
    >
      {/* Floating action button */}
      {!dockMounted && !hidden && (
        <Button
          ref={buttonRef}
          aria-label="Buka quick chat"
          className="pointer-events-auto rounded-full z-50! shadow-[0_18px_44px_rgba(31,77,58,0.24)]"
          onClick={openDock}
          size="icon-lg"
          type="button"
        >
          <MessageCircle className="size-5" />
        </Button>
      )}

      {/* Dock card */}
      {dockMounted && (
        <div
          ref={cardRef}
          className={cn(
            "pointer-events-auto ml-auto origin-bottom-right overflow-hidden border border-border bg-card/96 shadow-[0_24px_70px_rgba(36,26,18,0.18)] backdrop-blur-xl",
            "h-[min(82dvh,42rem)] w-full rounded-[1.75rem] sm:h-[36rem] sm:w-[30rem]",
          )}
        >
          <div className="flex h-14 items-center gap-3 border-b border-border/70 px-3">
            <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <Link href="/dashboard/chat" aria-label="Buka halaman chat">
                <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground transition-transform duration-200 hover:scale-105">
                  <MessageCircle className="size-5" />
                </span>
              </Link>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-foreground">
                  Quick Chat
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  History chat cepat
                </span>
              </span>
            </div>
            <Button
              aria-label="Tutup quick chat"
              onClick={() => closeDock(false)}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <X className="size-3.5" />
            </Button>
          </div>

          <div className="h-[calc(100%-3.5rem)] p-2 sm:p-3">
            {data ? (
              <ChatWorkspace compact initialData={data} />
            ) : (
              <div className="grid h-full place-items-center rounded-[1.5rem] border border-dashed border-border text-sm text-muted-foreground">
                {isPending ? "Memuat percakapan..." : "Buka quick chat"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
