# Design Document — Reading Events

## Overview

Reading Events adalah fitur sosial yang memungkinkan pengguna Shelfgram membuat agenda baca tatap muka di lokasi fisik tertentu, mengundang pengguna lain bergabung melalui daftar publik, dan menampilkan komentar singkat saat join. Fitur ini melengkapi (bukan menggantikan) Reading Circle yang sudah ada: Reading Circle berorientasi diskusi online seputar satu buku, sedangkan Reading Events berorientasi pertemuan offline pada lokasi/waktu tertentu.

Tujuan desain:

1. **Tegas pada model status.** `EventStatus` adalah satu nilai yang diturunkan secara deterministik dari tiga sumber (waktu server, jumlah peserta vs kuota, flag pembatalan). Klien tidak perlu menyimpan dua versi status yang bisa kontradiktif.
2. **Konsisten dengan pola repo.** Menggunakan pola yang sudah dipakai Reading Circle: server actions di `src/actions/`, feature folder di `src/features/<feature>/`, schemas Zod terpisah, serializers murni untuk view-models, App Router server-shell + client-form split, primitives dari `src/components/ui` shadcn.
3. **Map sebagai dependency yang dapat gagal.** Map_Component (mapcn.dev / MapLibre GL) dipasang lewat shadcn CLI dan dimuat hanya di sisi klien. Setiap layar yang memakainya menyiapkan jalur fallback teks.
4. **Aman dari race kuota.** Penegakan kuota dilakukan di transaksi Postgres dengan baris Event di-lock (SELECT FOR UPDATE), bukan dari hitungan klien.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  App Router (src/app/dashboard/events/...)                          │
│  Server Components (page.tsx, *-shell.tsx) — auth, fetch, SEO       │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Feature module (src/features/reading-events)                       │
│  ├── schemas/    Zod schemas (form + server input)                  │
│  ├── lib/        Pure helpers (status derivation, serializers)      │
│  ├── types.ts    View-models (no Prisma leak)                       │
│  └── components/ Server shells + Client form/list/map widgets       │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Server actions (src/actions/reading-events.ts) — "use server"      │
│  - requireAuth + ownership checks                                   │
│  - Prisma transactions for atomic quota / membership writes         │
│  - Returns serialized view-models, never raw Prisma rows            │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Prisma (src/prisma/schema.prisma)                                  │
│  ReadingEvent ─< ReadingEventParticipant >─ User                    │
└─────────────────────────────────────────────────────────────────────┘
```

Data mengalir hanya satu arah: Server Component → server action → Prisma. Client Component memanggil server action lewat form action atau `startTransition`, lalu menerima view-model serial untuk render.

### Dependensi baru

| Package | Asal | Alasan |
|---|---|---|
| `mapcn.dev` map components | `npx shadcn@latest add https://mapcn.dev/maps/map.json` | Map_Component yang diminta requirements; otomatis menambahkan `maplibre-gl` dan menyalin komponen ke `src/components/ui/map.tsx` (atau path serupa sesuai output CLI) |
| `maplibre-gl` | Transitive dari mapcn | Engine peta |

Semua peta digambar di sisi klien. Tidak ada API key (mapcn memakai tile gratis). Untuk pencarian alamat (forward geocoding), kita panggil Nominatim publik (`https://nominatim.openstreetmap.org/search`) dari route handler kita sendiri agar bisa menambahkan User-Agent dan rate-limit Upstash yang sudah ada di repo.

## Components and Interfaces

### 1. Routing

```
src/app/dashboard/events/
├── page.tsx                 # Event_List_View (server)
├── new/
│   └── page.tsx             # CreateEventShell + CreateEventForm
├── [eventId]/
│   ├── page.tsx             # Event_Detail_View (server)
│   └── edit/
│       └── page.tsx         # EditEventShell + EditEventForm
```

Setiap `page.tsx` adalah Server Component yang memanggil `requireAuth()` (Requirement 10.2) dan satu fungsi loader dari `src/actions/reading-events.ts`. Tampilan interaktif (form, peta, dialog Join) diisolasi ke Client Components terpisah.

