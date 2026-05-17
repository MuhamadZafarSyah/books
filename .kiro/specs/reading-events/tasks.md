# Implementation Plan: Reading Events

## Overview

Implementasi fitur Reading Events dilakukan dari lapis paling stabil ke paling interaktif: skema Prisma dan tipe → fungsi murni (`deriveEventStatus`, serializer) → server actions di `src/actions/reading-events.ts` → komponen klien (peta, form, list, detail) → halaman App Router dan navigasi sidebar. Setiap server action diuji properti secara terpisah agar invarian (kuota, host-pertama, sticky cancel, dst.) tetap terjaga saat lapis UI ditambahkan di akhir.

Implementasi memakai TypeScript, React 19, Next.js 16 App Router, Prisma 7, NextAuth v5, Tailwind v4 + shadcn/ui — sesuai stack repo (`AGENTS.md`).

## Tasks

- [x] 1. Set up data layer dan scaffolding fitur
  - [x] 1.1 Tambahkan model Prisma `ReadingEvent`, `ReadingEventParticipant`, dan enum `ReadingEventStatusFlag`
    - Edit `src/prisma/schema.prisma`: tambah enum `ReadingEventStatusFlag { ACTIVE, CANCELLED }`, model `ReadingEvent` (id, hostId, title, description, locationAddress, latitude, longitude, startsAt, endsAt, quota, participantCount default 1, bookReferenceUrl, statusFlag default ACTIVE, cancelledAt, createdAt, updatedAt) dengan `@@index([startsAt, statusFlag])` dan `@@index([hostId, startsAt])`
    - Tambah model `ReadingEventParticipant` (id, eventId, userId, comment opsional, joinedAt) dengan `@@unique([eventId, userId])`, `@@index([eventId, joinedAt])`, `@@index([userId, joinedAt])`
    - Tambah relasi balik di `model User`: `readingEventsHosted ReadingEvent[]` dan `readingEventParticipations ReadingEventParticipant[]`
    - Set `onDelete: Cascade` pada FK `hostId`, `eventId`, dan `userId`
    - Jalankan `npm run prisma:generate` lalu `npm run prisma:push` (tanpa `--accept-data-loss`)
    - _Requirements: 10.4, 5.7_

  - [x] 1.2 Definisikan view-model types
    - Buat `src/features/reading-events/types.ts` berisi `ReadingEventStatus`, `ReadingEventParticipantSummary`, `ReadingEventSummary`, `ReadingEventDetail`, `EventListPageData` — semuanya primitif/ISO string agar aman dilewatkan Server → Client
    - _Requirements: 9.1, 4.1, 3.2_

  - [x] 1.3 Definisikan skema Zod create/update/join
    - Buat `src/features/reading-events/schemas/reading-event-schemas.ts` berisi `eventFormBaseSchema`, `createEventSchema` (refine `endsAt > startsAt` dan `startsAt > now`), `updateEventSchema`, `joinEventSchema`
    - Pesan validasi Bahasa Indonesia menyebut nama field yang sama dengan requirements: "judul", "kuota", "waktu mulai", "waktu selesai", "komentar", dengan rentang persis (judul 1–120, deskripsi ≤ 2000, alamat 1–200, lat -90..90, lng -180..180, kuota 2–100, komentar ≤ 280)
    - Validasi `bookReferenceUrl` hanya menerima URL Open Library
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 5.3, 8.6, 12.5_

- [x] 2. Implementasi domain logic murni
  - [x] 2.1 Implementasi `deriveEventStatus`
    - Buat `src/features/reading-events/lib/derive-status.ts` dengan fungsi murni `deriveEventStatus({ statusFlag, startsAt, endsAt, participantCount, quota, now? })` yang mengembalikan salah satu dari `SCHEDULED | FULL | ONGOING | COMPLETED | CANCELLED`
    - Urutan evaluasi: `CANCELLED` → `COMPLETED` (now ≥ endsAt) → `ONGOING` (now ≥ startsAt) → `FULL` (count ≥ quota) → `SCHEDULED`
    - Tidak melakukan I/O, default `now = new Date()`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 2.2 Property test untuk `deriveEventStatus`
    - Setup test runner ringan (mis. `vitest`) hanya jika belum ada; jika user menolak, lewati sub-task ini
    - **Property 4: Status_Determinism** — input identik selalu menghasilkan output identik (validates 9.1, 9.2, 9.4)
    - **Property 5: Status_Monotonic_Ordering** — untuk event non-CANCELLED, hasil tidak pernah mundur dari `ONGOING`/`COMPLETED` ke `SCHEDULED` saat `now` bertambah (validates 9.1, 9.2, 9.3)
    - **Property 6: Cancel_Sticky** — `statusFlag = CANCELLED` selalu menghasilkan `CANCELLED` apa pun input lain (validates 4.4, 8.4, 8.5)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 4.4, 8.4, 8.5_

  - [x] 2.3 Implementasi serializer view-model
    - Buat `src/features/reading-events/lib/serializers.ts` dengan `toReadingEventSummary`, `toReadingEventDetail`, `toParticipantSummary`
    - Setiap fungsi memanggil `deriveEventStatus` untuk mengisi field `status`
    - Konversi `Date` → ISO string, abaikan field internal Prisma yang tidak perlu
    - _Requirements: 3.2, 4.1, 9.1_

