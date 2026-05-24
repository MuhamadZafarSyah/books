"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpen, Plus, Quote } from "lucide-react";

import { getMyBookQuotesForBook } from "@/actions/book-quotes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuoteCard } from "@/features/book-quotes/components/quote-card";
import { QuoteFormDialog } from "@/features/book-quotes/components/quote-form-dialog";
import type { BookQuoteSummary } from "@/features/book-quotes/types";

type BookQuotesShellProps = {
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
  };
};

export function BookQuotesShell({ book }: BookQuotesShellProps) {
  const [quotes, setQuotes] = useState<BookQuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<BookQuoteSummary | null>(
    null,
  );
  const [, startTransition] = useTransition();

  const fetchQuotes = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getMyBookQuotesForBook(book.id);
        setQuotes(data);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    });
  }, [book.id]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const handleEdit = (quote: BookQuoteSummary) => {
    setEditingQuote(quote);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingQuote(null);
  };

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <header className="space-y-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="cursor-pointer gap-1.5 text-muted-foreground"
        >
          <Link href="/dashboard/explore">
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Kembali ke Jelajahi
          </Link>
        </Button>

        {/* Book info with cover */}
        <div className="flex items-start gap-4">
          <div className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-16">
            {book.coverUrl ? (
              <Image
                src={book.coverUrl}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <span className="flex size-full items-center justify-center">
                <BookOpen aria-hidden="true" className="size-5 text-muted-foreground/60" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Kutipan
            </h1>
            <p className="line-clamp-1 text-sm text-foreground">{book.title}</p>
            <p className="text-xs text-muted-foreground">{book.author}</p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingQuote(null);
              setDialogOpen(true);
            }}
            className="cursor-pointer shrink-0"
          >
            <Plus aria-hidden="true" className="size-3.5" />
            Tambah
          </Button>
        </div>
      </header>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 px-4 py-12 text-center">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Quote aria-hidden="true" className="size-5" />
          </span>
          <h2 className="text-sm font-medium text-foreground">
            Belum ada kutipan
          </h2>
          <p className="max-w-sm text-xs text-muted-foreground">
            Simpan kalimat yang ingin kamu ingat dari buku ini, lalu bagikan ke
            circle saat siap berdiskusi.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingQuote(null);
              setDialogOpen(true);
            }}
            className="mt-2 cursor-pointer"
          >
            <Plus aria-hidden="true" className="size-3.5" />
            Simpan kutipan pertama
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {quotes.map((quote) => (
            <li key={quote.id}>
              <QuoteCard
                quote={quote}
                editable
                onEdit={handleEdit}
                onDeleted={fetchQuotes}
              />
            </li>
          ))}
        </ul>
      )}

      <QuoteFormDialog
        bookId={book.id}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingQuote={editingQuote}
        onSaved={fetchQuotes}
      />
    </div>
  );
}
