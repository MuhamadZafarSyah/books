# Shelfgram Design Guidelines

Dokumen ini adalah panduan desain utama untuk Shelfgram, platform social reading yang menggabungkan pengalaman membaca digital seperti Google Play Books dengan interaksi sosial bergaya Instagram. Tujuan desainnya adalah membuat pengalaman yang cozy, editorial, konsisten, mudah dipahami, dan nyaman dipakai dalam sesi membaca, mencatat, menilai, mengulas, serta menemukan koneksi pembaca lain.

Panduan ini disusun dengan rujukan `ui-ux-pro-max` dan disesuaikan dengan arah visual project: warm cream surfaces, forest-green primary, muted brown accents, Noto Serif headings, Manrope body, soft rounded controls, dan ambient paper-like depth.

## 1. Prinsip Desain

### Cozy Editorial

Shelfgram harus terasa seperti ruang baca digital: hangat, tenang, personal, dan literer. Hindari tampilan social media yang terlalu agresif, terlalu terang, atau terlalu gamified.

Gunakan:

- Permukaan warm cream seperti halaman buku.
- Tipografi serif untuk judul agar terasa editorial.
- Body text sans-serif yang bersih agar tetap nyaman dibaca lama.
- Visual buku, rak, kutipan, catatan, rating, dan profil pembaca sebagai elemen utama.

Hindari:

- Neon berlebihan.
- Gradien mencolok yang mengganggu konten buku.
- Layout feed yang terlalu padat tanpa ruang napas.
- Emoji sebagai ikon UI utama. Gunakan icon set konsisten seperti Lucide.

### Calm Social Reading

Interaksi sosial harus mendukung discovery dan koneksi, bukan menciptakan pressure seperti jumlah like yang terlalu dominan. Review, progress membaca, dan koleksi fisik adalah konten utama.

Prioritas tampilan:

- Buku yang sedang dibaca.
- Review dan rating yang bermakna.
- Catatan atau quote penting.
- Profil kebiasaan membaca.
- Ketersediaan buku fisik untuk dipinjam.

### Consistency First

Komponen yang sama harus selalu memiliki visual, spacing, copy pattern, dan behavior yang sama. Jika sebuah card buku muncul di feed, profil, dan koleksi, struktur dasarnya harus tetap familiar.

Aturan konsistensi:

- Satu gaya tombol utama untuk aksi primer.
- Satu gaya card buku untuk ringkasan buku.
- Satu gaya rating untuk seluruh app.
- Satu gaya avatar dan badge status.
- Satu sistem spacing dan radius.
- State hover, focus, loading, empty, dan error harus tersedia untuk setiap komponen interaktif.

## 2. Brand Personality

Shelfgram harus terasa:

- Cozy, bukan childish.
- Editorial, bukan kaku akademis.
- Social, bukan noisy.
- Personal, bukan generik.
- Trustworthy untuk aktivitas peminjaman buku fisik.
- Calm dan readable untuk sesi baca panjang.

Kata kunci visual:

- Warm library
- Soft editorial
- Paper grain
- Forest green
- Muted brown
- Gentle community
- Bookish minimalism

## 3. Color System

Gunakan palet hangat yang mendukung kenyamanan membaca dan tetap memiliki hierarchy jelas untuk aksi sosial.

### Core Colors

| Token           | Hex       | Penggunaan                                       |
| --------------- | --------- | ------------------------------------------------ |
| `background`    | `#F8F1E7` | Background utama, terasa seperti kertas hangat   |
| `surface`       | `#FFF9F0` | Card, sheet, form, panel                         |
| `surface-muted` | `#F1E4D2` | Section alternatif, subtle block, sidebar        |
| `primary`       | `#1F4D3A` | CTA utama, active nav, selected state            |
| `primary-hover` | `#173B2C` | Hover/pressed primary                            |
| `secondary`     | `#8B6F4E` | Accent brown, metadata, secondary badge          |
| `accent`        | `#C98348` | Highlight quote, rating accent, warm CTA support |
| `text`          | `#241A12` | Teks utama                                       |
| `text-muted`    | `#6F6256` | Deskripsi, metadata, helper text                 |
| `border`        | `#E0D1BD` | Border card/input yang lembut                    |
| `success`       | `#2F7D4F` | Status berhasil, verified, tersedia dipinjam     |
| `warning`       | `#B7791F` | Peringatan, stok/availability terbatas           |
| `danger`        | `#B4473A` | Error dan destructive action                     |

