# Laporan Audit Gitar Sakti — Siap Go-Live

Tanggal: 27 September 2026

Saya mengecek seluruh kode website (`src/App.jsx`), database Supabase (tabel, RLS policy,
fungsi, storage), dan Edge Functions. Saya mencobanya dari 3 sisi: pengunjung/pembeli, member
yang sudah membeli, dan admin/owner.

---

## 1. Celah kritis yang SUDAH diperbaiki

| # | Masalah | Dampak kalau dibiarkan | Status |
|---|---------|------------------------|--------|
| 1 | Customer bisa mengubah kolom `role` di profilnya sendiri jadi `admin` lewat API publik | Siapa pun yang daftar bisa jadi admin: lihat semua data pembeli, tandai pesanannya sendiri "Lunas", ubah harga, hapus produk | ✅ Ditutup (hanya nama & WA yang bisa diubah) — sudah diuji |
| 2 | Harga, diskon & total pesanan dikirim dari browser apa adanya | Pembeli bisa bikin pesanan Rp1 untuk produk Rp247.000; admin yang lengah bisa meng-approve | ✅ Database kini menghitung ulang semua harga/kupon (trigger `orders_before_insert`) — sudah diuji |
| 3 | Semua kode kupon bisa dibaca siapa saja lewat API | Kupon "rahasia" bocor ke publik | ✅ Kupon hanya dicek lewat server (`validate_coupon`) |
| 4 | Kupon kedaluwarsa & kuota habis tetap bisa dipakai (hanya dicek minimum belanja) | Diskon terus terpakai | ✅ Dicek di server: kedaluwarsa, kuota, minimum |
| 5 | Setiap admin mengedit 1 judul video, **semua** video materi dihapus & dibuat ulang | **Progres belajar semua member hilang** setiap kali admin edit materi | ✅ Materi kini diupdate di tempat (`admin_save_curriculum`) — id & progres aman |
| 6 | Klik "Beli" di landing page oleh admin **mengubah harga produk permanen** di database | Harga produk bisa turun sendiri tanpa sadar | ✅ Harga promo hanya berlaku di keranjang & divalidasi server (slot promo) |
| 7 | Edge Function email & Telegram bisa dipanggil siapa saja dengan isi bebas | Bisa dipakai untuk spam/phishing atas nama Gitar Sakti & banjiri Telegram admin | ✅ Hanya pemilik pesanan/admin, isi diambil dari database, HTML di-escape |
| 8 | Setelah login, materi yang sudah dibeli tidak muncul sampai halaman di-refresh | Member baru bayar → klik "Akses Produk" → "materi belum ditambahkan" (terkesan penipuan) | ✅ Data dimuat ulang tiap login & begitu pembayaran diverifikasi |
| 9 | Admin yang membuka halaman materi sebelum data termuat, lalu menambah 1 video → **seluruh materi terhapus** | Kehilangan data | ✅ Ikut tertutup oleh #5 & #8 |
| 10 | Data contoh (6 produk fiktif, rating 4.8, "3.210 terjual") tampil sekilas saat loading & bisa dibeli | Pembeli beli produk yang tidak ada | ✅ Dihapus |
| 11 | Testimoni beranda (Raka Pratama, Dinda Ayu, dll) **fiktif**; FAQ menyebut "payment gateway, akses otomatis" padahal manual | Risiko UU Perlindungan Konsumen & komplain | ✅ Beranda kini menampilkan ulasan asli pembeli (disembunyikan kalau belum ada); FAQ dikoreksi |
| 12 | Form ganti password admin selalu gagal diam-diam (bug `async`) | Admin mengira password tidak berubah | ✅ Diperbaiki |
| 13 | Fungsi database tanpa `search_path`, bisa dipanggil anon; bucket bukti transfer tanpa batas ukuran/tipe | Celah keamanan standar (Supabase advisor) | ✅ Diperbaiki (maks 5MB, hanya gambar) |
| 14 | Modal/pop-up tertutup header di beberapa layar | UI rusak | ✅ Diperbaiki |

## 2. Fitur baru

