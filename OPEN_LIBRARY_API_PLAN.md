# Open Library API Implementation Plan

## Scope

Tahap ini fokus pada integrasi Open Library API untuk menampilkan data buku di Shelfgram. Fitur belum menyimpan buku ke database, belum membuat relasi ke `UserBook`, dan belum mengubah Prisma schema.

Yang termasuk scope:

- GET data buku dari Open Library.
- Search buku berdasarkan query umum, judul, author, ISBN, subject, language, publisher, tahun, sort, dan pagination.
- Filter hasil pencarian di UI.
- Detail lookup untuk work, edition, ISBN, dan subject.
- Halaman `/dashboard/explore` dengan UI/UX modern, eye catching, responsive, dan sesuai visual Shelfgram.
- Internal API route sebagai proxy/normalizer, bukan client langsung hit Open Library.

Yang tidak termasuk scope tahap ini:

- Menyimpan buku ke table `Book`.
- Menambahkan buku ke `UserBook`.
- Review/rating internal.
- Migrasi Prisma.
- Sync command Prisma.

## Goals

- User bisa mencari buku dari Open Library dengan cepat dan nyaman.
- User bisa memfilter hasil pencarian tanpa UI terasa berat.
- Data yang diterima frontend sudah dalam format internal yang stabil.
- UI explore terasa seperti fitur utama Shelfgram, bukan sekadar list API mentah.
- Implementasi aman untuk rate limit, error state, dan data Open Library yang tidak lengkap.

## Non-Goals

- Tidak membuat fitur add-to-shelf.
- Tidak membuat halaman detail buku permanen di database.
- Tidak membuat cache database lokal.
- Tidak mengambil detail semua buku di hasil search karena akan menyebabkan N+1 request.
- Tidak melakukan crawling cover Open Library.

## Open Library APIs

### Search API

Open Library endpoint:

```txt
https://openlibrary.org/search.json
```

Internal endpoint:

```txt
GET /api/books/search
```

Query parameters internal:

```txt
q?: string
title?: string
author?: string
isbn?: string
subject?: string
language?: string
yearFrom?: number
yearTo?: number
publisher?: string
sort?: "relevance" | "new" | "old"
page?: number
limit?: number
```

Open Library fields yang diminta:

```txt
key,title,author_name,first_publish_year,cover_i,isbn,edition_key,language,publisher,subject,number_of_pages_median
```

Catatan:

- Gunakan `URLSearchParams` untuk semua request.
- Batasi `limit` maksimal 20.
- Minimum query 2 atau 3 karakter untuk search bebas.
- Jika `sort` adalah `relevance`, tidak perlu mengirim parameter sort ke Open Library.
- `sort=new` dan `sort=old` bisa diteruskan ke Open Library.
- Filter tahun dapat diterapkan di internal route jika Open Library tidak memberi hasil stabil untuk range tahun.

### ISBN Lookup

Open Library endpoint:

```txt
https://openlibrary.org/isbn/{isbn}.json
```

Internal endpoint:

```txt
GET /api/books/isbn/[isbn]
```

Fungsi:

- Mengambil detail edition berdasarkan ISBN.
- Cocok untuk pencarian ISBN langsung.
- Response tetap dinormalisasi ke format internal.

### Work Detail

Open Library endpoint:

```txt
https://openlibrary.org/works/{workId}.json
```

Internal endpoint:

```txt
GET /api/books/works/[workId]
```

Fungsi:

- Mengambil detail work seperti description, subjects, covers, links, dan metadata work-level.
- Dipakai saat user membuka detail dari search result.

### Edition Detail

Open Library endpoint:

```txt
https://openlibrary.org/books/{editionId}.json
```

Internal endpoint:

```txt
GET /api/books/editions/[editionId]
```

Fungsi:

- Mengambil detail edition seperti ISBN, publisher, publish date, page count, physical format, language, dan cover.
- Dipakai jika search result memiliki `edition_key`.

### Subject Browse

Open Library endpoint:

```txt
https://openlibrary.org/subjects/{subject}.json?limit=12
```

Internal endpoint:

```txt
GET /api/books/subjects/[subject]
```

Query parameters internal:

```txt
limit?: number
offset?: number
```

Fungsi:

- Browse buku berdasarkan genre/topik.
- Cocok untuk quick filter chip seperti `Fiction`, `Self-help`, `Romance`, `Biography`, `Business`, dan `Technology`.

## Internal Response Shape

Semua internal API harus mengembalikan data dalam bentuk stabil agar UI tidak bergantung pada struktur Open Library mentah.

