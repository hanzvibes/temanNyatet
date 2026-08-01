# TemanNyatet: SumoPod PostgreSQL sebagai Sumber Data Utama

## Status

Disetujui secara konseptual oleh pengguna pada 1 Agustus 2026. Implementasi dimulai setelah dokumen ini ditinjau.

## Tujuan

Memindahkan data aplikasi utama TemanNyatet dari Google Sheets ke PostgreSQL milik SumoPod agar operasi baca/tulis lebih cepat, konsisten, dan siap untuk pertumbuhan pengguna, sambil mempertahankan Google Sheets sebagai mirror/export dan jalur migrasi yang aman.

## Batasan

- Tidak menghapus atau menimpa data Google Sheets selama migrasi.
- Tidak mengganti Supabase Auth pada tahap ini.
- Supabase tetap menjadi tempat untuk auth, `profiles`, subscription, payment metadata, dan kredit AI.
- PostgreSQL SumoPod menjadi sumber utama untuk notes, transactions, todos, dan links.
- Perubahan dilakukan bertahap agar aplikasi tetap dapat berjalan selama migrasi.

## Arsitektur Target

```text
Frontend
   ↓
API Server
   ├── SumoPod PostgreSQL → sumber data utama aplikasi
   ├── Supabase            → auth, profil, subscription, kredit AI
   └── Google Sheets       → mirror/export dan sumber migrasi
```

API server tetap memvalidasi Supabase access token. `user_id` dari token menjadi batas isolasi data PostgreSQL. Browser tidak pernah menerima credential database.

## Tahapan Implementasi

### 1. Koneksi dan schema PostgreSQL

- Gunakan koneksi PostgreSQL melalui `DATABASE_URL` sebagai Secret.
- Tambahkan tabel `notes`, `transactions`, `todos`, dan `links`.
- Pertahankan ID UUID yang kompatibel dengan data Google Sheets.
- Tambahkan `user_id`, timestamps, dan `deleted_at` bila diperlukan untuk soft delete.
- Tambahkan unique/index yang mendukung isolasi user, sorting, dan query tanggal.
- Tambahkan tabel `sync_outbox` atau status sinkronisasi untuk pekerjaan mirror yang gagal/retry.
- Gunakan Drizzle yang sudah tersedia di `lib/db`; jangan membuat database kedua di Replit.

### 2. Repository dan API

- Buat repository PostgreSQL dengan interface CRUD yang setara dengan operasi `sheet-store`.
- Semua query wajib menyertakan `user_id` atau menggunakan kondisi ownership yang setara.
- Tambahkan pagination untuk endpoint list.
- Ubah endpoint notes, transactions, todos, dan links untuk memakai PostgreSQL.
- Endpoint summary transaksi membaca PostgreSQL dengan agregasi SQL.
- Google Sheets tidak dipanggil pada request normal aplikasi.

### 3. Migrasi data

- Sediakan proses migrasi per spreadsheet/user.
- Baca data dari tab yang ada dan masukkan menggunakan upsert berdasarkan `id` + `user_id`.
- Laporkan baris invalid, duplikat, dan spreadsheet yang tidak dapat diakses.
- Migrasi bersifat idempotent sehingga aman dijalankan ulang.
- Data asli di Google Sheets tidak dihapus atau diubah.

### 4. Mirror Google Sheets

- Setelah write PostgreSQL sukses, aplikasi dapat mencatat pekerjaan mirror secara asynchronous.
- Kegagalan Google API tidak menggagalkan operasi utama pengguna.
- Job mirror memiliki status pending, succeeded, atau failed dan dapat di-retry.
- Tahap awal menggunakan arah satu arah: PostgreSQL → Google Sheets.
- Perubahan manual langsung di Google Sheets tidak otomatis menimpa PostgreSQL.

### 5. Perubahan UX dan rollout

- Google Sheets tidak lagi menjadi syarat untuk menggunakan fitur utama.
- Flow connect Google Drive diposisikan sebagai backup/export atau integrasi opsional.
- Selama rollout, flag konfigurasi dapat mempertahankan mode lama jika diperlukan.
- Setelah verifikasi data, mode PostgreSQL-primary dijadikan default.

## Error Handling dan Konsistensi

- Kegagalan PostgreSQL mengembalikan error eksplisit; tidak ada fallback diam-diam yang dapat menyebabkan dua sumber data berbeda.
- Kegagalan Google Sheets dicatat sebagai kegagalan mirror, bukan sebagai kegagalan write utama.
- Mutasi menggunakan transaksi PostgreSQL bila menyentuh lebih dari satu tabel.
- Unique constraint dan idempotency mencegah duplikasi saat retry.
- Token Google dan credential PostgreSQL tidak pernah dikirim ke frontend atau log.

## Pengujian

- Test repository untuk ownership berdasarkan `user_id`.
- Test create/update/delete dan idempotent upsert.
- Test pagination dan ordering.
- Test agregasi transaksi.
- Test migrasi dengan data kosong, malformed, duplikat, dan rerun.
- Test bahwa kegagalan mirror tidak membatalkan write PostgreSQL.
- Typecheck, build, dan health check workflow.
- Uji manual flow login, create/edit/delete pada empat modul, serta export/mirror setelah koneksi SumoPod tersedia.

## Rollback

- Selama migrasi, implementasi lama Google Sheets tetap tersedia.
- Feature flag dapat mengembalikan pembacaan API ke Google Sheets jika verifikasi gagal.
- Migrasi tidak melakukan destructive update terhadap spreadsheet.
- Penghapusan kode legacy hanya dilakukan setelah PostgreSQL-primary terverifikasi pada lingkungan target.

## Hal yang Masih Dibutuhkan

- `DATABASE_URL` PostgreSQL SumoPod melalui Replit Secrets.
- Konfirmasi SSL/pooling jika format connection string SumoPod membutuhkannya.
- Keputusan apakah mirror Google Sheets harus otomatis aktif untuk semua user atau hanya berdasarkan opt-in.