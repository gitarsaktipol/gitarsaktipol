# Gitar Sakti — Ringkasan Sistem

Baca file ini dulu sebelum mengerjakan apa pun di repo ini. Ditulis Okt 2026 dari pembacaan
kode + pemeriksaan database Supabase asli.

## Pembagian tugas

- Repo ini = **website gitarsakti.com** (toko kursus gitar video + merchandise + panel admin).
- **FerTune** (`/fertune/`) BUKAN dikerjakan di sini — ada sesi Claude sendiri di repo
  `gitarsaktipol/yuner`. Dari repo ini cukup jangan merusak: rewrite `/fertune` di `vercel.json`,
  tabel `fertune_*` di Supabase, Edge Function `delete-account`, menu FerTune di header/dasbor,
  dan Admin > Pengaturan > FerTune.
- Pemilik: **Ferdi** (bukan programmer). Jelaskan perubahan dengan bahasa Indonesia sederhana.
  Dia menguji di HP Android (Chrome) dan PC. Alur: branch fitur → PR kecil ke `main` → Ferdi
  bilang "merge".

## Stack & deploy

- React 18 + Vite 5, tanpa router/library state. Dua file utama: **`src/App.jsx`** (±6.500 baris:
  semua halaman pengunjung/pembeli/member + logika data) dan **`src/AdminDashboard.jsx`** (±2.700
  baris: dasbor admin + semua form/modal admin). `AdminDashboard.jsx` dimuat malas (`React.lazy`
  di App.jsx, juga `YoutubeImportModal` untuk editor materi) supaya pengunjung tidak mengunduhnya
  (bundle utama ±680 KB, admin ±510 KB). Komponen/helper bersama di-`export { ... }` di akhir
  App.jsx dan di-import oleh AdminDashboard.jsx — kalau kode admin butuh helper baru dari App.jsx,
  tambahkan namanya ke daftar export itu. recharts hanya dipakai di admin.
  Ikon `lucide-react`, grafik `recharts`, backend `@supabase/supabase-js`.
- Styling inline (`style={{...}}`) + satu blok `<style>` global di akhir komponen `App`.
  Warna lewat Proxy `C` (`LIGHT_THEME`/`DARK_THEME`, disimpan `localStorage gs-theme`) —
  pakai `C.gold`, `C.text`, dst., jangan hardcode warna baru.
- **Vercel** proyek `gitarsaktipol` (team `team_OWEG8vXsYUCxdr6FMdf5Hzlr`). Push/merge ke `main`
  = deploy produksi otomatis. Tidak ada test/lint; cek minimal `npm run build`.
- `vercel.json`: redirect `gitarsaktipol.vercel.app` → `gitarsakti.com`; rewrite `/fertune/*`
  → `https://gitarsaktipol.github.io/yuner/*`; header keamanan (mikrofon hanya untuk `/fertune`).
- Env Vercel (opsional): `VITE_META_PIXEL_ID` (Meta Pixel, `src/main.jsx`),
  `VITE_MODE_PERSIAPAN=1` (banner "sedang penyempurnaan").
- `public/sw.js` minimal (tidak meng-cache apa pun, hanya supaya PWA admin bisa di-install;
  manifest `start_url=/?admin=1`). Tidak perlu menaikkan versi cache seperti di FerTune.

## Navigasi (tanpa router)

State `view` di `App` + `go(view, slug)` yang mendorong `history.pushState` (tombol back HP).
View: `home`, `shop`, `product`, `cart`, `checkout`, `paymentconfirm`, `auth`, `resetpassword`,
`about`, `lp`, `privacy`/`terms`/`refund`, `custompage`, `customer`, `learn`, `admin`.

Parameter URL: `?admin=1` (form login admin), `?halaman=<slug>` (landing page iklan),
`?info=privasi|syarat|refund` (halaman legal), `?resetpw=1` (link reset password).

## Peta `src/App.jsx`

- Atas: klien Supabase (publishable key — aman di klien), `invokeFn` (panggil Edge Function
  dengan JWT), `loadSnap` (Midtrans), tema, helper YouTube (`toEmbedUrl`, `toLessonEmbedUrl`),
  `trackEvent` (Pixel), `DEFAULT_SITE_CONTENT`, `LEGACY_PLACEHOLDER_TEXT`.
- Komponen kecil: `PrimaryBtn`, `GhostBtn`, `Card`, `SortableList` (tahan-geser), `toast`,
  `EditableText` (edit langsung di halaman oleh admin), `RichText`/`RichTextEditor`.
