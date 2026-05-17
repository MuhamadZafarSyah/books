# Requirements Document

## Introduction

Fitur **Reading Events** memungkinkan pengguna Shelfgram membuat agenda baca bersama (mis. "Besok aku mau baca di Perpusnas, siapa yang mau ikut?"), membagikan lokasi via peta interaktif (mapcn.dev), dan mengundang pengguna lain untuk bergabung. Pengguna lain dapat menelusuri agenda, melihat detail (judul, deskripsi, lokasi pada peta, waktu mulai/selesai, kuota peserta), menekan tombol Join, dan menambahkan komentar opsional saat bergabung. Fitur ini menambah dimensi sosial offline pada komunitas pembaca Shelfgram tanpa mengganggu alur Reading Circle yang sudah ada.

Tujuan utama:

- Memberi pengguna cara mengorganisir sesi baca tatap muka di lokasi fisik tertentu.
- Membantu pengguna lain menemukan dan ikut serta secara terkontrol (kuota, status penuh, batas waktu).
- Menyediakan pengalaman peta yang mulus melalui komponen pihak ketiga `mapcn.dev`.

## Glossary

- **Reading_Events**: Sistem keseluruhan yang mengelola pembuatan, pencarian, partisipasi, dan komentar untuk reading event.
- **Event**: Satu agenda baca bersama yang dimiliki oleh tepat satu pengguna (host) pada lokasi dan waktu tertentu.
- **Host**: Pengguna terautentikasi yang membuat sebuah Event dan secara default menjadi peserta pertama.
- **Participant**: Pengguna terautentikasi yang sudah berhasil bergabung ke sebuah Event melalui aksi Join.
- **Viewer**: Pengguna terautentikasi yang melihat detail Event tetapi belum bergabung.
- **Quota**: Bilangan bulat ≥ 1 yang menyatakan jumlah maksimum Participant pada satu Event, termasuk Host.
- **Join_Comment**: Komentar opsional bertipe teks pendek (≤ 280 karakter) yang ditulis Participant pada saat bergabung.
- **Event_Form**: Komponen UI untuk membuat atau mengubah Event (judul, deskripsi, lokasi, waktu, kuota).
- **Event_List_View**: Tampilan daftar Event yang dapat dijelajahi pengguna.
- **Event_Detail_View**: Tampilan halaman detail satu Event, termasuk peta dan daftar Participant.
- **Map_Component**: Komponen peta interaktif yang dipasok oleh `mapcn.dev`, digunakan untuk memilih lokasi (saat membuat Event) dan menampilkan lokasi (saat melihat Event).
- **Event_Status**: Salah satu dari nilai berikut: `SCHEDULED` (belum mulai dan belum penuh), `FULL` (kuota terisi penuh), `ONGOING` (sudah masuk waktu mulai dan belum selesai), `COMPLETED` (telah lewat waktu selesai), `CANCELLED` (dibatalkan oleh Host).
- **Authenticated_User**: Pengguna yang sudah login melalui NextAuth v5 dan memiliki sesi JWT aktif.

## Requirements

### Requirement 1: Pembuatan Reading Event

**User Story:** Sebagai Authenticated_User, saya ingin membuat Reading Event baru yang berisi judul, deskripsi, lokasi, waktu, dan kuota peserta, sehingga saya dapat mengajak pengguna lain bergabung pada agenda baca saya.

#### Acceptance Criteria

