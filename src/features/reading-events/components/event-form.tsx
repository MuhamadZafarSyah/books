"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import {
  createReadingEvent,
  updateReadingEvent,
} from "@/actions/reading-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EventMapPicker } from "@/features/reading-events/components/event-map-picker";
import {
  createEventSchema,
  updateEventSchema,
  type EventFormValues,
} from "@/features/reading-events/schemas/reading-event-schemas";
import { cn } from "@/lib/utils";
import { DateTimePicker } from "@/components/ui/date-time-picker";

/**
 * Bentuk nilai field yang sebenarnya disimpan di state `react-hook-form`.
 *
 * Berbeda dari `EventFormValues` (output skema Zod): kolom waktu di sini
 * berupa `string` karena `<input type="datetime-local">` selalu menghasilkan
 * string `YYYY-MM-DDTHH:mm`. `z.coerce.date()` di skema akan meng-coerce
 * string tersebut menjadi `Date` saat validasi & submit. Nilai numerik
 * lat/lng dan `quota` dapat berupa `undefined` saat form pertama dirender
 * (sebelum Host memilih titik di peta atau mengetik kuota).
 */
type EventFormFieldValues = {
  title: string;
  description?: string;
  locationAddress: string;
  latitude?: number;
  longitude?: number;
  startsAt: string;
  endsAt: string;
  quota?: number;
  bookReferenceUrl?: string;
};

type EventFormDefaults = Partial<{
  title: string;
  description: string | null;
  locationAddress: string;
  latitude: number;
  longitude: number;
  startsAt: string | Date;
  endsAt: string | Date;
  quota: number;
  bookReferenceUrl: string | null;
}>;

export type EventFormProps =
  | {
    mode: "create";
    defaultValues?: EventFormDefaults;
  }
  | {
    mode: "edit";
    eventId: string;
    defaultValues: EventFormDefaults;
  };

const DESCRIPTION_MAX = 2000;
const TITLE_MAX = 120;

/**
 * Event_Form (Requirement 1.2–1.6, 8.1–8.6).
 *
 * Komponen klien yang menyatukan input judul, deskripsi, waktu, kuota,
 * tautan referensi buku, dan `EventMapPicker` dalam satu form
 * `react-hook-form`. Skema Zod yang sama dengan server action dipakai sebagai
 * resolver agar pesan validasi konsisten antara klien dan server.
 *
 * - Mode `"create"` memakai `createEventSchema` (memuat aturan
 *   "waktu mulai harus di masa depan").
 * - Mode `"edit"` memakai `updateEventSchema`; aturan "waktu mulai harus di
 *   masa depan" dievaluasi di server hanya bila nilai berubah.
 *
 * Layout `grid-cols-1 lg:grid-cols-2` (Requirement 12.2): kolom kiri berisi
 * input teks/waktu, kolom kanan berisi `EventMapPicker`. Tombol simpan
 * dinonaktifkan saat form invalid, koordinat belum terisi, atau submit
 * sedang berjalan.
 */