Sidebar (`src/features/dashboard/components/app-sidebar.tsx`) ditambah satu item nav baru:

```ts
{ title: "Agenda Baca", href: "/dashboard/events", icon: CalendarHeart }
```

Item ini diletakkan setelah "Circle Baca" agar konseptual berdekatan.

### 2. Komponen feature (`src/features/reading-events/components/`)

| File | Tipe | Tanggung jawab |
|---|---|---|
| `event-list-shell.tsx` | Server | Menerima `EventListPageData`, render header dan menyusun `EventListClient` |
| `event-list-client.tsx` | Client | Search box (debounced 400 ms via `useDebounceValue` dari `usehooks-ts`), filter "hanya yang masih bisa join", pagination 20/halaman, list rendering, loading skeleton |
| `event-list-row.tsx` | Client | Satu baris event (judul, host, lokasi, waktu, peserta/kuota, badge status). Tidak memakai Card — gunakan list row tipis dengan separator (mengikuti aturan AGENTS.md "Do not overuse Card") |
| `event-detail-shell.tsx` | Server | Render detail Event, banner CANCELLED, dan menyusun client islands |
| `event-detail-actions.tsx` | Client | Tombol Join / Batalkan keikutsertaan / Edit / Batalkan event tergantung peran |
| `event-join-dialog.tsx` | Client | Dialog konfirmasi Join + textarea Join_Comment (≤ 280 char, counter) |
| `event-participants-list.tsx` | Client | Avatar + nama peserta (dengan placeholder "Pembaca" + inisial) |
| `event-comments-list.tsx` | Client | Daftar Join_Comment terurut joinedAt desc dengan placeholder "Belum ada komentar dari peserta" |
| `event-form.tsx` | Client | Event_Form react-hook-form, Zod resolver, dipakai untuk create dan edit |
| `event-form-shell.tsx` | Server | Wrapper yang memuat data event saat edit dan mengoper sebagai default values |
| `event-map-picker.tsx` | Client | Map_Component edit-mode: pilih marker + search alamat (debounced 300 ms) |
| `event-map-view.tsx` | Client | Map_Component read-only dengan satu marker |
| `event-status-badge.tsx` | Pure | Mapping `EventStatus` ke label + warna shadcn `Badge` |

Komponen `event-form.tsx` mengangkat state lewat `react-hook-form` saja; tidak ada Redux. Map picker meng-update field `latitude`, `longitude`, dan `locationAddress` dengan `setValue` sehingga skema Zod tetap satu sumber.

### 3. Wiring Map_Component

mapcn ships dua bentuk pemakaian: bare `Map` primitive dengan props seperti `initialViewState`, `onClick`, dan child components `Marker`, `MapControls`, `MapSearch`. Karena library disalin ke repo via shadcn CLI, file aslinya bisa kita import dari path yang dihasilkan (kemungkinan `@/components/ui/map`).

Wrapper `event-map-picker.tsx` menambahkan:

- `onClick` handler → ambil `lng/lat`, panggil `form.setValue("longitude" | "latitude", …, { shouldValidate: true })`.
- Search box internal yang men-debounce 300 ms (Requirement 2.4) memanggil route handler kita: `GET /api/reading-events/geocode?q=…` yang membungkus Nominatim (User-Agent `Shelfgram/1.0`, rate-limit per IP via Upstash).
- Timer load: `useEffect` set `loadFailed=true` setelah 8000 ms tanpa event `load` (Requirement 2.5); ketika `loadFailed=true`, render fallback panel berisi `Input` manual untuk `locationAddress`, `latitude`, `longitude`.
- Saat peta sukses dimuat, koordinat manual diset `disabled` (Requirement 2.6); saat fallback aktif, koordinat manual aktif.

Wrapper `event-map-view.tsx` membuat `interactive={true}` untuk pan/zoom tetapi `Marker draggable={false}`, dan tidak meng-attach `onClick` apapun (Requirement 4.3).

### 4. Server actions (`src/actions/reading-events.ts`)

