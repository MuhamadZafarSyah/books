# Book Review & Rating Plan

Tambahkan fitur **review dan rating buku** dengan alur:

`list buku -> detail buku -> lihat review dan rating -> halaman review buku -> user membaca review user lain -> user bisa menambah 1 review + rating untuk buku itu -> review bisa diedit / dihapus`

Dan saat user berhasil membuat rating/review, sistem harus otomatis menganggap bahwa user **sudah membaca** buku tersebut dengan menandai buku ke status `FINISHED` agar nantinya masuk ke area profil seperti **"Buku yang Sudah Dibaca"**.

## Tujuan

- User bisa melihat kumpulan review dan rating untuk satu buku tertentu.
- User bisa menambahkan tepat **satu** review untuk satu buku.
- Review itu bisa diedit dan dihapus.
- Saat review dibuat, buku otomatis masuk ke status `FINISHED` milik user.
- Fitur harus menyatu dengan flow buku dari `explore` dan memakai arsitektur project yang sudah ada.

## Prinsip Produk

1. **Satu user, satu review per buku**.
2. **Rating dan review adalah sinyal bahwa buku sudah dibaca**.
3. **Delete review tidak berarti menghapus riwayat membaca**.
4. **Halaman review buku adalah halaman editorial/list-driven**, bukan grid card kotak-kotak generik.
5. **Book review harus memakai data buku lokal**, bukan langsung bergantung ke payload Open Library mentah pada setiap operasi database.

## Product Behavior Yang Diinginkan

### Flow utama

1. User membuka `"/dashboard/explore"`.
2. User memilih buku dan membuka `BookDetailDrawer`.
3. User klik tombol baru seperti:

```txt
Lihat review dan rating
```

4. App memastikan ada record `Book` lokal untuk buku tersebut.
5. User diarahkan ke halaman review buku.
6. Di halaman itu, user bisa:
   - melihat rating rata-rata buku
   - melihat daftar review user lain
   - menulis review sendiri jika belum ada
   - mengedit review sendiri jika sudah ada
   - menghapus review sendiri

### Aturan review

- Setiap user hanya boleh punya **1** review untuk **1** buku.
- Review boleh di-edit berkali-kali.
- Review boleh dihapus.
- Saat review pertama kali dibuat:
  - `UserBook` untuk buku tersebut harus di-upsert menjadi `FINISHED`
  - buku dianggap sudah dibaca

### Aturan setelah delete

Saat review dihapus:

- `BookReview` dihapus
- **jangan** otomatis mengubah `UserBook.status` kembali
- buku tetap dianggap pernah dibaca

Alasan:

- delete review berarti user menghapus tulisannya, bukan membatalkan fakta bahwa ia sudah membaca buku itu
- ini lebih stabil untuk statistik dan future feature `Buku yang Sudah Dibaca`

## Kenapa Perlu Record `Book` Lokal

Saat ini buku di `explore` berasal dari Open Library (`BookResult`), sedangkan review dan shelf progress di database bergantung pada model `Book` lokal.

Karena itu flow review harus **meng-upsert `Book` lokal terlebih dahulu**.

## Rekomendasi Data Strategy

### 1. Gunakan `Book` lokal sebagai source of truth untuk review

Semua `BookReview` dan `UserBook` harus mengarah ke `Book.id` lokal.

### 2. Simpan identitas Open Library di `Book`

Model `Book` saat ini terlalu minim untuk dedupe buku dari Open Library. Untuk mendukung review page yang stabil, tambahkan metadata sumber agar buku yang sama tidak terduplikasi.

## Perubahan Prisma yang Direkomendasikan

### `Book`

Tambahkan field berikut:

```prisma
model Book {
  id               String   @id @default(cuid())
  slug             String?  @unique
  workKey          String?  @unique
  editionKey       String?
  openLibraryUrl   String?
  title            String
  author           String
  coverUrl         String?
  description      String?  @db.Text
  firstPublishYear Int?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  owners  UserBook[]
  reviews BookReview[]

  @@index([editionKey])
}
```

### `BookReview`

Tambahkan unique constraint:

```prisma
model BookReview {
  id         String             @id @default(cuid())
  userId     String
  bookId     String
  rating     Int?
  body       String             @db.Text
  visibility UserBookVisibility @default(PUBLIC)
  createdAt  DateTime           @default(now())
  updatedAt  DateTime           @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@unique([userId, bookId])
  @@index([userId, createdAt])
  @@index([bookId, createdAt])
}
```

## Kenapa `@@unique([userId, bookId])` wajib

Karena user meminta:

- hanya satu kali rating dan review
- tapi bisa edit / hapus

Constraint ini harus dijaga di level database, bukan hanya di UI.

## Route Strategy

### Route baru yang direkomendasikan

```txt
src/app/dashboard/explore/books/[bookId]/reviews/page.tsx
```

### Kenapa pakai `bookId` lokal

- downstream query review jadi sederhana
- tidak perlu parse `workKey`/`editionKey` di banyak tempat
- semua relasi Prisma tetap konsisten
- mudah dipakai lagi untuk shelf/profile/reading history

## Entry Point dari `BookDetailDrawer`

Tambahkan CTA baru di `src/features/books/components/book-detail-drawer.tsx`:

```txt
Lihat review dan rating
```

Flow tombol:

1. panggil Server Action untuk memastikan `Book` lokal ada
2. action return `bookId`
3. `router.push(`/dashboard/explore/books/${bookId}/reviews`)`

### Catatan UX

Tombol ini sebaiknya diletakkan bersama CTA action buku lain, dekat:

- `Diskusi buku ini`
- `Buat Circle`
- `Buka di Open Library`

Tetapi pastikan susunan tetap ringan dan tidak terlalu penuh.

## Design Direction

Halaman review harus mengikuti guideline visual terbaru project:

- jangan terlalu sering memakai `Card`
- jangan membuat setiap review menjadi kotak besar generik yang seragam
- gunakan layout yang lebih ringan:
  - header editorial
  - list review dengan divider halus
  - composer yang clean
  - whitespace dan hierarchy teks sebagai struktur utama

### Hindari

- grid review cards
- terlalu banyak badge/stat chip
- banyak icon dekoratif berulang
- box di dalam box di dalam box

### Gunakan

- satu surface utama untuk area review
- review row / review block yang tipis dan readable
- metadata minimum:
  - avatar
  - nama user
  - timestamp
  - star rating
  - isi review

## Halaman Review Buku

### Struktur halaman yang direkomendasikan

1. **Header buku**
   - cover kecil
   - judul
   - author
   - CTA kembali ke explore/detail jika perlu

2. **Summary review**
   - rating rata-rata
   - jumlah review
   - distribusi bintang sederhana (opsional MVP+)

3. **User action area**
   - jika user belum review: form tambah review
   - jika user sudah review: tampilkan review miliknya + tombol edit/hapus

4. **Review feed**
   - daftar review user lain
   - urut terbaru atau relevan

### Rekomendasi layout desktop

- kiri/atas: header buku + summary
- tengah: review feed
- area form user tetap terlihat jelas, tapi tidak perlu card besar generik

### Rekomendasi mobile

- header ringkas di atas
- summary menyatu
- form user di atas feed
- feed vertikal satu kolom

## File Structure yang Direkomendasikan

```txt
src/
  app/
    dashboard/
      explore/
        books/
          [bookId]/
            reviews/
              page.tsx
  actions/
    book-reviews.ts
  features/
    book-reviews/
      components/
        book-review-shell.tsx
        book-review-header.tsx
        book-review-summary.tsx
        book-review-feed.tsx
        book-review-item.tsx
        book-review-form.tsx
        user-review-panel.tsx
      schemas/
        book-review-schemas.ts
      lib/
        serializers.ts
        ensure-local-book.ts
      types.ts
```

## File-by-File Plan

### 1. `src/actions/book-reviews.ts`

Tambahkan server actions inti:

- `ensureLocalBookFromResult(book: BookResult)`
- `getBookReviewPageData(bookId: string)`
- `upsertBookReview(bookId: string, values)`
- `deleteBookReview(reviewId: string)`

### `ensureLocalBookFromResult(book)`

Tugas:

