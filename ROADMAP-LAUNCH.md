# Roadmap Gitar Sakti — dari "domain sudah jalan" sampai siap pasang iklan Meta

Tanggal analisis: 2 Oktober 2026 · Domain: gitarsakti.com · Produk saat ini: **kelas video saja**

Cara baca: tiap temuan diberi label
- **[KODE]** = terbukti dari membaca kode di repo ini.
- **[VERIFIKASI]** = tidak bisa dibuktikan dari repo (aturan database/RLS tidak tersimpan di repo, hanya ada di Supabase). Harus dicek langsung di Supabase.
- Prioritas: 🔴 harus beres sebelum iklan · 🟠 sebaiknya sebelum iklan · 🟡 setelah iklan jalan

> Catatan jujur: akses saya ke Supabase sempat ditolak di sesi ini, jadi **saya belum melihat database asli**.
> Semua yang berlabel [VERIFIKASI] belum teruji. Audit lama (`LAPORAN-AUDIT.md`) bilang celah database sudah
> ditutup dan diuji; saya percaya itu sebagai titik awal, tapi belum saya konfirmasi ulang.

---

## 1. Roadmap bertahap

### Fase 0 — Fondasi akun & domain (1–2 hari, kamu sendiri)
| # | Tugas | Prioritas |
|---|-------|-----------|
| 0.1 | Supabase → Auth → URL Configuration: *Site URL* = `https://gitarsakti.com`, *Redirect URLs* + `https://gitarsakti.com/**` | 🔴 |
| 0.2 | Supabase → Edge Functions → Secrets: `SITE_URL=https://gitarsakti.com` | 🔴 |
| 0.3 | Upgrade Supabase ke **Pro**. Paket gratis otomatis *pause* kalau sepi 7 hari & tanpa backup harian — tidak layak untuk toko berbayar/iklan | 🔴 |
| 0.4 | Custom SMTP di Supabase Auth (Resend/Brevo, domain `gitarsakti.com` diverifikasi). Email bawaan Supabase dibatasi beberapa email/jam → reset password & verifikasi gagal saat iklan jalan | 🔴 |
| 0.5 | Auth → aktifkan **Leaked password protection**; naikkan minimal password jadi 8 | 🟠 |
| 0.6 | Akun admin: password panjang & unik, aktifkan MFA di akun Supabase, Vercel, GitHub, Rumahweb, dan email pemilik domain | 🔴 |
| 0.7 | Isi rekening/QRIS asli di Admin → Pengaturan → Metode Pembayaran (default kode masih `1234567890`) | 🔴 |
| 0.8 | `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`, `RESEND_API_KEY`, `FROM_EMAIL` terisi. Audit lama menyebut token Telegram pernah tertulis di kode → revoke & buat token baru lewat @BotFather (di riwayat git repo ini tidak terdeteksi token, tapi tetap lebih aman diganti) | 🟠 |
| 0.9 | Hapus function uji `yt-probe` di Supabase (kalau masih ada) | 🟡 |
| 0.10 | CNAME `www` di Rumahweb → nilai baru dari Vercel (status kuning "DNS Change Recommended") | 🟡 |

### Fase 1 — Verifikasi keamanan database (1 hari; saya bisa bantu kalau diberi akses Supabase)
| # | Tugas | Prioritas |
|---|-------|-----------|
| 1.1 | Jalankan **Supabase Advisors** (Security & Performance), perbaiki semua yang merah | 🔴 |
| 1.2 | Ekspor skema + semua RLS policy ke `supabase/migrations/` — sekarang hanya 2 file "hardening" yang ada di repo; tabel dasar & policy tidak tersimpan di repo, jadi tidak bisa dibangun ulang kalau project rusak | 🟠 |
| 1.3 | Tes dengan 3 peran (anon, customer biasa, admin) — checklist di bagian 3 | 🔴 |
| 1.4 | Pastikan semua tabel `ENABLE ROW LEVEL SECURITY` dan tidak ada tabel tanpa policy | 🔴 |

### Fase 2 — Uji alur ujung ke ujung (1–2 hari)
Jalankan 3 alur di bagian 2 dengan akun uji, di **HP asli** (Android + iPhone) dengan sinyal 4G biasa. Catat semua yang janggal.

