"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookText,
  BookmarkPlus,
  Building2,
  Calendar,
  Ellipsis,
  ExternalLink,
  Globe2,
  Hash,
  Loader2,
  Sparkles,
  Star,
} from "lucide-react";

import { createBookAiConversation } from "@/actions/book-ai-chat";
import { ensureLocalBookFromResult } from "@/actions/book-reviews";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BookCover } from "@/features/books/components/book-cover";
import { CreateCircleDialog } from "@/features/reading-circle/components/create-circle-dialog";
import { BookShelfStatusDialog } from "@/features/user-books/components/book-shelf-status-dialog";
import type { BookResult } from "@/features/books/types";
import { cn } from "@/lib/utils";

type BookDetailDrawerProps = {
  book: BookResult | null;
  onOpenChange: (open: boolean) => void;
};

export function BookDetailDrawer({
  book,
  onOpenChange,
}: BookDetailDrawerProps) {
  return (
    <Drawer open={Boolean(book)} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="bg-background">
        {book ? (
          <DetailBody key={book.id} book={book} />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
            Memuat detail...
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

type DetailStatus = "idle" | "loading" | "error";

function DetailBody({ book }: { book: BookResult }) {
  const [enriched, setEnriched] = useState<BookResult | null>(null);
  const [status, setStatus] = useState<DetailStatus>(() =>
    book.workKey || book.editionKey ? "loading" : "idle",
  );

  useEffect(() => {
    const detailKey = book.workKey ?? book.editionKey;
    if (!detailKey) return;

    const controller = new AbortController();

    const url = book.workKey
      ? `/api/books/works/${encodeURIComponent(book.workKey.replace(/^\/works\//, ""))}`
      : `/api/books/editions/${encodeURIComponent(book.editionKey ?? "")}`;

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Detail unavailable");
        return (await res.json()) as BookResult;
      })
      .then((data) => {
        setEnriched(data);
        setStatus("idle");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });

    return () => controller.abort();
  }, [book]);

  const detail = enriched ? mergeDetail(book, enriched) : book;

  return (
    <div className="flex h-full flex-col">
      <DrawerHeader className="px-6 pb-5 pt-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
          Detail buku
        </p>
        <DrawerTitle className="mt-2 text-lg leading-tight tracking-normal normal-case">
          {detail.title}
        </DrawerTitle>
        <DrawerDescription className="text-xs">
          oleh {detail.authorText}
        </DrawerDescription>
      </DrawerHeader>

      <Separator />

      <div className="hide-scrollbar flex-1 overflow-y-auto px-6 py-6">
        <div className="flex gap-4 flex-col sm:flex-row">
          <div className="w-32 shrink-0 mx-auto sm:mx-0">
            <BookCover src={detail.coverUrl} title={detail.title} rounded="md" />
          </div>
          <dl className="flex flex-col gap-2.5 text-xs">
            {detail.firstPublishYear && (
              <DetailLine icon={Calendar} label="Terbit pertama">
                {detail.firstPublishYear}
                {detail.publishDate &&
                  detail.publishDate !== String(detail.firstPublishYear)
                  ? ` · ${detail.publishDate}`
                  : ""}
              </DetailLine>
            )}
            {detail.languages.length > 0 && (
              <DetailLine icon={Globe2} label="Bahasa">
                {detail.languages.map((lang) => lang.toUpperCase()).join(", ")}
              </DetailLine>
            )}
            {detail.publishers.length > 0 && (
              <DetailLine icon={Building2} label="Publisher">
                {detail.publishers.slice(0, 3).join(", ")}
              </DetailLine>
            )}
            {(detail.isbn13 || detail.isbn10) && (
              <DetailLine icon={Hash} label="ISBN">
                {detail.isbn13 ?? detail.isbn10}
              </DetailLine>
            )}
            {typeof detail.pageCount === "number" && (
              <DetailLine icon={BookText} label="Halaman">
                {detail.pageCount}
              </DetailLine>
            )}
          </dl>
        </div>

        <div className="mt-7">
          <SectionTitle>Sinopsis</SectionTitle>
          <DescriptionBlock detail={detail} status={status} />
        </div>

        {detail.subjects.length > 0 && (
          <div className="mt-7">
            <SectionTitle>Subject</SectionTitle>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {detail.subjects.slice(0, 12).map((subject) => (
                <span
                  key={subject}
                  className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
                >
                  {subject}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="px-6 py-4">
        <div className="grid gap-2">
          <DiscussCta book={detail} />
          <DetailActions book={detail} />
        </div>
      </div>
    </div>
  );
}

function DetailActions({ book }: { book: BookResult }) {
  const [open, setOpen] = useState(false);
  const [shelfDialogOpen, setShelfDialogOpen] = useState(false);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer justify-between rounded-full"
            size="sm"
          >
            <span>Actions</span>
            <Ellipsis aria-hidden="true" className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[min(18rem,calc(100vw-3rem))] p-1.5"
        >
          <div className="grid gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full cursor-pointer justify-start rounded-[1rem] px-3"
              onClick={() => {
                setOpen(false);
                // Defer pembukaan dialog ke microtask supaya Radix
                // popover sempat menutup dulu — mencegah konflik focus
                // trap antara popover dan dialog.
                setTimeout(() => setShelfDialogOpen(true), 0);
              }}
            >
              <BookmarkPlus aria-hidden="true" className="size-3.5" />
              Atur status & visibilitas
            </Button>
            <CreateCircleDialog
              book={book}
              buttonClassName="w-full cursor-pointer justify-start rounded-[1rem] px-3"
              buttonLabel="Buat circle"
              buttonVariant="ghost"
              onTriggerClick={() => setOpen(false)}
            />
            <ReviewsCta
              book={book}
              className="justify-start rounded-[1rem] px-3"
              label="Lihat review"
              onAction={() => setOpen(false)}
              variant="ghost"
            />
            <Button
              asChild
              variant="ghost"
              className="w-full cursor-pointer justify-start rounded-[1rem] px-3"
              size="sm"
            >
              <a
                href={book.openLibraryUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Buka ${book.title} di Open Library`}
                onClick={() => setOpen(false)}
              >
                <ExternalLink aria-hidden="true" className="size-3.5" />
                Buka di Open Library
              </a>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/*
        Dialog "Atur rak" dirender sebagai sibling dari popover (controlled)
        agar bisa dipanggil dari menu tanpa nested dialog di dalam popover —
        nesting tersebut sering bermasalah dengan focus management Radix.
      */}
      <BookShelfStatusDialog
        source={{ kind: "result", book }}
        open={shelfDialogOpen}
        onOpenChange={setShelfDialogOpen}
      />
    </>
  );
}

function DiscussCta({ book }: { book: BookResult }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      try {
        const { conversationId } = await createBookAiConversation(book);
        router.push(`/dashboard/explore/discussions/${conversationId}`);
      } catch (error) {
        console.error("[book-ai] create conversation failed", error);
        toast.error("Gagal membuat diskusi. Coba lagi sebentar.");
      }
    });
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="w-full cursor-pointer rounded-full"
      size="sm"
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
      ) : (
        <Sparkles aria-hidden="true" className="size-3.5" />
      )}
      {pending ? "Membuka diskusi..." : "Diskusi buku ini"}
    </Button>
  );
}

function ReviewsCta({
  book,
  className,
  label = "Lihat review dan rating",
  onAction,
  variant = "outline",
}: {
  book: BookResult;
  className?: string;
  label?: string;
  onAction?: () => void;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    onAction?.();
    startTransition(async () => {
      try {
        const { bookId } = await ensureLocalBookFromResult(book);
        router.push(`/dashboard/explore/books/${bookId}/reviews`);
      } catch (error) {
        console.error("[book-reviews] open reviews failed", error);
        toast.error("Gagal membuka halaman review. Coba lagi sebentar.");
      }
    });
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={pending}
      variant={variant}
      className={cn("w-full cursor-pointer rounded-full", className)}
      size="sm"
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
      ) : (
        <Star aria-hidden="true" className="size-3.5" />
      )}
      {pending ? "Membuka..." : label}
    </Button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-heading text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
      {children}
    </h3>
  );
}

function DetailLine({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Calendar;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
        <Icon aria-hidden="true" className="size-3" />
      </span>
      <div>
        <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 text-foreground">{children}</dd>
      </div>
    </div>
  );
}

function DescriptionBlock({
  detail,
  status,
}: {
  detail: BookResult;
  status: DetailStatus;
}) {
  if (detail.description) {
    return (
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {detail.description}
      </p>
    );
  }

  if (status === "loading") {
    return (
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-full rounded-md" />
        <Skeleton className="h-3 w-11/12 rounded-md" />
        <Skeleton className="h-3 w-2/3 rounded-md" />
      </div>
    );
  }

  return (
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
      Sinopsis belum tersedia di Open Library. Buka tautan eksternal untuk
      melihat metadata lengkap.
    </p>
  );
}

function mergeDetail(current: BookResult, incoming: BookResult): BookResult {
  return {
    ...current,
    ...incoming,
    workKey: incoming.workKey ?? current.workKey,
    editionKey: incoming.editionKey ?? current.editionKey,
    title: incoming.title || current.title,
    subtitle: incoming.subtitle ?? current.subtitle,
    coverUrl: incoming.coverUrl ?? current.coverUrl,
    authors: incoming.authors.length > 0 ? incoming.authors : current.authors,
    authorText:
      incoming.authors.length > 0 ? incoming.authorText : current.authorText,
    languages:
      incoming.languages.length > 0 ? incoming.languages : current.languages,
    publishers:
      incoming.publishers.length > 0 ? incoming.publishers : current.publishers,
    subjects:
      incoming.subjects.length > 0 ? incoming.subjects : current.subjects,
    isbn13: incoming.isbn13 ?? current.isbn13,
    isbn10: incoming.isbn10 ?? current.isbn10,
    pageCount: incoming.pageCount ?? current.pageCount,
    description: incoming.description ?? current.description,
    firstPublishYear: incoming.firstPublishYear ?? current.firstPublishYear,
    publishDate: incoming.publishDate ?? current.publishDate,
    openLibraryUrl: incoming.openLibraryUrl ?? current.openLibraryUrl,
  };
}