- Halaman: `Header`, `Footer`, `LegalPage` (`LEGAL_PAGES`), `HomePage`, `ShopPage`,
  `ProductPage`/`MerchProductPage`/`SoonNotify`, `CartPage`, `CheckoutPage`,
  `PaymentConfirmationPage`, `AuthPage`, `ResetPasswordPage`, `CustomerDashboard`
  (Produk Saya/Ringkasan/Pesanan/Profil), `LearnPage` (+ `LearnCurriculumEditor`),
  `LandingPageTemplate` (tema "gold") & `LandingPageTemplateViolet` (`LP_TEMPLATES`,
  dipilih lewat `extra.template`), `CustomPageView`, `AboutPage`.
- `AdminDashboard` (di `src/AdminDashboard.jsx`; sub): Ringkasan, Produk, Pesanan, Pelanggan, Kupon, Analitik, Landing Page,
  Pengaturan (`settingsSub`: Tampilan, Metode Pembayaran, Pengiriman, Keamanan, Data, FerTune,
  Marketing). Modal: `YoutubeImportModal`, `ProductFormModal`, `QuickProductFormModal`,
  `MerchFormModal`, `CouponFormModal`, `LandingPageFormModal`, `PageFormModal`, `OrderDetailModal`.
- `export default function App()` (±baris 7757): semua state, fetch, mapper baris DB
  (snake_case → camelCase: `mapProductRow`, `mapOrderRow`, ...), dan aksi (addOrder,
  updateOrderStatus, attachPaymentProof, prepareOnline/openSnap, markVideoComplete, CRUD admin).
  Routing render ada di bagian paling bawah (`{view === "..." && ...}`).

## Alur penting

- **Login**: Supabase Auth email+password. Minimal kata sandi `MIN_PASSWORD` = 8 (daftar, reset,
  ganti kata sandi admin; akun lama yang lebih pendek tetap bisa masuk). Trigger DB `handle_new_user()` membuat baris `profiles`.
  `role` = `customer` | `admin` (kolom `role` TIDAK bisa diubah klien; hanya `name, phone, address`).
  Akun admin tidak bisa belanja.
- **Beli**: keranjang (digital qty 1, fisik per varian/stok) → kupon (`validate_coupon` RPC)
  → `orders.insert` dengan `payment:"Pending"`. **Harga/diskon/total dihitung ulang di DB**
  (trigger `orders_before_insert`); `orders_block_unavailable` menolak produk draft/soon.
- **Bayar manual**: upload bukti ke bucket privat `payment-proofs` (`<uid>/<orderId>-<ts>.ext`,
  maks 5 MB) → RPC `attach_payment_proof` → email + Telegram admin → admin "Verifikasi"
  (RPC `admin_update_order_status`) → email "paid".
- **Bayar Midtrans (Snap)**: `payment_methods.type='midtrans'` (Client Key + env di tabel;
  Server Key HANYA di secret). `midtrans-create-transaction` buat token dari data DB →
  popup → `midtrans-webhook` (verify_jwt=false; cek signature SHA512, cek ulang status ke API,
  nominal harus sama) → RPC `system_mark_order_paid` (khusus service_role) → email + Telegram.
- **Belajar**: `curriculum_videos` (RLS: hanya pembeli/admin; baris bab = `duration === "__section__"`).
  Progres di `video_progress` (pakai `video_id`, bukan urutan). Video terakhir dibuka disimpan di
  `localStorage gs-last-<uid>` (kartu "Lanjutkan Belajar"). Admin menyimpan kurikulum lewat RPC
  `admin_save_curriculum` (update di tempat — JANGAN ganti jadi hapus+insert, progres member hilang).
- **Halaman belajar** (`LearnPage`): urutan kolom kiri = judul/durasi → tombol ◀ + "Selesai & Lanjut"
  (di ATAS video, diminta Ferdi Okt 2026) → kartu selamat (bila semua selesai) → video →
  `VideoDescription` → `VideoTips` ("Petunjuk Latihan", kolom `curriculum_videos.tips`, format
  `RichText`; admin Mode Edit: tombol Edit/Tambah petunjuk; kosong = tidak tampil ke member) →
  kartu "Berikutnya". `admin_save_curriculum` hanya mengubah `tips` bila item membawa kunci `tips`.
- **Realtime**: channel `orders-sync` memuat ulang pesanan; materi dimuat ulang saat produk
  dimiliki berubah (`ownedKey`).
- Status produk: `published` | `draft` | `archived` (produk yang sudah dibeli tidak dihapus,
  diarsipkan) | `soon` (Segera Hadir + daftar tunggu `product_waitlist`).

- **Meta Pixel** (aktif hanya bila `VITE_META_PIXEL_ID` diisi; `trackEvent(name, params, opts)`):
  PageView (awal di main.jsx + tiap ganti `view`), ViewContent (halaman produk & landing page),
  AddToCart, InitiateCheckout, CompleteRegistration (daftar), Purchase (dikirim dari browser pembeli
  saat pesanannya terlihat PAID; sekali per pesanan via `localStorage gs-px-purchase`, hanya pesanan
  ≤14 hari; `eventID: purchase-<orderId>` untuk dedup bila nanti ada Conversions API server).
