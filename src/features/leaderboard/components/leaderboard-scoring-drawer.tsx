"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { LEADERBOARD_SCORING_RULES } from "@/lib/leaderboard/scoring";
import type {
  LeaderboardScopeKey,
} from "@/features/leaderboard/types";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

const NUMBER_FORMATTER = new Intl.NumberFormat("id-ID");

const SCOPE_BADGE: Record<
  Exclude<LeaderboardScopeKey, "overall">,
  string
> = {
  circles: "Circle",
  events: "Agenda",
  reviews: "Review",
  social: "Sosial",
};

/**
 * Drawer (`Drawer` shadcn) untuk menjelaskan cara perhitungan poin.
 *
 * Aturan scoring diambil dari shared constant statis agar selalu tersedia
 * instan di client dan tidak bergantung pada fetch tambahan saat drawer
 * dibuka.
 */
export function LeaderboardScoringDrawer() {
  const [open, setOpen] = useState(false);
  const rules = LEADERBOARD_SCORING_RULES;

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <Info aria-hidden="true" className="size-3.5" />
          Cara perhitungan
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-full sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Cara perhitungan poin</DrawerTitle>
          <DrawerDescription>
            Aktivitas berikut menambah poin leaderboard. Edit dan hapus tidak
            menambah atau mengurangi poin.
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="min-h-0 flex-1 pb-8">
          <div className="mt-4 space-y-3 pr-3">
            <ul className="overflow-hidden ">
              {rules.map((rule, index) => (
                <li key={rule.type}>
                  {index > 0 ? <Separator /> : null}
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="line-clamp-1 text-sm font-medium text-foreground">
                        {rule.label}
                      </p>
                      {rule.notes ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {rule.notes}
                        </p>
                      ) : null}
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
                        )}
                      >
                        {SCOPE_BADGE[rule.scope]}
                      </span>
                    </div>
                    <span className="font-heading text-base font-semibold tabular-nums text-foreground">
                      +{NUMBER_FORMATTER.format(rule.points)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
