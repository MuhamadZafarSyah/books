"use client";

import { useState, type ReactNode } from "react";
import { MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReadingCirclePostComposer } from "@/features/reading-circle/components/reading-circle-post-composer";
import type { ReadingCircleDetail } from "@/features/reading-circle/types";

type ReadingCirclePostDialogProps = {
  circleId: string;
  onPosted: (next: ReadingCircleDetail) => void;
  trigger?: ReactNode;
};

/**
 * Wraps the post composer in a focused dialog so the feed stays clean and
 * the form only appears when the user explicitly wants to start a new
 * discussion.
 */
export function ReadingCirclePostDialog({
  circleId,
  onPosted,
  trigger,
}: ReadingCirclePostDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="contents">
          {trigger}
        </span>
      ) : (
        <Button
          type="button"
          size="sm"
          className="cursor-pointer rounded-full"
          onClick={() => setOpen(true)}
        >
          <MessageSquarePlus aria-hidden="true" className="size-3.5" />
          Mulai diskusi
        </Button>
      )}
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Diskusi baru</DialogTitle>
          <DialogDescription>
            Bagikan pemikiran, pertanyaan, atau highlight Anda kepada anggota
            lain.
          </DialogDescription>
        </DialogHeader>
        <ReadingCirclePostComposer
          circleId={circleId}
          variant="dialog"
          onPosted={(next) => {
            onPosted(next);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
