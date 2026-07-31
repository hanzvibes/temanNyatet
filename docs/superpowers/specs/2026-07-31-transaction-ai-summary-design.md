# AI Transaction Summary — Design Specification

## Goal

Menambahkan fitur “Ringkas dengan AI” pada modul Riwayat Transaksi Keuangan
dengan memakai infrastruktur AI provider dan CreditService yang sudah ada.
Pengguna dapat memilih periode, memperoleh ringkasan berbasis data transaksi
yang spesifik, dan melihat kembali hasil ringkasan terakhir tanpa membayar credit
ulang setiap kali halaman dibuka.

## Scope

### Included

- Periode `Minggu Ini`, `Bulan Ini`, dan `Custom Range`.
- Perbandingan dengan periode sebelumnya yang memiliki durasi sama.
- Tombol `Ringkas dengan AI` di atas daftar transaksi.
- Ringkasan tampil sebagai card inline di atas daftar transaksi.
- Collapse dengan aksi `Sembunyikan` dan expand kembali.
- Generate ulang dengan warning bahwa 1 credit akan dikonsumsi lagi.
- Cache server di Supabase dan cache memory/browser untuk tampilan cepat.
- Aggregation transaksi di backend sebelum request ke AI.
- Endpoint transaksi terpisah dari endpoint ringkasan catatan.
- Audit konsumsi melalui ledger CreditService existing.

### Not included

- Saran investasi, budgeting generik, atau nasihat finansial umum.
- Penyimpanan raw transaction list dalam cache ringkasan atau prompt.
- Dashboard analitik jangka panjang atau histori seluruh ringkasan.
- Perubahan sistem payment/top-up credit.
- Pengiriman data transaksi atau ringkasan finansial ke analytics pihak ketiga.

## User flow

1. Pengguna membuka halaman `Keuangan`.
2. Pengguna memilih periode:
   - `Minggu Ini`: Senin sampai Minggu pada minggu kalender saat ini.
   - `Bulan Ini`: tanggal pertama sampai tanggal terakhir bulan kalender saat ini.
   - `Custom Range`: tanggal mulai dan tanggal akhir yang dipilih pengguna,
     inclusive.
3. Sistem mencoba memuat cache untuk kombinasi user, tipe periode, dan tanggal
   periode.
4. Jika cache tersedia, card ringkasan terakhir tampil di atas daftar transaksi
   dan tidak mengurangi credit.
5. Jika belum ada cache, card menampilkan CTA `Ringkas dengan AI`.
6. Saat generate pertama kali, sistem memeriksa saldo credit lalu memproses
   agregasi dan AI.
7. Setelah AI menghasilkan output valid, sistem mengonsumsi tepat 1 credit
   dengan CreditService existing, menyimpan ringkasan, dan mengembalikan saldo
   terbaru.
8. Saat pengguna memilih `Generate ulang`, UI menampilkan konfirmasi:
   “Generate ulang akan menggunakan 1 credit lagi. Lanjutkan?”
9. Jika dikonfirmasi, proses generate berjalan ulang dan menggantikan cache untuk
   kombinasi periode yang sama.
10. Ringkasan dapat di-collapse tanpa menghapus cache.

## Period comparison

Periode pembanding selalu memiliki durasi kalender yang sama dengan periode
terpilih dan berakhir tepat sebelum periode utama:

- `Minggu Ini`: Senin–Minggu sebelumnya.
- `Bulan Ini`: bulan kalender sebelumnya dengan batas tanggal kalender penuh.
- `Custom Range`: tanggal mulai pembanding = tanggal mulai utama dikurangi
  durasi hari; tanggal akhir pembanding = sehari sebelum tanggal mulai utama.

Perbandingan dihitung per metrik:

```text
changePercent = ((current - previous) / previous) * 100
```

Jika nilai periode sebelumnya adalah `0`, perubahan dikembalikan sebagai `null`
dan UI menampilkan `Belum ada pembanding`, bukan persentase tak terhingga.

## Backend architecture

### Aggregation service

Tambahkan service khusus yang:

- Memvalidasi `period_type`, tanggal, dan maksimum rentang custom.
- Mengambil transaksi hanya dari `req.spreadsheetId`, `req.userId`, dan
  `req.sheetsClient` milik user terautentikasi.
- Menormalisasi tanggal, tipe, nominal, dan kategori yang berasal dari Google
  Sheets.
- Menghitung agregasi periode utama dan pembanding:
  - total pemasukan
  - total pengeluaran
  - jumlah transaksi
  - total per kategori pengeluaran
  - top 3 kategori pengeluaran
  - perubahan persentase pemasukan dan pengeluaran
- Tidak mengirim raw transaction rows ke provider AI.
- Tidak menulis data finansial mentah ke log.

Payload ringkas yang boleh dikirim ke AI hanya berisi angka agregat dan nama
kategori yang diperlukan untuk menghasilkan insight spesifik.

### AI summary service

Tambahkan prompt/service transaksi yang terpisah dari route catatan. Provider
tetap memakai konfigurasi SumoPod/OpenAI-compatible existing:

- `OPENAI_API_KEY` hanya di server.
- `OPENAI_BASE_URL` dan `OPENAI_MODEL` existing.
- Timeout dan penanganan provider error mengikuti pola summarization catatan.

Prompt harus menginstruksikan AI untuk:

- Menulis dalam bahasa Indonesia.
- Hanya memakai data agregat yang diberikan.
- Menghasilkan insight spesifik terhadap kategori dan perubahan yang terlihat.
- Tidak mengarang transaksi, nominal, kategori, atau penyebab.
- Tidak memberi nasihat finansial generik.
- Mengembalikan JSON terstruktur tanpa markdown.

### Credit boundary

Generate transaksi memakai `consumeCredit(userId, 'ai_transaction_summary')`.
Credit hanya dipotong setelah provider mengembalikan JSON yang valid dan lolos
validasi backend. Kegagalan provider, timeout, output kosong, atau JSON invalid
tidak mengonsumsi credit.

Balance dan ledger tetap memakai CreditService/RPC existing. Tidak boleh dibuat
sistem saldo atau ledger baru.

## API contract

### Read cached summary

```text
GET /api/transactions/summary
```

Query:

```text
period_type=week|month|custom
start_date=YYYY-MM-DD
end_date=YYYY-MM-DD
```

Response cache hit:

```json
{
  "data": {
    "cached": true,
    "summary": {
      "id": "uuid",
      "period_type": "month",
      "period_start": "2026-07-01",
      "period_end": "2026-07-31",
      "comparison_start": "2026-06-01",
      "comparison_end": "2026-06-30",
      "headline": "Pengeluaran bulan ini lebih tinggi...",
      "totals": {
        "income": 12000000,
        "expense": 4800000
      },
      "top_expense_categories": [
        {
          "category": "Makanan",
          "amount": 1800000,
          "percentage": 37.5
        }
      ],
      "comparison": {
        "income_change_percent": 8.2,
        "expense_change_percent": 30,
        "direction": "up"
      },
      "insights": [
        "Pengeluaran makanan naik 30% dibanding periode sebelumnya, terutama dari kategori Makanan."
      ],
      "created_at": "2026-07-31T12:00:00.000Z",
      "updated_at": "2026-07-31T12:00:00.000Z"
    }
  }
}
```

Cache miss mengembalikan `200` dengan `data.cached = false` dan `summary = null`.
Read endpoint tidak mengonsumsi credit.

### Generate summary

```text
POST /api/transactions/summary/generate
```

Body:

```json
{
  "period_type": "custom",
  "start_date": "2026-07-01",
  "end_date": "2026-07-15"
}
```

Response:

```json
{
  "data": {
    "summary": {},
    "balance": 9
  }
}
```

`summary` mengikuti struktur response cache. `balance` adalah saldo terbaru
setelah konsumsi credit.

Status error:

- `400`: periode/tanggal invalid atau custom range melewati batas maksimum.
- `402`: `CREDITS_EXHAUSTED`.
- `428/503`: koneksi Google Sheets user tidak tersedia.
- `502`: provider AI gagal atau output tidak valid.
- `504`: provider timeout.

