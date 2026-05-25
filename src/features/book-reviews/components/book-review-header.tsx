import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BookReviewBookContext } from "@/features/book-reviews/types";

type BookReviewHeaderProps = {
  book: BookReviewBookContext;
};

export function BookReviewHeader({ book }: BookReviewHeaderProps) {
  return (
    <header className="flex items-start gap-4">
      <Button
        asChild
        size="icon-sm"
        variant="ghost"
        className="hidden cursor-pointer rounded-full sm:inline-flex"
        aria-label="Kembali ke Jelajahi"
      >
        <Link href="/dashboard/explore">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>

      <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md bg-muted shadow-sm sm:h-28 sm:w-20">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={`Cover ${book.title}`}
            fill
            sizes="80px"
            className="object-contain"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-secondary via-muted to-accent/40 p-2 text-center">
            <BookOpen
              aria-hidden="true"
              className="size-4 text-muted-foreground/70"
            />
            <span className="line-clamp-2 text-[9px] font-medium leading-tight text-muted-foreground">
              {book.title}
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          Review &amp; Rating
        </span>
        <h1 className="font-heading text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">
          {book.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          oleh {book.author}
          {book.firstPublishYear ? ` · ${book.firstPublishYear}` : ""}
        </p>
        {book.openLibraryUrl && (
          <Button
            asChild
            size="xs"
            variant="link"
            className="h-auto w-fit cursor-pointer p-0 text-xs"
          >
            <Link
              href={book.openLibraryUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink aria-hidden="true" className="size-3" />
              Lihat di Open Library
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