### Usage Rules

- Gunakan `primary` untuk aksi paling penting: simpan buku, tambah ke rak, kirim review, ajukan peminjaman.
- Gunakan `accent` secara hemat untuk momen emosional: quote, rating, highlight reading streak.
- Gunakan background cream untuk halaman utama agar nyaman dibaca.
- Jangan memakai warna merah untuk semua notifikasi sosial. Merah hanya untuk error atau aksi destruktif.
- Pastikan teks normal memiliki contrast minimal WCAG AA 4.5:1.

### Dark Mode Direction

Dark mode boleh ada, tetapi tetap bookish dan warm. Hindari OLED black murni yang terasa terlalu tech.

| Token                | Hex       |
| -------------------- | --------- |
| `dark-background`    | `#17120D` |
| `dark-surface`       | `#211911` |
| `dark-surface-muted` | `#2C2117` |
| `dark-primary`       | `#8FB89E` |
| `dark-accent`        | `#D69A63` |
| `dark-text`          | `#F5EBDD` |
| `dark-text-muted`    | `#BFAE9C` |
| `dark-border`        | `#3A2C20` |

## 4. Typography

Tipografi harus menyeimbangkan rasa editorial dan keterbacaan UI.

### Font Pairing

| Role                    | Font       | Alasan                                       |
| ----------------------- | ---------- | -------------------------------------------- |
| Heading                 | Noto Serif | Memberi rasa editorial, literer, dan bookish |
| Body/UI                 | Manrope    | Bersih, modern, readable untuk app interface |
| Numeric/Rating optional | Manrope    | Konsisten dan mudah dibaca                   |

### Type Scale

| Token     | Size    | Line Height | Weight  | Penggunaan                   |
| --------- | ------- | ----------- | ------- | ---------------------------- |
| `display` | 48-64px | 1.05        | 600-700 | Landing hero                 |
| `h1`      | 36-44px | 1.1         | 600-700 | Judul halaman                |
| `h2`      | 28-32px | 1.2         | 600     | Section title                |
| `h3`      | 22-24px | 1.25        | 600     | Card title besar             |
| `body-lg` | 18px    | 1.65        | 400     | Long-form review, intro copy |
| `body`    | 16px    | 1.6         | 400     | Teks utama                   |
| `body-sm` | 14px    | 1.5         | 400-500 | Metadata, helper text        |
| `caption` | 12px    | 1.4         | 500     | Label kecil, timestamp       |

### Typography Rules

- Body text minimal 16px di mobile.
- Panjang paragraf review idealnya 65-75 karakter per baris.
- Gunakan line-height 1.6-1.75 untuk review panjang.
- Heading boleh serif, tetapi label, button, nav, dan form harus sans-serif.
- Jangan memakai terlalu banyak weight. Prioritaskan 400, 500, 600, dan 700.

## 5. Layout System

### Spacing Scale

Gunakan skala spacing konsisten:

| Token | Value | Penggunaan                          |
| ----- | ----- | ----------------------------------- |
| `xs`  | 4px   | Icon gap kecil                      |
| `sm`  | 8px   | Gap label, helper, compact controls |
| `md`  | 12px  | Internal compact card spacing       |
| `lg`  | 16px  | Default gap antar elemen            |
| `xl`  | 24px  | Card padding, section group         |
| `2xl` | 32px  | Antar section kecil                 |
| `3xl` | 48px  | Section spacing desktop             |
| `4xl` | 64px  | Hero/major section spacing          |

### Container

- Mobile: padding horizontal 16px.
- Tablet: padding horizontal 24px.
- Desktop: max-width 1120-1200px untuk app content.
- Long-form review: max-width 720px agar nyaman dibaca.
- Feed: gunakan layout 1 kolom di mobile, 2 kolom hanya jika konten tetap readable, dan jangan memaksa masonry jika mengganggu urutan baca.

### Radius

| Token  | Value | Penggunaan                    |
| ------ | ----- | ----------------------------- |
| `sm`   | 8px   | Input kecil, badge            |
| `md`   | 12px  | Button, tabs                  |
| `lg`   | 16px  | Card standar                  |
| `xl`   | 24px  | Modal, large panel, hero card |
| `full` | 999px | Avatar, pills                 |

Gunakan rounded yang lembut, bukan bulat berlebihan di semua komponen.

### Shadow And Depth

Gunakan depth seperti lapisan kertas, bukan glassmorphism berat.

Recommended shadows:

