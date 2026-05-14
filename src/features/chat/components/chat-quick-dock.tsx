"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { MessageCircle, Minus, X } from "lucide-react";

import { getChatBootstrap } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { ChatWorkspace } from "@/features/chat/components/chat-workspace";
import type { ChatBootstrap } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const DOCK_TRANSITION_MS = 300;

export function ChatQuickDock() {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [data, setData] = useState<ChatBootstrap | null>(null);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dockOpen = open && !hidden;
  const dockTransitioning = dockOpen || closing;
  const dockContentVisible = dockOpen || closing;
  const dockSurfaceVisible = dockOpen || closing;

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const openDock = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setHidden(false);
    setClosing(false);
    setOpen(true);
    if (!data) {
      startTransition(async () => {
        setData(await getChatBootstrap());
      });
    }
  };

  const closeDock = (hideAfterClose = false) => {
    setOpen(false);
    setClosing(true);

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = setTimeout(() => {
      setClosing(false);
      setHidden(hideAfterClose);
      closeTimerRef.current = null;
    }, DOCK_TRANSITION_MS);
  };

  if (pathname === "/dashboard/chat") {
    return null;
  }

  return (
    <div className={cn("fixed z-40", dockTransitioning ? "inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-5 sm:right-5" : "bottom-4 right-4 sm:bottom-5 sm:right-5")}>
      <div
        className={cn(
          "ml-auto origin-bottom-right overflow-hidden transition-[width,height,border-radius,box-shadow,background-color,border-color,opacity,transform] duration-300 ease-out motion-reduce:transition-none",
          dockOpen ? "h-[min(82dvh,42rem)] w-full rounded-[1.75rem] sm:h-[36rem] sm:w-[30rem]" : "size-11 ",
          dockSurfaceVisible && "border border-border bg-card/96 shadow-[0_24px_70px_rgba(36,26,18,0.18)] backdrop-blur-xl",
        )}
      >
        {!dockContentVisible && (
          <Button
            aria-label="Tampilkan quick chat"
            className="rounded-full z-50! shadow-[0_18px_44px_rgba(31,77,58,0.24)] transition-[box-shadow,transform] duration-300 ease-out motion-reduce:transition-none"
            onClick={openDock}
            size="icon-lg"
            type="button"
          >
            <MessageCircle className="size-5" />
          </Button>
        )}
        {dockContentVisible && (
          <div className={cn("flex h-14 items-center gap-3 border-b border-border/70 px-3 transition-opacity duration-200", closing && "opacity-0")}>
            <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <MessageCircle className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-foreground">Quick Chat</span>
                <span className="block truncate text-xs text-muted-foreground">History chat cepat</span>
              </span>
            </div>
            <Button aria-label="Buka halaman chat" asChild size="icon-xs" variant="ghost">
              <Link href="/dashboard/chat">
                <MessageCircle className="size-3.5" />
              </Link>
            </Button>
            <Button aria-label="Minimize quick chat" onClick={() => closeDock()} size="icon-xs" type="button" variant="ghost">
              <Minus className="size-3.5" />
            </Button>
            <Button aria-label="Hide quick chat" onClick={() => closeDock(true)} size="icon-xs" type="button" variant="ghost">
              <X className="size-3.5" />
            </Button>
          </div>
        )}
        {dockContentVisible && (
          <div className={cn("h-[calc(100%-3.5rem)] p-2 transition-opacity duration-200 sm:p-3", closing && "opacity-0")}>
            {data ? (
              <ChatWorkspace compact initialData={data} />
            ) : (
              <div className="grid h-full place-items-center rounded-[1.5rem] border border-dashed border-border text-sm text-muted-foreground">
                {isPending ? "Memuat percakapan..." : "Buka quick chat"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
