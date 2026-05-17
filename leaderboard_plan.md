# Leaderboard Plan

Tambahkan fitur **Leaderboard Keaktifan User** untuk menampilkan peringkat pembaca paling aktif berdasarkan aktivitas komunitas Shelfgram, seperti:

- membuat circle baca
- join circle baca
- membuat post diskusi circle
- membuat komentar di circle
- membuat agenda baca
- join agenda baca
- membuat review/rating buku
- follow user lain

Fitur ini harus punya:

- halaman leaderboard yang menarik
- API read endpoints yang jelas
- sistem scoring yang bisa berkembang
- arsitektur yang aman dari duplikasi dan spam activity dasar

## Tujuan

- Memberi insentif sosial untuk aktivitas yang benar-benar bernilai.
- Membuat fitur komunitas seperti `Reading Circle`, `Reading Events`, `Review`, dan `Follow` terasa saling terhubung.
- Menjadikan leaderboard sebagai destination page yang hidup dan shareable.
- Menyediakan API yang bisa dipakai ulang oleh dashboard, badge, widget, dan future notifications.

## Prinsip Produk

1. **Leaderboard harus mengukur kontribusi, bukan spam**.
2. **Aktivitas yang lebih bernilai harus berbobot lebih tinggi**.
3. **Edit tidak memberi poin tambahan**.
4. **Delete tidak boleh menjadi celah farm / refresh poin**.
5. **Page leaderboard harus terasa premium, ringan, dan tidak card-heavy**.

## Aktivitas yang Dihitung

### Sumber aktivitas fase awal

Gunakan event dari fitur yang saat ini sudah ada/direncanakan di repo:

- `createReadingCircleFromBook`
- `joinReadingCircle`
- `createReadingCirclePost`
- `createReadingCircleComment`
- `createReadingEvent`
- `joinReadingEvent`
- `upsertBookReview` (hanya saat create pertama)
- `togglePublicProfileFollow` (hanya saat follow berhasil dibuat)

### Aktivitas yang **tidak** menambah poin pada MVP

- edit circle
- edit post
- edit comment
- edit review
- delete review/post/comment
- membuka halaman
- melakukan pencarian
- membuat chat AI
- chat pribadi user-to-user

Alasan:

- aktivitas tersebut tidak cukup kuat sebagai sinyal kontribusi komunitas
- beberapa terlalu mudah di-spam
- beberapa terlalu jauh dari tujuan leaderboard sosial

## Scoring Model yang Direkomendasikan

### Base points

Gunakan bobot awal berikut:

| Aktivitas | Poin | Catatan |
|---|---:|---|
| Membuat circle baca | 40 | high-value social action |
| Join circle baca | 12 | unique per user per circle |
| Membuat post diskusi circle | 14 | lebih bernilai dari comment |
| Membuat komentar circle | 6 | capped per hari |
| Membuat agenda baca | 32 | high-value hosted community action |
| Join agenda baca | 10 | unique per user per event |
| Membuat review/rating buku | 24 | hanya saat review pertama untuk buku itu |
| Follow user lain | 4 | unique per target user |

### Kenapa bobotnya seperti ini

- `create circle` dan `create event` bernilai tinggi karena memicu aktivitas sosial baru
- `post` bernilai lebih tinggi daripada `comment`
- `review` bernilai tinggi karena menunjukkan kontribusi konten
- `follow` bernilai kecil karena sangat mudah dilakukan

## Anti-Abuse Rules

Leaderboard harus tahan terhadap spam dasar.

### Rule 1: dedupe by action source

Aktivitas tertentu hanya boleh dihitung **sekali** per source:

- join circle: sekali per `(userId, circleId)`
- join event: sekali per `(userId, eventId)`
- follow user: sekali per `(followerId, followingId)`
- review buku: sekali per `(userId, bookId)` untuk poin creation

### Rule 2: edit tidak memberi poin

- edit review = 0
- edit post = 0
- edit comment = 0

### Rule 3: cap aktivitas berulang

Untuk aktivitas yang bisa difarm terlalu cepat:

- komentar circle: hitung maksimal **8 komentar ber-poin per user per hari**
- post diskusi circle: hitung maksimal **5 post ber-poin per user per hari**
- follow user: hitung maksimal **10 follow ber-poin per user per hari**

### Rule 4: activity harus sukses dulu

Activity event baru dicatat **setelah mutation utama sukses commit ke DB**.

## Arsitektur yang Direkomendasikan

### Pendekatan MVP

Gunakan dua lapis:

1. **Activity ledger** immutable
2. **Query aggregation** untuk leaderboard read

Artinya:

- setiap aksi yang layak memberi poin akan mencatat satu event ke tabel `UserActivityEvent`
- halaman leaderboard dan API melakukan aggregate terhadap event tersebut

### Kenapa tidak langsung snapshot-only

Karena event ledger memberi keuntungan:

- mudah di-debug
- mudah diubah scoring-nya di masa depan
- bisa dipakai untuk analytics lain
- source of truth lebih jelas

### Phase 2 (opsional)

Jika volume sudah besar, tambahkan **snapshot/materialized leaderboard** per periode.

## Perubahan Prisma yang Direkomendasikan

### Enum

```prisma
enum UserActivityType {
  READING_CIRCLE_CREATED
  READING_CIRCLE_JOINED
  READING_CIRCLE_POST_CREATED
  READING_CIRCLE_COMMENT_CREATED
  READING_EVENT_CREATED
  READING_EVENT_JOINED
  BOOK_REVIEW_CREATED
  USER_FOLLOW_CREATED
}

enum UserActivitySourceType {
  READING_CIRCLE
  READING_CIRCLE_POST
  READING_CIRCLE_COMMENT
  READING_EVENT
  BOOK_REVIEW
  USER_FOLLOW
}
```

### Activity ledger table

```prisma
model UserActivityEvent {
  id         String                 @id @default(cuid())
  userId     String
  type       UserActivityType
  sourceType UserActivitySourceType
  sourceId   String
  points     Int
  dedupeKey  String?                @unique
  metadataJson Json?
  createdAt  DateTime               @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([type, createdAt])
  @@index([sourceType, createdAt])
  @@index([createdAt])
}
```

### Optional snapshot table for phase 2

```prisma
enum LeaderboardPeriod {
  DAILY
  WEEKLY
  MONTHLY
  ALL_TIME
}

enum LeaderboardScope {
  OVERALL
  CIRCLES
  EVENTS
  REVIEWS
  SOCIAL
}

model UserLeaderboardSnapshot {
  id          String            @id @default(cuid())
  userId      String
  period      LeaderboardPeriod
  scope       LeaderboardScope
  periodKey   String
  totalPoints Int
  rank        Int?
  breakdownJson Json?
  updatedAt   DateTime          @updatedAt
  createdAt   DateTime          @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, period, scope, periodKey])
  @@index([period, scope, periodKey, totalPoints])
}
```

### Integrasi ke `User`

Tambahkan relation:

```prisma
activityEvents UserActivityEvent[]
leaderboardSnapshots UserLeaderboardSnapshot[]
```

## Route Strategy

### Page route baru

```txt
src/app/dashboard/leaderboard/page.tsx
```

### API routes baru

```txt
src/app/api/leaderboard/route.ts
src/app/api/leaderboard/me/route.ts
src/app/api/leaderboard/scoring/route.ts
```

## API Design

### 1. `GET /api/leaderboard`

Tujuan:

- ambil ranking user untuk leaderboard utama

### Query params

```txt
period=weekly|monthly|all-time|daily
scope=overall|circles|events|reviews|social
limit=20
offset=0
```

### Response shape yang direkomendasikan

```ts
type LeaderboardUserRow = {
  rank: number;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    slug: string;
  };
  totalPoints: number;
  breakdown: {
    circles: number;
    events: number;
    reviews: number;
    social: number;
  };
  latestActivityAt: string | null;
};

type LeaderboardResponse = {
  period: "daily" | "weekly" | "monthly" | "all-time";
  scope: "overall" | "circles" | "events" | "reviews" | "social";
  topThree: LeaderboardUserRow[];
  rows: LeaderboardUserRow[];
  total: number;
};
```