- `shadow-soft`: `0 8px 24px rgba(36, 26, 18, 0.08)`
- `shadow-card`: `0 2px 10px rgba(36, 26, 18, 0.06)`
- `shadow-focus`: `0 0 0 3px rgba(31, 77, 58, 0.22)`

Aturan:

- Card default boleh memiliki border + shadow tipis.
- Hover boleh menaikkan shadow sedikit, tanpa layout shift besar.
- Hindari `transition-all`; transisikan `colors`, `shadow`, `opacity`, atau `transform` secara spesifik.

## 6. Component Guidelines

### Buttons

#### Primary Button

Gunakan untuk aksi utama di halaman.

Visual:

- Background `primary`.
- Text `#FFF9F0`.
- Radius 12px.
- Height minimal 44px.
- Padding horizontal 16-20px.
- Hover ke `primary-hover`.
- Focus ring terlihat.

Contoh label:

- `Tambah ke Rak`
- `Tulis Review`
- `Ajukan Pinjam`
- `Simpan Catatan`

#### Secondary Button

Gunakan untuk aksi pendukung.

Visual:

- Background transparent atau `surface`.
- Border `border`.
- Text `text` atau `primary`.

#### Destructive Button

Gunakan hanya untuk aksi irreversible.

Visual:

- Background `danger`.
- Harus ada confirmation dialog.

### Book Card

Book card adalah komponen inti Shelfgram.

Struktur wajib:

- Cover buku.
- Judul buku.
- Penulis.
- Status baca atau availability.
- Rating jika tersedia.
- Aksi utama yang sesuai konteks.

Variasi:

- `compact`: untuk search result dan list pendek.
- `feed`: untuk aktivitas sosial, review, quote, atau update progress.
- `shelf`: untuk koleksi fisik dan status peminjaman.
- `detail`: untuk halaman buku lengkap.

Aturan visual:

- Cover harus memiliki rasio konsisten, ideal 2:3.
- Gunakan fallback cover yang rapi jika cover tidak tersedia.
- Jangan memotong judul buku tanpa tooltip/expand jika konteksnya detail.
- Metadata harus lebih muted dari judul.
- Availability pinjam harus jelas: `Tersedia`, `Dipinjam`, `Tidak untuk dipinjam`.

### Review Card

Struktur wajib:

- Avatar dan nama reviewer.
- Buku yang direview.
- Rating.
- Review text dengan line clamp di feed.
- Timestamp relatif.
- Aksi sosial: like/save/comment secukupnya.

Aturan:

- Review panjang di feed gunakan `line-clamp` dan tombol `Baca Selengkapnya`.
- Jangan menampilkan terlalu banyak metric sosial sekaligus.
- Rating harus dapat dipahami tanpa warna saja.

### Rating

Gunakan bintang atau marker rating yang konsisten.

Aturan:

- Warna rating: `accent`.
- Tampilkan angka rating jika presisi dibutuhkan, misalnya `4.5`.
- Untuk screen reader, rating harus punya label seperti `Rating 4 dari 5`.
- Jangan hanya mengandalkan warna untuk status rating.

### Profile Summary

Profil Shelfgram harus menampilkan kebiasaan membaca, bukan hanya bio sosial.

Elemen utama:

- Avatar.
- Nama dan username.
- Bio singkat.
- Reading stats: buku selesai, sedang dibaca, genre favorit.
- Shelf preview.
- Trust marker untuk peminjaman jika diperlukan.

Aturan:

- Statistik harus mudah dipindai.
- Jangan membuat profil terasa seperti kompetisi angka.
- Highlight kebiasaan membaca yang personal dan meaningful.

### Physical Shelf And Lending

Fitur koleksi buku fisik harus terasa aman dan jelas.

Komponen wajib:

- Status ketersediaan.
- Kondisi buku.
- Lokasi umum atau metode peminjaman, bukan alamat detail.
- CTA `Ajukan Pinjam`.
- Info pemilik buku.

UX rules:

- Jangan membuka informasi sensitif terlalu awal.
- Gunakan confirmation untuk request peminjaman.
- Berikan feedback setelah request dikirim.
- Empty state harus edukatif: jelaskan manfaat menambahkan koleksi fisik.

### Forms

Gunakan form yang tenang dan jelas.

Aturan:

- Semua input wajib punya label terlihat.
- Placeholder bukan pengganti label.
- Error muncul dekat field terkait.
- Loading dan success state harus jelas.
- Touch target minimal 44x44px.
- Untuk password, sediakan show/hide toggle.