- [x] 3. Route handler geocoding
  - [x] 3.1 Implementasi `GET /api/reading-events/geocode`
    - Buat `src/app/api/reading-events/geocode/route.ts`
    - Panggil `requireAuth()`; tolak permintaan tanpa sesi
    - Terima query `q`, kirim ke `https://nominatim.openstreetmap.org/search?format=json&q=…` dengan header `User-Agent: Shelfgram/1.0`
    - Bungkus dengan rate-limit 30 req/menit per user lewat `src/lib/rate-limit.ts` (Upstash)
    - Kembalikan array hasil `{ displayName, lat, lng }` (parsed dari Nominatim) atau array kosong saat gagal
    - _Requirements: 2.3, 2.4, 10.1_

- [x] 4. Server actions: loaders
  - [x] 4.1 Implementasi loader-loader baca
    - Buat `src/actions/reading-events.ts` dengan directive `"use server"`
    - Implementasi `getReadingEventsListPage({ page, q, onlyJoinable })`: query Prisma dengan `statusFlag: ACTIVE`, `startsAt > now`, `OR` pada title/description/locationAddress (case-insensitive), urut `startsAt asc`, page size 20, lalu serialize dan filter `onlyJoinable` di app layer
    - Implementasi `getReadingEventDetail(eventId)`: fetch event + participants + host, kembalikan `ReadingEventDetail | null`, isi `isHost` dan `isParticipant` dari sesi
    - Implementasi `getReadingEventForEdit(eventId)`: panggil `requireAuth`, lempar `Error("Forbidden")` jika `event.hostId !== userId`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 4.1, 4.5, 4.6, 4.7, 8.1, 8.3, 10.2, 10.3_

  - [x] 4.2 Property test untuk filter list
    - **Property 12: List_Filter_Soundness** — saat `onlyJoinable=true`, hasil tidak pernah berisi event dengan status selain `SCHEDULED` (validates 3.3)
    - _Requirements: 3.3_