Semua endpoint wajib memakai `requireAuth` dan `userRateLimit`.

## Cache schema

Migration baru membuat tabel `transaction_summary_cache` dengan kolom:

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
- `period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month', 'custom'))`
- `period_start DATE NOT NULL`
- `period_end DATE NOT NULL`
- `comparison_start DATE NOT NULL`
- `comparison_end DATE NOT NULL`
- `headline TEXT NOT NULL`
- `totals JSONB NOT NULL`
- `top_expense_categories JSONB NOT NULL`
- `comparison JSONB NOT NULL`
- `insights JSONB NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Unique constraint:

```text
(user_id, period_type, period_start, period_end)
```

RLS:

- User authenticated hanya dapat membaca row miliknya.
- Write/update cache dilakukan API server melalui service role.
- Tidak ada endpoint client-side yang menerima `user_id`.

Cache server menyimpan satu hasil terakhir untuk setiap kombinasi periode.
Browser/memory cache hanya berupa optimasi tampilan dan tidak menjadi source of
truth.

## Frontend design

### Period controls

Pertahankan filter `Minggu Ini` dan `Bulan Ini`, lalu tambahkan `Custom Range`.
Custom Range membuka kontrol tanggal inline atau popover dengan:

- tanggal mulai
- tanggal akhir
- aksi `Terapkan`
- validasi tanggal akhir tidak boleh sebelum tanggal mulai

Perubahan periode mengganti cache key, memperbarui daftar transaksi, dan
memuat ringkasan cache untuk periode baru.

### Summary card

Card ditempatkan di atas heading/list `Riwayat Transaksi`, bukan modal. Struktur:

- eyebrow `Ringkasan AI`
- label periode
- headline
- total pemasukan dan pengeluaran
- top 3 kategori pengeluaran dengan nominal dan persentase
- perubahan periode sebelumnya dengan indikator naik/turun
- 1–2 insight natural language
- aksi `Sembunyikan`/`Tampilkan`
- aksi `Generate ulang`
- saldo credit saat ini bila hasil baru saja dibuat

State:

- Loading: skeleton card.
- Cache miss: intro singkat dan CTA `Ringkas dengan AI`.
- Empty period: jelaskan bahwa belum ada transaksi pada periode tersebut dan
  jangan memaksa AI menghasilkan insight fiktif.
- Error: pesan singkat dan retry.
- Credit habis: arahkan ke flow Top Up AI Credit existing.

### Confirmation

Generate ulang wajib memakai confirmation dialog sebelum request. Generate
pertama kali tidak perlu confirmation tambahan karena CTA sudah menjelaskan
konsumsi 1 credit.

## Privacy and logging

- Jangan mencatat raw transaction rows, notes transaksi, nominal per transaksi,
  atau kategori lengkap ke Pino logs.
- Provider error logs hanya boleh berisi HTTP status, provider host, model, dan
  correlation/request ID tanpa payload.
- Jangan mengirim transaction summary ke browser analytics atau third-party
  tracking.
- Provider request hanya dilakukan server-side.
- Cache response hanya dikembalikan setelah user terautentikasi dan ownership
  key tervalidasi.

## Verification criteria

- User dapat memilih Minggu Ini, Bulan Ini, dan Custom Range.
- Perbandingan memakai periode sebelumnya dengan durasi sama.
- Cache hit tidak mengurangi credit.
- Generate valid memotong tepat 1 credit dan mencatat reason
  `ai_transaction_summary`.
- Provider gagal/timeout/output invalid tidak mengurangi credit.
- Generate ulang selalu meminta konfirmasi dan memotong credit lagi hanya jika
  pengguna melanjutkan.
- Backend hanya mengirim agregasi, bukan raw transactions, ke AI.
- Ringkasan tampil inline di atas list dan dapat collapse/expand.
- Cache terisolasi per user dan periode.
- Empty period tidak menghasilkan insight fiktif.
- Endpoint tanpa token mengembalikan `401`.
- Typecheck, build API/frontend, dan smoke test endpoint berhasil.