1. WHEN seorang Authenticated_User mengirimkan Event_Form dengan field wajib terisi, THE Reading_Events SHALL menyimpan Event baru dengan Host diset ke pengguna tersebut dan Event_Status diset ke `SCHEDULED`.
2. THE Event_Form SHALL mewajibkan field berikut: judul (1–120 karakter), waktu mulai, waktu selesai, alamat lokasi tekstual (1–200 karakter), koordinat lokasi (latitude antara -90 dan 90, longitude antara -180 dan 180), dan kuota.
3. THE Event_Form SHALL menerima field opsional berikut: deskripsi (≤ 2000 karakter) dan tautan referensi buku (Open Library URL valid).
4. IF kuota yang dikirim bukan bilangan bulat dalam rentang 2–100, THEN THE Reading_Events SHALL menolak pembuatan Event dan menampilkan pesan error pada Event_Form yang menyebut field "kuota".
5. IF waktu selesai lebih awal atau sama dengan waktu mulai, THEN THE Reading_Events SHALL menolak pembuatan Event dan menampilkan pesan error pada Event_Form yang menyebut field "waktu selesai".
6. IF waktu mulai berada di masa lalu pada saat submit, THEN THE Reading_Events SHALL menolak pembuatan Event dan menampilkan pesan error pada Event_Form yang menyebut field "waktu mulai".
7. WHEN seorang Authenticated_User berhasil membuat Event, THE Reading_Events SHALL otomatis mendaftarkan Host sebagai Participant pertama tanpa Join_Comment.
8. IF pengguna yang belum terautentikasi mencoba membuka Event_Form, THEN THE Reading_Events SHALL mengarahkan pengguna ke halaman login.

### Requirement 2: Pemilihan Lokasi via Map_Component

**User Story:** Sebagai Host, saya ingin memilih lokasi event di peta dan melihat alamatnya, sehingga peserta lain mendapatkan posisi yang akurat.

#### Acceptance Criteria

1. THE Event_Form SHALL menampilkan Map_Component dari `mapcn.dev` untuk memilih lokasi.
2. WHEN Host menekan satu titik pada Map_Component, THE Reading_Events SHALL memperbarui field latitude dan longitude pada Event_Form menjadi koordinat titik tersebut.
3. WHEN Host mengetik alamat dan memilih hasil pencarian dari Map_Component, THE Reading_Events SHALL memperbarui field alamat lokasi tekstual pada Event_Form dengan nama tempat yang dipilih dan menyetel koordinat sesuai hasil tersebut.
4. THE Event_Form SHALL men-debounce permintaan pencarian alamat menjadi paling cepat 300 ms setelah penghentian pengetikan terakhir oleh Host.
5. IF Map_Component gagal dimuat dalam 8 detik, THEN THE Reading_Events SHALL menampilkan pesan fallback yang menjelaskan kegagalan peta dan menyediakan input manual untuk alamat dan koordinat.
6. WHILE Map_Component berhasil dimuat, THE Event_Form SHALL menonaktifkan input manual koordinat dan hanya menerima koordinat melalui interaksi dengan Map_Component.
7. THE Event_Form SHALL memvalidasi bahwa nilai latitude dan longitude akhir sudah terisi sebelum tombol simpan diaktifkan.

### Requirement 3: Penjelajahan Daftar Event

**User Story:** Sebagai Authenticated_User, saya ingin melihat daftar Reading Event yang tersedia, sehingga saya dapat menemukan agenda baca yang menarik untuk diikuti.

#### Acceptance Criteria

1. THE Event_List_View SHALL menampilkan Event yang memiliki Event_Status `SCHEDULED` atau `FULL` dengan waktu mulai di masa depan, diurutkan dari waktu mulai paling dekat ke paling jauh.
2. THE Event_List_View SHALL menampilkan untuk setiap Event: judul, nama Host, alamat lokasi tekstual, waktu mulai, jumlah Participant saat ini, kuota, dan Event_Status.
3. WHEN pengguna mengaktifkan filter "hanya yang masih bisa join", THE Event_List_View SHALL menyembunyikan Event yang Event_Status-nya bernilai `FULL`, `ONGOING`, `COMPLETED`, atau `CANCELLED`.
4. THE Event_List_View SHALL mendukung pagination dengan ukuran halaman 20 Event per halaman.
5. WHEN pengguna mengetik kata kunci pada kolom pencarian Event_List_View, THE Reading_Events SHALL men-debounce permintaan pencarian dan mengirimnya tepat setelah jeda 400 ms berlalu sejak ketukan terakhir.
6. THE Reading_Events SHALL melakukan pencocokan pencarian secara case-insensitive pada field judul, deskripsi, dan alamat lokasi tekstual.
7. WHILE Event_List_View belum menerima respons data dari server, THE Event_List_View SHALL menampilkan indikator loading.

### Requirement 4: Detail Event dan Peta

