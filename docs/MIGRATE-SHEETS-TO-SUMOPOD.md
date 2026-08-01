# Migrasi Google Sheets ke PostgreSQL SumoPod

Migrasi ini bersifat **import-only**. Data Google Sheets tidak dihapus, diubah, atau diarsipkan.

## Prasyarat

- `DATABASE_URL` sudah tersedia melalui Secrets.
- Schema PostgreSQL sudah diterapkan:

```bash
pnpm --filter @workspace/db exec drizzle-kit migrate --config ./drizzle.config.ts
```

- User yang dipilih sudah login dan memiliki `google_refresh_token` serta `spreadsheet_id` di Supabase.
- Jangan menaruh token atau connection string di command yang akan disimpan ke shell history.

## Migrasi satu user

Jalankan dengan `MIGRATION_USER_ID` dan `MIGRATION_SPREADSHEET_ID` sebagai environment variable sementara:

```bash
MIGRATION_USER_ID=<supabase-user-id> \
MIGRATION_SPREADSHEET_ID=<spreadsheet-id> \
pnpm --filter @workspace/api-server exec tsx scripts/migrate-sheets-to-postgres.ts
```

Runner memeriksa bahwa spreadsheet ID cocok dengan profile user, lalu mencetak jumlah `imported`, `skipped`, `invalid`, dan detail error baris. Rerun aman karena setiap row di-upsert berdasarkan `id`.

## Migrasi semua user yang sudah terhubung

Untuk memproses semua profile yang memiliki `spreadsheet_id` dan
`google_refresh_token`, jalankan runner batch:

```bash
pnpm --filter @workspace/api-server exec tsx scripts/migrate-all-sheets-to-postgres.ts
```

Runner memproses user satu per satu. Kegagalan satu user tidak menghentikan
user berikutnya. Exit code `2` berarti ada user yang gagal dan user tersebut
tidak boleh dimasukkan ke allowlist PostgreSQL.

## Status pilot saat ini

Schema PostgreSQL sudah diterapkan. Dari 10 user yang memiliki Google Sheets
terhubung, 9 berhasil diimpor dan allowlisted untuk PostgreSQL. Satu user gagal
karena Google mengembalikan `invalid_grant`; user tersebut tetap memakai Sheets
dan tidak boleh dimasukkan ke allowlist sampai reconnect berhasil.

## Rollout mode aplikasi

Mode default tetap `sheets`. Setelah pilot diverifikasi:

```text
APP_DATA_STORE=postgres
```

Untuk rollout bertahap, isi allowlist user:

```text
APP_DATA_POSTGRES_USER_IDS=<supabase-user-id-1>,<supabase-user-id-2>
```

Jika allowlist tidak kosong, hanya user yang tercantum yang memakai PostgreSQL. User lain tetap memakai Google Sheets.

Saat mode PostgreSQL aktif:

- notes, transactions, todos, links, reorder notes, dan transaction-summary generator membaca PostgreSQL;
- Supabase tetap digunakan untuk auth, profile, subscription, payment metadata, dan AI credits;
- Google Sheets tidak dipanggil pada request CRUD normal;
- Google Sheets belum menjadi mirror otomatis pada fase ini; implementasi
  `sync_outbox` worker masih menjadi pekerjaan lanjutan.

Rollback aman dengan mengembalikan:

```text
APP_DATA_STORE=sheets
```

Jangan mengaktifkan PostgreSQL-primary sebelum data user yang akan dipakai sudah dimigrasikan. Database PostgreSQL kosong tidak boleh dijadikan mode utama karena akan terlihat seperti data user hilang.