- [x] 5. Server actions: mutators
  - [x] 5.1 Implementasi `createReadingEvent`
    - Tambahkan ke `src/actions/reading-events.ts`: `requireAuth`, `createEventSchema.parse`, lalu `prisma.$transaction` yang membuat `ReadingEvent` (statusFlag ACTIVE, participantCount 1) dan satu `ReadingEventParticipant { userId: hostId, comment: null }`
    - Panggil `revalidatePath("/dashboard/events")` setelah sukses; kembalikan `{ eventId }`
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 10.1_

  - [x] 5.2 Property test untuk `createReadingEvent`
    - **Property 2: Host_Is_First_Participant** — setiap event yang berhasil dibuat memiliki tepat satu baris participant dengan `userId === hostId` dan `participantCount ≥ 1` (validates 1.7)
    - **Property 13: Auth_Required_On_Mutators** — pemanggilan tanpa sesi melempar tanpa menulis ke DB (validates 10.1)
    - _Requirements: 1.7, 10.1_

  - [x] 5.3 Implementasi `joinReadingEvent` dengan row-lock
    - Tambahkan ke `src/actions/reading-events.ts`: `requireAuth`, `joinEventSchema.parse`, `prisma.$transaction` yang melakukan `tx.$queryRaw` `SELECT … FOR UPDATE` pada baris event
    - Tolak jika `deriveEventStatus !== "SCHEDULED"` (pesan menyebut status saat itu); tolak duplikat lewat constraint unik dengan pesan "Anda sudah bergabung"
    - Insert participant + increment `participantCount` di transaksi yang sama
    - Revalidate path detail dan list; kembalikan `ReadingEventDetail` baru
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.1, 7.2, 7.3_

  - [x] 5.4 Property tests untuk `joinReadingEvent`
    - **Property 1: Quota_Never_Exceeded** — pada banyak request paralel, `participantCount` final tidak pernah > `quota` (validates 7.1, 7.3)
    - **Property 3: Participant_Uniqueness** — tidak ada dua baris dengan `(eventId, userId)` sama (validates 5.7)
    - **Property 7: Join_Closed_Outside_Scheduled** — join ditolak tanpa tulisan DB jika status bukan `SCHEDULED` (validates 5.6, 7.2, 9.3)
    - **Property 11: Comment_Length_Bounded** — `comment` tersimpan hanya jika ≤ 280 char setelah trim (validates 5.3)
    - _Requirements: 5.3, 5.6, 5.7, 7.1, 7.2, 7.3, 9.3_

  - [x] 5.5 Implementasi `leaveReadingEvent`
    - Tambahkan ke `src/actions/reading-events.ts`: `requireAuth`, ambil event terkunci, tolak jika `userId === hostId`, tolak jika bukan participant, tolak jika status `ONGOING`/`COMPLETED`, lalu hapus baris participant + decrement `participantCount`
    - Revalidate path detail dan list; kembalikan `ReadingEventDetail` baru
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 11.4_

  - [x] 5.6 Property tests untuk `leaveReadingEvent`
    - **Property 8: Leave_Decrements_Then_Status_Recovers** — leave pada event `FULL` sebelum `startsAt` membuat status kembali `SCHEDULED` (validates 6.2)
    - **Property 9: Host_Cannot_Leave_Via_Leave** — `userId === hostId` selalu gagal tanpa tulisan DB (validates 6.5)
    - _Requirements: 6.2, 6.5_

  - [x] 5.7 Implementasi `updateReadingEvent`
    - Tambahkan ke `src/actions/reading-events.ts`: `requireAuth`, `updateEventSchema.parse`, ownership check (`hostId === userId`), tolak jika `statusFlag === CANCELLED`, tolak jika `quota < participantCount` saat ini dengan pesan menyebut jumlah peserta
    - Aturan `startsAt > now` hanya berlaku jika nilai berubah dari semula
    - Update event, kembalikan `ReadingEventDetail` baru, revalidate path
    - _Requirements: 7.4, 8.1, 8.2, 8.3, 8.5, 8.6, 10.3_

  - [x] 5.8 Property tests untuk `updateReadingEvent`
    - **Property 10: Edit_Quota_Bounded_By_Current_Participants** — `quota < participantCount` selalu ditolak tanpa tulisan DB (validates 7.4)
    - **Property 14: Ownership_Required_On_Host_Mutators** — non-host selalu mendapat error tanpa tulisan DB (validates 8.3, 10.3)
    - _Requirements: 7.4, 8.3, 10.3_

  - [x] 5.9 Implementasi `cancelReadingEvent`
    - Tambahkan ke `src/actions/reading-events.ts`: `requireAuth`, ownership check, set `statusFlag = CANCELLED` dan `cancelledAt = now`, revalidate path
    - Pastikan `joinReadingEvent`, `updateReadingEvent`, dan `leaveReadingEvent` (sudah selesai pada tugas sebelumnya) menolak event `CANCELLED`
    - _Requirements: 8.4, 8.5, 10.3_

- [x] 6. Checkpoint - Pastikan semua tes lapis data lulus
  - Pastikan semua tes lulus, tanyakan ke user jika ada pertanyaan.