### Navigation

Mobile-first navigation:

- Gunakan bottom navigation untuk area utama: Home, Search, Shelf, Add, Profile.
- Gunakan label pendek dan icon konsisten.
- Active state harus jelas dengan warna `primary` dan/atau background lembut.

Desktop navigation:

- Sidebar atau top nav boleh digunakan, tetapi jangan mengganggu konten feed.
- CTA tambah buku/review harus mudah ditemukan.

## 7. Page Patterns

### Home Feed

Tujuan: membantu user menemukan aktivitas membaca teman dan rekomendasi buku.

Prioritas konten:

- Review terbaru.
- Progress membaca.
- Quote/catatan.
- Buku fisik yang tersedia dipinjam.

Rules:

- Feed jangan terlalu padat.
- Gunakan card dengan pemisahan visual lembut.
- Sisipkan rekomendasi secara natural, bukan banner agresif.

### Book Detail

Tujuan: memberi konteks lengkap sebelum user menambahkan, membaca review, atau meminjam.

Struktur:

- Cover + metadata utama.
- CTA: tambah ke rak, tulis review, ajukan pinjam jika tersedia.
- Rating agregat dan review teman.
- Sinopsis.
- Koleksi fisik pengguna lain.

### User Profile

Tujuan: menampilkan identitas membaca user.

Struktur:

- Header profil.
- Reading stats.
- Favorite genres.
- Shelves.
- Reviews.
- Physical collection.

### My Shelf

Tujuan: membantu user mengelola buku digital/reading log dan koleksi fisik.

Tabs yang disarankan:

- `Sedang Dibaca`
- `Selesai`
- `Ingin Dibaca`
- `Koleksi Fisik`
- `Dipinjamkan`

### Search And Discovery

Tujuan: menemukan buku, user, review, dan koleksi fisik.

Rules:

- Search bar harus prominent.
- Filter state harus tersimpan di URL agar bisa dibagikan.
- Empty state harus memberi saran pencarian.
- Autocomplete berguna untuk judul buku dan penulis.

## 8. Interaction And Motion

Motion harus subtle dan mendukung orientasi user.

Gunakan:

- Durasi 150-300ms untuk hover, tab, modal, dropdown.
- `ease-out` untuk elemen masuk.
- Skeleton untuk loading feed/book card.
- Press state untuk tombol dan card interaktif.
- `prefers-reduced-motion` untuk mengurangi animasi.

Hindari:

- Infinite decorative animation.
- Hover yang mengubah layout besar.
- Animasi lebih dari 500ms untuk UI routine.
- Parallax berat pada halaman baca/review.

## 9. Accessibility

Shelfgram harus nyaman untuk banyak tipe pembaca.

Checklist wajib:

- Contrast body text minimal 4.5:1.
- Focus state terlihat untuk semua elemen interaktif.
- Semua icon-only button punya `aria-label`.
- Semua form control punya label.
- Semua gambar bermakna punya alt text.
- Decorative icon diberi `aria-hidden="true"`.
- Tab order mengikuti urutan visual.
- Jangan menonaktifkan zoom browser.
- Informasi error tidak hanya lewat warna.
- Touch target minimal 44x44px.

Untuk konten buku dan review:

- Gunakan line-height long-form yang lega.
- Sediakan expand/collapse untuk review panjang.
- Hindari text muted yang terlalu pucat.
- Jangan tampilkan paragraf full width di desktop.

## 10. Content And Voice

Tone Shelfgram harus hangat, jelas, dan tidak menghakimi.

Gunakan microcopy:

- `Belum ada review. Jadilah pembaca pertama yang berbagi kesan.`
- `Tambahkan buku ini ke rak bacaanmu.`
- `Koleksi fisikmu bisa membantu pembaca lain menemukan bacaan berikutnya.`
- `Request peminjaman terkirim. Tunggu konfirmasi dari pemilik buku.`

Hindari:

- Copy yang membuat user merasa tertinggal.
- Terlalu banyak istilah teknis.
- CTA generik seperti `Submit` jika bisa lebih spesifik.

CTA harus menjelaskan aksi:

- Baik: `Tulis Review`, `Simpan ke Rak`, `Ajukan Pinjam`.
- Kurang baik: `OK`, `Submit`, `Click Here`.

## 11. Empty, Loading, Error, Success States

### Empty State

Harus memberi konteks dan aksi berikutnya.

