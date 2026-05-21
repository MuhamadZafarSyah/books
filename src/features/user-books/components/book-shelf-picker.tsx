"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { UserBookStatus, UserBookVisibility } from "@prisma/client";

import {
  removeUserBook,
  updateUserBookStatus,
} from "@/actions/user-books";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  USER_BOOK_STATUS_META,
  USER_BOOK_STATUS_VALUES,
  USER_BOOK_VISIBILITY_META,
  USER_BOOK_VISIBILITY_VALUES,
} from "@/lib/user-books/status";

export type BookShelfPickerInitialState = {
  status: UserBookStatus;
  visibility: UserBookVisibility;
  isBorrowable?: boolean;
  progress?: number | null;
};

type BookShelfPickerProps = {
  bookId: string;
  /**
   * Snapshot rak saat ini. `null` berarti viewer belum punya entri
   * `UserBook` untuk buku ini — picker akan menampilkan default
   * `WANT_TO_READ` dan tombol "Tambahkan ke rak" sebagai CTA pertama.
   */
  initial: BookShelfPickerInitialState | null;
  className?: string;
  /**
   * Visualisasi compact (mis. dalam kartu di rak): trigger Select dibuat
   * lebih kecil, label "Status" disembunyikan.
   */
  compact?: boolean;
};

const DEFAULT_NEW_STATE: BookShelfPickerInitialState = {
  status: "WANT_TO_READ",
  visibility: "PRIVATE",
  isBorrowable: false,
  progress: null,
};

/**
 * Kontrol "Personalisasi rak" untuk satu buku.
 *
 * Komponen ini menampilkan:
 * - Pemilih status (`UserBookStatus`) lengkap dengan deskripsi singkat
 *   per opsi.
 * - Pemilih visibility (`UserBookVisibility`) yang menentukan siapa yang
 *   bisa melihat entri ini di profil.
 * - Tombol hapus dari rak ketika entri sudah ada.
 *
 * Saat picker pertama kali dipakai pada buku yang belum tersimpan di rak
 * (`initial === null`), label dan layout berubah jadi mode "tambahkan
 * ke rak". Setelah aksi sukses, `router.refresh()` mensinkronkan loader
 * server tanpa reload halaman penuh.
 */
export function BookShelfPicker({
  bookId,
  initial,
  className,
  compact = false,
}: BookShelfPickerProps) {
  const router = useRouter();
  const isOnShelf = initial !== null;
  const initialState = initial ?? DEFAULT_NEW_STATE;

  const [status, setStatus] = useState<UserBookStatus>(initialState.status);
  const [visibility, setVisibility] = useState<UserBookVisibility>(
    initialState.visibility,
  );
  const [savePending, startSaveTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();

  const persist = (next: {
    status?: UserBookStatus;
    visibility?: UserBookVisibility;
  }) => {
    const finalStatus = next.status ?? status;
    const finalVisibility = next.visibility ?? visibility;
    if (next.status) setStatus(next.status);
    if (next.visibility) setVisibility(next.visibility);

    startSaveTransition(async () => {
      try {
        await updateUserBookStatus({
          bookId,
          status: finalStatus,
          visibility: finalVisibility,
          isBorrowable: initialState.isBorrowable,
          progress: initialState.progress ?? undefined,
        });
        toast.success(
          isOnShelf
            ? "Status rak diperbarui."
            : `Buku ditambahkan ke rak: ${USER_BOOK_STATUS_META[finalStatus].label}.`,
        );
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal memperbarui rak.",
        );
        // Revert ke nilai sebelum klik bila gagal.
        if (next.status) setStatus(initialState.status);
        if (next.visibility) setVisibility(initialState.visibility);
      }
    });
  };

  const handleRemove = () => {
    startRemoveTransition(async () => {
      try {
        await removeUserBook(bookId);
        toast.success("Buku dihapus dari rak.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal menghapus dari rak.",
        );
      }
    });
  };

  const isBusy = savePending || removePending;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center",
        compact && "gap-2",
        className,
      )}
    >
      <Select
        value={status}
        disabled={isBusy}
        onValueChange={(value) => persist({ status: value as UserBookStatus })}
      >
        <SelectTrigger
          className={cn("w-full sm:w-56", compact && "h-9 text-xs")}
          aria-label={isOnShelf ? "Status rak" : "Tambahkan ke rak"}
        >
          {!isOnShelf ? (
            <span className="inline-flex items-center gap-2">
              <BookmarkPlus aria-hidden="true" className="size-3.5" />
              <SelectValue placeholder="Tambahkan ke rak" />
            </span>
          ) : (
            <SelectValue placeholder="Pilih status" />
          )}
        </SelectTrigger>
        <SelectContent>
          {USER_BOOK_STATUS_VALUES.map((value) => {
            const meta = USER_BOOK_STATUS_META[value];
            return (
              <SelectItem key={value} value={value}>
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {meta.label}
                  </span>
                  <span className="text-[11px] leading-snug text-muted-foreground">
                    {meta.description}
                  </span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Select
        value={visibility}
        disabled={isBusy || !isOnShelf}
        onValueChange={(value) =>
          persist({ visibility: value as UserBookVisibility })
        }
      >
        <SelectTrigger
          className={cn("w-full sm:w-40", compact && "h-9 text-xs")}
          aria-label="Visibilitas"
        >
          <SelectValue placeholder="Visibilitas" />
        </SelectTrigger>
        <SelectContent>
          {USER_BOOK_VISIBILITY_VALUES.map((value) => {
            const meta = USER_BOOK_VISIBILITY_META[value];
            return (
              <SelectItem key={value} value={value}>
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {meta.label}
                  </span>
                  <span className="text-[11px] leading-snug text-muted-foreground">
                    {meta.description}
                  </span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {isOnShelf ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={isBusy}
              onClick={handleRemove}
              className="cursor-pointer text-muted-foreground hover:text-destructive"
              aria-label="Hapus dari rak"
            >
              {removePending ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Trash2 aria-hidden="true" className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Hapus dari rak</TooltipContent>
        </Tooltip>
      ) : null}

      {savePending ? (
        <span
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <Loader2 aria-hidden="true" className="size-3 animate-spin" />
          Menyimpan
        </span>
      ) : null}
    </div>
  );
}