Semua action mengikuti kontrak: `"use server"`, lempar `Error` saat validasi/auth gagal (UI menangkap di `try/catch` form), kembalikan view-model serial.

```ts
// Loader
getReadingEventsListPage(input: { page: number; q?: string; onlyJoinable: boolean }):
  Promise<EventListPageData>

getReadingEventDetail(eventId: string):
  Promise<ReadingEventDetail | null>

getReadingEventForEdit(eventId: string):
  Promise<ReadingEventEditData>           // throws if not host

// Mutators
createReadingEvent(input: CreateReadingEventInput):
  Promise<{ eventId: string }>

updateReadingEvent(eventId: string, input: UpdateReadingEventInput):
  Promise<ReadingEventDetail>

cancelReadingEvent(eventId: string):
  Promise<ReadingEventDetail>

joinReadingEvent(eventId: string, input: { comment?: string }):
  Promise<ReadingEventDetail>

leaveReadingEvent(eventId: string):
  Promise<ReadingEventDetail>
```

Setiap mutator memanggil `requireAuth()` (Requirement 10.1), memvalidasi input dengan skema Zod yang sama dengan klien, dan memanggil `revalidatePath("/dashboard/events")` plus `revalidatePath("/dashboard/events/${eventId}")`.

### 5. Skema Zod (`src/features/reading-events/schemas/reading-event-schemas.ts`)

```ts
export const eventFormBaseSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi.").max(120, "Judul maksimal 120 karakter."),
  description: z.string().trim().max(2000, "Deskripsi maksimal 2000 karakter.").optional().or(z.literal("")),
  locationAddress: z.string().trim().min(1, "Alamat lokasi wajib diisi.").max(200, "Alamat maksimal 200 karakter."),
  latitude: z.number().gte(-90).lte(90, "Latitude tidak valid."),
  longitude: z.number().gte(-180).lte(180, "Longitude tidak valid."),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  quota: z.number().int().gte(2, "Kuota minimal 2.").lte(100, "Kuota maksimal 100."),
  bookReferenceUrl: z
    .string()
    .url("Tautan referensi buku harus URL valid.")
    .refine((u) => /openlibrary\.org/i.test(u), "Tautan harus dari Open Library.")
    .optional()
    .or(z.literal("")),
});

export const createEventSchema = eventFormBaseSchema.superRefine((v, ctx) => {
  if (v.endsAt.getTime() <= v.startsAt.getTime()) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Waktu selesai harus setelah waktu mulai." });
  }
  if (v.startsAt.getTime() <= Date.now()) {
    ctx.addIssue({ code: "custom", path: ["startsAt"], message: "Waktu mulai harus di masa depan." });
  }
});

export const updateEventSchema = eventFormBaseSchema.superRefine(/* same rules; startsAt rule applies on submit */);

export const joinEventSchema = z.object({
  comment: z.string().trim().max(280, "Komentar maksimal 280 karakter.").optional().or(z.literal("")),
});
```

Skema dipakai di Client Component (`zodResolver`) **dan** di server action (`schema.parse`). Pesan-pesan menyebut nama field yang sama dengan yang diminta requirements ("kuota", "waktu selesai", "waktu mulai", "komentar").

## Data Models

### Tambahan Prisma (`src/prisma/schema.prisma`)

```prisma
enum ReadingEventStatusFlag {
  ACTIVE
  CANCELLED
}

model ReadingEvent {
  id               String                 @id @default(cuid())
  hostId           String
  title            String
  description      String?                @db.Text
  locationAddress  String
  latitude         Float
  longitude        Float
  startsAt         DateTime
  endsAt           DateTime
  quota            Int
  participantCount Int                    @default(1)
  bookReferenceUrl String?
  statusFlag       ReadingEventStatusFlag @default(ACTIVE)
  cancelledAt      DateTime?
  createdAt        DateTime               @default(now())
  updatedAt        DateTime               @updatedAt

  host         User                        @relation(fields: [hostId], references: [id], onDelete: Cascade)
  participants ReadingEventParticipant[]

  @@index([startsAt, statusFlag])
  @@index([hostId, startsAt])
}

model ReadingEventParticipant {
  id       String   @id @default(cuid())
  eventId  String
  userId   String
  comment  String?  // ≤ 280 karakter, opsional
  joinedAt DateTime @default(now())

  event ReadingEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user  User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([eventId, userId])
  @@index([eventId, joinedAt])
  @@index([userId, joinedAt])
}
```