### 2. `GET /api/leaderboard/me`

Tujuan:

- ambil posisi viewer saat ini tanpa harus memuat semua list

### Response

```ts
type LeaderboardMeResponse = {
  rank: number | null;
  totalPoints: number;
  percentile?: number | null;
  breakdown: {
    circles: number;
    events: number;
    reviews: number;
    social: number;
  };
};
```

### 3. `GET /api/leaderboard/scoring`

Tujuan:

- mengembalikan daftar bobot poin
- dipakai untuk panel `Cara perhitungan` di UI

### Response

```ts
type LeaderboardScoringResponse = {
  rules: Array<{
    type: string;
    label: string;
    points: number;
    notes?: string;
  }>;
};
```

## Internal Recording Strategy

### Jangan pakai API internal untuk insert activity

Pencatatan activity sebaiknya **bukan** lewat HTTP API, tetapi lewat helper server-side yang dipanggil langsung dari server actions yang sudah ada.

Contoh helper baru:

```txt
src/lib/leaderboard/record-activity.ts
```

### Fungsi utama yang direkomendasikan

- `recordActivityEvent(input)`
- `recordActivityIfEligible(input)`
- `hasDailyCapReached(...)`

## Integrasi ke Action Yang Sudah Ada

Tambahkan hook pencatatan activity ke action berikut **setelah mutation utama sukses**:

### `src/actions/reading-circle.ts`

- `createReadingCircleFromBook` -> `READING_CIRCLE_CREATED`
- `joinReadingCircle` -> `READING_CIRCLE_JOINED`
- `createReadingCirclePost` -> `READING_CIRCLE_POST_CREATED`
- `createReadingCircleComment` -> `READING_CIRCLE_COMMENT_CREATED`

### `src/actions/reading-events.ts`

- `createReadingEvent` -> `READING_EVENT_CREATED`
- `joinReadingEvent` -> `READING_EVENT_JOINED`

### `src/actions/book-reviews.ts`

- `upsertBookReview` -> `BOOK_REVIEW_CREATED`

Catatan penting:

- hanya saat review pertama untuk buku itu benar-benar dibuat
- edit review tidak mencatat event baru

### `src/actions/public-profile.ts`

- `togglePublicProfileFollow` -> `USER_FOLLOW_CREATED`

Catatan penting:

- hanya saat follow baru dibuat
- unfollow tidak mencatat poin negatif pada MVP

## Dedupe Key Strategy

Untuk mencegah poin ganda akibat retry/action ulang:

Contoh `dedupeKey`:

- create circle: `reading-circle:create:${circleId}`
- join circle: `reading-circle:join:${circleId}:${userId}`
- post circle: `reading-circle-post:create:${postId}`
- comment circle: `reading-circle-comment:create:${commentId}`
- create event: `reading-event:create:${eventId}`
- join event: `reading-event:join:${eventId}:${userId}`
- review create: `book-review:create:${userId}:${bookId}`
- follow create: `user-follow:create:${followerId}:${followingId}`

## Leaderboard Query Strategy

### MVP

Gunakan helper query terisolasi di:

```txt
src/lib/leaderboard/queries.ts
```

Tugas:

- resolve time window dari `period`
- filter scope
- aggregate total points per user
- hitung ranking
- ambil data user publik yang diperlukan

### Rekomendasi implementasi query

Untuk leaderboard read, raw SQL terisolasi lewat `prisma.$queryRaw` bisa lebih tepat daripada `groupBy` Prisma, karena:

- rank lebih natural
- filter + aggregation + ordering lebih fleksibel
- mudah menambahkan `topThree` dan `viewer rank`

Namun semua query mentah harus disimpan di satu layer utilitas, bukan tersebar di route.

## Period Semantics

Gunakan period berikut:

- `daily` = hari kalender saat ini
- `weekly` = minggu kalender aktif
- `monthly` = bulan kalender aktif
- `all-time` = semua event

## Scope Semantics

### `overall`

