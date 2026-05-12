"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MessageCircle, Minus, X } from "lucide-react";

import { getChatBootstrap } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { ChatWorkspace } from "@/features/chat/components/chat-workspace";
import type { ChatBootstrap } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function ChatQuickDock() {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ChatBootstrap | null>(null);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  const openDock = () => {
    setOpen(true);
    if (!data) {
      startTransition(async () => {
        setData(await getChatBootstrap());
      });
    }
  };
  if (pathname === "/dashboard/chat") {
    return null;
  }

  if (hidden) {
    return (
      <Button
        aria-label="Tampilkan quick chat"
        className="fixed bottom-5 right-5 z-40 rounded-full shadow-[0_18px_44px_rgba(31,77,58,0.24)] transition-[box-shadow,transform] duration-300 ease-out hover:-translate-y-1 motion-reduce:transition-none"
        onClick={() => setHidden(false)}
        size="icon-lg"
        type="button"
      >
        <MessageCircle className="size-5" />
      </Button>
    );
  }


  return (
    <div className="fixed bottom-5 right-5 z-40 hidden sm:block">
      <div
        className={cn(
          "overflow-hidden rounded-[1.75rem] border border-border bg-card/96 shadow-[0_24px_70px_rgba(36,26,18,0.18)] backdrop-blur-xl transition-[width,height,opacity,transform] duration-300 ease-out motion-reduce:transition-none",
          open ? "h-[36rem] w-[25rem]" : "h-14 w-64",
        )}
      >
        <div className="flex h-14 items-center gap-3 border-b border-border/70 px-3">
          <button
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
            onClick={open ? () => setOpen(false) : openDock}
            type="button"
          >
            <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <MessageCircle className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-foreground">Quick Chat</span>
              <span className="block truncate text-xs text-muted-foreground">Instagram-style dock</span>
            </span>
          </button>
          <Button aria-label="Buka halaman chat" asChild size="icon-xs" variant="ghost">
            <Link href="/dashboard/chat">
              <MessageCircle className="size-3.5" />
            </Link>
          </Button>
          <Button aria-label="Minimize quick chat" onClick={() => setOpen(false)} size="icon-xs" type="button" variant="ghost">
            <Minus className="size-3.5" />
          </Button>
          <Button aria-label="Hide quick chat" onClick={() => setHidden(true)} size="icon-xs" type="button" variant="ghost">
            <X className="size-3.5" />
          </Button>
        </div>
        {open && (
          <div className="p-3">
            {data ? (
              <ChatWorkspace compact initialData={data} />
            ) : (
              <div className="grid h-[31rem] place-items-center rounded-[1.5rem] border border-dashed border-border text-sm text-muted-foreground">
                {isPending ? "Memuat percakapan..." : "Buka quick chat"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
