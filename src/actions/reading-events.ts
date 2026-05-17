"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { recordActivityEvent } from "@/lib/leaderboard/record-activity";
import { requireAuth } from "@/lib/session";
import { deriveEventStatus } from "@/features/reading-events/lib/derive-status";
import {
  toReadingEventDetail,
  toReadingEventSummary,
} from "@/features/reading-events/lib/serializers";
import {
  createEventSchema,
  joinEventSchema,
  updateEventSchema,
} from "@/features/reading-events/schemas/reading-event-schemas";
import type {
  EventListPageData,
  ReadingEventDetail,
} from "@/features/reading-events/types";

const LIST_PAGE_SIZE = 20;

const PUBLIC_USER_SELECT = {
  name: true,
  image: true,
} as const;

export type GetReadingEventsListPageInput = {
  page: number;
  q?: string;
  onlyJoinable: boolean;
};

/**
 * Loader untuk Event_List_View.
 *
 * - Hanya menampilkan Event yang `statusFlag === ACTIVE` dan `startsAt > now`
 *   (Requirement 3.1).
 * - `q` dicocokkan case-insensitive ke `title`, `description`,
 *   `locationAddress` (Requirement 3.6).
 * - Pagination 20 entri per halaman, urut `startsAt asc` (Requirement 3.4).
 * - Filter `onlyJoinable` dievaluasi setelah `deriveEventStatus` lewat
 *   serializer agar tetap konsisten dengan status real-time (Requirement 3.3,
 *   Property 12).
 */
export async function getReadingEventsListPage(
  input: GetReadingEventsListPageInput,
): Promise<EventListPageData> {
  await requireAuth();

  const page = Number.isFinite(input.page) && input.page >= 1
    ? Math.floor(input.page)
    : 1;
  const onlyJoinable = Boolean(input.onlyJoinable);
  const trimmedQuery = (input.q ?? "").trim();
  const now = new Date();

  const where: Prisma.ReadingEventWhereInput = {
    statusFlag: "ACTIVE",
    startsAt: { gt: now },
  };

  if (trimmedQuery.length > 0) {
    where.OR = [
      { title: { contains: trimmedQuery, mode: "insensitive" } },
      { description: { contains: trimmedQuery, mode: "insensitive" } },
      { locationAddress: { contains: trimmedQuery, mode: "insensitive" } },
    ];
  }

  const [rows, totalCount] = await Promise.all([
    prisma.readingEvent.findMany({
      where,
      orderBy: { startsAt: "asc" },
      skip: (page - 1) * LIST_PAGE_SIZE,
      take: LIST_PAGE_SIZE,
      include: { host: { select: PUBLIC_USER_SELECT } },
    }),
    prisma.readingEvent.count({ where }),
  ]);

  const summaries = rows.map((event) =>
    toReadingEventSummary(event, { now }),
  );

  // Property 12 — saat onlyJoinable=true, hasil tidak boleh memuat status
  // selain SCHEDULED.
  const events = onlyJoinable
    ? summaries.filter((event) => event.status === "SCHEDULED")
    : summaries;

  const hasNext = page * LIST_PAGE_SIZE < totalCount;

  return {
    events,
    page,
    pageSize: LIST_PAGE_SIZE,
    totalCount,
    hasNext,
  };
}

/**
 * Loader untuk Event_Detail_View. Mengembalikan `null` saat Event tidak
 * ditemukan agar pemanggil bisa memetakan ke `notFound()`.
 *
 * `isHost` dan `isParticipant` diturunkan dari sesi yang aktif sehingga
 * Client Component tidak perlu permintaan tambahan untuk memilih tombol
 * aksi (Requirement 4.5–4.7, 5.5, 6.x).
 */
export async function getReadingEventDetail(
  eventId: string,
): Promise<ReadingEventDetail | null> {
  const viewer = await requireAuth();

  const event = await prisma.readingEvent.findUnique({
    where: { id: eventId },
    include: {
      host: { select: PUBLIC_USER_SELECT },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: { user: { select: PUBLIC_USER_SELECT } },
      },
    },
  });

  if (!event) return null;

  return toReadingEventDetail(event, { viewerUserId: viewer.id });
}