- [x] 7. Pasang map dependency dan bangun widget peta
  - [x] 7.1 Install komponen mapcn via shadcn CLI
    - Jalankan `npx shadcn@latest add https://mapcn.dev/maps/map.json`
    - Verifikasi file yang dihasilkan (kemungkinan `src/components/ui/map.tsx` atau folder `src/components/ui/map/`); pastikan `maplibre-gl` masuk ke `package.json`
    - _Requirements: 2.1, 4.2_

  - [x] 7.2 Implementasi `event-map-view.tsx` (read-only)
    - Buat `src/features/reading-events/components/event-map-view.tsx` dengan `"use client"`
    - Render Map_Component dengan satu marker non-draggable, `interactive={true}` untuk pan/zoom, tanpa `onClick`
    - Sediakan fallback teks "Peta tidak dapat dimuat" + alamat lokasi jika peta gagal load (timer 8 detik)
    - _Requirements: 4.2, 4.3, 2.5_

  - [x] 7.3 Implementasi `event-map-picker.tsx` (edit + fallback)
    - Buat `src/features/reading-events/components/event-map-picker.tsx` dengan `"use client"`
    - `onClick` peta → `form.setValue` untuk `latitude`/`longitude` dengan `shouldValidate: true`
    - Search box internal memakai `useDebounceValue` (`usehooks-ts`) 300 ms ke `/api/reading-events/geocode`; pilih hasil → set `locationAddress`, `latitude`, `longitude`
    - Timer 8 detik tanpa event `load` → set `loadFailed=true`, render input manual untuk address/lat/lng (aktif saat fallback, disabled saat peta sukses)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 8. Bangun komponen form
  - [x] 8.1 Implementasi `event-status-badge.tsx`
    - Buat `src/features/reading-events/components/event-status-badge.tsx` (Server Component aman) memetakan `ReadingEventStatus` ke `Badge` shadcn dengan label Bahasa Indonesia (Terjadwal, Penuh, Berlangsung, Selesai, Dibatalkan) dan warna konsisten token
    - _Requirements: 4.1, 12.3, 12.4_

  - [x] 8.2 Implementasi `event-form.tsx`
    - Buat `src/features/reading-events/components/event-form.tsx` dengan `"use client"`
    - Pakai `react-hook-form` + `zodResolver(createEventSchema | updateEventSchema)` (props `mode: "create" | "edit"`)
    - Susun layout `grid-cols-1 lg:grid-cols-2`; embed `EventMapPicker`; submit memanggil server action create/update dan menampilkan toast error
    - Disable tombol simpan jika form invalid atau lat/lng kosong
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.7, 7.4, 8.1, 8.2, 8.6, 12.2, 12.3, 12.5_

  - [x] 8.3 Implementasi `event-form-shell.tsx`
    - Buat `src/features/reading-events/components/event-form-shell.tsx` (Server Component) yang menerima `mode`; saat `edit` panggil `getReadingEventForEdit` dan mengoper `defaultValues`
    - _Requirements: 8.1, 8.3, 10.2_

- [x] 9. Bangun komponen list view
  - [x] 9.1 Implementasi `event-list-row.tsx`
    - Buat `src/features/reading-events/components/event-list-row.tsx` (Client) sebagai list row dengan `Separator` antar baris (bukan `Card`); tampilkan judul, host, alamat, waktu mulai (Intl id-ID), `participantCount/quota`, `EventStatusBadge`
    - _Requirements: 3.2, 12.1, 12.3_

  - [x] 9.2 Implementasi `event-list-client.tsx`
    - Buat `src/features/reading-events/components/event-list-client.tsx` dengan `"use client"`
    - Search input dengan `useDebounceValue` 400 ms; filter toggle "hanya yang masih bisa join"; pagination 20/halaman; `useTransition` untuk indikator loading saat memanggil `getReadingEventsListPage`
    - Skeleton loading saat data belum diterima; empty state saat tidak ada hasil
    - _Requirements: 3.3, 3.4, 3.5, 3.7_

  - [x] 9.3 Implementasi `event-list-shell.tsx`
    - Buat `src/features/reading-events/components/event-list-shell.tsx` (Server) yang memanggil `getReadingEventsListPage` halaman 1 dan menyusun header + `EventListClient`
    - Tombol "Buat agenda" linked ke `/dashboard/events/new`
    - _Requirements: 3.1, 3.6, 10.2_

