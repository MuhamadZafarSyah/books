import { Quote } from "lucide-react";

import { SectionHeading } from "@/features/dashboard/components/overview/section-heading";
import type { BookQuoteSummary } from "@/features/book-quotes/types";

type ProfileQuotesListProps = {
  quotes: BookQuoteSummary[];
  emptyHint?: string;
};

export function ProfileQuotesList({
  quotes,
  emptyHint = "Belum ada kutipan yang dipublikasikan.",
}: ProfileQuotesListProps) {
  return (
    <section aria-labelledby="profile-quotes">
      <SectionHeading
        title="Kutipan favorit"
        description="Kalimat yang disimpan dari buku-buku yang dibaca."
      />

      {quotes.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ul className="mt-3 space-y-4">
          {quotes.map((quote) => (
            <li key={quote.id} className="border-l-2 border-primary/30 pl-4">
              <blockquote className="font-heading text-sm leading-relaxed text-foreground">
                &ldquo;{quote.quote}&rdquo;
              </blockquote>
              {quote.note ? (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  {quote.note}
                </p>
              ) : null}
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Quote aria-hidden="true" className="size-3" />
                <span>{quote.book.title}</span>
                <span>· {quote.book.author}</span>
                {quote.page ? <span>· hal. {quote.page}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
