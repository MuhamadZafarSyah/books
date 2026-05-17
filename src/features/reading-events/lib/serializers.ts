import type {
  ReadingEvent,
  ReadingEventParticipant,
} from "@prisma/client";

import { deriveEventStatus } from "@/features/reading-events/lib/derive-status";
import type {
  ReadingEventDetail,
  ReadingEventParticipantSummary,
  ReadingEventSummary,
} from "@/features/reading-events/types";

/**
 * Bentuk minimal user yang dipakai serializer Reading Events.
 *
 * Sengaja tidak memakai tipe `User` Prisma penuh agar pemanggil bebas
 * memakai `select` di Prisma tanpa harus mengambil seluruh kolom user.
 */
type PublicUserShape = {
  name: string | null;
  image: string | null;
};

type ReadingEventWithHost = ReadingEvent & {
  host: PublicUserShape;
};

type ReadingEventParticipantWithUser = ReadingEventParticipant & {
  user: PublicUserShape;
};

type ReadingEventWithRelations = ReadingEventWithHost & {
  participants: ReadingEventParticipantWithUser[];
};

/**
 * Konversi satu baris {@link ReadingEventParticipant} (dengan relasi `user`)
 * menjadi view-model {@link ReadingEventParticipantSummary}.
 *
 * Hanya field yang dibutuhkan UI yang dipertahankan; field internal Prisma
 * (mis. `eventId`, `updatedAt`) sengaja diabaikan agar tidak bocor ke klien.
 */
export function toParticipantSummary(
  participant: ReadingEventParticipantWithUser,
): ReadingEventParticipantSummary {
  return {
    id: participant.id,
    userId: participant.userId,
    name: participant.user.name,
    image: participant.user.image,
    joinedAt: participant.joinedAt.toISOString(),
    comment: participant.comment ?? null,
  };
}

export type ToReadingEventSummaryOptions = {
  /** Override waktu sekarang (dipakai untuk testing / list paging). */
  now?: Date;
};

/**
 * Konversi {@link ReadingEvent} (dengan relasi `host`) menjadi
 * {@link ReadingEventSummary} untuk dipakai di Event_List_View.
 *
 * Field `status` selalu diturunkan ulang lewat {@link deriveEventStatus}
 * sehingga klien tidak pernah membaca status basi dari kolom `statusFlag`.
 * Field `Date` dikonversi ke ISO string supaya aman dilewatkan dari
 * Server Component ke Client Component.
 */
export function toReadingEventSummary(
  event: ReadingEventWithHost,
  options: ToReadingEventSummaryOptions = {},
): ReadingEventSummary {
  const status = deriveEventStatus({
    statusFlag: event.statusFlag,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    participantCount: event.participantCount,
    quota: event.quota,
    now: options.now,
  });

  return {
    id: event.id,
    hostId: event.hostId,
    hostName: event.host.name,
    hostImage: event.host.image,
    title: event.title,
    locationAddress: event.locationAddress,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    quota: event.quota,
    participantCount: event.participantCount,
    status,
  };
}

export type ToReadingEventDetailOptions = {
  /**
   * ID pengguna yang sedang melihat event. Dipakai untuk menentukan
   * `isHost` dan `isParticipant`. Boleh `null` untuk konteks tanpa sesi
   * (mis. evaluasi server-side sebelum `requireAuth`).
   */
  viewerUserId: string | null;
  /** Override waktu sekarang (dipakai untuk testing). */
  now?: Date;
};

/**
 * Konversi {@link ReadingEvent} lengkap (dengan host + participants[].user)
 * menjadi {@link ReadingEventDetail} untuk dipakai di Event_Detail_View.
 *
 * Selain semua field summary, view-model ini menambahkan:
 * - `description`, `latitude`, `longitude`, `bookReferenceUrl` untuk panel detail
 * - daftar `participants` (sudah serialized) untuk avatar list dan komentar
 * - `isHost` dan `isParticipant` agar UI bisa memilih tombol aksi tanpa
 *   melakukan query tambahan
 */
export function toReadingEventDetail(
  event: ReadingEventWithRelations,
  options: ToReadingEventDetailOptions,
): ReadingEventDetail {
  const summary = toReadingEventSummary(event, { now: options.now });
  const viewerUserId = options.viewerUserId;

  const participants = event.participants.map(toParticipantSummary);

  return {
    ...summary,
    description: event.description ?? null,
    latitude: event.latitude,
    longitude: event.longitude,
    bookReferenceUrl: event.bookReferenceUrl ?? null,
    participants,
    isHost: viewerUserId !== null && viewerUserId === event.hostId,
    isParticipant:
      viewerUserId !== null &&
      participants.some((participant) => participant.userId === viewerUserId),
  };
}
