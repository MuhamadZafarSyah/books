"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import {
  deleteBookReview,
  upsertBookReview,
} from "@/actions/book-reviews";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  bookReviewFormSchema,
  type BookReviewFormValues,
} from "@/features/book-reviews/schemas/book-review-schemas";
import { RatingInput } from "@/features/book-reviews/components/rating-input";
import { cn } from "@/lib/utils";
import type { BookReviewSummary } from "@/features/book-reviews/types";

type BookReviewFormProps = {
  bookId: string;
  existing: BookReviewSummary | null;
  onSaved?: () => void;
};

export function BookReviewForm({
  bookId,
  existing,
  onSaved,
}: BookReviewFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDeleteTransition] = useTransition();
  const isEditing = existing !== null;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BookReviewFormValues>({
    resolver: zodResolver(bookReviewFormSchema),
    defaultValues: {
      rating: existing?.rating ?? 0,
      body: existing?.body ?? "",
    },
  });

  const ratingValue = watch("rating") ?? 0;
  const bodyValue = watch("body") ?? "";

  // Wire rating into RHF manually because RatingInput is custom.
  register("rating", { valueAsNumber: true });

  const submit = (values: BookReviewFormValues) => {
    startTransition(async () => {
      try {
        await upsertBookReview(bookId, values);
        toast.success(isEditing ? "Review diperbarui." : "Review terkirim.");
        onSaved?.();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal menyimpan review.",
        );
      }
    });
  };

  const handleDelete = () => {
    if (!existing) return;
    if (!confirmDelete()) return;
    startDeleteTransition(async () => {
      try {
        await deleteBookReview(existing.id);
        toast.success("Review dihapus.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal menghapus review.",
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      <div className="space-y-2">
        <Label className="text-[10px] tracking-[0.18em] text-muted-foreground">
          Rating
        </Label>
        <RatingInput
          value={ratingValue}
          onChange={(next) =>
            setValue("rating", next, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          disabled={pending || deleting}
        />
        {errors.rating && (
          <p className="text-xs text-destructive">{errors.rating.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="review-body"
          className="text-[10px] tracking-[0.18em] text-muted-foreground"
        >
          Review
        </Label>
        <textarea
          id="review-body"
          rows={6}
          placeholder="Bagikan kesan Anda tentang buku ini..."
          className={cn(
            "min-h-[8rem] w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          )}
          disabled={pending || deleting}
          {...register("body")}
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{bodyValue.length}/4000</span>
          {errors.body && (
            <span className="text-destructive">{errors.body.message}</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          Mengirim review otomatis menandai buku ini sebagai{" "}
          <strong className="font-semibold text-foreground">selesai dibaca</strong>.
        </p>
        <div className="flex flex-wrap gap-2">
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={pending || deleting}
              className="cursor-pointer rounded-full text-destructive hover:text-destructive"
            >
              {deleting ? (
                <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
              ) : null}
              Hapus
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={pending || deleting}
            className="cursor-pointer rounded-full"
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="size-3.5" />
            )}
            {isEditing ? "Simpan perubahan" : "Kirim review"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function confirmDelete(): boolean {
  if (typeof window === "undefined") return false;
  return window.confirm(
    "Hapus review ini? Buku tetap akan dianggap sudah dibaca.",
  );
}
