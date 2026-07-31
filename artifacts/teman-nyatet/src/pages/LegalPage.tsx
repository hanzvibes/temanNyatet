import { ArrowLeft, BookOpen, Mail, Scale, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { AI_SUMMARY_COPY } from '@/lib/ai-summary-copy';

type PolicyKind = 'privacy' | 'terms';

type PolicySection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type Policy = {
  kind: PolicyKind;
  eyebrow: string;
  title: string;
  intro: string;
  sections: PolicySection[];
};

const CONTACT_EMAIL = 'rhn.rmdhniii@gmail.com';
const LAST_UPDATED = '31 Juli 2026';

const policies: Record<PolicyKind, Policy> = {
  privacy: {
    kind: 'privacy',
    eyebrow: 'Kebijakan privasi',
    title: 'Data kamu tetap milikmu.',
    intro:
      'Kami menjelaskan dengan sederhana data apa yang digunakan TemanNyatet, mengapa data itu diperlukan, dan pilihan yang kamu punya atas data tersebut.',
    sections: [
      {
        id: 'informasi-yang-dikumpulkan',
        title: '1. Informasi yang kami kumpulkan',
        paragraphs: [
          'Saat kamu membuat akun, kami menerima informasi akun seperti alamat email dan data profil yang kamu pilih untuk diberikan. Kami tidak meminta password Google kamu dan tidak dapat melihatnya.',
          'Saat kamu menggunakan TemanNyatet, kamu dapat menyimpan catatan, transaksi keuangan, tugas, dan tautan. Isi yang kamu masukkan diproses untuk menampilkan fitur-fitur tersebut dan menyinkronkannya dengan spreadsheet yang kamu hubungkan.',
        ],
      },
      {
        id: 'cara-data-digunakan',
        title: '2. Cara data digunakan',
        paragraphs: [
          'Kami menggunakan data untuk membuat dan mengamankan akun, menyediakan fitur TemanNyatet, menyinkronkan data sesuai permintaanmu, membantu ketika terjadi masalah, mencegah penyalahgunaan, dan menjaga keandalan layanan.',
          AI_SUMMARY_COPY.privacyParagraph,
          'Kami tidak menjual data pribadi atau isi catatan kamu. Kami juga tidak menggunakan data Google untuk iklan yang ditargetkan berdasarkan isi data tersebut.',
        ],
      },
      {
        id: 'google-sheets-drive',
        title: '3. Google Sheets dan Google Drive',
        paragraphs: [
          'TemanNyatet menggunakan akses Google OAuth agar dapat terhubung ke akun Google milikmu. Setelah kamu memberikan izin, aplikasi dapat membuat atau mengelola spreadsheet TemanNyatet di Google Drive milikmu dan membaca atau memperbarui data yang diperlukan untuk menjalankan fitur aplikasi.',
          'Spreadsheet tersebut berada di akun Google kamu. TemanNyatet tidak mengambil alih kepemilikan spreadsheet dan tidak meminta akses ke seluruh file Drive kamu. Akses dibatasi pada izin yang diperlukan untuk membuat atau menggunakan file yang terhubung dengan TemanNyatet.',
          'Kamu dapat memutuskan akses Google kapan saja melalui TemanNyatet atau pengaturan akun Google. Setelah akses diputus, fitur yang memerlukan sinkronisasi spreadsheet mungkin tidak dapat digunakan sampai kamu menghubungkannya kembali.',
        ],
      },
      {
        id: 'penggunaan-data-google',
        title: '4. Penggunaan data dari Google API',
        paragraphs: [
          'Penggunaan informasi yang diterima dari Google API mengikuti Google API Services User Data Policy, termasuk persyaratan Limited Use. Data Google hanya digunakan untuk menyediakan atau meningkatkan fitur TemanNyatet yang kamu minta, seperti sinkronisasi dengan spreadsheet yang terhubung.',
          'Kami tidak menggunakan data Google untuk menampilkan iklan, menjualnya, atau memindahkannya kepada pihak lain untuk tujuan yang tidak berkaitan dengan layanan. Akses dapat diberikan kepada penyedia layanan yang membantu mengoperasikan TemanNyatet hanya sejauh diperlukan, dengan kewajiban menjaga kerahasiaan, atau ketika diwajibkan oleh hukum.',
        ],
      },
      {
        id: 'penyedia-layanan',
        title: '5. Penyedia layanan',
        paragraphs: [
          'Untuk mengoperasikan TemanNyatet, kami dapat menggunakan penyedia layanan untuk autentikasi, hosting, penyimpanan atau sinkronisasi data, keamanan, analitik teknis yang diperlukan, dan pemrosesan pembayaran bila fitur berbayar digunakan. Penyedia tersebut hanya menerima data yang diperlukan untuk tujuan layanan terkait.',
        ],
      },
      {
        id: 'keamanan-retensi',
        title: '6. Keamanan dan penyimpanan',
        paragraphs: [
          'Kami menerapkan perlindungan teknis dan organisasi yang wajar untuk menjaga akun dan data dari akses, perubahan, atau pengungkapan yang tidak sah. Tidak ada layanan internet yang dapat menjamin keamanan absolut, jadi gunakan password yang unik dan jangan membagikan kredensial akun.',
          'Data disimpan selama akun atau fitur terkait masih digunakan, selama diperlukan untuk tujuan yang dijelaskan dalam kebijakan ini, atau selama diwajibkan oleh hukum. Data yang kamu simpan di Google Spreadsheet juga mengikuti penyimpanan dan pengaturan akun Google kamu.',
        ],
      },
      {
        id: 'pilihan-pengguna',
        title: '7. Pilihan dan hak kamu',
        bullets: [
          'Mengakses atau memperbarui informasi akun yang tersedia di TemanNyatet.',
          'Memutuskan koneksi Google dan menghapus spreadsheet atau data di Drive kamu sesuai kontrol yang tersedia di Google.',
          'Meminta penghapusan akun dan data TemanNyatet dengan menghubungi kami melalui email.',
          'Menghubungi kami untuk pertanyaan, koreksi, atau permintaan terkait privasi.',
        ],
        paragraphs: [
          'Permintaan penghapusan dapat memerlukan verifikasi kepemilikan akun. Penghapusan dari TemanNyatet tidak otomatis menghapus file yang sudah berada di Google Drive kamu; file tersebut dapat kamu kelola sendiri dari Google Drive.',
        ],
      },
      {
        id: 'anak-anak',
        title: '8. Privasi anak',
        paragraphs: [
          'TemanNyatet tidak ditujukan untuk anak-anak yang belum memenuhi usia minimum yang berlaku untuk membuat akun secara mandiri. Jika kamu mengetahui bahwa seorang anak memberikan data pribadi tanpa persetujuan yang sesuai, silakan hubungi kami.',
        ],
      },
      {
        id: 'perubahan-kebijakan',
        title: '9. Perubahan kebijakan ini',
        paragraphs: [
          'Kami dapat memperbarui kebijakan ini ketika fitur, praktik, atau kewajiban hukum berubah. Tanggal pembaruan di bagian atas akan ikut berubah. Jika perubahan berdampak penting, kami akan memberikan pemberitahuan yang wajar melalui aplikasi atau email bila memungkinkan.',
        ],
      },
      {
        id: 'kontak-privasi',
        title: '10. Hubungi kami',
        paragraphs: [
          'Untuk pertanyaan atau permintaan privasi, hubungi pengelola TemanNyatet melalui alamat email berikut:',
        ],
      },
    ],
  },
  terms: {
    kind: 'terms',
    eyebrow: 'Ketentuan layanan',
    title: 'Gunakan TemanNyatet dengan nyaman.',
    intro:
      'Ketentuan ini menjelaskan aturan dasar penggunaan TemanNyatet, tanggung jawab kamu, dan batasan layanan agar pengalaman tetap aman dan jelas.',
    sections: [
      {
        id: 'penerimaan',
        title: '1. Penerimaan ketentuan',
        paragraphs: [
          'Dengan membuat akun atau menggunakan TemanNyatet, kamu menyetujui Ketentuan Layanan ini dan Kebijakan Privasi kami. Jika kamu tidak menyetujui ketentuan ini, jangan gunakan layanan.',
        ],
      },
      {
        id: 'deskripsi-layanan',
        title: '2. Tentang TemanNyatet',
        paragraphs: [
          'TemanNyatet adalah aplikasi pencatatan pribadi yang menyediakan fitur catatan, pencatatan keuangan, daftar tugas, penyimpanan tautan, dan sinkronisasi dengan spreadsheet Google yang kamu hubungkan.',
          'TemanNyatet bukan layanan Google resmi dan bukan pengganti nasihat keuangan, akuntansi, hukum, atau profesional lainnya. Informasi keuangan yang kamu catat adalah untuk membantu pengorganisasian pribadi.',
        ],
      },
      {
        id: 'akun-pengguna',
        title: '3. Kelayakan dan akun',
        paragraphs: [
          'Kamu harus dapat membuat perjanjian yang sah menurut hukum yang berlaku untuk menggunakan layanan. Informasi akun yang kamu berikan harus benar dan diperbarui bila berubah.',
          'Kamu bertanggung jawab menjaga kerahasiaan password dan perangkat yang digunakan untuk mengakses akun. Beri tahu kami segera jika mengetahui adanya akses yang tidak sah. Aktivitas yang dilakukan melalui akunmu dapat dianggap sebagai aktivitasmu sampai kami menerima laporan yang memadai.',
        ],
      },
      {
        id: 'konten-pengguna',
        title: '4. Konten yang kamu simpan',
        paragraphs: [
          'Kamu tetap memiliki hak atas catatan, transaksi, tugas, tautan, dan konten lain yang kamu masukkan. Kamu memberi TemanNyatet izin terbatas dan non-eksklusif untuk menyimpan, memproses, menampilkan, dan menyinkronkan konten tersebut hanya sejauh diperlukan untuk menyediakan layanan.',
          'Kamu bertanggung jawab memastikan bahwa konten yang kamu simpan tidak melanggar hukum atau hak pihak lain. Buat cadangan untuk data yang penting bagi kamu karena layanan dan koneksi internet dapat mengalami gangguan.',
        ],
      },
      {
        id: 'integrasi-google',
        title: '5. Integrasi Google',
        paragraphs: [
          'Jika kamu menghubungkan Google, kamu memberi izin kepada TemanNyatet untuk menggunakan akses Google yang kamu setujui guna membuat atau menggunakan spreadsheet dan menyinkronkan data aplikasi. Spreadsheet tetap berada dalam akun Google kamu.',
          'Kamu dapat memutus koneksi kapan saja. Perubahan kebijakan, akses, atau ketersediaan layanan Google dapat memengaruhi sinkronisasi TemanNyatet. TemanNyatet tidak bertanggung jawab atas gangguan yang berasal dari layanan Google di luar kendali kami.',
        ],
      },
      {
        id: 'pembayaran',
        title: '6. Pembayaran dan langganan',
        paragraphs: [
          'Jika TemanNyatet menyediakan fitur berbayar atau langganan, harga, periode, metode pembayaran, dan ketentuan pembatalan akan ditampilkan sebelum pembayaran dilakukan. Kamu mengizinkan penyedia pembayaran yang digunakan untuk memproses transaksi sesuai ketentuannya.',
          AI_SUMMARY_COPY.termsParagraph,
          'Akses fitur berbayar dapat berubah jika pembayaran gagal, langganan dibatalkan, masa berlangganan berakhir, atau terjadi pelanggaran ketentuan. Kami dapat mengubah harga atau paket dengan pemberitahuan yang wajar sebelum perubahan berlaku.',
        ],
      },
      {
        id: 'penggunaan-dilarang',
        title: '7. Penggunaan yang dilarang',
        paragraphs: ['Kamu tidak boleh:'],
        bullets: [
          'Mengakses akun, spreadsheet, atau data milik orang lain tanpa izin.',
          'Menggunakan layanan untuk melanggar hukum, menipu, mengancam, melecehkan, atau merugikan orang lain.',
          'Mencoba mengganggu, memindai, membebani, membalikkan rekayasa, atau melewati pengamanan layanan.',
          'Mengunggah malware atau konten yang dapat merusak layanan maupun perangkat pengguna lain.',
          'Menyalin, menjual, atau mengeksploitasi bagian layanan tanpa izin tertulis.',
        ],
      },
      {
        id: 'ketersediaan-perubahan',
        title: '8. Ketersediaan dan perubahan layanan',
        paragraphs: [
          'Kami berusaha menjaga TemanNyatet tetap tersedia, tetapi layanan dapat mengalami pemeliharaan, gangguan jaringan, kesalahan, atau keterbatasan perangkat. Kami dapat memperbarui, menambah, atau menghapus fitur untuk memperbaiki layanan atau memenuhi kewajiban hukum.',
        ],
      },
      {
        id: 'penghentian',
        title: '9. Penghentian akun',
        paragraphs: [
          'Kamu dapat berhenti menggunakan TemanNyatet dan meminta penghapusan akun dengan menghubungi kami. Kami dapat membatasi atau menghentikan akses jika ada pelanggaran ketentuan, risiko keamanan, kewajiban hukum, atau aktivitas yang dapat merugikan pengguna atau layanan.',
          'Setelah akun dihentikan, hak penggunaan layanan berakhir. Ketentuan yang secara wajar perlu tetap berlaku, termasuk kepemilikan konten, disclaimer, batas tanggung jawab, dan penyelesaian sengketa, tetap berlaku sejauh diizinkan hukum.',
        ],
      },
      {
        id: 'disclaimer-tanggung-jawab',
        title: '10. Disclaimer dan batas tanggung jawab',
        paragraphs: [
          'TemanNyatet disediakan “sebagaimana tersedia” dan tanpa jaminan bahwa layanan selalu bebas gangguan, selalu tersedia, atau cocok untuk setiap kebutuhan. Kamu tetap bertanggung jawab atas keputusan yang dibuat berdasarkan data atau catatanmu dan sebaiknya menyimpan cadangan data penting.',
          'Sejauh diizinkan hukum, TemanNyatet dan pengelolanya tidak bertanggung jawab atas kerugian tidak langsung, kehilangan data akibat faktor di luar kendali kami, atau gangguan dari layanan pihak ketiga. Tidak ada bagian ketentuan ini yang menghapus tanggung jawab yang tidak dapat dikesampingkan menurut hukum yang berlaku.',
        ],
      },
      {
        id: 'perubahan-ketentuan',
        title: '11. Perubahan ketentuan',
        paragraphs: [
          'Kami dapat memperbarui ketentuan ini ketika layanan atau hukum yang berlaku berubah. Perubahan akan dicantumkan di halaman ini dengan tanggal pembaruan yang baru. Dengan terus menggunakan TemanNyatet setelah perubahan berlaku, kamu menyetujui ketentuan yang diperbarui.',
        ],
      },
      {
        id: 'kontak-terms',
        title: '12. Kontak',
        paragraphs: [
          'Jika kamu memiliki pertanyaan tentang ketentuan ini, ingin meminta penghapusan akun, atau perlu menghubungi pengelola TemanNyatet, kirim email ke:',
        ],
      },
    ],
  },
};

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 rotate-[-3deg] items-center justify-center rounded-xl bg-primary shadow-soft">
        <div className="flex h-7 w-6 -rotate-6 items-center justify-center rounded-md border border-finance-text/50 bg-finance text-white">
          <BookOpen size={15} strokeWidth={2.25} aria-hidden="true" />
        </div>
      </div>
      <span className="text-lg font-semibold tracking-[-0.03em]">TemanNyatet</span>
    </div>
  );
}

