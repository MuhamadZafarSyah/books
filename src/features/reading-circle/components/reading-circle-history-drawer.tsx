"use client";

import { useState } from "react";
import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ReadingCircleSidebar } from "@/features/reading-circle/components/reading-circle-sidebar";
import type { ReadingCircleSummary } from "@/features/reading-circle/types";

type ReadingCircleHistoryDrawerProps = {
  history: ReadingCircleSummary[];
  activeCircleId: string | null;
};

/** Mobile-only trigger that opens the circle history sidebar in a drawer. */
export function ReadingCircleHistoryDrawer({
  history,
  activeCircleId,
}: ReadingCircleHistoryDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="left">
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        className="cursor-pointer rounded-full md:hidden"
        aria-label={`Buka history circle (${history.length})`}
        onClick={() => setOpen(true)}
      >
        <History className="size-4" />
      </Button>
      <DrawerContent className="bg-background">
        <DrawerHeader className="sr-only">
          <DrawerTitle>History circle baca</DrawerTitle>
          <DrawerDescription>
            Daftar circle yang Anda ikuti.
          </DrawerDescription>
        </DrawerHeader>
        <div className="h-full min-h-0">
          <ReadingCircleSidebar
            history={history}
            activeCircleId={activeCircleId}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
