# Toast Top Notification — Design

## Tujuan

Memindahkan notifikasi toast global TemanNyatet dari bawah layar ke bagian atas-tengah, dengan pola visual seperti notifikasi update. Toast tetap tidak memiliki tombol `X` dan tidak boleh tertutup oleh area status bar, notch, atau header aplikasi.

## Desain

- Posisi desktop: bagian atas-tengah viewport dengan jarak aman dari tepi atas.
- Posisi mobile: tetap atas-tengah, menggunakan `safe-area-inset-top` dan jarak tambahan agar tidak menempel pada status bar/notch.
- Lebar: responsif, memenuhi layar pada mobile dengan margin horizontal, dan tetap ringkas pada desktop.
- Urutan: toast terbaru muncul di bagian teratas daftar.
- Konten dan ikon status yang sudah ada dipertahankan.
- Tombol close tetap dinonaktifkan; toast ditutup otomatis sesuai durasi global.
- Area bawah tidak lagi digunakan untuk menentukan posisi toast, sehingga toast tidak berhubungan dengan bottom navigation.

## Perilaku dan aksesibilitas

- Tetap menggunakan `aria-label` container notifikasi dari Sonner.
- Toast tidak menghalangi interaksi utama lebih lama dari durasi yang sudah ditetapkan.
- Action dan cancel button yang tersedia tetap dapat digunakan.
- Animasi tetap ringan dan mengikuti aturan reduced motion yang sudah berlaku.

## Verifikasi

- Jalankan typecheck dan production build frontend.
- Restart workflow web.
- Periksa preview desktop dan log browser.
- Pastikan tidak ada referensi tombol close toast dan tidak ada error runtime baru.