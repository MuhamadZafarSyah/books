"use client";

import { useTransition } from "react";
import { Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteBookQuote } from "@/actions/book-quotes";
import { Button } from "@/components/ui/button";
import type { BookQuoteSummary } from "@/features/book-quotes/types";

type QuoteCardProps = {
  quote: BookQuoteSummary;
  editable?: boolean;
  onEdit?: (quote: BookQuoteSummary) => void;
  onDeleted?: () => void;
};

export function QuoteCard({
  quote,
  editable = false,
  onEdit,
  onDeleted,
}: QuoteCardProps) {
  const [deleting, startDelete] = useTransition();

  const handleDelete = () => {
    startDelete(async () => {
      try {
        await deleteBookQuote(quote.id);
        toast.success("Kutipan dihapus.");
        onDeleted?.();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal menghapus kutipan.",
        );
      }
    });
  };

  return (
    <article className="group relative border-l-2 border-primary/30 py-2 pl-4">
      {quote.isFavorite ? (
        <Star
          aria-label="Favorit"
          className="absolute -left-[9px] top-3 size-4 fill-primary text-primary"
        />
      ) : null}

      <blockquote className="font-heading text-sm leading-relaxed text-foreground">
        &ldquo;{quote.quote}&rdquo;
      </blockquote>

      {quote.note ? (
        <p className="mt-1.5 text-xs italic text-muted-foreground">
          {quote.note}
        </p>
      ) : null}

      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{quote.book.title}</span>
        {quote.page ? <span>· hal. {quote.page}</span> : null}
        {quote.chapter ? <span>· {quote.chapter}</span> : null}
      </div>

      {editable ? (
        <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onEdit?.(quote)}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label="Edit kutipan"
          >
            <Pencil aria-hidden="true" className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleDelete}
            disabled={deleting}
            className="cursor-pointer text-muted-foreground hover:text-destructive"
            aria-label="Hapus kutipan"
          >
            <Trash2 aria-hidden="true" className="size-3" />
          </Button>
        </div>
      ) : null}
    </article>
  );
}
