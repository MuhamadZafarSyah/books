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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
   * Library). Saat drawer dibuka, kita panggil `ensureLocalBookFromResult`
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
   * `onOpenChange` agar drawer bisa dibuka dari menu lain.
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

const EMPTY_COLUMN_COPY: Record<UserBookStatus, string> = {
  WANT_TO_READ: "Kosong",
  TO_BE_READ: "Kosong",
  READING: "Kosong",
  FINISHED: "Kosong",
  ON_HOLD: "Kosong",
  ABANDONED: "Kosong",
};
const VISIBLE_STACK_SIZE = 5;
const SWIPE_THRESHOLD = 72;
const DRAG_LONG_PRESS_MS = 2000;
const DRAG_LONG_PRESS_TOLERANCE = 10;
const SWIPE_TRACK_LIMIT = 154;
const DRAG_SCROLL_EDGE_SIZE = 72;
const DRAG_SCROLL_DIRECTION_ZONE = 0.38;
const DRAG_SCROLL_MAX_SPEED = 18;

/**
 * Drawer "Atur rak" yang reusable di seluruh aplikasi.
 *
 * Karakteristik:
 * - **Lazy resolve**: ketika `source.kind === "result"`, Book lokal
 *   dipastikan ada lewat `ensureLocalBookFromResult` saat drawer dibuka.
 * - **Mini kanban**: saat drawer terbuka, semua buku viewer dimuat dan
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
  const dragScrollSpeedRef = useRef(0);
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
  const currentItem = shelf
    ? board.find((item) => item.bookId === shelf.bookId) ?? null
    : null;
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
    dragScrollSpeedRef.current = 0;
    if (dragScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(dragScrollFrameRef.current);
      dragScrollFrameRef.current = null;
    }
  }, []);

  const startDragScroll = useCallback(() => {
    if (dragScrollFrameRef.current !== null) return;

    const step = () => {
      const viewport = getBoardScrollViewport(boardScrollAreaRef.current);
      const speed = dragScrollSpeedRef.current;

      if (!viewport || speed === 0) {
        dragScrollFrameRef.current = null;
        return;
      }

      viewport.scrollLeft += speed;
      dragScrollFrameRef.current = window.requestAnimationFrame(step);
    };

    dragScrollFrameRef.current = window.requestAnimationFrame(step);
  }, []);

  const updateDragScroll = useCallback(
    (speed: number) => {
      dragScrollSpeedRef.current = speed;

      if (speed === 0) {
        stopDragScroll();
        return;
      }

      if (dragScrollFrameRef.current === null) {
        startDragScroll();
      }
    },
    [startDragScroll, stopDragScroll],
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

  // Saat drawer terbuka pertama kali untuk source ini, resolve `bookId`
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

  const handleRemove = () => {
    if (!shelf || !currentItem || currentItem.isTransient || isBusy) return;

    const previousBoard = board;
    const previousShelf = shelf;
    const resetShelf: ShelfState = { bookId: shelf.bookId, ...DEFAULT_STATE };
    const fallbackPreview = previewFromBoardItem(currentItem);

    setShelf(resetShelf);
    setBoard((current) =>
      mergeBoardWithCurrent(
        current.filter((item) => item.bookId !== shelf.bookId),
        resetShelf,
        fallbackPreview,
      ),
    );

    startRemove(async () => {
      try {
        await removeUserBook(shelf.bookId);
        toast.success("Buku dihapus dari rak.");
        onSaved?.(null);
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
    stopDragScroll();
    if (typeof event.active.id === "string") setActiveId(event.active.id);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const viewport = getBoardScrollViewport(boardScrollAreaRef.current);
    const dragX = dragClientX(event);

    if (!viewport || dragX === null) {
      updateDragScroll(0);
      return;
    }

    updateDragScroll(
      horizontalDragScrollSpeed({
        deltaX: event.delta.x,
        maxScrollLeft: viewport.scrollWidth - viewport.clientWidth,
        pointerX: dragX,
        rect: viewport.getBoundingClientRect(),
        scrollLeft: viewport.scrollLeft,
      }),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    stopDragScroll();
    setActiveId(null);

    const draggedBookId = bookIdFromDraggableId(event.active.id);
    const nextStatus = statusFromDroppableId(event.over?.id);
    if (!draggedBookId || !nextStatus) return;

    const item = board.find((book) => book.bookId === draggedBookId);
    if (!item) return;

    if (nextStatus && nextStatus !== item.status) {
      persistStatus(item, nextStatus);
      return;
    }

    if (nextStatus && item.isTransient) {
      persistStatus(item, nextStatus);
    }
  };

  const handleDragCancel = () => {
    stopDragScroll();
    setActiveId(null);
  };

  const rotateDeck = (status: UserBookStatus, direction: 1 | -1) => {
    setDeckOffsets((current) => ({
      ...current,
      [status]: (current[status] ?? 0) + direction,
    }));
  };

  return (
    <Drawer direction="bottom" open={open} onOpenChange={setOpen}>
      {trigger ? <DrawerTrigger asChild>{trigger}</DrawerTrigger> : null}
      <DrawerContent className="max-h-[92vh] w-full border-border/70 bg-background">
        <TooltipProvider>
          <div className="mx-auto flex h-[min(86vh,760px)] w-full max-w-[1440px] flex-col px-4 sm:px-6 lg:px-8">
            <DrawerHeader className="px-0 pb-3 pt-5 text-left">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <DrawerTitle className="font-heading text-2xl normal-case tracking-normal text-foreground">
                    Rak baca
                  </DrawerTitle>
                  <DrawerDescription>
                    Tumpukan buku pribadi berdasarkan status baca.
                  </DrawerDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={shelf?.visibility ?? DEFAULT_STATE.visibility}
                    disabled={!shelf || isBusy}
                    onValueChange={(value) =>
                      persistVisibility(value as UserBookVisibility)
                    }
                  >
                    <SelectTrigger
                      aria-label="Visibilitas"
                      className="h-9 w-[min(100vw-2rem,11rem)] rounded-full"
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

                  <Tooltip>
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
                        className="cursor-pointer rounded-full text-muted-foreground hover:text-destructive"
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
                  </Tooltip>

                  <DrawerClose asChild>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      className="cursor-pointer rounded-full"
                      aria-label="Tutup rak baca"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </Button>
                  </DrawerClose>
                </div>
              </div>
            </DrawerHeader>

            {resolveError ? (
              <p role="alert" className="py-6 text-sm text-destructive">
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
                <div ref={boardScrollAreaRef} className="min-h-0 flex-1">
                  <ScrollArea className="h-full overflow-hidden rounded-[1.25rem] border border-border/60 bg-card/35 overscroll-contain">
                    <div className="flex min-w-max gap-0 p-3 sm:p-4">
                      {columns.map((column) => (
                        <ShelfStatusColumn
                          key={column.status}
                          status={column.status}
                          books={column.books}
                          disabled={isBusy}
                          activeBookId={shelf?.bookId ?? null}
                          onRotateDeck={rotateDeck}
                        />
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>

                <DragOverlay adjustScale={false}>
                  {activeItem ? <BookTilePreview item={activeItem} /> : null}
                </DragOverlay>
              </DndContext>
            )}

            <div className="flex min-h-10 items-center justify-end py-3">
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
      </DrawerContent>
    </Drawer>
  );
}

function ShelfStatusColumn({
  status,
  books,
  disabled,
  activeBookId,
  onRotateDeck,
}: {
  status: UserBookStatus;
  books: ShelfBoardItem[];
  disabled: boolean;
  activeBookId: string | null;
  onRotateDeck: (status: UserBookStatus, direction: 1 | -1) => void;
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
        "flex min-h-[20rem] w-36 shrink-0 flex-col border-l border-border/60 px-2.5 first:border-l-0 sm:w-40 sm:px-3 lg:w-44",
        isOver && "bg-primary/5 ring-1 ring-primary/20",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {meta.shortLabel}
          </h3>
          <p className="text-[11px] text-muted-foreground">{books.length}</p>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="flex min-h-44 flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground">
          {EMPTY_COLUMN_COPY[status]}
        </div>
      ) : (
        <div className="relative mx-auto h-60 w-full sm:h-64">
          {visibleBooks
            .map((book, index) =>
              index === 0 ? (
                <DraggableBookTile
                  key={book.bookId}
                  item={book}
                  stackIndex={index}
                  stackTotal={visibleBooks.length}
                  disabled={disabled}
                  isActiveBook={book.bookId === activeBookId}
                  onSwipe={(direction) => onRotateDeck(status, direction)}
                />
              ) : (
                <BookStackCard
                  key={book.bookId}
                  item={book}
                  stackIndex={index}
                  stackTotal={visibleBooks.length}
                />
              ),
            )
            .reverse()}
        </div>
      )}
    </section>
  );
}

function DraggableBookTile({
  item,
  stackIndex,
  stackTotal,
  disabled,
  isActiveBook,
  onSwipe,
}: {
  item: ShelfBoardItem;
  stackIndex: number;
  stackTotal: number;
  disabled: boolean;
  isActiveBook: boolean;
  onSwipe: (direction: 1 | -1) => void;
}) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: draggableIdFor(item.bookId),
    data: { item },
    disabled,
  });
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const gestureRef = useRef<CardGesture | null>(null);
  const swipeTweenRef = useRef<gsap.core.Tween | null>(null);
  const [dragReady, setDragReady] = useState(false);
  const style: CSSProperties = {
    zIndex: stackTotal - stackIndex,
    transform: stackTransform(stackIndex),
  };
  const dragPointerDown = listeners?.onPointerDown as
    | ((event: ReactPointerEvent<HTMLButtonElement>) => void)
    | undefined;
  const dragListeners = {
    ...listeners,
    onPointerDown: undefined,
  };

  useEffect(() => {
    const card = cardRef.current;
    if (card) {
      gsap.set(card, {
        force3D: true,
        opacity: 1,
        rotate: 0,
        scale: 1,
        x: 0,
        y: 0,
      });
    }

    return () => {
      clearGestureTimer(gestureRef.current);
      swipeTweenRef.current?.kill();
      if (card) gsap.killTweensOf(card);
    };
  }, []);

  const finishSwipe = (direction: 1 | -1) => {
    const card = cardRef.current;
    if (!card) {
      onSwipe(direction);
      return;
    }
    const exitX = direction > 0 ? -190 : 190;
    setDragReady(false);
    swipeTweenRef.current?.kill();
    swipeTweenRef.current = gsap.to(card, {
      duration: 0.34,
      ease: "power4.out",
      opacity: 0,
      overwrite: "auto",
      rotate: direction > 0 ? -16 : 16,
      scale: 0.96,
      x: exitX,
      y: -12,
      onComplete: () => {
        onSwipe(direction);
        gsap.set(card, {
          opacity: 1,
          rotate: 0,
          scale: 1,
          x: 0,
          y: 0,
        });
      },
    });
  };

  const snapBack = () => {
    const card = cardRef.current;
    setDragReady(false);
    if (!card) return;

    swipeTweenRef.current?.kill();
    swipeTweenRef.current = gsap.to(card, {
      duration: 0.52,
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
    if (disabled) return;
    const card = cardRef.current;
    if (card) {
      swipeTweenRef.current?.kill();
      gsap.set(card, {
        opacity: 1,
        rotate: 0,
        scale: 1,
        x: 0,
        y: 0,
      });
    }
    setDragReady(false);

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
      if (cardRef.current) {
        gsap.to(cardRef.current, {
          duration: 0.24,
          ease: "power3.out",
          overwrite: "auto",
          scale: 1.035,
          y: -4,
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
      clearGestureTimer(gesture);
    }

    if (Math.abs(x) > 3 && Math.abs(x) > Math.abs(y) * 0.7) {
      event.preventDefault();
      const clampedX = clamp(x, -SWIPE_TRACK_LIMIT, SWIPE_TRACK_LIMIT);
      const swipeProgress = Math.min(1, Math.abs(clampedX) / SWIPE_THRESHOLD);

      if (cardRef.current) {
        swipeTweenRef.current = gsap.to(cardRef.current, {
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

    clearGestureTimer(gesture);
    gestureRef.current = null;

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

  const handlePointerCancel = () => {
    clearGestureTimer(gestureRef.current);
    gestureRef.current = null;
    snapBack();
  };

  return (
    <div
      ref={setNodeRef}
      className="absolute left-1/2 top-2 w-[6.15rem] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[6.8rem]"
      style={style}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={`${item.title}, ${USER_BOOK_STATUS_META[item.status].label}`}
            className={cn(
              "relative aspect-[2/3] h-auto w-full cursor-grab touch-none select-none overflow-hidden rounded-md border border-border/60 bg-muted p-0 shadow-sm",
              "transition-[border-color,box-shadow,opacity] duration-200 ease-out hover:border-primary/50 hover:bg-muted hover:shadow-md active:cursor-grabbing",
              isActiveBook && "ring-2 ring-primary/35 ring-offset-2",
              dragReady && "border-primary/60 shadow-lg shadow-primary/10",
              isDragging && "opacity-35",
            )}
            ref={cardRef}
            {...attributes}
            {...dragListeners}
            onPointerCancel={handlePointerCancel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <BookCoverImage src={item.coverUrl} title={item.title} />
            <span className="sr-only">{item.title}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="block max-w-64 text-left">
          <span className="block font-medium">{item.title}</span>
          <span className="mt-0.5 block text-background/75">
            {item.author}
          </span>
          <span className="mt-1 block text-background/75">
            {USER_BOOK_STATUS_META[item.status].label} -{" "}
            {USER_BOOK_VISIBILITY_META[item.visibility].label}
          </span>
          {item.progress !== null ? (
            <span className="mt-0.5 block text-background/75">
              Progres {item.progress}%
            </span>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function BookStackCard({
  item,
  stackIndex,
  stackTotal,
}: {
  item: ShelfBoardItem;
  stackIndex: number;
  stackTotal: number;
}) {
  const style: CSSProperties = {
    zIndex: stackTotal - stackIndex,
    transform: stackTransform(stackIndex),
  };

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-2 w-[6.15rem] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[6.8rem]"
      style={style}
      aria-hidden="true"
    >
      <div
        className={cn(
          "relative aspect-[2/3] w-full overflow-hidden rounded-md border border-border/55 bg-muted shadow-sm",
          stackIndex > 2 && "opacity-80",
        )}
      >
        <BookCoverImage src={item.coverUrl} title={item.title} />
      </div>
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
  const offsetX = [0, 13, -13, 21, -21][index] ?? 0;
  const offsetY = [0, 13, 25, 37, 49][index] ?? 0;
  const scale = [1, 0.96, 0.92, 0.88, 0.84][index] ?? 0.84;
  const rotation = [0, 4, -4, 6, -6][index] ?? 0;

  return `translateX(calc(-50% + ${offsetX}px)) translateY(${offsetY}px) scale(${scale}) rotate(${rotation}deg)`;
}

function swipeDirectionFor(delta: { x: number; y: number }) {
  if (Math.abs(delta.x) < SWIPE_THRESHOLD) return null;
  if (Math.abs(delta.x) < Math.abs(delta.y) * 1.25) return null;
  return delta.x < 0 ? 1 : -1;
}

function clearGestureTimer(gesture: CardGesture | null) {
  if (!gesture?.timer) return;
  clearTimeout(gesture.timer);
  gesture.timer = null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getBoardScrollViewport(root: HTMLDivElement | null) {
  return root?.querySelector<HTMLElement>(
    "[data-slot='scroll-area-viewport']",
  );
}

function dragClientX(event: DragMoveEvent) {
  const startX = activatorClientX(event.activatorEvent);
  return startX === null ? null : startX + event.delta.x;
}

function activatorClientX(event: Event) {
  if (event instanceof MouseEvent || event instanceof PointerEvent) {
    return event.clientX;
  }

  if (typeof TouchEvent !== "undefined" && event instanceof TouchEvent) {
    const touch = event.touches.item(0) ?? event.changedTouches.item(0);
    return touch?.clientX ?? null;
  }

  return null;
}

function horizontalDragScrollSpeed({
  deltaX,
  maxScrollLeft,
  pointerX,
  rect,
  scrollLeft,
}: {
  deltaX: number;
  maxScrollLeft: number;
  pointerX: number;
  rect: DOMRect;
  scrollLeft: number;
}) {
  if (maxScrollLeft <= 0) return 0;

  const leftDistance = pointerX - rect.left;
  const rightDistance = rect.right - pointerX;
  const directionZoneWidth = rect.width * DRAG_SCROLL_DIRECTION_ZONE;
  const leftDirectionEnd = rect.left + directionZoneWidth;
  const rightDirectionStart = rect.right - directionZoneWidth;

  if (
    scrollLeft < maxScrollLeft &&
    (rightDistance < DRAG_SCROLL_EDGE_SIZE ||
      (deltaX > 0 && pointerX > rightDirectionStart))
  ) {
    const edgeProgress =
      1 -
      clamp(rightDistance, 0, DRAG_SCROLL_EDGE_SIZE) / DRAG_SCROLL_EDGE_SIZE;
    const directionProgress =
      deltaX > 0
        ? clamp(
            (pointerX - rightDirectionStart) / directionZoneWidth,
            0,
            1,
          ) * 0.72
        : 0;
    const progress = Math.max(edgeProgress, directionProgress);
    return Math.ceil(progress * DRAG_SCROLL_MAX_SPEED);
  }

  if (
    scrollLeft > 0 &&
    (leftDistance < DRAG_SCROLL_EDGE_SIZE ||
      (deltaX < 0 && pointerX < leftDirectionEnd))
  ) {
    const edgeProgress =
      1 - clamp(leftDistance, 0, DRAG_SCROLL_EDGE_SIZE) / DRAG_SCROLL_EDGE_SIZE;
    const directionProgress =
      deltaX < 0
        ? clamp((leftDirectionEnd - pointerX) / directionZoneWidth, 0, 1) * 0.72
        : 0;
    const progress = Math.max(edgeProgress, directionProgress);
    return -Math.ceil(progress * DRAG_SCROLL_MAX_SPEED);
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
        className="object-cover"
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
    <div className="min-h-0 flex-1 overflow-hidden rounded-[1.25rem] border border-border/60 bg-card/35 p-3 sm:p-4">
      <div className="flex min-w-max gap-0">
        {USER_BOOK_STATUS_VALUES.map((status) => (
          <div
            key={status}
            className="min-h-[20rem] w-36 shrink-0 border-l border-border/60 px-2.5 first:border-l-0 sm:w-40 sm:px-3 lg:w-44"
          >
            <Skeleton className="mb-3 h-4 w-20 rounded-sm" />
            <div className="relative mx-auto h-60 w-full sm:h-64">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="absolute left-1/2 top-2 aspect-[2/3] w-[6.15rem] rounded-md sm:w-[6.8rem]"
                  style={{
                    zIndex: 5 - index,
                    transform: stackTransform(index),
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

function previewFromBoardItem(item: ShelfBoardItem): CurrentBookPreview {
  return {
    bookId: item.bookId,
    title: item.title,
    author: item.author,
    coverUrl: item.coverUrl,
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
