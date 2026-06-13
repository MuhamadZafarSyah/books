# Blind Reading Match — Tinder-Style Discovery Plan

## Goal

Rombak Blind Reading Match menjadi fitur discovery seperti Tinder, tetapi berbasis kecocokan membaca, bukan foto profil.

User yang join Blind Reading akan mendapat akses untuk melihat kandidat pembaca lain lewat swipeable profile cards. Card tidak memakai foto/avatar sebagai fokus utama, melainkan ringkasan profil singkat, preferensi membaca, dan akses cepat untuk melihat rak buku publik kandidat.

Core loop:

1. User membuka halaman Blind Reading.
2. User join/berpartisipasi.
3. Setelah join, user bisa melihat swipeable cards kandidat lain.
4. User menilai kecocokan dari dua sumber utama:
   - Profile singkat user.
   - Rak buku publik user.
5. User bisa swipe skip atau send interest.
6. Interest masuk ke inbox penerima.
7. Jika kedua user saling interest, status menjadi match.
8. Setelah match, user bisa membuka profil lebih lengkap dan memulai chat.

## Product Direction

Fitur ini harus terasa seperti dating/discovery app yang ringan, cepat, dan menyenangkan, tetapi tetap membawa identitas Shelfgram: cozy, editorial, bookish, warm, dan personal.

Perbedaan utama dari Tinder:

- Tidak mengandalkan foto profil.
- Fokus ke taste membaca, bio singkat, genre favorit, buku yang sedang/sudah dibaca.
- Rak buku menjadi bagian penting untuk mengecek kecocokan.
- UI harus simple, clean, tidak terlalu banyak teks, dan mudah dipahami dalam sekali lihat.

## MVP Scope

- Opt-in / join Blind Reading.
- Pause / leave Blind Reading.
- Swipeable candidate cards.
- Candidate card tanpa foto profil.
- Profile summary singkat.
- Reading preference summary.
- CTA untuk melihat rak buku publik kandidat.
- Swipe skip.
- Swipe/send interest.
- Inbox untuk melihat interest yang diterima.
- Match state jika saling interest.
- CTA untuk membuka profil atau mulai chat setelah match.
- Empty states untuk belum join, tidak ada kandidat, belum ada inbox, dan belum ada match.

## Candidate Card

Card harus ringkas dan tidak penuh teks.

Konten utama:

- Display name atau nickname sesuai aturan privacy.
- Bio pendek.
- Genre favorit.
- Buku favorit atau buku yang sedang dibaca.
- Reading vibe, misalnya: "slow reader", "fantasy lover", "non-fiction explorer".
- Match hint singkat, misalnya: "Kalian sama-sama suka literary fiction".
- Button/link: "Lihat Rak Buku".
- Action: skip dan send interest.

Hindari:

- Card terlalu panjang.
- Terlalu banyak badge.
- Statistik berlebihan.
- Paragraph panjang.
- Foto/avatar sebagai fokus utama.

## Bookshelf Preview

User bisa membuka rak buku publik kandidat sebelum memutuskan interest.

Isi preview:

- Currently reading.
- Favorite books.
- Recently finished.
- Shared books dengan user.
- Genre yang sering dibaca.
- Public shelf saja.

Bookshelf preview harus membantu user menjawab:

- Apakah taste bacaannya cocok?
- Apakah ada buku/genre yang sama?
- Apakah orang ini menarik untuk diajak ngobrol?

## Interest Flow

- User A swipe/send interest ke User B.
- Interest masuk ke inbox User B.
- User B bisa melihat siapa yang mengirim interest sesuai aturan privacy.
- User B bisa accept/match atau ignore.
- Jika User B juga interest ke User A, match terbentuk.
- Setelah match, chat CTA aktif.

## Inbox

Inbox berada di dalam page Blind Reading.

Inbox menampilkan:

- Interest masuk.
- Match baru.
- Pending sent interest.
- CTA untuk review profile/rak buku.
- CTA untuk accept/match jika user tertarik balik.

Inbox harus simple dan tidak terasa seperti dashboard berat.

## Privacy Rules

- Tidak menggunakan foto profil sebagai elemen utama.
- Hanya tampilkan data yang memang public-facing.
- Private shelf, private reviews, dan private notes tidak boleh muncul.
- Email, lokasi detail, dan data sensitif tidak boleh tampil.
- Chat hanya tersedia setelah match.
- User yang belum join tidak bisa browse kandidat.

Decision needed:

- Apakah nama/username kandidat langsung terlihat sebelum match, atau dibuat semi-anonymous sampai match?

## Matching Signals

Scoring v1:

- Shared public books.
- Similar genres.
- Same favorite authors.
- Currently reading overlap.
- Similar shelf patterns.
- Public reviews/quotes themes.
- Reading activity recency.
- Profile completeness.

Hard exclusions:

- Self.
- User yang belum join.
- User yang pause/leave.
- User yang sudah di-skip baru-baru ini.
- User yang sudah match.
- User yang diblokir.
- User tanpa public reading data cukup.

## Data Model

Potential models:

- `BlindMatchProfile`
  Stores opt-in status, visibility, reading preferences, and discovery settings.
- `BlindMatchInterest`
  Stores sender, receiver, status, created date, and response date.
- `BlindMatch`
  Stores mutual match between two users.
- `BlindMatchSkip`
  Stores skipped users to avoid showing them again too soon.

Interest rows are directional. A match is created when both users have active interest toward each other, or when receiver accepts an incoming interest.

## UX States

- Not joined.
- Joined but no candidates.
- Candidate browsing.
- Bookshelf preview.
- Interest sent.
- Incoming interest inbox.
- Match created.
- Paused.
- Error.

## UI Direction

- Clean, simple, not text-heavy.
- Mobile-first swipe experience.
- Large readable card, minimal copy.
- Warm Shelfgram visual style.
- Use soft surfaces, warm cream background, forest-green primary action.
- Avoid cluttered badges and excessive metadata.
- Prioritize quick decisions: profile vibe, book taste, bookshelf check, action.

## Acceptance Criteria

- User must join before browsing candidates.
- Candidate card is swipeable.
- Candidate card does not depend on profile photo.
- User can inspect public bookshelf before sending interest.
- User can send interest.
- Receiver can see incoming interest in inbox.
- Mutual interest creates a match.
- Chat/profile CTA is available after match.
- Private shelf/data never leaks.
- UI remains clean, simple, and not text-heavy.
- `npm run lint` and `npm run build` pass after implementation.
