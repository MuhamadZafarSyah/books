"use client";

import { useRef, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Quote } from "lucide-react";
import { toast } from "sonner";

import { createBookQuote, updateBookQuote } from "@/actions/book-quotes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  bookQuoteSchema,
  type BookQuoteFormValues,
} from "@/features/book-quotes/schemas/book-quote-schemas";
import type { BookQuoteSummary } from "@/features/book-quotes/types";

type QuoteFormDialogProps = {
  bookId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingQuote?: BookQuoteSummary | null;
  onSaved?: () => void;
};

export function QuoteFormDialog({
  bookId,
  open,
  onOpenChange,
  editingQuote,
  onSaved,
}: QuoteFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(editingQuote);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookQuoteFormValues>({
    resolver: zodResolver(bookQuoteSchema),
    defaultValues: {
      quote: "",
      note: "",
      page: "",
      chapter: "",
      visibility: "PRIVATE" as const,
      isFavorite: false,
    },
  });

  // Reset form values saat dialog dibuka atau editingQuote berubah
  const openRef = useRef(open);
  if (openRef.current !== open) {
    openRef.current = open;
    if (open) {
      reset(
        editingQuote
          ? {
              quote: editingQuote.quote,
              note: editingQuote.note ?? "",
              page: editingQuote.page?.toString() ?? "",
              chapter: editingQuote.chapter ?? "",
              visibility: editingQuote.visibility,
              isFavorite: editingQuote.isFavorite,
            }
          : {
              quote: "",
              note: "",
              page: "",
              chapter: "",
              visibility: "PRIVATE",
              isFavorite: false,
            },
      );
    }
  }

  const visibility = watch("visibility");

  function onSubmit(values: BookQuoteFormValues) {
    startTransition(async () => {
      try {
        if (isEditing && editingQuote) {
          await updateBookQuote(editingQuote.id, values);
          toast.success("Kutipan diperbarui.");
        } else {
          await createBookQuote(bookId, values);
          toast.success("Kutipan disimpan.");
        }
        reset();
        onOpenChange(false);
        onSaved?.();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal menyimpan kutipan.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg normal-case tracking-normal">
            <Quote aria-hidden="true" className="size-4 text-primary" />
            {isEditing ? "Edit kutipan" : "Simpan kutipan"}
          </DialogTitle>
          <DialogDescription>
            Simpan kalimat yang ingin kamu ingat dari buku ini.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="quote" className="text-xs text-muted-foreground">
              Kutipan
            </Label>
            <textarea
              id="quote"
              rows={3}
              placeholder="Tulis kalimat yang ingin kamu simpan..."
              disabled={isPending}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
              {...register("quote")}
            />
            {errors.quote ? (
              <p className="text-xs text-destructive">{errors.quote.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs text-muted-foreground">
              Catatan pribadi{" "}
              <span className="text-muted-foreground/60">(opsional)</span>
            </Label>
            <textarea
              id="note"
              rows={2}
              placeholder="Apa yang membuat kutipan ini menarik?"
              disabled={isPending}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
              {...register("note")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="page" className="text-xs text-muted-foreground">
                Halaman{" "}
                <span className="text-muted-foreground/60">(opsional)</span>
              </Label>
              <Input
                id="page"
                type="number"
                min={1}
                placeholder="42"
                disabled={isPending}
                className="h-9"
                {...register("page")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chapter" className="text-xs text-muted-foreground">
                Chapter{" "}
                <span className="text-muted-foreground/60">(opsional)</span>
              </Label>
              <Input
                id="chapter"
                placeholder="Bab 3"
                disabled={isPending}
                className="h-9"
                {...register("chapter")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Visibilitas</Label>
            <Select
              value={visibility}
              onValueChange={(v) =>
                setValue("visibility", v as "PRIVATE" | "FOLLOWERS" | "PUBLIC")
              }
              disabled={isPending}
            >
              <SelectTrigger className="h-9 min-w-[7.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">Privat</SelectItem>
                <SelectItem value="FOLLOWERS">Pengikut</SelectItem>
                <SelectItem value="PUBLIC">Publik</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isFavorite"
              className="size-4 cursor-pointer rounded border-input accent-primary"
              {...register("isFavorite")}
            />
            <Label
              htmlFor="isFavorite"
              className="cursor-pointer text-xs text-muted-foreground"
            >
              Tandai sebagai favorit
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="cursor-pointer"
            >
              {isPending ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : null}
              {isEditing ? "Perbarui" : "Simpan kutipan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
