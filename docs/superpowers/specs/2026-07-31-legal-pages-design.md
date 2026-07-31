# TemanNyatet Legal Pages Design

**Tanggal:** 31 Juli 2026  
**Status:** Disetujui untuk ditinjau sebelum implementasi

## Tujuan

Menyediakan Privacy Policy dan Terms of Service publik yang dapat dibuka tanpa
login, mudah ditemukan dari halaman login, dan menjelaskan secara spesifik
cara TemanNyatet menangani akun, data aplikasi, integrasi Google Sheets/Drive,
serta kontak pengelola. Halaman ini ditujukan untuk membantu peninjauan Google
OAuth dengan informasi yang transparan dan mudah diverifikasi.

Kontak resmi yang dicantumkan:
`rhn.rmdhniii@gmail.com`

Dokumen ini bersifat informasi produk dan bukan pengganti nasihat hukum
profesional.

## Ruang Lingkup

### Route publik

- `/privacy-policy`
- `/terms-of-service`

Kedua route harus dapat diakses ketika pengguna belum login. Auth guard tidak
boleh mengarahkan pengguna dari route tersebut ke `/login`.

### Navigasi

- Halaman login memiliki link yang jelas ke Privacy Policy dan Terms of Service.
- Privacy Policy memiliki link ke Terms of Service.
- Terms of Service memiliki link ke Privacy Policy.
- Kedua halaman memiliki tombol atau link kembali ke login.
- Email kontak ditampilkan sebagai link `mailto:`.

### Presentasi visual

Kedua halaman menggunakan pola visual TemanNyatet yang sudah ada:

- warna dan tipografi berbasis token aplikasi;
- layout responsif dengan lebar baca yang nyaman;
- logo/wordmark TemanNyatet;
- judul halaman, tanggal pembaruan, daftar isi ringkas, dan heading section;
- dukungan light/dark mode;
- fokus keyboard yang terlihat dan ukuran target interaksi yang nyaman di
  perangkat mobile.

## Isi Privacy Policy

Privacy Policy harus mencakup section berikut:

1. **Ringkasan dan tanggal berlaku** — identitas TemanNyatet serta tanggal
   pembaruan.
2. **Data yang dikumpulkan** — email akun, data profil yang diberikan, serta
   data yang pengguna simpan melalui catatan, keuangan, tugas, dan tautan.
3. **Cara data digunakan** — autentikasi, penyediaan fitur, sinkronisasi,
   dukungan, keamanan, dan peningkatan layanan.
4. **Google Sheets dan Google Drive** — pengguna menghubungkan akun Google
   sendiri; aplikasi dapat membuat atau menggunakan spreadsheet milik pengguna
   dan hanya meminta akses yang diperlukan untuk fungsi tersebut.
5. **Penggunaan data Google API** — data Google digunakan hanya untuk
   menyediakan fitur aplikasi, tidak dijual atau digunakan untuk iklan yang
   ditargetkan, dan tidak dialihkan ke pihak lain kecuali untuk operasi
   layanan atau kewajiban hukum.
6. **Penyedia layanan** — autentikasi, hosting, penyimpanan/sinkronisasi, dan
   pembayaran bila fitur tersebut digunakan.
7. **Keamanan dan retensi** — langkah perlindungan yang wajar, batasan
   keamanan, serta penyimpanan selama akun atau kebutuhan layanan masih ada.
8. **Hak dan pilihan pengguna** — akses, koreksi, pemutusan Google, penghapusan
   akun/data, serta cara meminta bantuan.
9. **Privasi anak** — layanan tidak ditujukan untuk anak di bawah usia minimum
   yang berlaku.
10. **Perubahan kebijakan** — cara perubahan diberitahukan.
11. **Kontak** — `rhn.rmdhniii@gmail.com`.

Bahasa harus menghindari klaim absolut seperti “data selalu 100% aman” dan
harus membedakan data yang disimpan di layanan TemanNyatet dengan data yang
tersimpan di spreadsheet Google milik pengguna.