**User Story:** Sebagai Authenticated_User, saya ingin melihat detail satu Reading Event termasuk lokasinya pada peta, sehingga saya dapat memutuskan apakah saya akan bergabung.

#### Acceptance Criteria

1. THE Event_Detail_View SHALL menampilkan field berikut dari Event yang dipilih: judul, deskripsi, nama Host, foto profil Host, alamat lokasi tekstual, waktu mulai, waktu selesai, kuota, jumlah Participant saat ini, daftar Participant (nama dan foto profil), dan Event_Status.
2. THE Event_Detail_View SHALL menampilkan Map_Component dari `mapcn.dev` dengan satu marker pada koordinat Event yang dipilih.
3. THE Map_Component pada Event_Detail_View SHALL bersifat read-only dan tidak mengizinkan pemindahan marker oleh Viewer atau Participant.
4. WHEN Authenticated_User membuka Event_Detail_View untuk Event yang Event_Status-nya `CANCELLED`, THE Reading_Events SHALL menampilkan banner "Event dibatalkan" pada bagian atas tampilan dan menyembunyikan tombol Join sepenuhnya.
5. WHEN Authenticated_User membuka Event_Detail_View, THE Reading_Events SHALL menampilkan tombol Join HANYA jika pengguna belum menjadi Participant, Event_Status bernilai `SCHEDULED`, dan jumlah Participant saat ini lebih kecil dari Quota.
6. WHILE pengguna sudah menjadi Participant, THE Event_Detail_View SHALL menampilkan tombol "Batalkan keikutsertaan" sebagai pengganti tombol Join, kecuali pengguna adalah Host.
7. WHILE pengguna adalah Host, THE Event_Detail_View SHALL menampilkan tombol "Edit" dan "Batalkan event" sebagai pengganti tombol Join.

### Requirement 5: Aksi Join dan Join_Comment

**User Story:** Sebagai Authenticated_User, saya ingin menekan tombol Join pada Event dan secara opsional menambahkan komentar, sehingga Host dan peserta lain tahu saya akan ikut.

#### Acceptance Criteria

1. WHEN Authenticated_User yang belum menjadi Participant menekan tombol Join pada Event_Detail_View, THE Reading_Events SHALL menampilkan dialog konfirmasi yang berisi field opsional Join_Comment.
2. WHEN pengguna mengonfirmasi Join, THE Reading_Events SHALL menambahkan pengguna sebagai Participant dan menyimpan Join_Comment jika diisi.
3. IF Join_Comment yang dikirim memiliki panjang lebih dari 280 karakter, THEN THE Reading_Events SHALL menolak permintaan Join dan menampilkan pesan error pada dialog konfirmasi yang menyebut field "komentar".
4. THE Reading_Events SHALL menyimpan timestamp `joinedAt` pada saat Participant berhasil ditambahkan.
5. WHEN Participant baru berhasil ditambahkan, THE Event_Detail_View SHALL memperbarui jumlah Participant dan memunculkan komentar baru pada daftar Join_Comment tanpa memerlukan reload halaman penuh.
6. IF Authenticated_User mencoba Join pada Event yang Event_Status-nya `FULL`, `ONGOING`, `COMPLETED`, atau `CANCELLED`, THEN THE Reading_Events SHALL menolak permintaan Join dan menampilkan pesan yang menyebut Event_Status saat itu.
7. IF Authenticated_User yang sudah menjadi Participant mengirim permintaan Join lagi, THEN THE Reading_Events SHALL menolak permintaan duplikat dan menampilkan pesan "Anda sudah bergabung".

### Requirement 6: Pembatalan Keikutsertaan oleh Participant

**User Story:** Sebagai Participant non-Host, saya ingin membatalkan keikutsertaan saya pada Event sebelum event dimulai, sehingga slot saya tersedia untuk pengguna lain.

#### Acceptance Criteria

