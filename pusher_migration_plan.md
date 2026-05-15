# Pusher Migration Plan

Rombak seluruh implementasi realtime chat yang saat ini memakai WebSocket custom menjadi **Pusher Channels** tanpa mengubah UI/UX sama sekali.

## Tujuan

- Hapus ketergantungan pada server WebSocket custom dan package `ws`.
- Ganti transport realtime ke **Pusher Channels**.
- Pertahankan perilaku chat yang ada sekarang:
  - daftar percakapan realtime
  - pesan baru realtime
  - typing indicator realtime
  - unread count tetap sinkron
  - status online/offline tetap sinkron
  - mark as read tetap realtime
- Jangan mengubah struktur visual, copy, layout, spacing, komponen, atau interaction design pada UI.
- Ikuti standar code project ini: App Router, Server Actions untuk server-side mutation, strict TypeScript, perubahan sekecil mungkin, dan boundary client/server tetap sempit.

## Constraint Wajib

- **Tidak boleh ada perubahan UI/UX**.
- **Tidak boleh memakai WebSocket custom lagi**.
- **Tidak boleh ada service WS terpisah** setelah migrasi selesai.
- Gunakan **Pusher Channels hosted service** sebagai satu-satunya transport realtime.
- Pertahankan payload event agar `ChatWorkspace` tidak perlu dirombak besar-besaran.

## Dependency Baru

Install package berikut:

```bash
npm install pusher pusher-js
```

Setelah migrasi selesai dan lulus verifikasi, hapus dependency lama yang khusus untuk server WS custom:

```bash
npm uninstall ws
```

## Environment Variables Baru

Tambahkan env berikut di `.env` lokal dan di Vercel:

```env
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
```

Catatan:

- `NEXT_PUBLIC_PUSHER_KEY` harus sama dengan `PUSHER_KEY`.
- `NEXT_PUBLIC_PUSHER_CLUSTER` harus sama dengan `PUSHER_CLUSTER`.

## Environment Variables Yang Dihapus Setelah Migrasi

Jika seluruh migrasi selesai, env berikut tidak dipakai lagi:

```env
NEXT_PUBLIC_CHAT_WS_URL
CHAT_WS_INTERNAL_URL
CHAT_WS_INTERNAL_SECRET
```

## Arsitektur Baru

### Sebelum

- Client connect langsung ke server WebSocket custom.
- Server WebSocket custom menerima `message.send` dan `typing.update`.
- Server WebSocket custom broadcast ke semua client.
- Server WebSocket custom juga flush message ke database dan update Redis.

### Sesudah

- Client subscribe ke **Pusher Channels**.
- Semua mutation kritikal dipindahkan ke **Server Actions** / **Route Handlers** di app Next.js.
- Server-side mutation akan:
  - persist ke database dulu
  - update cache/unread yang masih relevan
  - trigger event ke Pusher
- Typing indicator dikirim lewat **client events** Pusher pada presence/private channel dengan debounce yang tetap sama.
- Presence online/offline memanfaatkan **presence channels** Pusher, bukan Redis dan bukan custom socket server.

## Prinsip Migrasi

1. **Preserve contract dulu, rename belakangan**.
   - Pertahankan event payload seperti `message.created`, `typing.updated`, `presence.updated`, `conversation.read`.
   - Pertahankan status UI `Realtime online` / `Realtime standby`.
   - Jika perlu, hook `use-chat-socket.ts` boleh sementara tetap dipakai namanya, tetapi implementasinya diganti ke Pusher untuk meminimalkan churn.

2. **Persist-before-broadcast**.
   - Untuk pesan baru, simpan ke DB lebih dulu di Server Action.
   - Baru setelah sukses, trigger event `message.created` via Pusher.
   - Kegagalan tidak lagi datang dari server socket, tetapi dari hasil mutation server.

3. **Client-only typing, server-authenticated channels**.
   - Typing event tidak perlu mutation ke DB.
   - Gunakan `client-typing` event Pusher di presence/private conversation channel.
   - Tetap debounce memakai `useDebounceCallback`.

4. **No UI refactor**.
   - Jangan sentuh className, komponen presentational, wording, layout, atau struktur visual.
   - Perubahan hanya di transport, auth channel, dan source of truth server-side.

