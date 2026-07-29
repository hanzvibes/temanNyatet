# Desain Sistem Warna Catatan

## Tujuan

Menyelaraskan warna kartu pada grid Catatan dan seluruh color picker dengan
color scheme TemanNyatet yang sudah ada. Warna harus terasa lembut, mudah
dibaca, tidak bertabrakan dengan warna modul lain, dan tetap konsisten pada
light maupun dark mode.

## Arah Visual

Gunakan palet pastel desaturated yang diturunkan dari token UI aplikasi:

- sage/primary sebagai warna netral utama,
- finance yellow sebagai aksen hangat,
- todo blue sebagai aksen dingin,
- linksaver coral sebagai aksen hangat sekunder,
- neutral surface sebagai opsi paling tenang.

Setiap warna memiliki pasangan semantic untuk latar kartu, teks, dan border
agar grid tidak bergantung pada warna mentah yang terlalu kontras.

## Perubahan yang Direncanakan

1. Jadikan `src/lib/noteColors.ts` sebagai sumber tunggal palet.
2. Simpan nilai lama yang sudah tersimpan tetap kompatibel melalui fallback
   warna, sehingga catatan lama tidak kehilangan warna atau menjadi tidak
   terbaca.
3. Gunakan metadata palet yang sama pada:
   - kartu/grid Catatan,
   - picker pada form Catatan,
   - picker pada BottomSheetNav.
4. Beri state terpilih pada picker dengan outline yang mengikuti foreground
   UI, bukan ring warna baru yang kontras.
5. Pastikan teks kartu tetap memakai foreground semantic yang terbaca di atas
   setiap pastel, termasuk saat dark mode aktif.

## Batasan

- Tidak mengubah model data atau format penyimpanan warna.
- Tidak mengubah fungsi create, edit, delete, drag-and-drop, atau picker.
- Tidak menambahkan warna neon, gradient, atau warna primer yang terlalu pekat.
- Jumlah opsi boleh bertambah hanya jika tetap menjaga picker ringkas dan
  konsisten.

## Verifikasi

- Periksa visual grid Catatan dan kedua picker pada light mode.
- Periksa visual dark mode dan state warna terpilih.
- Jalankan build frontend dan `git diff --check`.
- Pastikan workflow web berjalan tanpa error browser baru.