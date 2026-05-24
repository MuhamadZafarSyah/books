# Highlight & Quote Collection Plan

Tambahkan fitur **Highlight & Quote Collection** agar pengguna bisa menyimpan kutipan favorit dari buku, memberi catatan/refleksi singkat, menampilkannya di profil, dan membagikannya ke reading circle sebagai konten sosial ringan.

## Tujuan

- User bisa menyimpan kutipan dari buku tertentu.
- User bisa menambahkan catatan pribadi pada kutipan.
- User bisa menyimpan metadata lokasi kutipan seperti halaman atau chapter.
- User bisa mengatur visibility kutipan: private, followers, atau public.
- Kutipan public bisa tampil di profil pengguna.
- Kutipan bisa dibagikan ke reading circle sebagai post diskusi khusus.
- Aktivitas membuat kutipan bisa muncul di activity feed dan leaderboard jika diinginkan.

## MVP Scope

Untuk versi pertama, fokus pada alur paling bernilai:

- Tambah kutipan dari halaman detail/review buku.
- Lihat daftar kutipan pribadi untuk buku tersebut.
- Edit dan hapus kutipan milik sendiri.
- Tampilkan kutipan public di profil.
- Bagikan kutipan ke circle sebagai `ReadingCirclePost` bertipe `QUOTE`.

Fitur berikut bisa masuk fase lanjutan:

- Halaman koleksi penuh di `/dashboard/quotes`.
- Filter berdasarkan buku, favorite, visibility, atau keyword.
- Like/reaction pada quote.
- Export quote ke image/share card.
- AI reflection dari kumpulan quote.

## Constraint Wajib

- Ikuti struktur `src/` yang sudah ada.
- Gunakan App Router dan Server Components untuk shell/data bootstrap.
- Client Components hanya untuk form, dialog, filter, dan interaksi lokal.
- Form wajib memakai `react-hook-form` + Zod resolver.
- Gunakan shadcn UI components yang sudah tersedia untuk button, input, textarea, dialog, label, card/list primitive yang sesuai.
- Perubahan Prisma wajib diikuti dengan `npm run prisma:generate` dan `npm run prisma:push`.
- Jangan memakai destructive Prisma flag seperti `--accept-data-loss` tanpa approval eksplisit.
- Jaga visual direction Shelfgram: cozy editorial, warm cream, forest green, soft rounded controls, dan rhythm minimal.

## Data Model

Tambahkan model baru `BookQuote` di `src/prisma/schema.prisma`.

```prisma
model BookQuote {
  id          String             @id @default(cuid())
  userId      String
  bookId      String
  quote       String             @db.Text
  note        String?            @db.Text
  page        Int?
  chapter     String?
  visibility  UserBookVisibility @default(PRIVATE)
  isFavorite  Boolean            @default(false)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([bookId, createdAt])
  @@index([visibility, createdAt])
}
```

Tambahkan relasi ke model `User`:

```prisma
quotes BookQuote[]
```

Tambahkan relasi ke model `Book`:

```prisma
quotes BookQuote[]
```

## Sharing Ke Reading Circle

Tambahkan enum baru pada `ReadingCirclePostType`:

```prisma
QUOTE
```

Tambahkan relasi opsional pada `ReadingCirclePost`:

```prisma
quoteId String?
quote   BookQuote? @relation(fields: [quoteId], references: [id], onDelete: SetNull)
```

Tambahkan relasi balik pada `BookQuote`:

```prisma
sharedPosts ReadingCirclePost[]
```

Alasan:

- Quote tetap menjadi entitas milik user.
- Saat dibagikan ke circle, quote menjadi post yang bisa dikomentari.
- Jika quote dihapus, post circle tidak perlu ikut hilang; `quoteId` menjadi null dan body post tetap menyimpan snapshot quote.

## Activity Feed Dan Leaderboard

Tambahkan enum activity:

```prisma
enum UserActivityType {
  BOOK_QUOTE_CREATED
}

enum UserActivitySourceType {
  BOOK_QUOTE
}
```

Catatan implementasi:

- Jangan benar-benar mengganti enum lama; tambahkan value baru ke enum yang sudah ada.
- `BOOK_QUOTE_CREATED` bisa diberi poin kecil, misalnya 2 atau 3.
- Jika quote private, pertimbangkan untuk tetap mencatat aktivitas untuk leaderboard, tetapi jangan tampilkan detail quote di public/community feed.
- Resolver activity feed harus bisa resolve `BOOK_QUOTE` ke judul buku dan href halaman buku.

## Server Actions

Buat file baru:

```txt
src/actions/book-quotes.ts
```

Actions yang dibutuhkan:

- `createBookQuote(bookId, input)`
- `updateBookQuote(quoteId, input)`
- `deleteBookQuote(quoteId)`
- `shareBookQuoteToCircle(quoteId, circleId, input?)`
- `getMyBookQuotesForBook(bookId)`
- `getPublicProfileQuotes(userId)`
- `getMyBookQuotes()` untuk fase halaman koleksi penuh