- pastikan buku dari Open Library punya row `Book` lokal
- dedupe berdasarkan `workKey` bila ada
- fallback ke `editionKey` bila perlu
- jika belum ada, create
- jika sudah ada, update metadata yang masih kosong/lebih lemah

Return:

```ts
{ bookId: string }
```

### `getBookReviewPageData(bookId)`

Tugas:

- auth lewat `requireAuth()`
- ambil data buku lokal
- ambil review user saat ini jika ada
- ambil review publik user lain
- hitung summary rating

### `upsertBookReview(bookId, values)`

Tugas:

- validasi form
- upsert review tunggal user untuk buku ini
- upsert `UserBook` ke status `FINISHED`
- set `finishedAt` jika belum ada
- revalidate route review dan profile terkait

### `deleteBookReview(reviewId)`

Tugas:

- validasi ownership review
- hapus review
- **jangan** reset `UserBook.status`
- revalidate halaman terkait

## `UserBook` Behavior Saat Review Dibuat

### Aturan yang direkomendasikan

Saat `upsertBookReview(...)` berhasil:

- upsert `UserBook` untuk pasangan `(userId, bookId)`
- set:

```txt
status = FINISHED
finishedAt = now() jika sebelumnya null
```

### Visibility policy

Rekomendasi:

- jika review visibility `PUBLIC`, promote `UserBook.visibility` minimal ke `PUBLIC`
- jika existing visibility sudah `PUBLIC`, biarkan
- jika existing visibility `FOLLOWERS`, evaluasi apakah mau dipertahankan atau dipromote ke `PUBLIC`

### Rekomendasi produk paling sederhana

Untuk konsistensi MVP:

- review publik => buku terbaca publik
- artinya set `UserBook.visibility = PUBLIC`

Karena user secara eksplisit mengatakan buku itu nanti harus masuk ke profil bagian "Buku yang Sudah Dibaca".

## Schema Validation

Tambahkan file:

```txt
src/features/book-reviews/schemas/book-review-schemas.ts
```

Schema minimum:

- `rating`: integer `1-5`, required
- `body`: string required, trim, max length misalnya `4000`
- optional future: `visibility`

Rekomendasi:

- body required
- min length ringan, misalnya `10`

Alasan:

- user meminta review dan rating, bukan rating-only

## Types yang Direkomendasikan

Tambahkan file:

```txt
src/features/book-reviews/types.ts
```

Minimal:

```ts
type BookReviewSummary = {
  id: string;
  rating: number | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    slug: string;
  };
};

type BookReviewPageData = {
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
    description: string | null;
    openLibraryUrl: string | null;
    firstPublishYear: number | null;
  };
  summary: {
    averageRating: number | null;
    reviewCount: number;
    ratingCounts: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  currentUserReview: BookReviewSummary | null;
  reviews: BookReviewSummary[];
};
```

## Page Strategy

### `src/app/dashboard/explore/books/[bookId]/reviews/page.tsx`

Server Component.

Tugas:

- `requireAuth()`
- ambil data bootstrap review page
- render shell + client island seperlunya

## UI Components yang Direkomendasikan

### 1. `book-review-shell.tsx`

Shell utama halaman.

### 2. `book-review-header.tsx`

Tampilkan konteks buku:

- cover
- judul
- author
- year
- CTA ke Open Library jika ada

### 3. `book-review-summary.tsx`

Tampilkan:

- average rating
- review count
- distribusi bintang sederhana

Gunakan layout ringan, misalnya text + horizontal bars, bukan card grid.

### 4. `user-review-panel.tsx`

Area khusus review milik current user.

Jika belum ada review:

- tampilkan form tambah review

Jika sudah ada review:

- tampilkan review milik user di posisi atas
- tombol `Edit`
- tombol `Hapus`

### 5. `book-review-form.tsx`

Client component interaktif.

Gunakan:

- `react-hook-form`
- `zodResolver`
- rating control 1-5
- textarea review

### 6. `book-review-feed.tsx`

List review user lain.

Render sebagai list editorial dengan divider, bukan tumpukan card generik.

### 7. `book-review-item.tsx`

Tampilkan satu review:

