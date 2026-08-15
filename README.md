# Gitar Sakti — Prototipe Website

Prototipe interaktif Gitar Sakti (React + Vite). Karena ini website sungguhan
(bukan lagi di dalam preview Claude), embed video YouTube/Vimeo akan berjalan
normal di sini.

## 1. Jalankan di komputer sendiri

Butuh [Node.js](https://nodejs.org) (versi 18 ke atas) sudah terpasang.

```bash
npm install
npm run dev
```

Buka link yang muncul di terminal (biasanya `http://localhost:5173`).

## 2. Push ke GitHub

```bash
git init
git add .
git commit -m "Prototipe awal Gitar Sakti"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

Ganti `USERNAME/NAMA-REPO` dengan repo GitHub kamu sendiri.

## 3. Deploy supaya bisa diakses online

Cara termudah (gratis, tanpa setting rumit): **Vercel** atau **Netlify**.

### Vercel (disarankan)
1. Buka https://vercel.com, daftar/masuk pakai akun GitHub
2. Klik "Add New Project" → pilih repo GitHub yang tadi kamu push
3. Vercel otomatis mendeteksi ini project Vite — biarkan pengaturan default
4. Klik "Deploy", tunggu ± 1 menit
5. Selesai — dapat link seperti `nama-project.vercel.app`

### Netlify (alternatif)
1. Buka https://netlify.com, daftar/masuk pakai akun GitHub
2. "Add new site" → "Import an existing project" → pilih repo
3. Build command: `npm run build`, Publish directory: `dist`
4. Deploy

## Catatan penting

- Ini **masih prototipe**: semua data (pesanan, produk yang ditambahkan lewat
  Admin, progres video, kupon) tersimpan di memori browser (React state) dan
  akan **hilang setiap kali halaman di-refresh**. Belum ada database sungguhan.
- Checkout di sini simulasi — belum tersambung ke payment gateway asli
  (Midtrans/Xendit/dll).
- Cocok untuk: uji coba tampilan & alur, termasuk video YouTube/Vimeo yang
  sekarang sudah bisa embed langsung karena tidak lagi dibatasi kebijakan
  keamanan preview Claude.
- Untuk versi produksi (database sungguhan, payment gateway asli, autentikasi
  nyata), akan perlu backend terpisah — bisa lanjut diskusi kalau sudah siap
  ke tahap itu.