Penambahan ke `model User` (relasi balik):

```prisma
readingEventsHosted        ReadingEvent[]
readingEventParticipations ReadingEventParticipant[]
```

Catatan kolom:

- `statusFlag` hanya menyimpan satu hal: apakah Host membatalkan event. Status `SCHEDULED/FULL/ONGOING/COMPLETED` diturunkan saat dibaca (lihat Logic Flows). Pendekatan ini memenuhi Requirement 9.4 ("≤ 60 detik dari waktu sebenarnya") tanpa cron job.
- `participantCount` di-denormalisasi agar Event_List_View tidak perlu count() per baris. Konsistensi dijaga di transaksi join/leave/cancel.
- `comment` boleh null (Join_Comment bersifat opsional, Requirement 5.1) dan tidak ditampilkan jika kosong (Requirement 11.1).

Setelah perubahan schema, jalankan `npm run prisma:generate && npm run prisma:push` (sesuai panduan AGENTS.md, tanpa `--accept-data-loss`).

### View-models (`src/features/reading-events/types.ts`)

```ts
export type ReadingEventStatus =
  | "SCHEDULED"
  | "FULL"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED";

export type ReadingEventParticipantSummary = {
  id: string;
  userId: string;
  name: string | null;
  image: string | null;
  joinedAt: string;
  comment: string | null;
};

export type ReadingEventSummary = {
  id: string;
  hostId: string;
  hostName: string | null;
  hostImage: string | null;
  title: string;
  locationAddress: string;
  startsAt: string;
  endsAt: string;
  quota: number;
  participantCount: number;
  status: ReadingEventStatus;
};

export type ReadingEventDetail = ReadingEventSummary & {
  description: string | null;
  latitude: number;
  longitude: number;
  bookReferenceUrl: string | null;
  participants: ReadingEventParticipantSummary[];
  isHost: boolean;
  isParticipant: boolean;
};

export type EventListPageData = {
  events: ReadingEventSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasNext: boolean;
};
```

View-model murni primitif + ISO strings agar aman dilewatkan dari Server ke Client Component.

## Logic Flows

### 1. Derivasi `EventStatus` (Requirement 9.1–9.4)

Fungsi murni di `src/features/reading-events/lib/derive-status.ts`:

```ts
export function deriveEventStatus(input: {
  statusFlag: "ACTIVE" | "CANCELLED";
  startsAt: Date;
  endsAt: Date;
  participantCount: number;
  quota: number;
  now?: Date;
}): ReadingEventStatus {
  const now = input.now ?? new Date();
  if (input.statusFlag === "CANCELLED") return "CANCELLED";
  if (now >= input.endsAt) return "COMPLETED";
  if (now >= input.startsAt) return "ONGOING";
  if (input.participantCount >= input.quota) return "FULL";
  return "SCHEDULED";
}
```

Setiap loader server action memanggil fungsi ini saat menyusun summary/detail. Karena dievaluasi pada setiap permintaan dari `now = new Date()` server, persyaratan ≤ 60 detik terpenuhi tanpa scheduler.

### 2. Pembuatan event (Requirement 1)

```
client form submit
   → server action createReadingEvent(input)
       → requireAuth
       → createEventSchema.parse(input)         // Req 1.2, 1.4–1.6
       → prisma.$transaction:
           - create ReadingEvent (statusFlag=ACTIVE, participantCount=1)
           - create ReadingEventParticipant { eventId, userId=host, comment=null }
       → revalidatePath
       → return { eventId }
```

Host otomatis menjadi peserta pertama (Requirement 1.7) lewat baris ke-2 transaksi. Kuota wajib `≥ 2` agar selalu ada slot tersisa setelah Host masuk. Bila pengguna belum login, `requireAuth()` melempar redirect `/auth/login` (Requirement 1.8).

