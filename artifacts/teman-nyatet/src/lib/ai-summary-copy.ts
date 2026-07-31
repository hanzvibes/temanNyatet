export const AI_SUMMARY_COPY = {
  title: 'Ringkasan AI',
  sharedDescription:
    'Ringkasan catatan dan ringkasan transaksi keuangan menggunakan saldo AI Credit yang sama.',
  creditDescription: '1 credit untuk 1 ringkasan yang berhasil dibuat.',
  financial: {
    title: 'Ringkasan transaksi keuangan',
    description:
      'Buat ringkasan pemasukan dan pengeluaran berdasarkan data transaksi yang sudah kamu catat.',
    periods: 'Minggu Ini, Bulan Ini, dan Custom Range',
    unsupportedPeriod: 'Filter Hari Ini tetap tersedia untuk daftar transaksi, tetapi tidak mengaktifkan Ringkasan AI.',
    details: 'Hasilnya mencakup pemasukan, pengeluaran, top 3 kategori, perbandingan periode, dan insight.',
    privacy:
      'Untuk menjaga privasi, backend hanya mengirim data agregat ke provider AI. Transaksi mentah dan catatan transaksi tidak dikirim.',
  },
  notes: {
    title: 'Ringkasan catatan',
    description: 'Bantu menemukan inti dari catatan panjang dengan satu credit per ringkasan.',
  },
  disclaimer: 'Ringkasan AI adalah alat bantu pengorganisasian, bukan nasihat keuangan.',
  privacyParagraph:
    'Jika kamu meminta Ringkasan AI transaksi keuangan, TemanNyatet mengagregasikan data di backend terlebih dahulu. Provider AI hanya menerima total, kategori teratas, perbandingan, dan data agregat lain yang diperlukan; transaksi mentah dan catatan transaksi tidak dikirim.',
  termsParagraph:
    'AI Credit dapat digunakan untuk Ringkasan catatan dan Ringkasan transaksi keuangan. Setiap ringkasan yang berhasil dibuat menggunakan 1 credit. Ringkasan transaksi keuangan hanya merupakan alat bantu pengorganisasian dan bukan nasihat keuangan.',
} as const;