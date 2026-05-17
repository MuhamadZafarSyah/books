"use client";

import Link from "next/link";
import { Clock, MapPin } from "lucide-react";

import { EventStatusBadge } from "@/features/reading-events/components/event-status-badge";
import type { ReadingEventSummary } from "@/features/reading-events/types";

/**
 * Formatter waktu mulai event dalam locale Bahasa Indonesia.
 *
 * Dibuat sekali di module-scope agar tidak rebuild setiap render baris.
 * Gaya `dateStyle: "medium"` + `timeStyle: "short"` menghasilkan format
 * ringkas seperti "12 Mar 2025, 19.30" yang pas untuk meta line di list row.
 */
const START_AT_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

type EventListRowProps = {
  event: ReadingEventSummary;
};

/**
 * Satu baris pada Event_List_View.
 *
 * Mengikuti AGENTS.md ("Do not overuse Card") — tidak memakai `Card`,
 * tetapi list row tipis. `Separator` antar baris dirender oleh parent
 * (`event-list-client.tsx`) supaya komponen ini tetap fokus pada konten
 * satu event saja.
 *
 * Seluruh baris dibungkus `<Link>` Next agar klik di mana pun mengarah
 * ke detail event, dengan hover halus (`bg-muted/40`) tanpa scale-transform
 * supaya tidak memicu layout shift (steering ui-ux-pro-max).
 */
export function EventListRow({ event }: EventListRowProps) {
  const hostLabel = `oleh ${event.hostName ?? "Pembaca"}`;
  const startsAtLabel = START_AT_FORMATTER.format(new Date(event.startsAt));

  return (
    <Link
      href={`/dashboard/events/${event.id}`}
      className="flex cursor-pointer flex-col gap-3 px-4 py-4 transition-colors duration-200 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="line-clamp-1 font-heading text-base font-medium text-foreground">
          {event.title}
        </h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="line-clamp-1">{hostLabel}</span>
          <span aria-hidden="true">•</span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="line-clamp-1">{event.locationAddress}</span>
          </span>
          <span aria-hidden="true">•</span>
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden="true" className="size-3.5 shrink-0" />
            <span>{startsAtLabel}</span>
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="text-xs tabular-nums text-muted-foreground">
          {event.participantCount}/{event.quota} peserta
        </span>
        <EventStatusBadge status={event.status} />
      </div>
    </Link>
  );
}