### 3. Join + Join_Comment (Requirement 5, 7.1–7.3)

Race kondisi kuota dijaga dengan `SELECT … FOR UPDATE` di transaksi. Prisma 7 tidak punya helper built-in untuk row-lock, jadi gunakan `tx.$queryRaw`:

```ts
await prisma.$transaction(async (tx) => {
  const rows = await tx.$queryRaw<ReadingEventLockRow[]>`
    SELECT id, "statusFlag", "startsAt", "endsAt", quota, "participantCount"
    FROM "ReadingEvent"
    WHERE id = ${eventId}
    FOR UPDATE
  `;
  const event = rows[0];
  if (!event) throw new Error("Event tidak ditemukan.");

  const status = deriveEventStatus({ ...event, statusFlag: event.statusFlag });
  if (status !== "SCHEDULED") {
    throw new Error(`Event tidak menerima peserta (status: ${status}).`);
  }
  if (event.participantCount >= event.quota) {
    throw new Error("Event tidak menerima peserta (status: FULL).");
  }

  // Ditolak duplikat oleh @@unique([eventId, userId])
  try {
    await tx.readingEventParticipant.create({
      data: { eventId, userId, comment: parsed.comment || null },
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new Error("Anda sudah bergabung.");
    throw e;
  }

  await tx.readingEvent.update({
    where: { id: eventId },
    data: { participantCount: { increment: 1 } },
  });
});
```

Kunci tingkat baris menjamin bahwa dua request konkuren mengantri; permintaan kedua melihat `participantCount` yang sudah naik dan ditolak dengan status `FULL` (Requirement 7.3). Constraint `@@unique([eventId, userId])` memenuhi Requirement 5.7 secara db-level.

### 4. Pembatalan keikutsertaan (Requirement 6)

Mirip dengan join, juga di transaksi terkunci:

- Ambil row Event terkunci.
- Tolak jika user adalah Host (Requirement 6.5).
- Tolak jika user bukan peserta (Requirement 6.4).
- Hitung `derivedStatus`. Jika `ONGOING/COMPLETED`, tolak (Requirement 6.3); `CANCELLED` boleh keluar (event sudah dibatalkan dan kita tetap bersihkan untuk konsistensi).
- Hapus baris `ReadingEventParticipant` dan decrement `participantCount`. Tidak perlu menulis ulang status karena `deriveEventStatus` otomatis mengembalikan `SCHEDULED` setelah jumlah turun (Requirement 6.2).

### 5. Edit event (Requirement 8.1–8.6)

Update schema sama dengan create kecuali aturan `startsAt > now` hanya berlaku jika nilai berubah dari nilai semula (mencegah error spurious untuk event yang sudah lewat masa lalu pada saat edit dipanggil dengan nilai yang sama persis). Server menolak jika user bukan host (Requirement 8.3, 10.3) dan menolak jika `quota < participantCount` saat ini (Requirement 7.4). Daftar peserta tidak disentuh (Requirement 8.2).

### 6. Pembatalan event oleh Host (Requirement 8.4–8.5)

```
cancelReadingEvent(eventId)
  → requireAuth, ownership check
  → prisma.readingEvent.update({ statusFlag: CANCELLED, cancelledAt: now })
  → revalidate
```

Server action lain (`joinReadingEvent`, `leaveReadingEvent`, `updateReadingEvent`) tetap mengevaluasi `statusFlag` dan menolak jika sudah `CANCELLED` (Requirement 8.5).

### 7. Daftar event (Requirement 3)

Loader `getReadingEventsListPage`:

- Query: `where: { statusFlag: "ACTIVE", endsAt: { gt: now } }` lalu filter status di app layer setelah `deriveEventStatus`. Karena hanya `SCHEDULED/FULL` yang ditampilkan jika `startsAt > now` (Requirement 3.1), kita ambil `where.startsAt: { gt: now }` plus `statusFlag: "ACTIVE"`.
- Pencarian: `q` setelah trim diapply sebagai `OR: [{ title contains, mode insensitive }, { description contains, mode insensitive }, { locationAddress contains, mode insensitive }]` (Requirement 3.6).
- Filter `onlyJoinable=true` dievaluasi setelah serialize: drop semua `status !== "SCHEDULED"` (Requirement 3.3).
- Pagination: `take=20`, `skip=(page-1)*20`, urutan `startsAt asc` (Requirement 3.4, 3.1).