/**
 * Loader untuk Event_Form mode edit.
 *
 * Memuat detail Event dan memvalidasi kepemilikan: melempar
 * `Error("Forbidden")` jika pemanggil bukan Host (Requirement 8.3, 10.3).
 * Memenuhi Property 14: Ownership_Required_On_Host_Mutators tanpa
 * menyentuh DB di luar pembacaan.
 */
export async function getReadingEventForEdit(
  eventId: string,
): Promise<ReadingEventDetail> {
  const viewer = await requireAuth();

  const event = await prisma.readingEvent.findUnique({
    where: { id: eventId },
    include: {
      host: { select: PUBLIC_USER_SELECT },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: { user: { select: PUBLIC_USER_SELECT } },
      },
    },
  });

  if (!event) {
    throw new Error("Event tidak ditemukan.");
  }

  if (event.hostId !== viewer.id) {
    throw new Error("Forbidden");
  }

  return toReadingEventDetail(event, { viewerUserId: viewer.id });
}

/**
 * Mutator pembuatan Reading Event.
 *
 * Validasi dilakukan di server lewat `createEventSchema.parse` agar pesan
 * konsisten dengan klien (judul, kuota, waktu mulai, waktu selesai). Jika
 * pemanggil tidak punya sesi, `requireAuth()` melempar redirect ke
 * `/auth/login` (Requirement 1.8, 10.1).
 *
 * Penulisan dilakukan dalam satu `prisma.$transaction`:
 *   1. Membuat baris `ReadingEvent` dengan `statusFlag = ACTIVE`,
 *      `participantCount = 1`, dan deskripsi/URL referensi yang
 *      kosong dinormalkan ke `null`.
 *   2. Membuat baris `ReadingEventParticipant` untuk Host tanpa komentar
 *      sehingga Host langsung menjadi peserta pertama (Requirement 1.7,
 *      Property 2: Host_Is_First_Participant).
 *
 * Setelah commit sukses, path daftar event di-`revalidatePath` agar
 * Event_List_View segera melihat agenda baru.
 */
export async function createReadingEvent(
  input: unknown,
): Promise<{ eventId: string }> {
  const viewer = await requireAuth();
  const parsed = createEventSchema.parse(input);

  const description = parsed.description?.trim()
    ? parsed.description.trim()
    : null;
  const bookReferenceUrl = parsed.bookReferenceUrl?.trim()
    ? parsed.bookReferenceUrl.trim()
    : null;

  const eventId = await prisma.$transaction(async (tx) => {
    const created = await tx.readingEvent.create({
      data: {
        hostId: viewer.id,
        title: parsed.title,
        description,
        locationAddress: parsed.locationAddress,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        quota: parsed.quota,
        bookReferenceUrl,
        statusFlag: "ACTIVE",
        participantCount: 1,
      },
      select: { id: true },
    });

    await tx.readingEventParticipant.create({
      data: {
        eventId: created.id,
        userId: viewer.id,
        comment: null,
      },
    });

    return created.id;
  });

  await recordActivityEvent({
    userId: viewer.id,
    type: "READING_EVENT_CREATED",
    sourceType: "READING_EVENT",
    sourceId: eventId,
    dedupeKey: `reading-event:create:${eventId}`,
  });

  revalidatePath("/dashboard/events");

  return { eventId };
}

/**
 * Bentuk baris yang dikembalikan oleh `SELECT … FOR UPDATE` di transaksi
 * join/leave.
 *
 * `$queryRaw` mengembalikan tipe Postgres mentah, jadi `statusFlag` datang
 * sebagai string enum literal (`ACTIVE` | `CANCELLED`) dan kolom `Date`
 * tetap berupa objek `Date` JavaScript.
 *
 * `hostId` ikut diambil agar `leaveReadingEvent` dapat melakukan ownership
 * check (Property 9: Host_Cannot_Leave_Via_Leave) tanpa permintaan tambahan.
 */
type ReadingEventLockRow = {
  id: string;
  hostId: string;
  statusFlag: "ACTIVE" | "CANCELLED";
  startsAt: Date;
  endsAt: Date;
  quota: number;
  participantCount: number;
};