1. WHEN seorang Participant non-Host menekan tombol "Batalkan keikutsertaan" sebelum waktu mulai Event, THE Reading_Events SHALL menghapus pengguna dari daftar Participant dan menghapus Join_Comment milik pengguna tersebut.
2. WHEN seorang Participant berhasil dibatalkan keikutsertaannya, THE Reading_Events SHALL menurunkan jumlah Participant Event sebesar satu dan, jika Event_Status sebelumnya `FULL`, mengubah Event_Status menjadi `SCHEDULED`.
3. IF seorang Participant non-Host mencoba membatalkan keikutsertaan pada Event yang Event_Status-nya `ONGOING` atau `COMPLETED`, THEN THE Reading_Events SHALL menolak permintaan dan menampilkan pesan yang menyebut Event_Status saat itu.
4. IF seorang Authenticated_User yang bukan Participant mencoba memanggil aksi pembatalan keikutsertaan, THEN THE Reading_Events SHALL menolak permintaan dengan pesan "Anda bukan peserta event ini".
5. IF seorang Host mencoba membatalkan keikutsertaan dirinya sendiri, THEN THE Reading_Events SHALL menolak permintaan dan menampilkan pesan yang mengarahkan Host untuk menggunakan tombol "Batalkan event".

### Requirement 7: Penegakan Quota

**User Story:** Sebagai Host, saya ingin sistem menegakkan kuota peserta yang saya tetapkan, sehingga jumlah peserta tidak melampaui kapasitas tempat baca.

#### Acceptance Criteria

1. WHEN jumlah Participant Event mencapai nilai Quota, THE Reading_Events SHALL mengubah Event_Status menjadi `FULL`.
2. WHILE Event_Status bernilai `FULL`, THE Reading_Events SHALL menolak setiap permintaan Join baru pada Event tersebut.
3. WHEN dua atau lebih permintaan Join diproses bersamaan dan total Participant baru akan melampaui Quota, THE Reading_Events SHALL menerima permintaan hanya sebanyak slot tersisa dan menolak permintaan sisanya dengan pesan yang menyebut Event_Status `FULL`.
4. WHEN Host mengubah Quota ke nilai yang lebih kecil dari jumlah Participant saat ini, THE Reading_Events SHALL menolak perubahan dan menampilkan pesan yang menyebut jumlah Participant saat ini.

### Requirement 8: Pengelolaan Event oleh Host

**User Story:** Sebagai Host, saya ingin mengubah atau membatalkan Event yang saya buat, sehingga saya dapat memperbarui informasi atau menarik agenda jika berhalangan.

#### Acceptance Criteria

1. WHEN Host menekan tombol "Edit" pada Event_Detail_View untuk Event miliknya, THE Reading_Events SHALL membuka Event_Form dengan field terisi nilai saat ini dari Event tersebut.
2. WHEN Host mengirim Event_Form edit dengan field wajib valid, THE Reading_Events SHALL memperbarui Event dengan nilai baru dan mempertahankan daftar Participant dan Join_Comment yang sudah ada.
3. IF pengguna selain Host mencoba mengakses Event_Form edit untuk Event yang bukan miliknya, THEN THE Reading_Events SHALL menolak akses dan mengembalikan respons forbidden.
4. WHEN Host menekan tombol "Batalkan event" dan mengonfirmasi, THE Reading_Events SHALL mengubah Event_Status menjadi `CANCELLED` dan mempertahankan data Event untuk arsip.
5. WHILE Event_Status bernilai `CANCELLED`, THE Reading_Events SHALL menolak setiap permintaan Join baru maupun edit pada Event tersebut.
6. IF Host mencoba mengubah waktu mulai menjadi waktu di masa lalu, THEN THE Reading_Events SHALL menolak perubahan dan menampilkan pesan error pada Event_Form yang menyebut field "waktu mulai".

### Requirement 9: Transisi Event_Status Berdasarkan Waktu

**User Story:** Sebagai pengguna Shelfgram, saya ingin Event_Status mencerminkan kondisi waktu Event secara akurat, sehingga saya tidak dapat join Event yang sudah berlangsung atau selesai.

#### Acceptance Criteria

