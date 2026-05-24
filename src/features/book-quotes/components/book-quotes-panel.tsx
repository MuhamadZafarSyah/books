"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Plus, Quote } from "lucide-react";

import { ensureLocalBookFromResult } from "@/actions/book-reviews";
import { getMyBookQuotesForBook } from "@/actions/book-quotes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuoteCard } from "@/features/book-quotes/components/quote-card";
import { QuoteFormDialog } from "@/features/book-quotes/components/quote-form-dialog";
import type { BookQuoteSummary } from "@/features/book-quotes/types";
import type { BookResult } from "@/features/books/types";

type BookQuotesPanelProps = {
  /** BookResult dari Open Library — akan di-resolve ke local Book ID. */
  book: BookResult;
};

export function BookQuotesPanel({ book }: BookQuotesPanelProps) {
  const [localBookId, setLocalBookId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<BookQuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<BookQuoteSummary | null>(
    null,
  );
  const [, startTransition] = useTransition();
  const resolvedRef = useRef(false);

  // Resolve Open Library book ke local database Book ID
  const resolveAndFetch = useCallback(() => {
    startTransition(async () => {
      try {
        // Ensure book exists locally (creates if not found)
        const { bookId } = await ensureLocalBookFromResult(book);
        setLocalBookId(bookId);
        resolvedRef.current = true;

        // Fetch quotes for this book
        const data = await getMyBookQuotesForBook(bookId);
        setQuotes(data);
      } catch {
        // Silently fail — user might not be logged in or book invalid
      } finally {
        setLoading(false);
      }
    });
  }, [book]);

  useEffect(() => {
    resolveAndFetch();
  }, [resolveAndFetch]);

  const fetchQuotes = useCallback(() => {
    if (!localBookId) return;
    startTransition(async () => {
      try {
        const data = await getMyBookQuotesForBook(localBookId);
        setQuotes(data);
      } catch {
        // Silently fail
      }
    });
  }, [localBookId]);

  const handleEdit = (quote: BookQuoteSummary) => {
    setEditingQuote(quote);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingQuote(null);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Quote aria-hidden="true" className="size-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Kutipan saya</h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!localBookId}
          onClick={() => {
            setEditingQuote(null);
            setDialogOpen(true);
          }}
          className="cursor-pointer gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Tambah
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : quotes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
          Belum ada kutipan dari buku ini. Simpan kalimat yang ingin kamu ingat.
        </p>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              editable
              onEdit={handleEdit}
              onDeleted={fetchQuotes}
            />
          ))}
        </div>
      )}

      {localBookId ? (
        <QuoteFormDialog
          bookId={localBookId}
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          editingQuote={editingQuote}
          onSaved={fetchQuotes}
        />
      ) : null}
    </section>
  );
}
