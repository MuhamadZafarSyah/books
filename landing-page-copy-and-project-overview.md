# Landing Page Copy dan Gambaran Project

Dokumen ini merangkum teks yang saat ini dirender di landing page Shelfgram serta gambaran luas fitur project.

## 1. Semua Teks Landing Page

Sumber utama: `src/app/page.tsx`, `src/components/ui/cinematic-landing-hero.tsx`, `src/components/ui/cinematic-reading-flow.tsx`, dan `src/components/ui/splash-screen.tsx`.

### Splash Screen

- Shelfgram
- Baca. Review. Nemu circle-mu.

### Hero Awal

- Ruang baca sosial yang bikin betah.
- Baca.
- Review. Nyambung.

### Hero CTA

- Bikin rak bacamu.
- Catat bacaanmu, temuin circle yang seru.
- Mulai rak bacaku
- Gabung komunitas

### Hero Showcase

- Shelfgram
- Review kesimpen
- Rating & kesanmu.
- Temen baca aktif
- Profil & review.
- Buku. Review. Temen baca.
- Catat buku, tulis review, ketemu pembaca lain.
- Denyut rak
- 128
- buku pilihan

### Alur Shelfgram

- Cara kerja Shelfgram
- Tiga langkah. Satu ruang baca.
- Fokus ke hal yang kamu lakuin tiap hari.
- Shelfgram
- Reading log
- 01 Catat
- Simpan bacaanmu.
- Geser buku ke rak: lagi dibaca, kelar, atau mau dibaca.
- 02 Review
- Bagikan kesanmu.
- Rating, quote, & catatan tampil rapi.
- 03 Komunitas
- Temuin circle-mu.
- Intip profil, review, & circle yang seirama sama ritme bacamu.

### Section Intinya

- Intinya gini
- Satu tempat buat buku, review, dan temen baca.
- Shelfgram dibikin buat kamu yang pengen nyatet bacaan dan nyambung sama pembaca lain—tanpa feed yang berisik.

### Feature Cards

- Catat buku
- Atur status baca & koleksi fisikmu dalam satu rak.
- Tulis review
- Rating, quote, & kesan tampil rapi di feed.
- Temuin pembaca
- Intip profil pembaca lain, mulai obrolan dari buku yang sama.

### Reading DNA

- Reading DNA
- 42% sastra
- 4.8
- rating rata-rata
- 18
- temen baca
- 128
- buku tercatat

### UI Consistency

- Konsisten di tiap sudut
- Cozy, jelas, konsisten.
- Profil baca yang personal.
- Koneksi antar pembaca yang jelas.
- Feed sosial yang tetep adem.
- Mulai sekarang

### Teks Aksesibilitas dan Metadata Terkait Landing Page

- Lagi nyiapin Shelfgram…
- Daftar Shelfgram
- Masuk ke Shelfgram
- Shelfgram | Social Reading Platform
- Shelfgram bantu kamu catat buku, tulis review, bangun profil baca, dan nyambung lewat koleksi buku fisik.

## 2. Gambaran Luas Project

Shelfgram adalah platform social reading untuk membantu pembaca mencatat buku, membangun profil membaca, menulis review atau quote, dan terhubung dengan pembaca lain lewat aktivitas komunitas.

Fitur utama project ini meliputi:

- Autentikasi pengguna melalui email/password, verifikasi email, dan Google sign-in.
- Rak buku personal untuk menyimpan koleksi, status baca, progres, visibilitas, dan info buku.
- Review dan quote buku agar pengguna bisa membagikan rating, kesan, highlight, catatan, halaman, atau chapter favorit.
- Profil pengguna dan profil publik untuk menampilkan identitas, aktivitas membaca, koleksi, review, quote, dan koneksi sosial.
- Follow antar pengguna dan eksplorasi pembaca lain berdasarkan aktivitas membaca.
- Feed/dashboard untuk melihat ringkasan aktivitas, buku yang sedang dibaca, statistik, rekomendasi, dan update sosial.
- Reading Circle untuk membuat atau bergabung ke ruang diskusi buku, lengkap dengan member, post, komentar, checkpoint, dan kontrol spoiler.
- Event membaca offline untuk membuat meetup, ikut event, melihat lokasi peta, kuota peserta, dan detail acara.
- Chat antar pengguna atau grup untuk percakapan langsung di dalam aplikasi.
- Book AI Chat untuk berdiskusi dengan AI berdasarkan konteks buku tertentu.
- Blind Match untuk menemukan teman baca dengan profil yang awalnya disamarkan dan dibuka bertahap berdasarkan kecocokan.
- Leaderboard dan activity points untuk mengukur kontribusi pengguna di review, quote, circle, event, dan aktivitas sosial.
- Settings dan edit profile untuk mengelola data akun, tampilan profil, dan preferensi pengguna.

Secara teknis, project ini adalah aplikasi Next.js App Router dengan React, TypeScript, Prisma/PostgreSQL, NextAuth, Tailwind CSS, shadcn UI, Pusher untuk realtime chat, dan beberapa elemen animasi/interaktif seperti GSAP dan Spline.