- **Tambah produk dari link YouTube** (Admin → Produk → *Tambah dari Link YouTube*): tempel link
  playlist atau beberapa link video → judul, urutan, durasi & thumbnail otomatis → atur harga →
  produk + seluruh materi jadi. Sudah diuji dari server Supabase: playlist 41 video terbaca
  lengkap dengan durasi, dan pemuatan lanjutan untuk playlist >100 video (diuji sampai 400 video).
- **Import YouTube ke kelas yang sudah ada** (di editor materi).
- **Kelompokkan materi per bab otomatis** saat import.
- Member melanjutkan dari **video terakhir yang belum selesai**, video tanpa rekomendasi channel lain.
- Customer bisa **membatalkan pesanan** yang belum dibayar (sebelumnya produk itu terkunci
  "menunggu pembayaran" sampai admin menolaknya manual).
- Admin: filter pesanan **Perlu Dicek / Belum Bayar / Lunas**, tombol **WhatsApp** ke pembeli,
  daftar **semua member terdaftar** (termasuk yang belum beli = leads).
- Kartu produk otomatis memakai thumbnail video preview.
- Meta Pixel siap (`VITE_META_PIXEL_ID`): ViewContent, AddToCart, InitiateCheckout.
- SEO dasar (judul, deskripsi, Open Graph untuk share WhatsApp/IG), header keamanan Vercel.

## 3. Hasil cek per mode

**Pengunjung** — Beranda, katalog, detail produk, landing page iklan (`?halaman=slug`) berjalan.
Catatan: produk "Secret Of Shredding" berstatus **Draft**, jadi di Beranda & katalog pengunjung
tidak melihat produk apa pun (hanya bisa dibeli lewat landing page). Publish produknya kalau
ingin tampil di toko.

**Pembeli** — Daftar → keranjang → kupon → checkout → instruksi transfer → upload bukti →
email + notifikasi Telegram ke admin. Sudah diuji ujung ke ujung (dengan data simulasi).

**Member (sudah beli)** — Setelah admin klik "Verifikasi", materi langsung terbuka tanpa refresh,
progres tersimpan di server (aman ganti HP/laptop). Catatan: belum ada sistem *berlangganan*
(bulanan); semua pembelian saat ini akses seumur hidup per produk.

**Admin** — Produk, materi, pesanan, member, kupon, landing page, metode pembayaran,
tampilan, keamanan. Semua aksi admin dilindungi RLS di database, bukan sekadar disembunyikan
di tampilan.

**Pembayaran** — Saat ini **manual** (transfer/QRIS → upload bukti → admin verifikasi). Opsi
"Midtrans" di pengaturan **belum berfungsi** (belum ada integrasi server) — jangan diaktifkan.

## 4. Yang perlu kamu lakukan sebelum go-live (tidak bisa saya lakukan dari sini)

1. **Upgrade Supabase ke Pro (~US$25/bln).** Project gratis otomatis *di-pause* bila sepi 7 hari
   dan backup harian tidak tersedia — tidak layak untuk toko yang menerima uang.
2. **Domain**: ikuti README bagian *Deploy & domain* — terutama ganti *Site URL* & *Redirect URLs*
   di Supabase Auth, dan secret `SITE_URL`.
3. **Email**: pasang custom SMTP (Resend/Brevo) di Supabase Auth → Emails. Email bawaan Supabase
   dibatasi beberapa email/jam — reset password pembeli akan gagal saat ramai.
4. **Supabase Auth → aktifkan "Leaked password protection"** (menolak password yang pernah bocor).
5. **Telegram**: token bot sebelumnya tertulis langsung di kode function. Buat token baru di
   @BotFather (`/revoke`), lalu simpan sebagai secret `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`.
6. **Rekening di Pengaturan → Metode Pembayaran**: pastikan nomor rekening asli (default di kode
   masih "1234567890" sebagai cadangan).
7. **Halaman legal** (Kebijakan Privasi, Syarat & Ketentuan, Refund) masih teks bawaan — sesuaikan
   dan pastikan jelas soal kebijakan refund produk digital.
8. **PSE Kominfo**: website yang menjual & menyimpan data pribadi wajib terdaftar sebagai
   Penyelenggara Sistem Elektronik (lewat OSS). Juga siapkan NIB/NPWP untuk payment gateway.
