"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Search,
} from "lucide-react";
import { useDebounceValue } from "usehooks-ts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getReadingEventsListPage } from "@/actions/reading-events";
import { EventListRow } from "@/features/reading-events/components/event-list-row";
import type { EventListPageData } from "@/features/reading-events/types";
import { cn } from "@/lib/utils";

/**
 * Jeda debounce untuk kolom pencarian (Requirement 3.5).
 *
 * Nilai 400 ms cukup untuk menahan keystroke beruntun tanpa membuat respons
 * terasa lambat. Semua server action terkait pencarian wajib menunggu
 * jeda ini terlebih dahulu (AGENTS.md "debounce typing").
 */
const SEARCH_DEBOUNCE_MS = 400;

type EventListClientProps = {
  /**
   * Data halaman pertama yang sudah di-fetch oleh Server Component induk.
   *
   * Dipakai sebagai initial render agar list langsung tampil di SSR tanpa
   * skeleton; refetch di sisi klien hanya terjadi saat filter berubah.
   */
  initialPageData: EventListPageData;
};

/**
 * Client island untuk Event_List_View.
 *
 * Tanggung jawab (Requirement 3.3, 3.4, 3.5, 3.7):
 * - Search input dengan debounce 400 ms via `useDebounceValue` (raw onChange
 *   hanya mengubah state lokal, tidak memanggil server action; sesuai
 *   AGENTS.md "no every-keystroke fetch").
 * - Toggle filter "Hanya yang masih bisa join" yang menyembunyikan event
 *   non-`SCHEDULED` di sisi server (Requirement 3.3).
 * - Pagination 20 entri per halaman lewat `getReadingEventsListPage`
 *   (Requirement 3.4); ukuran halaman datang dari respons server.
 * - `useTransition` agar UI tetap responsif saat refetch berjalan dan dapat
 *   menampilkan indikator pending (Requirement 3.7).
 * - Skeleton awal saat data belum diterima dan empty state saat tidak ada
 *   hasil yang cocok.
 *
 * Render pertama memakai `initialPageData` apa adanya; efek refetch
 * sengaja melewati render pertama lewat `isFirstRenderRef` agar tidak ada
 * permintaan ganda saat halaman dimuat.
 */