## Isi Terms of Service

Terms of Service harus mencakup section berikut:

1. **Penerimaan ketentuan** dan tanggal berlaku.
2. **Deskripsi layanan** — TemanNyatet sebagai aplikasi pencatatan pribadi
   dengan fitur notes, keuangan, to-do, link saver, dan integrasi spreadsheet.
3. **Kelayakan dan akun** — informasi akun harus benar, kredensial dijaga oleh
   pengguna, dan pengguna bertanggung jawab atas aktivitas akunnya.
4. **Konten pengguna** — pengguna mempertahankan kepemilikan kontennya dan
   memberi izin terbatas yang diperlukan untuk menjalankan layanan.
5. **Integrasi Google** — akses Google dapat diputus, perubahan atau gangguan
   layanan Google dapat memengaruhi fitur sinkronisasi, dan aplikasi tidak
   mengambil alih kepemilikan spreadsheet pengguna.
6. **Pembayaran atau langganan** — ketentuan biaya, status pembayaran,
   pembatalan, dan kemungkinan perubahan harga bila fitur berbayar aktif.
7. **Penggunaan yang dilarang** — penyalahgunaan, akses tanpa izin, gangguan
   layanan, pelanggaran hukum, dan pengunggahan konten berbahaya.
8. **Ketersediaan dan perubahan layanan** — layanan dapat diperbarui,
   dihentikan sementara, atau diubah dengan pemberitahuan yang wajar.
9. **Penghentian akun** — kondisi penghentian, konsekuensi, dan cara meminta
   penghapusan data.
10. **Disclaimer dan batas tanggung jawab** — layanan diberikan sebagaimana
    tersedia; pengguna tetap bertanggung jawab membuat cadangan data penting.
11. **Perubahan ketentuan, hukum yang berlaku, dan kontak**.

Bahasa harus menjelaskan fungsi produk tanpa menjanjikan bahwa TemanNyatet
adalah layanan nasihat keuangan, penyimpanan arsip tanpa batas, atau layanan
Google resmi.

## Arsitektur dan Data Flow

- Tambahkan dua komponen halaman legal terpisah agar konten dan route mudah
  dipelihara.
- Daftarkan keduanya sebagai lazy-loaded route di `App.tsx`.
- Tambahkan route legal ke daftar route publik AuthGuard.
- Tautan dari `AuthPage.tsx` menggunakan navigasi client-side yang sesuai
  dengan router yang sudah dipakai aplikasi.
- Tidak ada perubahan database, API, OAuth scope, atau secret.
- Tidak ada data pengguna yang dimuat untuk merender halaman legal.

## Error Handling dan Aksesibilitas

- Route legal harus tetap merender ketika Supabase sedang loading atau tidak
  tersedia karena halaman tidak memerlukan sesi.
- Heading menggunakan urutan semantik (`h1`, `h2`) dan section memiliki anchor
  yang stabil.
- Link email menggunakan `mailto:rhn.rmdhniii@gmail.com`.
- Kontras teks mengikuti token tema yang ada.
- Layout tidak mengandalkan hover dan dapat dibaca pada layar mobile.

## Verifikasi

1. Jalankan typecheck frontend.
2. Jalankan build frontend.
3. Restart workflow web dan periksa log startup.
4. Buka `/privacy-policy` dan `/terms-of-service` tanpa sesi login.
5. Pastikan link dari login, link silang, link email, dan tombol kembali bekerja.
6. Pastikan route legal tidak terkena redirect AuthGuard.
7. Periksa tampilan light/dark dan viewport mobile melalui preview.

## Keputusan

Pendekatan halaman legal publik di dalam aplikasi dipilih dibandingkan halaman
statis terpisah atau satu halaman gabungan karena paling konsisten dengan
router dan tema aplikasi, tetap mudah dirawat, dan menyediakan URL kebijakan
yang berdiri sendiri untuk proses verifikasi Google.