- avatar
- name
- username opsional
- rating
- body
- waktu

## Query / Sorting Rekomendasi

### Summary rating

Hitung server-side:

- total review
- average rating dari review yang punya rating non-null
- jumlah review per bintang

### Feed order

MVP order:

- current user review di atas pada panel khusus
- review user lain: `createdAt desc`

MVP+ order opsional:

- helpful / popular / latest

## Revalidation Rules

Saat review dibuat/diubah/dihapus:

Revalidate minimal:

- route review buku itu
- `/dashboard/explore` bila ada preview review di masa depan
- `/dashboard/profile` user sendiri
- `/u/[slug]` user sendiri

Karena profil publik saat ini sudah memakai:

- `BookReview`
- `UserBook.status = FINISHED`

jadi perubahan ini akan otomatis sinkron ke statistik profil dan future section buku selesai dibaca.

## Integrasi dengan Profil User

Saat review dibuat, `booksReadCount` di profile publik sebenarnya sudah bisa meningkat karena saat ini `booksReadCount` dihitung dari:

```txt
UserBook.visibility = PUBLIC
status = FINISHED
```

Jadi plan ini harus memastikan:

- `UserBook.status = FINISHED`
- `UserBook.visibility = PUBLIC` untuk reviewed book

Supaya future section `Buku yang Sudah Dibaca` tidak perlu memperbaiki data lama.

## Integrasi dengan Public Profile Review List

`latestReviews` saat ini sudah ada di `src/lib/public-profile.ts`.

Dengan implementasi plan ini:

- review baru akan otomatis masuk ke future / existing public profile review surfaces
- tidak perlu sistem review terpisah lagi

## Security Rules

- hanya user login yang bisa submit/edit/delete review
- hanya owner review yang bisa edit/delete review miliknya
- review publik dari user lain boleh dilihat user login
- jangan bocorkan data internal user yang tidak perlu

## Verification Plan

### Prisma sync

Karena ada perubahan schema:

```bash
npm run prisma:generate
npm run prisma:push
```

### Build checks

```bash
npm run lint
npm run build
```

### Manual verification

1. Login user.
2. Buka `/dashboard/explore`.
3. Pilih buku.
4. Buka detail drawer.
5. Klik `Lihat review dan rating`.
6. Pastikan redirect berhasil ke halaman review buku.
7. Pastikan summary rating tampil walau belum ada review.
8. Tambah review pertama user.
9. Pastikan review tersimpan.
10. Pastikan user tidak bisa membuat review kedua untuk buku yang sama.
11. Edit review.
12. Pastikan perubahan tersimpan.
13. Hapus review.
14. Pastikan review hilang.
15. Pastikan buku tetap dianggap selesai dibaca di data user.
16. Buat review publik baru lagi.
17. Buka profil publik user.
18. Pastikan statistik review dan buku dibaca konsisten.

## Definition of Done

- tombol `Lihat review dan rating` tersedia di detail buku
- halaman review buku tersedia
- user dapat melihat review user lain
- user hanya bisa punya satu review per buku
- review bisa edit dan delete
- create review meng-upsert `UserBook` ke `FINISHED`
- reviewed book dipersiapkan masuk ke future profile section `Buku yang Sudah Dibaca`
- `npm run prisma:generate` lulus
- `npm run prisma:push` lulus
- `npm run lint` lulus
- `npm run build` lulus

## Urutan Implementasi yang Direkomendasikan

1. Update schema Prisma `Book` dan `BookReview`.
2. Tambah helper `ensureLocalBookFromResult`.
3. Tambah server actions review.
4. Tambah route page review buku.
5. Tambah CTA dari `BookDetailDrawer`.
6. Implement shell + summary + feed + form.
7. Tambah revalidation ke profil dan route review.
8. Verifikasi manual dan build.

## Catatan Penting

- Untuk fitur ini, jangan langsung membuat sistem like/helpful review atau threaded review reply. Fokus dulu pada core review/rating yang bersih.
- Karena project sudah punya guideline visual yang menghindari card-heavy layout, halaman review harus dijadikan contoh penerapan list-driven editorial UI yang lebih dewasa.
