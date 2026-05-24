"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookCover } from "@/features/dashboard/components/overview/book-cover";
import { SectionHeading } from "@/features/dashboard/components/overview/section-heading";
import { BookShelfStatusDialog } from "@/features/user-books/components/book-shelf-status-kanban";
import { cn } from "@/lib/utils";
import { USER_BOOK_STATUS_META } from "@/lib/user-books/status";
import type { UserBookStatus } from "@prisma/client";
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

type ShelfTab = "ALL" | UserBookStatus;

const TAB_ORDER: ShelfTab[] = [
  "ALL",
  "READING",
  "FINISHED",
  "TO_BE_READ",
  "WANT_TO_READ",
  "ON_HOLD",
  "ABANDONED",
];

const TAB_LABELS: Record<ShelfTab, string> = {
  ALL: "Semua",
  READING: USER_BOOK_STATUS_META.READING.shortLabel,
  FINISHED: USER_BOOK_STATUS_META.FINISHED.shortLabel,
  TO_BE_READ: USER_BOOK_STATUS_META.TO_BE_READ.shortLabel,
  WANT_TO_READ: USER_BOOK_STATUS_META.WANT_TO_READ.shortLabel,
  ON_HOLD: USER_BOOK_STATUS_META.ON_HOLD.shortLabel,
  ABANDONED: USER_BOOK_STATUS_META.ABANDONED.shortLabel,
};

const STATUS_BADGE_TONES: Record<UserBookStatus, string> = {
  WANT_TO_READ: "bg-teal-700",
  TO_BE_READ: "bg-amber-700",
  READING: "bg-sky-800",
  FINISHED: "bg-emerald-800",
  ON_HOLD: "bg-indigo-700",
  ABANDONED: "bg-rose-800",
};

/**
 * Strip rak buku untuk halaman profil dengan tab status.
 *
 * Menampilkan buku dikelompokkan berdasarkan status baca. Tab "Semua"
 * menampilkan campuran semua status, tab lain memfilter ke status
 * tertentu. Hanya tab yang memiliki buku yang ditampilkan.
 */
export function ProfileShelfStrip({
  books,
  emptyHint = "Belum ada aktivitas baca yang dipublikasikan.",
  editable = false,
}: ProfileShelfStripProps) {
  const [editingBook, setEditingBook] = useState<DashboardBookCard | null>(
    null,
  );

  // Hitung jumlah buku per status untuk menentukan tab mana yang ditampilkan
  const countByStatus = useMemo(() => {
    const counts = new Map<UserBookStatus, number>();
    for (const book of books) {
      counts.set(book.status, (counts.get(book.status) ?? 0) + 1);
    }
    return counts;
  }, [books]);

  // Hanya tampilkan tab yang memiliki buku (kecuali "Semua" selalu tampil
  // jika ada buku sama sekali)
  const visibleTabs = useMemo(() => {
    if (books.length === 0) return [];
    return TAB_ORDER.filter((tab) => {
      if (tab === "ALL") return true;
      return (countByStatus.get(tab) ?? 0) > 0;
    });
  }, [books.length, countByStatus]);

  if (books.length === 0) {
    return (
      <section aria-labelledby="profile-shelf">
        <SectionHeading
          title="Rak buku"
          description={
            editable
              ? "Atur status dan visibilitas tiap buku langsung dari sini."
              : "Koleksi buku berdasarkan status baca."
          }
        />
        <p className="mt-3 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="profile-shelf">
      <SectionHeading
        title="Rak buku"
        description={
          editable
            ? "Atur status dan visibilitas tiap buku langsung dari sini."
            : "Koleksi buku berdasarkan status baca."
        }
      />

      <Tabs defaultValue="ALL" className="mt-3">
        <ScrollArea className="w-full">
          <TabsList variant="line" className="w-full justify-start gap-0">
            {visibleTabs.map((tab) => {
              const count =
                tab === "ALL" ? books.length : (countByStatus.get(tab) ?? 0);
              return (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="cursor-pointer gap-1.5 px-3 py-2"
                >
                  {TAB_LABELS[tab]}
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {visibleTabs.map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-3">
            <ShelfGrid
              books={
                tab === "ALL" ? books : books.filter((b) => b.status === tab)
              }
              editable={editable}
              showStatusBadge={tab === "ALL"}
              onEdit={setEditingBook}
            />
          </TabsContent>
        ))}
      </Tabs>

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

function ShelfGrid({
  books,
  editable,
  showStatusBadge,
  onEdit,
}: {
  books: DashboardBookCard[];
  editable: boolean;
  showStatusBadge: boolean;
  onEdit: (book: DashboardBookCard) => void;
}) {
  if (books.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
        Tidak ada buku di kategori ini.
      </p>
    );
  }

  return (
    <ScrollArea className="w-full">
      <ul className="flex gap-3 pb-3">
        {books.map((book) => {
          const meta = USER_BOOK_STATUS_META[book.status];
          return (
            <li
              key={book.shelfRowId ?? book.id}
              className="w-[130px] shrink-0 sm:w-[148px]"
            >
              <div className="relative">
                <Link
                  href={`/dashboard/explore/books/${book.id}/reviews`}
                  className="group block space-y-2"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border/60 bg-muted">
                    <BookCover src={book.coverUrl} alt={book.title} />
                    {showStatusBadge ? (
                      <span
                        className={cn(
                          "absolute left-1.5 top-1.5 max-w-[calc(100%-3rem)] rounded-full border border-white/90 px-2 py-1 text-[10px] font-extrabold uppercase leading-none tracking-[0.08em] text-white shadow-[0_6px_18px_rgb(0_0_0/0.5)]",
                          STATUS_BADGE_TONES[book.status],
                        )}
                      >
                        {meta.shortLabel}
                      </span>
                    ) : null}
                    {typeof book.progress === "number" &&
                    book.progress > 0 &&
                    book.progress < 100 ? (
                      <span className="absolute inset-x-1.5 bottom-1.5 rounded-full bg-background/90 px-2 py-0.5 text-center text-[10px] font-semibold tabular-nums text-foreground backdrop-blur-sm">
                        {book.progress}%
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-0.5">
                    <p className="line-clamp-1 text-[13px] font-medium text-foreground transition-colors duration-200 group-hover:text-primary">
                      {book.title}
                    </p>
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">
                      {book.author}
                    </p>
                  </div>
                </Link>

                {editable ? (
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="secondary"
                    aria-label={`Atur status untuk ${book.title}`}
                    className="absolute right-1.5 top-1.5 cursor-pointer rounded-full shadow-sm"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onEdit(book);
                    }}
                  >
                    <Pencil aria-hidden="true" className="size-3" />
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