- [x] 10. Bangun komponen detail view
  - [x] 10.1 Implementasi `event-participants-list.tsx`
    - Buat `src/features/reading-events/components/event-participants-list.tsx` (Client): grid avatar + nama; placeholder "Pembaca" + inisial saat name/image kosong
    - _Requirements: 4.1, 11.2_

  - [x] 10.2 Implementasi `event-comments-list.tsx`
    - Buat `src/features/reading-events/components/event-comments-list.tsx` (Client): list komentar non-kosong urut `joinedAt` desc, pakai `try/catch` di mapping; placeholder "Komentar peserta sedang dimuat" saat error; "Belum ada komentar dari peserta" saat kosong
    - _Requirements: 11.1, 11.3, 11.5_

  - [x] 10.3 Implementasi `event-join-dialog.tsx`
    - Buat `src/features/reading-events/components/event-join-dialog.tsx` (Client) dengan shadcn `Dialog`: textarea `comment` (counter ≤ 280, validasi `joinEventSchema`), tombol konfirmasi memanggil `joinReadingEvent`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 10.4 Implementasi `event-detail-actions.tsx`
    - Buat `src/features/reading-events/components/event-detail-actions.tsx` (Client) yang memilih tombol berdasar `isHost`, `isParticipant`, `status`, `participantCount < quota`: Join (buka dialog) / Batalkan keikutsertaan (`leaveReadingEvent`) / Edit (link) / Batalkan event (`cancelReadingEvent` dengan konfirmasi)
    - Setelah action sukses, set state lokal dengan `ReadingEventDetail` baru dan panggil `router.refresh()` untuk menyinkronkan tanpa reload penuh
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 5.5, 5.6, 5.7, 6.1, 6.3, 6.4, 6.5, 8.4, 8.5, 11.4_

  - [x] 10.5 Implementasi `event-detail-shell.tsx`
    - Buat `src/features/reading-events/components/event-detail-shell.tsx` (Server) yang menerima `ReadingEventDetail`, render banner "Event dibatalkan" saat `status === "CANCELLED"`, layout split: info + meta di kiri, `EventMapView` + `EventDetailActions` di kanan pada `lg:` ke atas
    - Sertakan `EventParticipantsList` dan `EventCommentsList`
    - _Requirements: 4.1, 4.2, 4.4, 12.1_

- [x] 11. Wiring App Router pages dan sidebar
  - [x] 11.1 Tambah `src/app/dashboard/events/page.tsx`
    - Server Component: panggil `requireAuth()`, render `EventListShell`
    - _Requirements: 3.1, 10.2_

  - [x] 11.2 Tambah `src/app/dashboard/events/new/page.tsx`
    - Server Component: `requireAuth()` (redirect login jika tidak ada sesi), render `EventFormShell mode="create"`
    - _Requirements: 1.1, 1.8, 10.2_

  - [x] 11.3 Tambah `src/app/dashboard/events/[eventId]/page.tsx`
    - Server Component: `requireAuth()`, panggil `getReadingEventDetail(eventId)`, return `notFound()` jika null, render `EventDetailShell`
    - _Requirements: 4.1, 10.2_

  - [x] 11.4 Tambah `src/app/dashboard/events/[eventId]/edit/page.tsx`
    - Server Component: `requireAuth()`, render `EventFormShell mode="edit"` dengan `eventId` (loader internalnya melakukan ownership check via `getReadingEventForEdit`)
    - _Requirements: 8.1, 8.3, 10.2, 10.3_

  - [x] 11.5 Tambah item nav "Agenda Baca" pada sidebar
    - Edit `src/features/dashboard/components/app-sidebar.tsx`: tambahkan entri `{ title: "Agenda Baca", href: "/dashboard/events", icon: CalendarHeart }` setelah item "Circle Baca"
    - _Requirements: 12.3, 12.4_

- [x] 12. Final checkpoint - Pastikan semua tes lulus
  - Jalankan `npm run lint` dan `npm run build`
  - Pastikan semua tes lulus, tanyakan ke user jika ada pertanyaan.

## Notes

- Sub-task bertanda `*` adalah opsional (property/unit test) dan dapat dilewati untuk MVP cepat. Repo belum memiliki test runner; bila pengguna setuju, dependency `vitest` ditambahkan saat sub-task `2.2` pertama dijalankan.
- Setiap task mengacu requirements granular (klausa `X.Y`), bukan hanya user story.
- Property test mengikuti `Correctness Properties` di `design.md` dengan nomor properti tetap (1–14).
- Server actions sengaja dipisah jadi beberapa task karena semua menulis ke file yang sama (`src/actions/reading-events.ts`); urutan task = urutan eksekusi.
- Fungsi `deriveEventStatus` adalah satu-satunya sumber kebenaran status; tidak ada cron job atau scheduler.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.3", "3.1"] },
    { "id": 2, "tasks": ["2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3"] },
    { "id": 5, "tasks": ["5.4", "5.5"] },
    { "id": 6, "tasks": ["5.6", "5.7"] },
    { "id": 7, "tasks": ["5.8", "5.9"] },
    { "id": 8, "tasks": ["7.1", "8.1"] },
    { "id": 9, "tasks": ["7.2", "7.3", "8.2"] },
    { "id": 10, "tasks": ["8.3", "9.1", "10.1", "10.2", "10.3"] },
    { "id": 11, "tasks": ["9.2", "10.4"] },
    { "id": 12, "tasks": ["9.3", "10.5"] },
    { "id": 13, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5"] }
  ]
}
```
