import type { UserActivityType } from "@prisma/client";

/**
 * Bobot poin awal per jenis aktivitas (sesuai `leaderboard_plan.md`).
 *
 * Disimpan sebagai `Record<UserActivityType, number>` agar TypeScript memaksa
 * setiap aktivitas baru di enum mendapat bobot ketika ditambahkan di
 * Prisma — kalau enum bertambah tanpa entri di sini, build akan gagal.
 */
export const ACTIVITY_POINTS: Record<UserActivityType, number> = {
  READING_CIRCLE_CREATED: 40,
  READING_CIRCLE_JOINED: 12,
  READING_CIRCLE_POST_CREATED: 14,
  READING_CIRCLE_COMMENT_CREATED: 6,
  READING_EVENT_CREATED: 32,
  READING_EVENT_JOINED: 10,
  BOOK_REVIEW_CREATED: 24,
  USER_FOLLOW_CREATED: 4,
};

/**
 * Cap harian per user untuk aktivitas yang mudah di-spam.
 *
 * Aktivitas yang tidak ada di sini berarti tidak punya cap harian dan
 * boleh dicatat selama dedupeKey-nya unik.
 */
export const ACTIVITY_DAILY_CAP: Partial<Record<UserActivityType, number>> = {
  READING_CIRCLE_COMMENT_CREATED: 8,
  READING_CIRCLE_POST_CREATED: 5,
  USER_FOLLOW_CREATED: 10,
};

export type ScopeKey = "overall" | "circles" | "events" | "reviews" | "social";

/**
 * Pemetaan aktivitas ke kategori scope yang dipakai di filter leaderboard.
 *
 * Nilai `OVERALL` selalu mencakup semua kategori; di sini kita hanya
 * memetakan kategori spesifik (circles/events/reviews/social) supaya
 * query bisa membatasi `where type IN (...)`.
 */
export const ACTIVITY_SCOPE: Record<UserActivityType, Exclude<ScopeKey, "overall">> = {
  READING_CIRCLE_CREATED: "circles",
  READING_CIRCLE_JOINED: "circles",
  READING_CIRCLE_POST_CREATED: "circles",
  READING_CIRCLE_COMMENT_CREATED: "circles",
  READING_EVENT_CREATED: "events",
  READING_EVENT_JOINED: "events",
  BOOK_REVIEW_CREATED: "reviews",
  USER_FOLLOW_CREATED: "social",
};

/**
 * Daftar `UserActivityType` per scope. Dipakai oleh query dan API scoring
 * untuk membangun filter `IN (...)` tanpa menebak-nebak.
 */
export const SCOPE_ACTIVITY_TYPES: Record<
  Exclude<ScopeKey, "overall">,
  UserActivityType[]
> = {
  circles: [
    "READING_CIRCLE_CREATED",
    "READING_CIRCLE_JOINED",
    "READING_CIRCLE_POST_CREATED",
    "READING_CIRCLE_COMMENT_CREATED",
  ],
  events: ["READING_EVENT_CREATED", "READING_EVENT_JOINED"],
  reviews: ["BOOK_REVIEW_CREATED"],
  social: ["USER_FOLLOW_CREATED"],
};

/**
 * Label dan catatan Bahasa Indonesia per aktivitas.
 *
 * Dipakai oleh endpoint `/api/leaderboard/scoring` untuk panel
 * "Cara perhitungan" pada UI agar copy konsisten dan terpusat.
 */
export const ACTIVITY_LABELS: Record<
  UserActivityType,
  { label: string; notes?: string }
> = {
  READING_CIRCLE_CREATED: {
    label: "Membuat circle baca",
    notes: "Aksi sosial bernilai tinggi karena memicu diskusi baru.",
  },
  READING_CIRCLE_JOINED: {
    label: "Join circle baca",
    notes: "Hanya dihitung sekali per circle.",
  },
  READING_CIRCLE_POST_CREATED: {
    label: "Membuat post diskusi",
    notes: "Maksimal 5 post ber-poin per hari.",
  },
  READING_CIRCLE_COMMENT_CREATED: {
    label: "Membuat komentar circle",
    notes: "Maksimal 8 komentar ber-poin per hari.",
  },
  READING_EVENT_CREATED: {
    label: "Membuat agenda baca",
    notes: "Aksi host bernilai tinggi.",
  },
  READING_EVENT_JOINED: {
    label: "Join agenda baca",
    notes: "Hanya dihitung sekali per event.",
  },
  BOOK_REVIEW_CREATED: {
    label: "Menulis review buku",
    notes: "Hanya saat review pertama untuk buku tersebut.",
  },
  USER_FOLLOW_CREATED: {
    label: "Follow pembaca lain",
    notes: "Maksimal 10 follow ber-poin per hari.",
  },
};