function PolicyIcon({ kind }: { kind: PolicyKind }) {
  const Icon = kind === 'privacy' ? ShieldCheck : Scale;
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
    </div>
  );
}

export default function LegalPage({ policy }: { policy: PolicyKind }) {
  const content = policies[policy];
  const otherPolicy = policy === 'privacy' ? 'terms' : 'privacy';
  const otherPath = otherPolicy === 'privacy' ? '/privacy-policy' : '/terms-of-service';
  const otherLabel = otherPolicy === 'privacy' ? 'Privacy Policy' : 'Terms of Service';

  return (
    <main className="min-h-dvh overflow-x-hidden bg-background px-4 pb-12 pt-5 sm:px-8 sm:pb-16 sm:pt-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/login"
            aria-label="Kembali ke halaman login"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            <span className="hidden sm:inline">Kembali ke login</span>
            <span className="sm:hidden">Kembali</span>
          </Link>
          <BrandMark />
        </header>

        <article className="mx-auto mt-10 max-w-3xl sm:mt-16">
          <div className="flex items-start gap-4">
            <PolicyIcon kind={content.kind} />
            <div className="min-w-0">
              <p className="text-pill-label">{content.eyebrow}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Terakhir diperbarui {LAST_UPDATED}
              </p>
            </div>
          </div>

          <h1 className="mt-7 max-w-2xl text-page-title sm:text-4xl">{content.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {content.intro}
          </p>

          <nav
            aria-label="Daftar isi"
            className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-elevation-1 sm:p-6"
          >
            <p className="text-pill-label">Di halaman ini</p>
            <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {content.sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="min-h-8 text-sm font-medium leading-relaxed text-primary underline-offset-4 hover:underline"
                >
                  {section.title}
                </a>
              ))}
            </div>
          </nav>

          <div className="mt-10 space-y-10 sm:mt-14 sm:space-y-12">
            {content.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-heading`}
                className="scroll-mt-6"
              >
                <h2 id={`${section.id}-heading`} className="text-section-title">
                  {section.title}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-body text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-body text-muted-foreground marker:text-primary">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="pl-1">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
                {section.id === 'kontak-privasi' || section.id === 'kontak-terms' ? (
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary/10 px-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    <Mail size={17} aria-hidden="true" />
                    {CONTACT_EMAIL}
                  </a>
                ) : null}
              </section>
            ))}
          </div>

          <footer className="mt-14 border-t border-border pt-7 sm:mt-16">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Baca juga{' '}
              <Link href={otherPath} className="font-medium text-primary underline-offset-4 hover:underline">
                {otherLabel}
              </Link>
              . Jika ada pertanyaan, kirim email ke{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex min-h-11 items-center rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground shadow-elevation-1 transition-colors hover:bg-accent"
            >
              Kembali ke TemanNyatet
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}