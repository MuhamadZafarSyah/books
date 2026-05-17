import type { Prisma, UserActivitySourceType, UserActivityType } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  ACTIVITY_DAILY_CAP,
  ACTIVITY_POINTS,
} from "@/lib/leaderboard/scoring";

export type RecordActivityInput = {
  userId: string;
  type: UserActivityType;
  sourceType: UserActivitySourceType;
  sourceId: string;
  /**
   * Kunci unik agar retry/action ulang tidak menggandakan poin. Sangat
   * disarankan diisi dengan format `${domain}:${verb}:${id}` (lihat plan).
   */
  dedupeKey?: string | null;
  metadata?: Prisma.InputJsonValue;
  /**
   * Override bobot bila perlu. Default mengambil dari `ACTIVITY_POINTS`.
   */
  points?: number;
  /**
   * Skip cap harian. Dipakai untuk aktivitas dedupe-by-source yang sudah
   * dijaga uniqueness-nya (mis. join circle/event).
   */
  bypassDailyCap?: boolean;
};

/**
 * Catat satu activity event ke ledger.
 *
 * Karakteristik:
 * - **Idempotent** lewat `dedupeKey` yang `@unique` di skema. Kegagalan
 *   `P2002` ditelan diam-diam (poin sudah pernah dicatat).
 * - **Cap harian opsional** lewat `ACTIVITY_DAILY_CAP`. Saat cap tercapai,
 *   event dilewati tanpa error supaya pemanggil server action tidak
 *   gagal hanya karena leaderboard.
 * - **Tidak memblokir mutasi utama**: kalau pemanggilan ini gagal di luar
 *   `P2002`/cap, error di-log lalu ditelan agar UI tetap sukses. Caller
 *   tidak perlu try/catch lagi di sisi mereka.
 *
 * Wajib dipanggil **setelah** mutasi DB utama commit.
 */
export async function recordActivityEvent(input: RecordActivityInput): Promise<void> {
  const points = input.points ?? ACTIVITY_POINTS[input.type];
  if (!Number.isFinite(points) || points <= 0) {
    // Tipe aktivitas tanpa bobot positif tidak perlu dicatat.
    return;
  }

  try {
    if (!input.bypassDailyCap) {
      const cap = ACTIVITY_DAILY_CAP[input.type];
      if (typeof cap === "number" && cap > 0) {
        const reached = await hasDailyCapReached({
          userId: input.userId,
          type: input.type,
          cap,
        });
        if (reached) return;
      }
    }

    await prisma.userActivityEvent.create({
      data: {
        userId: input.userId,
        type: input.type,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        dedupeKey: input.dedupeKey ?? null,
        points,
        metadataJson: input.metadata ?? undefined,
      },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      // Sudah pernah dicatat — diam-diam saja.
      return;
    }
    // Jangan biarkan kegagalan leaderboard membuat mutasi utama tampak
    // gagal di UI. Cukup log untuk diagnosa.
    console.error("[leaderboard] recordActivityEvent failed:", error);
  }
}

/**
 * Cek apakah user sudah mencapai cap harian untuk aktivitas tertentu.
 *
 * Window dihitung mulai 00:00 lokal hari ini sampai 00:00 besok agar
 * sejalan dengan periode `daily` di leaderboard.
 */
export async function hasDailyCapReached(input: {
  userId: string;
  type: UserActivityType;
  cap: number;
  now?: Date;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const count = await prisma.userActivityEvent.count({
    where: {
      userId: input.userId,
      type: input.type,
      createdAt: { gte: start, lt: end },
    },
  });

  return count >= input.cap;
}

function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return code === "P2002";
}
