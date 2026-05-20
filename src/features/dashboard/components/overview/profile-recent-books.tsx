import Link from "next/link";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BookCover } from "@/features/dashboard/components/overview/book-cover";
import { SectionHeading } from "@/features/dashboard/components/overview/section-heading";
import { cn } from "@/lib/utils";
import { USER_BOOK_STATUS_META } from "@/lib/user-books/status";
import type { DashboardBookCard } from "@/lib/dashboard/overview-types";

type ProfileRecentBooksProps = {
  books: DashboardBookCard[];
};

/**
 * Strip buku terbaru pada Profil — campuran `READING` dan `FINISHED`.
 *
 * Sengaja hanya menampilkan judul + status pendek (tanpa author) supaya
 * shelf preview terasa ringan dan bisa di-scan cepat.
 */
export function ProfileRecentBooks({ books }: ProfileRecentBooksProps) {
  return (
    <section aria-labelledby="profile-recent-books">
      <SectionHeading
        title="Rak baca"
        description="Buku terbaru yang kamu kerjakan."
        href="/dashboard/explore"
        hrefLabel="Cari buku"
      />

      {books.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          Rak masih kosong. Tambahkan buku pertama dari halaman Jelajahi.
        </p>
      ) : (
        <ScrollArea className="mt-3 w-full">
          <ul className="flex gap-3 pb-3">
            {books.map((book) => (
              <li key={book.id} className="w-[110px] shrink-0">
                <Link
                  href={`/dashboard/explore/books/${book.id}/reviews`}
                  className="group block space-y-1.5"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border/60 bg-muted">
                    <BookCover src={book.coverUrl} alt={book.title} />
                  </div>
                  <p
                    className={cn(
                      "line-clamp-2 text-xs font-medium leading-snug text-foreground transition-colors duration-200 group-hover:text-primary",
                    )}
                  >
                    {book.title}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {USER_BOOK_STATUS_META[book.status].shortLabel}
                  </p>
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