```ts
export type BookResult = {
  id: string;
  workKey: string | null;
  editionKey: string | null;
  title: string;
  subtitle: string | null;
  authors: string[];
  authorText: string;
  coverUrl: string | null;
  firstPublishYear: number | null;
  publishDate: string | null;
  isbn10: string | null;
  isbn13: string | null;
  languages: string[];
  publishers: string[];
  subjects: string[];
  pageCount: number | null;
  description: string | null;
  openLibraryUrl: string;
};

export type BookSearchResponse = {
  query: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  results: BookResult[];
};
```

Fallback values:

- `authorText`: `"Penulis tidak diketahui"` jika kosong.
- `title`: `"Untitled book"` jika kosong.
- `coverUrl`: `null` jika `cover_i` atau cover ID tidak tersedia.
- `subjects`: maksimal 8-12 item di response untuk menjaga payload tetap ringan.
- `publishers`: maksimal 4-6 item di response.

## Cover Strategy

Prioritas cover:

1. `cover_i` dari Search API.
2. `covers[0]` dari Work atau Edition detail.
3. OLID edition cover jika tersedia.
4. Placeholder custom di UI.

Format cover berdasarkan Cover ID:

```txt
https://covers.openlibrary.org/b/id/{coverId}-M.jpg?default=false
```

Format cover berdasarkan OLID:

```txt
https://covers.openlibrary.org/b/olid/{editionId}-M.jpg?default=false
```

Guidelines:

- Jangan crawl cover API.
- Jangan prefetch cover dalam jumlah besar secara manual.
- Tampilkan image dari `covers.openlibrary.org` langsung pada public-facing page.
- Tambahkan attribution kecil untuk Open Library.
- Jika menggunakan `next/image`, konfigurasi remote host `covers.openlibrary.org` di `next.config.ts`.

## File Structure

File baru yang direkomendasikan:

```txt
src/lib/open-library.ts
src/features/books/schemas/book-schemas.ts
src/app/api/books/search/route.ts
src/app/api/books/isbn/[isbn]/route.ts
src/app/api/books/works/[workId]/route.ts
src/app/api/books/editions/[editionId]/route.ts
src/app/api/books/subjects/[subject]/route.ts
src/app/dashboard/explore/page.tsx
src/features/books/components/book-search-experience.tsx
src/features/books/components/book-card.tsx
src/features/books/components/book-detail-drawer.tsx
src/features/books/components/book-filter-panel.tsx
src/features/books/components/book-search-skeleton.tsx
```

Opsional jika memakai `next/image`:

```txt
next.config.ts
```

## Library Layer

`src/lib/open-library.ts` bertanggung jawab untuk:

- Membuat request ke Open Library.
- Menangani timeout dan error response.
- Menormalisasi search result.
- Menormalisasi work detail.
- Menormalisasi edition detail.
- Membuat cover URL.
- Membuat Open Library URL.
- Membersihkan string dan array dari data kosong.

Fungsi yang disarankan:

```ts
export async function searchOpenLibraryBooks(params: BookSearchParams): Promise<BookSearchResponse>;
export async function getOpenLibraryWork(workId: string): Promise<BookResult | null>;
export async function getOpenLibraryEdition(editionId: string): Promise<BookResult | null>;
export async function getOpenLibraryIsbn(isbn: string): Promise<BookResult | null>;
export async function getOpenLibrarySubject(subject: string, params: SubjectParams): Promise<BookSearchResponse>;
export function buildOpenLibraryCoverUrl(coverId: number | string, size?: "S" | "M" | "L"): string;
```

Implementation notes:

- Pakai native `fetch` dari Next.js.
- Gunakan `next: { revalidate: 300 }` untuk search dan subject.
- Detail endpoint bisa pakai `revalidate: 3600` karena data jarang berubah.
- Jangan throw error mentah ke UI. Convert ke response aman.

## Validation Layer

`src/features/books/schemas/book-schemas.ts` berisi Zod schema.

Schema yang disarankan:

```ts
export const bookSearchParamsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  title: z.string().trim().max(120).optional(),
  author: z.string().trim().max(120).optional(),
  isbn: z.string().trim().max(32).optional(),
  subject: z.string().trim().max(80).optional(),
  language: z.string().trim().max(12).optional(),
  yearFrom: z.coerce.number().int().min(0).max(3000).optional(),
  yearTo: z.coerce.number().int().min(0).max(3000).optional(),
  publisher: z.string().trim().max(120).optional(),
  sort: z.enum(["relevance", "new", "old"]).default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(12),
});
```

Rules:

- Minimal satu dari `q`, `title`, `author`, `isbn`, `subject`, atau `publisher` harus ada untuk search.
- Jika hanya `q`, panjang minimal 2 atau 3 karakter.
- Jika `yearFrom > yearTo`, return 400.
- ISBN dibersihkan dari spasi dan dash sebelum dipakai.

## API Route Behavior

### `GET /api/books/search`

Behavior:

- Parse `request.nextUrl.searchParams`.
- Validasi dengan Zod.
- Jika invalid, return `400` dengan pesan aman.
- Jika valid, panggil `searchOpenLibraryBooks`.
- Return JSON normalized.

Error response:

```ts
return NextResponse.json(
  { error: "Pencarian buku tidak valid." },
  { status: 400 },
);
```

Timeout/API error:

```ts
return NextResponse.json(
  { error: "Katalog buku sedang sulit diakses. Coba lagi sebentar." },
  { status: 502 },
);
```

### Detail Routes

Behavior:

- Validasi path param agar hanya menerima ID Open Library yang aman.
- Strip prefix jika user mengirim `/works/OL...` atau `/books/OL...`.
- Return `404` jika data tidak ditemukan.
- Return normalized `BookResult`.

## UI/UX Direction

Halaman Explore harus terasa seperti katalog editorial modern, bukan form pencarian biasa.

Visual style:

- Warm cream background.
- Forest green primary accent.
- Muted brown secondary accent.
- Noto Serif untuk heading.
- Manrope untuk body.
- Soft rounded controls.
- Paper grain atau ambient radial glow secara subtle.
- Card depth dengan shadow hangat, bukan shadow hitam berat.

Hero section:

- Large headline: `Temukan buku berikutnya untuk rakmu`.
- Subcopy hangat: `Cari judul, penulis, ISBN, atau topik dari katalog Open Library.`
- Search bar besar dengan icon search.
- Quick subject chips di bawah search.
- Background card menggunakan cream surface, forest gradient, atau editorial split layout.

Search input:

- Placeholder: `Cari judul, penulis, atau ISBN...`
- Tombol clear ketika ada query.
- Debounce 500ms.
- Jangan melakukan network request langsung dari `onChange`.
- Tampilkan status kecil seperti `Mencari katalog...` saat loading.

Filter panel desktop:

- Bisa berupa sidebar kiri atau panel horizontal di bawah search.
- Filter utama: subject, language, year range, publisher, sort.
- Active filters muncul sebagai chips.
- Setiap chip bisa dihapus.
- Ada tombol `Reset filter`.

Filter mobile:

- Gunakan drawer/sheet jika tersedia.
- Jika belum ada sheet yang cocok, gunakan collapsible card sederhana.
- Filter tidak boleh menghabiskan layar utama.

Book card:

- Cover aspect ratio buku, misalnya `2 / 3`.
- Shadow layered, rounded 16-24px.
- Hover desktop: lift 4-6px, shadow meningkat, cover scale 1.03.
- Judul maksimal 2 baris.
- Author maksimal 1 baris.
- Metadata chips: tahun, bahasa, halaman.
- Subject chips maksimal 2-3.
- Link/button: `Lihat detail` atau `Open Library`.

Placeholder cover:

- Jangan pakai kotak abu-abu polos.
- Gunakan gradient cream to green/brown.
- Tampilkan icon `BookOpen`.
- Tampilkan initial atau 1-2 kata dari title.
- Tambahkan subtle grain atau border.

Detail drawer/modal:

- Dibuka ketika user klik card.
- Fetch detail route hanya saat drawer dibuka.
- Tampilkan cover besar, title, author, description, subjects, publisher, ISBN, language, publish date, page count.
- Tombol external link ke Open Library.
- Skeleton detail saat loading.

## UI States

Initial state:

- Tampilkan hero dan beberapa subject suggestion.
- Copy: `Mulai dengan mencari buku, penulis, atau ISBN.`

Loading state:

- Skeleton grid 8-12 card.
- Search bar tetap usable.
- Jangan layout shift besar.

Success state:

- Tampilkan jumlah hasil.
- Tampilkan grid responsive.
- Tampilkan pagination atau load more.

Empty state:

- Copy: `Belum ada buku yang cocok.`
- Saran: cek ejaan, gunakan judul lebih pendek, coba nama author, atau hapus filter.
- Tombol reset filter.

Error state:

- Copy human-friendly.
- Tombol `Coba lagi`.
- Jangan expose stack trace atau error mentah.

No cover state:

- Gunakan placeholder cover custom.
- Card tetap terlihat intentional dan premium.

## Client Component Behavior

`BookSearchExperience` bertanggung jawab untuk:

- Menyimpan local query dan filter state.
- Debounce search request.
- Abort request lama saat query/filter berubah.
- Render loading, success, empty, error states.
- Render active filter chips.
- Mengatur detail drawer state.

Recommended state:

```ts
const [query, setQuery] = useState("");
const [filters, setFilters] = useState<BookFilters>({ sort: "relevance" });
const [page, setPage] = useState(1);
const [results, setResults] = useState<BookResult[]>([]);
const [total, setTotal] = useState(0);
const [status, setStatus] = useState<"idle" | "loading" | "success" | "empty" | "error">("idle");
const [selectedBook, setSelectedBook] = useState<BookResult | null>(null);
```

