import type { ReadingEventStatus } from "@/features/reading-events/types";

/**
 * Input untuk `deriveEventStatus`.
 *
 * - `statusFlag` mencerminkan flag persistence (ACTIVE atau CANCELLED) yang
 *   tersimpan di kolom `ReadingEvent.statusFlag`.
 * - `startsAt` dan `endsAt` adalah `Date` server (UTC dari Prisma).
 * - `participantCount` adalah jumlah peserta saat ini, sudah termasuk Host.
 * - `quota` adalah kapasitas maksimal Event.
 * - `now` boleh dioper untuk testing; default-nya `new Date()`.
 */
export type DeriveEventStatusInput = {
  statusFlag: "ACTIVE" | "CANCELLED";
  startsAt: Date;
  endsAt: Date;
  participantCount: number;
  quota: number;
  now?: Date;
};

/**
 * Fungsi murni yang menurunkan {@link ReadingEventStatus} dari kondisi Event.
 *
 * Urutan evaluasi mengikuti spesifikasi (design.md, Logic Flow #1):
 * 1. `CANCELLED` selalu menang ketika `statusFlag === "CANCELLED"` (sticky).
 * 2. `COMPLETED` jika `now >= endsAt`.
 * 3. `ONGOING` jika `now >= startsAt` (tetapi belum lewat `endsAt`).
 * 4. `FULL` jika `participantCount >= quota` (tetapi belum mulai).
 * 5. `SCHEDULED` selain itu.
 *
 * Tidak melakukan I/O dan tidak menyimpan state: untuk input identik selalu
 * mengembalikan output identik. Memenuhi Requirement 9.1, 9.2, 9.3, 9.4.
 */
export function deriveEventStatus(
  input: DeriveEventStatusInput,
): ReadingEventStatus {
  const now = input.now ?? new Date();

  if (input.statusFlag === "CANCELLED") {
    return "CANCELLED";
  }

  if (now.getTime() >= input.endsAt.getTime()) {
    return "COMPLETED";
  }

  if (now.getTime() >= input.startsAt.getTime()) {
    return "ONGOING";
  }

  if (input.participantCount >= input.quota) {
    return "FULL";
  }

  return "SCHEDULED";
}
