# Inline Alert iOS Card — Design

## Tujuan

Memperbarui inline alert TemanNyatet agar terasa modern, minimal, dan menyerupai pola kartu notifikasi iOS tanpa mengubah perilaku atau logika fitur yang menampilkan alert.

## Cakupan

- Komponen inline alert global yang digunakan untuk pesan status di dalam halaman.
- State `default`, `destructive`, serta status tambahan yang diperlukan untuk pesan sukses, warning, dan info.
- Dukungan light mode dan dark mode.
- Struktur pesan yang sudah memiliki judul, deskripsi, dan action.

Toast global dan dialog konfirmasi tidak termasuk dalam perubahan ini.

## Desain visual

- Kartu menggunakan radius besar sekitar `1rem` dan padding yang lega tetapi tetap ringkas.
- Background status memakai warna lembut dengan opacity rendah:
  - sukses: hijau lembut
  - error: merah lembut
  - warning: amber lembut
  - info/default: warna aksen primer yang lembut
- Border tipis menggunakan warna status dengan opacity rendah.
- Shadow sangat ringan atau menggunakan elevation token yang sudah tersedia.
- Ikon status berada di sisi kiri dalam ruang tetap, sejajar dengan konten utama.
- Judul memiliki weight medium/semibold; deskripsi menggunakan warna muted dengan line-height nyaman.
- Layout tetap responsif ketika deskripsi atau action membungkus ke beberapa baris.

## Perilaku

- `role="alert"` tetap dipertahankan agar screen reader menerima perubahan penting.
- Judul, deskripsi, action, dan event handler yang sudah ada tidak diubah.
- Alert tetap berada di dalam alur layout halaman dan tidak menjadi toast atau overlay.
- Animasi dibatasi pada opacity/translate ringan jika komponen saat ini mendukung transisi.
- Aturan `prefers-reduced-motion` yang sudah ada tetap berlaku.

## Implementasi

- Memperbarui primitive `Alert` dan variant class-nya agar menjadi sumber gaya tunggal.
- Menambahkan variant status hanya jika dibutuhkan oleh pemakaian aktif; tidak melakukan migrasi massal pada komponen yang tidak menggunakan alert.
- Menggunakan token tema yang sudah ada untuk warna dan elevation agar light/dark mode konsisten.
- Tidak menghapus atau mengubah komponen toast, alert dialog, atau field error.

## Verifikasi

- Cari seluruh penggunaan `Alert` aktif dan pastikan class/variant tetap kompatibel.
- Jalankan typecheck dan production build frontend.
- Restart workflow web.
- Periksa preview pada desktop dan mobile.
- Pastikan tidak ada error browser dan `role="alert"` tetap tersedia.