Debounce:

- Pakai `usehooks-ts` seperti standar project.
- `onChange` hanya update local state.
- Network call berjalan setelah debounce.

Pagination:

- Tahap awal boleh pakai `Load more` agar terasa mobile-friendly.
- Jika query/filter berubah, reset page ke 1.
- Jika load more, append result.

## Accessibility

- Search input punya label yang jelas.
- Filter chips berupa button dengan `aria-label` hapus filter.
- Cards keyboard-accessible jika membuka detail.
- External link diberi label jelas.
- Loading state tidak menghilangkan focus user.
- Empty/error state dibaca dengan struktur heading yang benar.
- Color contrast harus cukup pada forest green dan cream background.

## Performance

- Debounce 500ms.
- Abort previous fetch dengan `AbortController`.
- Batasi result per page 12 atau 16.
- Jangan fetch detail setiap result.
- Detail hanya fetch saat user membuka drawer.
- Search route pakai cache/revalidate.
- Subject browse juga pakai cache/revalidate.
- Pastikan grid image tidak menyebabkan layout shift dengan aspect ratio tetap.

## Security

- Semua input divalidasi server-side dengan Zod.
- Query di-encode dengan `URLSearchParams`.
- Jangan render HTML dari Open Library.
- Jangan expose error internal ke client.
- Batasi panjang query, subject, publisher, author, dan title.
- Batasi page dan limit.
- Endpoint internal boleh memeriksa auth karena fitur berada di dashboard.

## Rate Limit Considerations

- Open Library Search API tidak membutuhkan API key, tapi tetap harus digunakan secara wajar.
- Cover API memiliki rate limit untuk identifier selain CoverID dan OLID. Karena itu prioritaskan CoverID dan OLID.
- Jangan request cover JSON untuk setiap card.
- Jangan melakukan request detail massal.
- Jika diperlukan, tambahkan Upstash Ratelimit untuk `/api/books/search` karena dependency sudah tersedia.

## Manual Test Plan

Search:

- Cari `Atomic Habits`.
- Cari `Laskar Pelangi`.
- Cari author `Pramoedya`.
- Cari ISBN `9780735211292`.
- Cari query pendek/invalid.
- Cari query yang tidak ada hasil.

Filter:

- Filter subject `fiction`.
- Filter language `eng`.
- Filter language `ind` jika tersedia.
- Filter tahun dari dan sampai.
- Filter publisher.
- Sort `new` dan `old`.
- Reset filter.

Detail:

- Buka detail dari hasil yang punya work ID.
- Buka detail dari hasil yang punya edition ID.
- Buka detail buku tanpa cover.
- Buka detail buku tanpa description.

Responsive:

- Mobile width.
- Tablet width.
- Desktop width.
- Cek filter mobile tidak menutupi flow utama.
- Cek grid desktop 3-4 kolom.

Error handling:

- Simulasi Open Library down atau timeout.
- Simulasi invalid response.
- Cek empty state.
- Cek retry button.

## Verification Commands

Karena tahap ini menambah route handler dan client/server boundary:

```txt
npm run lint
npm run build
```

Tidak perlu menjalankan command Prisma karena tidak ada schema database yang berubah.

## Implementation Order

1. Buat `src/features/books/schemas/book-schemas.ts` untuk validasi query dan filter.
2. Buat `src/lib/open-library.ts` untuk fetch, normalize, cover URL builder, dan error handling.
3. Buat `GET /api/books/search`.
4. Buat `GET /api/books/isbn/[isbn]`.
5. Buat `GET /api/books/works/[workId]`.
6. Buat `GET /api/books/editions/[editionId]`.
7. Buat `GET /api/books/subjects/[subject]`.
8. Buat `/dashboard/explore/page.tsx` sebagai Server Component shell.
9. Buat `BookSearchExperience` sebagai Client Component.
10. Buat `BookCard`, `BookFilterPanel`, `BookDetailDrawer`, dan skeleton states.
11. Polish UI/UX agar modern, eye catching, responsive, dan selaras dengan Shelfgram.
12. Jalankan `npm run lint`.
13. Jalankan `npm run build`.

## Future Phase

Setelah tahap display stabil, fase berikutnya bisa menambahkan:

- `Add to shelf` dari search result.
- Upsert ke table `Book` berdasarkan `sourceProvider + sourceId` atau ISBN.
- Relasi `UserBook` untuk status `WANT_TO_READ`, `READING`, dan `FINISHED`.
- Halaman detail buku internal Shelfgram.
- Recommendation based on user shelf.
- Caching metadata Open Library ke database internal.
