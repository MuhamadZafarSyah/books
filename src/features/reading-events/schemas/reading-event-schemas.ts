import { z } from "zod";

/**
 * Skema Zod untuk fitur Reading Events.
 *
 * Skema ini dipakai bersama oleh Client Component (lewat `zodResolver`
 * react-hook-form) dan oleh server actions (lewat `schema.parse`) sehingga
 * pesan validasi konsisten antara dua sisi.
 *
 * Pesan validasi sengaja menyebut nama field yang sama dengan dokumen
 * requirements: "judul", "kuota", "waktu mulai", "waktu selesai", "komentar".
 */

const OPEN_LIBRARY_HOSTNAME_PATTERN = /(^|\.)openlibrary\.org$/i;

function isBlankOrOpenLibraryUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    return OPEN_LIBRARY_HOSTNAME_PATTERN.test(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Skema dasar Event_Form. Menerima semua field create/update kecuali
 * pengecekan silang antar tanggal — itu dilakukan di `superRefine` pada
 * skema turunan agar `eventFormBaseSchema` tetap bisa di-`extend` di
 * masa depan tanpa kehilangan refinement.
 */
export const eventFormBaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Judul wajib diisi.")
    .max(120, "Judul maksimal 120 karakter."),
  description: z
    .string()
    .trim()
    .max(2000, "Deskripsi maksimal 2000 karakter.")
    .optional()
    .or(z.literal("")),
  locationAddress: z
    .string()
    .trim()
    .min(1, "Alamat lokasi wajib diisi.")
    .max(200, "Alamat maksimal 200 karakter."),
  latitude: z
    .number({ message: "Latitude wajib diisi." })
    .gte(-90, "Latitude tidak valid.")
    .lte(90, "Latitude tidak valid."),
  longitude: z
    .number({ message: "Longitude wajib diisi." })
    .gte(-180, "Longitude tidak valid.")
    .lte(180, "Longitude tidak valid."),
  startsAt: z.coerce.date({ message: "Waktu mulai wajib diisi." }),
  endsAt: z.coerce.date({ message: "Waktu selesai wajib diisi." }),
  quota: z
    .number({ message: "Kuota wajib diisi." })
    .int("Kuota harus berupa bilangan bulat.")
    .gte(2, "Kuota minimal 2.")
    .lte(100, "Kuota maksimal 100."),
  bookReferenceUrl: z
    .string()
    .trim()
    .max(500, "Tautan referensi buku terlalu panjang.")
    .refine(
      isBlankOrOpenLibraryUrl,
      "Tautan referensi buku harus URL Open Library yang valid.",
    )
    .optional()
    .or(z.literal("")),
});

/**
 * Skema pembuatan Event. Menambahkan dua aturan silang:
 * - `endsAt` harus lebih lambat dari `startsAt`
 * - `startsAt` harus berada di masa depan saat submit
 */
export const createEventSchema = eventFormBaseSchema.superRefine((value, ctx) => {
  if (value.endsAt.getTime() <= value.startsAt.getTime()) {
    ctx.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: "Waktu selesai harus setelah waktu mulai.",
    });
  }
  if (value.startsAt.getTime() <= Date.now()) {
    ctx.addIssue({
      code: "custom",
      path: ["startsAt"],
      message: "Waktu mulai harus di masa depan.",
    });
  }
});

/**
 * Skema pembaruan Event. Hanya menegakkan `endsAt > startsAt`.
 *
 * Aturan "waktu mulai harus di masa depan" tidak berlaku di skema ini agar
 * Host masih bisa memperbarui field lain pada Event yang waktu mulainya
 * sudah dekat tanpa menyentuh `startsAt`. Pengecekan terhadap "perubahan
 * `startsAt` ke masa lalu" dilakukan di server action `updateReadingEvent`
 * (Requirement 8.6) yang punya akses ke nilai semula.
 */
export const updateEventSchema = eventFormBaseSchema.superRefine((value, ctx) => {
  if (value.endsAt.getTime() <= value.startsAt.getTime()) {
    ctx.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: "Waktu selesai harus setelah waktu mulai.",
    });
  }
});

/**
 * Skema dialog Join. Komentar bersifat opsional dan dibatasi 280 karakter
 * setelah trim.
 */
export const joinEventSchema = z.object({
  comment: z
    .string()
    .trim()
    .max(280, "Komentar maksimal 280 karakter.")
    .optional()
    .or(z.literal("")),
});

export type EventFormValues = z.infer<typeof eventFormBaseSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type JoinEventInput = z.infer<typeof joinEventSchema>;
