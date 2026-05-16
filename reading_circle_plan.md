# Reading Circle Plan

Tambahkan fitur **Reading Circle / Buddy Read** sebagai ruang diskusi komunitas untuk **satu buku tertentu**, dengan fokus pada diskusi terstruktur, progress baca bersama, target bab/checkpoint, dan pengalaman yang terasa berbeda dari chat biasa.

## Visi Fitur

`Reading Circle` bukan group chat generik. Fitur ini harus terasa seperti:

- club baca kecil
- ruang diskusi per buku
- reading sprint bersama
- forum mini dengan konteks buku yang jelas

Karena itu, implementasi yang disarankan adalah **threaded discussion** dan **progress bersama**, bukan sekadar room chat linear seperti DM.

## Product Goal

- User bisa membuat atau bergabung ke `circle` untuk buku yang sama.
- Setiap circle terikat ke **1 buku**.
- User dapat membuat post diskusi dan komentar dalam thread.
- Ada konteks buku yang jelas di header.
- Ada anggota circle, target baca, dan progress bersama.
- Circle bisa dipakai untuk buddy read publik maupun privat.
- Fitur ini harus terasa native dengan Shelfgram dan terhubung secara natural ke `explore`, `profile`, `shelf`, dan `chat` yang sudah ada.

## Prinsip Produk

1. **Satu buku, banyak circle**.
   - Jangan buat satu room global untuk satu buku.
   - Satu buku harus bisa punya banyak circle berbeda.

2. **Diskusi berbentuk post + comment thread, bukan messenger penuh**.
   - User ingin membahas ide, karakter, tema, atau bab tertentu.
   - Format thread lebih cocok daripada chat linear.

3. **Spoiler harus bisa dikontrol**.
   - Diskusi buku tanpa spoiler control akan cepat rusak.

4. **Progress bersama adalah inti fitur**.
   - Ini yang membedakan dari posting biasa.

5. **Jangan mencampur ke chat 1:1 yang sudah ada**.
   - Chat pribadi tetap di `/dashboard/chat`.
   - Circle adalah fitur sosial komunitas terpisah.

## MVP yang Direkomendasikan

### User flow utama

1. User membuka `"/dashboard/explore"`.
2. User memilih buku dan membuka `BookDetailDrawer`.
3. User menekan CTA baru seperti:
   - `Buat Circle`
   - `Lihat Circle`
4. User membuat circle baru untuk buku itu.
5. User diarahkan ke halaman detail circle.
6. Di halaman circle, user bisa:
   - melihat header buku + info circle
   - melihat daftar post diskusi
   - membuat post diskusi baru
   - memberi komentar pada post
   - melihat anggota circle
   - mengatur progress bacanya sendiri

### Scope MVP

- create circle
- join / leave circle
- public/private circle
- circle header dengan konteks buku
- post diskusi
- comment thread 1 level
- progress anggota sederhana
- target bab / checkpoint dasar
- sidebar/history/list circle milik atau yang diikuti user
- spoiler tag dasar di level post

## Out of Scope untuk MVP

- realtime group chat penuh
- nested replies tanpa batas
- audio/video room
- notifikasi push/email kompleks
- AI moderator / AI recap otomatis
- polling dan reaction kompleks
- event kalender sinkron otomatis

Semua itu cocok untuk fase berikutnya, bukan MVP.

## Rekomendasi Arsitektur

### Kenapa tidak memakai tabel chat yang ada

Project ini sudah punya dua sistem percakapan:

- `ChatConversation` / `ChatMessage` untuk chat antar-user
- `BookAiConversation` / `BookAiMessage` untuk diskusi AI per buku

`Reading Circle` sebaiknya menjadi **sistem ketiga yang terpisah** karena:

- bentuk interaksi berbeda
- metadata yang dibutuhkan berbeda
- scope dan permission berbeda
- thread posting lebih cocok daripada message linear
- lebih mudah dikembangkan ke arah community feature

### Bentuk data yang direkomendasikan

Struktur paling sehat:

- `ReadingCircle`
- `ReadingCircleMember`
- `ReadingCirclePost`
- `ReadingCircleComment`
- `ReadingCircleProgress`

Opsional untuk fase berikutnya:

- `ReadingCircleCheckpoint`
- `ReadingCircleInvite`
- `ReadingCircleReaction`
- `ReadingCircleWeeklyPrompt`