Sisi klien meng-debounce input pencarian 400 ms via `useDebounceValue` lalu memanggil server action lewat `useTransition` agar indikator loading muncul (Requirement 3.5, 3.7).

### 8. Update detail tanpa reload penuh (Requirement 5.5, 6.x, 11.4)

Setelah server action `joinReadingEvent` / `leaveReadingEvent` resolve dengan `ReadingEventDetail` baru, Client Component memanggil `router.refresh()` (App Router) **dan** menyetel state lokal dengan detail baru. Pendekatan ini menghindari reload halaman penuh — layout dan peta tetap di-mount.

## Error Handling

Strategi: server actions melempar `Error` dengan pesan ramah Bahasa Indonesia (sesuai gaya repo), klien menangkap di `try/catch` dan menampilkan via `toast` shadcn dan/atau `react-hook-form`'s `setError` saat error terikat field.

| Sumber error | Penanganan |
|---|---|
| Zod parse di klien | `react-hook-form` menampilkan pesan inline di field; tombol simpan tetap disabled saat form invalid |
| Zod parse di server (input dari devtools / direct call) | Server melempar gabungan pesan; klien menampilkan toast generic "Form tidak valid" + pesan pertama |
| `requireAuth` redirect | Server Component otomatis redirect; mutator action melempar `Error("Unauthorized")` yang ditangkap form jika user logout di tengah jalan |
| Ownership / forbidden | Server melempar `Error("Forbidden")` yang dipetakan ke toast "Aksi tidak diizinkan" |
| Race kuota (`FULL`) | Toast "Event sudah penuh" + memanggil `router.refresh()` agar tombol Join hilang |
| Map fail load (8 s) | Komponen sendiri menampilkan fallback (lihat Map_Component); tidak melempar error |
| Geocoding gagal | Search box menampilkan empty state "Tidak ada hasil"; pengetikan manual tetap valid |
| Sort Join_Comment gagal (Requirement 11.3) | Komponen comments membungkus mapping dalam `try/catch`; jika error, render placeholder "Komentar peserta sedang dimuat" |

Tidak menambahkan error boundary baru di tingkat layout — error boundaries default Next.js + handler di tiap form sudah cukup.

## Authorization & Session

- Semua route di `src/app/dashboard/events/...` di-cover oleh `requireAuth()` di `dashboard/layout.tsx` yang sudah ada (Requirement 10.2).
- Semua server action memanggil `requireAuth()` di awal (Requirement 10.1).
- `updateReadingEvent` dan `cancelReadingEvent` memuat event dan membandingkan `event.hostId === userId`. Jika tidak cocok, lempar `Error("Forbidden")` (Requirement 10.3, 8.3).
- Kolom relasi `hostId` di `ReadingEvent` dan `userId` di `ReadingEventParticipant` adalah FK ke `User.id` (Requirement 10.4) dengan `onDelete: Cascade` agar penghapusan akun ikut membersihkan data.

## Visual & Responsive Design

Mengikuti AGENTS.md Frontend Standards dan token Stitch:

| Token | Nilai (sesuai globals.css yang sudah ada) |
|---|---|
| Primary | Hijau hutan (`bg-primary`) |
| Surface | Krem hangat (`bg-background`) |
| Heading | Noto Serif (font-heading) |
| Body | Manrope (font-sans) |

Aturan tampilan:

