"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { MessageCircle, X } from "lucide-react";
import gsap from "gsap";

import { getChatBootstrap } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { ChatWorkspace } from "@/features/chat/components/chat-workspace";
import { useChatSocket } from "@/features/chat/hooks/use-chat-socket";
import { useQuickChatVisibility } from "@/features/chat/components/quick-chat-visibility";
import type { ChatBootstrap } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

type DockPhase = "idle" | "opening" | "open" | "closing";

type FloatingButtonPosition = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  hasMoved: boolean;
};

const DASHBOARD_HEADER_HEIGHT = 56;
const DRAG_THRESHOLD_PX = 6;
const FALLBACK_BUTTON_SIZE = 44;

export function ChatQuickDock() {
  const pathname = usePathname();
  const onChatPage = pathname === "/dashboard/chat";
  const { visible: globallyVisible } = useQuickChatVisibility();

  const [phase, setPhase] = useState<DockPhase>("idle");
  const [data, setData] = useState<ChatBootstrap | null>(null);
  const [fabPosition, setFabPosition] = useState<FloatingButtonPosition | null>(null);
  const [isPending, startTransition] = useTransition();

  const cardRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const suppressNextClickRef = useRef(false);

  const dockMounted = phase !== "idle";

  const getScreenMargin = useCallback(() => (window.innerWidth >= 640 ? 20 : 16), []);

  const clampFabPosition = useCallback((x: number, y: number, width: number, height: number) => {
    const margin = getScreenMargin();
    const minX = margin;
    const maxX = Math.max(margin, window.innerWidth - width - margin);
    const minY = DASHBOARD_HEADER_HEIGHT + margin;
    const maxY = Math.max(minY, window.innerHeight - height - margin);

    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY),
    };
  }, [getScreenMargin]);

  const snapFabToEdge = useCallback((x: number, y: number, width: number, height: number) => {
    const clamped = clampFabPosition(x, y, width, height);
    const margin = getScreenMargin();

    return {
      x: clamped.x + width / 2 < window.innerWidth / 2 ? margin : window.innerWidth - width - margin,
      y: clamped.y,
    };
  }, [clampFabPosition, getScreenMargin]);

  const resetFabPosition = useCallback(() => {
    setFabPosition(null);
  }, []);

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
    if (dockMounted || !globallyVisible) return;
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
  }, [dockMounted, globallyVisible]);

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
    setPhase("opening");
    if (!data) {
      startTransition(async () => {
        setData(await getChatBootstrap());
      });
    }
  }, [phase, data]);

  const closeDock = useCallback(() => {
    const node = cardRef.current;
    if (!node) {
      resetFabPosition();
      setPhase("idle");
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
        resetFabPosition();
        setPhase("idle");
      },
    });
  }, [resetFabPosition]);

  const handleFabPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      width: rect.width || FALLBACK_BUTTON_SIZE,
      height: rect.height || FALLBACK_BUTTON_SIZE,
      hasMoved: false,
    };
    suppressNextClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleFabPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (!dragState.hasMoved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;

    dragState.hasMoved = true;
    setFabPosition(clampFabPosition(dragState.originX + deltaX, dragState.originY + deltaY, dragState.width, dragState.height));
  }, [clampFabPosition]);

  const handleFabPointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (dragState.hasMoved) {
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      setFabPosition(snapFabToEdge(dragState.originX + deltaX, dragState.originY + deltaY, dragState.width, dragState.height));
      suppressNextClickRef.current = true;
    }

    dragStateRef.current = null;
  }, [snapFabToEdge]);

  const handleFabPointerCancel = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (dragState.hasMoved) {
      const rect = event.currentTarget.getBoundingClientRect();
      setFabPosition(snapFabToEdge(rect.left, rect.top, dragState.width, dragState.height));
      suppressNextClickRef.current = true;
    }

    dragStateRef.current = null;
  }, [snapFabToEdge]);

  const handleFabClick = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      event.preventDefault();
      return;
    }

    openDock();
  }, [openDock]);

  useEffect(() => {
    if (fabPosition === null) return;

    const handleResize = () => {
      const node = buttonRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();

      setFabPosition((current) => current
        ? clampFabPosition(current.x, current.y, rect.width || FALLBACK_BUTTON_SIZE, rect.height || FALLBACK_BUTTON_SIZE)
        : current);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampFabPosition, fabPosition]);

  // Auto-close the dock when the user toggles "hide quick chat" globally.
  useEffect(() => {
    if (!globallyVisible && phase !== "idle") {
      closeDock();
    }
  }, [globallyVisible, phase, closeDock]);

  if (onChatPage) return null;
  if (!globallyVisible && !dockMounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {/* Floating action button */}
      {!dockMounted && globallyVisible && (
        <Button
          ref={buttonRef}
          aria-label="Buka quick chat"
          className={cn(
            "pointer-events-auto absolute rounded-full shadow-[0_18px_44px_rgba(31,77,58,0.24)] touch-none select-none cursor-grab active:cursor-grabbing",
            fabPosition === null && "bottom-4 right-4 sm:bottom-5 sm:right-5",
          )}
          onClick={handleFabClick}
          onPointerCancel={handleFabPointerCancel}
          onPointerDown={handleFabPointerDown}
          onPointerMove={handleFabPointerMove}
          onPointerUp={handleFabPointerUp}
          size="icon-lg"
          style={fabPosition ? { left: fabPosition.x, top: fabPosition.y } : undefined}
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
            "pointer-events-auto absolute inset-x-3 bottom-3 origin-bottom-right overflow-hidden border border-border bg-card/96 shadow-[0_24px_70px_rgba(36,26,18,0.18)] backdrop-blur-xl sm:inset-x-auto sm:bottom-5 sm:right-5",
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
              onClick={() => closeDock()}
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