export function EventForm(props: EventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const schema = props.mode === "create" ? createEventSchema : updateEventSchema;

  // Cast diperlukan karena `zodResolver` menyimpulkan tipe input field dari
  // skema (yang menjadikan `latitude`/`longitude`/`quota`/tanggal sebagai
  // wajib/`Date`), sedangkan state field RHF menerima nilai sementara
  // sebelum koordinat dipilih dan menyimpan tanggal sebagai string
  // datetime-local. Skema tetap menjadi sumber kebenaran validasi.
  const resolver = zodResolver(schema) as unknown as Resolver<EventFormFieldValues>;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isValid },
  } = useForm<EventFormFieldValues>({
    resolver,
    mode: "onChange",
    defaultValues: {
      title: props.defaultValues?.title ?? "",
      description: props.defaultValues?.description ?? "",
      locationAddress: props.defaultValues?.locationAddress ?? "",
      latitude: props.defaultValues?.latitude,
      longitude: props.defaultValues?.longitude,
      startsAt: toLocalDatetimeInputValue(props.defaultValues?.startsAt),
      endsAt: toLocalDatetimeInputValue(props.defaultValues?.endsAt),
      quota: props.defaultValues?.quota,
      bookReferenceUrl: props.defaultValues?.bookReferenceUrl ?? "",
    },
  });

  // `EventMapPicker` mengisi koordinat & alamat lewat `setValue`. Field
  // tersebut tidak dipasang ke <input>, jadi kita daftarkan ke RHF sekali
  // agar tetap tervalidasi oleh resolver Zod.
  useEffect(() => {
    register("latitude", { valueAsNumber: true });
    register("longitude", { valueAsNumber: true });
    register("locationAddress");
  }, [register]);

  const watchedLatitude = useWatch({ control, name: "latitude" });
  const watchedLongitude = useWatch({ control, name: "longitude" });
  const watchedLocationAddress =
    useWatch({ control, name: "locationAddress" }) ?? "";
  const watchedDescription =
    useWatch({ control, name: "description" }) ?? "";

  const hasCoordinates =
    typeof watchedLatitude === "number" &&
    typeof watchedLongitude === "number" &&
    Number.isFinite(watchedLatitude) &&
    Number.isFinite(watchedLongitude);

  const submitDisabled = isPending || !isValid || !hasCoordinates;

  const onSubmit = (raw: EventFormFieldValues) => {
    // Resolver sudah memvalidasi, tetapi untuk mendapatkan `EventFormValues`
    // yang ter-coerce (mis. `Date` untuk startsAt/endsAt) kita parse ulang
    // dengan skema yang sama sebelum mengirim ke server action.
    let parsed: EventFormValues;
    try {
      parsed = schema.parse(raw);
    } catch {
      // Tidak akan terjadi karena resolver memblokir submit pada form invalid;
      // tetap aman: tampilkan toast generic dan keluar.
      toast.error("Form tidak valid.");
      return;
    }

    startTransition(async () => {
      try {
        if (props.mode === "create") {
          const { eventId } = await createReadingEvent(parsed);
          toast.success("Agenda baca berhasil dibuat.");
          router.push(`/dashboard/events/${eventId}`);
          router.refresh();
        } else {
          await updateReadingEvent(props.eventId, parsed);
          toast.success("Agenda baca diperbarui.");
          router.push(`/dashboard/events/${props.eventId}`);
          router.refresh();
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Gagal menyimpan agenda baca.",
        );
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      noValidate
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column — informasi tekstual & waktu */}
        <div className="space-y-5">
          <FieldGroup
            id="event-title"
            label="Judul"
            error={errors.title?.message}
          >
            <Input
              id="event-title"
              type="text"
              placeholder="Mis. Baca bareng di Perpusnas"
              autoComplete="off"
              maxLength={TITLE_MAX}
              disabled={isPending}
              aria-invalid={Boolean(errors.title)}
              {...register("title")}
            />
          </FieldGroup>

          <FieldGroup
            id="event-description"
            label="Deskripsi (opsional)"
            error={errors.description?.message}
            hint={`${watchedDescription.length}/${DESCRIPTION_MAX}`}
          >
            <textarea
              id="event-description"
              rows={5}
              placeholder="Ceritakan suasana, buku yang akan dibaca, atau hal yang perlu dipersiapkan."
              maxLength={DESCRIPTION_MAX}
              disabled={isPending}
              aria-invalid={Boolean(errors.description)}
              className={cn(
                "min-h-[7rem] w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors",
                "placeholder:text-muted-foreground",
                "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
              {...register("description")}
            />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup
              id="event-starts-at"
              label="Waktu mulai"
              error={errors.startsAt?.message}
            >
              <Controller
                control={control}
                name="startsAt"
                render={({ field }) => (
                  <DateTimePicker
                    id="event-starts-at"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isPending}
                    aria-invalid={Boolean(errors.startsAt)}
                  />
                )}
              />

            </FieldGroup>
            <FieldGroup
              id="event-ends-at"
              label="Waktu selesai"
              error={errors.endsAt?.message}
            >
              <Controller
                control={control}
                name="endsAt"
                render={({ field }) => (
                  <DateTimePicker
                    id="event-ends-at"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isPending}
                    aria-invalid={Boolean(errors.endsAt)}
                  />
                )}
              />
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup
              id="event-quota"

              label="Kuota peserta (Termasuk Anda sebagai Host)"
              error={errors.quota?.message}
            >
              <Input
                id="event-quota"
                type="number"
                inputMode="numeric"
                min={2}
                max={100}
                step={1}
                placeholder="2 – 100"
                disabled={isPending}
                aria-invalid={Boolean(errors.quota)}
                {...register("quota", { valueAsNumber: true })}
              />
            </FieldGroup>

            <FieldGroup
              id="event-book-reference-url"
              label="Tautan Open Library (opsional)"
              error={errors.bookReferenceUrl?.message}
            >
              <Input
                id="event-book-reference-url"
                type="url"
                placeholder="https://openlibrary.org/works/..."
                autoComplete="off"
                disabled={isPending}
                aria-invalid={Boolean(errors.bookReferenceUrl)}
                {...register("bookReferenceUrl")}
              />
            </FieldGroup>
          </div>
        </div>

        {/* Right column — peta + alamat */}
        <div className="space-y-3">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Lokasi
          </Label>
          <EventMapPicker
            latitude={watchedLatitude}
            longitude={watchedLongitude}
            locationAddress={watchedLocationAddress}
            disabled={isPending}
            onChange={({ latitude, longitude, locationAddress }) => {
              setValue("latitude", latitude, {
                shouldValidate: true,
                shouldDirty: true,
              });
              setValue("longitude", longitude, {
                shouldValidate: true,
                shouldDirty: true,
              });
              setValue("locationAddress", locationAddress, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
          />
          {errors.locationAddress?.message ? (
            <p className="text-xs text-destructive">
              {errors.locationAddress.message}
            </p>
          ) : null}
          {(errors.latitude?.message || errors.longitude?.message) &&
            !hasCoordinates ? (
            <p className="text-xs text-destructive">
              Pilih satu titik pada peta atau isi koordinat manual saat peta
              tidak tersedia.
            </p>
          ) : null}
        </div>
      </div>

      {/* Action row */}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Button
          asChild
          type="button"
          variant="ghost"
          size="sm"
          className="cursor-pointer"
        >
          <Link href={cancelHref(props)}>
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Batal
          </Link>
        </Button>

        <Button
          type="submit"
          size="sm"
          disabled={submitDisabled}
          className="cursor-pointer"
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="size-3.5" />
          )}
          {props.mode === "create" ? "Buat agenda" : "Simpan perubahan"}
        </Button>
      </div>
    </form>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function FieldGroup({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
      >
        {label}
      </Label>
      {children}
      <div className="flex min-h-[1.25rem] items-start justify-between gap-3 text-xs">
        <span
          className={cn(
            "text-destructive",
            !error && "invisible select-none",
          )}
        >
          {error ?? "placeholder"}
        </span>
        {hint ? (
          <span className="shrink-0 text-muted-foreground">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Format `Date | string | undefined` ke string `YYYY-MM-DDTHH:mm` yang
 * diterima `<input type="datetime-local">`. Mengembalikan string kosong
 * untuk nilai kosong/invalid agar form tetap dapat dirender tanpa error.
 *
 * Konversi memakai komponen tanggal lokal (bukan `toISOString()`) karena
 * `datetime-local` merepresentasikan waktu lokal, bukan UTC.
 */
function toLocalDatetimeInputValue(value: string | Date | undefined): string {
  if (value === undefined || value === null) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function cancelHref(props: EventFormProps): string {
  if (props.mode === "edit") {
    return `/dashboard/events/${props.eventId}`;
  }
  return "/dashboard/events";
}
