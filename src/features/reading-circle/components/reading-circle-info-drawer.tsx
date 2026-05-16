"use client";

import { useState } from "react";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ReadingCircleMembersPanel } from "@/features/reading-circle/components/reading-circle-members-panel";
import type { ReadingCircleDetail } from "@/features/reading-circle/types";

type ReadingCircleInfoDrawerProps = {
  circle: ReadingCircleDetail;
};

/**
 * Right-side drawer showing the circle's member list, kept out of the main
 * feed so the discussion area stays focused.
 */
export function ReadingCircleInfoDrawer({
  circle,
}: ReadingCircleInfoDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="cursor-pointer rounded-full"
        onClick={() => setOpen(true)}
        aria-label="Lihat anggota circle"
      >
        <Users aria-hidden="true" className="size-3.5" />
        <span className="hidden sm:inline">Anggota</span>
        <span className="ml-1 inline-flex items-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
          {circle.memberCount.toLocaleString("id-ID")}
        </span>
      </Button>

      <DrawerContent className="bg-background">
        <DrawerHeader className="border-b border-border px-5 pb-4 pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
            Anggota circle
          </p>
          <DrawerTitle className="mt-1 text-base leading-tight tracking-normal normal-case">
            {circle.title}
          </DrawerTitle>
          <DrawerDescription className="text-xs">
            {circle.context.title} · oleh {circle.context.authorText}
          </DrawerDescription>
        </DrawerHeader>

        <div className="hide-scrollbar flex-1 overflow-y-auto px-5 py-5">
          <ReadingCircleMembersPanel members={circle.members} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