Validasi server:

- User wajib login.
- `bookId` harus valid.
- Quote wajib 3 sampai 1000 karakter.
- Note opsional maksimal 1000 karakter.
- Chapter opsional maksimal 120 karakter.
- Page opsional harus integer positif.
- User hanya boleh update/delete quote miliknya sendiri.
- User hanya boleh share quote miliknya sendiri.
- User hanya boleh share ke circle jika sudah menjadi member circle.

Revalidation:

- `revalidatePath("/dashboard/explore")` bila drawer/detail buku memakai data route itu.
- `revalidatePath(`/dashboard/explore/books/${bookId}/reviews`)` jika quote tampil di halaman review/detail buku.
- `revalidatePath("/dashboard/profile")` untuk quote public di profil sendiri.
- `revalidatePath(`/dashboard/circles/${circleId}`)` setelah share ke circle.

## Zod Schema

Buat file:

```txt
src/features/book-quotes/schemas/book-quote-schemas.ts
```

Schema yang direkomendasikan:

```ts
import { z } from "zod";

export const bookQuoteSchema = z.object({
  quote: z.string().trim().min(3).max(1000),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  page: z.coerce.number().int().positive().optional().or(z.literal("")),
  chapter: z.string().trim().max(120).optional().or(z.literal("")),
  visibility: z.enum(["PRIVATE", "FOLLOWERS", "PUBLIC"]),
  isFavorite: z.boolean().default(false),
});

export type BookQuoteFormValues = z.infer<typeof bookQuoteSchema>;
```

Saat implementasi, normalisasi string kosong menjadi `null` di server action agar data bersih.

## View Model Types

Tambahkan tipe baru, misalnya di:

```txt
src/features/book-quotes/types.ts
```

Tipe minimum:

```ts
export type BookQuoteSummary = {
  id: string;
  quote: string;
  note: string | null;
  page: number | null;
  chapter: string | null;
  visibility: "PRIVATE" | "FOLLOWERS" | "PUBLIC";
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
  };
};
```

## UI Components

Buat folder:

```txt
src/features/book-quotes/components/
```

Komponen utama:

- `quote-form-dialog.tsx`
- `quote-card.tsx`
- `quote-list.tsx`
- `quote-share-dialog.tsx`
- `book-quotes-panel.tsx`
- `profile-quotes-list.tsx`

Komponen form:

- Client Component.
- Pakai `useForm` dari `react-hook-form`.
- Pakai `zodResolver`.
- Field: quote, note, page, chapter, visibility, favorite.
- Submit memanggil server action via transition.
- Tampilkan toast sukses/gagal.

Komponen card:

- Quote dirender sebagai editorial block, bukan card generik berat.
- Gunakan kutipan besar, judul buku kecil, dan metadata halaman/chapter.
- Aksi milik sendiri: edit, hapus, share ke circle.
- Untuk profil publik, sembunyikan aksi owner-only.

## Integrasi Halaman Buku

Tempat integrasi utama:

```txt
src/features/book-reviews/components/book-review-shell.tsx
```

Atau jika detail buku lebih sering dipakai dari drawer:

```txt
src/features/books/components/book-detail-drawer.tsx
```

UI section:

- Heading: `Kutipan saya`
- Description: `Simpan kalimat yang ingin kamu ingat dari buku ini.`
- Button: `Tambah kutipan`
- Empty state: `Belum ada kutipan dari buku ini.`

Data yang dibutuhkan:

- Detail buku.
- Quote milik viewer untuk buku tersebut.
- Daftar circle viewer untuk share dialog.

## Integrasi Profil

Update tipe `ProfileOverview` di:

```txt
src/lib/dashboard/overview-types.ts
```

Tambahkan:

```ts
recentQuotes: DashboardQuoteCard[];
quoteCount: number;
```

Tambahkan query di:

```txt
src/lib/dashboard/overview-queries.ts
```

Rules profil:

- Profil sendiri boleh melihat semua quote atau minimal public quote plus akses ke halaman koleksi.
- Profil public user lain hanya menampilkan quote dengan `visibility = PUBLIC`.
- Limit awal 4 sampai 6 quote terbaru/favorite.

UI profil:

- Tambahkan section `Kutipan favorit` di `ProfileShell`.
- Tempatkan setelah `Rak baca` atau setelah `Review terbaru`.
- Gunakan gaya editorial ringan: quote text, judul buku, author, waktu relatif.

## Integrasi Reading Circle

Action `shareBookQuoteToCircle` akan:

1. Validasi quote milik user.
2. Validasi user member circle.
3. Buat `ReadingCirclePost` dengan `type = QUOTE` dan `quoteId`.
4. Snapshot quote ke `body` agar post tetap terbaca walau quote dihapus.
5. Update `ReadingCircle.lastActivityAt`.
6. Record activity `READING_CIRCLE_POST_CREATED` atau activity khusus quote-share jika nanti dibuat.
7. Return detail circle terbaru atau minimal success response.

