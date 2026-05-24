import Link from "next/link";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BookCover } from "@/features/dashboard/components/overview/book-cover";
import { SectionHeading } from "@/features/dashboard/components/overview/section-heading";
import { cn } from "@/lib/utils";
import type { DashboardBookCard } from "@/lib/dashboard/overview-types";

type CurrentlyReadingStripProps = {
  books: DashboardBookCard[];
  emptyHint?: string;
};

/**
 * Strip horizontal "Lanjutkan baca".
 *
 * Mobile-first: scroll horizontal dengan `ScrollArea` shadcn supaya tidak
 * memaksa stack vertikal panjang di layar kecil. Tiap kartu kompak (cover
 * + judul + author), tanpa heavy shadow.
 */
export function CurrentlyReadingStrip({
  books,
  emptyHint = "Belum ada buku yang sedang dibaca. Mulai dari halaman jelajah.",
}: CurrentlyReadingStripProps) {
  return (
    <section aria-labelledby="dashboard-currently-reading">
      <SectionHeading
        title="Lanjutkan baca"
        description="Buku yang sedang berjalan di rakmu."
        href="/dashboard/explore"
        hrefLabel="Jelajahi"
      />

      {books.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ScrollArea className="mt-3 w-full">
          <ul className="flex gap-3 pb-3">
            {books.map((book) => (
              <li key={book.id} className="w-[160px] shrink-0 sm:w-[180px]">
                <Link
                  href={`/dashboard/explore/books/${book.id}/reviews`}
                  className="group block space-y-2"
                >
                  <div className="aspect-[2/3] overflow-hidden rounded-xl border border-border/60 bg-muted">
                    <BookCover src={book.coverUrl} alt={book.title} />
                  </div>
                  <div className="space-y-0.5">
                    <p
                      className={cn(
                        "line-clamp-1 text-sm font-medium text-foreground transition-colors duration-200 group-hover:text-primary",
                      )}
                    >
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