## Mapping Event Lama ke Pusher

| Event Lama | Sumber Baru | Catatan |
|---|---|---|
| `message.created` | server-side `pusher.trigger(...)` setelah DB write | tetap dipakai oleh UI |
| `message.failed` | lokal di client dari hasil Server Action gagal | tidak perlu broadcast server-wide |
| `typing.updated` | transform dari Pusher `client-typing` event | payload tetap diseragamkan untuk UI |
| `presence.updated` | transform dari lifecycle membership Pusher presence channel | payload tetap diseragamkan untuk UI |
| `conversation.read` | server-side `pusher.trigger(...)` setelah `markConversationRead` | tetap dipakai oleh UI |

## Channel Strategy

Gunakan **presence channel per conversation**:

```txt
presence-conversation-<conversationId>
```

Alasan:

- presence membership bisa dipakai untuk online status participant
- client events (`client-typing`) bisa dipakai untuk typing indicator
- authorization bisa divalidasi per-conversation lewat server

## Perubahan File Per File

### 1. Tambah utilitas Pusher server

**[NEW]** `src/lib/chat/pusher-server.ts`

Tugas:

- Buat singleton `Pusher` server SDK.
- Validasi env `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`.
- Ekspor helper:
  - `getPusherServer()`
  - `triggerConversationEvent(conversationId, eventName, payload)`

Best practice:

- Jangan inisialisasi Pusher berulang kali di banyak file.
- Simpan helper tetap kecil dan fokus.

### 2. Tambah utilitas Pusher client

**[NEW]** `src/lib/chat/pusher-client.ts`

Tugas:

- Buat lazy singleton `Pusher` client untuk browser.
- Gunakan `NEXT_PUBLIC_PUSHER_KEY` dan `NEXT_PUBLIC_PUSHER_CLUSTER`.
- Gunakan `authEndpoint` internal app untuk private/presence channel auth.

Best practice:

- File ini hanya untuk client.
- Jangan import ke Server Component / Server Action.

### 3. Tambah endpoint auth Pusher

**[NEW]** `src/app/api/pusher/auth/route.ts`

Tugas:

- Authorize private/presence channel subscription.
- Gunakan `auth()` untuk cek session.
- Parse channel name `presence-conversation-<id>`.
- Pastikan user adalah participant conversation tersebut.
- Return response auth Pusher untuk channel.
- Sertakan `user_id` dan `user_info` yang cukup untuk presence.

Best practice:

- Tolak channel yang formatnya tidak valid.
- Tolak akses jika user bukan participant.
- Jangan expose data user yang tidak diperlukan.

### 4. Rombak `src/actions/chat.ts`

Tugas inti:

- Hapus dependency ke custom WS transport:
  - `broadcastChatEvent`
  - `createChatSocketToken`
  - `getChatSocketAccess`
  - `socketUrl` pada bootstrap response
- Tambahkan server-side trigger ke Pusher.
- Tambahkan action baru untuk kirim pesan, misalnya:
  - `sendConversationMessage(conversationId, body, clientId)`

Perubahan detail:

#### `getChatBootstrap()`

- Hapus `socketUrl` dari payload bootstrap.
- Jika UI saat ini masih expect field tersebut, ubah contract minimal dan sesuaikan hook realtime, bukan UI visual.

#### `markConversationRead(conversationId)`

- Setelah DB update + unread clear sukses, trigger:

```ts
conversation.read
```

#### `sendConversationMessage(...)`

- Validasi user dan membership conversation.
- Validasi body dan `clientId`.
- Simpan message ke DB langsung, jangan lagi lewat queue di server WS custom.
- Update `chatConversation.lastMessageAt`.
- Update unread count untuk participant lain.
- Update recent message cache bila cache Redis tetap dipakai.
- Trigger:

```ts
message.created
```

payload harus tetap kompatibel dengan `ChatMessageSummary`.

Best practice:

- Semua write penting harus transactional.
- Broadcast hanya setelah transaction sukses.
- Kegagalan action harus bisa dipetakan ke optimistic failure di client.

### 5. Rombak `src/features/chat/hooks/use-chat-socket.ts`

Strategi yang direkomendasikan:

