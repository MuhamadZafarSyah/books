import Link from "next/link";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BookCover } from "@/features/dashboard/components/overview/book-cover";
import { SectionHeading } from "@/features/dashboard/components/overview/section-heading";
import { cn } from "@/lib/utils";
import type { DashboardBookCard } from "@/lib/dashboard/overview-types";

const STATUS_LABEL: Record<DashboardBookCard["status"], string> = {
  WANT_TO_READ: "Ingin baca",
  READING: "Sedang dibaca",
  FINISHED: "Selesai",
};

const STATUS_TONE: Record<DashboardBookCard["status"], string> = {
  WANT_TO_READ: "bg-muted text-muted-foreground",
  READING: "bg-primary/10 text-primary",
  FINISHED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

type ProfileShelfStripProps = {
  books: DashboardBookCard[];
  emptyHint?: string;
};

/**
 * Strip rak buku untuk halaman profil.
 *
 * Mirip `CurrentlyReadingStrip` tapi menampilkan campuran status (READING +
 * FINISHED) supaya pengunjung profil dapat melihat ritme baca terkini.
 * Status dimuat sebagai badge tipis di atas cover.
 */
export function ProfileShelfStrip({
  books,
  emptyHint = "Belum ada aktivitas baca yang dipublikasikan.",
}: ProfileShelfStripProps) {
  return (
    <section aria-labelledby="profile-shelf">
      <SectionHeading
        title="Rak buku"
        description="Buku terbaru yang sedang berjalan atau selesai dibaca."
      />

      {books.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ScrollArea className="mt-3 w-full">
          <ul className="flex gap-3 pb-3">
            {books.map((book) => (
              <li key={book.id} className="w-[140px] shrink-0 sm:w-[160px]">
                <Link
                  href={`/dashboard/explore/books/${book.id}/reviews`}
                  className="group block space-y-2"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border/60 bg-muted">
                    <BookCover src={book.coverUrl} alt={book.title} />
                    <span
                      className={cn(
                        "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                        STATUS_TONE[book.status],
                      )}
                    >
                      {STATUS_LABEL[book.status]}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="line-clamp-1 text-sm font-medium text-foreground transition-colors duration-200 group-hover:text-primary">
                      {book.title}
                    </p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {book.author}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </section>
  );
}
