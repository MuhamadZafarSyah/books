"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { UserBookStatus, UserBookVisibility } from "@prisma/client";

import { ensureLocalBookFromResult } from "@/actions/book-reviews";
import {
  getMyShelfState,
  removeUserBook,
  updateUserBookStatus,
} from "@/actions/user-books";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  USER_BOOK_STATUS_META,
  USER_BOOK_STATUS_VALUES,
  USER_BOOK_VISIBILITY_META,
  USER_BOOK_VISIBILITY_VALUES,
} from "@/lib/user-books/status";
import { cn } from "@/lib/utils";
import type { BookResult } from "@/features/books/types";

type BookSource =
  /**
   * Sumber buku berbasis `BookResult` (mis. dari hasil pencarian Open
   * Library). Saat dialog dibuka, kita panggil `ensureLocalBookFromResult`
   * supaya entri lokal tersedia sebelum picker dirender.
   */
  | { kind: "result"; book: BookResult }
  /**
   * Sumber buku berbasis ID lokal (mis. dari kartu di rak profil).
   * `bookTitle` dipakai untuk copy tampilan; tidak wajib akurat.
   */
  | { kind: "id"; bookId: string; bookTitle?: string };

export type BookShelfStatusDialogProps = {
  source: BookSource;
  /**
   * Trigger custom. Saat tidak diberikan, komponen tidak merender trigger
   * sendiri — parent boleh memakai mode controlled lewat `open` /
   * `onOpenChange` agar dialog bisa dibuka dari menu lain.
   */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Callback dipanggil setelah aksi mutasi sukses. Berguna untuk
   * sinkronisasi state lokal di parent (mis. menutup popover induk).
   */
  onSaved?: (state: ShelfState | null) => void;
};

type ShelfState = {
  bookId: string;
  status: UserBookStatus;
  visibility: UserBookVisibility;
  isBorrowable: boolean;
  progress: number | null;
};

const DEFAULT_STATE: Pick<
  ShelfState,
  "status" | "visibility" | "isBorrowable" | "progress"
> = {
  status: "WANT_TO_READ",
  visibility: "PRIVATE",
  isBorrowable: false,
  progress: null,
};

/**
 * Dialog "Atur rak" yang reusable di seluruh aplikasi.
 *
 * Karakteristik:
 * - **Lazy resolve**: ketika `source.kind === "result"`, Book lokal
 *   dipastikan ada lewat `ensureLocalBookFromResult` saat dialog dibuka
 *   pertama kali, jadi tidak ada round-trip extra saat halaman idle.
 * - **Lazy load shelf state**: snapshot rak baru di-fetch saat dialog
 *   benar-benar dibuka (panggil `getMyShelfState(bookId)`), sehingga UI
 *   pemicu (mis. popover) ringan.
 * - **Optimistic + rollback**: perubahan dropdown langsung di-persist
 *   tanpa tombol "Simpan" — pola yang sama dengan `book-shelf-picker.tsx`,
 *   sehingga interaksi terasa cepat. Bila gagal, nilai dropdown
 *   di-revert.
 * - **Reset state per buku**: ketika `source` ganti buku (mis. user
 *   buka dialog untuk buku lain), state direset.
 */