Semua activity dijumlahkan.

### `circles`

Hanya:

- circle create
- circle join
- post circle
- comment circle

### `events`

Hanya:

- event create
- event join

### `reviews`

Hanya:

- review/rating create

### `social`

Hanya:

- follow create

## Halaman Leaderboard

### Route

```txt
/dashboard/leaderboard
```

### High-level layout

Gunakan layout yang terasa seperti kombinasi:

- editorial ranking board
- premium game-like social stat page
- tetap minimalis dan modern

### Struktur yang direkomendasikan

1. **Hero header**
   - title
   - subcopy pendek
   - period switch
   - scope switch

2. **Top 3 podium**
   - pusat visual halaman
   - rank #1 ditonjolkan di tengah
   - #2 dan #3 di kiri/kanan dengan offset tinggi

3. **Ranked list**
   - list row panjang, bukan tumpukan card
   - rank, avatar, name, score, breakdown singkat

4. **Viewer position rail**
   - panel ringan yang menunjukkan posisi user sendiri
   - bisa sticky di desktop

5. **How scoring works**
   - panel kecil atau drawer/sheet
   - data diambil dari API scoring

## Design Direction

### Wajib

- menarik, terasa “achievement-driven”
- tetap ringan dan elegan
- tidak penuh kotak-kotak generik
- fokus pada hierarchy teks, avatar, score, spacing, dan rank rhythm

### Hindari

- grid penuh `Card` untuk semua ranking item
- badge berlebihan
- icon dekoratif di setiap row
- card-within-card-within-card
- terlalu banyak warna berbeda yang membuat leaderboard terasa murahan

### Gunakan

- satu hero surface utama untuk podium
- ranked list dalam satu container list besar dengan divider halus
- emphasis rank lewat typography dan spacing, bukan ornamen berat
- aksen warna hanya untuk top 3 dan viewer row

### Visual motif yang direkomendasikan

- warm cream + deep forest sesuai Shelfgram
- subtle spotlight / paper texture / ambient gradient pada podium
- top 3 bisa memakai layering ringan, bukan trophy icon besar-besaran

## UI Components yang Direkomendasikan

```txt
src/features/leaderboard/components/
  leaderboard-shell.tsx
  leaderboard-page-client.tsx
  leaderboard-header.tsx
  leaderboard-period-switch.tsx
  leaderboard-scope-switch.tsx
  leaderboard-podium.tsx
  leaderboard-rank-list.tsx
  leaderboard-rank-row.tsx
  leaderboard-viewer-panel.tsx
  leaderboard-scoring-drawer.tsx
  leaderboard-empty-state.tsx
```

## File Structure yang Direkomendasikan

```txt
src/
  app/
    dashboard/
      leaderboard/
        page.tsx
    api/
      leaderboard/
        route.ts
        me/
          route.ts
        scoring/
          route.ts
  features/
    leaderboard/
      components/
        leaderboard-shell.tsx
        leaderboard-page-client.tsx
        leaderboard-header.tsx
        leaderboard-podium.tsx
        leaderboard-rank-list.tsx
        leaderboard-rank-row.tsx
        leaderboard-viewer-panel.tsx
        leaderboard-scoring-drawer.tsx
      schemas/
        leaderboard-schemas.ts
      types.ts
  lib/
    leaderboard/
      periods.ts
      scoring.ts
      record-activity.ts
      queries.ts
      serializers.ts
```

## File-by-File Plan

### 1. `src/lib/leaderboard/scoring.ts`

Isi:

- konstanta skor per aktivitas
- label untuk API scoring
- rule cap dan category mapping

### 2. `src/lib/leaderboard/periods.ts`

Isi:

- resolver start/end date untuk `daily`, `weekly`, `monthly`, `all-time`

### 3. `src/lib/leaderboard/record-activity.ts`

Isi:

- helper record activity event
- dedupe handling
- cap checking

### 4. `src/lib/leaderboard/queries.ts`

Isi:

- query leaderboard rows
- query top three
- query viewer rank
- query breakdown

### 5. `src/features/leaderboard/schemas/leaderboard-schemas.ts`