## Route Strategy

Karena ini fitur sosial yang berdiri sendiri, route yang direkomendasikan adalah **top-level dashboard**, bukan ditaruh permanen di bawah `explore`.

### Route baru

```txt
src/app/dashboard/circles/page.tsx
src/app/dashboard/circles/[circleId]/page.tsx
src/app/dashboard/circles/discover/page.tsx
```

### Entry point dari buku

Tetap dari `BookDetailDrawer` di halaman `explore`, tetapi redirect ke:

```txt
/dashboard/circles/[circleId]
```

Alasan:

- circle hidup lebih lama dari sesi eksplorasi buku
- user bisa kembali ke circle dari sidebar/dashboard
- fitur ini akan berkembang menjadi destination sendiri

## CTA dan Entry Point yang Direkomendasikan

### Dari `BookDetailDrawer`

Tambahkan dua CTA:

1. `Buat Circle`
2. `Lihat Circle`

Perilaku:

- `Buat Circle` membuka flow create circle dengan buku ini sebagai konteks tetap
- `Lihat Circle` membuka daftar circle publik untuk buku tersebut jika ada

### Dari sidebar dashboard

Tambahkan item baru:

```txt
Circle Baca
```

agar user bisa kembali ke daftar semua circle yang dia miliki/ikuti.

### Dari profile / shelf (fase lanjutan)

Nanti bisa tambahkan:

- `Circle yang diikuti`
- `Sedang buddy read`

## Desain UX yang Disarankan

### Halaman daftar circle

`/dashboard/circles`

Tampilkan:

- daftar circle user
- card ringkas circle
- tombol `Buat Circle baru`
- section `discover` untuk circle publik yang relevan

### Halaman detail circle

`/dashboard/circles/[circleId]`

Gunakan layout 3 area:

1. **Header context buku + circle**
   - cover buku
   - judul buku
   - nama circle
   - deskripsi singkat
   - target baca / checkpoint aktif
   - jumlah anggota

2. **Main discussion feed**
   - post diskusi
   - komentar per post
   - spoiler gate

3. **Sidebar / panel samping**
   - anggota circle
   - progress bersama
   - target minggu ini
   - aksi join/leave/edit

### Bentuk interaksi

Jangan modelkan seperti `ChatWorkspace`.

Lebih cocok seperti:

- user membuat top-level post
- anggota lain reply ke post itu
- post bisa dikaitkan ke bab tertentu
- post bisa ditandai spoiler

Dengan begitu diskusi tetap rapi dan tidak tenggelam seperti group chat.

## Model Data yang Direkomendasikan

### Enum

```prisma
enum ReadingCirclePrivacy {
  PUBLIC
  PRIVATE
  UNLISTED
}

enum ReadingCircleRole {
  OWNER
  MODERATOR
  MEMBER
}

enum ReadingCirclePostType {
  DISCUSSION
  CHECKPOINT
  QUESTION
  ANNOUNCEMENT
  SYSTEM
}

enum ReadingCircleProgressStatus {
  WANT_TO_READ
  READING
  FINISHED
}

enum ReadingCircleSpoilerLevel {
  NONE
  CHAPTER_RANGE
  MAJOR
  ENDING
}
```

### `ReadingCircle`

```prisma
model ReadingCircle {
  id               String                 @id @default(cuid())
  ownerId          String
  title            String
  description      String?                @db.Text
  privacy          ReadingCirclePrivacy   @default(PUBLIC)
  bookTitle        String
  bookAuthor       String
  bookCoverUrl     String?
  workKey          String?
  editionKey       String?
  openLibraryUrl   String?
  contextJson      Json
  targetLabel      String?
  targetChapterFrom Int?
  targetChapterTo   Int?
  currentChapterFocus String?
  memberCount      Int                    @default(1)
  lastActivityAt   DateTime?
  createdAt        DateTime               @default(now())
  updatedAt        DateTime               @updatedAt

  owner     User                    @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  members   ReadingCircleMember[]
  posts     ReadingCirclePost[]
  progress  ReadingCircleProgress[]

  @@index([ownerId, updatedAt])
  @@index([privacy, lastActivityAt])
}
```

### `ReadingCircleMember`

