"use client";

import { MessageCircle, MessageCircleOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useQuickChatVisibility } from "@/features/chat/components/quick-chat-visibility";
import { cn } from "@/lib/utils";

/**
 * Small icon button placed in the dashboard header that lets the user
 * hide/show the floating quick chat button.
 */
export function QuickChatToggleButton({ className }: { className?: string }) {
  const { visible, toggle } = useQuickChatVisibility();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-pressed={!visible}
      aria-label={
        visible ? "Sembunyikan tombol quick chat" : "Tampilkan tombol quick chat"
      }
      title={visible ? "Sembunyikan quick chat" : "Tampilkan quick chat"}
      className={cn("cursor-pointer", className)}
    >
      {visible ? (
        <MessageCircle />
      ) : (
        <MessageCircleOff />
      )}
    </Button>
  );
}
