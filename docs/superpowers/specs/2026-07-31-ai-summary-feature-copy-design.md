# Detail Fitur Ringkasan AI di Semua Halaman

## Tujuan

Memastikan pengguna menemukan penjelasan fitur Ringkasan AI yang sama dan lengkap
di seluruh halaman TemanNyatet, termasuk ringkasan catatan dan ringkasan
transaksi keuangan.

## Isi yang harus konsisten

- Ringkasan catatan dan ringkasan transaksi keuangan menggunakan saldo AI Credit
  yang sama.
- Satu credit digunakan untuk satu ringkasan yang berhasil dibuat.
- Ringkasan transaksi keuangan tersedia untuk Minggu Ini, Bulan Ini, dan Custom
  Range; filter Hari Ini tetap tidak termasuk periode ringkasan.
- Ringkasan transaksi menampilkan pemasukan, pengeluaran, top kategori,
  perbandingan periode, dan insight.
- Backend mengirim data transaksi keuangan ke AI dalam bentuk agregat; transaksi
  mentah dan catatan transaksi tidak dikirim ke provider AI.
- Hasil ringkasan adalah alat bantu pengorganisasian, bukan nasihat keuangan.

## Pendekatan

Simpan detail di satu modul copy bersama dan gunakan komponen presentasi dengan
varian `compact` dan `full`. Halaman Subscription, Top Up, Settings, Catatan,
dan Keuangan memakai komponen tersebut; Privacy dan Terms menambahkan penjelasan
legal yang bersumber dari aturan yang sama.

## Batasan

- Tidak mengubah harga, saldo, endpoint, RPC, atau mekanisme pembayaran.
- Tidak mengirim data finansial ke analytics pihak ketiga.
- Detail copy harus tetap terbaca di desktop dan mobile.