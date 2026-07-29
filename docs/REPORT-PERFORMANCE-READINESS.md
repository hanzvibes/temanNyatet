# Laporan Kesiapan Production dan Kapasitas TemanNyatet

**Tanggal laporan:** 29 Juli 2026  
**Aplikasi:** TemanNyatet  
**Tujuan laporan:** Menjelaskan kondisi teknis aplikasi, kesiapan menuju production,
dan kemampuan menghadapi sekitar 100 user aktif secara bersamaan.

---

## 1. Ringkasan Eksekutif

TemanNyatet saat ini sudah memiliki fondasi teknis yang cukup baik untuk
staging dan soft launch terbatas. Frontend berhasil dibuat untuk production,
API memiliki autentikasi, rate limiting, security headers, logging, serta
penanganan error untuk Google Sheets.

Namun, aplikasi **belum dapat dinyatakan siap secara terukur untuk menangani
100 user aktif bersamaan** karena load test dengan skenario 100 user belum
dilakukan.

Risiko terbesar bukan berada pada tampilan frontend, melainkan pada arsitektur
penyimpanan data. Operasi utama aplikasi saat ini menggunakan Google Sheets
sebagai backend data. Setiap pembacaan, pembuatan, perubahan, dan penghapusan
data dapat menghasilkan request ke Google Sheets API. Dalam kondisi traffic
bersamaan, pola ini dapat menyebabkan:

- Latensi meningkat.
- Google API rate limit atau quota tercapai.
- Request mengalami retry atau timeout.
- Konflik saat beberapa request menulis spreadsheet yang sama.
- Performa tidak konsisten ketika deployment berjalan pada beberapa instance.

**Kesimpulan utama:** aplikasi dapat dilanjutkan ke tahap staging atau soft
launch dengan monitoring, tetapi perlu load test dan penguatan backend sebelum
peluncuran yang menargetkan 100 user aktif secara bersamaan.

---

## 2. Status Kesiapan Saat Ini

| Area | Status | Catatan |
|---|---|---|
| Frontend production build | Siap | Build Vite berhasil |
| TypeScript validation | Siap | API dan frontend berhasil typecheck |
| Authentication | Cukup siap | Menggunakan Supabase Auth dan verifikasi server |
| API security baseline | Cukup siap | Helmet, CORS, rate limit, dan request size limit tersedia |
| Error handling | Cukup siap | Google API error 403/404 dan retry transient tersedia |
| PWA/service worker | Cukup siap | Asset statis diprecache, API private tidak dicache |
| Monitoring production | Perlu dilengkapi | Logging tersedia, observability performa perlu ditingkatkan |
| Load test 100 user | Belum dilakukan | Belum ada bukti kapasitas p95/p99 dan error rate |
| Concurrent write safety | Risiko | Lock saat ini hanya berlaku dalam satu proses |
| Database scalability | Risiko tinggi | Google Sheets masih menjadi backend data utama |
| Jaminan 100 user aktif | Belum dapat diklaim | Memerlukan pengujian dan optimasi backend |

---

## 3. Validasi yang Sudah Dilakukan

### 3.1 Frontend

- Production build frontend berhasil.
- Route-level lazy loading sudah digunakan.
- Halaman yang tidak aktif tidak dipertahankan sebagai route tree tersembunyi.
- React Query mempertahankan cache data saat navigasi.
- Service worker didaftarkan setelah initial render melalui idle callback.
- Dukungan `prefers-reduced-motion` sudah ditambahkan.
- Beberapa transisi UI sudah dibatasi ke properti yang lebih ringan seperti
  `transform`, `opacity`, border, shadow, dan background.

### 3.2 API

API menggunakan Express dan memiliki beberapa perlindungan dasar:

- Helmet untuk security headers.
- CORS dengan opsi allowlist melalui `ALLOWED_ORIGINS`.
- Global rate limit sebesar 300 request per 15 menit.
- Per-user rate limit untuk operasi data.
- Batas body JSON dan URL-encoded sebesar 256 KB.
- Logging dengan Pino.
- Verifikasi Supabase token di server.
- Validasi email confirmation di server.
- Retry exponential backoff untuk error Google Sheets sementara.
- Penanganan error khusus untuk Google Sheets 403 dan 404.