- **Pertahankan nama file dan public API hook** pada fase pertama agar perubahan di UI minimum.
- Ganti implementasi internal dari native `WebSocket` menjadi **Pusher Channels**.

Tugas:

- Subscribe ke semua `presence-conversation-<id>` yang relevan.
- Terjemahkan event Pusher menjadi event UI lama:
  - `message.created`
  - `typing.updated`
  - `presence.updated`
  - `conversation.read`
- Pertahankan return shape:
  - `send(...)`
  - `status`

Rekomendasi implementasi:

- `send({ type: "typing.update", ... })`
  - map ke `channel.trigger("client-typing", payload)`
- `send({ type: "message.send", ... })`
  - **jangan lagi kirim lewat socket**
  - panggil Server Action `sendConversationMessage(...)`
  - tetap kembalikan boolean agar `ChatWorkspace` tidak perlu berubah besar

Status mapping:

- `open` saat Pusher connected
- `closed` saat disconnected/error
- `disabled` jika user belum punya channel untuk disubscribe

Best practice:

- Cleanup subscription saat dependency berubah.
- Jangan bind handler baru tanpa unbind handler lama.
- Gunakan satu shared Pusher connection per tab.

### 6. Update `src/features/chat/components/chat-workspace.tsx`

Target:

- **Perubahan seminimal mungkin**.
- UI tidak berubah sama sekali.

Tugas:

- Ganti alur kirim pesan agar `message.send` pada hook pada akhirnya memakai Server Action melalui transport baru.
- Pertahankan optimistic UI, `pending`, `failed`, dan preview logic yang sekarang.
- Pertahankan typing debounce dan label `Realtime online` / `Realtime standby`.

Catatan implementasi:

- `handleSocketEvent` boleh tetap dipertahankan bentuknya.
- Jika payload Pusher berbeda, normalisasi di hook, bukan di komponen UI.
- Jangan ubah markup, className, text, atau struktur visual.

### 7. Refactor `src/lib/chat/redis.ts`

Tugas:

- Hapus tanggung jawab transport-specific broadcast HTTP ke server WS custom.
- Hapus fungsi yang tidak relevan lagi untuk WS custom.

Jika Redis tetap dipakai, pertahankan hanya hal yang masih berguna:

- `cacheRecentMessage`
- `getRecentMessages`
- `incrementUnread`
- `clearUnread`
- `getUnreadCounts`

Pertimbangkan split file menjadi lebih jelas:

- `src/lib/chat/cache.ts`
- atau tetap satu file jika perubahan kecil lebih aman

### 8. Hapus file token WS custom

**[DELETE]** `src/lib/chat/socket-token.ts`

Karena:

- tidak ada lagi custom token signing untuk WebSocket server sendiri
- auth channel Pusher dipindah ke route handler

### 9. Hapus server WS custom

**[DELETE]** `scripts/chat-websocket-server.mjs`

Karena:

- arsitektur baru tidak memakai server transport terpisah

### 10. Update `package.json`

Tugas:

- Tambah dependency `pusher` dan `pusher-js`
- Hapus script:

```json
"dev:chat": "node scripts/chat-websocket-server.mjs"
```

- Hapus dependency `ws`

### 11. Update tipe chat shared

**[UPDATE]** `src/lib/chat/types.ts`

Tugas:

- Hapus field yang hanya relevan untuk socket custom, misalnya `socketUrl` pada `ChatBootstrap`.
- Pertahankan shape event UI semaksimal mungkin.
- Jika rename dari `ChatSocketEvent` ke nama yang lebih netral ingin dilakukan, lakukan hanya jika tidak menambah churn besar.

Rekomendasi low-risk:

- Pertahankan nama type event sementara.
- Fokus migrasi perilaku dulu, rename belakangan jika benar-benar perlu.

## Urutan Implementasi yang Direkomendasikan

1. Install dependency Pusher.
2. Tambah utilitas Pusher server/client.
3. Tambah route auth Pusher.
4. Tambah server action `sendConversationMessage`.
5. Pindahkan trigger `conversation.read` ke Pusher.
6. Ganti implementasi `use-chat-socket.ts` ke Pusher tanpa mengubah public API.
7. Sesuaikan `ChatWorkspace` hanya seperlunya.
8. Refactor/hapus `socketUrl` dan `getChatSocketAccess`.
9. Refactor `redis.ts` agar tidak lagi mem-broadcast ke server WS custom.
10. Hapus `socket-token.ts`.
11. Hapus `scripts/chat-websocket-server.mjs`.
12. Hapus dependency `ws` dan script `dev:chat`.
13. Bersihkan env lama.

