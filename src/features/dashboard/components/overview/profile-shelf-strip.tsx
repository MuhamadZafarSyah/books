"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BookCover } from "@/features/dashboard/components/overview/book-cover";
import { SectionHeading } from "@/features/dashboard/components/overview/section-heading";
import { BookShelfStatusDialog } from "@/features/user-books/components/book-shelf-status-dialog";
import { cn } from "@/lib/utils";
import { USER_BOOK_STATUS_META } from "@/lib/user-books/status";
import type { DashboardBookCard } from "@/lib/dashboard/overview-types";

type ProfileShelfStripProps = {
  books: DashboardBookCard[];
  emptyHint?: string;
  /**
   * Saat `true`, tiap kartu menampilkan tombol "Atur" yang membuka
   * `BookShelfStatusDialog` untuk mengubah status/visibility tanpa
   * harus pindah halaman. Set ke `true` di profil pribadi viewer dan
   * `false` saat melihat profil orang lain.
   */
  editable?: boolean;
};

/**
 * Strip rak buku untuk halaman profil.
 *
 * Menampilkan campuran status (READING + FINISHED + ON_HOLD + ABANDONED +
 * WANT_TO_READ + TO_BE_READ) supaya pengunjung profil dapat melihat
 * ritme baca terkini. Label dan tone mengikuti `USER_BOOK_STATUS_META`
 * agar konsisten dengan picker dan badge lain.
 *
 * Komponen ini sekarang `"use client"` karena tombol "Atur" di kartu
 * pemilik membutuhkan state lokal (`editingBookId`) untuk membuka
 * dialog rak. Penghuni server-side (cover, judul, link) tetap
 * dirender ringan tanpa hook tambahan.
 */
export function ProfileShelfStrip({
  books,
  emptyHint = "Belum ada aktivitas baca yang dipublikasikan.",
  editable = false,
}: ProfileShelfStripProps) {
  // Buku yang dialognya sedang terbuka. Disimpan di parent (bukan tiap
  // card) supaya hanya satu instance dialog yang ada di DOM, terlepas
  // dari berapa kartu di strip.
  const [editingBook, setEditingBook] = useState<DashboardBookCard | null>(
    null,
  );

  return (
    <section aria-labelledby="profile-shelf">
      <SectionHeading
        title="Rak buku"
        description={
          editable
            ? "Atur status dan visibilitas tiap buku langsung dari sini."
            : "Buku terbaru di rak — status dan privasi diatur pemilik profil."
        }
      />

      {books.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ScrollArea className="mt-3 w-full">
          <ul className="flex gap-3 pb-3">
            {books.map((book) => {
              const meta = USER_BOOK_STATUS_META[book.status];
              return (
                <li
                  key={book.shelfRowId ?? book.id}
                  className="w-[140px] shrink-0 sm:w-[160px]"
                >
                  <div className="relative">
                    <Link
                      href={`/dashboard/explore/books/${book.id}/reviews`}
                      className="group block space-y-2"
                    >
                      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border/60 bg-muted">
                        <BookCover src={book.coverUrl} alt={book.title} />
                        <span
                          className={cn(
                            "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                            meta.tone,
                          )}
                        >
                          {meta.shortLabel}
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

                    {editable ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="secondary"
                        aria-label={`Atur status untuk ${book.title}`}
                        className={cn(
                          "absolute right-2 top-2 cursor-pointer rounded-full opacity-90 shadow-sm",
                          "hover:opacity-100",
                        )}
                        onClick={(event) => {
                          // `<Link>` di belakang menangkap klik default;
                          // hentikan propagasi & navigasi.
                          event.preventDefault();
                          event.stopPropagation();
                          setEditingBook(book);
                        }}
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {editable && editingBook ? (
        <BookShelfStatusDialog
          source={{
            kind: "id",
            bookId: editingBook.id,
            bookTitle: editingBook.title,
          }}
          open={Boolean(editingBook)}
          onOpenChange={(next) => {
            if (!next) setEditingBook(null);
          }}
        />
      ) : null}
    </section>
  );
}
