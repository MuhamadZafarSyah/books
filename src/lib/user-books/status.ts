import type { UserBookStatus, UserBookVisibility } from "@prisma/client";

/**
 * Konstanta + helper untuk status & visibility `UserBook`.
 *
 * Disimpan terpusat agar UI dropdown, badge di rak, label di feed, dan
 * server action validasi memakai daftar yang sama. Saat status baru
 * ditambahkan ke schema Prisma, hanya file ini yang perlu disesuaikan.
 */

export const USER_BOOK_STATUS_VALUES = [
  "WANT_TO_READ",
  "TO_BE_READ",
  "READING",
  "FINISHED",
  "ON_HOLD",
  "ABANDONED",
] as const satisfies readonly UserBookStatus[];

export const USER_BOOK_VISIBILITY_VALUES = [
  "PRIVATE",
  "PUBLIC",
  "FOLLOWERS",
] as const satisfies readonly UserBookVisibility[];

export type UserBookStatusMeta = {
  value: UserBookStatus;
  label: string;
  shortLabel: string;
  description: string;
  /** Tone class untuk badge / pill (sesuai token Stitch). */
  tone: string;
};

export type UserBookVisibilityMeta = {
  value: UserBookVisibility;
  label: string;
  description: string;
};

export const USER_BOOK_STATUS_META: Record<UserBookStatus, UserBookStatusMeta> = {
  WANT_TO_READ: {
    value: "WANT_TO_READ",
    label: "Ingin Dibaca",
    shortLabel: "Wishlist",
    description: "Buku yang menarik tapi belum direncanakan untuk dibaca.",
    tone: "bg-muted text-muted-foreground",
  },
  TO_BE_READ: {
    value: "TO_BE_READ",
    label: "Antrian Baca",
    shortLabel: "Antrian",
    description: "Sudah masuk daftar siap dibaca, menunggu giliran.",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  READING: {
    value: "READING",
    label: "Sedang Dibaca",
    shortLabel: "Berjalan",
    description: "Sedang dalam progres membaca.",
    tone: "bg-primary/15 text-primary",
  },
  FINISHED: {
    value: "FINISHED",
    label: "Selesai Dibaca",
    shortLabel: "Selesai",
    description: "Tuntas dibaca.",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  ON_HOLD: {
    value: "ON_HOLD",
    label: "Ditunda",
    shortLabel: "Ditunda",
    description: "Sengaja dijeda dan akan dilanjut nanti.",
    tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  ABANDONED: {
    value: "ABANDONED",
    label: "Ditinggalkan",
    shortLabel: "Ditinggalkan",
    description: "Sudah diputuskan tidak akan dilanjut.",
    tone: "bg-destructive/10 text-destructive",
  },
};

export const USER_BOOK_VISIBILITY_META: Record<
  UserBookVisibility,
  UserBookVisibilityMeta
> = {
  PRIVATE: {
    value: "PRIVATE",
    label: "Privat",
    description: "Hanya kamu yang bisa melihat di rak ini.",
  },
  PUBLIC: {
    value: "PUBLIC",
    label: "Publik",
    description: "Semua pembaca dapat melihat di profil publikmu.",
  },
  FOLLOWERS: {
    value: "FOLLOWERS",
    label: "Pengikut",
    description: "Hanya pengikutmu yang bisa melihat.",
  },
};

/**
 * Daftar status yang dianggap "sudah pernah dibuka". Dipakai saat
 * mengisi `startedAt` otomatis: status seperti `READING`, `ON_HOLD`,
 * `ABANDONED`, atau `FINISHED` mengindikasikan buku sudah pernah disentuh
 * sehingga `startedAt` perlu ditandai bila masih kosong.
 */
export const USER_BOOK_STARTED_STATUSES: ReadonlySet<UserBookStatus> = new Set([
  "READING",
  "ON_HOLD",
  "ABANDONED",
  "FINISHED",
]);

export function isUserBookStatus(value: unknown): value is UserBookStatus {
  return (
    typeof value === "string" &&
    (USER_BOOK_STATUS_VALUES as readonly string[]).includes(value)
  );
}

export function isUserBookVisibility(
  value: unknown,
): value is UserBookVisibility {
  return (
    typeof value === "string" &&
    (USER_BOOK_VISIBILITY_VALUES as readonly string[]).includes(value)
  );
}
