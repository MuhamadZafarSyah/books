"use client";

import { cn } from "@/lib/utils";
import { BookCover } from "@/features/books/components/book-cover";
import type { BookResult } from "@/features/books/types";

type BookCardProps = {
  book: BookResult;
  onSelect?: (book: BookResult) => void;
};

export function BookCard({ book, onSelect }: BookCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(book)}
      aria-label={`Lihat detail ${book.title}`}
      className={cn(
        "group flex h-full w-full cursor-pointer flex-col gap-3 rounded-xl bg-transparent p-2 text-left outline-none transition-colors duration-200",
        "hover:bg-secondary/40",
        "focus-visible:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
    >
      <div className="overflow-hidden rounded-md shadow-[0_4px_12px_-6px_rgba(36,26,18,0.35)] transition-shadow duration-300 group-hover:shadow-[0_10px_22px_-10px_rgba(36,26,18,0.45)]">
        <BookCover src={book.coverUrl} title={book.title} rounded="md" hoverZoom />
      </div>
      <div className="px-1">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug tracking-tight text-foreground">
          {book.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {book.authorText}
        </p>
        {book.firstPublishYear && (
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">
            {book.firstPublishYear}
          </p>
        )}
      </div>
    </button>
  );
}