- **Sumber pembeli** (`captureAttribution`/`readAttribution`, `localStorage gs-attrib`, 30 hari):
  UTM/fbclid/gclid (klik iklan baru menimpa) atau host perujuk (hanya bila belum ada catatan) →
  kolom `orders.attribution` (jsonb, maks 2000 byte) → tampil "Sumber" di detail pesanan admin.

## Supabase (`addtajuxfoxcaezmkice`, region ap-southeast-1) — DATA PELANGGAN ASLI

Tabel `public` (semua RLS aktif): `profiles`, `products`, `curriculum_videos`, `orders`, `coupons`,
`testimonials`, `bank_info`, `site_content` (JSON konten situs, id=1), `custom_pages`,
`site_visits`, `landing_pages` (`extra` jsonb = teks edit-inline), `video_progress`,
`payment_methods`, `product_waitlist`, `fertune_scores`/`fertune_feedback`/`fertune_purchases`
(milik FerTune).

RPC: `validate_coupon`, `attach_payment_proof`, `cancel_my_order`, `admin_update_order_status`,
`admin_update_fulfillment`, `admin_save_curriculum`, `admin_reorder_products`,
`admin_reorder_payment_methods`, `increment_lp_visit/click`, `is_admin`,
`system_mark_order_paid`/`system_fail_order` (service_role), `submit_fertune_feedback`.
Fungsi `admin_*` memeriksa admin di dalamnya (peringatan advisor "SECURITY DEFINER bisa
dipanggil" untuk fungsi ini memang disengaja).

Edge Functions (`supabase/functions/`): `send-order-email` (Resend), `notify-telegram`,
`youtube-import` (+`lib.ts`), `midtrans-create-transaction`, `midtrans-webhook`, `delete-account`.
Secrets: `SITE_URL`, `RESEND_API_KEY`, `FROM_EMAIL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
`YOUTUBE_API_KEY`, `MIDTRANS_SERVER_KEY_SANDBOX`, `MIDTRANS_SERVER_KEY_PRODUCTION`.
Deploy function lewat MCP Supabase / CLI setelah diubah di repo (repo dan versi live bisa beda).

Migrasi: `supabase/migrations/`. Catatan: skema dasar (tabel & policy awal) TIDAK ada di repo;
migrasi `fertune_scores` ada di DB tapi tidak di repo; `product_status_soon` & `product_waitlist`
diterapkan lewat SQL langsung (tidak tercatat di daftar migrasi DB, tapi isinya sudah aktif).
Untuk perubahan DB baru: tulis file migrasi di repo DAN terapkan dengan `apply_migration`.

## Aturan agar tidak merusak

1. Jangan pernah menaruh service role key / Server Key Midtrans / token bot di kode atau repo.
2. Harga, kupon, status bayar selalu divalidasi di DB/Edge Function, bukan di browser.
3. Jangan hapus+buat ulang `curriculum_videos` (progres member terikat `video_id`).
4. Hati-hati dengan data asli (orders/profiles). Uji query baca dulu; perubahan data minta izin Ferdi.
5. Jangan sentuh hal FerTune kecuali diminta (lihat "Pembagian tugas").
6. Teks klaim/testimoni harus asli (dulu ada data fiktif yang sudah dihapus — jangan dikembalikan).

## Sisa pekerjaan yang diketahui (Okt 2026)

- Edge Function uji `yt-probe` dan `yt-temp-sos` masih aktif di Supabase → sebaiknya dihapus
  (tidak ada di repo). Keduanya sudah berupa stub (jawab 410), jadi tidak berbahaya; hapus lewat
  Dashboard (tools MCP tidak punya aksi hapus function).
- Supabase Auth: "Leaked password protection" masih mati (advisor; butuh paket Pro).
- Supabase Auth: minimal panjang kata sandi di server masih bawaan (6); samakan ke 8 di
  Authentication → Policies/Password bila ingin ditegakkan juga dari FerTune.
- MCP Supabase `apply_migration`/`execute_sql` yang berisi `delete` butuh persetujuan pengguna dan
  time out (60 dtk) bila tidak disetujui — berikan SQL-nya ke Ferdi untuk dijalankan di SQL Editor.
- Meta: Conversions API (server) belum ada — butuh access token dari Ferdi.
- Akses MCP Vercel: jangan isi `teamId` di `list_deployments` (akun pribadi; 403). Log runtime
  Vercel (`get_runtime_errors`) ditolak 403 — tidak penting karena tidak ada serverless di Vercel.
- Detail lain: `ROADMAP-LAUNCH.md` dan `LAPORAN-AUDIT.md`.
