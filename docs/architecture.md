# Arsitektur TemanNyatet

Dokumen ini menjelaskan struktur aplikasi setelah refactor bertahap pada
frontend dan backend. Fokusnya adalah batas tanggung jawab antar-modul, alur
data utama, serta dampak praktis terhadap pengembangan dan runtime aplikasi.

## 1. Gambaran umum

TemanNyatet adalah monorepo pnpm dengan dua artifact utama:

```text
TemanNyatet
├── artifacts/teman-nyatet/   # React + Vite + Tailwind, PWA, port 5000
├── artifacts/api-server/     # Express 5 + Drizzle, API, port 8080
├── lib/
│   ├── api-client-react/     # Client/kontrak API yang dibagikan
│   ├── api-spec/             # OpenAPI dan generator
│   ├── api-zod/              # Schema validasi
│   └── db/                   # Schema database dan utilitas Drizzle
├── supabase/migrations/      # Migrasi database
└── docs/                     # Dokumentasi teknis
```

Frontend dan backend tetap dijalankan sebagai workflow terpisah. Frontend
mengakses backend melalui relative `/api/*`, sehingga tidak perlu menanamkan
hostname lokal atau hostname Replit ke dalam kode aplikasi.

## 2. Lapisan frontend

Frontend menggunakan pembagian tanggung jawab berikut:

```text
App.tsx
  ├── AuthContext / CreateContext
  ├── AuthGuard dan MainLayout
  ├── route table + lazy-loaded pages
  └── shared navigation, PWA prompt, offline indicator

Pages
  ├── CatatanPage
  ├── KeuanganPage
  ├── TodoPage
  ├── LinkSaverPage
  └── page lain untuk auth, payment, subscription, dan integrasi

Reusable components
  ├── form sheets
  ├── list/grid/presentation components
  ├── navigation dan settings
  └── voice input serta state feedback

Hooks
  ├── useNotes
  ├── useTransactions
  ├── useTodos
  ├── useLinks
  └── useVoiceRecorder

Domain/lib
  ├── transactions.ts
  ├── notes.ts
  ├── transaction-date.ts
  ├── transaction-summary.ts
  ├── app-events.ts
  └── apiClient.ts
```

### App shell dan routing

`App.tsx` menjadi composition root frontend. Tanggung jawabnya:

- menyediakan `QueryClient`, `AuthProvider`, dan `CreateProvider`;
- menjalankan route table;
- lazy-load page dan navigasi agar bundle awal lebih kecil;
- menjaga `AuthGuard` dan redirect berdasarkan status session/subscription;
- memilih layout mobile atau desktop;
- memasang error boundary, offline indicator, dan prompt PWA.

Page yang tidak sedang aktif di-unmount. Cache React Query tetap menyimpan data
yang sudah diambil, sehingga aplikasi tidak perlu menjaga semua halaman tetap
hidup hanya demi mempertahankan data.

### Page sebagai controller

Page masih menjadi controller untuk state dan orchestration domain masing-masing.
Page tidak lagi memuat seluruh markup detail untuk setiap surface.

#### Catatan

`CatatanPage.tsx` mengatur:

- pemilihan dan pengeditan catatan;
- operasi create/update/delete/reorder melalui `useNotes`;
- state voice transcript;
- pembukaan form dan integrasi event lintas komponen.

Markup yang bersifat reusable dipindahkan ke:

- `NoteFormSheet.tsx` untuk form tambah/edit;
- `NoteColorPicker.tsx` untuk pilihan warna;
- `SortableNoteGrid.tsx` untuk grid drag-and-drop;
- `lib/notes.ts` untuk schema dan tipe form.

#### Keuangan

`KeuanganPage.tsx` mengatur:

- filter aktif;
- state form transaksi;
- operasi create/delete;
- voice input transaksi;
- summary dan event pembukaan bottom sheet.

Bagian presentasi/form dipisahkan ke:

- `BalanceHero.tsx` — saldo, pemasukan, pengeluaran, dan slot summary;
- `TransactionPeriodFilter.tsx` — pilihan periode dan custom date range;
- `TransactionList.tsx` — loading, empty state, grouping tanggal, dan row;
- `TransactionFormSheet.tsx` — form transaksi mobile/sheet;
- `TransactionSummaryCard.tsx` — ringkasan AI yang sudah ada.

Aturan transaksi bersama tidak didefinisikan ulang di page. Schema,
default form, kategori, sumber dana, parsing nominal, dan format Rupiah
berada di `lib/transactions.ts`.

#### Settings

`SettingsSheet.tsx` tetap menjadi controller untuk:

- profile/avatar;
- subscription dan credit;
- Google Sheets;
- appearance;
- operasi Supabase/API;
- pembukaan dan penutupan drawer.

Form detail yang sebelumnya inline dipindahkan ke `SettingsDetailForm.tsx`.
Komponen tersebut menangani presentasi dan input untuk:

- nama;
- nomor HP;
- password;
- feedback.

Dengan demikian logic side effect tetap terpusat di `SettingsSheet`, sedangkan
markup form bisa dipelihara secara terpisah.

## 3. Data access frontend

Data access domain dipusatkan pada hooks:

- `useNotes` menangani fetch, polling, cache per user, optimistic reorder,
  serialisasi write reorder, dan operasi CRUD catatan;
- `useTransactions` menangani fetch, polling, sorting, create/delete,
  optimistic delete, serta perhitungan summary;
- hook lain memakai pola serupa untuk todo dan link.

Hook menggunakan `apiClient.ts`, bukan memanggil `fetch` secara tersebar di
komponen. Ini memberi satu tempat untuk aturan base URL, authorization,
response parsing, dan error handling.

Cache lokal yang memang diperlukan untuk UX tetap dibatasi pada domain:

- cache notes dipetakan berdasarkan `userId`;
- cache dibersihkan saat `SIGNED_OUT`;
- React Query mempertahankan cache query saat page di-unmount.

Impact-nya adalah perpindahan tab terasa lebih cepat, tetapi developer harus
memahami bahwa data di UI dapat berasal dari cache sebelum polling atau request
berikutnya menyegarkan data.

## 4. Event lintas komponen

Event global tidak lagi bergantung pada string literal yang tersebar. Event
yang digunakan lintas surface didefinisikan di `lib/app-events.ts`, misalnya:

- membuka bottom sheet transaksi;
- membuka Settings pada subscription;
- membuka Settings pada top-up.

Producer memanggil helper seperti `requestBottomSheet()`, sedangkan consumer
berlangganan menggunakan `subscribeToAppEvent()`.

Impact:

- nama event dan payload lebih mudah dicari;
- payload dapat diberi tipe;
- perubahan event memiliki satu lokasi kontrak;
- page tidak perlu mengenal implementasi internal `BottomSheetNav`.

Trade-off-nya, event bus tetap merupakan komunikasi runtime yang bersifat
implicit dibanding props langsung. Karena itu event hanya digunakan untuk
komunikasi lintas surface yang memang tidak praktis diteruskan melalui props,
bukan untuk semua state lokal.

## 5. Voice input

Voice input memiliki dua lapisan:

1. `VoiceRecordButton.tsx` menangani interaksi hold-to-record, timer, status,
   ripple, dan keyboard.
2. `useVoiceRecorder.ts` menangani lifecycle recorder, permission, browser
   `SpeechRecognition`/`webkitSpeechRecognition`, fallback `MediaRecorder`,
   serta upload audio ke `/api/transcribe` jika provider Whisper-compatible
   memang dikonfigurasi.

Provider chat/text AI tidak dianggap sebagai provider speech-to-text.
Transkripsi catatan menambahkan hasil ke editor catatan. Transkripsi transaksi
hanya mengisi kolom catatan; nominal, tipe, kategori, sumber dana, dan tanggal
tetap dikontrol manual.

Callback recorder menggunakan ref dan session ID. Ini mencegah callback dari
sesi lama mengubah form yang sudah di-render ulang atau sesi baru.

## 6. Backend API

Backend dibagi menjadi:

```text
app.ts
  ├── security middleware
  ├── CORS dan rate limit
  ├── request logging
  ├── raw-body webhook handling
  ├── JSON body parsing
  ├── /api router
  └── last-resort JSON error boundary

routes/
  ├── auth-google
  ├── notes
  ├── transactions
  ├── transaction-summary
  ├── todos
  ├── links
  ├── profile
  ├── spreadsheet
  ├── subscription
  ├── credits/payment
  ├── transcribe
  └── webhook/cron/health

lib/
  ├── repository/data-store
  ├── validation dan field normalization
  ├── payment/subscription services
  ├── Google Sheets integration
  ├── summary cache/service
  └── integration-specific helpers
```

`app.ts` bertanggung jawab pada concern HTTP lintas route. Route bertanggung
jawab pada endpoint dan authorization boundary. Logic yang dapat dipakai
lintas route berada di `src/lib`, bukan di handler route yang besar.

Webhook payment dipasang dengan `express.raw()` sebelum `express.json()` agar
signature provider dapat diverifikasi terhadap raw bytes yang asli. Endpoint
lain menggunakan JSON body dengan batas ukuran.

## 7. Alur data utama

### Membuat transaksi