/**
 * Mutator partisipasi: pengguna terautentikasi bergabung ke Event.
 *
 * Kontrak invarian (lihat `design.md` Logic Flow #3 dan Correctness
 * Properties 1, 3, 7, 11):
 *
 * 1. **Otentikasi** lewat `requireAuth()` (Requirement 5, 10.1).
 * 2. **Validasi** `joinEventSchema.parse` membatasi panjang komentar ≤ 280
 *    karakter setelah trim (Requirement 5.3, Property 11).
 * 3. **Race kuota** dijaga dengan `tx.$queryRaw` `SELECT … FOR UPDATE` pada
 *    baris event di dalam transaksi sehingga dua permintaan paralel
 *    mengantri di tingkat baris (Requirement 7.1, 7.3, Property 1).
 * 4. **Status gate**: `deriveEventStatus` dievaluasi pada snapshot terkunci.
 *    Selain `SCHEDULED`, permintaan ditolak dengan pesan menyebut status
 *    saat itu (Requirement 5.6, 7.2, Property 7).
 * 5. **Duplikasi** ditangani db-level oleh `@@unique([eventId, userId])`.
 *    Bila Prisma melempar `P2002`, ubah ke pesan "Anda sudah bergabung."
 *    (Requirement 5.7, Property 3).
 * 6. **Increment counter** `participantCount` di transaksi yang sama agar
 *    tidak ada window di mana baris partisipan tercatat tetapi counter
 *    belum diperbarui (Requirement 7.1).
 *
 * Setelah commit sukses, dua path di-`revalidatePath` (list dan detail) dan
 * detail terbaru di-fetch ulang untuk diserialkan kembali sebagai
 * `ReadingEventDetail` (Requirement 5.5).
 */
export async function joinReadingEvent(
  eventId: string,
  input: unknown,
): Promise<ReadingEventDetail> {
  const viewer = await requireAuth();
  const parsed = joinEventSchema.parse(input);

  const trimmedComment = parsed.comment?.trim();
  const comment = trimmedComment ? trimmedComment : null;

  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<ReadingEventLockRow[]>`
      SELECT
        id,
        "hostId" AS "hostId",
        "statusFlag" AS "statusFlag",
        "startsAt" AS "startsAt",
        "endsAt" AS "endsAt",
        quota,
        "participantCount" AS "participantCount"
      FROM "ReadingEvent"
      WHERE id = ${eventId}
      FOR UPDATE
    `;

    const event = rows[0];
    if (!event) {
      throw new Error("Event tidak ditemukan.");
    }

    const status = deriveEventStatus({
      statusFlag: event.statusFlag,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      participantCount: event.participantCount,
      quota: event.quota,
    });

    if (status !== "SCHEDULED") {
      throw new Error(
        `Event tidak menerima peserta (status: ${status}).`,
      );
    }

    try {
      await tx.readingEventParticipant.create({
        data: {
          eventId,
          userId: viewer.id,
          comment,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new Error("Anda sudah bergabung.");
      }
      throw error;
    }

    await tx.readingEvent.update({
      where: { id: eventId },
      data: { participantCount: { increment: 1 } },
    });
  });

  await recordActivityEvent({
    userId: viewer.id,
    type: "READING_EVENT_JOINED",
    sourceType: "READING_EVENT",
    sourceId: eventId,
    dedupeKey: `reading-event:join:${eventId}:${viewer.id}`,
    bypassDailyCap: true,
  });

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);

  const detail = await prisma.readingEvent.findUnique({
    where: { id: eventId },
    include: {
      host: { select: PUBLIC_USER_SELECT },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: { user: { select: PUBLIC_USER_SELECT } },
      },
    },
  });

  if (!detail) {
    // Sangat tidak mungkin terjadi karena transaksi di atas baru saja
    // sukses, tapi tetap dijaga supaya tipe kembalian non-null.
    throw new Error("Event tidak ditemukan.");
  }

  return toReadingEventDetail(detail, { viewerUserId: viewer.id });
}