1. WHEN waktu saat ini melewati waktu mulai Event yang Event_Status-nya `SCHEDULED` atau `FULL`, THE Reading_Events SHALL menetapkan Event_Status menjadi `ONGOING`.
2. WHEN waktu saat ini melewati waktu selesai Event yang Event_Status-nya `ONGOING`, THE Reading_Events SHALL menetapkan Event_Status menjadi `COMPLETED`.
3. WHILE Event_Status bernilai `ONGOING` atau `COMPLETED`, THE Reading_Events SHALL menolak setiap permintaan Join baru.
4. THE Reading_Events SHALL menentukan Event_Status pada setiap pembacaan Event berdasarkan waktu server saat ini, sehingga Event_Status yang ditampilkan tidak lebih lambat dari 60 detik dibandingkan waktu sebenarnya.

### Requirement 10: Otorisasi dan Sesi

**User Story:** Sebagai pemilik aplikasi, saya ingin hanya pengguna terautentikasi yang dapat membuat Event, melakukan Join, atau berkomentar, sehingga interaksi sosial tetap dapat dipertanggungjawabkan.

#### Acceptance Criteria

1. IF pengguna tanpa sesi NextAuth yang valid mencoba memanggil server action untuk membuat, mengedit, membatalkan Event, melakukan Join, atau membatalkan Join, THEN THE Reading_Events SHALL menolak permintaan dan mengembalikan respons unauthorized.
2. THE Reading_Events SHALL mengizinkan tampilan publik Event_List_View dan Event_Detail_View hanya kepada Authenticated_User.
3. IF pengguna yang bukan Host mencoba memanggil server action edit atau batalkan Event milik orang lain, THEN THE Reading_Events SHALL menolak permintaan dan mengembalikan respons forbidden.
4. THE Reading_Events SHALL mencatat ID pengguna di setiap Event dan setiap entri Participant menggunakan kolom relasi yang merujuk pada model `User` di Prisma.

### Requirement 11: Tampilan Komentar Join_Comment

**User Story:** Sebagai pengguna Event_Detail_View, saya ingin melihat komentar yang ditulis Participant saat join, sehingga saya merasakan suasana sosial agenda baca tersebut.

#### Acceptance Criteria

1. THE Event_Detail_View SHALL menampilkan daftar Join_Comment yang tidak kosong, diurutkan dari `joinedAt` paling baru ke paling lama.
2. THE Event_Detail_View SHALL menampilkan nama Participant dan foto profil di samping setiap Join_Comment apabila keduanya tersedia, dan menampilkan placeholder nama "Pembaca" beserta inisial pada avatar apabila tidak tersedia.
3. IF pengurutan Join_Comment berdasarkan `joinedAt` gagal dilakukan, THEN THE Event_Detail_View SHALL menyembunyikan seluruh daftar Join_Comment dan menampilkan pesan "Komentar peserta sedang dimuat".
4. WHEN Participant membatalkan keikutsertaannya, THE Event_Detail_View SHALL menghapus Join_Comment milik Participant tersebut dari daftar tampilan tanpa memerlukan reload halaman penuh.
5. WHILE belum ada Join_Comment yang tidak kosong, THE Event_Detail_View SHALL menampilkan pesan placeholder "Belum ada komentar dari peserta".

### Requirement 12: Tampilan Responsif dan Konsistensi Visual

**User Story:** Sebagai pengguna mobile, tablet, dan desktop, saya ingin tampilan Reading Events tetap nyaman digunakan di setiap ukuran layar dan konsisten dengan gaya Shelfgram.

#### Acceptance Criteria

1. THE Event_List_View dan Event_Detail_View SHALL bersifat responsif tanpa horizontal scroll pada lebar viewport 375 px, 768 px, 1024 px, dan 1440 px.
2. THE Event_Form SHALL menyusun field secara satu kolom pada viewport dengan lebar di bawah 1024 px dan dua kolom pada viewport dengan lebar 1024 px atau lebih.
3. THE Reading_Events SHALL menggunakan komponen primitif dari `src/components/ui` (shadcn) untuk tombol, input, label, dialog, sheet, scroll area, separator, toast, avatar, dan tooltip.
4. THE Reading_Events SHALL menggunakan token warna primer hijau hutan, latar krem hangat, font heading Noto Serif, dan font body Manrope sesuai arah visual Shelfgram.
5. THE Event_Form SHALL dibangun dengan `react-hook-form` dan resolver Zod, dengan skema Zod disimpan di `src/features/reading-events/schemas/`.
