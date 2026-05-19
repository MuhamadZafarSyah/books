import { Fragment } from "react";
import Link from "next/link";
import { CalendarHeart, MapPin } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { SectionHeading } from "@/features/dashboard/components/overview/section-heading";
import { formatDateTime } from "@/features/dashboard/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardEventCard } from "@/lib/dashboard/overview-types";

type UpcomingEventsListProps = {
  events: DashboardEventCard[];
  emptyHint?: string;
};

const STATUS_LABEL: Record<DashboardEventCard["status"], string> = {
  SCHEDULED: "Terjadwal",
  FULL: "Penuh",
  ONGOING: "Berlangsung",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const STATUS_TONE: Record<DashboardEventCard["status"], string> = {
  SCHEDULED: "bg-primary/10 text-primary",
  FULL: "bg-accent text-accent-foreground",
  ONGOING: "bg-primary text-primary-foreground",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-destructive/10 text-destructive",
};

/**
 * List agenda baca mendatang yang diikuti atau di-host viewer.
 */
export function UpcomingEventsList({
  events,
  emptyHint = "Belum ada agenda mendatang. Buat satu di halaman Agenda Baca.",
}: UpcomingEventsListProps) {
  return (
    <section aria-labelledby="dashboard-upcoming-events">
      <SectionHeading
        title="Agenda mendatang"
        description="Pertemuan baca yang sudah kamu ikuti atau host."
        href="/dashboard/events"
      />

      {events.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-2xl border border-border/60">
          {events.map((event, index) => (
            <Fragment key={event.id}>
              {index > 0 ? <Separator /> : null}
              <li>
                <Link
                  href={`/dashboard/events/${event.id}`}
                  className="flex items-start gap-3 px-3 py-3 transition-colors duration-200 hover:bg-muted/40 sm:gap-4 sm:px-4"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CalendarHeart aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="line-clamp-1 text-sm font-medium text-foreground">
                      {event.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="tabular-nums">
                        {formatDateTime(event.startsAt)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPin
                          aria-hidden="true"
                          className="size-3 shrink-0"
                        />
                        <span className="line-clamp-1">
                          {event.locationAddress}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                        STATUS_TONE[event.status],
                      )}
                    >
                      {STATUS_LABEL[event.status]}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {event.participantCount}/{event.quota}
                    </span>
                  </div>
                </Link>
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </section>
  );
}