Contoh:

- My Shelf kosong: `Rak bacaanmu masih kosong. Mulai dengan menambahkan buku yang sedang kamu baca.`
- Review kosong: `Belum ada review untuk buku ini. Bagikan kesanmu setelah membaca.`
- Koleksi fisik kosong: `Tambahkan koleksi fisik agar teman pembaca tahu buku apa yang bisa dipinjam.`

### Loading State

- Gunakan skeleton berbentuk card buku/review.
- Hindari blank screen.
- Untuk aksi submit, tampilkan progress pada tombol atau area status.

### Error State

- Jelaskan masalah dengan bahasa manusia.
- Berikan aksi recovery: `Coba Lagi`, `Periksa Koneksi`, `Kembali ke Rak`.
- Error destructive atau auth harus jelas dan tidak ambigu.

### Success State

- Gunakan toast atau inline confirmation.
- Auto-dismiss 3-5 detik untuk informasi ringan.
- Untuk aksi besar seperti request pinjam, tampilkan status yang bisa dilacak.

## 12. Responsive Rules

Desain harus mobile-first.

Breakpoint testing minimal:

- 320px
- 375px
- 414px
- 768px
- 1024px
- 1440px

Rules:

- Tidak boleh ada horizontal scroll di mobile.
- Feed mobile 1 kolom.
- Button utama full width boleh digunakan di mobile jika konteksnya form atau CTA utama.
- Bottom nav mobile harus tidak menutup konten penting.
- Gunakan `min-h-dvh` untuk full-height mobile screen.
- Tabel atau data detail harus berubah menjadi card atau memiliki horizontal scroll wrapper.

## 13. Implementation Notes For This Project

Project ini memakai Next.js, React, TypeScript, Tailwind v4, dan shadcn-style UI primitives. Terapkan guideline ini dengan pendekatan berikut:

- Prefer shared UI primitives dari `src/components/ui` untuk button, input, label, card, separator, toast, dan komponen sejenis.
- Jaga Server Component untuk page shell dan Client Component hanya untuk form/control interaktif.
- Gunakan path alias `@/*` untuk import internal.
- Untuk form auth dan form lain yang kompleks, gunakan `react-hook-form` + Zod.
- Jangan menambahkan library visual baru jika primitive existing sudah cukup.
- Gunakan token di `globals.css` agar warna, radius, dan typography konsisten.

## 14. Anti-Patterns

Hindari hal-hal berikut:

- Emoji sebagai icon UI utama.
- Card yang clickable tanpa cursor pointer atau hover/focus feedback.
- Text abu-abu terlalu terang di cream background.
- Rating hanya dibedakan dengan warna tanpa label/angka.
- Empty state kosong tanpa instruksi.
- Loading tanpa skeleton atau status.
- Modal tanpa close label yang accessible.
- Button disabled tanpa alasan atau loading feedback.
- Layout feed yang terlalu ramai seperti marketplace.
- Menampilkan detail lokasi peminjaman buku terlalu awal.
- Memakai `transition-all` secara default.
- Menghapus outline focus tanpa replacement.

## 15. Design QA Checklist

Sebelum merge UI baru, cek:

- Warna mengikuti token Shelfgram.
- Heading memakai rasa editorial, body tetap readable.
- Spacing memakai skala yang konsisten.
- Radius dan shadow terasa soft, bukan random.
- Primary CTA jelas dan tidak ada dua CTA utama yang bersaing.
- State hover, active, focus, loading, error, success tersedia.
- Mobile 375px tidak horizontal scroll.
- Touch target minimal 44px.
- Review panjang nyaman dibaca.
- Book card tetap konsisten di feed, profile, shelf, dan search.
- Accessibility dasar terpenuhi: label, aria-label, alt, contrast, keyboard.
- Motion tidak berlebihan dan menghormati `prefers-reduced-motion`.

## 16. North Star

Jika ada keputusan desain yang membingungkan, gunakan pertanyaan ini:

Apakah desain ini membuat user merasa nyaman membangun kehidupan membaca mereka, menemukan buku baru, dan terhubung dengan pembaca lain tanpa merasa terburu-buru atau kewalahan?

Jika jawabannya tidak, sederhanakan layout, kurangi noise, perjelas hierarchy, dan kembalikan fokus ke buku, review, serta koneksi antar pembaca.

## 17. Dashboard Layout & Sidebar

### Architecture