9. Hapus function uji `yt-probe` di Supabase Dashboard → Edge Functions (sudah dinonaktifkan).

---

## 5. Sebagai pembeli — yang masih kurang

1. **Pembayaran otomatis** (QRIS/VA/e-wallet via Midtrans/Xendit/Tripay). Menunggu admin
   verifikasi manual, terutama malam hari, adalah penyebab #1 pembeli batal/minta refund.
2. **Bukti sosial asli**: jumlah member, video testimoni, contoh hasil murid sebelum-sesudah.
3. **Preview materi** 1–2 video gratis per kelas (sudah didukung lewat video preview — isi untuk
   semua produk).
4. **Tombol WhatsApp admin** di halaman konfirmasi pembayaran & footer.
5. **Garansi** yang jelas (mis. 7 hari uang kembali) — menaikkan konversi produk digital.
6. **Lampiran per materi** (tab/PDF/backing track) — saat ini materi hanya video.
7. **Komunitas**: grup member (Telegram/Discord/WA Community) + sesi live bulanan.
8. **Sertifikat penyelesaian** & badge progres — memicu member menyelesaikan kelas (dan share).

## 6. Sebagai owner — jalan menuju miliaran

Hitungan kasar: 100.000 member × rata-rata belanja Rp250.000 = **Rp25 miliar**. Untuk sampai ke
sana, yang paling menentukan (urut prioritas):

1. **Otomatisasi pembayaran dulu.** Verifikasi manual cuma kuat ±30–50 pesanan/hari. Dengan
   payment gateway + webhook, akses terbuka otomatis 24 jam, admin tidak jadi bottleneck.
   *Ini pekerjaan berikutnya yang paling saya sarankan — saya bisa bangun begitu akun merchant
   (Midtrans/Xendit/Tripay) dan server key-nya ada.*
2. **Lindungi konten.** Link YouTube unlisted bisa disalin dari embed dan disebar di grup —
   di skala ratusan ribu member ini pasti terjadi. Pindah hosting video ke **Bunny Stream** atau
   **Vimeo** dengan domain-restriction + URL bertanda tangan, watermark nama/email member di video.
   Fitur import tetap bisa diadaptasi ke sana.
3. **Pendapatan berulang (mode berlangganan).** Tambahkan "All-Access Membership" bulanan/tahunan
   (semua kelas + materi baru tiap bulan + live class). Pendapatan jadi bisa diprediksi dan
   LTV per member naik jauh di atas harga satu kelas.
4. **Tangga produk (value ladder):** kelas murah Rp49–99rb sebagai pintu masuk → kelas utama
   Rp247rb → bundle/membership → mentoring/review video pribadi (high ticket).
   Tambahkan *order bump* & *upsell* di checkout.
5. **Program afiliasi/referral** (komisi 20–30%) untuk guru gitar, YouTuber & alumni. Ini mesin
   akuisisi paling murah untuk kursus online di Indonesia.
6. **Follow-up otomatis**: pesanan "Belum Bayar" > 1 jam → WA/email pengingat otomatis;
   member terdaftar yang belum beli → urutan email/WA edukasi + promo. Data leads sudah ada di
   tab *Pelanggan*.
7. **Ukur semuanya**: Meta Pixel + Conversions API, Google Analytics 4, UTM di tiap iklan,
   dan funnel (kunjungan → daftar → checkout → bayar) per landing page — keputusan iklan
   harus berdasarkan CAC vs LTV, bukan feeling.
8. **Retensi = pemasaran gratis**: progres, sertifikat, tantangan 30 hari, leaderboard,
   komunitas. Member yang merasa berhasil akan membeli kelas berikutnya dan merekomendasikan.
9. **Tim & SOP**: CS untuk WhatsApp, editor konten, SOP verifikasi & refund, laporan mingguan
   (omzet, konversi, refund rate, CAC).
10. **Teknis untuk skala**: kode website saat ini 1 file ±7.000 baris & bundle 1,1 MB — perlu
    dipecah (lazy-load halaman admin) supaya cepat di HP murah & sinyal lemah; tambah monitoring
    error (Sentry) dan backup rutin.