/**
 * Mutator pembatalan keikutsertaan: pengguna terautentikasi keluar dari Event.
 *
 * Kontrak invarian (lihat `design.md` Logic Flow #4 dan Correctness Properties
 * 8 & 9):
 *
 * 1. **Otentikasi** lewat `requireAuth()` (Requirement 6, 10.1).
 * 2. **Row-lock** pada baris event memakai pola yang sama dengan
 *    `joinReadingEvent` agar evaluasi status/host dilakukan terhadap
 *    snapshot konsisten dan decrement counter aman dari race.
 * 3. **Host gate**: `userId === hostId` selalu ditolak dengan pesan yang
 *    mengarahkan Host memakai tombol "Batalkan event" (Requirement 6.5,
 *    Property 9).
 * 4. **Status gate**: `ONGOING`/`COMPLETED` ditolak (Requirement 6.3).
 *    `CANCELLED` diizinkan agar baris peserta tetap dibersihkan demi
 *    konsistensi (design.md Logic Flow #4); `SCHEDULED`/`FULL` adalah jalur
 *    happy path. Setelah leave dari `FULL` sebelum `startsAt`, status
 *    otomatis kembali `SCHEDULED` lewat `deriveEventStatus` (Requirement 6.2,
 *    Property 8).
 * 5. **Membership gate**: bila pengguna bukan peserta, Prisma melempar
 *    `P2025` saat `delete`; kita ubah ke pesan "Anda bukan peserta event ini."
 *    (Requirement 6.4).
 * 6. **Decrement counter** dilakukan di transaksi yang sama agar
 *    `participantCount` tidak pernah lebih besar dari jumlah baris peserta
 *    yang sebenarnya.
 *
 * Setelah commit sukses, dua path di-`revalidatePath` (list dan detail) dan
 * detail terbaru di-fetch ulang sebagai `ReadingEventDetail` agar UI bisa
 * menyinkronkan tanpa reload halaman penuh (Requirement 11.4, design.md
 * Logic Flow #8).
 */
export async function leaveReadingEvent(
  eventId: string,
): Promise<ReadingEventDetail> {
  const viewer = await requireAuth();

  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<ReadingEventLockRow[]>`
      SELECT
        id,
        "hostId" AS "hostId",
        "statusFlag" AS "statusFlag",
        "startsAt" AS "startsAt",
        "endsAt" AS "endsAt",
        quota,
        "participantCount" AS "participantCount"
      FROM "ReadingEvent"
      WHERE id = ${eventId}
      FOR UPDATE
    `;

    const event = rows[0];
    if (!event) {
      throw new Error("Event tidak ditemukan.");
    }

    if (event.hostId === viewer.id) {
      throw new Error(
        "Host tidak dapat membatalkan keikutsertaan; gunakan tombol Batalkan event.",
      );
    }

    const status = deriveEventStatus({
      statusFlag: event.statusFlag,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      participantCount: event.participantCount,
      quota: event.quota,
    });

    if (status === "ONGOING" || status === "COMPLETED") {
      throw new Error(
        `Tidak dapat membatalkan keikutsertaan (status: ${status}).`,
      );
    }

    try {
      await tx.readingEventParticipant.delete({
        where: {
          eventId_userId: {
            eventId,
            userId: viewer.id,
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new Error("Anda bukan peserta event ini.");
      }
      throw error;
    }

    await tx.readingEvent.update({
      where: { id: eventId },
      data: { participantCount: { decrement: 1 } },
    });
  });

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);

  const detail = await prisma.readingEvent.findUnique({
    where: { id: eventId },
    include: {
      host: { select: PUBLIC_USER_SELECT },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: { user: { select: PUBLIC_USER_SELECT } },
      },
    },
  });

  if (!detail) {
    // Sangat tidak mungkin terjadi karena transaksi di atas baru saja
    // sukses, tapi tetap dijaga supaya tipe kembalian non-null.
    throw new Error("Event tidak ditemukan.");
  }

  return toReadingEventDetail(detail, { viewerUserId: viewer.id });
}

