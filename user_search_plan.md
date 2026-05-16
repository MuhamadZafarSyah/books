# User Search Plan

Tambahkan fitur **Search Users** agar user bisa menemukan pembaca lain berdasarkan `username`, `name`, dan sinyal profil yang relevan, dengan UI yang terasa lebih ringan, modern, dan tidak jatuh ke pola card generik berulang.

## Tujuan

- User dapat mencari user lain dari aplikasi tanpa harus mengetahui slug profil mereka terlebih dahulu.
- Search harus terasa natural dari konteks `explore`, karena user saat ini sudah menjelajahi buku dari sana.
- Hasil pencarian harus memudahkan user melakukan keputusan cepat:
  - buka profil
  - follow
  - mulai percakapan
- UI harus mengikuti arahan desain baru:
  - minimalis
  - modern
  - tidak terlalu banyak card
  - tidak banyak icon dekoratif
  - hanya menampilkan informasi yang penting

## Product Goal

- Tambahkan mode/halaman pencarian pembaca di area `dashboard explore`.
- Gunakan search yang cepat dan relevan dengan debounce.
- Tampilkan hasil sebagai **list row editorial**, bukan grid kotak-kotak generik.
- Hubungkan hasil ke profil publik dan action sosial yang sudah ada.

## Rekomendasi Product Scope

### MVP

1. Search user berdasarkan:
   - `username`
   - `name`
2. Hasil menampilkan:
   - avatar
   - display name
   - `@username` atau slug ringkas
   - bio singkat jika ada
   - location singkat jika ada
   - CTA `Lihat Profil`
3. Debounced search input.
4. Empty state, loading state, dan no-result state.
5. Exclude current user dari hasil default.

### MVP+

1. Tambahkan follow state di hasil search.
2. Tambahkan CTA `Message` langsung dari hasil pencarian.
3. Tambahkan section `Mungkin kamu kenal` saat query kosong.

### Fase lanjutan

1. Mutual follow / shared taste signal.
2. Filter pembaca berdasarkan:
   - lokasi
   - genre favorit
   - buku yang sama-sama dibaca
3. Ranking berdasarkan kedekatan selera baca.

## Rekomendasi Route Strategy

Karena fitur ini adalah discovery user, paling masuk akal diletakkan di bawah `explore`.

### Route baru yang direkomendasikan

```txt
src/app/dashboard/explore/readers/page.tsx
```

Alasan:

- tetap satu payung dengan eksplorasi buku
- tidak menambah item sidebar utama terlalu dini
- user mental model tetap sederhana: `explore books` dan `explore readers`

## UX Flow

1. User buka `"/dashboard/explore"`.
2. Dari area explore, user bisa berpindah ke mode/tab `Pembaca`.
3. User mengetik query.
4. Search didebounce.
5. Hasil muncul sebagai list.
6. User menekan `Lihat Profil` untuk membuka `/u/[slug]`.

## Rekomendasi UI Pattern

### Jangan gunakan grid card generik

Hindari:

- 8-12 card profil dengan border tebal
- avatar + banyak badge + banyak statistik kecil dalam setiap hasil
- banyak icon dekoratif yang berulang

### Gunakan pattern ini

Gunakan **search list dengan row**:

- kiri: avatar
- tengah: nama, username, bio singkat, satu secondary line jika perlu
- kanan: CTA utama

Karakter visual:

- whitespace cukup lega
- divider halus antar row
- hover state lembut
- tidak banyak nested borders
- bila perlu, gunakan satu container besar untuk seluruh list, bukan card per user

### Informasi yang cukup per hasil

Minimal:

- avatar
- nama
- username / slug
- bio pendek

Opsional jika ada data dan tidak membuat ramai:

- location
- `Following` state

Hindari untuk MVP:

- follower count
- following count
- terlalu banyak genre tags
- terlalu banyak stat chips

## Rekomendasi Layout

### Page shell

Gunakan layout mirip editorial search page:

1. **Header ringan**
   - title
   - description pendek