- Event_List_View mempergunakan list rows dengan `Separator` antar baris, bukan grid `Card` (mengikuti aturan "Do not overuse Card").
- Event_Detail_View memakai split layout: header informasi + meta di kiri, peta + tombol aksi di kanan pada `lg:` ke atas; satu kolom di bawah `lg`.
- Event_Form: satu kolom < 1024 px, dua kolom ≥ 1024 px lewat `grid-cols-1 lg:grid-cols-2` (Requirement 12.2).
- Verifikasi tanpa horizontal scroll pada 375 / 768 / 1024 / 1440 px dengan `max-w-6xl` container dan `overflow-x-hidden` di parent dashboard.
- Primitives: `Button`, `Input`, `Textarea`, `Label`, `Dialog`, `Sheet`, `ScrollArea`, `Separator`, `Avatar`, `Badge`, `Tooltip`, `Toast` semua dari `@/components/ui/*` (Requirement 12.3).
- Ikon: hanya dari `lucide-react` (sudah dependensi). `CalendarHeart`, `MapPin`, `Users`, `Clock`, `BookOpen`, `Pencil`, `XCircle`, `LogOut`. Tidak ada emoji (steering ui-ux-pro-max).
- Hover: `transition-colors duration-200`, tidak ada scale-transform yang memicu layout shift.
- Tombol Join besar dengan `cursor-pointer` dan focus ring shadcn default; tombol "Batalkan event" memakai `variant="destructive"`.

## Correctness Properties

Properti invariant berikut harus selalu benar untuk implementasi yang valid. Ditulis agar bisa diuji secara property-based di masa depan, dan untuk saat ini menjadi checklist manual.

### Property 1: Quota_Never_Exceeded

Untuk setiap `ReadingEvent`, `participantCount ≤ quota` pada setiap titik waktu. Ditegakkan oleh transaksi `joinReadingEvent` yang melakukan `SELECT … FOR UPDATE` pada baris event sebelum increment.

**Validates: Requirements 7.1, 7.3**

### Property 2: Host_Is_First_Participant

Untuk setiap `ReadingEvent` yang ada di DB, terdapat tepat satu baris `ReadingEventParticipant { eventId, userId = hostId }` dan `participantCount ≥ 1`.

**Validates: Requirements 1.7**

### Property 3: Participant_Uniqueness

Tidak ada dua baris `ReadingEventParticipant` dengan pasangan `(eventId, userId)` yang sama. Ditegakkan db-level oleh `@@unique([eventId, userId])`.

**Validates: Requirements 5.7**

### Property 4: Status_Determinism

`deriveEventStatus(input)` adalah fungsi murni: untuk input identik (`statusFlag`, `startsAt`, `endsAt`, `participantCount`, `quota`, `now`) selalu mengembalikan output identik, tanpa I/O atau side effect.

**Validates: Requirements 9.1, 9.2, 9.4**

### Property 5: Status_Monotonic_Ordering

Untuk event yang tidak `CANCELLED`: bila `now1 < now2`, hasil `deriveEventStatus` mengikuti urutan searah `SCHEDULED → FULL? → ONGOING → COMPLETED`. `deriveEventStatus` tidak akan mengembalikan `SCHEDULED` untuk `now2 > startsAt` yang sama.

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 6: Cancel_Sticky

Saat `statusFlag = CANCELLED`, `deriveEventStatus` selalu mengembalikan `CANCELLED` terlepas dari nilai waktu atau peserta.

**Validates: Requirements 4.4, 8.4, 8.5**

### Property 7: Join_Closed_Outside_Scheduled

`joinReadingEvent` menolak setiap permintaan dan tidak menulis ke DB jika `deriveEventStatus()` mengembalikan apapun selain `SCHEDULED`.

**Validates: Requirements 5.6, 7.2, 9.3**

### Property 8: Leave_Decrements_Then_Status_Recovers

Setelah `leaveReadingEvent` sukses pada event yang sebelumnya `FULL` dan masih sebelum `startsAt`, `deriveEventStatus` mengembalikan `SCHEDULED`.

**Validates: Requirements 6.2**

### Property 9: Host_Cannot_Leave_Via_Leave

`leaveReadingEvent` selalu melempar error tanpa modifikasi DB jika `userId === event.hostId`.

**Validates: Requirements 6.5**

### Property 10: Edit_Quota_Bounded_By_Current_Participants

`updateReadingEvent` menolak setiap input yang `quota < participantCount` saat ini, tanpa modifikasi DB.