Validasi query param:

- `period`
- `scope`
- `limit`
- `offset`

### 6. `src/features/leaderboard/types.ts`

Definisikan response types leaderboard.

### 7. `src/app/api/leaderboard/route.ts`

Public-in-app API untuk ranking list.

### 8. `src/app/api/leaderboard/me/route.ts`

API untuk posisi viewer.

### 9. `src/app/api/leaderboard/scoring/route.ts`

API untuk daftar rule poin.

### 10. `src/app/dashboard/leaderboard/page.tsx`

Server page shell.

Tugas:

- `requireAuth()`
- render shell awal
- pass initial period/scope ke client island

### 11. `src/features/leaderboard/components/leaderboard-page-client.tsx`

Client island untuk:

- period switching
- scope switching
- fetch API leaderboard
- fetch viewer rank
- fetch scoring rules

### 12. `src/features/dashboard/components/app-sidebar.tsx`

Tambahkan item sidebar baru:

```txt
Leaderboard
```

## Ranking Tie-breaker Rules

Jika total poin sama, urutkan berdasarkan:

1. `latestActivityAt desc`
2. `createdAt asc` user activity event terakhir atau user name asc sebagai fallback stabil

## Revalidation / Update Strategy

Karena leaderboard berbasis activity ledger:

- setiap create activity menulis event baru
- page leaderboard dapat membaca data fresh secara dynamic

### MVP

Tidak perlu realtime.

### Phase 2

Jika ingin lebih hidup:

- revalidate path leaderboard setelah event bernilai tinggi
- atau tambahkan polling ringan di client saat halaman terbuka

## Performance Strategy

### MVP

- query period-limited
- default `limit=20`
- gunakan pagination/offset untuk rank list panjang

### Phase 2

- tambahkan snapshot table
- tambahkan background recompute jika volume activity besar

## Verification Plan

### Manual verification

1. Login user A.
2. Buat circle.
3. Join circle dari user B.
4. Buat post dan komentar.
5. Buat agenda baca.
6. Join agenda baca dari user lain.
7. Buat review/rating buku.
8. Follow user lain.
9. Buka `/dashboard/leaderboard`.
10. Pastikan ranking berubah sesuai aktivitas.
11. Ubah period dari daily ke weekly/monthly/all-time.
12. Ubah scope dari overall ke circles/events/reviews/social.
13. Pastikan viewer panel menampilkan posisi user sendiri.
14. Pastikan top 3 dan list utama sinkron.

### API verification

Uji:

```txt
GET /api/leaderboard?period=weekly&scope=overall
GET /api/leaderboard/me?period=weekly&scope=overall
GET /api/leaderboard/scoring
```

### Build verification

Karena fitur ini menambah schema dan route:

```bash
npm run prisma:generate
npm run prisma:push
npm run lint
npm run build
```

## Definition of Done

- ada page leaderboard di dashboard
- ada API leaderboard utama
- ada API posisi viewer
- ada API scoring rules
- activity event tercatat dari source utama yang sudah ada
- leaderboard menampilkan top 3 dan ranked list
- desain menarik tapi tetap minimalis, modern, dan tidak card-heavy
- `npm run prisma:generate` lulus
- `npm run prisma:push` lulus
- `npm run lint` lulus
- `npm run build` lulus

## Fase Lanjutan yang Menarik

1. `Rising this week` vs `All-time legends`
2. `Friends-only leaderboard`
3. `Circle champions` untuk leaderboard khusus Reading Circle
4. `Event hosts of the month`
5. `Top reviewers`
6. `Badge & streak` system
7. Snapshot aggregation + cron recompute
8. Seasonal leaderboard campaign

## Catatan Penting

- Fokus leaderboard ini adalah **keaktifan komunitas**, bukan jumlah buku semata.
- Halaman leaderboard harus menjadi contoh penerapan visual yang menarik tanpa jatuh ke pola “card grid dashboard” yang generik.
- Untuk MVP, lebih penting membuat scoring dan page read experience yang kuat daripada menambah realtime atau badge berlebihan.
