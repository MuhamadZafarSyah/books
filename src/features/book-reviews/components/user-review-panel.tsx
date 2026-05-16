"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BookReviewForm } from "@/features/book-reviews/components/book-review-form";
import { RatingStars } from "@/features/book-reviews/components/rating-stars";
import type { BookReviewSummary } from "@/features/book-reviews/types";

type UserReviewPanelProps = {
  bookId: string;
  existing: BookReviewSummary | null;
};

function getInitials(name: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  return parts[0]?.slice(0, 2).toUpperCase() ?? "U";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function UserReviewPanel({ bookId, existing }: UserReviewPanelProps) {
  const [editing, setEditing] = useState(existing === null);

  if (!existing || editing) {
    return (
      <section className="rounded-2xl border border-border bg-card/70 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold tracking-tight">
              {existing ? "Edit review Anda" : "Tulis review Anda"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {existing
                ? "Perbarui rating atau perbaiki isi review Anda."
                : "Bagikan pemikiran Anda untuk membantu pembaca lain."}
            </p>
          </div>
          {existing && editing && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="cursor-pointer rounded-full"
              aria-label="Batal edit"
              onClick={() => setEditing(false)}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
        <Separator className="my-4" />
        <BookReviewForm
          bookId={bookId}
          existing={existing}
          onSaved={() => setEditing(false)}
        />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Review Anda
          </span>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Diperbarui {formatDate(existing.updatedAt)}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="cursor-pointer rounded-full"
          onClick={() => setEditing(true)}
        >
          <Pencil aria-hidden="true" className="size-3.5" />
          Edit
        </Button>
      </div>

      <div className="mt-4 flex items-start gap-3">
        <Avatar className="size-10 shrink-0">
          {existing.user.image && (
            <AvatarImage
              src={existing.user.image}
              alt={existing.user.name ?? "Avatar"}
            />
          )}
          <AvatarFallback className="text-[11px]">
            {getInitials(existing.user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-sm font-semibold text-foreground">
              {existing.user.name ?? "Pembaca"}
            </p>
            {existing.user.username && (
              <span className="text-xs text-muted-foreground">
                @{existing.user.username}
              </span>
            )}
          </div>
          <div className="mt-1">
            <RatingStars value={existing.rating} size="sm" />
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
            {existing.body}
          </p>
        </div>
      </div>
    </section>
  );
}