### 3.3 PWA

Hasil audit service worker menunjukkan:

- Asset JavaScript, CSS, dan HTML hasil build diprecache.
- Navigation fallback tidak berlaku untuk `/api/`.
- Tidak ada cache service worker untuk response private dari API.
- Font publik dapat menggunakan cache-first.
- Service worker tidak menghambat render awal aplikasi.

### 3.4 Hasil build dan validasi

Validasi terakhir:

```text
pnpm run typecheck:libs
pnpm -r --filter "./artifacts/**" --if-present run typecheck
```

Hasil: berhasil untuk API server dan frontend.

```text
pnpm --filter @workspace/teman-nyatet run build
```

Hasil: berhasil.

```text
git diff --check
```

Hasil: bersih.

Catatan: build masih menampilkan warning sourcemap pada komponen sonner, tetapi
warning tersebut tidak menggagalkan build dan tidak berkaitan langsung dengan
kapasitas runtime.

---

## 4. Risiko Kapasitas 100 User Aktif

### 4.1 Google Sheets sebagai database operasional

Data utama Notes, Transactions, Todos, dan Links disimpan pada spreadsheet
privat masing-masing user. Operasi list saat ini membaca baris dari tab lalu
memfilter berdasarkan `user_id`.

Akibatnya, satu aktivitas user dapat menghasilkan beberapa request eksternal.
Ketika banyak user aktif bersamaan, beban tidak hanya ditanggung oleh API
server, tetapi juga oleh:

- Supabase Auth.
- Supabase profile query.
- Google OAuth token/client.
- Google Sheets API.
- Google API quota dan latency.

### 4.2 Lock belum bersifat distributed

Aplikasi memiliki lock per spreadsheet dan tab untuk mencegah operasi tulis
bertabrakan. Namun lock tersebut berada di memory proses Node.js.

Lock ini membantu jika hanya ada satu instance API. Jika deployment menjalankan
beberapa instance atau serverless execution secara paralel, setiap instance
memiliki lock sendiri. Dua instance berbeda masih dapat menulis spreadsheet
yang sama secara bersamaan.

### 4.3 Rate limiter belum terpusat

Rate limiter saat ini menggunakan memory proses. Pada deployment horizontal,
counter rate limit tidak dibagikan antar-instance. Perlindungan tetap berguna
per instance, tetapi belum menjadi batas global yang konsisten.

### 4.4 Operasi reorder relatif mahal

Reorder catatan mengubah posisi beberapa baris. Implementasi saat ini
melakukan update per posisi secara berurutan. Jika banyak catatan diurutkan
ulang, jumlah request Google Sheets dapat meningkat secara linear.

### 4.5 Latensi upstream dapat menumpuk

Google Sheets API menggunakan retry untuk status 429 dan 5xx. Ini baik untuk
error sementara, tetapi ketika upstream sedang padat, retry juga dapat
memperpanjang durasi request dan meningkatkan risiko timeout.

---

## 5. Perkiraan Kondisi Operasional

### Skenario yang kemungkinan masih dapat berjalan

- 100 user terdaftar, tetapi hanya sebagian kecil aktif pada waktu yang sama.
- Aktivitas CRUD ringan.
- Data per spreadsheet masih sedikit.
- Tidak banyak operasi reorder atau delete bersamaan.
- Google API quota masih mencukupi.
- Deployment API memiliki resource dan timeout yang memadai.

### Skenario yang belum dapat dijamin

- 100 user membuka aplikasi dalam waktu yang hampir bersamaan.
- Setiap user membuka beberapa halaman secara bersamaan.
- Banyak user membuat atau mengubah data pada saat yang sama.
- Banyak user melakukan reorder atau delete secara simultan.
- Setiap spreadsheet sudah memiliki banyak baris.
- Deployment berjalan dengan beberapa instance/serverless execution.

---

## 6. Rekomendasi Sebelum Production Launch

### Prioritas 1 — Wajib dilakukan

#### A. Load test 100 user

Siapkan load test dengan minimal skenario berikut:

1. 100 virtual users memakai session/token yang valid.
2. Membuka halaman Catatan.
3. Membuka Keuangan, To-do, dan Link Saver.
4. Membuat data.
5. Mengubah data.
6. Menghapus data.
7. Melakukan reorder catatan.
8. Mengulangi aktivitas selama minimal 10–15 menit.

Metrik yang perlu dicatat:

- Request per second.
- Error rate.
- p50, p95, dan p99 latency.
- Jumlah HTTP 429.
- Jumlah HTTP 5xx.
- Jumlah timeout.
- Jumlah retry Google Sheets.
- Durasi function/serverless.
- Penggunaan CPU dan memory.
- Google API quota consumption.

#### B. Tambahkan monitoring production

Minimal pantau:

- Latency per endpoint.
- Error rate per endpoint.
- Google Sheets 429/5xx.
- Supabase auth errors.
- Serverless cold start.
- Timeout.
- Memory growth.
- Jumlah user aktif.

#### C. Batch update reorder

Ubah reorder agar beberapa perubahan posisi dikirim dalam satu operasi batch,
bukan satu request per posisi.

### Prioritas 2 — Sangat disarankan

#### A. Cache koneksi dan metadata dengan strategi yang jelas

Pertahankan cache koneksi Google secara aman dengan TTL dan invalidasi yang
jelas. Hindari pembuatan client dan query profile berulang yang tidak perlu.

#### B. Kurangi full-sheet scan

Evaluasi cara membaca data agar tidak selalu membaca seluruh tab. Jika jumlah
data meningkat, full-sheet scan akan menjadi semakin mahal.

#### C. Gunakan rate limit terpusat

Jika deployment memakai lebih dari satu instance, pindahkan counter rate
limit ke storage bersama seperti Redis atau layanan equivalent.

#### D. Tambahkan timeout upstream

Setiap request ke Google Sheets dan layanan eksternal perlu memiliki timeout
yang terukur agar request tidak menggantung terlalu lama.

### Prioritas 3 — Rekomendasi arsitektur jangka menengah

Gunakan Supabase/Postgres sebagai database operasional utama untuk:

- Notes.
- Transactions.
- Todos.
- Links.
- Ordering/position.

Google Sheets kemudian digunakan sebagai:

- Export.
- Backup.
- Sinkronisasi opsional.
- Integrasi yang dapat dibuka user di Google Drive.

Keuntungan:

- Query memakai index.
- Concurrent write lebih aman.
- Transaksi database tersedia.
- Latency lebih konsisten.
- Skalabilitas lebih mudah diprediksi.
- Google Sheets tidak menjadi bottleneck di setiap interaksi UI.

---

## 7. Kriteria Go/No-Go

### Go untuk soft launch jika:

- Load test menunjukkan error rate rendah.
- Tidak ada timeout signifikan.
- p95 latency masih dapat diterima oleh product team.
- Google API quota aman.
- Monitoring dan alert sudah aktif.
- Ada prosedur rollback dan incident response.

### No-Go untuk public launch 100 user aktif jika:

- Load test belum dilakukan.
- HTTP 429 atau 5xx meningkat tajam.
- p95/p99 latency tidak stabil.
- Banyak request timeout.
- Google Sheets quota menjadi bottleneck.
- Terjadi konflik atau kehilangan update saat concurrent write.
- Tidak ada monitoring untuk mendeteksi masalah production.

---

## 8. Kesimpulan dan Keputusan yang Disarankan

TemanNyatet **belum sebaiknya diposisikan sebagai production-ready untuk 100
user aktif bersamaan** sebelum load test dan penguatan backend dilakukan.

Posisi teknis yang disarankan:

> **Ready for staging / controlled soft launch, not yet capacity-certified for
> 100 concurrent active users.**

Langkah berikutnya yang paling tepat:

1. Jalankan load test 100 user.
2. Perbaiki bottleneck berdasarkan hasil pengujian.
3. Ulangi load test setelah optimasi.
4. Aktifkan monitoring production.
5. Putuskan go/no-go berdasarkan metrik, bukan asumsi.

Laporan ini membedakan antara:

- **Kesiapan kode dan build**, yang saat ini cukup baik.
- **Kesiapan kapasitas operasional**, yang masih memerlukan bukti load test.
