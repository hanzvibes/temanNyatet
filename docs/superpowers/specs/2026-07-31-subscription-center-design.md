# Subscription Center — Hybrid Design

## Goal

Mengembangkan area “Kelola Langganan” menjadi pusat informasi subscription yang
lengkap, profesional, dan tetap terasa ringan seperti aplikasi mobile premium.
Ringkasan tetap tersedia di `SettingsSheet`, sementara detail lengkap tersedia di
halaman penuh `/subscription`.

## User experience

### SettingsSheet summary

Area subscription yang sudah ada menjadi entry point cepat dengan:

- Badge status: Aktif, Belum berlangganan, atau Berakhir.
- Nama paket dan tanggal berakhir bila tersedia.
- Saldo Credit AI.
- Tombol `Kelola Selengkapnya` menuju `/subscription`.
- Tombol `Perpanjang Langganan` atau `Pilih Paket`.
- Tombol `Beli Credit AI`.

Ringkasan tidak menampilkan riwayat panjang agar sheet tetap mudah dipindai.

### Full subscription page

Route baru `/subscription` menggunakan layout responsif dengan max-width yang
lega di desktop dan padding aman di mobile:

1. Header dengan tombol kembali dan judul `Kelola Langganan`.
2. Hero status subscription:
   - icon subscription
   - badge status
   - nama paket
   - tanggal mulai dan berakhir
   - metode pembayaran
3. Feature card untuk benefit subscription:
   - catatan tanpa batas
   - akses Ringkas AI
   - Google Sheets pribadi
   - sinkronisasi data
4. Quick actions:
   - perpanjang langganan
   - kelola paket
   - beli Credit AI
   - lihat penggunaan Credit AI
5. `Subscription History`:
   - tanggal transaksi
   - paket
   - nominal
   - status pembayaran
   - invoice/receipt bila tersedia
   - tombol `Lihat Detail`
6. Modal detail transaksi:
   - order ID
   - payment ID SumoPod
   - waktu dibuat
   - waktu selesai
   - nominal dan status
   - payment link atau receipt bila tersedia
7. Empty state untuk user tanpa riwayat:
   - icon/illustration ringan
   - penjelasan singkat
   - CTA `Pilih Paket`
8. FAQ subscription dalam accordion.

### Credit AI usage

Halaman menampilkan saldo Credit AI dan ringkasan penggunaan dari ledger:

- saldo saat ini
- total credit yang dibeli/ditambahkan
- total credit yang digunakan
- CTA `Beli Credit AI`

Detail ledger yang sudah tersedia tetap dapat dibuka melalui area top-up yang
ada.

## Data architecture

Tambahkan endpoint server-side:

```text
GET /api/subscription/overview
GET /api/subscription/history
```

Endpoint hanya mengambil data milik user terautentikasi dan menggabungkan:

- `profiles` untuk status, paket, dan tanggal subscription
- `payment_orders` untuk riwayat subscription
- `credit_ledger` dan `user_credits` untuk saldo/penggunaan Credit AI

Frontend tidak membaca `payment_orders` secara langsung. Semua metadata provider
tetap diproses oleh API server. Status subscription tetap hanya dapat diubah
oleh webhook pembayaran tervalidasi.

Model saat ini menyimpan payment link, tetapi belum memiliki kolom receipt
terpisah. UI menampilkan receipt/payment link hanya bila tersedia; bila tidak,
tampilkan `Receipt belum tersedia` tanpa membuat URL palsu.

## Visual system

- Gunakan token desain existing untuk warna, radius, spacing, typography, dan
  elevation.
- Gunakan card dengan elevasi ringan, bukan panel bertumpuk berlebihan.
- Status aktif memakai accent hijau, pending memakai accent kuning, dan
  archived/failed memakai destructive lembut.
- Gunakan icon Lucide dengan ukuran dan stroke yang konsisten.
- Gunakan animasi transform/opacity ringan untuk hero, card, accordion, dan
  modal.
- Pastikan focus-visible state, ukuran tap target, kontras, dan reduced-motion
  tetap terjaga.

## Error and empty states

- Loading state memakai skeleton/card placeholder.
- Error overview/history menampilkan pesan yang dapat dicoba ulang.
- Riwayat kosong bukan error; tampilkan empty state dan CTA upgrade.
- Receipt yang belum tersedia tidak dianggap error.
- Link payment yang sudah kedaluwarsa tidak dibuka sebagai checkout aktif.

## Verification

- Typecheck workspace.
- Build frontend dan API.
- Smoke test endpoint overview/history tanpa token menghasilkan `401`.
- Smoke test halaman `/subscription` pada viewport desktop dan mobile.
- Pastikan user pending tetap melihat CTA upgrade dan tidak mendapat badge aktif.
- Pastikan user active melihat paket, tanggal berakhir, fitur, dan riwayat.
- Pastikan modal detail dapat dibuka/ditutup dengan keyboard dan tombol close.