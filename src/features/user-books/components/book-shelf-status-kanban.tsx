"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Active,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { gsap } from "gsap";
import { BookOpen, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { UserBookStatus, UserBookVisibility } from "@prisma/client";

import { ensureLocalBookFromResult } from "@/actions/book-reviews";
import {
  getMyShelfBoard,
  getMyShelfState,
  removeUserBook,
  updateUserBookStatus,
} from "@/actions/user-books";
import type { MyShelfBoardItem } from "@/actions/user-books";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  isUserBookStatus,
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
   * Library). Saat sheet dibuka, kita panggil `ensureLocalBookFromResult`
   * supaya entri lokal tersedia sebelum kanban dirender.
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
   * sendiri - parent boleh memakai mode controlled lewat `open` /
   * `onOpenChange` agar sheet bisa dibuka dari menu lain.
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

type ShelfBoardItem = MyShelfBoardItem & {
  isTransient?: boolean;
};

type CurrentBookPreview = {
  bookId: string;
  title: string;
  author: string;
  coverUrl: string | null;
};

type CardGesture = {
  currentX: number;
  currentY: number;
  dragReady: boolean;
  moved: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  timer: ReturnType<typeof setTimeout> | null;
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

const BOOK_DRAG_PREFIX = "shelf-book:";
const STATUS_DROP_PREFIX = "shelf-status:";
const REMOVE_DROP_ID = "shelf-remove-zone";

const EMPTY_COLUMN_COPY: Record<UserBookStatus, string> = {
  WANT_TO_READ: "Kosong",
  TO_BE_READ: "Kosong",
  READING: "Kosong",
  FINISHED: "Kosong",
  ON_HOLD: "Kosong",
  ABANDONED: "Kosong",
};

const VISIBLE_STACK_SIZE = 5;
const SWIPE_THRESHOLD = 56;
const SWIPE_TRACK_LIMIT = 96;
const SWIPE_EXIT_DISTANCE = 120;
const DRAG_LONG_PRESS_MS = 600;
const DRAG_LONG_PRESS_TOLERANCE = 8;
const DRAG_SCROLL_EDGE_THRESHOLD = 64;
const DRAG_SCROLL_MAX_SPEED = 24;
const STACK_TRANSITION =
  "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), filter 200ms ease-out";

// Offset deck per slot. Dirancang lebih ringkas dibanding versi sebelumnya
// supaya tinggi kolom turun signifikan tanpa kehilangan kesan tumpukan.
const STACK_OFFSET_X = [0, 9, -9, 16, -16];
const STACK_OFFSET_Y = [0, 8, 16, 24, 32];
const STACK_SCALE = [1, 0.965, 0.935, 0.905, 0.875];
const STACK_ROTATE = [0, 2.5, -2.5, 4, -4];

/**
 * Sheet "Atur rak" yang reusable di seluruh aplikasi.
 *
 * Karakteristik:
 * - **Lazy resolve**: ketika `source.kind === "result"`, Book lokal
 *   dipastikan ada lewat `ensureLocalBookFromResult` saat sheet dibuka.
 * - **Mini kanban**: saat sheet terbuka, semua buku viewer dimuat dan
 *   dikelompokkan berdasarkan status baca.
 * - **Optimistic + rollback**: drag antar kolom langsung memindahkan cover
 *   secara lokal, lalu dipersist ke server. Bila gagal, board dikembalikan.
 */
export function BookShelfStatusDialog({
  source,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSaved,
}: BookShelfStatusDialogProps) {
  const router = useRouter();
  const boardScrollAreaRef = useRef<HTMLDivElement | null>(null);
  const dragScrollFrameRef = useRef<number | null>(null);
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

  const [loadedSourceKey, setLoadedSourceKey] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [shelf, setShelf] = useState<ShelfState | null>(null);
  const [board, setBoard] = useState<ShelfBoardItem[]>([]);
  const [deckOffsets, setDeckOffsets] = useState<
    Partial<Record<UserBookStatus, number>>
  >({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savePending, startSave] = useTransition();
  const [removePending, startRemove] = useTransition();

  const sourceKey =
    source.kind === "id" ? `id:${source.bookId}` : `result:${source.book.id}`;
  const isBusy = savePending || removePending;
  const activeItem = activeId
    ? board.find((item) => draggableIdFor(item.bookId) === activeId) ?? null
    : null;
  const columns = useMemo(
    () =>
      USER_BOOK_STATUS_VALUES.map((status) => {
        const books = board.filter((item) => item.status === status);
        return {
          status,
          books: rotateBooks(books, deckOffsets[status] ?? 0),
        };
      }),
    [board, deckOffsets],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: DRAG_LONG_PRESS_MS,
        tolerance: DRAG_LONG_PRESS_TOLERANCE,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const stopDragScroll = useCallback(() => {
    if (dragScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(dragScrollFrameRef.current);
      dragScrollFrameRef.current = null;
    }
  }, []);

  /**
   * Dijalankan tiap kali pointer drag bergerak. Mengukur posisi rect
   * elemen yang sedang di-drag (dari dnd-kit) terhadap viewport scroll
   * area. Scroll baru dipicu saat sisi kartu menyentuh ujung area scroll
   * (overshoot), bukan oleh delta pergerakan pointer. Pendekatan ini
   * membuat hit-box terasa pas dan secara alami mendukung perubahan arah:
   * saat user geser balik, sisi kartu yang menyentuh ujung berbeda akan
   * memberi kecepatan arah berlawanan.
   */
  const ensureDragScrollLoop = useCallback(
    (active: Active | null) => {
      if (!active) {
        stopDragScroll();
        return;
      }

      if (dragScrollFrameRef.current !== null) return;

      const step = () => {
        const viewport = getBoardScrollViewport(boardScrollAreaRef.current);
        if (!viewport) {
          dragScrollFrameRef.current = null;
          return;
        }

        const dragRect = active.rect.current.translated;
        const maxScroll = viewport.scrollWidth - viewport.clientWidth;

        if (!dragRect || maxScroll <= 0) {
          dragScrollFrameRef.current = window.requestAnimationFrame(step);
          return;
        }

        const viewportRect = viewport.getBoundingClientRect();
        const speed = overshootScrollSpeed({
          dragLeft: dragRect.left,
          dragRight: dragRect.left + dragRect.width,
          maxScroll,
          scrollLeft: viewport.scrollLeft,
          viewportLeft: viewportRect.left,
          viewportRight: viewportRect.right,
        });

        if (speed !== 0) {
          viewport.scrollLeft = clamp(
            viewport.scrollLeft + speed,
            0,
            maxScroll,
          );
        }

        dragScrollFrameRef.current = window.requestAnimationFrame(step);
      };

      dragScrollFrameRef.current = window.requestAnimationFrame(step);
    },
    [stopDragScroll],
  );

  useEffect(() => () => stopDragScroll(), [stopDragScroll]);

  // Reset cache state saat buku berubah. Defer ke microtask supaya patuh
  // aturan `react-hooks/set-state-in-effect` (React 19 strict).
  useEffect(() => {
    void Promise.resolve().then(() => {
      setShelf(null);
      setBoard([]);
      setDeckOffsets({});
      setActiveId(null);
      setResolveError(null);
      setLoadedSourceKey(null);
    });
  }, [sourceKey]);

  // Saat sheet terbuka pertama kali untuk source ini, resolve `bookId`
  // (jika perlu), ambil shelf state buku aktif, lalu muat mini-board.
  useEffect(() => {
    if (!open) return;
    if (loadedSourceKey === sourceKey) return;

    let cancelled = false;

    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setResolving(true);
      setResolveError(null);

      try {
        const current = await resolveCurrentBook(source);
        const [state, boardItems] = await Promise.all([
          getMyShelfState(current.bookId),
          getMyShelfBoard(),
        ]);
        if (cancelled) return;

        const currentShelf: ShelfState = state
          ? {
            bookId: current.bookId,
            status: state.status,
            visibility: state.visibility,
            isBorrowable: state.isBorrowable,
            progress: state.progress,
          }
          : { bookId: current.bookId, ...DEFAULT_STATE };

        setShelf(currentShelf);
        setBoard(mergeBoardWithCurrent(boardItems, currentShelf, current));
        setLoadedSourceKey(sourceKey);
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
  }, [loadedSourceKey, open, source, sourceKey]);

  const persistStatus = (item: ShelfBoardItem, nextStatus: UserBookStatus) => {
    if (isBusy) return;
    if (item.status === nextStatus && !item.isTransient) return;

    const previousBoard = board;
    const previousShelf = shelf;
    const nextItem = itemWithStatus(item, nextStatus);
    const nextShelf =
      shelf?.bookId === item.bookId
        ? shelfWithStatus(shelf, nextStatus)
        : null;

    setBoard((current) => [
      nextItem,
      ...current.filter((book) => book.bookId !== item.bookId),
    ]);
    if (nextShelf) setShelf(nextShelf);

    startSave(async () => {
      try {
        await updateUserBookStatus({
          bookId: nextItem.bookId,
          status: nextItem.status,
          visibility: nextItem.visibility,
          isBorrowable: nextItem.isBorrowable,
          progress: nextItem.progress ?? undefined,
        });
        toast.success(
          `Dipindahkan ke "${USER_BOOK_STATUS_META[nextItem.status].label}".`,
        );
        if (nextShelf) onSaved?.(nextShelf);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal memperbarui rak.",
        );
        setBoard(previousBoard);
        setShelf(previousShelf);
      }
    });
  };

  const persistVisibility = (nextVisibility: UserBookVisibility) => {
    if (!shelf || isBusy) return;

    const previousBoard = board;
    const previousShelf = shelf;
    const nextShelf: ShelfState = {
      ...shelf,
      visibility: nextVisibility,
    };

    setShelf(nextShelf);
    setBoard((current) =>
      current.map((item) =>
        item.bookId === nextShelf.bookId
          ? { ...item, visibility: nextVisibility, isTransient: false }
          : item,
      ),
    );

    startSave(async () => {
      try {
        await updateUserBookStatus({
          bookId: nextShelf.bookId,
          status: nextShelf.status,
          visibility: nextShelf.visibility,
          isBorrowable: nextShelf.isBorrowable,
          progress: nextShelf.progress ?? undefined,
        });
        toast.success("Visibilitas rak diperbarui.");
        onSaved?.(nextShelf);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal memperbarui rak.",
        );
        setBoard(previousBoard);
        setShelf(previousShelf);
      }
    });
  };

  const removeTransientItem = (item: ShelfBoardItem) => {
    const removesActiveBook = shelf?.bookId === item.bookId;

    setBoard((current) =>
      current.filter((book) => book.bookId !== item.bookId),
    );
    if (removesActiveBook) {
      setShelf(null);
      onSaved?.(null);
    }
    toast.success("Buku dikeluarkan dari tampilan rak.");
  };

  const persistRemoveItem = (item: ShelfBoardItem) => {
    if (isBusy) return;

    if (item.isTransient) {
      removeTransientItem(item);
      return;
    }

    const previousBoard = board;
    const previousShelf = shelf;
    const removesActiveBook = shelf?.bookId === item.bookId;

    setBoard((current) =>
      current.filter((book) => book.bookId !== item.bookId),
    );
    if (removesActiveBook) setShelf(null);

    startRemove(async () => {
      try {
        await removeUserBook(item.bookId);
        toast.success(`"${item.title}" dihapus dari rak.`);
        if (removesActiveBook) onSaved?.(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal menghapus dari rak.",
        );
        setBoard(previousBoard);
        setShelf(previousShelf);
      }
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (typeof event.active.id === "string") setActiveId(event.active.id);
    ensureDragScrollLoop(event.active);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    ensureDragScrollLoop(event.active);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    stopDragScroll();
    setActiveId(null);

    const draggedBookId = bookIdFromDraggableId(event.active.id);
    if (!draggedBookId) return;

    const item = board.find((book) => book.bookId === draggedBookId);
    if (!item) return;

    if (event.over?.id === REMOVE_DROP_ID) {
      persistRemoveItem(item);
      return;
    }

    const nextStatus = statusFromDroppableId(event.over?.id);
    if (!nextStatus) return;

    if (nextStatus !== item.status) {
      persistStatus(item, nextStatus);
      return;
    }

    if (item.isTransient) {
      persistStatus(item, nextStatus);
    }
  };

  const handleDragCancel = () => {
    stopDragScroll();
    setActiveId(null);
  };

  const rotateDeck = (status: UserBookStatus) => {
    setDeckOffsets((current) => ({
      ...current,
      [status]: (current[status] ?? 0) + 1,
    }));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[94dvh] w-full border-border/70 bg-background p-0"
      >
        <TooltipProvider>
          <div className="mx-auto flex h-[min(84dvh,820px)] w-full max-w-[1200px] flex-col gap-3 px-4 pb-4 pt-5 sm:px-6 lg:px-8">
            <SheetHeader className="px-0 py-0 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <SheetTitle className="font-heading text-xl normal-case tracking-normal text-foreground sm:text-[1.6rem]">
                    Rak baca
                  </SheetTitle>
                  <SheetDescription className="text-[13px] leading-snug">
                    Tumpukan buku pribadi berdasarkan status baca.
                  </SheetDescription>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {/* <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={
                          !shelf ||
                          !currentItem ||
                          currentItem.isTransient ||
                          isBusy
                        }
                        onClick={handleRemove}
                        className="size-8 cursor-pointer rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                        aria-label="Hapus buku aktif dari rak"
                      >
                        {removePending ? (
                          <Loader2
                            aria-hidden="true"
                            className="size-4 animate-spin"
                          />
                        ) : (
                          <Trash2 aria-hidden="true" className="size-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Hapus buku aktif dari rak</TooltipContent>
                  </Tooltip> */}

                  <SheetClose asChild>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="size-8 cursor-pointer rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Tutup rak baca"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </Button>
                  </SheetClose>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-[11px] uppercase tracking-wide">
                  Visibilitas
                </span>
                <Select
                  value={shelf?.visibility ?? DEFAULT_STATE.visibility}
                  disabled={!shelf || isBusy}
                  onValueChange={(value) =>
                    persistVisibility(value as UserBookVisibility)
                  }
                >
                  <SelectTrigger
                    aria-label="Visibilitas"
                    className="h-8 w-auto min-w-[7.5rem] gap-1.5 rounded-full border-border/60 bg-card px-3 text-xs font-medium text-foreground shadow-none data-[size=default]:h-8"
                  >
                    <SelectValue placeholder="Visibilitas" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {USER_BOOK_VISIBILITY_VALUES.map((value) => {
                      const meta = USER_BOOK_VISIBILITY_META[value];
                      return (
                        <SelectItem
                          key={value}
                          value={value}
                          textValue={meta.label}
                          aria-description={meta.description}
                        >
                          {meta.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </SheetHeader>

            {resolveError ? (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {resolveError}
              </p>
            ) : resolving || loadedSourceKey !== sourceKey ? (
              <ShelfBoardSkeleton />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                autoScroll={false}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <div className="relative flex min-h-0 flex-1 flex-col">
                  <div
                    ref={boardScrollAreaRef}
                    className="min-h-[19rem] flex-1 overflow-hidden rounded-3xl border border-border/40 bg-card/20"
                  >
                    <ScrollArea className="h-full overscroll-contain">
                      <div className="flex min-w-max items-start gap-1 px-1 pb-9 pt-2">
                        {columns.map((column, index) => (
                          <ShelfStatusColumn
                            key={column.status}
                            status={column.status}
                            books={column.books}
                            disabled={isBusy}
                            isDragging={Boolean(activeItem)}
                            activeBookId={shelf?.bookId ?? null}
                            showLeftDivider={index > 0}
                            onRotateDeck={rotateDeck}
                          />
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </div>

                  <ShelfRemoveDropZone
                    activeItem={activeItem}
                    disabled={isBusy}
                  />
                </div>

                <DragOverlay adjustScale={false}>
                  {activeItem ? <BookTilePreview item={activeItem} /> : null}
                </DragOverlay>
              </DndContext>
            )}

            <div className="flex min-h-5 items-center justify-end">
              {savePending ? (
                <span
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Loader2 aria-hidden="true" className="size-3 animate-spin" />
                  Menyimpan
                </span>
              ) : null}
            </div>
          </div>
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  );
}

function ShelfRemoveDropZone({
  activeItem,
  disabled,
}: {
  activeItem: ShelfBoardItem | null;
  disabled: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: REMOVE_DROP_ID,
    data: { action: "remove" },
    disabled: disabled || !activeItem,
  });

  return (
    <div
      ref={setNodeRef}
      aria-hidden={!activeItem}
      className={cn(
        "absolute bottom-4 left-1/2 z-30 flex min-h-16 w-[min(92%,34rem)] -translate-x-1/2 items-center justify-center rounded-2xl border border-dashed px-4 py-3 text-center text-sm shadow-lg backdrop-blur-md transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-200",
        activeItem
          ? "pointer-events-auto border-destructive/35 bg-background/90 text-destructive opacity-100"
          : "pointer-events-none translate-y-4 border-transparent opacity-0",
        isOver &&
        "-translate-x-1/2 scale-[1.03] border-destructive bg-destructive/15 shadow-[0_0_0_1px_color-mix(in_srgb,var(--destructive)_35%,transparent),0_20px_48px_rgba(127,29,29,0.22)]",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-destructive/10">
          <Trash2 aria-hidden="true" className="size-4" />
        </span>
        <div className="text-left leading-tight">
          <p className="font-medium">
            {isOver ? "Lepaskan untuk hapus dari rak" : "Tarik ke sini untuk hapus"}
          </p>
          <p className="text-xs text-destructive/75">
            {activeItem?.isTransient
              ? "Buku ini belum tersimpan, jadi hanya dikeluarkan dari tampilan."
              : "Buku akan dihapus dari rak pribadi Anda."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ShelfStatusColumn({
  status,
  books,
  disabled,
  isDragging,
  activeBookId,
  showLeftDivider,
  onRotateDeck,
}: {
  status: UserBookStatus;
  books: ShelfBoardItem[];
  disabled: boolean;
  isDragging: boolean;
  activeBookId: string | null;
  showLeftDivider: boolean;
  onRotateDeck: (status: UserBookStatus) => void;
}) {
  const meta = USER_BOOK_STATUS_META[status];
  const { isOver, setNodeRef } = useDroppable({
    id: droppableIdFor(status),
    data: { status },
    disabled,
  });
  const visibleBooks = books.slice(0, VISIBLE_STACK_SIZE);

  return (
    <section
      ref={setNodeRef}
      aria-label={meta.label}
      className={cn(
        "flex w-32 shrink-0 flex-col rounded-2xl border border-transparent px-2 py-1.5 transition-[background-color,border-color,box-shadow,transform] duration-200 sm:w-36 sm:px-2.5 lg:w-40",
        showLeftDivider && "border-l border-border/40",
        isDragging && !disabled && "bg-muted/35",
        isOver &&
        "scale-[1.015] border-primary/50 bg-primary/10 shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_24%,transparent)]",
      )}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="truncate text-[13px] font-medium text-foreground">
          {meta.shortLabel}
        </h3>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {books.length}
        </span>
      </div>

      {books.length === 0 ? (
        <div
          className={cn(
            "flex h-48 items-center justify-center rounded-xl border border-dashed border-border/50 text-xs text-muted-foreground transition-colors duration-200 sm:h-52",
            isOver && "border-primary/50 bg-background/60 text-foreground",
          )}
        >
          {EMPTY_COLUMN_COPY[status]}
        </div>
      ) : (
        <div className="relative mx-auto h-48 w-full sm:h-52">
          {visibleBooks
            .map((book, slotIndex) => (
              <ShelfBookSlot
                key={book.bookId}
                item={book}
                slotIndex={slotIndex}
                stackTotal={visibleBooks.length}
                isTop={slotIndex === 0}
                disabled={disabled}
                isActiveBook={book.bookId === activeBookId}
                onSwipe={() => onRotateDeck(status)}
              />
            ))
            // Render belakang dulu supaya kartu paling depan punya z-index DOM
            // tertinggi (selain z-index inline) dan menerima event pointer.
            .reverse()}
        </div>
      )}
    </section>
  );
}

/**
 * Slot kartu di dalam stack. Komponen ini selalu sama untuk semua posisi
 * (slot 0..N-1) supaya React tidak perlu unmount/mount ketika user me-rotate
 * deck - itulah yang dulu menyebabkan transisi swipe terlihat glitch.
 *
 * - `isTop` mengontrol apakah slot mengaktifkan gesture swipe + kanban drag.
 * - Wrapper memakai CSS transition pada `transform` sehingga perpindahan
 *   antar slot terlihat seperti deck native saat `slotIndex` berubah.
 */
function ShelfBookSlot({
  item,
  slotIndex,
  stackTotal,
  isTop,
  disabled,
  isActiveBook,
  onSwipe,
}: {
  item: ShelfBoardItem;
  slotIndex: number;
  stackTotal: number;
  isTop: boolean;
  disabled: boolean;
  isActiveBook: boolean;
  onSwipe: () => void;
}) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: draggableIdFor(item.bookId),
    data: { item },
    disabled: disabled || !isTop,
  });
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const gestureRef = useRef<CardGesture | null>(null);
  const swipeAnimRef = useRef<gsap.core.Tween | gsap.core.Timeline | null>(
    null,
  );
  const [dragReady, setDragReady] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const wrapperStyle: CSSProperties = {
    zIndex: stackTotal - slotIndex,
    transform: stackTransform(slotIndex),
    transition: STACK_TRANSITION,
  };

  const dragPointerDown = listeners?.onPointerDown as
    | ((event: ReactPointerEvent<HTMLButtonElement>) => void)
    | undefined;
  const restListeners = isTop
    ? { ...listeners, onPointerDown: undefined }
    : undefined;

  // Inisialisasi posisi default sekali saat slot dibuat dan bersihkan
  // animasi yang masih berjalan saat slot benar-benar di-unmount. Sengaja
  // tidak bergantung pada `isTop` / `item.bookId` supaya cleanup tidak
  // mematikan timeline swipe yang sedang berjalan ketika React me-rotate
  // deck di tengah animasi - itulah yang menyebabkan kartu "menghilang"
  // alih-alih meluncur ke belakang.
  useEffect(() => {
    const card = cardRef.current;
    if (card) {
      gsap.set(card, { force3D: true });
    }
    return () => {
      if (gestureRef.current?.timer) clearTimeout(gestureRef.current.timer);
      gestureRef.current = null;
      swipeAnimRef.current?.kill();
      if (card) gsap.killTweensOf(card);
    };
  }, []);

  const releaseCapture = (event: ReactPointerEvent<HTMLButtonElement>) => {
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Capture mungkin sudah dilepas otomatis (mis. pointerup native).
    }
  };

  /**
   * Animasi swipe ke belakang stack. Strategi:
   * 1. Lempar kartu sedikit keluar (arc) tanpa hilang opacity-nya, supaya
   *    user melihat kartu benar-benar berpindah - bukan hilang.
   * 2. Sembunyikan singkat sambil rotate deck. Wrapper sudah ditata
   *    `transition-transform` jadi posisi otomatis menggeser.
   * 3. Bawa kartu kembali ke transform identitas; sekarang transform
   *    tersebut diaplikasikan oleh wrapper di slot baru (paling belakang).
   *
   * Arah swipe (kiri/kanan) hanya mempengaruhi visual exit - hasil akhirnya
   * sama: kartu paling depan pindah ke belakang stack.
   */
  const finishSwipe = (direction: SwipeDirection) => {
    const card = cardRef.current;
    setDragReady(false);
    if (!card) {
      onSwipe();
      return;
    }

    swipeAnimRef.current?.kill();
    const exitX =
      direction === "left" ? -SWIPE_EXIT_DISTANCE : SWIPE_EXIT_DISTANCE;
    const exitRotate = direction === "left" ? -10 : 10;

    const tl = gsap.timeline();
    tl.to(card, {
      duration: 0.22,
      ease: "power2.in",
      overwrite: "auto",
      rotate: exitRotate,
      scale: 0.92,
      x: exitX,
      y: -6,
    });
    // Sembunyikan sebentar saat wrapper berpindah ke slot belakang. Tanpa
    // jeda ini, perpindahan terasa "teleport". Dengan opacity 0 singkat,
    // mata user fokus pada kartu yang naik dari belakang.
    tl.to(card, {
      duration: 0.1,
      ease: "power1.in",
      opacity: 0,
      overwrite: "auto",
    });
    tl.add(() => onSwipe());
    tl.set(card, { rotate: 0, scale: 1, x: 0, y: 0 });
    // Fade in kembali setelah CSS transition wrapper selesai meluncurkan
    // kartu ke posisi belakang.
    tl.to(card, {
      delay: 0.16,
      duration: 0.24,
      ease: "power2.out",
      opacity: 1,
      overwrite: "auto",
    });

    swipeAnimRef.current = tl;
  };

  const snapBack = () => {
    const card = cardRef.current;
    setDragReady(false);
    if (!card) return;

    swipeAnimRef.current?.kill();
    swipeAnimRef.current = gsap.to(card, {
      duration: 0.5,
      ease: "elastic.out(1, 0.72)",
      opacity: 1,
      overwrite: "auto",
      rotate: 0,
      scale: 1,
      x: 0,
      y: 0,
    });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || !isTop) return;

    // Ambil pointer capture supaya event tetap mengalir saat kursor keluar
    // dari kartu - ini yang membuat swipe pada laptop sebelumnya gagal.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Browser tertentu menolak setPointerCapture pada elemen non-button;
      // fallback aman: gesture tetap berjalan via event normal.
    }

    const card = cardRef.current;
    if (card) {
      swipeAnimRef.current?.kill();
      // Beri respons visual instan: angkat kartu sedikit + sedikit
      // perbesar. Ini membuat user di laptop tahu kartu siap digeser
      // tanpa harus menunggu long-press kanban.
      gsap.to(card, {
        duration: 0.16,
        ease: "power3.out",
        opacity: 1,
        overwrite: "auto",
        rotate: 0,
        scale: 1.02,
        x: 0,
        y: -3,
      });
    }
    setDragReady(false);
    setPressing(true);
    setTooltipOpen(true);

    const gesture: CardGesture = {
      currentX: 0,
      currentY: 0,
      dragReady: false,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timer: null,
    };
    gesture.timer = setTimeout(() => {
      if (gestureRef.current?.pointerId !== gesture.pointerId) return;
      if (gesture.moved) return;
      gesture.dragReady = true;
      setDragReady(true);
      // Saat dnd mengambil alih, lepas pointer capture supaya overlay dnd
      // bisa menerima pointer event di seluruh viewport.
      try {
        cardRef.current?.releasePointerCapture(gesture.pointerId);
      } catch {
        // Sudah dilepas otomatis, abaikan.
      }
      if (cardRef.current) {
        gsap.to(cardRef.current, {
          duration: 0.22,
          ease: "power3.out",
          overwrite: "auto",
          scale: 1.045,
          y: -6,
        });
      }
    }, DRAG_LONG_PRESS_MS);
    gestureRef.current = gesture;

    dragPointerDown?.(event);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (gesture.dragReady) return;

    const x = event.clientX - gesture.startX;
    const y = event.clientY - gesture.startY;
    gesture.currentX = x;
    gesture.currentY = y;

    if (Math.abs(x) > 4 || Math.abs(y) > 4) {
      gesture.moved = true;
      if (gesture.timer) {
        clearTimeout(gesture.timer);
        gesture.timer = null;
      }
    }

    if (Math.abs(x) > 3 && Math.abs(x) > Math.abs(y) * 0.7) {
      // Cegah scroll vertikal native saat user melakukan swipe horizontal
      // pada touch device, supaya kartu mengikuti jari dengan presisi.
      if (event.cancelable) event.preventDefault();
      const clampedX = clamp(x, -SWIPE_TRACK_LIMIT, SWIPE_TRACK_LIMIT);
      const swipeProgress = Math.min(1, Math.abs(clampedX) / SWIPE_THRESHOLD);

      if (cardRef.current) {
        swipeAnimRef.current = gsap.to(cardRef.current, {
          duration: 0.16,
          ease: "power3.out",
          opacity: 1,
          overwrite: "auto",
          rotate: clamp(clampedX / 14, -13, 13),
          scale: 1 + swipeProgress * 0.018,
          x: clampedX,
          y: -swipeProgress * 5,
        });
      }
    } else if (Math.abs(x) <= 3 && cardRef.current) {
      gsap.to(cardRef.current, {
        duration: 0.14,
        ease: "power3.out",
        overwrite: "auto",
        rotate: 0,
        scale: 1,
        x: 0,
        y: 0,
      });
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    if (gesture.timer) {
      clearTimeout(gesture.timer);
      gesture.timer = null;
    }
    gestureRef.current = null;
    releaseCapture(event);
    setPressing(false);
    setTooltipOpen(false);

    if (gesture.dragReady) {
      setDragReady(false);
      return;
    }

    const direction = swipeDirectionFor({
      x: gesture.currentX,
      y: gesture.currentY,
    });
    if (direction) {
      finishSwipe(direction);
      return;
    }

    snapBack();
  };

  const handlePointerCancel = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (gestureRef.current?.timer) clearTimeout(gestureRef.current.timer);
    gestureRef.current = null;
    releaseCapture(event);
    setPressing(false);
    setTooltipOpen(false);
    snapBack();
  };

  const interactive = isTop && !disabled;
  const meta = USER_BOOK_STATUS_META[item.status];
  const visibilityMeta = USER_BOOK_VISIBILITY_META[item.visibility];

  return (
    <div
      ref={isTop ? setNodeRef : undefined}
      className="absolute left-1/2 top-2 w-[6.15rem] sm:w-[6.8rem]"
      style={wrapperStyle}
    >
      <Tooltip
        open={isTop && tooltipOpen}
        onOpenChange={(next) => {
          if (!isTop) return;
          setTooltipOpen(next);
        }}
      >
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!interactive}
            aria-label={`${item.title}, ${meta.label}`}
            className={cn(
              "relative aspect-[2/3] h-auto w-full overflow-hidden rounded-md border border-border/60 bg-muted p-0 shadow-sm",
              "transition-[border-color,box-shadow,opacity] duration-200 ease-out",
              interactive
                ? "cursor-grab touch-none select-none hover:border-primary/50 hover:shadow-md active:cursor-grabbing"
                : "pointer-events-none",
              !isTop && slotIndex > 2 && "opacity-85",
              isActiveBook && interactive && "ring-2 ring-primary/35 ring-offset-2",
              pressing && "border-primary/55 shadow-md shadow-primary/10",
              dragReady && "border-primary/60 shadow-lg shadow-primary/15",
              isDragging && "opacity-35",
            )}
            ref={cardRef}
            {...(interactive ? attributes : {})}
            {...(interactive ? restListeners : {})}
            onPointerCancel={interactive ? handlePointerCancel : undefined}
            onPointerDown={interactive ? handlePointerDown : undefined}
            onPointerMove={interactive ? handlePointerMove : undefined}
            onPointerUp={interactive ? handlePointerUp : undefined}
          >
            <BookCoverImage src={item.coverUrl} title={item.title} />
            <span className="sr-only">{item.title}</span>
          </Button>
        </TooltipTrigger>
        {isTop ? (
          <TooltipContent side="top" className="block max-w-64 text-left">
            <span className="block font-medium">{item.title}</span>
            <span className="mt-0.5 block text-background/75">
              {item.author}
            </span>
            <span className="mt-1 block text-background/75">
              {meta.label} - {visibilityMeta.label}
            </span>
            {item.progress !== null ? (
              <span className="mt-0.5 block text-background/75">
                Progres {item.progress}%
              </span>
            ) : null}
          </TooltipContent>
        ) : null}
      </Tooltip>
    </div>
  );
}

function BookTilePreview({ item }: { item: ShelfBoardItem }) {
  return (
    <div className="relative aspect-[2/3] w-[6.8rem] overflow-hidden rounded-md border border-primary/30 bg-muted shadow-xl">
      <BookCoverImage src={item.coverUrl} title={item.title} />
    </div>
  );
}

function stackTransform(index: number) {
  const offsetX = STACK_OFFSET_X[index] ?? STACK_OFFSET_X.at(-1) ?? 0;
  const offsetY = STACK_OFFSET_Y[index] ?? STACK_OFFSET_Y.at(-1) ?? 0;
  const scale = STACK_SCALE[index] ?? STACK_SCALE.at(-1) ?? 0.875;
  const rotation = STACK_ROTATE[index] ?? STACK_ROTATE.at(-1) ?? 0;

  return `translate3d(calc(-50% + ${offsetX}px), ${offsetY}px, 0) scale(${scale}) rotate(${rotation}deg)`;
}

type SwipeDirection = "left" | "right";

function swipeDirectionFor(delta: { x: number; y: number }): SwipeDirection | null {
  if (Math.abs(delta.x) < SWIPE_THRESHOLD) return null;
  if (Math.abs(delta.x) < Math.abs(delta.y) * 1.25) return null;
  return delta.x < 0 ? "left" : "right";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getBoardScrollViewport(root: HTMLDivElement | null) {
  return root?.querySelector<HTMLElement>(
    "[data-slot='scroll-area-viewport']",
  );
}

/**
 * Hitung kecepatan auto-scroll berdasarkan seberapa jauh sisi kartu yang
 * sedang di-drag melewati ujung viewport. Tidak ada scroll bila kartu masih
 * berada di dalam viewport - jadi hit-box scroll persis menyentuh ujung
 * layar. Karena perhitungannya berbasis posisi rect, perubahan arah drag
 * otomatis ditangani: rect bergeser ke sisi lain, edge yang mengalami
 * overshoot berganti, kecepatan otomatis berlawanan tanda.
 */
function overshootScrollSpeed({
  dragLeft,
  dragRight,
  maxScroll,
  scrollLeft,
  viewportLeft,
  viewportRight,
}: {
  dragLeft: number;
  dragRight: number;
  maxScroll: number;
  scrollLeft: number;
  viewportLeft: number;
  viewportRight: number;
}) {
  if (maxScroll <= 0) return 0;

  const overshootRight = dragRight - viewportRight;
  if (overshootRight > -DRAG_SCROLL_EDGE_THRESHOLD && scrollLeft < maxScroll) {
    const intensity =
      Math.max(0, overshootRight + DRAG_SCROLL_EDGE_THRESHOLD) /
      DRAG_SCROLL_EDGE_THRESHOLD;
    if (intensity > 0) {
      const speed = Math.ceil(
        clamp(intensity, 0.1, 1.4) * DRAG_SCROLL_MAX_SPEED,
      );
      return Math.min(speed, maxScroll - scrollLeft);
    }
  }

  const overshootLeft = viewportLeft - dragLeft;
  if (overshootLeft > -DRAG_SCROLL_EDGE_THRESHOLD && scrollLeft > 0) {
    const intensity =
      Math.max(0, overshootLeft + DRAG_SCROLL_EDGE_THRESHOLD) /
      DRAG_SCROLL_EDGE_THRESHOLD;
    if (intensity > 0) {
      const speed = Math.ceil(
        clamp(intensity, 0.1, 1.4) * DRAG_SCROLL_MAX_SPEED,
      );
      return -Math.min(speed, scrollLeft);
    }
  }

  return 0;
}

function rotateBooks(items: ShelfBoardItem[], offset: number) {
  if (items.length <= 1) return items;

  const normalizedOffset =
    ((offset % items.length) + items.length) % items.length;
  if (normalizedOffset === 0) return items;

  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
}

function BookCoverImage({
  src,
  title,
}: {
  src: string | null;
  title: string;
}) {
  const [errored, setErrored] = useState(false);
  const showImage = Boolean(src) && !errored;

  if (showImage && src) {
    return (
      <Image
        src={src}
        alt=""
        fill
        sizes="96px"
        onError={() => setErrored(true)}
        className="object-contain"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex size-full items-center justify-center bg-muted text-muted-foreground"
      title={title}
    >
      <BookOpen className="size-1/3" strokeWidth={1.5} />
    </span>
  );
}

function ShelfBoardSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-max gap-0 pb-2">
        {USER_BOOK_STATUS_VALUES.map((status, index) => (
          <div
            key={status}
            className={cn(
              "w-32 shrink-0 px-2 py-1.5 sm:w-36 sm:px-2.5 lg:w-40",
              index > 0 && "border-l border-border/40",
            )}
          >
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <Skeleton className="h-3.5 w-16 rounded-sm" />
              <Skeleton className="h-3 w-4 rounded-sm" />
            </div>
            <div className="relative mx-auto h-48 w-full sm:h-52">
              {Array.from({ length: 5 }).map((_, slotIndex) => (
                <Skeleton
                  key={slotIndex}
                  className="absolute left-1/2 top-2 aspect-[2/3] w-[6.15rem] rounded-md sm:w-[6.8rem]"
                  style={{
                    zIndex: 5 - slotIndex,
                    transform: stackTransform(slotIndex),
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function resolveCurrentBook(
  source: BookSource,
): Promise<CurrentBookPreview> {
  if (source.kind === "id") {
    return {
      bookId: source.bookId,
      title: source.bookTitle?.trim() || "Buku ini",
      author: "Penulis belum tersedia",
      coverUrl: null,
    };
  }

  const ensured = await ensureLocalBookFromResult(source.book);
  return {
    bookId: ensured.bookId,
    title: source.book.title,
    author:
      source.book.authorText?.trim() ||
      source.book.authors.at(0) ||
      "Penulis belum tersedia",
    coverUrl: source.book.coverUrl,
  };
}

function mergeBoardWithCurrent(
  items: MyShelfBoardItem[],
  shelf: ShelfState,
  current: CurrentBookPreview,
): ShelfBoardItem[] {
  let hasCurrent = false;
  const merged = items.map((item) => {
    if (item.bookId !== shelf.bookId) return item;
    hasCurrent = true;
    return {
      ...item,
      status: shelf.status,
      visibility: shelf.visibility,
      isBorrowable: shelf.isBorrowable,
      progress: shelf.progress,
    };
  });

  if (hasCurrent) return merged;

  return [
    {
      bookId: shelf.bookId,
      title: current.title,
      author: current.author,
      coverUrl: current.coverUrl,
      status: shelf.status,
      visibility: shelf.visibility,
      isBorrowable: shelf.isBorrowable,
      progress: shelf.progress,
      updatedAt: new Date(0).toISOString(),
      isTransient: true,
    },
    ...merged,
  ];
}

function itemWithStatus(
  item: ShelfBoardItem,
  status: UserBookStatus,
): ShelfBoardItem {
  return {
    ...item,
    status,
    progress:
      status === "FINISHED"
        ? 100
        : status === "WANT_TO_READ"
          ? null
          : item.progress,
    isTransient: false,
  };
}

function shelfWithStatus(
  shelf: ShelfState,
  status: UserBookStatus,
): ShelfState {
  return {
    ...shelf,
    status,
    progress:
      status === "FINISHED"
        ? 100
        : status === "WANT_TO_READ"
          ? null
          : shelf.progress,
  };
}

function draggableIdFor(bookId: string) {
  return `${BOOK_DRAG_PREFIX}${bookId}`;
}

function droppableIdFor(status: UserBookStatus) {
  return `${STATUS_DROP_PREFIX}${status}`;
}

function bookIdFromDraggableId(id: UniqueIdentifier) {
  if (typeof id !== "string" || !id.startsWith(BOOK_DRAG_PREFIX)) return null;
  return id.slice(BOOK_DRAG_PREFIX.length);
}

function statusFromDroppableId(
  id: UniqueIdentifier | null | undefined,
): UserBookStatus | null {
  if (typeof id !== "string" || !id.startsWith(STATUS_DROP_PREFIX)) {
    return null;
  }
  const status = id.slice(STATUS_DROP_PREFIX.length);
  return isUserBookStatus(status) ? status : null;
}