```text
User
  → TransactionFormSheet / SheetFormContent
  → KeuanganPage.onSubmitForm
  → useTransactions.createTransaction
  → apiClient.apiPost('/transactions')
  → API route / repository
  → PostgreSQL/Supabase
  → response transaction
  → optimistic/local state update
  → polling atau refetch event
```

### Menyimpan catatan

```text
User
  → NoteFormSheet
  → CatatanPage
  → useNotes.createNote/updateNote
  → apiClient
  → API route notes
  → PostgreSQL/Supabase
  → local cache/state
  → link refresh event jika isi note berubah
```

### Membuka form transaksi dari surface lain

```text
Surface lain
  → requestBottomSheet({ transactionType })
  → APP_EVENTS.openBottomSheet
  → BottomSheetNav subscriber
  → SheetFormContent
  → useTransactions.createTransaction
```

## 8. Dampak perubahan arsitektur

### Dampak positif

1. **Perubahan UI lebih terlokalisasi**
   - Perubahan layout daftar transaksi tidak perlu menyentuh controller
     perhitungan saldo.
   - Perubahan form catatan tidak perlu menyentuh drag-and-drop grid.

2. **Reuse meningkat**
   - Form dan presentation component dapat dipakai ulang atau diuji tanpa
     merender seluruh page.
   - Aturan transaksi dipakai konsisten oleh form desktop/mobile dan bottom
     sheet.

3. **Risiko regresi domain menurun**
   - Schema dan parsing transaksi memiliki satu sumber kebenaran.
   - Payload event lintas surface memiliki kontrak terpusat.
   - Callback voice tidak bergantung pada lifecycle render tertentu.

4. **UX navigation lebih ringan**
   - Hanya route aktif yang mounted.
   - Page lazy-loaded.
   - Cache data membuat kembali ke tab sebelumnya tetap cepat.

5. **Runtime lebih aman dan mudah didiagnosis**
   - API memiliki rate limit, security headers, request logging, batas body,
     dan JSON error boundary.
   - Webhook signature tetap dapat diverifikasi karena raw body dipertahankan.

6. **Security dependency lebih konsisten**
   - Override dependency berada di `pnpm-workspace.yaml`, satu lokasi untuk
     seluruh workspace.
   - Override lama untuk pruning platform dan pin esbuild dipertahankan.
   - Patch transitive untuk `fast-uri`, `brace-expansion`, `ip-address`,
     `js-yaml`, `linkify-it`, dan `postcss` dikelola bersama.

### Trade-off dan batasan

1. **Beberapa controller masih cukup besar**
   `CatatanPage.tsx`, `SettingsSheet.tsx`, dan sebagian `KeuanganPage.tsx`
   masih menggabungkan orchestration yang kompleks. Refactor yang dilakukan
   bersifat bertahap untuk menghindari perubahan besar sekaligus.

2. **Polling menambah request berkala**
   Polling 15 detik membantu sinkronisasi lintas device/session, tetapi
   menambah traffic API. Jika skala user meningkat, pola ini dapat diganti
   atau dilengkapi dengan realtime subscription, invalidation terarah, atau
   background sync.

3. **Cache memiliki konsekuensi konsistensi**
   UI dapat menampilkan data cache sebelum refresh selesai. Hook harus
   mempertahankan aturan invalidation dan cleanup saat user logout.

4. **Event bus menambah indireksi**
   Komunikasi lintas surface menjadi lebih longgar, tetapi alur tidak selalu
   terlihat dari parent-child tree. Event baru sebaiknya hanya ditambahkan
   jika props/context tidak sesuai.

5. **Lazy loading menambah state loading**
   Bundle awal lebih kecil, tetapi perpindahan ke route yang belum pernah
   dibuka dapat menampilkan fallback loading singkat.

6. **Preview authenticated tidak selalu dapat diverifikasi otomatis**
   Preview tanpa session berhenti di halaman login. Alur authenticated perlu
   diuji dengan session yang valid atau test integration yang sesuai.

## 9. Panduan perubahan berikutnya

Saat menambah fitur:

1. Taruh aturan domain yang dipakai lebih dari satu surface di `src/lib`.
2. Taruh fetch/mutation dan cache di hook domain.
3. Jadikan page sebagai controller, bukan tempat seluruh markup detail.
4. Pecah form, list, filter, dan visual summary menjadi komponen terfokus.
5. Gunakan `app-events.ts` untuk komunikasi lintas surface.
6. Jangan menaruh secret atau credential di frontend.
7. Untuk API baru, tambahkan route terpisah dan pindahkan logic reusable ke
   `artifacts/api-server/src/lib`.
8. Setelah perubahan, jalankan test, typecheck, build, dan `git diff --check`.