## Best Practice yang Harus Diikuti

- Gunakan **Server Actions** untuk mutation yang mengubah database.
- Gunakan **presence/private channels** untuk auth per-conversation.
- Typing indicator harus tetap **debounced**.
- Jangan kirim request DB/network di setiap keystroke tanpa debounce.
- Persist message ke DB **sebelum** trigger event realtime.
- Jangan menaruh credential Pusher server di client.
- Jangan rebuild ulang struktur UI untuk menyesuaikan transport.
- Pertahankan import alias `@/*`.
- Tetap jalankan lint dan build setelah perubahan.

## Risiko yang Harus Ditangani

### Risiko 1: Presence status jadi berbeda dari implementasi lama

Mitigasi:

- Gunakan presence channel per conversation.
- Aggregate online state user dari membership channel yang sedang disubscribe.

### Risiko 2: Typing event bocor ke conversation lain

Mitigasi:

- Trigger typing hanya ke channel conversation aktif.
- Validate conversation channel di auth route.

### Risiko 3: Optimistic message gagal sinkron dengan event final

Mitigasi:

- Tetap gunakan `clientId`.
- Saat `message.created` datang, reconcile berdasarkan `id === clientId` atau `clientId` yang sama.

### Risiko 4: UI berubah tanpa sengaja

Mitigasi:

- Jangan ubah JSX visual kecuali benar-benar perlu untuk data flow.
- Review diff visual file chat sebelum merge.

## File Yang Harus Hilang Setelah Migrasi Selesai

- `scripts/chat-websocket-server.mjs`
- `src/lib/chat/socket-token.ts`

Dan tidak boleh ada lagi code path yang bergantung pada:

- `WebSocket`
- `NEXT_PUBLIC_CHAT_WS_URL`
- `CHAT_WS_INTERNAL_URL`
- `CHAT_WS_INTERNAL_SECRET`
- `ws`

## Verification Plan

### 1. Static verification

Jalankan:

```bash
npm install
npm run lint
npm run build
```

### 2. Manual verification realtime parity

Uji dengan dua akun, dua browser/tab:

1. Buka `/dashboard/chat` dari dua akun berbeda.
2. Pastikan label realtime tetap tampil seperti sekarang.
3. Kirim pesan dari akun A.
4. Pastikan akun B menerima pesan tanpa refresh.
5. Pastikan preview conversation update realtime.
6. Pastikan unread count akun B naik.
7. Buka conversation di akun B.
8. Pastikan unread count turun dan event read tersinkron.
9. Ketik di akun A.
10. Pastikan akun B melihat typing indicator.
11. Tutup tab akun A.
12. Pastikan status online/offline eventually sinkron.

### 3. Regression checks

- Login/register/auth flow tidak rusak.
- Dashboard route tetap terlindungi.
- Public profile action `message` tetap bisa membuka / membuat conversation.
- Initial load chat tetap mengambil data dari DB/cache seperti sebelumnya.

## Definition of Done

Migrasi dianggap selesai jika seluruh kondisi berikut terpenuhi:

- Tidak ada custom WebSocket server yang berjalan atau dibutuhkan.
- Semua realtime chat berjalan via Pusher.
- UI/UX chat tidak berubah.
- `npm run lint` lulus.
- `npm run build` lulus.
- Semua flow manual verification di atas lulus.
- Dependency `ws` dan script `dev:chat` sudah dihapus.

## Catatan Implementasi

- Jika ingin menurunkan risiko, lakukan migrasi dalam dua tahap:
  1. **Parity stage**: ganti transport ke Pusher sambil mempertahankan nama hook/type/event lama.
  2. **Cleanup stage**: hapus nama/abstraksi yang sudah tidak relevan hanya setelah parity lulus.

- Untuk project ini, pendekatan paling aman adalah **parity stage dulu** karena user meminta perilaku dan UI tetap identik.
