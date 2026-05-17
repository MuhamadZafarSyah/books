"use client";

import { useEffect, useTransition } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { joinReadingEvent } from "@/actions/reading-events";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  joinEventSchema,
  type JoinEventInput,
} from "@/features/reading-events/schemas/reading-event-schemas";
import type { ReadingEventDetail } from "@/features/reading-events/types";
import { cn } from "@/lib/utils";

const COMMENT_MAX = 280;

/**
 * Bentuk nilai field internal `react-hook-form` untuk dialog Join.
 *
 * Berbeda dari output skema (`JoinEventInput`) yang dapat berupa
 * `string | undefined`, internal form selalu memakai `string` agar
 * `<textarea>` controlled bekerja konsisten. Saat submit, kita panggil
 * `joinEventSchema.parse` lewat `zodResolver` sehingga nilai final yang
 * dikirim ke server action sudah ter-trim dan tervalidasi.
 */
type JoinDialogFieldValues = {
  comment: string;
};

export type EventJoinDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (detail: ReadingEventDetail) => void;
};

/**
 * Dialog konfirmasi Join (Requirement 5.1, 5.2, 5.3).
 *
 * Memuat textarea Join_Comment opsional dengan counter `≤ 280` karakter
 * (Requirement 5.3) dan tombol konfirmasi yang memanggil server action
 * `joinReadingEvent`. Validasi memakai skema `joinEventSchema` lewat
 * `zodResolver` sehingga pesan validasi (mis. "Komentar maksimal 280
 * karakter.") sama persis dengan validasi server.
 *
 * Komponen sengaja controlled (`open` + `onOpenChange`) supaya parent
 * (Event_Detail_Actions) bisa membuka dialog dari tombol Join dan
 * menutupnya secara terpadu setelah server action sukses. Hasil
 * `ReadingEventDetail` yang dikembalikan server diteruskan lewat
 * `onSuccess` agar parent dapat memperbarui state lokal tanpa reload
 * halaman penuh (Requirement 5.5).
 */
export function EventJoinDialog({
  eventId,
  open,
  onOpenChange,
  onSuccess,
}: EventJoinDialogProps) {
  const [isPending, startTransition] = useTransition();

  // Cast diperlukan karena skema Zod menjadikan `comment` `string | undefined`
  // sedangkan field internal RHF selalu memakai `string` agar `<textarea>`
  // tetap controlled. Skema tetap menjadi sumber kebenaran validasi pesan.
  const resolver = zodResolver(joinEventSchema) as unknown as Resolver<JoinDialogFieldValues>;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<JoinDialogFieldValues>({
    resolver,
    mode: "onChange",
    defaultValues: { comment: "" },
  });

  // Pakai `useWatch` (bukan `watch()`) agar re-render counter terisolasi
  // di komponen ini saja — pola sama dengan `EditProfileForm`.
  const commentValue = useWatch({ control, name: "comment" }) ?? "";

  // Reset form setiap kali dialog ditutup agar input kosong saat dibuka
  // kembali untuk event lain.
  useEffect(() => {
    if (!open) {
      reset({ comment: "" });
    }
  }, [open, reset]);

  const onSubmit = (raw: JoinDialogFieldValues) => {
    let parsed: JoinEventInput;
    try {
      parsed = joinEventSchema.parse(raw);
    } catch {
      // Resolver semestinya sudah memblokir submit, tetap aman: tampilkan
      // toast generic dan keluar.
      toast.error("Form tidak valid.");
      return;
    }

    startTransition(async () => {
      try {
        const detail = await joinReadingEvent(eventId, parsed);
        toast.success("Berhasil bergabung ke agenda baca.");
        onSuccess(detail);
        onOpenChange(false);
        reset({ comment: "" });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Gagal bergabung ke agenda baca.",
        );
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Cegah penutupan dialog saat submit sedang berjalan agar pengguna
        // tidak tersesat antara state pending dan dialog yang menutup.
        if (isPending && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bergabung ke agenda baca</DialogTitle>
          <DialogDescription>
            Tambahkan komentar singkat (opsional) agar Host dan peserta lain
            mengenal Anda.
          </DialogDescription>
        </DialogHeader>

        <form
          id="event-join-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3"
          noValidate
        >
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor="event-join-comment"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              Komentar (opsional)
            </Label>
            <span
              aria-live="polite"
              className={cn(
                "text-xs tabular-nums text-muted-foreground",
                commentValue.length >= COMMENT_MAX && "text-destructive",
              )}
            >
              {commentValue.length}/{COMMENT_MAX}
            </span>
          </div>

          <textarea
            id="event-join-comment"
            rows={4}
            placeholder="Komentar (opsional)"
            maxLength={COMMENT_MAX}
            disabled={isPending}
            aria-invalid={Boolean(errors.comment)}
            className={cn(
              "min-h-[6rem] w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors",
              "placeholder:text-muted-foreground",
              "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
            {...register("comment")}
          />

          {errors.comment?.message ? (
            <p className="text-xs text-destructive">
              {errors.comment.message}
            </p>
          ) : null}
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              className="cursor-pointer"
            >
              Batal
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form="event-join-form"
            size="sm"
            disabled={isPending || !isValid}
            className="cursor-pointer"
          >
            {isPending ? (
              <Loader2
                aria-hidden="true"
                className="size-3.5 animate-spin"
              />
            ) : null}
            Bergabung
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