```prisma
model ReadingCircleMember {
  id         String              @id @default(cuid())
  circleId   String
  userId     String
  role       ReadingCircleRole   @default(MEMBER)
  joinedAt   DateTime            @default(now())
  lastSeenAt DateTime?

  circle ReadingCircle @relation(fields: [circleId], references: [id], onDelete: Cascade)
  user   User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([circleId, userId])
  @@index([userId, joinedAt])
}
```

### `ReadingCirclePost`

```prisma
model ReadingCirclePost {
  id               String                     @id @default(cuid())
  circleId         String
  authorId         String
  type             ReadingCirclePostType      @default(DISCUSSION)
  title            String?
  body             String                     @db.Text
  spoilerLevel     ReadingCircleSpoilerLevel  @default(NONE)
  spoilerFromChapter Int?
  spoilerToChapter   Int?
  commentCount     Int                        @default(0)
  createdAt        DateTime                   @default(now())
  updatedAt        DateTime                   @updatedAt

  circle   ReadingCircle         @relation(fields: [circleId], references: [id], onDelete: Cascade)
  author   User                  @relation(fields: [authorId], references: [id], onDelete: Cascade)
  comments ReadingCircleComment[]

  @@index([circleId, createdAt])
  @@index([authorId, createdAt])
}
```

### `ReadingCircleComment`

```prisma
model ReadingCircleComment {
  id         String   @id @default(cuid())
  postId      String
  authorId    String
  body        String   @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  post   ReadingCirclePost @relation(fields: [postId], references: [id], onDelete: Cascade)
  author User              @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([postId, createdAt])
  @@index([authorId, createdAt])
}
```

### `ReadingCircleProgress`

```prisma
model ReadingCircleProgress {
  id              String                      @id @default(cuid())
  circleId        String
  userId          String
  status          ReadingCircleProgressStatus @default(WANT_TO_READ)
  progressPercent Int?
  currentChapter  String?
  note            String?                     @db.Text
  updatedAt       DateTime                    @updatedAt
  createdAt       DateTime                    @default(now())

  circle ReadingCircle @relation(fields: [circleId], references: [id], onDelete: Cascade)
  user   User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([circleId, userId])
  @@index([userId, updatedAt])
}
```

## Kenapa Simpan Snapshot Buku

Sama seperti `BookAiConversation`, circle perlu menyimpan snapshot buku ke `contextJson`.

Keuntungannya:

- header circle cepat dirender
- context tetap stabil walau Open Library berubah
- fitur lanjutan seperti AI recap / AI prompt bisa menggunakan snapshot yang sama

## Integrasi dengan Model `User`

Tambahkan relation baru di `User`:

```prisma
readingCirclesOwned    ReadingCircle[]
readingCircleMemberships ReadingCircleMember[]
readingCirclePosts     ReadingCirclePost[]
readingCircleComments  ReadingCircleComment[]
readingCircleProgress  ReadingCircleProgress[]
```

## Struktur File yang Direkomendasikan

```txt
src/
  app/
    dashboard/
      circles/
        page.tsx
        discover/
          page.tsx
        [circleId]/
          page.tsx
  actions/
    reading-circle.ts
  features/
    reading-circle/
      components/
        reading-circle-shell.tsx
        reading-circle-sidebar.tsx
        reading-circle-history-drawer.tsx
        reading-circle-header.tsx
        reading-circle-feed.tsx
        reading-circle-post-composer.tsx
        reading-circle-comment-composer.tsx
        reading-circle-members-panel.tsx
        reading-circle-progress-panel.tsx
        create-circle-dialog.tsx
        join-circle-button.tsx
      lib/
        serializers.ts
        defaults.ts
      types.ts
  app/
    api/
      reading-circles/
        [circleId]/
          posts/
            route.ts
          comments/
            route.ts
          progress/
            route.ts
```

## File-by-File Plan

### 1. `src/features/books/components/book-detail-drawer.tsx`

Tambahkan CTA baru:

- `Buat Circle`
- opsional `Cari Circle`

Flow:

- CTA membuka dialog create circle sederhana
- default title bisa diisi otomatis dari judul buku
- submit memanggil server action create circle
- redirect ke `/dashboard/circles/[circleId]`

### 2. `src/actions/reading-circle.ts`

Tambah server actions utama.

Minimal MVP:

- `createReadingCircleFromBook(book: BookResult, input)`
- `getReadingCirclePageData(circleId)`
- `getMyReadingCircles()`
- `joinReadingCircle(circleId)`
- `leaveReadingCircle(circleId)`
- `createReadingCirclePost(circleId, input)`
- `createReadingCircleComment(postId, input)`
- `updateReadingCircleProgress(circleId, input)`

Semua action harus:

- memakai `requireAuth()`
- validasi ownership / membership / privacy
- revalidate path yang relevan

### 3. `src/app/dashboard/circles/page.tsx`

Halaman daftar circle user.

Isi:

- list circle yang dimiliki/diikuti
- quick actions untuk create circle
- empty state yang mengarahkan user kembali ke `explore`

### 4. `src/app/dashboard/circles/[circleId]/page.tsx`

Halaman utama detail circle.

Server Component yang memuat:

- circle detail
- posts
- comments
- members summary
- progress summary
- history/list circle user

### 5. `src/features/reading-circle/components/reading-circle-shell.tsx`

Rekomendasi: **reuse pattern layout** dari `BookAiChatShell`, tapi untuk circle.

Struktur:

- sidebar history/list circle
- header konteks buku + metadata circle
- main feed post + comments
- side panel anggota/progress

### 6. `src/features/reading-circle/components/reading-circle-header.tsx`

Header circle harus menampilkan:

- cover buku
- judul buku
- author
- nama circle
- privacy badge
- target baca aktif
- jumlah anggota
- CTA join/leave

### 7. `src/features/reading-circle/components/reading-circle-feed.tsx`

Main discussion feed.

Isi:

- daftar post urut terbaru / pinned-first (jika nanti ada pin)
- setiap post menampilkan author, waktu, spoiler badge, chapter tag
- comment thread 1 level di bawah post

### 8. `src/features/reading-circle/components/reading-circle-post-composer.tsx`

Composer untuk membuat top-level discussion post.

Input minimum:

- title optional
- body required
- spoiler level
- optional chapter range tag

### 9. `src/features/reading-circle/components/reading-circle-comment-composer.tsx`

Composer untuk reply post.

MVP cukup:

- body text sederhana
- submit via action / route

### 10. `src/features/reading-circle/components/reading-circle-members-panel.tsx`

Panel samping anggota.

Tampilkan:

- owner/moderator/member ringkas
- avatar
- progress singkat

### 11. `src/features/reading-circle/components/reading-circle-progress-panel.tsx`

Panel progress bersama.

Tampilkan:

- progress rata-rata anggota
- status count:
  - want to read
  - reading
  - finished
- target checkpoint aktif

### 12. `src/features/reading-circle/components/create-circle-dialog.tsx`

Dialog create circle dari buku.

Fields MVP:

- title
- description
- privacy
- target label
- optional chapter focus awal

### 13. `src/app/api/reading-circles/[circleId]/posts/route.ts`

Opsional jika ingin post via route handler.

Kalau tidak butuh streaming, Server Actions saja cukup. Namun route handler berguna jika nanti ada rich text / draft autosave / mobile integration.

## Permission Rules

### Public circle

- semua user login bisa melihat
- semua member bisa post/comment
- non-member bisa melihat dan join

### Private circle

- hanya member yang bisa melihat isi
- join harus lewat invite atau approval (approval bisa fase 2)

### Unlisted circle

- tidak muncul di discover publik
- bisa diakses via link dan join jika diizinkan

### Owner / moderator

Owner atau moderator dapat:

- edit metadata circle
- hapus post bermasalah
- update target baca
- kick member (fase 2)

## Spoiler Policy

Spoiler harus ada dari MVP.

### Level minimum

- `NONE`
- `CHAPTER_RANGE`
- `MAJOR`
- `ENDING`

### UI behavior

- post bertanda spoiler tidak langsung menampilkan penuh
- user harus klik `Tampilkan spoiler`
- badge spoiler harus terlihat jelas di feed

## Progress & Checkpoint MVP

### Progress per user

MVP cukup simpan:

- status baca
- progress percent optional
- current chapter text optional

### Checkpoint circle

MVP cukup simpan di `ReadingCircle`:

- `targetLabel`
- `targetChapterFrom`
- `targetChapterTo`
- `currentChapterFocus`

Contoh:

- `Minggu 1`
- bab 1-3

Nanti fase lanjutan baru dipisah jadi tabel `ReadingCircleCheckpoint` jika butuh histori checkpoint.

## Discoverability

### Fase MVP

Di halaman `/dashboard/circles` cukup tampilkan:

- `Circle saya`
- `Circle yang saya ikuti`
- section kecil `Circle publik terbaru`

### Fase lanjutan

Tambah `discover` terpisah:

- populer minggu ini
- berdasarkan genre favorit user
- berdasarkan buku di shelf user
- circle dari orang yang di-follow

## Integrasi dengan Fitur Existing

### Dengan `explore`

- entry point utama create circle berasal dari `BookDetailDrawer`

### Dengan `profile`

- fase lanjutan: tampilkan `Circle aktif` user di profil

### Dengan `chat`

- jangan campur struktur dengan `/dashboard/chat`
- kalau perlu koordinasi personal antar anggota, tetap gunakan chat 1:1 existing

### Dengan `book-ai-chat`

- fase lanjutan yang kuat: AI bisa membuat recap mingguan dari sebuah circle
- tapi **bukan bagian MVP**

## Future Expansion yang Sangat Menarik

### Phase 2

1. **Weekly prompt otomatis**
   - sistem membuat prompt diskusi mingguan

2. **Pinned posts**
   - checkpoint utama / pengumuman circle

3. **Invite via link**
   - untuk private/unlisted circle

4. **Moderation tools**
   - hide/delete post, promote moderator

5. **Reactions sederhana**
   - insightful, agree, heart

### Phase 3

1. **AI recap per checkpoint**
2. **AI discussion starter**
3. **Poll per circle**
4. **Reading schedule kalender**
5. **Integrasi peminjaman buku antar anggota circle**
6. **Notifikasi center untuk aktivitas circle**

## Verification Plan

### Prisma / build

Karena fitur ini menambah model baru:

```bash
npm run prisma:generate
npm run prisma:push
npm run lint
npm run build
```

### Manual verification MVP

1. Login user A.
2. Buka `/dashboard/explore`.
3. Cari buku.
4. Buka detail drawer.
5. Klik `Buat Circle`.
6. Isi title + privacy.
7. Submit.
8. Pastikan redirect ke `/dashboard/circles/[circleId]`.
9. Pastikan header menampilkan konteks buku yang benar.
10. Buat post diskusi.
11. Tambah komentar pada post itu.
12. Update progress baca user.
13. Login user B.
14. Temukan circle publik yang sama.
15. Join circle.
16. Pastikan user B bisa melihat post dan komentar.
17. Buat post baru dari user B.
18. Pastikan member count dan last activity berubah.
19. Uji private circle: user non-member tidak boleh melihat konten.
20. Uji spoiler post: konten tidak boleh terbuka otomatis.

## Definition of Done

Fitur dianggap selesai jika:

- User bisa membuat circle dari sebuah buku di `explore`
- Circle memiliki halaman detail sendiri
- Header circle menampilkan konteks buku dan metadata circle
- User dapat join / leave circle
- User dapat membuat post dan komentar
- User dapat update progress baca
- Circle punya spoiler tag dasar
- Circle muncul di daftar/history user
- `npm run prisma:generate` lulus
- `npm run prisma:push` lulus
- `npm run lint` lulus
- `npm run build` lulus

## Implementasi Bertahap yang Direkomendasikan

### Step 1

- tambah schema Prisma
- tambah action create/list/get circle
- tambah route page daftar dan detail

### Step 2

- tambah CTA dari `BookDetailDrawer`
- buat shell + header + sidebar

### Step 3

- implement post dan comment thread

### Step 4

- implement progress panel dan checkpoint sederhana

### Step 5

- implement spoiler gate dan privacy enforcement

### Step 6

- polishing discover/listing dan empty states

## Catatan Penting

- Jangan memaksakan realtime untuk MVP. Struktur diskusi dan progress jauh lebih penting.
- Jika nanti ingin realtime, gunakan layer tambahan setelah model data stabil.
- Gunakan snapshot buku seperti fitur `Book AI Chat` agar circle selalu punya konteks buku yang stabil.
- Gunakan pattern shell/list/detail yang mirip `BookAiChatShell` agar pengalaman aplikasi tetap konsisten.