### Fase 3 — Konten & kepercayaan (paralel dengan fase 2)
| # | Tugas | Prioritas |
|---|-------|-----------|
| 3.1 | Upload produk lengkap (YouTube *Unlisted*, playlist → Admin → Tambah dari Link YouTube), **publish** (sekarang berstatus Draft → katalog kosong) | 🔴 |
| 3.2 | Video preview gratis 1–2 materi per kelas | 🔴 |
| 3.3 | Halaman legal: Privasi, Syarat, Refund — ganti teks bawaan dengan versi sesuai bisnis kamu (kebijakan refund produk digital harus jelas) | 🔴 |
| 3.4 | Bukti sosial asli: testimoni murid, video hasil, jumlah murid (jangan fiktif — risiko UU Perlindungan Konsumen & iklan ditolak) | 🟠 |
| 3.5 | Tombol WhatsApp admin di halaman konfirmasi pembayaran & footer, jam balas jelas | 🟠 |
| 3.6 | PSE Kominfo (OSS), NIB/NPWP — dibutuhkan juga untuk payment gateway | 🟠 |

### Fase 4 — Siap iklan Meta (2–3 hari)
| # | Tugas | Prioritas |
|---|-------|-----------|
| 4.1 | Isi `VITE_META_PIXEL_ID` di Vercel → Environment Variables, lalu redeploy | 🔴 |
| 4.2 | **Verifikasi domain** di Meta Business → Brand Safety → Domains (pakai DNS TXT di Rumahweb atau meta-tag; saya bisa tambahkan meta-tag-nya di `index.html`) | 🔴 |
| 4.3 | Tambah event **Purchase** (sekarang **belum ada**, lihat temuan P-1) + Conversions API | 🔴 |
| 4.4 | Simpan UTM/`fbclid` saat pengunjung datang & lampirkan ke pesanan (sekarang **0** penanganan UTM di kode) | 🟠 |
| 4.5 | Prioritaskan event di Meta (Aggregated Event Measurement): Purchase teratas | 🟠 |
| 4.6 | Percepat halaman: pecah `App.jsx` (8.692 baris) & muat panel admin hanya saat dibutuhkan | 🟠 |
| 4.7 | Tes dengan **Meta Pixel Helper** + *Test Events*; budget uji kecil (Rp50–100rb/hari) selama 3–5 hari sebelum naik | 🟠 |

### Fase 5 — Setelah iklan jalan
Payment gateway (QRIS/VA otomatis), proteksi video (Bunny/Vimeo + watermark), pengingat otomatis untuk pesanan belum bayar, afiliasi, bundle/membership, sertifikat & komunitas. Detail ada di `LAPORAN-AUDIT.md` bagian 5–6.

---

## 2. Analisis alur pengguna

### A. Pengunjung datang (dari iklan / pencarian / WhatsApp)

```
Klik iklan → ?halaman=slug (landing page) → lihat produk → [Beli] → daftar/masuk → keranjang
```

| ID | Temuan | Label | Prioritas |
|----|--------|-------|-----------|
| A-1 | Situs adalah SPA satu bundle (~1,1 MB). Pengunjung HP dengan sinyal lemah menunggu lama sebelum melihat apa pun → iklan berbayar terbuang pada pengunjung yang pergi | KODE | 🟠 |
| A-2 | Produk berstatus Draft tidak tampil di katalog; beranda bisa kosong. Pengunjung yang masuk lewat beranda tidak melihat produk | KODE (audit) | 🔴 |
| A-3 | UTM/`fbclid` tidak ditangkap sama sekali → tidak bisa tahu iklan/kreatif mana yang menghasilkan pembeli | KODE | 🟠 |
| A-4 | Satu set meta OG untuk semua halaman (SPA) → preview WhatsApp/IG semua link sama. Pengaruh kecil untuk iklan, terasa untuk share organik | KODE | 🟡 |
| A-5 | Pixel hanya `PageView` saat load pertama; pindah halaman di dalam situs tidak mengirim `PageView` baru | KODE | 🟡 |
| A-6 | Tidak ada banner persetujuan cookie/pelacakan. Wajib punya Kebijakan Privasi yang menyebut Meta Pixel; meta mengharuskan ini untuk iklan | KODE | 🟠 |
| A-7 | `robots.txt` yang saya buat sebelumnya memuat `Disallow: /?admin=1` → **membocorkan URL admin ke publik**. Sudah saya hapus barisnya di branch (perlu di-merge). Catatan: halaman admin tetap aman karena dilindungi login + RLS, bukan karena URL-nya rahasia | KODE | 🟡 |
| A-8 | Statistik kunjungan (`site_visits`) bisa di-insert siapa saja dari browser → angka bisa diisi spam/bot | VERIFIKASI | 🟡 |

### B. Pengguna membeli

```
Daftar/Masuk → keranjang → kupon → checkout (isi nama/WA) → pilih transfer/QRIS
→ pesanan "Menunggu Pembayaran" → upload bukti → email + Telegram ke admin
→ admin klik Verifikasi → akses materi terbuka
```