Format body snapshot yang disarankan:

```txt
"Isi kutipan..."

Catatan:
Isi catatan user jika ada.
```

Update `ReadingCirclePostCard`:

- Jika `post.type === "QUOTE"`, render layout quote block.
- Tetap tampilkan komentar seperti post biasa.
- Jika relasi quote masih ada, tampilkan judul buku dan author dari `quote.book`.
- Jika relasi quote null, fallback ke body snapshot.

## Activity Feed Update

Update file:

```txt
src/features/dashboard/components/overview/activity-feed.tsx
src/lib/dashboard/overview-queries.ts
```

Tambahkan icon:

- Gunakan `Quote` dari `lucide-react`.

Label activity:

- `BOOK_QUOTE_CREATED`: `menyimpan kutipan dari`

Resolver subject:

- Source type `BOOK_QUOTE` resolve ke `BookQuote.book.title`.
- Href ke `/dashboard/explore/books/<bookId>/reviews`.

Privacy rule:

- Community feed sebaiknya hanya menampilkan quote public.
- Feed personal bisa menampilkan aktivitas private tanpa membuka isi quote.

## Optional Route: Quote Collection

Fase lanjutan bisa menambahkan route:

```txt
src/app/dashboard/quotes/page.tsx
```

Isi halaman:

- List semua quote milik user.
- Filter by visibility.
- Filter favorite.
- Search by quote text atau book title.
- Group by book.
- CTA ke halaman buku.

Komponen tambahan:

- `quote-collection-shell.tsx`
- `quote-filter-bar.tsx`
- `quote-grouped-list.tsx`

## UX Detail

Quote card style:

- Gunakan whitespace lega.
- Pakai font heading/serif untuk kutipan pendek agar terasa editorial.
- Gunakan accent border kiri warna primary/forest green.
- Jangan memakai terlalu banyak badge.
- Metadata cukup: judul buku, page/chapter, visibility kecil jika owner.

Form copy:

- Label quote: `Kutipan`
- Placeholder quote: `Tulis kalimat yang ingin kamu simpan...`
- Label note: `Catatan pribadi`
- Placeholder note: `Apa yang membuat kutipan ini menarik?`
- Button submit: `Simpan kutipan`
- Button share: `Bagikan ke circle`

Empty state:

- `Belum ada kutipan dari buku ini.`
- `Simpan kalimat yang ingin kamu ingat, lalu bagikan ke circle saat siap berdiskusi.`

## Security And Privacy

- Jangan tampilkan quote private di profil publik.
- Jangan tampilkan quote followers-only jika viewer bukan follower.
- Server action harus memvalidasi owner, jangan hanya mengandalkan UI.
- Delete harus hanya bisa dilakukan owner quote.
- Share ke circle harus hanya bisa dilakukan member circle.
- Jika quote dibagikan ke circle private, post hanya terlihat sesuai rules circle.

## Implementation Steps

1. Update Prisma schema untuk `BookQuote`, relasi User/Book, `QUOTE` post type, `quoteId`, dan activity enum.
2. Jalankan `npm run prisma:generate`.
3. Jalankan `npm run prisma:push`.
4. Buat Zod schema quote.
5. Buat server actions `src/actions/book-quotes.ts`.
6. Buat komponen `QuoteFormDialog`, `QuoteCard`, dan `QuoteList`.
7. Integrasikan quote panel ke halaman/detail buku.
8. Buat share dialog untuk memilih circle.
9. Update `ReadingCirclePostCard` agar mendukung post type `QUOTE`.
10. Tambahkan quote public ke profil overview.
11. Update activity feed untuk `BOOK_QUOTE_CREATED`.
12. Jalankan `npm run lint`.
13. Jalankan `npm run build` karena perubahan menyentuh Prisma, routing/data server, dan client/server boundaries.

## Testing Checklist

- User bisa membuat quote valid.
- Quote kosong ditolak.
- Quote terlalu panjang ditolak.
- Page negatif ditolak.
- User bisa edit quote miliknya.
- User tidak bisa edit quote milik user lain.
- User bisa delete quote miliknya.
- Quote public muncul di profil.
- Quote private tidak muncul di profil public.
- Quote bisa dibagikan ke circle yang user ikuti.
- Quote tidak bisa dibagikan ke circle yang user tidak ikuti.
- Post quote di circle bisa dikomentari.
- Activity feed tidak membocorkan isi quote private.
- Lint dan build berhasil.

## Estimasi Urutan Rilis

### Rilis 1: Core Quote

- Schema `BookQuote`.
- Create/edit/delete quote.
- Quote panel di halaman buku.

### Rilis 2: Social Quote

- Share ke circle.
- Render post type `QUOTE`.
- Quote public di profil.

### Rilis 3: Discovery And Polish

- Activity feed.
- Halaman `/dashboard/quotes`.
- Filter dan search.
- Favorite quote.