/**
 * Mutator pembaruan Reading Event oleh Host.
 *
 * Kontrak invarian (lihat `design.md` Logic Flow #5 dan Correctness
 * Properties 10 & 14):
 *
 * 1. **Otentikasi** lewat `requireAuth()` (Requirement 10.1, Property 13).
 * 2. **Validasi** `updateEventSchema.parse` menegakkan `endsAt > startsAt`
 *    serta semua batas field (judul, deskripsi, alamat, koordinat, kuota,
 *    URL referensi). Aturan "waktu mulai harus di masa depan" sengaja tidak
 *    ada di skema agar Host tetap bisa mengedit field lain pada event yang
 *    waktu mulainya sudah dekat tanpa mengubah `startsAt`; aturan tersebut
 *    diterapkan di sini hanya bila nilai `startsAt` benar-benar berubah dari
 *    nilai semula (Requirement 8.6).
 * 3. **Row-lock**: snapshot Event diambil dengan `tx.$queryRaw`
 *    `SELECT … FOR UPDATE` mengikuti pola yang sama dengan join/leave agar
 *    pengecekan ownership/status/kuota dilakukan terhadap nilai yang
 *    konsisten dengan write berikutnya, walaupun ada `joinReadingEvent`
 *    konkuren yang menaikkan `participantCount`.
 * 4. **Ownership gate**: jika `existing.hostId !== viewer.id`, lempar
 *    `Error("Forbidden")` tanpa menulis ke DB (Requirement 8.3, 10.3,
 *    Property 14: Ownership_Required_On_Host_Mutators).
 * 5. **Cancelled gate**: event yang sudah `CANCELLED` tidak dapat diedit
 *    (Requirement 8.5, Property 6: Cancel_Sticky).
 * 6. **Quota gate**: `parsed.quota < existing.participantCount` selalu
 *    ditolak agar tidak ada window di mana kuota lebih kecil dari jumlah
 *    peserta saat ini (Requirement 7.4, Property 10:
 *    Edit_Quota_Bounded_By_Current_Participants). Pesan menyertakan jumlah
 *    peserta saat ini sesuai requirement.
 * 7. **Persisten daftar peserta**: `tx.readingEvent.update` hanya menyentuh
 *    kolom event itu sendiri sehingga `ReadingEventParticipant` dan
 *    `Join_Comment` tetap utuh (Requirement 8.2). `participantCount`,
 *    `statusFlag`, `cancelledAt`, dan `hostId` tidak ikut diubah.
 *
 * Setelah commit sukses, dua path di-`revalidatePath` (list dan detail) dan
 * detail terbaru di-fetch ulang sebagai `ReadingEventDetail` agar UI
 * langsung melihat nilai baru tanpa reload halaman penuh.
 */
export async function updateReadingEvent(
  eventId: string,
  input: unknown,
): Promise<ReadingEventDetail> {
  const viewer = await requireAuth();
  const parsed = updateEventSchema.parse(input);

  const description = parsed.description?.trim()
    ? parsed.description.trim()
    : null;
  const bookReferenceUrl = parsed.bookReferenceUrl?.trim()
    ? parsed.bookReferenceUrl.trim()
    : null;

  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<ReadingEventLockRow[]>`
      SELECT
        id,
        "hostId" AS "hostId",
        "statusFlag" AS "statusFlag",
        "startsAt" AS "startsAt",
        "endsAt" AS "endsAt",
        quota,
        "participantCount" AS "participantCount"
      FROM "ReadingEvent"
      WHERE id = ${eventId}
      FOR UPDATE
    `;

    const existing = rows[0];
    if (!existing) {
      throw new Error("Event tidak ditemukan.");
    }

    if (existing.hostId !== viewer.id) {
      throw new Error("Forbidden");
    }

    if (existing.statusFlag === "CANCELLED") {
      throw new Error("Event sudah dibatalkan dan tidak dapat diedit.");
    }

    if (parsed.quota < existing.participantCount) {
      throw new Error(
        `Kuota tidak boleh kurang dari jumlah peserta saat ini (${existing.participantCount}).`,
      );
    }

    // Aturan "waktu mulai harus di masa depan" hanya berlaku bila Host
    // benar-benar mengubah `startsAt`. Tanpa pengecualian ini, Event yang
    // waktu mulainya sudah dekat tidak dapat lagi disunting Host walau
    // tidak ada perubahan tanggal (Requirement 8.6).
    const startsAtChanged =
      parsed.startsAt.getTime() !== existing.startsAt.getTime();
    if (startsAtChanged && parsed.startsAt.getTime() <= Date.now()) {
      throw new Error("Waktu mulai harus di masa depan.");
    }

    await tx.readingEvent.update({
      where: { id: eventId },
      data: {
        title: parsed.title,
        description,
        locationAddress: parsed.locationAddress,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        quota: parsed.quota,
        bookReferenceUrl,
      },
    });
  });

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);

  const detail = await prisma.readingEvent.findUnique({
    where: { id: eventId },
    include: {
      host: { select: PUBLIC_USER_SELECT },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: { user: { select: PUBLIC_USER_SELECT } },
      },
    },
  });

  if (!detail) {
    // Sangat tidak mungkin terjadi karena transaksi di atas baru saja
    // sukses, tapi tetap dijaga supaya tipe kembalian non-null.
    throw new Error("Event tidak ditemukan.");
  }

  return toReadingEventDetail(detail, { viewerUserId: viewer.id });
}

