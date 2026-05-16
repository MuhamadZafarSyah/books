"use client";

import { useState } from "react";
import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { BookAiChatSidebar } from "@/features/book-ai-chat/components/book-ai-chat-sidebar";
import type { BookAiConversationSummary } from "@/features/book-ai-chat/types";

type BookAiChatHistoryDrawerProps = {
  history: BookAiConversationSummary[];
  activeConversationId: string | null;
};

/**
 * Mobile-only trigger that opens the AI chat history sidebar in a left
 * drawer. Hidden at md+ widths where the persistent sidebar is rendered
 * directly.
 */
export function BookAiChatHistoryDrawer({
  history,
  activeConversationId,
}: BookAiChatHistoryDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="left">
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        className="cursor-pointer rounded-full md:hidden"
        aria-label={`Buka history diskusi (${history.length})`}
        onClick={() => setOpen(true)}
      >
        <History className="size-4" />
      </Button>
      <DrawerContent className="bg-background">
        <DrawerHeader className="sr-only">
          <DrawerTitle>History diskusi AI</DrawerTitle>
          <DrawerDescription>
            Daftar room diskusi AI buku yang sudah Anda buat.
          </DrawerDescription>
        </DrawerHeader>
        <div className="h-full min-h-0">
          <BookAiChatSidebar
            history={history}
            activeConversationId={activeConversationId}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
