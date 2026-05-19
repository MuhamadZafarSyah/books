import { Fragment } from "react";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { BookCover } from "@/features/dashboard/components/overview/book-cover";
import { SectionHeading } from "@/features/dashboard/components/overview/section-heading";
import { formatRelativeTime } from "@/features/dashboard/lib/format";
import type { DashboardCircleCard } from "@/lib/dashboard/overview-types";

type MyCirclesListProps = {
  circles: DashboardCircleCard[];
  emptyHint?: string;
};

/**
 * List Circle yang diikuti viewer.
 *
 * List flow dengan `Separator` (bukan Card) agar konsisten dengan rhythm
 * Agenda Baca. Cover buku ditampilkan kecil di kiri sebagai anchor visual.
 */
export function MyCirclesList({
  circles,
  emptyHint = "Belum bergabung di circle. Mulai diskusi dari halaman Jelajahi.",
}: MyCirclesListProps) {
  return (
    <section aria-labelledby="dashboard-my-circles">
      <SectionHeading
        title="Circle baca"
        description="Diskusi buku yang kamu ikuti."
        href="/dashboard/circles"
      />

      {circles.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-2xl border border-border/60">
          {circles.map((circle, index) => (
            <Fragment key={circle.id}>
              {index > 0 ? <Separator /> : null}
              <li>
                <Link
                  href={`/dashboard/circles/${circle.id}`}
                  className="flex items-center gap-3 px-3 py-3 transition-colors duration-200 hover:bg-muted/40 sm:gap-4 sm:px-4"
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted">
                    <BookCover
                      src={circle.bookCoverUrl}
                      alt={circle.bookTitle}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium text-foreground">
                      {circle.title}
                    </p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {circle.bookTitle} · {circle.bookAuthor}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right text-[11px] text-muted-foreground sm:block">
                    <p className="tabular-nums">
                      {circle.memberCount} anggota
                    </p>
                    {circle.lastActivityAt ? (
                      <p className="mt-0.5">
                        {formatRelativeTime(circle.lastActivityAt)}
                      </p>
                    ) : null}
                  </div>
                  {circle.isOwner ? (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                      Host
                    </span>
                  ) : null}
                </Link>
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </section>
  );
}