**Validates: Requirements 7.4**

### Property 11: Comment_Length_Bounded

Setiap `ReadingEventParticipant.comment` yang non-null memiliki panjang ≤ 280 karakter setelah trim.

**Validates: Requirements 5.3**

### Property 12: List_Filter_Soundness

Bila filter `onlyJoinable=true`, hasil `getReadingEventsListPage` tidak mengandung event dengan `status` selain `SCHEDULED`.

**Validates: Requirements 3.3**

### Property 13: Auth_Required_On_Mutators

Setiap server action `create/update/cancel/join/leave` melempar error sebelum tulisan apapun jika tidak ada sesi NextAuth valid.

**Validates: Requirements 10.1**

### Property 14: Ownership_Required_On_Host_Mutators

`updateReadingEvent` dan `cancelReadingEvent` melempar error tanpa modifikasi DB jika `userId !== event.hostId`.

**Validates: Requirements 8.3, 10.3**

## Testing Strategy

Repo belum punya test runner (AGENTS.md). Strategi verifikasi:

1. **Lint**: `npm run lint` setelah setiap perubahan UI/code.
2. **Build**: `npm run build` setelah perubahan yang menyentuh routing, server/client boundaries, auth, atau Prisma (kasus kita: ya).
3. **Manual smoke test list per requirement**, dijalankan via dev server:
   - Buat event dengan kuota 2 → status SCHEDULED, list menampilkan 1/2.
   - Akun lain join → status FULL, kuota tampil 2/2; coba join akun ketiga → tolak.
   - Tunggu (atau ubah waktu mulai mundur via DB) → derivasi ONGOING benar; tombol Join hilang.
   - Host menekan "Batalkan event" → banner CANCELLED muncul, tombol Join hilang.
   - Form: kirim kuota 1 → error inline pada "kuota"; kirim endsAt < startsAt → error pada "waktu selesai"; startsAt di masa lalu → error pada "waktu mulai".
   - Map: mute jaringan agar load gagal 8 s → fallback input manual muncul.
   - Search list: ketik → cek network tab (request hanya setelah 400 ms idle).

Bila di kemudian hari diintegrasikan unit/property testing, target prioritas adalah `deriveEventStatus` (pure, deterministik), `joinEventSchema` / `eventFormBaseSchema` (validation), dan transaksi quota race (memerlukan harness DB). Saat ini kami tidak menambahkan dependensi test baru tanpa permintaan eksplisit.

## Implementation Notes & Open Items

1. **Path import mapcn**: hasil pasti dari `npx shadcn@latest add https://mapcn.dev/maps/map.json` ditentukan oleh `components.json` repo (`"ui": "@/components/ui"`). Asumsi awal: file akan berada di `src/components/ui/map.tsx` (atau folder `src/components/ui/map/`). Implementasi membungkusnya dengan `event-map-picker.tsx` / `event-map-view.tsx` sehingga jika nama file mapcn berubah, hanya wrapper yang perlu disesuaikan.
2. **Geocoding rate-limit**: route handler `GET /api/reading-events/geocode` memakai `@upstash/ratelimit` yang sudah ada di repo (`src/lib/rate-limit.ts`) dengan kebijakan 30 req/menit per user agar tidak menyalahgunakan Nominatim publik.
3. **Timezone**: simpan `startsAt`/`endsAt` sebagai UTC (default Prisma) dan tampilkan di klien dengan `Intl.DateTimeFormat("id-ID", { timeStyle: "short", dateStyle: "medium" })`.
4. **Optimistic count**: setelah `joinReadingEvent` berhasil, kita mengandalkan view-model baru dari response, bukan optimistic update lokal — lebih aman terhadap race kuota.
5. **Skema `bookReferenceUrl`**: validasi sebatas URL Open Library, tidak men-fetch metadata (di luar scope requirements). Bisa diperkaya nanti memakai `src/lib/open-library.ts`.
6. **No Redux**: state form ditangani `react-hook-form`; state UI sederhana (open dialog) memakai `useState` lokal. Tidak ada slice baru.