export function EventListClient({ initialPageData }: EventListClientProps) {
  const [pageData, setPageData] = useState<EventListPageData>(initialPageData);

  // `searchInput` adalah teks raw yang diketik user; `debouncedSearch` yang
  // dikirim ke server. Nilai keduanya dipisah agar tampilan input tetap
  // responsif tanpa memicu fetch tiap keystroke.
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch] = useDebounceValue(searchInput, SEARCH_DEBOUNCE_MS);

  const [onlyJoinable, setOnlyJoinable] = useState(false);
  const [page, setPage] = useState(1);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Lewati efek pada render pertama agar `initialPageData` dari server tidak
   * langsung di-overwrite oleh fetch klien dengan parameter default yang
   * sama. Tanpa flag ini, halaman akan refetch setiap mount.
   */
  const isFirstRenderRef = useRef(true);

  /**
   * Reset page ke 1 saat filter (search query atau toggle) berubah, supaya
   * pengguna tidak mendarat di halaman 5 dengan keyword berbeda.
   *
   * Efek ini hanya tergantung pada `debouncedSearch` dan `onlyJoinable`
   * (bukan `page`) sehingga klik prev/next tidak memicunya.
   */
  useEffect(() => {
    if (isFirstRenderRef.current) return;
    setPage(1);
  }, [debouncedSearch, onlyJoinable]);

  /**
   * Refetch saat filter atau page berubah. `startTransition` membuat
   * pembaruan state non-blocking sehingga `isPending` bisa dipakai untuk
   * indikator loading tanpa membuat input "terkunci" (Requirement 3.7).
   */
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    const trimmedQuery = debouncedSearch.trim();

    startTransition(async () => {
      try {
        const next = await getReadingEventsListPage({
          page,
          q: trimmedQuery.length > 0 ? trimmedQuery : undefined,
          onlyJoinable,
        });
        setPageData(next);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal memuat agenda baca. Coba lagi.",
        );
      }
    });
  }, [debouncedSearch, onlyJoinable, page]);

  const totalPages = Math.max(
    1,
    Math.ceil(pageData.totalCount / pageData.pageSize),
  );
  const hasResults = pageData.events.length > 0;
  const showInitialSkeleton = isPending && !hasResults;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: search + filter toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative flex w-full items-center gap-2 sm:max-w-sm">
          <Search
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder="Cari agenda baca…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            aria-label="Cari agenda baca"
            className="h-9"
          />
          {isPending && hasResults ? (
            <Loader2
              aria-hidden="true"
              className="size-4 shrink-0 animate-spin text-muted-foreground"
            />
          ) : null}
        </label>

        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={onlyJoinable}
          data-active={onlyJoinable ? "true" : undefined}
          onClick={() => setOnlyJoinable((value) => !value)}
          className={cn(
            "cursor-pointer",
            onlyJoinable && "border-primary text-primary hover:text-primary",
          )}
        >
          <Filter aria-hidden="true" className="size-3.5" />
          Hanya yang masih bisa join
        </Button>
      </div>

      <Separator />

      {/* Body: skeleton / empty / list */}
      {showInitialSkeleton ? (
        <ListSkeleton />
      ) : hasResults ? (
        <ul
          className={cn(
            "flex flex-col",
            isPending && "opacity-70 transition-opacity duration-150",
          )}
        >
          {pageData.events.map((event, index) => (
            <li key={event.id}>
              {index > 0 ? <Separator /> : null}
              <EventListRow event={event} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState onlyJoinable={onlyJoinable} hasQuery={searchInput.trim().length > 0} />
      )}

      {errorMessage ? (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}

      {/* Pagination */}
      {hasResults ? (
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            Halaman {pageData.page} dari {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={pageData.page <= 1 || isPending}
            >
              <ChevronLeft aria-hidden="true" className="size-3.5" />
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setPage((current) => current + 1)}
              disabled={!pageData.hasNext || isPending}
            >
              Berikutnya
              <ChevronRight aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Skeleton placeholder yang meniru tata letak `EventListRow`.
 *
 * Empat baris dipilih agar terasa "sudah ada konten" pada viewport desktop
 * tanpa terlalu panjang di mobile. Tinggi tiap baris menyesuaikan padding
 * `EventListRow` (`py-4`) supaya transisi ke konten asli tidak loncat.
 */
function ListSkeleton() {
  return (
    <ul aria-busy="true" aria-live="polite" className="flex flex-col">
      {Array.from({ length: 4 }).map((_, index) => (
        <li key={index}>
          {index > 0 ? <Separator /> : null}
          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3 rounded-sm" />
              <Skeleton className="h-3 w-1/2 rounded-sm" />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Skeleton className="h-3 w-20 rounded-sm" />
              <Skeleton className="h-5 w-16 rounded-sm" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

type EmptyStateProps = {
  onlyJoinable: boolean;
  hasQuery: boolean;
};

/**
 * Tampilan saat tidak ada hasil. Pesan disesuaikan dengan filter aktif agar
 * pengguna paham mengapa daftar kosong dan apa yang bisa diubah.
 */
function EmptyState({ onlyJoinable, hasQuery }: EmptyStateProps) {
  let message = "Belum ada agenda baca yang cocok.";
  if (hasQuery && onlyJoinable) {
    message =
      "Tidak ada agenda baca yang cocok dengan kata kunci dan masih bisa diikuti.";
  } else if (hasQuery) {
    message = "Tidak ada agenda baca yang cocok dengan kata kunci.";
  } else if (onlyJoinable) {
    message = "Belum ada agenda baca yang masih bisa diikuti saat ini.";
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