2. **Search bar utama**
3. **Mode switch / tab**
   - `Buku`
   - `Pembaca`
4. **Result area**
   - list row
5. **Optional contextual aside di desktop**
   - misalnya tips discovery atau suggested readers

### Mobile behavior

- Search bar sticky ringan bila perlu
- Result tetap list vertikal
- CTA tetap mudah ditekan

## Data Source

Gunakan tabel `User` yang sudah ada, plus utilitas slug/profile yang sudah tersedia.

Field yang relevan dari user:

- `id`
- `username`
- `name`
- `email`
- `image`
- `bio`
- `location`

Untuk URL profil, gunakan pendekatan yang konsisten dengan utilitas publik yang sudah ada:

- `profileSlugFor(user)` dari `src/lib/public-profile.ts`

## Rekomendasi API

Tambahkan route baru:

```txt
src/app/api/users/search/route.ts
```

### Request

```txt
GET /api/users/search?q=<query>&limit=<n>
```

### Validasi

Tambahkan schema baru, misalnya di:

```txt
src/features/users/schemas/user-search-schemas.ts
```

Aturan minimum:

- `q`: optional string
- trim whitespace
- max length misalnya `80`
- `limit`: optional integer dengan default misalnya `12`

### Response shape yang direkomendasikan

```ts
type UserSearchResult = {
  id: string;
  name: string | null;
  username: string | null;
  slug: string;
  image: string | null;
  bio: string | null;
  location: string | null;
  isFollowing?: boolean;
};
```

## Search Logic yang Direkomendasikan

### MVP search ranking

Urutan ranking sederhana:

1. exact match `username`
2. startsWith `username`
3. startsWith `name`
4. contains `username`
5. contains `name`

### Exclusion

- exclude current user dari hasil

### Query kosong

Saat query kosong, jangan return semua user mentah.

Pilih salah satu:

1. return `[]` lalu tampilkan state `Mulai ketik nama pembaca`
2. return suggested readers terbatas

Untuk MVP, opsi paling aman:

- query kosong => suggested readers terbatas saja

## Server Architecture

### Server Component shell

Tambahkan page shell server-side di:

```txt
src/app/dashboard/explore/readers/page.tsx
```

Tugas:

- `requireAuth()`
- render shell statis
- mount client island untuk interactive search

### Client search island

Tambahkan feature baru:

```txt
src/features/users/components/user-search-experience.tsx
```

Tugas:

- local input state
- debounce search call
- fetch ke `/api/users/search`
- render loading, result, empty, error

Ikuti standar repo:

- raw `onChange` hanya update local state
- network call didebounce dengan `usehooks-ts`

## File Structure yang Direkomendasikan

```txt
src/
  app/
    dashboard/
      explore/
        readers/
          page.tsx
    api/
      users/
        search/
          route.ts
  features/
    users/
      components/
        user-search-experience.tsx
        user-search-list.tsx
        user-search-row.tsx
        user-search-empty-state.tsx
      schemas/
        user-search-schemas.ts
      types.ts
  lib/
    users/
      search.ts
```

## File-by-File Plan

### 1. `src/app/dashboard/explore/readers/page.tsx`

Tambahkan halaman baru.

Isi:

- `requireAuth()`
- header ringan
- mount `UserSearchExperience`

### 2. `src/app/api/users/search/route.ts`

Route handler search.

Tugas:

- auth gate via `auth()` atau `requireAuth()` pattern yang sesuai route
- validasi query params
- call helper search server-side
- return normalized results

### 3. `src/lib/users/search.ts`

Helper server-side untuk query Prisma.

Tugas:

- ambil current user id
- lakukan pencarian `User`
- hitung slug via `profileSlugFor`
- optional follow state untuk MVP+
- kembalikan hasil terurut dan ringan

### 4. `src/features/users/schemas/user-search-schemas.ts`

Schema query params search.

### 5. `src/features/users/types.ts`

Type hasil search user dan response API.

### 6. `src/features/users/components/user-search-experience.tsx`

Client component utama.

Tugas:

- controlled input
- debounce
- fetch search
- state management
- render mode switch kalau nanti explore page disatukan

### 7. `src/features/users/components/user-search-list.tsx`

Container list untuk hasil.

Pattern visual:

- satu surface besar
- divider antar row
- tidak perlu card per item

### 8. `src/features/users/components/user-search-row.tsx`

Komponen satu hasil user.

Isi minimum:

- avatar
- name
- username
- bio singkat
- CTA `Lihat Profil`

Opsional MVP+:

- `Follow`
- `Message`

### 9. `src/features/users/components/user-search-empty-state.tsx`

State untuk:

- query kosong
- tidak ada hasil
- error ringan

UI harus tetap ringan dan tidak boxy.

## Integrasi Dengan Fitur Existing

### Public profile

Setiap hasil harus link ke:

```txt
/u/[slug]
```

### Follow / message action

Untuk fase MVP+, reuse pola yang sudah ada di `PublicProfileActions` dan `actions/public-profile.ts` bila sesuai.

### Explore navigation

Ada dua opsi implementasi:

1. route terpisah `explore/readers`
2. mode switch di `explore` page utama

Rekomendasi tahap awal:

- mulai dari route terpisah
- jika UX nanti terasa lebih baik, baru satukan dengan switcher visual

## Design Guideline Khusus Fitur Ini

Fitur ini harus menjadi referensi untuk style pencarian orang ke depan.

### Wajib

- list-driven layout, bukan card grid berulang
- maksimal satu CTA primer per row
- metadata dipilih ketat, jangan semua ditampilkan
- icon hanya bila membantu orientasi, bukan dekorasi
- gunakan hierarki teks dan whitespace sebagai struktur utama

### Hindari

- card di dalam card
- avatar + 4 badge + 3 icon action + 2 stat row dalam satu hasil
- border tebal di setiap item
- terlalu banyak chip/label yang mengulang informasi

## Search UX States

### Query kosong

Tampilkan:

- helper text ringan
- optional suggested readers

### Loading

Gunakan skeleton row tipis, bukan skeleton card besar.

### No results

Tampilkan pesan seperti:

```txt
Belum ada pembaca yang cocok dengan pencarianmu.
```

### Error

Tampilkan inline error ringan dan CTA retry kecil.

## Performance Rules

- gunakan debounce `400-500ms`
- limit hasil awal `10-12`
- jangan kirim field user yang tidak dipakai
- jangan fetch follower/following count untuk setiap hasil pada MVP jika tidak benar-benar diperlukan

## Security Rules

- endpoint search harus auth-protected
- jangan bocorkan data sensitif user
- jangan return email penuh sebagai field tampilan search result default

Catatan penting:

- `email` boleh dipakai internal untuk fallback ranking atau slug generation bila perlu
- tapi untuk UI publik hasil search, prioritaskan `name`, `username`, `bio`, `location`

## Verification Plan

### Manual

1. Login user.
2. Buka `/dashboard/explore/readers`.
3. Ketik sebagian username.
4. Pastikan hasil muncul setelah debounce.
5. Klik hasil.
6. Pastikan diarahkan ke profil publik yang benar.
7. Cari user yang tidak ada.
8. Pastikan empty state muncul.
9. Pastikan current user tidak muncul di hasil.
10. Uji mobile layout dan desktop layout.

### Build verification

```bash
npm run lint
npm run build
```

## Definition of Done

- route search users tersedia
- endpoint search users tersedia dan tervalidasi
- UI hasil search ringan, modern, dan tidak card-heavy
- current user tidak muncul di hasil
- hasil link ke profil publik yang benar
- state loading/empty/error rapi
- `npm run lint` lulus
- `npm run build` lulus

## Future Expansion

1. `Suggested readers` berdasarkan buku yang sama-sama dibaca
2. `Readers with similar shelf`
3. `Mutuals` / teman bersama
4. `Invite to Reading Circle`
5. `Start chat` langsung dari hasil search
6. Search filter berdasarkan genre, location, atau availability buku pinjam