Dashboard menggunakan pola layout bersarang (nested layout) di Next.js App Router. Sidebar di-render sekali di `src/app/dashboard/layout.tsx` dan tidak re-render saat navigasi antar halaman dashboard.

Komponen utama:

- `DashboardLayout` (Server Component) — shell yang menyediakan `SidebarProvider` dan `TooltipProvider`.
- `AppSidebar` (Client Component) — sidebar interaktif dengan expand/collapse.
- `DashboardHeader` (Client Component) — header sticky dengan trigger toggle sidebar.
- `SidebarInset` — area konten utama yang responsif terhadap state sidebar.

### Sidebar Behavior

Desktop:

- Default expanded (width: 16rem).
- Collapsible ke icon-only mode (width: 3rem) via rail click, trigger button, atau keyboard shortcut `Ctrl+B`.
- Transisi width menggunakan `duration-200 ease-linear` untuk smooth animation.
- Saat collapsed, navigation label tersembunyi dan tooltip muncul on hover.

Mobile (< 768px):

- Sidebar tersembunyi secara default.
- Muncul sebagai Sheet overlay dari sisi kiri saat trigger ditekan.
- Sheet memiliki backdrop blur dan animasi slide-in/slide-out.
- Close otomatis saat navigasi atau klik di luar.

### Sidebar Structure

```
SidebarHeader    — Logo/brand (sticky top)
Separator
SidebarContent   — ScrollArea berisi navigation groups
  SidebarGroup "Menu"     — Beranda, Jelajahi, Rak Buku, Sedang Dibaca
  SidebarGroup "Akun"     — Profil, Pengaturan
Separator
SidebarFooter    — User info + logout (sticky bottom)
SidebarRail      — Invisible drag/click area untuk toggle
```

### Animation Guidelines (Sidebar)

| Interaction           | Duration | Easing      | Property                      |
| --------------------- | -------- | ----------- | ----------------------------- |
| Expand/collapse width | 200ms    | ease-linear | width, left/right             |
| Nav item hover        | 200ms    | ease-out    | background-color, color       |
| Nav item active state | instant  | —           | background-color, font-weight |
| Mobile sheet open     | 200ms    | ease-in-out | transform, opacity            |
| Mobile sheet close    | 200ms    | ease-in-out | transform, opacity            |
| Tooltip appear        | 150ms    | ease-out    | opacity, scale                |

### Scrollbar

Gunakan `ScrollArea` dari shadcn/ui (Radix ScrollArea) untuk area yang bisa scroll di dalam sidebar. Ini memberikan scrollbar yang konsisten cross-browser dan styled sesuai design system.

### Navigation Active State

- Active item mendapat `bg-sidebar-accent` dan `font-medium`.
- Matching dilakukan via `usePathname()` — exact match untuk root, prefix match untuk sub-routes.
- Semua nav item memiliki `cursor-pointer` dan `transition-colors duration-200`.

### Responsive Breakpoints

| Breakpoint | Behavior                                  |
| ---------- | ----------------------------------------- |
| < 768px    | Sidebar hidden, Sheet overlay dari kiri   |
| ≥ 768px    | Sidebar visible, collapsible to icon mode |
| ≥ 1024px   | Sidebar expanded by default               |

### User Profile Section (Footer)

- Avatar (size sm) + nama + email saat expanded.
- Hanya avatar saat collapsed.
- Logout button tersedia di footer.
- Truncate text panjang dengan `truncate` class.

## 18. User Profile Page

### Structure

Profile page terdiri dari tiga section utama:

1. **ProfileHeader** — Avatar besar, nama, email, lokasi, tanggal bergabung, bio singkat, tombol Edit Profil.
2. **ProfileStats** — Grid 4 stat cards (Sedang Dibaca, Selesai, Ingin Dibaca, Favorit) + genre favorit dengan progress bars.
3. **ProfileActivity** — Timeline aktivitas terbaru (review, mulai baca, komentar).

### Design Principles

- Max-width 3xl (48rem) untuk readability.
- Cards dengan hover shadow transition (200ms).
- Progress bars menggunakan `transition-all duration-500 ease-out` untuk animasi saat mount.
- Activity items memiliki hover state subtle (`bg-accent/50`).
- Semua icon menggunakan Lucide, bukan emoji.
- Color coding untuk stat icons menggunakan chart color tokens.

### Responsive

- Mobile: stack vertikal, avatar centered.
- Tablet+: horizontal layout untuk header, 4-column grid untuk stats.
- Semua card full-width di mobile, grid di desktop.