export function BookShelfStatusDialog({
  source,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSaved,
}: BookShelfStatusDialogProps) {
  const router = useRouter();
  const isControlled = typeof controlledOpen === "boolean";
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [shelf, setShelf] = useState<ShelfState | null>(null);
  const [savePending, startSave] = useTransition();
  const [removePending, startRemove] = useTransition();

  const sourceKey =
    source.kind === "id" ? `id:${source.bookId}` : `result:${source.book.id}`;

  // Reset cache state saat buku berubah (mis. pengguna pindah ke buku
  // lain tanpa unmount dialog). Defer ke microtask supaya patuh aturan
  // `react-hooks/set-state-in-effect` (React 19 strict).
  useEffect(() => {
    void Promise.resolve().then(() => {
      setShelf(null);
      setResolveError(null);
    });
  }, [sourceKey]);

  // Saat dialog terbuka pertama kali untuk source ini, resolve `bookId`
  // (jika perlu) dan ambil shelf state. Seluruh setState di-defer
  // ke microtask agar tidak melanggar aturan React 19 strict.
  useEffect(() => {
    if (!open) return;
    if (shelf !== null) return;

    let cancelled = false;

    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setResolving(true);
      setResolveError(null);

      try {
        const bookId =
          source.kind === "id"
            ? source.bookId
            : (await ensureLocalBookFromResult(source.book)).bookId;

        const state = await getMyShelfState(bookId);
        if (cancelled) return;

        setShelf(
          state
            ? {
                bookId,
                status: state.status,
                visibility: state.visibility,
                isBorrowable: state.isBorrowable,
                progress: state.progress,
              }
            : { bookId, ...DEFAULT_STATE },
        );
      } catch (error) {
        if (cancelled) return;
        setResolveError(
          error instanceof Error
            ? error.message
            : "Gagal memuat informasi rak.",
        );
      } finally {
        if (!cancelled) setResolving(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, shelf, sourceKey, source]);

  const persist = (next: Partial<Pick<ShelfState, "status" | "visibility">>) => {
    if (!shelf) return;
    const finalShelf: ShelfState = {
      ...shelf,
      ...next,
    };
    // Optimistic update lokal supaya dropdown langsung berpindah.
    setShelf(finalShelf);

    startSave(async () => {
      try {
        await updateUserBookStatus({
          bookId: finalShelf.bookId,
          status: finalShelf.status,
          visibility: finalShelf.visibility,
          isBorrowable: finalShelf.isBorrowable,
          progress: finalShelf.progress ?? undefined,
        });
        toast.success(
          `Status diperbarui ke "${USER_BOOK_STATUS_META[finalShelf.status].label}".`,
        );
        onSaved?.(finalShelf);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal memperbarui rak.",
        );
        // Rollback ke nilai sebelum klik (pakai `shelf` lama dari closure).
        setShelf(shelf);
      }
    });
  };

  const handleRemove = () => {
    if (!shelf) return;
    startRemove(async () => {
      try {
        await removeUserBook(shelf.bookId);
        toast.success("Buku dihapus dari rak.");
        // Setelah dihapus, ubah state lokal ke default sehingga dialog
        // tampak siap untuk "tambah ulang" tanpa menutup.
        setShelf({ bookId: shelf.bookId, ...DEFAULT_STATE });
        onSaved?.(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal menghapus dari rak.",
        );
      }
    });
  };

  const isBusy = savePending || removePending;
  const titleSubject =
    source.kind === "result"
      ? source.book.title
      : source.bookTitle?.trim() || "buku ini";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 normal-case tracking-normal">
            <BookmarkPlus aria-hidden="true" className="size-4 text-primary" />
            Atur rak
          </DialogTitle>
          <DialogDescription>
            Pilih status baca dan visibilitas untuk{" "}
            <span className="font-medium text-foreground">{titleSubject}</span>.
            Perubahan langsung tersimpan.
          </DialogDescription>
        </DialogHeader>

        {resolveError ? (
          <p role="alert" className="text-sm text-destructive">
            {resolveError}
          </p>
        ) : resolving || shelf === null ? (
          <ShelfStateSkeleton />
        ) : (
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Status
              </label>
              <Select
                value={shelf.status}
                disabled={isBusy}
                onValueChange={(value) =>
                  persist({ status: value as UserBookStatus })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
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
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Visibilitas
              </label>
              <Select
                value={shelf.visibility}
                disabled={isBusy}
                onValueChange={(value) =>
                  persist({ visibility: value as UserBookVisibility })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
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
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!shelf || isBusy}
            onClick={handleRemove}
            className={cn(
              "cursor-pointer text-muted-foreground hover:text-destructive sm:justify-self-start",
            )}
          >
            {removePending ? (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" className="size-3.5" />
            )}
            Hapus dari rak
          </Button>

          <div className="flex items-center gap-2">
            {savePending ? (
              <span
                aria-live="polite"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
              >
                <Loader2 aria-hidden="true" className="size-3 animate-spin" />
                Menyimpan
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setOpen(false)}
              className="cursor-pointer"
            >
              Tutup
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShelfStateSkeleton() {
  return (
    <div className="grid gap-3">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-12 rounded-sm" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-16 rounded-sm" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  );
}