| ID | Temuan | Label | Prioritas |
|----|--------|-------|-----------|
| B-1 | **Pembayaran manual**. Pembeli yang transfer jam 23.00 menunggu sampai admin bangun. Dengan iklan, ini penyebab terbesar CAC terbuang (bayar iklan, pembeli batal/komplain) | KODE | 🔴/🟠 |
| B-2 | Pendaftaran meminta konfirmasi email (pesan di kode mengisyaratkan "Confirm email" aktif). Dengan email bawaan Supabase yang dibatasi, verifikasi bisa tidak sampai → calon pembeli berhenti di sini | KODE+VERIFIKASI | 🔴 |
| B-3 | Minimal password 6 saat daftar, 8 saat ganti password → tidak konsisten | KODE | 🟡 |
| B-4 | Tidak ada event **Purchase** ke Meta. Yang terkirim: `ViewContent`, `AddToCart`, `InitiateCheckout`. Tanpa Purchase, Meta tidak bisa mengoptimalkan ke pembeli sungguhan. Karena "lunas" terjadi saat admin verifikasi (bukan di browser pembeli), Pixel biasa tidak cukup → perlu Conversions API dari server saat status jadi Lunas | KODE | 🔴 |
| B-5 | Tidak ada event `CompleteRegistration`/`Lead` saat pendaftaran | KODE | 🟠 |
| B-6 | Harga/diskon/total dihitung ulang di database (trigger `orders_before_insert`) — manipulasi harga dari browser seharusnya gagal | KODE (audit) | ✅ uji ulang |
| B-7 | Kupon divalidasi server, bukan bisa dibaca publik | KODE (audit) | ✅ uji ulang |
| B-8 | Bukti transfer di bucket privat, path `user-id/order-id-waktu`, maks 5 MB, hanya gambar; dibuka lewat signed URL 1 jam | KODE | ✅ |
| B-9 | Pembeli bisa membatalkan pesanan belum bayar; tombol Beli menolak produk yang sudah dimiliki/pending **di sisi browser**. Apakah server menolak pesanan ganda untuk produk yang sama? Tidak terlihat di kode klien | VERIFIKASI | 🟠 |
| B-10 | Email pesanan & Telegram dikirim per aksi. Tidak terlihat pembatas frekuensi → akun bisa membuat banyak pesanan memicu banyak email (biaya Resend & spam Telegram admin) | VERIFIKASI | 🟠 |
| B-11 | Rekening bawaan di kode `1234567890` — kalau Admin belum mengisi, pembeli melihat nomor palsu | KODE | 🔴 |
| B-12 | Tidak ada garansi/refund yang jelas di halaman beli; produk digital → konversi lebih rendah tanpa jaminan | KODE | 🟠 |
| B-13 | Opsi **Midtrans** muncul di pengaturan tapi belum ada integrasi server → jangan diaktifkan | KODE (audit) | 🔴 |

### C. Pengguna memakai kelas video

```
Masuk → "Produk Saya" → buka kelas → tonton video (iframe YouTube) → tandai selesai → progres tersimpan
```

| ID | Temuan | Label | Prioritas |
|----|--------|-------|-----------|
| C-1 | Daftar video (`curriculum_videos`) dibaca lewat API oleh klien; kodenya berasumsi RLS hanya mengizinkan pembeli/admin. Kalau policy salah, **semua orang bisa membaca semua link video** | VERIFIKASI | 🔴 |
| C-2 | Link YouTube *Unlisted* sampai ke browser pembeli → bisa disalin dan disebar di grup. Satu akun bisa dipakai banyak orang (tidak ada batas perangkat/sesi). Tidak ada watermark | KODE | 🟠 (🟡 untuk tahap awal) |
| C-3 | Video tampil lewat iframe YouTube biasa: rekomendasi/iklan YouTube bisa muncul, dan penonton bisa klik ke channel/YouTube. Atur channel (nonaktifkan monetisasi iklan di video kelas) | KODE | 🟡 |
| C-4 | Progres disimpan ke tabel `video_progress` (insert). Kalau materi diganti urutan/ID, progres terikat `video_id`, bukan urutan → aman (sudah diperbaiki audit) | KODE | ✅ |
| C-5 | Video tanpa ID (data belum termuat) → progres "diam-diam" tidak tersimpan (`if (!video?.id) return`) → pengguna merasa progres hilang, terutama di sinyal lambat | KODE | 🟡 |
| C-6 | Setelah bayar, akses terbuka lewat admin klik Verifikasi; audit mencatat data dimuat ulang. Perlu diuji nyata: bayar → verifikasi → buka kelas **tanpa refresh** | KODE (audit) | 🔴 uji |
| C-7 | Tidak ada kontak bantuan di dalam halaman belajar (tombol WhatsApp/pertanyaan) | KODE | 🟠 |
| C-8 | Ulasan (`testimonials`) bisa di-insert oleh pengguna login untuk `product_id` mana pun yang dikirim klien. Apakah RLS memastikan pengulas **sudah membeli** produk itu? Kalau tidak, orang bisa membuat ulasan palsu yang tampil di beranda | VERIFIKASI | 🟠 |

