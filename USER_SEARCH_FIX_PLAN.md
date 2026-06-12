# Plan: Perbaikan Search Pengguna Shelfgram

## Tujuan

Perbaiki fitur pencarian pengguna agar halaman tidak langsung menjalankan query dan tidak langsung menampilkan list pengguna saat pertama dibuka. Query hanya berjalan setelah user mengetik kata kunci yang cukup, lalu backend mengurutkan hasil dengan ranking yang lebih relevan untuk nama dan username.

## Masalah Saat Ini

- `UserSearchExperience` menjalankan search saat mount dengan query kosong.
- `/api/users/search` menerima query kosong dan memanggil `searchUsers`.
- `searchUsers` mengembalikan suggested users saat query kosong.
- Ranking masih sederhana: exact, prefix, contains, lalu bio/location.

## Perubahan Frontend

- Initial state tetap `idle`.
- Tambahkan minimal query length 2 karakter.
- Jangan fetch saat query kosong atau hanya 1 karakter.
- Saat query tidak valid, batalkan debounce, abort request aktif, kosongkan hasil, dan tampilkan idle state.
- Raw `onChange` hanya update local state.
- Fetch tetap debounced memakai `useDebounceCallback`.
- Clear input reset query, error, hasil, dan status.

## Perubahan API

- `/api/users/search` tetap auth-gated.
- Jika `q` kosong atau kurang dari 2 karakter, return payload kosong tanpa query database.
- Komentar route diperbarui agar tidak lagi menyebut suggested users.

## Algoritma Ranking

Ranking hasil diprioritaskan seperti berikut:

1. Exact username.
2. Exact name.
3. Username prefix.
4. Name prefix.
5. Prefix per token nama.
6. Username contains.
7. Name contains.
8. Bio/location contains sebagai sinyal lemah.

Tie-breaker:

- Profil yang sudah di-follow viewer lebih tinggi.
- Profil lebih lengkap lebih tinggi.
- Urut alfabetis berdasarkan username/name.

## Verifikasi

- `npm run lint`
- `npm run build`
- Manual: halaman cari pembaca tidak memanggil API saat kosong.
- Manual: 1 karakter belum query.
- Manual: minimal 2 karakter query setelah debounce.
- Manual: clear input menghapus hasil dan tidak query ulang.
