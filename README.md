# Gitar Sakti

Website kursus gitar online (React + Vite) dengan backend Supabase (database, login,
storage bukti transfer, Edge Functions). Hasil audit & rekomendasi lengkap ada di
[`LAPORAN-AUDIT.md`](./LAPORAN-AUDIT.md).

## Menjalankan di komputer sendiri

Butuh [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev      # buka http://localhost:5173
npm run build    # cek build produksi
```

Halaman login admin: tambahkan `?admin=1` di URL (mis. `https://gitarsakti.com/?admin=1`).

## Upload produk langsung dari link YouTube

1. Upload video kelas ke YouTube sebagai **Tidak publik (Unlisted)**, kumpulkan dalam satu
   playlist (juga Tidak publik).
2. Admin → **Produk** → **Tambah dari Link YouTube** → tempel link playlist (atau beberapa
   link video, satu per baris) → **Ambil Video**.
3. Isi harga, pilih video yang mau dimasukkan, opsional kelompokkan per bab → **Buat Produk**.
   Semua video otomatis jadi materi (judul, urutan, durasi), video pertama jadi preview gratis.
4. Untuk menambah video ke kelas yang sudah ada: Admin → Produk → ikon ▶ (Kelola Materi) →
   **Import dari YouTube**.

Import dijalankan oleh Edge Function `youtube-import` (hanya admin yang bisa memanggil).
Supaya lebih stabil & durasi video satuan selalu terbaca, pasang API key YouTube (gratis):
Google Cloud Console → aktifkan *YouTube Data API v3* → buat API key → Supabase Dashboard →
Edge Functions → Secrets → `YOUTUBE_API_KEY`.

## Deploy (Vercel) & domain

1. Vercel → Add New Project → pilih repo ini (preset Vite terdeteksi otomatis) → Deploy.
2. Vercel → Settings → Domains → tambahkan domain (gitarsakti.com), ikuti instruksi DNS.
3. **Supabase Dashboard → Authentication → URL Configuration**: ganti *Site URL* ke domain
   baru dan tambahkan `https://gitarsakti.com/**` ke *Redirect URLs* (kalau tidak, link
   reset password & verifikasi email mengarah ke alamat lama).
4. Supabase → Edge Functions → Secrets, isi:
   - `SITE_URL` = `https://gitarsakti.com`
   - `RESEND_API_KEY`, `FROM_EMAIL` (email pesanan; domain diverifikasi di Resend)
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (notifikasi pesanan ke HP admin)
   - `YOUTUBE_API_KEY` (opsional, disarankan)
5. Opsional: Vercel → Environment Variables → `VITE_META_PIXEL_ID` untuk Meta Pixel.

## Struktur backend (Supabase)

- `supabase/migrations/` — perubahan database (sudah diterapkan ke project).
- `supabase/functions/youtube-import` — ambil daftar video dari link YouTube.
- `supabase/functions/send-order-email` — email pesanan (via Resend).
- `supabase/functions/notify-telegram` — notifikasi Telegram ke admin.

Harga, diskon kupon, dan total pesanan **dihitung ulang di database** (trigger
`orders_before_insert`), jadi tidak bisa dimanipulasi dari browser.