---

## 3. Checklist uji keamanan (jalankan sebelum iklan)

Lakukan dari browser biasa lalu dari console/REST (atau minta saya jalankan kalau akses Supabase diberikan).

**Sebagai anonim (belum login):**
- [ ] Tidak bisa membaca `orders`, `profiles`, `coupons`, `curriculum_videos` (kecuali preview), `payment-proofs`.
- [ ] Tidak bisa insert/update/delete ke `products`, `coupons`, `site_content`, `landing_pages`, `bank_info`, `payment_methods`.
- [ ] Insert ke `site_visits`: dibatasi atau dibiarkan (keputusan sadar).

**Sebagai customer biasa:**
- [ ] Tidak bisa mengubah `role` jadi admin (sudah diuji audit; uji ulang).
- [ ] Hanya bisa membaca pesanan milik sendiri; tidak bisa membaca pesanan orang lain.
- [ ] Membuat pesanan dengan `total: 1` → tersimpan dengan total asli.
- [ ] Mengubah `payment`/`status` pesanan lewat PATCH langsung → ditolak.
- [ ] Membaca `curriculum_videos` produk yang **belum** dibeli → kosong.
- [ ] Membuat ulasan untuk produk yang belum dibeli → ditolak (atau putuskan boleh).
- [ ] Memanggil Edge Function email/Telegram untuk pesanan orang lain → ditolak.
- [ ] Membuka objek `payment-proofs` milik orang lain → ditolak.

**Sebagai admin:**
- [ ] Semua aksi admin berjalan; akun admin memakai MFA.
- [ ] Hanya 1–2 akun dengan `role = admin`.

**Konfigurasi:**
- [ ] Advisors Supabase bersih; RLS aktif di semua tabel `public`.
- [ ] Leaked password protection aktif; rate limit login/OTP wajar.
- [ ] Secret (service role key, Telegram, Resend) **tidak** ada di repo/frontend. Hanya *publishable key* yang boleh ada di `App.jsx` (ini memang publik).
- [ ] Header keamanan Vercel aktif (sudah ada di `vercel.json`: nosniff, referrer, frame, permissions). Opsional: tambahkan CSP setelah Pixel terpasang.

---

## 4. Checklist uji alur (HP asli)

1. Buka `https://gitarsakti.com` dan `https://www.gitarsakti.com` (harus pindah ke non-www), gembok HTTPS tampil.
2. Buka link landing page `?halaman=slug` di Chrome Android + Safari iPhone; ukur waktu muncul (target < 3 detik di 4G).
3. Daftar akun baru → email verifikasi sampai < 1 menit → masuk.
4. Tambah ke keranjang → pakai kupon valid / kedaluwarsa / kuota habis.
5. Checkout → lihat rekening/QRIS asli → upload bukti (foto 2–4 MB dari kamera).
6. Cek: email pesanan terkirim, Telegram admin berbunyi, link di dalamnya `gitarsakti.com`.
7. Admin verifikasi → di akun pembeli, kelas langsung terbuka **tanpa refresh**.
8. Tonton 2 video → tandai selesai → logout → login dari HP lain → progres masih ada.
9. Lupa password → email → link reset membuka `gitarsakti.com` (bukan alamat lama) → password berubah.
10. Pembeli kedua mencoba membeli produk yang sama lagi → ditolak.
11. Meta Pixel Helper: `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout` terbaca; setelah event Purchase ditambahkan, `Purchase` juga muncul.

---

## 5. Urutan yang saya sarankan (ringkas)

1. **Hari 1:** Fase 0 (0.1–0.8). Tanpa ini, email dan link login bisa rusak saat iklan jalan.
2. **Hari 2:** Fase 1 — saya bantu jalankan Advisors & uji peran kalau akses Supabase diberikan.
3. **Hari 2–3:** Upload produk lengkap + preview gratis + legal + rekening (fase 3).
4. **Hari 3–4:** Uji alur penuh di HP (bagian 4).
5. **Hari 4–6:** Pixel + verifikasi domain + Purchase/CAPI + UTM + percepatan (fase 4) — ini pekerjaan kode yang bisa saya kerjakan.
6. **Hari 7+:** Iklan uji kecil → pantau → naikkan. Mulai payment gateway & proteksi video secara paralel.

Pekerjaan kode yang bisa saya kerjakan langsung: event Purchase/CompleteRegistration, penangkapan UTM + simpan ke pesanan, meta-tag verifikasi domain Meta, pemecahan bundle (lazy-load admin), tombol WhatsApp di halaman belajar/konfirmasi, penyeragaman minimal password, dan menyimpan skema/RLS ke repo (butuh akses Supabase).