/**
 * Mutator pembatalan Reading Event oleh Host.
 *
 * Kontrak invarian (lihat `design.md` Logic Flow #6 dan Correctness Properties
 * 6, 13, 14):
 *
 * 1. **Otentikasi** lewat `requireAuth()` (Requirement 10.1, Property 13).
 * 2. **Ownership gate**: hanya Host yang boleh membatalkan event miliknya
 *    sendiri; pemanggil lain mendapat `Error("Forbidden")` tanpa tulisan ke
 *    DB (Requirement 8.3, 10.3, Property 14).
 * 3. **Idempotent**: bila event sudah `CANCELLED`, action tidak melakukan
 *    `update` ulang (sehingga `cancelledAt` pertama tetap dipertahankan)
 *    namun tetap mengembalikan detail terkini agar UI dapat menyinkronkan
 *    state tanpa error.
 * 4. **State transition**: jalur happy path mengeset `statusFlag = CANCELLED`
 *    dan `cancelledAt = now` dalam satu `update`. Kombinasi ini cukup karena
 *    `deriveEventStatus` selalu mengembalikan `CANCELLED` saat
 *    `statusFlag === CANCELLED` (Property 6: Cancel_Sticky), sehingga
 *    join/update mutators yang sudah ada otomatis menolak event ini
 *    (Requirement 8.5).
 *
 * Tidak diperlukan row-lock `SELECT … FOR UPDATE` di sini: operasi pembatalan
 * idempotent terhadap baris event itu sendiri, daftar peserta tidak diubah,
 * dan race terhadap `joinReadingEvent` yang sedang berjalan akan tetap aman
 * — request join yang masuk setelah commit akan melihat status `CANCELLED`
 * lewat `deriveEventStatus`, sementara request yang sudah memegang lock
 * baris event akan menyelesaikan transaksinya (yang berarti increment +1
 * peserta yang sah karena waktu itu event masih ACTIVE).
 *
 * Setelah commit sukses, dua path di-`revalidatePath` (list dan detail) dan
 * detail terbaru di-fetch ulang sebagai `ReadingEventDetail` agar UI
 * langsung melihat banner "Event dibatalkan" tanpa reload halaman penuh
 * (Requirement 4.4, 11.4).
 */
export async function cancelReadingEvent(
  eventId: string,
): Promise<ReadingEventDetail> {
  const viewer = await requireAuth();

  const existing = await prisma.readingEvent.findUnique({
    where: { id: eventId },
    select: { hostId: true, statusFlag: true },
  });

  if (!existing) {
    throw new Error("Event tidak ditemukan.");
  }

  if (existing.hostId !== viewer.id) {
    throw new Error("Forbidden");
  }

  if (existing.statusFlag !== "CANCELLED") {
    await prisma.readingEvent.update({
      where: { id: eventId },
      data: {
        statusFlag: "CANCELLED",
        cancelledAt: new Date(),
      },
    });
  }

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);

  const detail = await prisma.readingEvent.findUnique({
    where: { id: eventId },
    include: {
      host: { select: PUBLIC_USER_SELECT },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: { user: { select: PUBLIC_USER_SELECT } },
      },
    },
  });

  if (!detail) {
    // Sangat tidak mungkin terjadi karena baris event baru saja diakses
    // di awal fungsi, tapi tetap dijaga supaya tipe kembalian non-null.
    throw new Error("Event tidak ditemukan.");
  }

  return toReadingEventDetail(detail, { viewerUserId: viewer.id });
}
