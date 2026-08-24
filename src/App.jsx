import React, { useState, useMemo, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Menu, X, Search, ShoppingCart, Star, PlayCircle, Lock, Check, ChevronRight,
  ChevronDown, ChevronUp, User, LogOut, LayoutDashboard, Package, ClipboardList, Users,
  Tag, BarChart3, Settings, TrendingUp, DollarSign, ShoppingBag, Plus, Trash2,
  Pencil, ArrowRight, ArrowLeft, Sparkles, Eye, Filter, Music, Clock, Download,
  CreditCard, QrCode, Wallet, ShieldCheck, Youtube, Instagram, Copy, Upload, Landmark,
  Image as ImageIcon
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";

// Publishable key AMAN ditaruh di kode frontend (bukan rahasia) — akses data
// sesungguhnya dikontrol oleh RLS policy di database, bukan oleh key ini.
// Kunci rahasia (service_role) TIDAK BOLEH pernah ditaruh di sini.
const SUPABASE_URL = "https://addtajuxfoxcaezmkice.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_zc3y05OhRgEJQlum3x-brg_iehDElTb";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

/* ---------------- design tokens ---------------- */
const C = {
  bg: "#0B0A0F",
  surface: "#14111A",
  surface2: "#1C1723",
  border: "#2B2431",
  borderSoft: "#221D28",
  gold: "#C9A24B",
  goldLight: "#E7C57D",
  ember: "#B8432A",
  emberLight: "#D9613F",
  text: "#F3EEE3",
  muted: "#9A9184",
  mutedDark: "#6F6A62",
};

const rp = (n) => "Rp" + n.toLocaleString("id-ID");

const toEmbedUrl = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.includes("/embed/")) return url;
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch (e) { /* bukan URL valid */ }
  return null;
};

// Versi embed yang otomatis play. Browser hanya izinkan autoplay kalau videonya di-mute,
// jadi selalu tambahkan mute=1 — kalau tidak, video tidak akan autoplay sama sekali.
const toAutoplayEmbedUrl = (url) => {
  const base = toEmbedUrl(url);
  if (!base) return null;
  try {
    const u = new URL(base);
    if (u.hostname.includes("youtube.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      u.searchParams.set("autoplay", "1");
      u.searchParams.set("mute", "1");
      u.searchParams.set("loop", "1");
      u.searchParams.set("playlist", id);
      u.searchParams.set("rel", "0");
      u.searchParams.set("modestbranding", "1");
      u.searchParams.set("playsinline", "1");
      return u.toString();
    }
    if (u.hostname.includes("vimeo.com")) {
      u.searchParams.set("autoplay", "1");
      u.searchParams.set("muted", "1");
      u.searchParams.set("loop", "1");
      return u.toString();
    }
    return base;
  } catch (e) { return base; }
};
const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const formatDateID = (d) => `${d.getDate().toString().padStart(2, "0")} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
// Catatan: ID pesanan (format GS-YYYYMMDD-XXX) sekarang dibuat otomatis oleh database lewat
// sequence (lihat backend/schema.sql -> generate_order_id()), bukan dihitung di sini lagi —
// supaya tidak bentrok kalau ada beberapa customer checkout bersamaan.

/* ---------------- demo data ---------------- */
const CATEGORIES = [
  "Beginner Guitar", "Guitar Technique", "Melody", "Speed & Shredding",
  "Improvisation", "Music Theory", "Ebook", "Bundle",
];

// Judul materi (section header) di kurikulum video disimpan sebagai baris curriculum_videos biasa,
// ditandai lewat sentinel ini di kolom "duration" — supaya tidak perlu menambah kolom baru di database.
const SECTION_MARKER = "__section__";

const INITIAL_PRODUCTS = [
  {
    id: 1, slug: "secret-of-shredding", name: "Secret of Shredding",
    category: "Speed & Shredding", level: "Mahir", price: 297000, oldPrice: 597000,
    rating: 0, reviews: 0, sold: 0, badge: null,
    duration: "8 jam video", format: "Video Course + Tab PDF",
    hue: "#B8432A",
    desc: "Program latihan terstruktur untuk menguasai alternate picking, economy picking, dan speed building tanpa merusak teknik dasarmu.",
    benefits: ["Kecepatan picking naik terukur tiap minggu", "Teknik tangan kanan & kiri sinkron", "Latihan metronome bertahap 60-200 BPM", "Bebas tension & cedera saat bermain cepat"],
    learn: ["Alternate picking fundamental", "Economy picking & sweep dasar", "String skipping presisi", "3 lagu shred untuk latihan aplikatif"],
    bonus: "Ebook 40 Warm-up Wajib Sebelum Latihan (gratis, tanpa batas waktu)",
    // Tier harga real untuk landing page: berubah otomatis berdasar slot & waktu, bukan angka statis.
    pricingTiers: {
      founderPrice: 247000,   // harga spesial 100 pembeli pertama
      founderSlots: 100,
      earlyBirdPrice: 297000, // harga early bird setelah 100 slot founder habis
      regularPrice: 597000,   // harga asli setelah countdown early bird berakhir
      earlyBirdHours: 72,     // lama window early bird sejak kunjungan pertama user ke landing page
    },
  },
  {
    id: 2, slug: "fondasi-gitar-pemula", name: "Fondasi Gitar untuk Pemula",
    category: "Beginner Guitar", level: "Pemula", price: 149000, oldPrice: 249000,
    rating: 4.8, reviews: 980, sold: 3210, badge: "New",
    duration: "6 jam video", format: "Video Course + Chord Sheet",
    hue: "#C9A24B",
    desc: "Dari cara pegang gitar yang benar sampai bisa main lagu utuh — disusun untuk orang yang benar-benar belum pernah menyentuh gitar.",
    benefits: ["Belajar dari nol tanpa rasa canggung", "Chord dasar melekat lewat repetisi terarah", "Ritme strumming yang enak didengar", "Bisa mainkan lagu pertama di minggu ke-2"],
    learn: ["Anatomi gitar & tuning", "12 chord wajib pemula", "Strumming pattern populer", "Membaca chord chart"],
    bonus: "Playlist 20 lagu mudah untuk latihan (gratis, tanpa batas waktu)",
  },
  {
    id: 3, slug: "melodic-improvisation-blueprint", name: "Melodic Improvisation Blueprint",
    category: "Improvisation", level: "Menengah", price: 249000, oldPrice: 349000,
    rating: 4.7, reviews: 356, sold: 860, badge: null,
    duration: "7 jam video", format: "Video Course + Backing Track",
    hue: "#7C6BB0",
    desc: "Cara berimprovisasi yang terdengar musikal, bukan sekadar tangga nada dihafal — fokus pada phrasing dan storytelling di solo gitar.",
    benefits: ["Solo terasa bercerita, bukan latihan skala", "Paham target note di tiap perubahan chord", "Vocabulary lick makin luas", "Percaya diri jam session"],
    learn: ["Pentatonic beyond the box", "Target notes & chord tones", "Call and response phrasing", "Improvisasi di atas 12-bar blues"],
    bonus: "10 Backing Track eksklusif (gratis, tanpa batas waktu)",
  },
  {
    id: 4, slug: "teori-musik-praktis-gitaris", name: "Teori Musik Praktis untuk Gitaris",
    category: "Music Theory", level: "Semua Level", price: 129000, oldPrice: 179000,
    rating: 4.9, reviews: 640, sold: 1520, badge: null,
    duration: "5 jam video", format: "Video Course + Worksheet",
    hue: "#3E7D64",
    desc: "Teori musik yang langsung bisa dipraktikkan di fretboard, bukan hafalan istilah yang cepat dilupakan.",
    benefits: ["Paham kenapa suatu chord terdengar pas", "Bisa transpose lagu dengan cepat", "Mengerti scale-chord relationship", "Fondasi kuat untuk songwriting"],
    learn: ["Interval & tangga nada mayor", "Chord construction", "Diatonic harmony", "Circle of fifths di fretboard"],
    bonus: "Fretboard Map Cheat Sheet PDF (gratis, tanpa batas waktu)",
  },
  {
    id: 5, slug: "ebook-100-lick-legendaris", name: "Ebook 100 Lick Legendaris",
    category: "Ebook", level: "Menengah", price: 79000, oldPrice: 99000,
    rating: 4.6, reviews: 512, sold: 2040, badge: null,
    duration: "PDF 180 halaman", format: "Ebook + Tab + Audio Demo",
    hue: "#C9A24B",
    desc: "Kumpulan lick ikonik dari berbagai era rock & blues, lengkap dengan tab dan penjelasan konteks penggunaannya.",
    benefits: ["Vocabulary lick siap pakai", "Belajar dari frasa yang sudah teruji", "Referensi gaya berbagai gitaris legendaris", "Bisa dipraktikkan langsung sambil dengar audio demo"],
    learn: ["100 lick dengan tab lengkap", "Konteks harmoni tiap lick", "Variasi fingering", "Tips menggabungkan lick jadi solo"],
    bonus: "Audio backing untuk 20 lick pilihan (gratis, tanpa batas waktu)",
  },
  {
    id: 6, slug: "bundle-gitaris-lengkap", name: "Bundle Gitaris Lengkap",
    category: "Bundle", level: "Semua Level", price: 599000, oldPrice: 1199000,
    rating: 5.0, reviews: 210, sold: 410, badge: "Best Seller",
    duration: "26+ jam video", format: "5 Course + 2 Ebook",
    hue: "#B8432A",
    desc: "Semua course Gitar Sakti dalam satu paket — dari pemula sampai teknik lanjutan, dengan harga jauh lebih hemat.",
    benefits: ["Hemat lebih dari 50% dibanding beli satuan", "Jalur belajar lengkap pemula ke mahir", "Akses seluruh update materi mendatang", "Satu kali bayar, akses selamanya"],
    learn: ["Seluruh materi 5 course inti", "2 ebook referensi lick & teori", "Akses grup diskusi member", "Update materi berkala"],
    bonus: "Sesi review video pribadi (1x, gratis, tanpa batas waktu)",
  },
];

const TESTIMONIALS = [
  { name: "Raka Pratama", role: "Siswa Secret of Shredding", quote: "Progres picking saya paling terasa 3 bulan terakhir dibanding 2 tahun otodidak.", rating: 5 },
  { name: "Dinda Ayu", role: "Siswa Fondasi Gitar", quote: "Baru pertama pegang gitar, sekarang sudah berani main di depan teman-teman.", rating: 5 },
  { name: "Bagus Wirawan", role: "Siswa Bundle Gitaris Lengkap", quote: "Materinya runtut, enak diikuti pelan-pelan sambil kerja.", rating: 4.8 },
];

const FAQ_HOME = [
  { q: "Apakah materi bisa diakses selamanya?", a: "Ya. Setelah pembayaran terverifikasi, produk masuk ke akun kamu dan dapat diakses kapan saja tanpa batas waktu." },
  { q: "Apakah cocok untuk yang belum pernah pegang gitar?", a: "Cocok. Tersedia kategori Beginner Guitar yang disusun dari nol tanpa asumsi kemampuan sebelumnya." },
  { q: "Metode pembayaran apa saja yang tersedia?", a: "Transfer bank, QRIS, dan e-wallet, diproses melalui payment gateway sehingga akses produk terbuka otomatis setelah pembayaran berhasil." },
  { q: "Bagaimana jika ada kendala saat belajar?", a: "Kamu dapat menghubungi tim Gitar Sakti melalui WhatsApp yang tertera di halaman kontak." },
];

// Nilai awal (default) rekening tujuan pembayaran. Bisa diganti admin lewat
// Pengaturan → Rekening — perubahan tersimpan di localStorage lewat state `bankInfo` di App().
const DEFAULT_BANK_INFO = {
  bankName: "Bank BCA",
  accountNumber: "1234567890",
  accountHolder: "Nama Pemilik GitarSakti",
};


// Testimoni asli dari pembeli, dikelompokkan per productId. Kosong di awal — diisi lewat form
// "Tulis Ulasan" yang hanya muncul untuk pembeli yang benar-benar sudah memiliki produk tsb.
const INITIAL_TESTIMONIALS = {};

const DEMO_ORDERS = [];

const INITIAL_CURRICULUM = {
  1: [
    { title: "Pengenalan & Setting Awal", duration: "6:12" },
    { title: "Postur & Pegangan Pick yang Benar", duration: "9:40" },
    { title: "Alternate Picking Dasar (Fret Statis)", duration: "14:05" },
    { title: "Alternate Picking dengan Pergerakan Fret", duration: "16:22" },
    { title: "Latihan Metronome 60-100 BPM", duration: "11:18" },
    { title: "Chromatic Runs untuk Kecepatan", duration: "13:47" },
    { title: "Economy Picking Dasar", duration: "15:30" },
    { title: "Economy Picking Lanjutan", duration: "17:09" },
    { title: "String Skipping Presisi", duration: "12:54" },
    { title: "Sweep Picking Dasar (3 Senar)", duration: "18:21" },
    { title: "Sweep Picking Lanjutan (5-6 Senar)", duration: "20:03" },
    { title: "Legato & Hammer-on/Pull-off untuk Speed", duration: "16:47" },
    { title: "Menggabungkan Teknik dalam Satu Lick", duration: "19:15" },
    { title: "Studi Lagu 1 — Aplikasi Speed Picking", duration: "22:38" },
    { title: "Studi Lagu 2 & Evaluasi Akhir", duration: "24:10" },
  ],
};

const ADMIN_ORDERS = [];

const ADMIN_CUSTOMERS = [];

const DEFAULT_SITE_CONTENT = {
  home: {
    heroBadge: "Sudah dipercaya 8.200+ pelajar gitar di Indonesia",
    heroTitleLine: "KUASAI GITAR. KUASAI MELODI.",
    heroTitleHighlight: "JADI GITARIS",
    heroTitleEnd: "YANG KAMU IMPIKAN.",
    heroSubtitle: "Kursus video terstruktur dari fondasi dasar sampai teknik shredding lanjutan. Belajar sesuai ritme kamu, akses materi selamanya.",
    heroVideoUrl: "",
    heroCta1: "Lihat Semua Produk",
    heroCta2: "Lihat Contoh Materi",
    stat1Num: "8.200+", stat1Label: "Siswa aktif",
    stat2Num: "96%", stat2Label: "Rating positif",
    stat3Num: "6", stat3Label: "Kategori kursus",
    featuredEyebrow: "Pilihan Terpopuler", featuredTitle: "Produk Unggulan",
    featuredSub: "Kursus dan materi yang paling banyak dipilih siswa Gitar Sakti bulan ini.",
    categoryEyebrow: "Jelajahi", categoryTitle: "Kategori Belajar",
    categorySub: "Dari nol sampai teknik lanjutan, semua level tersedia.",
    whyEyebrow: "Kenapa Gitar Sakti", whyTitle: "Belajar dengan Jalur yang Jelas",
    whySub: "Struktur kurikulum mengikuti posisi fret 3, 5, 7, 9, dan 12 — titik penanda yang dikenal setiap gitaris.",
    whyItems: [
      { title: "Fret 3 — Fondasi kuat", desc: "Materi disusun bertahap, tidak melompat sebelum dasar benar-benar melekat." },
      { title: "Fret 5 — Latihan terarah", desc: "Setiap course punya target latihan mingguan yang jelas dan bisa diukur." },
      { title: "Fret 7 — Praktik nyata", desc: "Belajar lewat lagu dan backing track, bukan cuma teori di atas kertas." },
      { title: "Fret 9 — Akses selamanya", desc: "Satu kali beli, materi dapat diputar ulang kapan pun kamu butuh." },
      { title: "Fret 12 — Dari pemula ke mahir", desc: "Jalur lengkap dari chord pertama sampai teknik shredding lanjutan." },
    ],
    testimonialEyebrow: "Kata Mereka", testimonialTitle: "Cerita dari Siswa Gitar Sakti",
    faqEyebrow: "Sering Ditanyakan", faqTitle: "FAQ",
    ctaTitle: "SIAP MULAI PERJALANAN GITARMU?",
    ctaSub: "Pilih course pertama kamu hari ini dan mulai latihan terstruktur.",
    ctaButton: "Jelajahi Produk",
  },
  shop: {
    eyebrow: "Katalog",
    title: "SEMUA PRODUK",
  },
  header: {
    brandName: "GITAR SAKTI",
    navBeranda: "Beranda",
    navProduk: "Produk",
    navTentang: "Tentang",
  },
  footer: {
    description: "Platform edukasi gitar digital untuk pemula hingga mahir. Belajar terstruktur, akses selamanya.",
    instagramUrl: "https://instagram.com/",
    youtubeUrl: "https://youtube.com/",
    copyrightText: "© 2026 Gitar Sakti. Seluruh hak cipta dilindungi.",
  },
  about: {
    eyebrow: "Tentang Kami",
    title: "Gitar Sakti",
    sub: "Platform edukasi gitar digital yang dibangun untuk membantu siapa pun belajar gitar secara mandiri, terstruktur, dan bisa diukur progresnya.",
    body: "Kami percaya belajar gitar tidak harus mahal atau membingungkan. Setiap course di Gitar Sakti disusun oleh instruktur berpengalaman, dengan jalur belajar yang jelas dari fondasi dasar hingga teknik lanjutan seperti shredding dan improvisasi.",
    ctaLabel: "Mulai Belajar",
  },
};

const INITIAL_COUPONS = [
  { code: "MERDEKA25", type: "percent", value: 25, minPurchase: 150000, limit: 200, used: 84, expiry: "31 Agu 2026" },
  { code: "PEMULA20K", type: "fixed", value: 20000, minPurchase: 100000, limit: 500, used: 312, expiry: "30 Sep 2026" },
];

const REVENUE_7D = [];

const FUNNEL = [];

/* ---------------- small pieces ---------------- */

function StringDivider({ tight }) {
  const widths = [2, 1.6, 1.3, 1, 0.7, 0.5];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: tight ? 3 : 5, width: "100%" }}>
      {widths.map((w, i) => (
        <div key={i} style={{ height: w, width: "100%", background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`, opacity: 0.5 + i * 0.02 }} />
      ))}
    </div>
  );
}

function FretDot() {
  return <div style={{ width: 9, height: 9, borderRadius: "50%", background: C.gold, flexShrink: 0, marginTop: 4 }} />;
}

function StarRow({ rating, size = 13 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} fill={n <= Math.round(rating) ? C.gold : "none"} color={C.gold} strokeWidth={1.5} />
      ))}
    </div>
  );
}

function StarInput({ value, onChange, size = 20 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
          <Star size={size} fill={n <= value ? C.gold : "none"} color={C.gold} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

// Daftar ulasan asli + form pengiriman ulasan. Form hanya tampil untuk pembeli yang sudah
// memiliki produk (owned === true) — mencegah ulasan palsu dari yang belum pernah beli.
function TestimonialSection({ productId, owned, reviews, onSubmit, emptyLabel }) {
  const [rating, setRating] = useState(5);
  const [quote, setQuote] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!quote.trim()) return;
    onSubmit(productId, { rating, quote: quote.trim(), name: name.trim() || "Pembeli Terverifikasi" });
    setSubmitted(true);
    setQuote("");
    setName("");
    setRating(5);
  };

  return (
    <div>
      {reviews.length === 0 ? (
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.mutedDark, fontStyle: "italic" }}>{emptyLabel || "Belum ada ulasan. Jadilah yang pertama!"}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reviews.map((t) => (
            <Card key={t.id} style={{ padding: 16 }}>
              <StarRow rating={t.rating} />
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.text, marginTop: 8, marginBottom: 8, lineHeight: 1.6, fontStyle: "italic" }}>"{t.quote}"</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5, color: C.text }}>{t.name}</span>
                <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark }}>{t.date}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {owned && !submitted && (
        <Card style={{ padding: 16, marginTop: 14 }}>
          <h4 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.text, margin: "0 0 10px" }}>Tulis Ulasan Kamu</h4>
          <StarInput value={rating} onChange={setRating} />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama (tampil di ulasan)"
            style={{ width: "100%", marginTop: 10, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13, boxSizing: "border-box" }}
          />
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="Ceritakan pengalaman belajarmu..."
            rows={3}
            style={{ width: "100%", marginTop: 10, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
          />
          <div style={{ marginTop: 10 }}><PrimaryBtn small onClick={handleSubmit}>Kirim Ulasan</PrimaryBtn></div>
        </Card>
      )}
      {owned && submitted && (
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.gold, marginTop: 12 }}>Terima kasih! Ulasan kamu sudah tersimpan.</p>
      )}
    </div>
  );
}

function Badge({ children, tone = "gold" }) {
  const bg = tone === "gold" ? C.gold : tone === "ember" ? C.ember : C.surface2;
  const fg = tone === "muted" ? C.muted : "#141019";
  return (
    <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, background: bg, color: tone === "muted" ? C.muted : fg, border: tone === "muted" ? `1px solid ${C.border}` : "none" }}>
      {children}
    </span>
  );
}

function PrimaryBtn({ children, onClick, full, small, icon: Icon }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      background: `linear-gradient(180deg, ${C.goldLight}, ${C.gold})`, color: "#1A140A",
      border: "none", fontFamily: "'Manrope',sans-serif", fontWeight: 800,
      fontSize: small ? 13 : 14, padding: small ? "9px 16px" : "13px 24px",
      borderRadius: 8, cursor: "pointer", width: full ? "100%" : "auto", letterSpacing: 0.2,
    }}>
      {children}{Icon && <Icon size={16} />}
    </button>
  );
}

function GhostBtn({ children, onClick, full, small, icon: Icon }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      background: "transparent", color: C.text, border: `1px solid ${C.border}`,
      fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: small ? 13 : 14,
      padding: small ? "9px 16px" : "13px 24px", borderRadius: 8, cursor: "pointer",
      width: full ? "100%" : "auto",
    }}>
      {children}{Icon && <Icon size={16} />}
    </button>
  );
}

function Card({ children, style, onClick }) {
  return <div onClick={onClick} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, ...style }}>{children}</div>;
}

/* ---------------- inline editable text (admin mode) ---------------- */
function EditableText({ value, onSave, admin, tag = "span", style, area, block }) {
  const Tag = tag;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  if (!admin) return <Tag style={style}>{value}</Tag>;

  if (editing) {
    const InputTag = area ? "textarea" : "input";
    return (
      <span style={{ display: area || block ? "block" : "inline-flex", alignItems: "flex-start", gap: 6, width: area || block ? "100%" : "auto", margin: "2px 0" }}>
        <InputTag
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={area ? 3 : undefined}
          style={{
            ...style, background: C.surface2, border: `1px solid ${C.gold}`, borderRadius: 6,
            padding: "4px 8px", color: C.text, fontFamily: style?.fontFamily || "'Manrope',sans-serif",
            boxSizing: "border-box", width: area || block ? "100%" : Math.max(6, draft.length + 2) + "ch",
            resize: area ? "vertical" : undefined,
          }}
        />
        <span style={{ display: "flex", gap: 4, flexShrink: 0, marginTop: area || block ? 6 : 0 }}>
          <button onClick={() => { onSave(draft); setEditing(false); }} title="Simpan" style={{ background: C.gold, border: "none", borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Check size={13} color="#161019" /></button>
          <button onClick={() => { setDraft(value); setEditing(false); }} title="Batal" style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={13} color={C.muted} /></button>
        </span>
      </span>
    );
  }

  return (
    <span className="gs-editable" style={{ position: "relative", display: area || block ? "block" : "inline-block" }}>
      <Tag style={style}>{value}</Tag>
      <button onClick={() => setEditing(true)} className="gs-edit-pencil" title="Edit teks ini" style={{ position: "absolute", bottom: -8, right: -8, width: 22, height: 22, borderRadius: 6, background: C.gold, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.45)", zIndex: 5 }}>
        <Pencil size={11} color="#161019" />
      </button>
    </span>
  );
}

/* ---------------- product card ---------------- */
function ProductCard({ p, onOpen, onAdd, inCart, owned, pending, onAccess, videoProgress, curriculumData, role, onToggleStatus }) {
  const disc = Math.round((1 - p.price / p.oldPrice) * 100);
  const isAdmin = role === "admin";
  const status = p.status || "published";
  const curriculum = curriculumData?.[p.id];
  const completedCount = (videoProgress?.[p.id] || []).length;
  const pct = curriculum ? Math.round((completedCount / curriculum.length) * 100) : null;
  return (
    <Card style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div onClick={() => onOpen(p.slug)} style={{ cursor: "pointer", height: 148, background: `linear-gradient(135deg, ${p.hue}33, ${C.surface2})`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${C.border}` }}>
        <Music size={36} color={p.hue} strokeWidth={1.3} />
        {owned ? (
          <div style={{ position: "absolute", top: 10, left: 10 }}><Badge tone="gold">Dimiliki</Badge></div>
        ) : pending ? (
          <div style={{ position: "absolute", top: 10, left: 10 }}><Badge tone="ember">Menunggu Pembayaran</Badge></div>
        ) : p.badge && <div style={{ position: "absolute", top: 10, left: 10 }}><Badge tone={p.badge === "Best Seller" ? "ember" : "gold"}>{p.badge}</Badge></div>}
        {!owned && !pending && <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.55)", color: C.goldLight, fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6, fontFamily: "'JetBrains Mono',monospace" }}>-{disc}%</div>}
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Manrope',sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>{p.category}</span>
        <h3 onClick={() => onOpen(p.slug)} style={{ cursor: "pointer", fontFamily: "'Manrope',sans-serif", fontSize: 15.5, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.35 }}>{p.name}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StarRow rating={p.rating} />
          <span style={{ fontSize: 12, color: C.muted, fontFamily: "'Manrope',sans-serif" }}>{p.rating} ({p.reviews})</span>
        </div>
        {owned ? (
          curriculum ? (
            <div style={{ marginTop: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 999, background: C.surface2, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: C.gold, borderRadius: 999 }} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: C.goldLight, whiteSpace: "nowrap" }}>{pct}%</span>
              </div>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark }}>{completedCount}/{curriculum.length} video selesai</span>
            </div>
          ) : (
            <div style={{ marginTop: "auto" }} />
          )
        ) : pending ? (
          <div style={{ marginTop: "auto" }}>
            <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark }}>Pesanan sedang diverifikasi</span>
          </div>
        ) : (
          <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 16, color: C.goldLight }}>{rp(p.price)}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: C.mutedDark, textDecoration: "line-through" }}>{rp(p.oldPrice)}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
          {isAdmin ? (
            <>
              <GhostBtn small full onClick={() => onOpen(p.slug)} icon={Eye}>Detail</GhostBtn>
              {status === "archived" ? (
                <Badge tone="muted">Diarsipkan</Badge>
              ) : (
                <button onClick={() => onToggleStatus && onToggleStatus(p.id)} style={{ border: "none", cursor: "pointer", padding: 0, background: "none", flexShrink: 0 }} title="Klik untuk ubah status">
                  <Badge tone={status === "published" ? "gold" : "muted"}>{status === "published" ? "Publish" : "Draft"}</Badge>
                </button>
              )}
            </>
          ) : owned ? (
            <PrimaryBtn small full onClick={() => onAccess(p)} icon={PlayCircle}>Akses Produk</PrimaryBtn>
          ) : pending ? (
            <GhostBtn small full onClick={() => onOpen(p.slug)} icon={Clock}>Menunggu Pembayaran</GhostBtn>
          ) : (
            <>
              <GhostBtn small full onClick={() => onOpen(p.slug)}>Detail</GhostBtn>
              <PrimaryBtn small full onClick={() => onAdd(p.id)} icon={ShoppingCart}>{inCart ? "Ditambahkan" : "Keranjang"}</PrimaryBtn>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ---------------- header / footer ---------------- */
function Header({ view, go, goOrAuth, goToAuth, cartCount, role, accountName, mobileOpen, setMobileOpen, customPages, openCustomPage, customPageSlug, content, editMode, setEditMode, onSaveHeader, goToAddPage }) {
  const h = content || DEFAULT_SITE_CONTENT.header;
  const admin = role === "admin" && editMode;
  const navItem = (label, target, saveKey) => (
    admin ? (
      <span style={{ display: "inline-block" }}>
        <EditableText value={label} admin onSave={(v) => onSaveHeader({ [saveKey]: v })} tag="span" style={{ color: view === target ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 14 }} />
      </span>
    ) : (
      <button onClick={() => go(target)} style={{ background: "none", border: "none", color: view === target ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer", padding: "6px 2px" }}>{label}</button>
    )
  );
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(11,10,15,0.92)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${C.borderSoft}` }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div onClick={() => !admin && go("home")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: admin ? "default" : "pointer" }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: `linear-gradient(160deg, ${C.goldLight}, ${C.ember})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Music size={18} color="#161019" strokeWidth={2} />
          </div>
          {admin ? (
            <EditableText value={h.brandName} admin onSave={(v) => onSaveHeader({ brandName: v })} tag="span" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1, color: C.text }} />
          ) : (
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1, color: C.text }}>{h.brandName}</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "center" }} className="gs-desktop-nav">
          {navItem(h.navBeranda, "home", "navBeranda")}
          {navItem(h.navProduk, "shop", "navProduk")}
          {customPages && customPages.map((p) => (
            <button key={p.id} onClick={() => openCustomPage(p.slug)} style={{ background: "none", border: "none", color: view === "custompage" && customPageSlug === p.slug ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer", padding: "6px 2px" }}>{p.title}</button>
          ))}
          {role !== "admin" && navItem(h.navTentang, "about", "navTentang")}
          {role === "admin" && (
            <button onClick={goToAddPage} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px dashed ${C.border}`, borderRadius: 6, padding: "5px 9px", color: C.gold, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
              <Plus size={12} />Tambah Halaman
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {role === "admin" && (view === "home" || view === "about") && (
            <button
              onClick={() => setEditMode((v) => !v)}
              title="Mode Edit"
              style={{
                display: "flex", alignItems: "center", gap: 6, background: editMode ? C.gold : "none",
                border: `1px solid ${editMode ? C.gold : C.border}`, borderRadius: 8, padding: "7px 10px",
                cursor: "pointer", color: editMode ? "#161019" : C.text, fontFamily: "'Manrope',sans-serif",
                fontSize: 12.5, fontWeight: 700,
              }}
            >
              <Pencil size={13} />
              <span className="gs-desktop-nav">{editMode ? "Mode Edit: ON" : "Mode Edit"}</span>
            </button>
          )}
          {role !== "admin" && (
            <button onClick={() => goOrAuth("cart")} style={{ position: "relative", background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: "pointer" }}>
              <ShoppingCart size={17} color={C.text} />
              {cartCount > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: C.ember, color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 999, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace" }}>{cartCount}</span>}
            </button>
          )}
          {role ? (
            <button onClick={() => go(role === "admin" ? "admin" : "customer")} style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}>
              <User size={15} color={C.goldLight} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 700, color: C.text }} className="gs-desktop-nav">{role === "admin" ? "Admin" : accountName}</span>
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }} className="gs-desktop-nav">
              <GhostBtn small onClick={goToAuth}>Masuk</GhostBtn>
              <PrimaryBtn small onClick={goToAuth}>Daftar</PrimaryBtn>
            </div>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: "pointer" }} title="Menu halaman">
            {mobileOpen ? <X size={17} color={C.text} /> : <Menu size={17} color={C.text} />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div style={{ borderTop: `1px solid ${C.borderSoft}`, padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="gs-mobile-toggle" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {navItem(h.navBeranda, "home", "navBeranda")}
            {navItem(h.navProduk, "shop", "navProduk")}
            {customPages && customPages.map((p) => (
              <button key={p.id} onClick={() => { openCustomPage(p.slug); setMobileOpen(false); }} style={{ width: "100%", background: "none", border: "none", textAlign: "center", color: view === "custompage" && customPageSlug === p.slug ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer", padding: "6px 2px" }}>{p.title}</button>
            ))}
            {role !== "admin" && navItem(h.navTentang, "about", "navTentang")}
            {role === "admin" && (
              <button onClick={() => { goToAddPage(); setMobileOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: `1px dashed ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.gold, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", boxSizing: "border-box" }}>
                <Plus size={13} />Tambah Halaman
              </button>
            )}
          </div>
          {!role && <div className="gs-mobile-toggle" style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: `1px solid ${C.borderSoft}` }}><GhostBtn full small onClick={goToAuth}>Masuk</GhostBtn><PrimaryBtn full small onClick={goToAuth}>Daftar</PrimaryBtn></div>}
        </div>
      )}
    </div>
  );
}

function Footer({ go, content, admin, onSave }) {
  const f = content || DEFAULT_SITE_CONTENT.footer;
  return (
    <div style={{ borderTop: `1px solid ${C.borderSoft}`, marginTop: 60, padding: "40px 20px 24px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 32 }} className="gs-footer-grid">
        <div>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1, color: C.text }}>GITAR SAKTI</span>
          {admin ? (
            <EditableText value={f.description} admin onSave={(v) => onSave({ description: v })} tag="p" area style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginTop: 10, lineHeight: 1.6, maxWidth: 280 }} />
          ) : (
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginTop: 10, lineHeight: 1.6, maxWidth: 280 }}>{f.description}</p>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <a href={f.instagramUrl || "#"} target="_blank" rel="noreferrer" style={{ width: 32, height: 32, borderRadius: 8, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}><Instagram size={15} color={C.goldLight} /></a>
            <a href={f.youtubeUrl || "#"} target="_blank" rel="noreferrer" style={{ width: 32, height: 32, borderRadius: 8, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}><Youtube size={15} color={C.goldLight} /></a>
          </div>
        </div>
        {[
          { h: "Produk", items: ["Semua Produk", "Beginner Guitar", "Speed & Shredding", "Bundle"], target: "shop" },
          { h: "Perusahaan", items: ["Tentang Kami", "Blog", "FAQ", "Kontak"], target: "about" },
          { h: "Akun", items: ["Masuk", "Daftar", "Dashboard Saya"], target: "auth" },
        ].map((col) => (
          <div key={col.h}>
            <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.text }}>{col.h}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {col.items.map((it) => (
                <span key={it} onClick={() => go(col.target)} style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, cursor: "pointer" }}>{it}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 1180, margin: "28px auto 0", paddingTop: 18, borderTop: `1px solid ${C.borderSoft}`, fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        {admin ? (
          <EditableText value={f.copyrightText} admin onSave={(v) => onSave({ copyrightText: v })} tag="span" style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark }} />
        ) : (
          <span>{f.copyrightText}</span>
        )}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span onClick={() => go("privacy")} style={{ cursor: "pointer" }}>Kebijakan Privasi</span>
          <span onClick={() => go("terms")} style={{ cursor: "pointer" }}>Syarat & Ketentuan</span>
          <span onClick={() => go("refund")} style={{ cursor: "pointer" }}>Kebijakan Refund</span>
        </div>
      </div>
    </div>
  );
}

// Konten legal default. Belum bisa diedit lewat admin di prototipe ini — kalau perlu diedit,
// pola EditableText yang sudah dipakai di HomePage/Footer bisa dipasang di sini juga nanti.
const LEGAL_PAGES = {
  privacy: {
    title: "KEBIJAKAN PRIVASI",
    body: [
      "GitarSakti mengumpulkan data yang kamu berikan saat mendaftar dan checkout: nama, email, nomor WhatsApp, serta bukti transfer yang diunggah saat konfirmasi pembayaran.",
      "Data ini digunakan semata untuk memproses pesanan, memverifikasi pembayaran, dan memberikan akses ke produk yang kamu beli — tidak dijual atau dibagikan ke pihak ketiga untuk keperluan iklan.",
      "Bukti transfer yang kamu unggah hanya dapat dilihat oleh admin GitarSakti untuk keperluan verifikasi pembayaran.",
      "Kamu bisa menghubungi kami kapan saja untuk meminta data pribadimu dihapus dari sistem, selama tidak melanggar kewajiban pencatatan transaksi.",
    ],
  },
  terms: {
    title: "SYARAT & KETENTUAN",
    body: [
      "Dengan membeli produk di GitarSakti, kamu menyetujui bahwa seluruh materi (video, PDF, backing track) adalah untuk penggunaan pribadi dan tidak boleh dibagikan, dijual ulang, atau diunggah ulang ke platform lain.",
      "Akses ke materi diberikan setelah pembayaran diverifikasi oleh admin, biasanya dalam 1x24 jam pada hari kerja setelah bukti transfer diunggah.",
      "Harga yang tertera pada saat checkout adalah harga final yang berlaku untuk transaksi tersebut, termasuk apabila sedang berlaku harga promo/early bird.",
      "GitarSakti berhak menangguhkan akses akun yang terindikasi melakukan pelanggaran, termasuk pembagian materi tanpa izin.",
    ],
  },
  refund: {
    title: "KEBIJAKAN REFUND",
    body: [
      "Karena produk berupa materi digital yang langsung bisa diakses setelah pembayaran diverifikasi, pembelian yang sudah selesai secara umum tidak dapat dikembalikan (non-refundable).",
      "Pengecualian berlaku apabila terjadi kesalahan dari pihak GitarSakti, misalnya pembayaran sudah diverifikasi tetapi materi tidak dapat diakses karena kendala teknis dari sistem.",
      "Untuk kendala seperti itu, silakan hubungi admin melalui kontak yang tertera di halaman Tentang Kami dengan menyertakan Order ID, dan akan kami proses secepatnya.",
      "Pembatalan pesanan yang masih berstatus Menunggu (belum diverifikasi) bisa dilakukan dengan menghubungi admin sebelum bukti transfer diverifikasi.",
    ],
  },
};

function LegalPage({ slug, go }) {
  const page = LEGAL_PAGES[slug] || LEGAL_PAGES.terms;
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 20px 60px" }}>
      <button onClick={() => go("home")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
        <ArrowLeft size={15} /> Kembali
      </button>
      <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, color: C.text, margin: "0 0 20px" }}>{page.title}</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {page.body.map((p, i) => (
          <p key={i} style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted, lineHeight: 1.7, margin: 0 }}>{p}</p>
        ))}
      </div>
    </div>
  );
}

/* ---------------- section shell ---------------- */
function Section({ eyebrow, title, sub, children, id }) {
  return (
    <div id={id} style={{ maxWidth: 1180, margin: "0 auto", padding: "56px 20px" }}>
      <div style={{ maxWidth: 620, marginBottom: 32 }}>
        {eyebrow && <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: C.gold }}>{eyebrow}</span>}
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, letterSpacing: 0.5, color: C.text, margin: "8px 0 0" }}>{title}</h2>
        {sub && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14.5, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

/* ---------------- HOME ---------------- */
function HomePage({ go, openProduct, addToCart, cart, ownedIds, pendingIds, accessProduct, videoProgress, products, curriculumData, content, role, editMode, updateSiteContent, onToggleStatus }) {
  const home = content.home;
  const admin = role === "admin" && editMode;
  const onSaveHome = (patch) => updateSiteContent("home", patch);
  const [heroVideoEditing, setHeroVideoEditing] = useState(false);
  const [heroVideoDraft, setHeroVideoDraft] = useState(home.heroVideoUrl || "");
  const T = (key, area) => (admin ? <EditableText value={home[key]} admin onSave={(v) => onSaveHome({ [key]: v })} tag="span" area={area} /> : home[key]);
  const featured = (role === "admin" ? products : products.filter((p) => (p.status || "published") === "published")).slice(0, 3);
  return (
    <div>
      <div style={{ borderBottom: `1px solid ${C.borderSoft}`, background: `radial-gradient(1100px 500px at 80% -10%, ${C.ember}22, transparent)` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 20px 40px", display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 40, alignItems: "center" }} className="gs-hero-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <Sparkles size={14} color={C.gold} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, color: C.muted }}>{T("heroBadge")}</span>
            </div>
            <h1 className="gs-hero-title" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 56, lineHeight: 1.02, letterSpacing: 0.5, color: C.text, margin: 0 }}>
              {T("heroTitleLine")} <span style={{ color: C.goldLight }}>{T("heroTitleHighlight")}</span> {T("heroTitleEnd")}
            </h1>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15.5, color: C.muted, marginTop: 20, maxWidth: 480, lineHeight: 1.65 }}>
              {T("heroSubtitle", true)}
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <PrimaryBtn onClick={() => go("shop")} icon={ArrowRight}>{T("heroCta1")}</PrimaryBtn>
              <GhostBtn onClick={() => openProduct("secret-of-shredding")} icon={PlayCircle}>{T("heroCta2")}</GhostBtn>
            </div>
            <div style={{ marginTop: 36, maxWidth: 420 }}><StringDivider /></div>
            <div style={{ display: "flex", gap: 28, marginTop: 18, flexWrap: "wrap" }}>
              {[["stat1Num", "stat1Label"], ["stat2Num", "stat2Label"], ["stat3Num", "stat3Label"]].map(([nk, lk]) => (
                <div key={lk}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 20, color: C.goldLight }}>{T(nk)}</div>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{T(lk)}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: "relative", height: 380, borderRadius: 16, background: `linear-gradient(160deg, ${C.surface2}, ${C.bg})`, border: `1px solid ${C.border}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {home.heroVideoUrl && toEmbedUrl(home.heroVideoUrl) ? (
              <iframe
                key={home.heroVideoUrl}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                src={toAutoplayEmbedUrl(home.heroVideoUrl)}
                title="Video Gitar Sakti"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <>
                <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(90deg, ${C.border} 0, ${C.border} 1px, transparent 1px, transparent 46px)` }} />
                {[70, 130, 190, 250, 310].map((top) => (
                  <div key={top} style={{ position: "absolute", left: 0, right: 0, top, height: 1.3, background: `linear-gradient(90deg, transparent, ${C.gold}88, transparent)` }} />
                ))}
                <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
                  <Music size={64} color={C.goldLight} strokeWidth={1} />
                  <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, marginTop: 12 }}>Video course + tab interaktif</p>
                </div>
              </>
            )}

            {admin && (
              <div style={{ position: "absolute", bottom: 10, right: 10, zIndex: 6 }}>
                {heroVideoEditing ? (
                  <div style={{ display: "flex", gap: 6, background: "rgba(15,12,20,0.94)", padding: 8, borderRadius: 8, border: `1px solid ${C.gold}` }}>
                    <input
                      autoFocus
                      value={heroVideoDraft}
                      onChange={(e) => setHeroVideoDraft(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      style={{ width: 210, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 8px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, boxSizing: "border-box" }}
                    />
                    <button onClick={() => { onSaveHome({ heroVideoUrl: heroVideoDraft.trim() }); setHeroVideoEditing(false); }} title="Simpan" style={{ background: C.gold, border: "none", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><Check size={13} color="#161019" /></button>
                    <button onClick={() => { setHeroVideoDraft(home.heroVideoUrl || ""); setHeroVideoEditing(false); }} title="Batal" style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><X size={13} color={C.muted} /></button>
                  </div>
                ) : (
                  <button onClick={() => { setHeroVideoDraft(home.heroVideoUrl || ""); setHeroVideoEditing(true); }} title={home.heroVideoUrl ? "Ganti video YouTube" : "Tautkan video YouTube"} style={{ width: 28, height: 28, borderRadius: 8, background: C.gold, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.45)" }}>
                    <Pencil size={13} color="#161019" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Section eyebrow={T("featuredEyebrow")} title={T("featuredTitle")} sub={T("featuredSub", true)}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }} className="gs-grid-3">
          {featured.map((p) => <ProductCard key={p.id} p={p} onOpen={openProduct} onAdd={addToCart} inCart={cart.includes(p.id)} owned={ownedIds.includes(p.id)} pending={pendingIds?.includes(p.id)} onAccess={accessProduct} videoProgress={videoProgress} curriculumData={curriculumData} role={role} onToggleStatus={onToggleStatus} />)}
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <PrimaryBtn onClick={() => go("shop")} icon={ArrowRight}>Jelajahi Produk</PrimaryBtn>
        </div>
      </Section>

      <div style={{ borderTop: `1px solid ${C.borderSoft}`, borderBottom: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <Section eyebrow={T("categoryEyebrow")} title={T("categoryTitle")} sub={T("categorySub", true)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }} className="gs-grid-4">
            {CATEGORIES.map((c) => (
              <div key={c} onClick={() => go("shop")} style={{ cursor: "pointer", padding: "18px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.text }}>{c}</span>
                <ChevronRight size={15} color={C.gold} />
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section eyebrow={T("whyEyebrow")} title={T("whyTitle")} sub={T("whySub", true)}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 22 }} className="gs-grid-2">
          {home.whyItems.map((item, idx) => {
            const saveItem = (field, v) => onSaveHome({ whyItems: home.whyItems.map((it, i) => (i === idx ? { ...it, [field]: v } : it)) });
            return (
              <div key={idx} style={{ display: "flex", gap: 12 }}>
                <FretDot />
                <div>
                  {admin ? (
                    <EditableText value={item.title} admin onSave={(v) => saveItem("title", v)} tag="h4" style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, margin: 0 }} />
                  ) : (
                    <h4 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, margin: 0 }}>{item.title}</h4>
                  )}
                  {admin ? (
                    <EditableText value={item.desc} admin onSave={(v) => saveItem("desc", v)} tag="p" area style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginTop: 6, lineHeight: 1.6 }} />
                  ) : (
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>{item.desc}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <div style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <Section eyebrow={T("testimonialEyebrow")} title={T("testimonialTitle")}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }} className="gs-grid-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} style={{ padding: 20 }}>
                <StarRow rating={t.rating} />
                <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.text, marginTop: 12, lineHeight: 1.6 }}>"{t.quote}"</p>
                <div style={{ marginTop: 16, fontFamily: "'Manrope',sans-serif" }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{t.role}</div>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      </div>

      <Section eyebrow={T("faqEyebrow")} title={T("faqTitle")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQ_HOME.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </Section>

      <div style={{ borderTop: `1px solid ${C.borderSoft}` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "56px 20px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: C.text, margin: 0 }}>{T("ctaTitle")}</h2>
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted, marginTop: 10 }}>{T("ctaSub", true)}</p>
          <div style={{ marginTop: 20 }}><PrimaryBtn onClick={() => go("shop")} icon={ArrowRight}>{T("ctaButton")}</PrimaryBtn></div>
        </div>
      </div>

      <Footer go={go} content={content.footer} admin={admin} onSave={(patch) => updateSiteContent("footer", patch)} />
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", background: C.surface, border: "none", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, textAlign: "left" }}>{q}</span>
        <ChevronDown size={16} color={C.gold} style={{ transform: open ? "rotate(180deg)" : "none", flexShrink: 0, marginLeft: 12 }} />
      </button>
      {open && <div style={{ padding: "0 16px 16px" }}><p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, lineHeight: 1.6, margin: 0 }}>{a}</p></div>}
    </div>
  );
}

/* ---------------- SHOP ---------------- */
function ShopPage({ go, openProduct, addToCart, cart, ownedIds, pendingIds, accessProduct, videoProgress, products, curriculumData, content, role, onToggleStatus }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Semua");
  const [sort, setSort] = useState("Terbaru");
  const isAdmin = role === "admin";

  const filtered = useMemo(() => {
    let list = isAdmin ? products.slice() : products.filter((p) => (p.status || "published") === "published");
    list = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    if (cat !== "Semua") list = list.filter((p) => p.category === cat);
    if (sort === "Harga Terendah") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "Harga Tertinggi") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "Terlaris") list = [...list].sort((a, b) => b.sold - a.sold);
    if (sort === "Rating") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [q, cat, sort, products, isAdmin]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 20px 60px" }}>
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: C.gold }}>{content.shop.eyebrow}</span>
        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, color: C.text, margin: "6px 0 0" }}>{content.shop.title}</h1>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px" }}>
          <Search size={15} color={C.muted} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk..." style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, width: "100%" }} />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13 }}>
          <option>Semua</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13 }}>
          {["Terbaru", "Terlaris", "Harga Terendah", "Harga Tertinggi", "Rating"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, marginBottom: 16 }}>{filtered.length} produk ditemukan</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }} className="gs-grid-3">
        {filtered.map((p) => <ProductCard key={p.id} p={p} onOpen={openProduct} onAdd={addToCart} inCart={cart.includes(p.id)} owned={ownedIds.includes(p.id)} pending={pendingIds?.includes(p.id)} onAccess={accessProduct} videoProgress={videoProgress} curriculumData={curriculumData} role={role} onToggleStatus={onToggleStatus} />)}
      </div>
      {filtered.length === 0 && <p style={{ fontFamily: "'Manrope',sans-serif", color: C.muted, textAlign: "center", padding: 40 }}>Tidak ada produk yang cocok dengan pencarianmu.</p>}
    </div>
  );
}

/* ---------------- PRODUCT DETAIL ---------------- */
function ProductPage({ slug, go, addToCart, cart, ownedIds, pendingIds, accessProduct, videoProgress, products, curriculumData, testimonials, addTestimonial, role, onToggleStatus }) {
  const p = products.find((x) => x.slug === slug) || products[0];
  const related = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 3);
  const disc = Math.round((1 - p.price / p.oldPrice) * 100);
  const isAdmin = role === "admin";
  const [previewBuyer, setPreviewBuyer] = useState(false);
  const showAdminControls = isAdmin && !previewBuyer;
  const status = p.status || "published";
  const owned = ownedIds.includes(p.id) || (isAdmin && previewBuyer);
  const pending = pendingIds?.includes(p.id);
  const productReviews = testimonials[p.id] || [];
  // Rating & jumlah ulasan dihitung dari ulasan asli. Kalau belum ada ulasan sama sekali,
  // pakai angka statis dari data produk (masih dipakai untuk produk lama yang sudah punya histori).
  const liveRating = productReviews.length > 0 ? productReviews.reduce((s, t) => s + t.rating, 0) / productReviews.length : p.rating;
  const liveReviewCount = productReviews.length > 0 ? productReviews.length : p.reviews;
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, marginBottom: 20 }}>
        <span onClick={() => go("home")} style={{ cursor: "pointer" }}>Beranda</span><ChevronRight size={12} />
        <span onClick={() => go("shop")} style={{ cursor: "pointer" }}>Produk</span><ChevronRight size={12} />
        <span style={{ color: C.text }}>{p.name}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr", gap: 32 }} className="gs-hero-grid">
        <div>
          {(() => {
            const embedUrl = toEmbedUrl(p.previewVideo);
            if (embedUrl) {
              return (
                <div>
                  <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, background: C.surface2 }}>
                    <iframe
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                      src={embedUrl}
                      title={`${p.name} - Video Preview`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                  <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, marginTop: 8 }}>
                    Video tidak muncul? <a href={p.previewVideo} target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>Buka di tab baru ↗</a>
                  </p>
                </div>
              );
            }
            if (p.previewVideo) {
              return (
                <a href={p.previewVideo} target="_blank" rel="noopener noreferrer" style={{ display: "flex", textDecoration: "none", height: 300, borderRadius: 14, background: `linear-gradient(135deg, ${p.hue}33, ${C.surface2})`, border: `1px solid ${C.border}`, alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <PlayCircle size={56} color={C.goldLight} strokeWidth={1.2} />
                  <div style={{ position: "absolute", bottom: 14, left: 14 }}><Badge tone="muted">Tonton Preview ↗</Badge></div>
                </a>
              );
            }
            return (
              <div style={{ height: 300, borderRadius: 14, background: `linear-gradient(135deg, ${p.hue}33, ${C.surface2})`, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <PlayCircle size={56} color={C.goldLight} strokeWidth={1.2} />
                <div style={{ position: "absolute", bottom: 14, left: 14 }}><Badge tone="muted">Video Preview</Badge></div>
              </div>
            );
          })()}

          <div style={{ marginTop: 22 }}>
            {p.badge && <Badge tone={p.badge === "Best Seller" ? "ember" : "gold"}>{p.badge}</Badge>}
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, color: C.text, margin: "10px 0 8px" }}>{p.name.toUpperCase()}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <StarRow rating={liveRating} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted }}>{liveReviewCount > 0 ? `${liveRating.toFixed(1)} · ${liveReviewCount} ulasan · ` : ""}{p.sold} terjual</span>
            </div>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14.5, color: C.muted, lineHeight: 1.7, marginTop: 16, maxWidth: 620 }}>{p.desc}</p>
          </div>

          {p.learn && p.learn.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: C.text }}>Yang akan kamu pelajari</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }} className="gs-grid-2">
                {p.learn.map((l) => (
                  <div key={l} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Check size={15} color={C.gold} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.text }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {p.benefits && p.benefits.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: C.text }}>Manfaat</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {p.benefits.map((b) => (
                  <div key={b} style={{ display: "flex", gap: 10 }}><FretDot /><span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted }}>{b}</span></div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>Ulasan Pembeli</h3>
            <TestimonialSection
              productId={p.id}
              owned={owned}
              reviews={productReviews}
              onSubmit={addTestimonial}
              emptyLabel="Belum ada ulasan untuk produk ini. Jadilah pembeli pertama yang berbagi pengalaman!"
            />
          </div>

          {related.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>Produk terkait</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }} className="gs-grid-3">
                {related.map((r) => <ProductCard key={r.id} p={r} onOpen={(s) => go("product", s)} onAdd={addToCart} inCart={cart.includes(r.id)} owned={ownedIds.includes(r.id)} pending={pendingIds?.includes(r.id)} onAccess={accessProduct} videoProgress={videoProgress} curriculumData={curriculumData} role={role} onToggleStatus={onToggleStatus} />)}
              </div>
            </div>
          )}
        </div>

        <div>
          <Card style={{ padding: 20, position: "sticky", top: 90 }}>
            {isAdmin && previewBuyer && (
              <button onClick={() => setPreviewBuyer(false)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 14 }}>
                <ArrowLeft size={13} color={C.gold} />
                <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 700, color: C.gold }}>Kembali ke Mode Admin</span>
              </button>
            )}
            {showAdminControls ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 24, color: C.goldLight }}>{rp(p.price)}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.mutedDark, textDecoration: "line-through" }}>{rp(p.oldPrice)}</span>
                </div>
                {status === "archived" ? (
                  <Badge tone="muted">Diarsipkan</Badge>
                ) : (
                  <button onClick={() => onToggleStatus && onToggleStatus(p.id)} style={{ border: "none", cursor: "pointer", padding: 0, background: "none" }} title="Klik untuk ubah status">
                    <Badge tone={status === "published" ? "gold" : "muted"}>{status === "published" ? "Publish" : "Draft"}</Badge>
                  </button>
                )}
              </div>
            ) : owned ? (
              (() => {
                const curriculum = curriculumData[p.id];
                const completedCount = (videoProgress?.[p.id] || []).length;
                const pct = curriculum ? Math.round((completedCount / curriculum.length) * 100) : null;
                return curriculum ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, height: 8, borderRadius: 999, background: C.surface2, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: C.gold, borderRadius: 999 }} />
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: C.goldLight, whiteSpace: "nowrap" }}>{pct}%</span>
                    </div>
                    <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{completedCount}/{curriculum.length} video selesai</span>
                  </div>
                ) : null;
              })()
            ) : pending ? (
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 24, color: C.goldLight }}>{rp(p.price)}</span>
                </div>
                <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.ember, fontWeight: 700 }}>Menunggu verifikasi pembayaran</span>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 24, color: C.goldLight }}>{rp(p.price)}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.mutedDark, textDecoration: "line-through" }}>{rp(p.oldPrice)}</span>
                </div>
                <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.ember, fontWeight: 700 }}>Hemat {disc}%</span>
              </>
            )}

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, fontFamily: "'Manrope',sans-serif", fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Level</span><span style={{ color: C.text }}>{p.level}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Durasi</span><span style={{ color: C.text }}>{p.duration}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Format</span><span style={{ color: C.text, textAlign: "right" }}>{p.format}</span></div>
            </div>

            {!owned && !pending && p.bonus && (
              <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
                <Sparkles size={15} color={C.gold} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}><b style={{ color: C.text }}>Bonus:</b> {p.bonus}</span>
              </div>
            )}

            {showAdminControls ? (
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                <PrimaryBtn full onClick={() => setPreviewBuyer(true)} icon={Eye}>Lihat Tampilan Pembeli</PrimaryBtn>
              </div>
            ) : owned ? (
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: C.surface2, border: `1px solid ${C.gold}` }}>
                  <Check size={15} color={C.gold} />
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, color: C.goldLight }}>Kamu sudah memiliki produk ini</span>
                </div>
                <PrimaryBtn full onClick={() => accessProduct(p)} icon={PlayCircle}>Akses Produk</PrimaryBtn>
              </div>
            ) : pending ? (
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: C.surface2, border: `1px solid ${C.ember}` }}>
                  <Clock size={15} color={C.emberLight} />
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, color: C.emberLight }}>Pesananmu sedang menunggu verifikasi pembayaran</span>
                </div>
                <GhostBtn full onClick={() => go("customer")} icon={ClipboardList}>Lihat Status Pesanan</GhostBtn>
              </div>
            ) : (
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                <PrimaryBtn full onClick={() => { if (addToCart(p.id)) go("checkout"); }}>Beli Sekarang</PrimaryBtn>
                <GhostBtn full onClick={() => addToCart(p.id)} icon={ShoppingCart}>{cart.includes(p.id) ? "Sudah di Keranjang" : "Tambah ke Keranjang"}</GhostBtn>
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={14} color={C.muted} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark }}>Akses otomatis terbuka setelah pembayaran terverifikasi</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------------- CART ---------------- */
function CartPage({ go, cartProducts, removeFromCart, coupon, setCoupon, coupons, calcDiscount }) {
  const subtotal = cartProducts.reduce((s, p) => s + p.price, 0);
  const discount = calcDiscount(subtotal, coupon);
  const total = subtotal - discount;
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState("");

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    const found = coupons.find((c) => c.code.toUpperCase() === code);
    if (!found) { setCoupon(null); setCouponMsg("Kode kupon tidak valid."); return; }
    if (found.minPurchase && subtotal < found.minPurchase) {
      setCoupon(null); setCouponMsg(`Minimum belanja untuk kupon ini ${rp(found.minPurchase)}.`); return;
    }
    setCoupon(found.code);
    setCouponMsg(found.type === "percent" ? `Kupon ${found.code} diterapkan — diskon ${found.value}%.` : `Kupon ${found.code} diterapkan — diskon ${rp(found.value)}.`);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 20px 60px" }}>
      <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: C.text, margin: "0 0 24px" }}>KERANJANG BELANJA</h1>
      {cartProducts.length === 0 ? (
        <Card style={{ padding: 40, textAlign: "center" }}>
          <ShoppingCart size={32} color={C.muted} style={{ margin: "0 auto" }} />
          <p style={{ fontFamily: "'Manrope',sans-serif", color: C.muted, marginTop: 12 }}>Keranjang kamu masih kosong.</p>
          <div style={{ marginTop: 16 }}><PrimaryBtn onClick={() => go("shop")}>Jelajahi Produk</PrimaryBtn></div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }} className="gs-hero-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cartProducts.map((p) => (
              <Card key={p.id} style={{ padding: 14, display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: 8, background: `linear-gradient(135deg, ${p.hue}33, ${C.surface2})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Music size={22} color={p.hue} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text }}>{p.name}</div>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{p.category} · Qty 1 (produk digital)</div>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.goldLight, fontSize: 14 }}>{rp(p.price)}</div>
                <button onClick={() => removeFromCart(p.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={16} color={C.muted} /></button>
              </Card>
            ))}
          </div>
          <div>
            <Card style={{ padding: 18 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, margin: 0 }}>Ringkasan Pesanan</h3>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Kode kupon" style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13 }} />
                <GhostBtn small onClick={applyCoupon}>Pakai</GhostBtn>
              </div>
              {couponMsg && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: coupon ? C.gold : C.ember, marginTop: 6 }}>{couponMsg}</p>}
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, fontFamily: "'Manrope',sans-serif", fontSize: 13.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Subtotal</span><span style={{ color: C.text }}>{rp(subtotal)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Diskon</span><span style={{ color: discount ? C.gold : C.text }}>-{rp(discount)}</span></div>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}><span style={{ color: C.text, fontWeight: 700 }}>Total</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.goldLight }}>{rp(total)}</span></div>
              </div>
              <div style={{ marginTop: 16 }}><PrimaryBtn full onClick={() => go("checkout")} icon={ArrowRight}>Checkout</PrimaryBtn></div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- CHECKOUT ---------------- */
function CheckoutPage({ go, cartProducts, coupon, setCoupon, coupons, clearCart, addOrder, calcDiscount, goToPaymentConfirm, account }) {
  const subtotal = cartProducts.reduce((s, p) => s + p.price, 0);
  const discount = calcDiscount(subtotal, coupon);
  const total = subtotal - discount;
  const [form, setForm] = useState({ name: account.name, phone: account.phone });
  const [method, setMethod] = useState("bank");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const methodLabel = { qris: "QRIS", bank: "Transfer Bank", ewallet: "E-Wallet" };
  const [couponInput, setCouponInput] = useState(coupon || "");
  const [couponMsg, setCouponMsg] = useState("");

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setCoupon(null); setCouponMsg(""); return; }
    const found = coupons.find((c) => c.code.toUpperCase() === code);
    if (!found) { setCoupon(null); setCouponMsg("Kode kupon tidak valid."); return; }
    if (found.minPurchase && subtotal < found.minPurchase) {
      setCoupon(null); setCouponMsg(`Minimum belanja untuk kupon ini ${rp(found.minPurchase)}.`); return;
    }
    setCoupon(found.code);
    setCouponMsg(found.type === "percent" ? `Kupon ${found.code} diterapkan — diskon ${found.value}%.` : `Kupon ${found.code} diterapkan — diskon ${rp(found.value)}.`);
  };

  const placeOrder = async () => {
    if (!form.name.trim() || !form.phone.trim()) { setError("Lengkapi nama dan nomor WhatsApp terlebih dahulu."); return; }
    if (cartProducts.length === 0) { setError("Keranjang kosong."); return; }
    setError("");
    setSubmitting(true);
    const result = await addOrder({
      cartProducts,
      total,
      discount,
      couponCode: coupon || null,
      // Midtrans belum terhubung — semua pesanan masuk sebagai Pending dan diverifikasi manual
      // oleh admin setelah customer mengunggah bukti transfer.
      method: methodLabel[method],
      customerName: form.name.trim(),
      // Email dikunci ke akun yang sedang login (bukan input bebas) supaya pesanan selalu
      // tercatat ke akun yang benar dan tidak bisa dipalsukan ke email orang lain.
      customerEmail: account.email,
      customerPhone: form.phone.trim(),
    });
    setSubmitting(false);
    if (!result.ok) { setError(result.error || "Gagal membuat pesanan. Coba lagi."); return; }
    clearCart();
    goToPaymentConfirm(result.orderId);
  };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 20px 60px" }}>
      <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: C.text, margin: "0 0 24px" }}>CHECKOUT</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }} className="gs-hero-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card style={{ padding: 18 }}>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Informasi Pelanggan</h3>
            {[["name", "Nama Lengkap"], ["phone", "Nomor WhatsApp"]].map(([k, l]) => (
              <div key={k} style={{ marginTop: 12 }}>
                <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{l}</label>
                <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Email</label>
              <input value={account.email} disabled style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.mutedDark, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box", cursor: "not-allowed" }} />
            </div>
          </Card>

          <Card style={{ padding: 18 }}>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Metode Pembayaran</h3>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: -4 }}>Saat ini pembayaran diverifikasi manual oleh admin via transfer bank. Setelah pesanan dibuat, kamu akan diarahkan ke halaman konfirmasi untuk melihat rekening tujuan dan mengunggah bukti transfer.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {[["qris", "QRIS", QrCode], ["bank", "Transfer Bank", CreditCard], ["ewallet", "E-Wallet", Wallet]].map(([id, label, Icon]) => (
                <div key={id} onClick={() => setMethod(id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, border: `1px solid ${method === id ? C.gold : C.border}`, background: method === id ? C.surface2 : "transparent", cursor: "pointer" }}>
                  <Icon size={17} color={method === id ? C.goldLight : C.muted} />
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.text, fontWeight: method === id ? 700 : 500 }}>{label}</span>
                  {method === id && <Check size={15} color={C.gold} style={{ marginLeft: "auto" }} />}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card style={{ padding: 18, position: "sticky", top: 90 }}>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Ringkasan Pesanan</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cartProducts.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Manrope',sans-serif", fontSize: 13 }}>
                  <span style={{ color: C.muted }}>{p.name}</span><span style={{ color: C.text }}>{rp(p.price)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Kode kupon" style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13, boxSizing: "border-box" }} />
              <GhostBtn small onClick={applyCoupon}>Pakai</GhostBtn>
            </div>
            {couponMsg && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: coupon ? C.gold : C.ember, marginTop: 6 }}>{couponMsg}</p>}
            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8, fontFamily: "'Manrope',sans-serif", fontSize: 13.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Subtotal</span><span style={{ color: C.text }}>{rp(subtotal)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Diskon{coupon ? ` (${coupon})` : ""}</span><span style={{ color: discount ? C.gold : C.text }}>-{rp(discount)}</span></div>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}><span style={{ color: C.text, fontWeight: 700 }}>Total Bayar</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.goldLight }}>{rp(total)}</span></div>
            </div>
            {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, marginTop: 10 }}>{error}</p>}
            <div style={{ marginTop: 16 }}><PrimaryBtn full onClick={placeOrder}>{submitting ? "Memproses..." : "Buat Pesanan"}</PrimaryBtn></div>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, marginTop: 10, lineHeight: 1.5 }}>Setelah pesanan dibuat, kamu akan diarahkan ke halaman konfirmasi pembayaran. Produk masuk ke akunmu setelah admin memverifikasi bukti transfer.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CopyableField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { /* clipboard tidak tersedia — abaikan */ }
  };
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
      <div>
        <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}>{label}</div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 700, color: C.text, marginTop: 2 }}>{value}</div>
      </div>
      <button onClick={handleCopy} style={{ display: "flex", alignItems: "center", gap: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: copied ? C.gold : C.muted }}>
        <Copy size={12} />{copied ? "Tersalin" : "Salin"}
      </button>
    </div>
  );
}

// Form admin untuk mengganti rekening tujuan pembayaran. Perubahan langsung dipakai oleh
// halaman konfirmasi pembayaran customer (PaymentConfirmationPage) begitu disimpan.
function BankInfoForm({ bankInfo, onSave }) {
  const [bankName, setBankName] = useState(bankInfo.bankName);
  const [accountNumber, setAccountNumber] = useState(bankInfo.accountNumber);
  const [accountHolder, setAccountHolder] = useState(bankInfo.accountHolder);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setError("Semua kolom wajib diisi.");
      setSaved(false);
      return;
    }
    setError("");
    onSave({ bankName: bankName.trim(), accountNumber: accountNumber.trim(), accountHolder: accountHolder.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 480 }}>
      <Card style={{ padding: 18 }}>
        <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginTop: 0 }}>Form Rekening</h3>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: -6, marginBottom: 14 }}>Rekening ini ditampilkan ke customer di halaman konfirmasi pembayaran setelah checkout.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Nama Bank</label>
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Contoh: Bank BCA" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Nomor Rekening</label>
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Contoh: 1234567890" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Atas Nama</label>
            <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Contoh: Nama Pemilik Rekening" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
          </div>
        </div>

        {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, marginTop: 10 }}>{error}</p>}
        {saved && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.gold, marginTop: 10 }}>Rekening berhasil disimpan.</p>}
        <div style={{ marginTop: 14 }}><PrimaryBtn onClick={handleSave} icon={Check}>Simpan Rekening</PrimaryBtn></div>
      </Card>

      <Card style={{ padding: 18 }}>
        <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, color: C.text, marginTop: 0, marginBottom: 10 }}>Pratinjau di Halaman Customer</h3>
        <CopyableField label="Bank" value={bankName || "-"} />
        <CopyableField label="Nomor Rekening" value={accountNumber || "-"} />
        <CopyableField label="Atas Nama" value={accountHolder || "-"} />
      </Card>
    </div>
  );
}

// Form ganti kata sandi admin. Perlu memasukkan kata sandi lama sebelum bisa mengganti ke yang baru.
function AdminPasswordForm({ onChangePassword }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (next !== confirm) { setError("Konfirmasi kata sandi baru tidak cocok."); setSaved(false); return; }
    const result = onChangePassword(current, next);
    if (!result.ok) { setError(result.error); setSaved(false); return; }
    setError(""); setSaved(true);
    setCurrent(""); setNext(""); setConfirm("");
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Card style={{ padding: 20, maxWidth: 420 }}>
      <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginTop: 0 }}>Ganti Kata Sandi Admin</h3>
      <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: -6, marginBottom: 14 }}>Kata sandi ini dipakai untuk masuk sebagai Admin. Jaga baik-baik dan jangan dibagikan.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Kata Sandi Saat Ini</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Kata Sandi Baru</label>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Konfirmasi Kata Sandi Baru</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
        </div>
      </div>
      {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, marginTop: 10 }}>{error}</p>}
      {saved && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.gold, marginTop: 10 }}>Kata sandi berhasil diganti.</p>}
      <div style={{ marginTop: 14 }}><PrimaryBtn onClick={handleSave} icon={Check}>Simpan Kata Sandi Baru</PrimaryBtn></div>
    </Card>
  );
}

// Tombol reset butuh konfirmasi dua langkah supaya tidak ke-tap tanpa sengaja — aksi ini
// menghapus data permanen dari localStorage.
function ResetDataButton({ onReset }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return <GhostBtn onClick={() => setConfirming(true)} icon={Trash2}>Reset Semua Data</GhostBtn>;
  }
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <GhostBtn onClick={() => setConfirming(false)}>Batal</GhostBtn>
      <PrimaryBtn onClick={onReset} icon={Trash2}>Ya, Hapus Semua Data</PrimaryBtn>
    </div>
  );
}

// Halaman konfirmasi pembayaran — tujuan setelah checkout. Menampilkan info rekening tujuan
// dan form upload bukti transfer. Bukti yang diunggah tersimpan di order dan bisa dilihat
// admin di menu Pesanan untuk verifikasi manual (karena Midtrans belum terhubung).
// Menampilkan bukti transfer yang tersimpan di Storage privat — perlu signed URL
// (tidak bisa diakses lewat URL publik langsung), jadi diambil async lewat komponen ini.
function ProofImage({ path, alt, style }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let active = true;
    if (!path) return;
    supabase.storage.from("payment-proofs").createSignedUrl(path, 3600).then(({ data }) => {
      if (active && data) setUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [path]);
  if (!url) {
    return <div style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", background: C.surface2, color: C.mutedDark, fontFamily: "'Manrope',sans-serif", fontSize: 12 }}>Memuat gambar...</div>;
  }
  return <img src={url} alt={alt || "Bukti transfer"} style={style} />;
}

function PaymentConfirmationPage({ go, order, attachPaymentProof, bankInfo, goToCustomerOverview }) {
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  if (!order) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted }}>Pesanan tidak ditemukan.</p>
        <div style={{ marginTop: 16 }}><PrimaryBtn onClick={() => go("shop")}>Kembali ke Produk</PrimaryBtn></div>
      </div>
    );
  }

  const alreadySubmitted = !!order.proofImage;

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("File harus berupa gambar (JPG/PNG)."); return; }
    if (f.size > 5 * 1024 * 1024) { setError("Ukuran file maksimal 5MB."); return; }
    setError("");
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (!file) { setError("Unggah bukti transfer terlebih dahulu."); return; }
    setError("");
    setSubmitting(true);
    const result = await attachPaymentProof(order.id, file, note.trim());
    setSubmitting(false);
    if (!result.ok) { setError(result.error || "Gagal mengunggah bukti. Coba lagi."); return; }
    setJustSubmitted(true);
  };

  if (alreadySubmitted || justSubmitted) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.surface2, border: `1px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
          <Check size={26} color={C.gold} />
        </div>
        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: C.text, marginTop: 20 }}>BUKTI PEMBAYARAN TERKIRIM</h1>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
          Pesanan <b style={{ color: C.text }}>{order.id}</b> sedang menunggu verifikasi admin. Produk akan otomatis muncul di dashboard begitu pembayaran dikonfirmasi.
        </p>
        {preview ? (
          <img src={preview} alt="Bukti transfer" style={{ maxWidth: 220, borderRadius: 10, border: `1px solid ${C.border}`, marginTop: 18 }} />
        ) : (
          <ProofImage path={order.proofImage} style={{ maxWidth: 220, minHeight: 140, borderRadius: 10, border: `1px solid ${C.border}`, marginTop: 18, display: "inline-flex" }} />
        )}
        <div style={{ marginTop: 26, display: "flex", gap: 12, justifyContent: "center" }}>
          <GhostBtn onClick={() => go("shop")}>Lanjut Belanja</GhostBtn>
          <PrimaryBtn onClick={goToCustomerOverview} icon={ArrowRight}>Ke Dashboard</PrimaryBtn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "36px 20px 60px" }}>
      <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, color: C.text, margin: "0 0 6px" }}>KONFIRMASI PEMBAYARAN</h1>
      <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginBottom: 22 }}>Pesanan <b style={{ color: C.text }}>{order.id}</b> sudah dibuat. Silakan transfer ke rekening berikut, lalu unggah bukti pembayarannya.</p>

      <Card style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Landmark size={16} color={C.gold} />
          <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>Transfer ke Rekening Ini</h3>
        </div>
        <CopyableField label="Bank" value={bankInfo.bankName} />
        <CopyableField label="Nomor Rekening" value={bankInfo.accountNumber} />
        <CopyableField label="Atas Nama" value={bankInfo.accountHolder} />
        <CopyableField label="Jumlah Transfer" value={rp(order.total)} />
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, marginTop: 10 }}>Transfer sesuai nominal di atas ya, supaya admin lebih mudah mencocokkan dengan pesanan <b>{order.id}</b>.</p>
      </Card>

      <Card style={{ padding: 20, marginTop: 16 }}>
        <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, margin: "0 0 12px" }}>Unggah Bukti Transfer</h3>
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: `1px dashed ${C.border}`, borderRadius: 10, padding: preview ? 12 : 28, cursor: "pointer", background: C.surface2 }}>
          {preview ? (
            <img src={preview} alt="Preview bukti transfer" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8 }} />
          ) : (
            <>
              <Upload size={22} color={C.muted} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted }}>Klik untuk pilih foto/screenshot bukti transfer (JPG/PNG, maks 5MB)</span>
            </>
          )}
          <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        </label>
        {preview && (
          <button onClick={() => { setPreview(null); setFile(null); }} style={{ marginTop: 8, background: "none", border: "none", color: C.emberLight, fontFamily: "'Manrope',sans-serif", fontSize: 12, cursor: "pointer", padding: 0 }}>Ganti foto</button>
        )}

        <div style={{ marginTop: 14 }}>
          <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Catatan (opsional — misal nama pengirim jika berbeda)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13, boxSizing: "border-box", resize: "vertical" }} />
        </div>

        {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, marginTop: 10 }}>{error}</p>}
        <div style={{ marginTop: 14 }}><PrimaryBtn full onClick={handleSubmit} icon={Check}>{submitting ? "Mengunggah..." : "Kirim Konfirmasi Pembayaran"}</PrimaryBtn></div>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, marginTop: 10, lineHeight: 1.5 }}>Belum sempat transfer? Kamu bisa kembali ke halaman ini lewat menu Pesanan di dashboard.</p>
      </Card>
    </div>
  );
}

/* ---------------- AUTH ---------------- */
function AuthPage({ go, onCustomerLogin, onCustomerRegister, onAdminLogin, onBack }) {
  const [tab, setTab] = useState("customer"); // "customer" | "admin"
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Tombol tab "Admin" cuma muncul kalau buka halaman ini dengan tambahan
  // ?admin=1 di URL (mis. https://situskamu.com/?admin=1). Pengunjung biasa
  // tidak akan pernah lihat opsi ini.
  const isAdminAccessAllowed = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("admin") === "1";

  const inputStyle = { width: "100%", marginBottom: 10, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" };

  const submitCustomer = async () => {
    setSubmitting(true);
    const result = mode === "login" ? await onCustomerLogin({ email, password }) : await onCustomerRegister({ name, email, phone, password });
    setSubmitting(false);
    if (!result.ok) setError(result.error);
  };
  const submitAdmin = async () => {
    setSubmitting(true);
    const result = await onAdminLogin({ email: adminEmail, password: adminPasswordInput });
    setSubmitting(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "60px 20px" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
        <ArrowLeft size={15} /> Kembali
      </button>
      <Card style={{ padding: 28 }}>
        {isAdminAccessAllowed && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button onClick={() => { setTab("customer"); setError(""); }} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${tab === "customer" ? C.gold : C.border}`, background: tab === "customer" ? C.surface2 : "transparent", color: C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Customer</button>
          <button onClick={() => { setTab("admin"); setError(""); }} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${tab === "admin" ? C.gold : C.border}`, background: tab === "admin" ? C.surface2 : "transparent", color: C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Admin</button>
        </div>
        )}

        {tab === "customer" ? (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button onClick={() => { setMode("login"); setError(""); }} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${mode === "login" ? C.gold : C.border}`, background: mode === "login" ? C.surface2 : "transparent", color: C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Masuk</button>
              <button onClick={() => { setMode("register"); setError(""); }} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${mode === "register" ? C.gold : C.border}`, background: mode === "register" ? C.surface2 : "transparent", color: C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Daftar</button>
            </div>
            <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: C.text, margin: "0 0 4px" }}>{mode === "login" ? "MASUK KE AKUN" : "BUAT AKUN BARU"}</h2>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginBottom: 18 }}>Masuk atau daftar diperlukan sebelum menambahkan produk ke keranjang.</p>
            {mode === "register" && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" style={inputStyle} />}
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" style={inputStyle} />
            {mode === "register" && <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Nomor WhatsApp" style={inputStyle} />}
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kata sandi" type="password" style={{ ...inputStyle, marginBottom: error ? 8 : 18 }} />
            {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, marginBottom: 14 }}>{error}</p>}
            <PrimaryBtn full onClick={submitCustomer}>{submitting ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar & Masuk"}</PrimaryBtn>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: C.text, margin: "0 0 4px" }}>MASUK SEBAGAI ADMIN</h2>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginBottom: 18 }}>Gunakan akun yang sudah diberi akses admin. Kata sandi bisa diganti lewat Pengaturan → Keamanan setelah masuk.</p>
            <input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Email admin" type="email" style={inputStyle} />
            <input value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} placeholder="Kata sandi" type="password" style={{ ...inputStyle, marginBottom: error ? 8 : 18 }} onKeyDown={(e) => e.key === "Enter" && submitAdmin()} />
            {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, marginBottom: 14 }}>{error}</p>}
            <PrimaryBtn full onClick={submitAdmin}>{submitting ? "Memproses..." : "Masuk sebagai Admin"}</PrimaryBtn>
          </>
        )}
      </Card>
    </div>
  );
}

/* ---------------- CUSTOMER DASHBOARD ---------------- */
function DashSidebar({ items, active, onSelect, footer }) {
  return (
    <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }} className="gs-sidebar-wrap">
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }} className="gs-sidebar">
        {items.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => onSelect(key)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: active === key ? C.surface2 : "transparent", color: active === key ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 13.5, textAlign: "left" }}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>
      {footer}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <Card style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{label}</span>
        <Icon size={15} color={C.gold} />
      </div>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 20, color: C.text }}>{value}</span>
    </Card>
  );
}

function ProfileForm({ account, onSave }) {
  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.phone);
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    onSave(account.email, { name: name.trim(), phone: phone.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <Card style={{ padding: 20, maxWidth: 420 }}>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Nama</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Email</label>
        <input value={account.email} disabled style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.mutedDark, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box", cursor: "not-allowed" }} />
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, marginTop: 4 }}>Email dipakai sebagai identitas akun dan tidak bisa diganti sendiri di prototipe ini.</p>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>WhatsApp</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
      </div>
      <PrimaryBtn onClick={handleSave}>Simpan Perubahan</PrimaryBtn>
      {saved && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.gold, marginTop: 10 }}>Profil berhasil disimpan.</p>}
    </Card>
  );
}

function CustomerDashboard({ go, sub, setSub, orders, account, onLogout, onUpdateProfile, videoProgress, products, curriculumData, goToPaymentConfirm, accessProduct }) {
  // "orders" di sini sudah otomatis terbatas ke milik customer yang login (lewat RLS di database).
  const myOrders = orders;
  const ownedIds = Array.from(new Set(
    myOrders.filter((o) => o.payment === "PAID").flatMap((o) => o.itemIds).filter(Boolean)
  ));
  const owned = products.filter((p) => ownedIds.includes(p.id));
  const totalSpend = myOrders.filter((o) => o.payment === "PAID").reduce((s, o) => s + o.total, 0);

  const items = [
    { key: "products", label: "Produk Saya", icon: Package },
    { key: "overview", label: "Ringkasan", icon: LayoutDashboard },
    { key: "orders", label: "Pesanan", icon: ClipboardList },
    { key: "profile", label: "Profil", icon: User },
  ];

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "30px 20px 60px", display: "flex", gap: 28 }} className="gs-dash-layout">
      <DashSidebar items={items} active={sub} onSelect={setSub} footer={
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: C.ember, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer", marginTop: 14 }}>
          <LogOut size={16} />Keluar
        </button>
      } />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: C.text, margin: "0 0 20px" }}>
          {{ overview: "RINGKASAN AKUN", products: "PRODUK SAYA", orders: "PESANAN SAYA", profile: "PROFIL" }[sub]}
        </h1>

        {sub === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }} className="gs-grid-3">
              <StatCard label="Total Pembelian" value={rp(totalSpend)} icon={DollarSign} />
              <StatCard label="Produk Dimiliki" value={owned.length} icon={Package} />
              <StatCard label="Total Pesanan" value={myOrders.length} icon={ClipboardList} />
            </div>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 26, marginBottom: 12 }}>Pesanan Terbaru</h3>
            {myOrders.length === 0 ? (
              <Card style={{ padding: 24, textAlign: "center" }}>
                <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: 0 }}>Belum ada pesanan. Coba beli produk untuk melihat alurnya di sini.</p>
                <div style={{ marginTop: 12 }}><PrimaryBtn small onClick={() => go("shop")}>Jelajahi Produk</PrimaryBtn></div>
              </Card>
            ) : (
              <Card style={{ padding: 4 }}>
                {myOrders.slice(0, 3).map((o, i) => (
                  <div key={o.id} style={{ padding: "12px 14px", borderBottom: i < Math.min(myOrders.length, 3) - 1 ? `1px solid ${C.border}` : "none", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                    <div>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.text, fontWeight: 600 }}>{o.items.join(", ")}</div>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}>{o.id} · {o.date}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.goldLight }}>{rp(o.total)}</span>
                      <Badge>{o.status}</Badge>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {sub === "products" && (
          owned.length === 0 ? (
            <Card style={{ padding: 32, textAlign: "center" }}>
              <Package size={26} color={C.muted} style={{ margin: "0 auto" }} />
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, marginTop: 10 }}>Kamu belum memiliki produk apa pun.</p>
              <div style={{ marginTop: 12 }}><PrimaryBtn small onClick={() => go("shop")}>Beli Produk Pertamamu</PrimaryBtn></div>
            </Card>
          ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }} className="gs-grid-2">
            {owned.map((p) => {
              const curriculum = curriculumData[p.id];
              const completedCount = (videoProgress[p.id] || []).length;
              const pct = curriculum ? Math.round((completedCount / curriculum.length) * 100) : null;
              return (
                <Card key={p.id} style={{ padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: `linear-gradient(135deg, ${p.hue}33, ${C.surface2})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Music size={22} color={p.hue} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.text }}>{p.name}</div>
                    <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted, marginBottom: 8 }}>{p.format}</div>
                    {curriculum && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 999, background: C.surface2, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: C.gold, borderRadius: 999 }} />
                          </div>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: C.goldLight, whiteSpace: "nowrap" }}>{pct}%</span>
                        </div>
                        <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark }}>{completedCount}/{curriculum.length} video selesai</span>
                      </div>
                    )}
                    <GhostBtn small onClick={() => accessProduct(p)} icon={PlayCircle}>Akses Produk</GhostBtn>
                  </div>
                </Card>
              );
            })}
          </div>
          )
        )}

        {sub === "orders" && (
          myOrders.length === 0 ? (
            <Card style={{ padding: 32, textAlign: "center" }}>
              <ClipboardList size={26} color={C.muted} style={{ margin: "0 auto" }} />
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, marginTop: 10 }}>Belum ada riwayat pesanan.</p>
              <div style={{ marginTop: 12 }}><PrimaryBtn small onClick={() => go("shop")}>Mulai Belanja</PrimaryBtn></div>
            </Card>
          ) : (
          <>
          <ScrollHint />
          <Card style={{ overflow: "auto" }}>
            <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontFamily: "'Manrope',sans-serif", fontSize: 12.5 }}>
              <thead><tr style={{ background: C.surface2 }}>
                {["Order ID", "Tanggal", "Produk", "Total", "Pembayaran", "Status", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {myOrders.map((o) => (
                  <tr key={o.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 14px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, whiteSpace: "nowrap" }}>{o.id}</td>
                    <td style={{ padding: "10px 14px", color: C.muted, whiteSpace: "nowrap" }}>{o.date}</td>
                    <td style={{ padding: "10px 14px", color: C.text, whiteSpace: "nowrap" }}>{o.items.join(", ")}</td>
                    <td style={{ padding: "10px 14px", color: C.goldLight, fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>{rp(o.total)}</td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}><Badge>{o.payment}</Badge></td>
                    <td style={{ padding: "10px 14px", color: C.muted, whiteSpace: "nowrap" }}>{o.status}</td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      {o.payment === "Pending" && !o.proofImage && (
                        <GhostBtn small onClick={() => goToPaymentConfirm(o.id)} icon={Upload}>Upload Bukti</GhostBtn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          </>
          )
        )}

        {sub === "profile" && <ProfileForm account={account} onSave={onUpdateProfile} />}
      </div>
    </div>
  );
}

/* ---------------- ADMIN DASHBOARD ---------------- */
function GuitarIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10.3" y="1.2" width="3.4" height="2" rx="0.6" fill={color} />
      <rect x="11.3" y="2.8" width="1.4" height="8.2" rx="0.6" fill={color} />
      <ellipse cx="12" cy="13.6" rx="3.6" ry="3.3" fill={color} opacity="0.85" />
      <ellipse cx="12" cy="18.2" rx="5.2" ry="4.6" fill={color} />
      <circle cx="12" cy="18.2" r="1.6" fill="rgba(0,0,0,0.35)" />
    </svg>
  );
}

function BookCover({ title, tag, hue, size = 56 }) {
  const h = size * 1.32;
  return (
    <div style={{ position: "relative", width: size + 6, height: h + 6, flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 6, left: 6, width: size, height: h, borderRadius: 5, background: C.bg, border: `1px solid ${C.border}` }} />
      <div style={{ position: "absolute", top: 3, left: 3, width: size, height: h, borderRadius: 5, background: C.surface2, border: `1px solid ${C.border}` }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: size, height: h, borderRadius: 5, background: `linear-gradient(155deg, ${hue}, ${hue}bb 60%, ${hue}88)`, boxShadow: "0 3px 8px rgba(0,0,0,0.45)", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: size * 0.09 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: Math.max(4, size * 0.08), background: "rgba(0,0,0,0.28)" }} />
        <div style={{ position: "absolute", right: -size * 0.3, top: -size * 0.3, width: size * 0.8, height: size * 0.8, borderRadius: "50%", background: "rgba(255,255,255,0.10)" }} />
        <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: size * 0.13, fontWeight: 800, letterSpacing: 0.5, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", position: "relative", textAlign: "center", width: "100%" }}>{tag}</span>
        <GuitarIcon size={size * 0.34} color="rgba(255,255,255,0.92)" />
        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: size * 0.19, lineHeight: 1.05, color: "#fff", position: "relative", textAlign: "center", width: "100%" }}>{title}</span>
      </div>
    </div>
  );
}

function ScrollHint() {
  return (
    <div className="gs-scroll-hint" style={{ alignItems: "center", gap: 6, marginBottom: 8, fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark }}>
      <span>Geser ke kanan untuk lihat kolom lainnya</span><ArrowRight size={12} color={C.mutedDark} />
    </div>
  );
}

function OrderStatusPicker({ order, onChange, onRequestConfirmPaid }) {
  const options = [
    { payment: "PAID", status: "Selesai", label: "Selesai" },
    { payment: "Pending", status: "Menunggu Pembayaran", label: "Menunggu Pembayaran" },
    { payment: "Failed", status: "Gagal", label: "Gagal" },
  ];
  const toneColor = { PAID: C.gold, Pending: C.muted, Failed: C.emberLight };
  const handleChange = (e) => {
    const opt = options.find((o) => o.payment === e.target.value);
    if (!opt) return;
    // Menandai "Selesai" (PAID) berarti membuka akses produk ke customer — minta konfirmasi
    // eksplisit dulu supaya tidak ke-tap tanpa sengaja saat sedang mengecek bukti transfer.
    if (opt.payment === "PAID" && order.payment !== "PAID") {
      onRequestConfirmPaid(order);
      return;
    }
    onChange(order.id, opt.payment, opt.status);
  };
  return (
    <select
      value={order.payment}
      onChange={handleChange}
      style={{
        background: C.surface2,
        color: toneColor[order.payment] || C.text,
        border: `1px solid ${C.border}`,
        borderRadius: 999,
        padding: "5px 10px",
        fontFamily: "'Manrope',sans-serif",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        appearance: "auto",
      }}
    >
      {options.map((opt) => (
        <option key={opt.payment} value={opt.payment} style={{ background: C.surface, color: C.text }}>{opt.label}</option>
      ))}
    </select>
  );
}

function StatusBadge({ status }) {
  const map = { Selesai: "gold", Menunggu: "muted", Gagal: "ember", Paid: "gold", Pending: "muted", Failed: "ember" };
  return <Badge tone={map[status] || "muted"}>{status}</Badge>;
}

/* ---------------- TAMPILAN: EDIT BERANDA ---------------- */
function FieldInput({ label, value, onChange, area }) {
  const Tag = area ? "textarea" : "input";
  return (
    <div>
      <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{label}</label>
      <Tag
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={area ? 3 : undefined}
        style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 11px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13, boxSizing: "border-box", resize: area ? "vertical" : undefined }}
      />
    </div>
  );
}

function TampilanBerandaForm({ content, onSave, onBack }) {
  const [form, setForm] = useState(content);
  const [saved, setSaved] = useState(false);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setWhyItem = (idx, field, value) => {
    setForm((f) => ({ ...f, whyItems: f.whyItems.map((it, i) => (i === idx ? { ...it, [field]: value } : it)) }));
  };
  const handleSave = () => { onSave(form); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 16 }}><ArrowLeft size={14} />Kembali ke Tampilan</button>

      <Card style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Hero</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FieldInput label="Badge / teks kecil di atas judul" value={form.heroBadge} onChange={(v) => set("heroBadge", v)} />
          <FieldInput label="Judul (baris pertama)" value={form.heroTitleLine} onChange={(v) => set("heroTitleLine", v)} />
          <FieldInput label="Judul (bagian berwarna emas)" value={form.heroTitleHighlight} onChange={(v) => set("heroTitleHighlight", v)} />
          <FieldInput label="Judul (penutup)" value={form.heroTitleEnd} onChange={(v) => set("heroTitleEnd", v)} />
          <FieldInput label="Subjudul" value={form.heroSubtitle} onChange={(v) => set("heroSubtitle", v)} area />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><FieldInput label="Teks tombol utama" value={form.heroCta1} onChange={(v) => set("heroCta1", v)} /></div>
            <div style={{ flex: 1 }}><FieldInput label="Teks tombol kedua" value={form.heroCta2} onChange={(v) => set("heroCta2", v)} /></div>
          </div>
        </div>
      </Card>

      <Card style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Statistik Hero</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[["stat1Num", "stat1Label"], ["stat2Num", "stat2Label"], ["stat3Num", "stat3Label"]].map(([numKey, labelKey], i) => (
            <div key={numKey} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <FieldInput label={`Angka ${i + 1}`} value={form[numKey]} onChange={(v) => set(numKey, v)} />
              <FieldInput label={`Label ${i + 1}`} value={form[labelKey]} onChange={(v) => set(labelKey, v)} />
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Section "Produk Unggulan"</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FieldInput label="Label kecil (eyebrow)" value={form.featuredEyebrow} onChange={(v) => set("featuredEyebrow", v)} />
          <FieldInput label="Judul" value={form.featuredTitle} onChange={(v) => set("featuredTitle", v)} />
          <FieldInput label="Subjudul" value={form.featuredSub} onChange={(v) => set("featuredSub", v)} area />
        </div>
      </Card>

      <Card style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Section "Kategori Belajar"</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FieldInput label="Label kecil (eyebrow)" value={form.categoryEyebrow} onChange={(v) => set("categoryEyebrow", v)} />
          <FieldInput label="Judul" value={form.categoryTitle} onChange={(v) => set("categoryTitle", v)} />
          <FieldInput label="Subjudul" value={form.categorySub} onChange={(v) => set("categorySub", v)} area />
        </div>
      </Card>

      <Card style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Section "Kenapa Gitar Sakti"</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <FieldInput label="Label kecil (eyebrow)" value={form.whyEyebrow} onChange={(v) => set("whyEyebrow", v)} />
          <FieldInput label="Judul" value={form.whyTitle} onChange={(v) => set("whyTitle", v)} />
          <FieldInput label="Subjudul" value={form.whySub} onChange={(v) => set("whySub", v)} area />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {form.whyItems.map((item, idx) => (
            <div key={idx} style={{ padding: 12, borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
              <FieldInput label={`Poin ${idx + 1} — Judul`} value={item.title} onChange={(v) => setWhyItem(idx, "title", v)} />
              <FieldInput label={`Poin ${idx + 1} — Deskripsi`} value={item.desc} onChange={(v) => setWhyItem(idx, "desc", v)} area />
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Section Testimoni & FAQ</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FieldInput label="Testimoni — Label kecil" value={form.testimonialEyebrow} onChange={(v) => set("testimonialEyebrow", v)} />
          <FieldInput label="Testimoni — Judul" value={form.testimonialTitle} onChange={(v) => set("testimonialTitle", v)} />
          <FieldInput label="FAQ — Label kecil" value={form.faqEyebrow} onChange={(v) => set("faqEyebrow", v)} />
          <FieldInput label="FAQ — Judul" value={form.faqTitle} onChange={(v) => set("faqTitle", v)} />
        </div>
      </Card>

      <Card style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>CTA Penutup</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FieldInput label="Judul" value={form.ctaTitle} onChange={(v) => set("ctaTitle", v)} />
          <FieldInput label="Subjudul" value={form.ctaSub} onChange={(v) => set("ctaSub", v)} area />
          <FieldInput label="Teks tombol" value={form.ctaButton} onChange={(v) => set("ctaButton", v)} />
        </div>
      </Card>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <PrimaryBtn onClick={handleSave} icon={Check}>Simpan Perubahan</PrimaryBtn>
        {saved && <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.gold, fontWeight: 700 }}>Tersimpan ✓</span>}
      </div>
    </div>
  );
}

/* ---------------- TAMPILAN: EDIT HEADER ---------------- */
function TampilanProdukForm({ content, onSave, onBack, products, moveProduct }) {
  const [form, setForm] = useState(content);
  const [saved, setSaved] = useState(false);
  const handleSave = () => { onSave(form); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 16 }}><ArrowLeft size={14} />Kembali ke Tampilan</button>

      <Card style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Teks Halaman Katalog</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FieldInput label="Label kecil (eyebrow)" value={form.eyebrow} onChange={(v) => setForm((f) => ({ ...f, eyebrow: v }))} />
          <FieldInput label="Judul Halaman" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <PrimaryBtn small onClick={handleSave} icon={Check}>Simpan Perubahan</PrimaryBtn>
          {saved && <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.gold, fontWeight: 700 }}>Tersimpan ✓</span>}
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Urutan Tampil Produk</h3>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: -6, marginBottom: 14 }}>Urutan ini menentukan susunan default di katalog & 3 produk pertama yang tampil sebagai "Produk Unggulan" di Beranda.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {products.map((p, idx) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.mutedDark, width: 20 }}>{idx + 1}</span>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.text, flex: 1 }}>{p.name}</span>
              <button onClick={() => moveProduct(p.id, "up")} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.3 : 1 }}><ChevronUp size={15} color={C.muted} /></button>
              <button onClick={() => moveProduct(p.id, "down")} disabled={idx === products.length - 1} style={{ background: "none", border: "none", cursor: idx === products.length - 1 ? "default" : "pointer", opacity: idx === products.length - 1 ? 0.3 : 1 }}><ChevronDown size={15} color={C.muted} /></button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- TAMPILAN: TAMBAH HALAMAN (list) ---------------- */
function TampilanHalamanList({ customPages, onBack, onAdd, onEdit, onDelete }) {
  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 16 }}><ArrowLeft size={14} />Kembali ke Tampilan</button>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <PrimaryBtn small icon={Plus} onClick={onAdd}>Tambah Halaman Baru</PrimaryBtn>
      </div>

      {customPages.length === 0 ? (
        <Card style={{ padding: 32, textAlign: "center" }}>
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: 0 }}>Belum ada halaman kustom. Halaman yang kamu buat akan muncul di menu ☰ di navbar.</p>
        </Card>
      ) : (
        <Card style={{ padding: 4 }}>
          {customPages.map((p, i) => (
            <div key={p.id} style={{ padding: "12px 14px", borderBottom: i < customPages.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.text }}>{p.title}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.muted }}>/{p.slug} · {p.blocks.length} blok konten</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => onEdit(p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Pencil size={14} color={C.muted} /></button>
                <button onClick={() => onDelete(p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Trash2 size={14} color={C.muted} /></button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function AdminDashboard({ go, sub, setSub, onLogout, products, addProduct, updateProduct, toggleProductStatus, deleteProduct, moveProduct, curriculumData, curriculumOutline, coupons, addCoupon, siteContent, updateSiteContent, customPages, addCustomPage, updateCustomPage, deleteCustomPage, tampilanSub, setTampilanSub, orders, updateOrderStatus, bankInfo, updateBankInfo, onChangeAdminPassword, onExportData, onResetData, totalVisits, landingPages, addLandingPage, updateLandingPage, deleteLandingPage, openLandingPage }) {
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showPageForm, setShowPageForm] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [deletePageTarget, setDeletePageTarget] = useState(null);
  const [settingsSub, setSettingsSub] = useState("menu");
  const [showProofOrder, setShowProofOrder] = useState(null);
  const [confirmPaidOrder, setConfirmPaidOrder] = useState(null);
  const [showLpForm, setShowLpForm] = useState(false);
  const [editingLp, setEditingLp] = useState(null);
  const [deleteLpTarget, setDeleteLpTarget] = useState(null);
  const items = [
    { key: "overview", label: "Ringkasan", icon: LayoutDashboard },
    { key: "products", label: "Produk", icon: Package },
    { key: "orders", label: "Pesanan", icon: ClipboardList },
    { key: "customers", label: "Pelanggan", icon: Users },
    { key: "coupons", label: "Kupon", icon: Tag },
    { key: "analytics", label: "Analitik", icon: BarChart3 },
    { key: "landingpages", label: "Landing Page", icon: TrendingUp },
    { key: "settings", label: "Pengaturan", icon: Settings },
  ];

  const paidOrders = orders.filter((o) => o.payment === "PAID");
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const uniqueCustomers = Array.from(new Set(orders.map((o) => o.customerEmail).filter(Boolean)));
  const revenueByDate = {};
  paidOrders.forEach((o) => {
    revenueByDate[o.date] = (revenueByDate[o.date] || 0) + o.total;
  });
  const revenueChartData = Object.entries(revenueByDate).map(([day, revenue]) => ({ day, revenue }));

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "30px 20px 60px", display: "flex", gap: 28 }} className="gs-dash-layout">
      <DashSidebar items={items} active={sub} onSelect={(k) => { setSub(k); setTampilanSub("menu"); setSettingsSub("menu"); }} footer={
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: C.ember, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer", marginTop: 14 }}>
          <LogOut size={16} />Keluar
        </button>
      } />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: C.text, margin: "0 0 20px" }}>
          {sub === "tampilan"
            ? { menu: "TAMPILAN", beranda: "EDIT BERANDA", produk: "EDIT SEMUA PRODUK", halaman: "KELOLA HALAMAN" }[tampilanSub] || "TAMPILAN"
            : { overview: "RINGKASAN ADMIN", products: "MANAJEMEN PRODUK", orders: "MANAJEMEN PESANAN", customers: "MANAJEMEN PELANGGAN", coupons: "KUPON & PROMO", analytics: "ANALITIK", landingpages: "LANDING PAGE", settings: "PENGATURAN" }[sub]}
        </h1>

        {sub === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }} className="gs-grid-4">
              <StatCard label="Total Revenue" value={rp(totalRevenue)} icon={DollarSign} />
              <StatCard label="Total Orders" value={String(orders.length)} icon={ClipboardList} />
              <StatCard label="Total Order Berhasil" value={String(paidOrders.length)} icon={Check} />
              <StatCard label="Total Kunjungan Web" value={String(totalVisits)} icon={Eye} />
              <StatCard label="Total Customers" value={String(uniqueCustomers.length)} icon={Users} />
              <StatCard label="Conversion Rate" value={totalVisits > 0 ? ((paidOrders.length / totalVisits) * 100).toFixed(1) + "%" : "-"} icon={TrendingUp} />
            </div>
            <Card style={{ padding: 18, marginTop: 20 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginTop: 0 }}>Revenue per Hari</h3>
              {revenueChartData.length === 0 ? (
                <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, marginTop: 12, marginBottom: 4 }}>Belum ada transaksi tercatat.</p>
              ) : (
                <div style={{ height: 220, marginTop: 8 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueChartData}>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                      <XAxis dataKey="day" stroke={C.muted} fontSize={11} />
                      <YAxis stroke={C.muted} fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + "rb"} />
                      <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "Manrope", fontSize: 12 }} formatter={(v) => rp(v)} />
                      <Line type="monotone" dataKey="revenue" stroke={C.gold} strokeWidth={2.5} dot={{ r: 3, fill: C.gold }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 24, marginBottom: 12 }}>Produk Terlaris</h3>
            {(() => {
              const salesCount = {};
              orders.filter((o) => o.payment === "PAID").forEach((o) => {
                o.items.forEach((itemName) => {
                  salesCount[itemName] = (salesCount[itemName] || 0) + 1;
                });
              });
              const ranked = Object.entries(salesCount).sort((a, b) => b[1] - a[1]).slice(0, 4);
              if (ranked.length === 0) {
                return (
                  <Card style={{ padding: 24, textAlign: "center" }}>
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: 0 }}>Belum ada penjualan tercatat.</p>
                  </Card>
                );
              }
              return (
                <Card style={{ padding: 4 }}>
                  {ranked.map(([name, count], i) => (
                    <div key={name} style={{ padding: "12px 14px", borderBottom: i < ranked.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.text }}>{name}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: C.muted }}>{count} terjual</span>
                    </div>
                  ))}
                </Card>
              );
            })()}
          </div>
        )}

        {sub === "products" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}><PrimaryBtn small icon={Plus} onClick={() => { setEditingProduct(null); setShowProductForm(true); }}>Tambah Produk</PrimaryBtn></div>
            <ScrollHint />
            <Card style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Manrope',sans-serif", fontSize: 12.5 }}>
                <thead><tr style={{ background: C.surface2 }}>
                  {["Urutan", "Produk", "Kategori", "Harga", "Video", "Status", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.muted, fontWeight: 600 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {products.map((p, idx) => {
                    const status = p.status || "published";
                    return (
                      <tr key={p.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <button onClick={() => moveProduct(p.id, "up")} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", padding: 0, opacity: idx === 0 ? 0.3 : 1 }}><ChevronUp size={14} color={C.muted} /></button>
                            <button onClick={() => moveProduct(p.id, "down")} disabled={idx === products.length - 1} style={{ background: "none", border: "none", cursor: idx === products.length - 1 ? "default" : "pointer", padding: 0, opacity: idx === products.length - 1 ? 0.3 : 1 }}><ChevronDown size={14} color={C.muted} /></button>
                          </div>
                        </td>
                        <td style={{ padding: "10px 14px", color: C.text }}>{p.name}</td>
                        <td style={{ padding: "10px 14px", color: C.muted }}>{p.category}</td>
                        <td style={{ padding: "10px 14px", color: C.goldLight, fontFamily: "'JetBrains Mono',monospace" }}>{rp(p.price)}</td>
                        <td style={{ padding: "10px 14px", color: C.muted }}>{curriculumData[p.id] ? `${curriculumData[p.id].length} video` : "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          {status === "archived" ? (
                            <Badge tone="muted">Diarsipkan</Badge>
                          ) : (
                            <button onClick={() => toggleProductStatus(p.id)} style={{ border: "none", cursor: "pointer", padding: 0, background: "none" }} title="Klik untuk ubah status">
                              <Badge tone={status === "published" ? "gold" : "muted"}>{status === "published" ? "Published" : "Draft"}</Badge>
                            </button>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => go("product", p.slug)} title="Lihat Detail" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                              <Eye size={14} color={C.muted} />
                            </button>
                            <button onClick={() => { setEditingProduct(p); setShowProductForm(true); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                              <Pencil size={14} color={C.muted} />
                            </button>
                            <button onClick={() => setDeleteTarget(p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                              <Trash2 size={14} color={C.muted} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {sub === "orders" && (
          <div>
            {orders.length === 0 ? (
              <Card style={{ padding: 32, textAlign: "center" }}>
                <ClipboardList size={28} color={C.mutedDark} style={{ margin: "0 auto 10px" }} />
                <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, margin: 0 }}>Belum ada pesanan masuk.</p>
              </Card>
            ) : (
              <>
                <ScrollHint />
                <Card style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Manrope',sans-serif", fontSize: 12.5 }}>
                  <thead><tr style={{ background: C.surface2 }}>
                    {["Order ID", "Customer", "Produk", "Jumlah", "Metode", "Bukti Bayar", "Pembayaran", "Status", "Tanggal"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: C.text }}>{o.id}</td>
                        <td style={{ padding: "10px 14px", color: C.text }}>{o.customerName || "-"}</td>
                        <td style={{ padding: "10px 14px", color: C.muted }}>{o.items.join(", ")}</td>
                        <td style={{ padding: "10px 14px", color: C.goldLight, fontFamily: "'JetBrains Mono',monospace" }}>{rp(o.total)}</td>
                        <td style={{ padding: "10px 14px", color: C.muted }}>{o.method}</td>
                        <td style={{ padding: "10px 14px" }}>
                          {o.proofImage ? (
                            <button onClick={() => setShowProofOrder(o)} style={{ display: "flex", alignItems: "center", gap: 5, background: C.surface2, border: `1px solid ${C.gold}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.goldLight, whiteSpace: "nowrap" }}>
                              <ImageIcon size={12} />Lihat Bukti
                            </button>
                          ) : (
                            <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, whiteSpace: "nowrap" }}>Belum diunggah</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px" }}><OrderStatusPicker order={o} onChange={updateOrderStatus} onRequestConfirmPaid={setConfirmPaidOrder} /></td>
                        <td style={{ padding: "10px 14px", color: C.muted }}>{o.status}</td>
                        <td style={{ padding: "10px 14px", color: C.muted, whiteSpace: "nowrap" }}>{o.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </Card>
              </>
            )}
          </div>
        )}

        {sub === "customers" && (() => {
          const customerMap = {};
          orders.forEach((o) => {
            if (!o.customerEmail) return;
            if (!customerMap[o.customerEmail]) {
              customerMap[o.customerEmail] = { name: o.customerName, email: o.customerEmail, orders: 0, spending: 0, joined: o.date };
            }
            customerMap[o.customerEmail].orders += 1;
            if (o.payment === "PAID") customerMap[o.customerEmail].spending += o.total;
          });
          const customerList = Object.values(customerMap);
          return (
          <div>
            {customerList.length === 0 ? (
              <Card style={{ padding: 32, textAlign: "center" }}>
                <Users size={28} color={C.mutedDark} style={{ margin: "0 auto 10px" }} />
                <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, margin: 0 }}>Belum ada pelanggan terdaftar.</p>
              </Card>
            ) : (
              <>
                <ScrollHint />
                <Card style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Manrope',sans-serif", fontSize: 12.5 }}>
                  <thead><tr style={{ background: C.surface2 }}>
                    {["Nama", "Email", "Total Order", "Total Belanja", "Bergabung"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.muted, fontWeight: 600 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {customerList.map((c) => (
                      <tr key={c.email} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: "10px 14px", color: C.text }}>{c.name}</td>
                        <td style={{ padding: "10px 14px", color: C.muted }}>{c.email}</td>
                        <td style={{ padding: "10px 14px", color: C.text }}>{c.orders}</td>
                        <td style={{ padding: "10px 14px", color: C.goldLight, fontFamily: "'JetBrains Mono',monospace" }}>{rp(c.spending)}</td>
                        <td style={{ padding: "10px 14px", color: C.muted }}>{c.joined}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              </>
            )}
          </div>
          );
        })()}

        {sub === "coupons" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}><PrimaryBtn small icon={Plus} onClick={() => setShowCouponForm(true)}>Buat Kupon</PrimaryBtn></div>
            <ScrollHint />
            <Card style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Manrope',sans-serif", fontSize: 12.5 }}>
                <thead><tr style={{ background: C.surface2 }}>
                  {["Kode", "Tipe", "Nilai", "Min. Belanja", "Terpakai", "Berlaku Sampai"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.muted, fontWeight: 600 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.code} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "10px 14px", color: C.goldLight, fontFamily: "'JetBrains Mono',monospace" }}>{c.code}</td>
                      <td style={{ padding: "10px 14px", color: C.muted }}>{c.type === "percent" ? "Persen" : "Nominal"}</td>
                      <td style={{ padding: "10px 14px", color: C.text }}>{c.type === "percent" ? `${c.value}%` : rp(c.value)}</td>
                      <td style={{ padding: "10px 14px", color: C.muted }}>{c.minPurchase ? rp(c.minPurchase) : "—"}</td>
                      <td style={{ padding: "10px 14px", color: C.muted }}>{c.used}/{c.limit}</td>
                      <td style={{ padding: "10px 14px", color: C.muted }}>{c.expiry}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {sub === "landingpages" && (
          <div>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginTop: -10, marginBottom: 16 }}>Buat halaman promosi khusus untuk 1 produk, lalu pakai link-nya di iklan (Instagram/Facebook Ads, dsb). Setiap landing page punya link sendiri dan statistik kunjungan + klik order sendiri-sendiri.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}><PrimaryBtn small icon={Plus} onClick={() => setShowLpForm(true)}>Tambah Landing Page</PrimaryBtn></div>
            {landingPages.length === 0 ? (
              <Card style={{ padding: 30, textAlign: "center" }}>
                <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: 0 }}>Belum ada landing page. Klik "Tambah Landing Page" untuk membuat yang pertama.</p>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {landingPages.map((lp) => {
                  const prod = products.find((x) => x.id === lp.productId);
                  return (
                    <Card key={lp.id} style={{ padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, margin: 0 }}>{lp.name}</h3>
                            <Badge tone={lp.status === "published" ? "gold" : "muted"}>{lp.status === "published" ? "Aktif" : "Draft"}</Badge>
                          </div>
                          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, margin: "4px 0 0" }}>Produk: {prod ? prod.name : "(produk tidak ditemukan)"}</p>
                          <div style={{ marginTop: 10 }}>
                            <GhostBtn small onClick={() => openLandingPage(lp.slug)} icon={ArrowRight}>{lp.name}</GhostBtn>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => { setEditingLp(lp); setShowLpForm(true); }} title="Edit" style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: "pointer" }}><Pencil size={15} color={C.muted} /></button>
                          <button onClick={() => setDeleteLpTarget(lp)} title="Hapus" style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: "pointer" }}><Trash2 size={15} color={C.emberLight} /></button>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 24, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                        <div>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: C.text }}>{lp.visits}</div>
                          <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}>Total Kunjungan</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: C.goldLight }}>{lp.orderClicks}</div>
                          <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}>Total Klik Order</div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {sub === "tampilan" && tampilanSub === "menu" && (
          <div>
            <button onClick={() => setSub("settings")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 16 }}><ArrowLeft size={14} />Kembali ke Pengaturan</button>
            <Card style={{ padding: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 14, background: `linear-gradient(160deg, ${C.surface2}, ${C.surface})` }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Pencil size={17} color="#161019" /></div>
              <div>
                <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14.5, color: C.text, margin: 0 }}>Edit langsung di halaman (baru!)</h3>
                <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, margin: "4px 0 0" }}>Nyalakan tombol <b>"Mode Edit"</b> di pojok kanan atas saat berada di halaman Beranda atau Tentang — teks akan muncul ikon pensil kecil, klik untuk edit langsung di tempat.</p>
              </div>
            </Card>
          </div>
        )}

        {sub === "tampilan" && tampilanSub === "menu" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }} className="gs-grid-2">
            <Card style={{ padding: 20, cursor: "pointer" }} onClick={() => setTampilanSub("produk")}>
              <ShoppingBag size={20} color={C.gold} />
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 12, marginBottom: 6 }}>Edit "Semua Produk"</h3>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, margin: 0 }}>Ubah judul halaman katalog dan urutan tampil produk.</p>
            </Card>
            <Card style={{ padding: 20, cursor: "pointer" }} onClick={() => setTampilanSub("halaman")}>
              <Plus size={20} color={C.gold} />
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 12, marginBottom: 6 }}>Tambah Halaman</h3>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, margin: 0 }}>Buat halaman baru berisi teks, gambar, dan produk — muncul di menu ☰.</p>
            </Card>
          </div>
        )}

        {sub === "tampilan" && tampilanSub === "beranda" && (
          <TampilanBerandaForm content={siteContent.home} onSave={(data) => updateSiteContent("home", data)} onBack={() => setTampilanSub("menu")} />
        )}

        {sub === "tampilan" && tampilanSub === "produk" && (
          <TampilanProdukForm content={siteContent.shop} onSave={(data) => updateSiteContent("shop", data)} onBack={() => setTampilanSub("menu")} products={products} moveProduct={moveProduct} />
        )}

        {sub === "tampilan" && tampilanSub === "halaman" && (
          <TampilanHalamanList
            customPages={customPages}
            onBack={() => setTampilanSub("menu")}
            onAdd={() => { setEditingPage(null); setShowPageForm(true); }}
            onEdit={(p) => { setEditingPage(p); setShowPageForm(true); }}
            onDelete={(p) => setDeletePageTarget(p)}
          />
        )}

        {sub === "analytics" && (
          <div>
            <Card style={{ padding: 18 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginTop: 0 }}>Funnel Konversi</h3>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: -6, marginBottom: 4 }}>Visitor → Product View → Add to Cart → Checkout → Payment → Purchase</p>
              {FUNNEL.length === 0 ? (
                <div style={{ padding: "24px 4px 4px", textAlign: "center" }}>
                  <BarChart3 size={26} color={C.mutedDark} style={{ margin: "0 auto 10px" }} />
                  <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: 0 }}>Data funnel belum tersedia.</p>
                  <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: 6 }}>Sambungkan Meta Pixel / Google Analytics di <b style={{ color: C.muted }}>Pengaturan → Marketing</b> untuk mulai melacak kunjungan, add to cart, dan checkout secara otomatis.</p>
                </div>
              ) : (
                <div style={{ height: 240, marginTop: 8 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={FUNNEL} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" stroke={C.muted} fontSize={11} />
                      <YAxis type="category" dataKey="stage" stroke={C.muted} fontSize={11} width={100} />
                      <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "Manrope", fontSize: 12 }} />
                      <Bar dataKey="value" fill={C.gold} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 18 }} className="gs-grid-3">
              <StatCard label="Add to Cart Rate" value="-" icon={ShoppingCart} />
              <StatCard label="Checkout Rate" value="-" icon={ClipboardList} />
              <StatCard label="Purchase Rate" value="-" icon={TrendingUp} />
            </div>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, marginTop: 10 }}>Rate di atas memerlukan pelacakan trafik pengunjung (bukan sekadar data transaksi) — akan otomatis terisi setelah tracking pixel/GA aktif.</p>
          </div>
        )}

        {sub === "settings" && settingsSub === "menu" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Card style={{ padding: 18, cursor: "pointer" }} onClick={() => { setSub("tampilan"); setTampilanSub("menu"); }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Eye size={18} color={C.gold} />
                  <div>
                    <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>Tampilan</h3>
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, margin: "3px 0 0" }}>Edit teks Beranda, urutan produk, dan kelola halaman kustom.</p>
                  </div>
                </div>
                <ChevronRight size={16} color={C.muted} />
              </div>
            </Card>
            <Card style={{ padding: 18, cursor: "pointer" }} onClick={() => setSettingsSub("rekening")}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Landmark size={18} color={C.gold} />
                  <div>
                    <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>Rekening</h3>
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, margin: "3px 0 0" }}>Rekening tujuan transfer yang tampil di halaman konfirmasi pembayaran customer.</p>
                  </div>
                </div>
                <ChevronRight size={16} color={C.muted} />
              </div>
            </Card>
            <Card style={{ padding: 18, cursor: "pointer" }} onClick={() => setSettingsSub("keamanan")}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ShieldCheck size={18} color={C.gold} />
                  <div>
                    <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>Keamanan</h3>
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, margin: "3px 0 0" }}>Ganti kata sandi admin.</p>
                  </div>
                </div>
                <ChevronRight size={16} color={C.muted} />
              </div>
            </Card>
            <Card style={{ padding: 18, cursor: "pointer" }} onClick={() => setSettingsSub("data")}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Download size={18} color={C.gold} />
                  <div>
                    <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>Data</h3>
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, margin: "3px 0 0" }}>Backup data ke file, atau reset data prototipe ini.</p>
                  </div>
                </div>
                <ChevronRight size={16} color={C.muted} />
              </div>
            </Card>
            <Card style={{ padding: 18, cursor: "pointer" }} onClick={() => setSettingsSub("marketing")}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <TrendingUp size={18} color={C.gold} />
                  <div>
                    <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>Marketing</h3>
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, margin: "3px 0 0" }}>Payment gateway, Meta Ads, dan pengaturan email/SMTP.</p>
                  </div>
                </div>
                <ChevronRight size={16} color={C.muted} />
              </div>
            </Card>
            <Card style={{ padding: 18 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginTop: 0 }}>Umum</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {["Nama Website: Gitar Sakti", "Mata Uang: IDR (Rp)", "Email Kontak: hello@gitarsakti.id"].map((f) => <div key={f} style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, padding: "8px 12px", background: C.surface2, borderRadius: 6, border: `1px solid ${C.border}` }}>{f}</div>)}
              </div>
            </Card>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark }}>Credential sensitif tidak pernah ditulis di source code — semua diambil dari environment variables saat aplikasi berjalan.</p>
          </div>
        )}

        {sub === "settings" && settingsSub === "marketing" && (
          <div>
            <button onClick={() => setSettingsSub("menu")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 16 }}><ArrowLeft size={14} />Kembali ke Pengaturan</button>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                { h: "Payment Gateway", fields: ["Provider: (belum dipilih)", "API Key: ●●●●●● (disimpan sebagai ENV var, tidak ditampilkan)", "Merchant ID: ●●●●●●"] },
                { h: "Marketing (Meta Ads)", fields: ["Meta Pixel ID: ●●●●●●", "Conversions API Token: ●●●●●● (ENV var)", "Test Event Code: (opsional)"] },
                { h: "Email / SMTP", fields: ["SMTP Host: (belum dikonfigurasi)", "Sender Name: Gitar Sakti"] },
              ].map((s) => (
                <Card key={s.h} style={{ padding: 18 }}>
                  <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginTop: 0 }}>{s.h}</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    {s.fields.map((f) => <div key={f} style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, padding: "8px 12px", background: C.surface2, borderRadius: 6, border: `1px solid ${C.border}` }}>{f}</div>)}
                  </div>
                </Card>
              ))}
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark }}>Credential sensitif tidak pernah ditulis di source code — semua diambil dari environment variables saat aplikasi berjalan.</p>
            </div>
          </div>
        )}

        {sub === "settings" && settingsSub === "rekening" && (
          <div>
            <button onClick={() => setSettingsSub("menu")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 16 }}><ArrowLeft size={14} />Kembali ke Pengaturan</button>
            <BankInfoForm bankInfo={bankInfo} onSave={updateBankInfo} />
          </div>
        )}

        {sub === "settings" && settingsSub === "keamanan" && (
          <div>
            <button onClick={() => setSettingsSub("menu")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 16 }}><ArrowLeft size={14} />Kembali ke Pengaturan</button>
            <AdminPasswordForm onChangePassword={onChangeAdminPassword} />
          </div>
        )}

        {sub === "settings" && settingsSub === "data" && (
          <div>
            <button onClick={() => setSettingsSub("menu")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 16 }}><ArrowLeft size={14} />Kembali ke Pengaturan</button>
            <Card style={{ padding: 20, maxWidth: 480 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginTop: 0 }}>Backup Data</h3>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginBottom: 14 }}>Unduh salinan data toko (produk, pesanan, kupon, testimoni, rekening) sebagai file JSON. Data sekarang tersimpan di database Supabase, tapi file ini tetap berguna sebagai cadangan manual.</p>
              <GhostBtn onClick={onExportData} icon={Download}>Ekspor Data (JSON)</GhostBtn>
            </Card>
            <Card style={{ padding: 20, maxWidth: 480, marginTop: 16, borderColor: C.ember }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.emberLight, marginTop: 0 }}>Reset Data</h3>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginBottom: 14 }}>Karena data sekarang tersimpan di database (bukan browser lagi), reset tidak bisa dilakukan satu klik dari sini. Lakukan lewat Supabase Dashboard → Table Editor, atau jalankan ulang script seed.sql di SQL Editor.</p>
              <ResetDataButton onReset={onResetData} />
            </Card>
          </div>
        )}
      </div>

      {showProductForm && (
        <ProductFormModal
          initialProduct={editingProduct}
          initialItems={editingProduct ? (curriculumOutline[editingProduct.id] || []) : []}
          onClose={() => { setShowProductForm(false); setEditingProduct(null); }}
          onSubmit={(data, items) => {
            if (editingProduct) updateProduct(editingProduct.id, data, items);
            else addProduct(data, items);
            setShowProductForm(false);
            setEditingProduct(null);
          }}
        />
      )}

      {showCouponForm && (
        <CouponFormModal
          onClose={() => setShowCouponForm(false)}
          onSubmit={(data) => { addCoupon(data); setShowCouponForm(false); }}
        />
      )}

      {deleteTarget && (() => {
        const hasOrders = orders.some((o) => (o.itemIds && o.itemIds.includes(deleteTarget.id)) || o.items.includes(deleteTarget.name));
        return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <Card style={{ width: "100%", maxWidth: 380, padding: 22 }}>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 16, color: C.text, marginTop: 0 }}>{hasOrders ? "Arsipkan Produk?" : "Hapus Produk?"}</h3>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
              {hasOrders ? (
                <>Produk <b style={{ color: C.text }}>{deleteTarget.name}</b> sudah pernah dibeli, jadi tidak bisa dihapus permanen. Produk akan diarsipkan — hilang dari Shop & Beranda, tapi pembeli yang sudah punya tetap bisa mengakses materinya.</>
              ) : (
                <>Produk <b style={{ color: C.text }}>{deleteTarget.name}</b> beserta seluruh video materinya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.</>
              )}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <GhostBtn full onClick={() => setDeleteTarget(null)}>Batal</GhostBtn>
              <PrimaryBtn full onClick={() => { deleteProduct(deleteTarget.id); setDeleteTarget(null); }} icon={Trash2}>{hasOrders ? "Arsipkan" : "Hapus"}</PrimaryBtn>
            </div>
          </Card>
        </div>
        );
      })()}

      {showPageForm && (
        <PageFormModal
          products={products}
          initialPage={editingPage}
          onClose={() => { setShowPageForm(false); setEditingPage(null); }}
          onSubmit={(title, blocks) => {
            if (editingPage) updateCustomPage(editingPage.id, title, blocks);
            else addCustomPage(title, blocks);
            setShowPageForm(false);
            setEditingPage(null);
          }}
        />
      )}

      {deletePageTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <Card style={{ width: "100%", maxWidth: 380, padding: 22 }}>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 16, color: C.text, marginTop: 0 }}>Hapus Halaman?</h3>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
              Halaman <b style={{ color: C.text }}>{deletePageTarget.title}</b> akan dihapus dan hilang dari menu. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <GhostBtn full onClick={() => setDeletePageTarget(null)}>Batal</GhostBtn>
              <PrimaryBtn full onClick={() => { deleteCustomPage(deletePageTarget.id); setDeletePageTarget(null); }} icon={Trash2}>Hapus</PrimaryBtn>
            </div>
          </Card>
        </div>
      )}
      {showLpForm && (
        <LandingPageFormModal
          products={products}
          initialLp={editingLp}
          onClose={() => { setShowLpForm(false); setEditingLp(null); }}
          onSubmit={(form) => {
            if (editingLp) updateLandingPage(editingLp.id, form);
            else addLandingPage(form);
            setShowLpForm(false);
            setEditingLp(null);
          }}
        />
      )}

      {deleteLpTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <Card style={{ width: "100%", maxWidth: 380, padding: 22 }}>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 16, color: C.text, marginTop: 0 }}>Hapus Landing Page?</h3>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
              Landing page <b style={{ color: C.text }}>{deleteLpTarget.name}</b> beserta link dan statistiknya akan dihapus permanen. Link yang sudah dipakai di iklan tidak akan bisa dibuka lagi setelah ini.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <GhostBtn full onClick={() => setDeleteLpTarget(null)}>Batal</GhostBtn>
              <PrimaryBtn full onClick={() => { deleteLandingPage(deleteLpTarget.id); setDeleteLpTarget(null); }} icon={Trash2}>Hapus</PrimaryBtn>
            </div>
          </Card>
        </div>
      )}

      {showProofOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
          <Card style={{ width: "100%", maxWidth: 460, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 16, color: C.text, margin: 0 }}>Bukti Pembayaran — {showProofOrder.id}</h3>
              <button onClick={() => setShowProofOrder(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color={C.muted} /></button>
            </div>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, marginBottom: 10 }}>
              <div>{showProofOrder.customerName} · {rp(showProofOrder.total)}</div>
              <div>Diunggah: {showProofOrder.proofSubmittedAt || "-"}</div>
            </div>
            {showProofOrder.proofImage && <ProofImage path={showProofOrder.proofImage} alt="Bukti transfer" style={{ width: "100%", minHeight: 160, borderRadius: 10, border: `1px solid ${C.border}` }} />}
            {showProofOrder.proofNote && (
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.text, marginTop: 10, background: C.surface2, padding: 10, borderRadius: 8 }}>
                <b style={{ color: C.muted }}>Catatan:</b> {showProofOrder.proofNote}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <GhostBtn full onClick={() => { updateOrderStatus(showProofOrder.id, "Failed", "Gagal"); setShowProofOrder(null); }}>Tolak</GhostBtn>
              <PrimaryBtn full onClick={() => { updateOrderStatus(showProofOrder.id, "PAID", "Selesai"); setShowProofOrder(null); }} icon={Check}>Verifikasi & Selesaikan</PrimaryBtn>
            </div>
          </Card>
        </div>
      )}

      {confirmPaidOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
          <Card style={{ width: "100%", maxWidth: 420, padding: 22, textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${C.gold}18`, border: `1px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <ShieldCheck size={22} color={C.gold} />
            </div>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 16, color: C.text, margin: "0 0 8px" }}>
              Anda yakin <span style={{ color: C.goldLight }}>{confirmPaidOrder.customerName}</span> sudah bayar?
            </h3>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 6px" }}>
              Produk <b style={{ color: C.text }}>{confirmPaidOrder.items.join(", ")}</b> akan langsung bisa diakses oleh <b style={{ color: C.text }}>{confirmPaidOrder.customerName}</b> setelah ini.
            </p>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, margin: "0 0 18px" }}>
              Order {confirmPaidOrder.id} · {rp(confirmPaidOrder.total)}
              {!confirmPaidOrder.proofImage && <><br />Belum ada bukti transfer yang diunggah untuk pesanan ini.</>}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <GhostBtn full onClick={() => setConfirmPaidOrder(null)}>Batal</GhostBtn>
              <PrimaryBtn full onClick={() => { updateOrderStatus(confirmPaidOrder.id, "PAID", "Selesai"); setConfirmPaidOrder(null); }} icon={Check}>Ya, Sudah Bayar</PrimaryBtn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ---------------- FORM TAMBAH PRODUK ---------------- */
function ProductFormModal({ onClose, onSubmit, initialProduct, initialItems }) {
  const isEdit = !!initialProduct;
  const [name, setName] = useState(initialProduct?.name || "");
  const [category, setCategory] = useState(initialProduct?.category || CATEGORIES[0]);
  const [level, setLevel] = useState(initialProduct?.level || "Semua Level");
  const [price, setPrice] = useState(initialProduct?.price ? String(initialProduct.price) : "");
  const [oldPrice, setOldPrice] = useState(initialProduct?.oldPrice ? String(initialProduct.oldPrice) : "");
  const [desc, setDesc] = useState(initialProduct?.desc || "");
  const [previewVideo, setPreviewVideo] = useState(initialProduct?.previewVideo || "");
  const [status, setStatus] = useState(initialProduct?.status || "draft");
  const [learn, setLearn] = useState(initialProduct?.learn && initialProduct.learn.length > 0 ? initialProduct.learn : [""]);
  const [benefits, setBenefits] = useState(initialProduct?.benefits && initialProduct.benefits.length > 0 ? initialProduct.benefits : [""]);
  const [bonus, setBonus] = useState(initialProduct?.bonus || "");
  const [items, setItems] = useState(
    initialItems && initialItems.length > 0
      ? initialItems.map((it) => it.type === "section"
          ? { type: "section", title: it.title || "" }
          : { type: "video", title: it.title || "", desc: it.desc || "", url: it.url || "", duration: it.duration || "" })
      : [{ type: "video", title: "", desc: "", url: "", duration: "" }]
  );
  const [error, setError] = useState("");

  const updateVideo = (idx, field, value) => {
    setItems((list) => list.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };
  const addVideoRow = () => setItems((list) => [...list, { type: "video", title: "", desc: "", url: "", duration: "" }]);
  const addSectionRow = () => setItems((list) => [...list, { type: "section", title: "" }]);
  const removeItemRow = (idx) => setItems((list) => list.filter((_, i) => i !== idx));
  const moveItemRow = (idx, direction) => setItems((list) => {
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= list.length) return list;
    const copy = list.slice();
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    return copy;
  });

  const updateListItem = (setter) => (idx, value) => setter((list) => list.map((item, i) => (i === idx ? value : item)));
  const addListItem = (setter) => () => setter((list) => [...list, ""]);
  const removeListItem = (setter) => (idx) => setter((list) => list.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (!name.trim()) { setError("Nama produk wajib diisi."); return; }
    if (!price || Number(price) <= 0) { setError("Harga produk wajib diisi dengan benar."); return; }
    const validItems = items
      .filter((it) => it.title.trim())
      .map((it) => it.type === "section"
        ? { type: "section", title: it.title.trim() }
        : { type: "video", title: it.title.trim(), desc: (it.desc || "").trim(), url: (it.url || "").trim(), duration: (it.duration || "").trim() || "—" });
    setError("");
    onSubmit(
      {
        name: name.trim(), category, level, price: Number(price),
        oldPrice: oldPrice ? Number(oldPrice) : Number(price), desc: desc.trim(), status,
        previewVideo: previewVideo.trim(),
        learn: learn.map((l) => l.trim()).filter(Boolean),
        benefits: benefits.map((b) => b.trim()).filter(Boolean),
        bonus: bonus.trim(),
      },
      validItems
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <Card style={{ width: "100%", maxWidth: 560, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: C.text, margin: 0 }}>{isEdit ? "EDIT PRODUK" : "TAMBAH PRODUK BARU"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color={C.muted} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Judul Produk</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Rahasia Fingerstyle" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Kategori</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }}>
                {["Pemula", "Menengah", "Mahir", "Semua Level"].map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Harga (Rp)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="199000" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5, boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Harga Coret (opsional)</label>
              <input type="number" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="399000" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5, boxSizing: "border-box" }} />
            </div>
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Keterangan / Deskripsi Produk</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Jelaskan singkat isi produk ini..." style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box", resize: "vertical" }} />
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Link Video Preview (tampil di halaman produk)</label>
            <input value={previewVideo} onChange={(e) => setPreviewVideo(e.target.value)} placeholder="https://youtube.com/watch?v=..." style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, marginTop: 4 }}>Beda dengan video materi di bawah — ini video cuplikan/trailer yang tampil duluan ke calon pembeli. Upload file langsung belum didukung di prototipe ini, gunakan link.</p>
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 6, paddingTop: 14 }}>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>Yang akan kamu pelajari</label>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, marginTop: 4, marginBottom: 10 }}>Poin-poin materi yang tampil di halaman produk. Baris kosong akan diabaikan.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {learn.map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={item} onChange={(e) => updateListItem(setLearn)(idx, e.target.value)} placeholder={`Contoh: Alternate picking fundamental`} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, boxSizing: "border-box" }} />
                  {learn.length > 1 && <button onClick={() => removeListItem(setLearn)(idx)} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}><Trash2 size={13} color={C.mutedDark} /></button>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8 }}><GhostBtn small onClick={addListItem(setLearn)} icon={Plus}>Tambah Poin</GhostBtn></div>
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 6, paddingTop: 14 }}>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>Manfaat</label>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, marginTop: 4, marginBottom: 10 }}>Manfaat yang dirasakan pembeli. Baris kosong akan diabaikan.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {benefits.map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={item} onChange={(e) => updateListItem(setBenefits)(idx, e.target.value)} placeholder={`Contoh: Kecepatan picking naik terukur tiap minggu`} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, boxSizing: "border-box" }} />
                  {benefits.length > 1 && <button onClick={() => removeListItem(setBenefits)(idx)} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}><Trash2 size={13} color={C.mutedDark} /></button>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8 }}><GhostBtn small onClick={addListItem(setBenefits)} icon={Plus}>Tambah Poin</GhostBtn></div>
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Bonus (opsional)</label>
            <input value={bonus} onChange={(e) => setBonus(e.target.value)} placeholder="Contoh: Ebook 40 Warm-up Wajib (gratis, tanpa batas waktu)" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 6, paddingTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>Video Materi</label>
              <div style={{ display: "flex", gap: 8 }}>
                <GhostBtn small onClick={addSectionRow} icon={Plus}>Tambah Judul Materi Baru</GhostBtn>
                <GhostBtn small onClick={addVideoRow} icon={Plus}>Tambah Video</GhostBtn>
              </div>
            </div>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, marginTop: -6, marginBottom: 10 }}>Masukkan link video (YouTube/Vimeo/dll) — upload file langsung belum didukung di prototipe ini. Pakai "Tambah Judul Materi Baru" untuk mengelompokkan video di bawah judul tertentu (mis. "Pendahuluan", "Bonus 1 Partitur") — urutan di sini akan sama persis dengan yang tampil ke pembeli.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((it, idx) => it.type === "section" ? (
                <div key={idx} style={{ padding: 12, borderRadius: 8, background: `${C.gold}14`, border: `1px solid ${C.gold}55`, display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                    <button onClick={() => moveItemRow(idx, "up")} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", padding: 2, opacity: idx === 0 ? 0.3 : 1 }}><ChevronUp size={14} color={C.goldLight} /></button>
                    <button onClick={() => moveItemRow(idx, "down")} disabled={idx === items.length - 1} style={{ background: "none", border: "none", cursor: idx === items.length - 1 ? "default" : "pointer", padding: 2, opacity: idx === items.length - 1 ? 0.3 : 1 }}><ChevronDown size={14} color={C.goldLight} /></button>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.goldLight, flexShrink: 0 }}>Judul</span>
                  <input value={it.title} onChange={(e) => updateVideo(idx, "title", e.target.value)} placeholder={`Contoh: Pendahuluan`} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.goldLight, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5, boxSizing: "border-box" }} />
                  <button onClick={() => removeItemRow(idx)} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}><Trash2 size={13} color={C.mutedDark} /></button>
                </div>
              ) : (
                <div key={idx} style={{ padding: 12, borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.muted }}>Video</span>
                      <div style={{ display: "flex", gap: 2 }}>
                        <button onClick={() => moveItemRow(idx, "up")} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", padding: 2, opacity: idx === 0 ? 0.3 : 1 }}><ChevronUp size={14} color={C.muted} /></button>
                        <button onClick={() => moveItemRow(idx, "down")} disabled={idx === items.length - 1} style={{ background: "none", border: "none", cursor: idx === items.length - 1 ? "default" : "pointer", padding: 2, opacity: idx === items.length - 1 ? 0.3 : 1 }}><ChevronDown size={14} color={C.muted} /></button>
                      </div>
                    </div>
                    <button onClick={() => removeItemRow(idx)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={13} color={C.mutedDark} /></button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input value={it.title} onChange={(e) => updateVideo(idx, "title", e.target.value)} placeholder="Judul video" style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, boxSizing: "border-box" }} />
                    <input value={it.desc} onChange={(e) => updateVideo(idx, "desc", e.target.value)} placeholder="Deskripsi singkat video" style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={it.url} onChange={(e) => updateVideo(idx, "url", e.target.value)} placeholder="Link video (https://...)" style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, boxSizing: "border-box" }} />
                      <input value={it.duration} onChange={(e) => updateVideo(idx, "duration", e.target.value)} placeholder="Durasi (mis. 12:30)" style={{ width: 110, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, margin: 0 }}>{error}</p>}

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>Status Publikasi</label>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, marginTop: 4, marginBottom: 10 }}>Simpan sebagai Draft kalau materinya masih dikerjakan — produk draft tidak muncul di katalog/beranda sampai kamu publikasikan.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStatus("draft")} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${status === "draft" ? C.gold : C.border}`, background: status === "draft" ? C.surface2 : "transparent", color: status === "draft" ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Draft</button>
              <button onClick={() => setStatus("published")} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${status === "published" ? C.gold : C.border}`, background: status === "published" ? C.surface2 : "transparent", color: status === "published" ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Published</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <GhostBtn full onClick={onClose}>Batal</GhostBtn>
            <PrimaryBtn full onClick={handleSubmit} icon={Check}>{isEdit ? "Simpan Perubahan" : "Simpan Produk"}</PrimaryBtn>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- FORM BUAT KUPON ---------------- */
function CouponFormModal({ onClose, onSubmit }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [limit, setLimit] = useState("100");
  const [expiry, setExpiry] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!code.trim()) { setError("Kode kupon wajib diisi."); return; }
    if (!value || Number(value) <= 0) { setError("Nilai diskon wajib diisi dengan benar."); return; }
    if (type === "percent" && Number(value) > 100) { setError("Diskon persen maksimal 100%."); return; }
    setError("");
    onSubmit({
      code: code.trim().toUpperCase(), type, value: Number(value),
      minPurchase: minPurchase ? Number(minPurchase) : 0,
      limit: limit ? Number(limit) : 999999,
      expiry: expiry.trim() || "Tanpa batas waktu",
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <Card style={{ width: "100%", maxWidth: 440, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: C.text, margin: 0 }}>BUAT KODE DISKON</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color={C.muted} /></button>
        </div>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: -10, marginBottom: 16 }}>Kode ini bisa kamu bagikan (misal lewat WhatsApp/email) — hanya orang yang tahu kodenya yang bisa pakai, kode tidak ditampilkan otomatis ke pengunjung lain.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Kode Kupon</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Contoh: SPESIAL50" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5, boxSizing: "border-box", textTransform: "uppercase" }} />
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Tipe Diskon</label>
            <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
              <button onClick={() => setType("percent")} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${type === "percent" ? C.gold : C.border}`, background: type === "percent" ? C.surface2 : "transparent", color: type === "percent" ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Persen (%)</button>
              <button onClick={() => setType("fixed")} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${type === "fixed" ? C.gold : C.border}`, background: type === "fixed" ? C.surface2 : "transparent", color: type === "fixed" ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Nominal (Rp)</button>
            </div>
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Nilai Diskon {type === "percent" ? "(%)" : "(Rp)"}</label>
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "percent" ? "25" : "20000"} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5, boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Minimum Belanja (opsional)</label>
              <input type="number" value={minPurchase} onChange={(e) => setMinPurchase(e.target.value)} placeholder="0" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5, boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Batas Pemakaian</label>
              <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="100" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5, boxSizing: "border-box" }} />
            </div>
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Berlaku Sampai (opsional)</label>
            <input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="31 Des 2026" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
          </div>

          {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <GhostBtn full onClick={onClose}>Batal</GhostBtn>
            <PrimaryBtn full onClick={handleSubmit} icon={Check}>Simpan Kupon</PrimaryBtn>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- FORM TAMBAH/EDIT LANDING PAGE ---------------- */
function LandingPageFormModal({ onClose, onSubmit, products, initialLp }) {
  const [name, setName] = useState(initialLp?.name || "");
  const [productId, setProductId] = useState(initialLp?.productId || products[0]?.id || "");
  const [headline, setHeadline] = useState(initialLp?.headline || "");
  const [subheadline, setSubheadline] = useState(initialLp?.subheadline || "");
  const [videoUrl, setVideoUrl] = useState(initialLp?.videoUrl || "");
  const [badgeText, setBadgeText] = useState(initialLp?.badgeText || "");
  const [status, setStatus] = useState(initialLp?.status || "published");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) { setError("Nama landing page wajib diisi."); return; }
    if (!productId) { setError("Pilih produk untuk landing page ini."); return; }
    setError("");
    onSubmit({ name: name.trim(), productId: Number(productId), headline: headline.trim(), subheadline: subheadline.trim(), videoUrl: videoUrl.trim(), badgeText: badgeText.trim(), status });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <Card style={{ width: "100%", maxWidth: 480, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: C.text, margin: 0 }}>{initialLp ? "EDIT LANDING PAGE" : "TAMBAH LANDING PAGE"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color={C.muted} /></button>
        </div>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: -10, marginBottom: 16 }}>Cukup isi Nama & pilih Produk — bagian lain opsional dan otomatis pakai data produk kalau dikosongkan.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Nama Landing Page (untuk kamu sendiri, tidak tampil ke pengunjung)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Iklan IG - Fondasi Pemula Agustus" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Produk</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Judul Utama / Headline (opsional — kosongkan untuk pakai nama produk)</label>
            <textarea value={headline} onChange={(e) => setHeadline(e.target.value)} rows={2} placeholder="Contoh: Kuasai Gitar Dalam 30 Hari, Dijamin!" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box", resize: "vertical" }} />
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Sub-judul (opsional — kosongkan untuk pakai deskripsi produk)</label>
            <textarea value={subheadline} onChange={(e) => setSubheadline(e.target.value)} rows={2} placeholder="Kalimat pendukung di bawah judul utama" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box", resize: "vertical" }} />
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Link Video YouTube (opsional)</label>
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Teks Badge Kecil di Atas Judul (opsional)</label>
            <input value={badgeText} onChange={(e) => setBadgeText(e.target.value)} placeholder="Contoh: Promo Spesial Kemerdekaan" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Status</label>
            <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
              <button onClick={() => setStatus("published")} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${status === "published" ? C.gold : C.border}`, background: status === "published" ? C.surface2 : "transparent", color: status === "published" ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Aktif</button>
              <button onClick={() => setStatus("draft")} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${status === "draft" ? C.gold : C.border}`, background: status === "draft" ? C.surface2 : "transparent", color: status === "draft" ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Draft (belum bisa dibuka)</button>
            </div>
          </div>

          {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <GhostBtn full onClick={onClose}>Batal</GhostBtn>
            <PrimaryBtn full onClick={handleSubmit} icon={Check}>Simpan</PrimaryBtn>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- FORM TAMBAH/EDIT HALAMAN KUSTOM ---------------- */
function PageFormModal({ onClose, onSubmit, products, initialPage }) {
  const isEdit = !!initialPage;
  const [title, setTitle] = useState(initialPage?.title || "");
  const [blocks, setBlocks] = useState(initialPage?.blocks?.length ? initialPage.blocks : []);
  const [error, setError] = useState("");

  const addBlock = (type) => {
    if (type === "text") setBlocks((b) => [...b, { type: "text", content: "" }]);
    if (type === "image") setBlocks((b) => [...b, { type: "image", url: "" }]);
    if (type === "products") setBlocks((b) => [...b, { type: "products", productIds: [] }]);
  };
  const updateBlock = (idx, patch) => setBlocks((b) => b.map((blk, i) => (i === idx ? { ...blk, ...patch } : blk)));
  const removeBlock = (idx) => setBlocks((b) => b.filter((_, i) => i !== idx));
  const toggleProductInBlock = (idx, productId) => {
    setBlocks((b) => b.map((blk, i) => {
      if (i !== idx) return blk;
      const has = blk.productIds.includes(productId);
      return { ...blk, productIds: has ? blk.productIds.filter((id) => id !== productId) : [...blk.productIds, productId] };
    }));
  };

  const handleSubmit = () => {
    if (!title.trim()) { setError("Judul halaman wajib diisi."); return; }
    if (blocks.length === 0) { setError("Tambahkan minimal satu blok konten (teks/gambar/produk)."); return; }
    setError("");
    onSubmit(title.trim(), blocks);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <Card style={{ width: "100%", maxWidth: 640, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: C.text, margin: 0 }}>{isEdit ? "EDIT HALAMAN" : "TAMBAH HALAMAN BARU"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color={C.muted} /></button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Judul Halaman</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Promo Kemerdekaan" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, marginTop: 4 }}>Halaman ini akan muncul di menu navbar utama, di antara "Produk" dan "Tentang", bisa dibuka semua pengunjung.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {blocks.map((block, idx) => (
            <div key={idx} style={{ padding: 12, borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.gold, textTransform: "uppercase" }}>
                  {block.type === "text" ? "Blok Teks" : block.type === "image" ? "Blok Gambar" : "Blok Produk"}
                </span>
                <button onClick={() => removeBlock(idx)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={13} color={C.mutedDark} /></button>
              </div>

              {block.type === "text" && (
                <textarea value={block.content} onChange={(e) => updateBlock(idx, { content: e.target.value })} rows={4} placeholder="Tulis teks halaman di sini..." style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, boxSizing: "border-box", resize: "vertical" }} />
              )}

              {block.type === "image" && (
                <input value={block.url} onChange={(e) => updateBlock(idx, { url: e.target.value })} placeholder="https://... link gambar" style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, boxSizing: "border-box" }} />
              )}

              {block.type === "products" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                  {products.map((p) => (
                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={block.productIds.includes(p.id)} onChange={() => toggleProductInBlock(idx, p.id)} />
                      <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.text }}>{p.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <GhostBtn small onClick={() => addBlock("text")} icon={Plus}>Tambah Teks</GhostBtn>
            <GhostBtn small onClick={() => addBlock("image")} icon={Plus}>Tambah Gambar</GhostBtn>
            <GhostBtn small onClick={() => addBlock("products")} icon={Plus}>Tambah Produk</GhostBtn>
          </div>

          {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <GhostBtn full onClick={onClose}>Batal</GhostBtn>
            <PrimaryBtn full onClick={handleSubmit} icon={Check}>{isEdit ? "Simpan Perubahan" : "Buat Halaman"}</PrimaryBtn>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- LEARN / VIDEO PLAYER ---------------- */
function LearnPage({ slug, go, progress, setProgress, current, setCurrent, products, curriculumData, curriculumOutline }) {
  const product = products.find((x) => x.slug === slug) || products[0];
  const curriculum = curriculumData[product.id] || [];
  const outline = (curriculumOutline?.[product.id] && curriculumOutline[product.id].length > 0) ? curriculumOutline[product.id] : curriculum.map((v) => ({ type: "video", ...v }));
  const completed = progress[product.id] || [];
  const curIdx = current[product.id] ?? 0;
  const video = curriculum[curIdx];
  const isLast = curIdx === curriculum.length - 1;
  const isCurrentDone = completed.includes(curIdx);

  const selectVideo = (idx) => setCurrent((prev) => ({ ...prev, [product.id]: idx }));
  const markCompleteAndNext = () => {
    setProgress((prev) => {
      const list = prev[product.id] || [];
      return list.includes(curIdx) ? prev : { ...prev, [product.id]: [...list, curIdx] };
    });
    if (!isLast) setCurrent((prev) => ({ ...prev, [product.id]: curIdx + 1 }));
  };

  if (curriculum.length === 0) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: "'Manrope',sans-serif", color: C.muted }}>Materi video untuk produk ini belum tersedia di prototipe.</p>
        <div style={{ marginTop: 16 }}><GhostBtn onClick={() => go("customer")}>Kembali ke Dashboard</GhostBtn></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 20px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, marginBottom: 16 }}>
        <span onClick={() => go("customer")} style={{ cursor: "pointer" }}>Dashboard</span><ChevronRight size={12} />
        <span onClick={() => go("customer")} style={{ cursor: "pointer" }}>Produk Saya</span><ChevronRight size={12} />
        <span style={{ color: C.text }}>{product.name}</span>
      </div>

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: C.text, margin: 0 }}>{product.name.toUpperCase()}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1, height: 8, borderRadius: 999, background: C.surface2, overflow: "hidden" }}>
            <div style={{ width: `${(completed.length / curriculum.length) * 100}%`, height: "100%", background: C.gold, borderRadius: 999 }} />
          </div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>{completed.length}/{curriculum.length} selesai</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }} className="gs-hero-grid">
        <div>
          <div>
            <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.gold, fontWeight: 700 }}>VIDEO {curIdx + 1} DARI {curriculum.length}</span>
            <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 19, color: C.text, margin: "6px 0" }}>{video.title}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={13} color={C.muted} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted }}>{video.duration}</span>
              {isCurrentDone && <span style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}><Check size={13} color={C.gold} /><span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.gold, fontWeight: 700 }}>Sudah selesai</span></span>}
            </div>
          </div>

          <div style={{ marginTop: 16, marginBottom: 18, display: "flex", gap: 10 }}>
            {curIdx > 0 && (
              <div style={{ flex: 1 }}><GhostBtn full onClick={() => selectVideo(curIdx - 1)} icon={ArrowLeft}>Video Sebelumnya</GhostBtn></div>
            )}
            <div style={{ flex: 1 }}>
              {!isLast ? (
                <PrimaryBtn full onClick={markCompleteAndNext} icon={ArrowRight}>{isCurrentDone ? "Lanjut ke Video Berikutnya" : "Tandai Selesai & Lanjut"}</PrimaryBtn>
              ) : !isCurrentDone ? (
                <PrimaryBtn full onClick={markCompleteAndNext} icon={Check}>Tandai Selesai</PrimaryBtn>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: `linear-gradient(180deg, ${C.goldLight}, ${C.gold})`, color: "#1A140A", fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: 0.3, padding: "13px 24px", borderRadius: 8, lineHeight: 1 }}>
                  <Check size={16} />Kursus Selesai
                </div>
              )}
            </div>
          </div>

          {(() => {
            const embedUrl = toEmbedUrl(video.url);
            if (embedUrl) {
              return (
                <div>
                  <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, background: C.surface2 }}>
                    <iframe
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                      src={embedUrl}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                  <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, marginTop: 8 }}>
                    Video tidak muncul? <a href={video.url} target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>Buka di tab baru ↗</a>
                  </p>
                </div>
              );
            }
            if (video.url) {
              return (
                <a href={video.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", textDecoration: "none", height: 340, borderRadius: 14, background: `linear-gradient(135deg, ${product.hue}33, ${C.surface2})`, border: `1px solid ${C.border}`, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
                  <PlayCircle size={56} color={C.goldLight} strokeWidth={1.2} />
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted }}>Buka video di tab baru ↗</span>
                </a>
              );
            }
            return (
              <div style={{ height: 340, borderRadius: 14, background: `linear-gradient(135deg, ${product.hue}33, ${C.surface2})`, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
                <PlayCircle size={56} color={C.goldLight} strokeWidth={1.2} />
                <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted }}>Pemutar video (contoh tampilan)</span>
              </div>
            );
          })()}
        </div>

        <div>
          <Card style={{ padding: 6, maxHeight: 560, overflowY: "auto" }}>
            {(() => {
              let videoCounter = -1;
              return outline.map((item, i) => {
                if (item.type === "section") {
                  return (
                    <div key={`s-${i}`} style={{ padding: "14px 10px 6px", fontFamily: "'Manrope',sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: C.gold, textTransform: "uppercase" }}>
                      {item.title}
                    </div>
                  );
                }
                const idx = ++videoCounter;
                const v = curriculum[idx];
                if (!v) return null;
                const done = completed.includes(idx);
                const active = idx === curIdx;
                return (
                  <div key={`v-${i}`} onClick={() => selectVideo(idx)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 10px", borderRadius: 8, cursor: "pointer", background: active ? C.surface2 : "transparent" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${done ? C.gold : C.border}`, background: done ? C.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {done ? <Check size={13} color="#1A140A" /> : <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: C.muted }}>{idx + 1}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? C.goldLight : C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.title}</div>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.muted }}>{v.duration}</div>
                    </div>
                  </div>
                );
              });
            })()}
          </Card>
        </div>
      </div>
    </div>
  );
}

const LP_GENERIC_PROBLEMS = [
  { title: "Belajar Sendiri Lewat YouTube Tanpa Arah", desc: "Nonton banyak video tapi nggak ada sistem yang jelas, jadi bingung mana yang harus dipelajari duluan." },
  { title: "Sudah Lama Latihan, Progress Masih Lambat", desc: "Sudah rutin latihan berbulan-bulan, tapi kemampuan masih di tempat yang sama." },
  { title: "Bingung Harus Mulai Dari Mana", desc: "Banyak yang mau belajar tapi nggak tau harus fokus ke bagian mana dulu." },
];

const LP_COMPARISON = [
  { label: "Struktur Materi", us: true, other: false },
  { label: "Bisa Ditonton Ulang", us: true, other: false },
  { label: "Bonus Materi Tambahan", us: true, other: false },
  { label: "Harga Terjangkau", us: true, other: "partial" },
];

const LP_GENERIC_FAQ = [
  { q: "Saya masih pemula, cocok ikut course ini?", a: "Materinya disusun bertahap dari dasar, jadi kamu bisa ikuti sesuai levelmu masing-masing." },
  { q: "Berapa lama saya bisa akses materinya?", a: "Akses selamanya — sekali bayar, kamu bisa tonton ulang kapan pun kamu mau." },
  { q: "Kalau saya belum ngerti materinya gimana?", a: "Kamu bisa ulang-ulang video sampai benar-benar paham, materinya tidak akan hilang." },
];

/* ---------------- LANDING PAGE IKLAN (template, dipakai semua produk) ---------------- */
function LandingPageTemplate({ lp, go, applyPricingAndBuy, products, testimonials, addTestimonial, ownedIds, pendingIds }) {
  const p = products.find((x) => x.id === lp?.productId);

  if (!lp || !p) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted }}>Landing page tidak ditemukan, atau produknya sudah tidak tersedia.</p>
      </div>
    );
  }

  const tiers = p.pricingTiers || null;
  const hasTiers = !!tiers;
  const owned = ownedIds?.includes(p.id);
  const pending = pendingIds?.includes(p.id);
  const productReviews = testimonials?.[p.id] || [];
  const headline = lp.headline || p.name;
  const subheadline = lp.subheadline || p.desc;
  const badgeText = lp.badgeText || "Metode Latihan Yang Sudah Teruji";
  const videoUrl = lp.videoUrl || "";

  useEffect(() => {
    // Catat 1 kunjungan landing page ini ke database (dipakai untuk statistik admin).
    // Titik integrasi Meta Pixel + Conversions API juga bisa ditaruh di sini kalau perlu nanti.
    supabase.rpc("increment_lp_visit", { p_slug: lp.slug }).then(() => {}).catch(() => {});
    console.log("[MetaPixel] ViewContent", { content_id: p.id, content_name: p.name, value: p.price, currency: "IDR" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lp.slug]);

  const scrollToPricing = () => {
    document.getElementById("lp-pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Countdown JUJUR: dihitung dari kunjungan PERTAMA user ke halaman ini, disimpan di localStorage
  // supaya tidak reset kalau halaman dibuka/refresh ulang. Begitu waktunya habis, tetap habis
  // selamanya untuk browser/user tsb. Hanya berlaku kalau produk punya pricingTiers (harga bertahap).
  const firstVisitKey = `gs_lp_${lp.slug}_first_visit`;
  const [deadline, setDeadline] = useState(null);
  useEffect(() => {
    if (!hasTiers) return;
    let firstVisit;
    try {
      const saved = localStorage.getItem(firstVisitKey);
      if (saved) {
        firstVisit = parseInt(saved, 10);
      } else {
        firstVisit = Date.now();
        localStorage.setItem(firstVisitKey, String(firstVisit));
      }
    } catch (e) {
      firstVisit = Date.now(); // fallback kalau localStorage diblokir browser
    }
    setDeadline(firstVisit + tiers.earlyBirdHours * 60 * 60 * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTiers, tiers?.earlyBirdHours]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!hasTiers) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasTiers]);

  let currentPrice, anchorPrice, disc, tierNote, expired, founderSlotsLeft, timeLeft, hh, mm, ss;
  if (hasTiers) {
    expired = deadline !== null && now >= deadline;
    timeLeft = deadline ? Math.max(0, Math.floor((deadline - now) / 1000)) : 0;
    hh = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
    mm = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
    ss = String(Math.floor(timeLeft % 60)).padStart(2, "0");
    // Slot pembeli pertama dihitung dari p.sold ASLI (bertambah tiap transaksi sukses), bukan
    // angka yang berkurang sendiri seiring waktu.
    founderSlotsLeft = Math.max(0, tiers.founderSlots - (p.sold || 0));
    const isFounder = founderSlotsLeft > 0;
    if (expired) {
      currentPrice = tiers.regularPrice;
      tierNote = "Harga sudah kembali ke harga reguler";
    } else if (isFounder) {
      currentPrice = tiers.founderPrice;
      tierNote = `Harga Spesial Pendiri — sisa ${founderSlotsLeft} dari ${tiers.founderSlots} slot`;
    } else {
      currentPrice = tiers.earlyBirdPrice;
      tierNote = "Harga Early Bird";
    }
    anchorPrice = tiers.regularPrice;
    disc = Math.round((1 - currentPrice / anchorPrice) * 100);
  } else {
    expired = true; // tanpa countdown, langsung tampil harga apa adanya
    currentPrice = p.price;
    anchorPrice = p.oldPrice && p.oldPrice > p.price ? p.oldPrice : p.price;
    disc = anchorPrice > currentPrice ? Math.round((1 - currentPrice / anchorPrice) * 100) : 0;
    tierNote = "Harga Spesial";
  }

  const buyNow = () => {
    supabase.rpc("increment_lp_click", { p_slug: lp.slug }).then(() => {}).catch(() => {});
    if (applyPricingAndBuy(p.id, currentPrice, anchorPrice)) go("checkout");
  };

  return (
    <div style={{ background: C.bg, minHeight: "100%" }}>
      {/* top bar minimal, tanpa menu navigasi supaya fokus konversi */}
      <div style={{ borderBottom: `1px solid ${C.borderSoft}`, padding: "14px 20px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: `linear-gradient(160deg, ${C.goldLight}, ${C.ember})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Music size={16} color="#161019" strokeWidth={2} />
          </div>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 19, letterSpacing: 1, color: C.text }}>GITAR SAKTI</span>
        </div>
      </div>

      {/* HERO / VSL */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px 8px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, background: C.surface2, border: `1px solid ${C.gold}55`, color: C.goldLight, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700 }}>
            <Sparkles size={14} /> {badgeText}
          </span>
        </div>

        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, lineHeight: 1.12, letterSpacing: 0.3, color: C.text, textAlign: "center", margin: "0 0 14px" }}>
          {headline}
        </h1>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, color: C.muted, textAlign: "center", maxWidth: 480, margin: "0 auto 26px", lineHeight: 1.65 }}>
          {subheadline}
        </p>

        {videoUrl ? (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "block", textDecoration: "none", borderRadius: 16, overflow: "hidden", border: `1px solid ${C.gold}33`, boxShadow: `0 0 60px ${C.gold}22`, marginBottom: 24 }}
          >
            <div style={{ position: "relative", paddingTop: "56.25%", background: `linear-gradient(135deg, ${p.hue}33, ${C.surface2})`, display: "flex" }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", border: `2px solid ${C.goldLight}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PlayCircle size={30} color={C.goldLight} strokeWidth={1.2} />
                </div>
                <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted }}>Tonton video preview di YouTube ↗</span>
              </div>
            </div>
          </a>
        ) : null}

        <div style={{ textAlign: "center" }}>
          <PrimaryBtn onClick={scrollToPricing} icon={ArrowRight}>Ya, Saya Mau Belajar Sekarang</PrimaryBtn>
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: 10 }}>Akses langsung setelah pembayaran</p>
        </div>
      </div>

      {/* PROBLEM AGITATION */}
      <div style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.text, margin: 0 }}>
              Belajar Sendiri Itu <span style={{ color: C.goldLight }}>Sering Bikin Stuck?</span>
            </h2>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginTop: 8 }}>Mari kita jujur sama diri sendiri...</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {LP_GENERIC_PROBLEMS.map((item) => (
              <Card key={item.title} style={{ padding: 18 }}>
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.ember}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <X size={17} color={C.emberLight} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14.5, color: C.text, margin: "0 0 4px" }}>{item.title}</h3>
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.55 }}>{item.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div style={{ marginTop: 26, padding: 18, borderRadius: 12, background: `${C.gold}12`, borderLeft: `2px solid ${C.gold}` }}>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, color: C.text, fontStyle: "italic", margin: 0 }}>
              "Kamu latihan KERAS, tapi bukan latihan dengan CARA yang benar."
            </p>
          </div>
        </div>
      </div>

      {/* SOLUSI */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: C.gold }}>Perkenalkan</span>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: C.text, margin: "8px 0" }}>{p.name}</h2>
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, maxWidth: 420, margin: "0 auto" }}>{p.desc}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(p.learn || []).map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${C.gold}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sparkles size={14} color={C.goldLight} />
              </div>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.text }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SOCIAL PROOF */}
      <div style={{ borderTop: `1px solid ${C.borderSoft}`, borderBottom: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, textAlign: "center", marginBottom: 20 }}>Dipercaya oleh pelajar gitar di seluruh Indonesia</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
            {[[`${p.sold || 0}+`, "Pembeli"], [String(p.rating || "5.0"), "Rating Rata-rata"], [p.duration || "-", "Materi"]].map(([n, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.goldLight }}>{n}</div>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TESTIMONI — ulasan asli dari pembeli yang sudah memiliki produk ini */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.text, textAlign: "center", marginBottom: 26 }}>
          Kata Mereka yang Sudah <span style={{ color: C.goldLight }}>Merasakan Manfaatnya</span>
        </h2>
        <TestimonialSection
          productId={p.id}
          owned={owned}
          reviews={productReviews}
          onSubmit={addTestimonial}
          emptyLabel={`Belum ada ulasan untuk ${p.name}. Jadilah pembeli pertama yang berbagi pengalaman!`}
        />
      </div>

      {/* PERBANDINGAN */}
      <div style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.text, textAlign: "center", marginBottom: 24 }}>
            {p.name} vs <span style={{ color: C.goldLight }}>Cara Lain</span>
          </h2>
          <Card style={{ overflow: "auto", padding: 0 }}>
            <table style={{ width: "100%", minWidth: 420, borderCollapse: "collapse", fontFamily: "'Manrope',sans-serif", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.surface2 }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: C.muted, fontWeight: 600 }}>Perbandingan</th>
                  <th style={{ textAlign: "center", padding: "12px 16px", color: C.goldLight, fontWeight: 700 }}>{p.name}</th>
                  <th style={{ textAlign: "center", padding: "12px 16px", color: C.muted, fontWeight: 600 }}>Cara Lain</th>
                </tr>
              </thead>
              <tbody>
                {LP_COMPARISON.map((row) => (
                  <tr key={row.label} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 16px", color: C.text, whiteSpace: "nowrap" }}>{row.label}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span style={{ display: "inline-flex", width: 22, height: 22, borderRadius: "50%", background: `${C.gold}22`, color: C.goldLight, alignItems: "center", justifyContent: "center" }}><Check size={13} /></span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {row.other === "partial" ? (
                        <span style={{ display: "inline-flex", width: 22, height: 22, borderRadius: "50%", background: `${C.mutedDark}33`, color: C.muted, alignItems: "center", justifyContent: "center", fontSize: 13 }}>~</span>
                      ) : (
                        <span style={{ display: "inline-flex", width: 22, height: 22, borderRadius: "50%", background: `${C.ember}22`, color: C.emberLight, alignItems: "center", justifyContent: "center" }}><X size={13} /></span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {/* BONUS — pakai teks bonus yang sudah diisi di data produk (menu Produk -> edit produk) */}
      {p.bonus ? (
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <Badge tone="gold">BONUS SPESIAL</Badge>
            <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.text, margin: "12px 0 0" }}>Nilai Lebih yang Kamu Dapatkan</h2>
          </div>
          <Card style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.gold}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles size={18} color={C.goldLight} />
            </div>
            <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.text }}>{p.bonus}</span>
          </Card>
        </div>
      ) : null}

      {/* PRICING / CTA */}
      <div id="lp-pricing" style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "44px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, background: `${C.ember}18`, border: `1px solid ${C.ember}55`, color: C.emberLight, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700 }}>
              {tierNote}
            </span>
          </div>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "26px 24px", textAlign: "center", borderBottom: `1px solid ${C.border}` }}>
              {hasTiers && !expired ? (
                <>
                  <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, marginBottom: 8 }}>Harga Ini Berakhir Dalam</p>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 24, color: C.emberLight, marginBottom: 16 }}>{hh} : {mm} : {ss}</div>
                </>
              ) : hasTiers ? (
                <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginBottom: 16 }}>Periode harga spesial untuk kamu sudah berakhir</p>
              ) : null}
              <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>{hasTiers && expired ? "Harga Reguler" : "Harga Spesial Terbatas"}</span>
              {disc > 0 && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 20, color: C.mutedDark, textDecoration: "line-through" }}>{rp(anchorPrice)}</span>
                </div>
              )}
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, color: C.goldLight, margin: "6px 0" }}>{rp(currentPrice)}</div>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Akses selamanya, one-time payment</p>
            </div>
            <div style={{ padding: 20 }}>
              {pending ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: C.surface2, border: `1px solid ${C.ember}` }}>
                  <Clock size={15} color={C.emberLight} />
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, color: C.emberLight }}>Pesananmu sedang menunggu verifikasi pembayaran</span>
                </div>
              ) : owned ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: C.surface2, border: `1px solid ${C.gold}` }}>
                  <Check size={15} color={C.gold} />
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, color: C.goldLight }}>Kamu sudah memiliki produk ini</span>
                </div>
              ) : (
                <PrimaryBtn full onClick={buyNow} icon={ArrowRight}>Beli Sekarang</PrimaryBtn>
              )}
              <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 14 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}><ShieldCheck size={13} color={C.gold} /> Pembayaran Aman</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}><Clock size={13} color={C.gold} /> Akses Instan</span>
              </div>
            </div>
          </Card>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {["Akses selamanya—sekali bayar, milik selamanya", "Bisa ditonton ulang kapanpun kamu mau", "Cocok untuk pemula sampai menengah dengan budget terbatas"].map((r) => (
              <div key={r} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Check size={15} color={C.gold} style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "44px 20px" }}>
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.text, textAlign: "center", marginBottom: 22 }}>
          Masih Ragu? <span style={{ color: C.goldLight }}>Ini Jawabannya</span>
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {LP_GENERIC_FAQ.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </div>

      {/* CTA PENUTUP */}
      <div style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.surface, padding: "44px 20px 20px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.text, margin: "0 0 12px" }}>
          Masih Mau <span style={{ color: C.goldLight }}>Belajar Sendirian Tanpa Arah?</span>
        </h2>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, maxWidth: 380, margin: "0 auto 22px", lineHeight: 1.6 }}>
          Atau kamu mau mulai belajar dengan cara yang benar dan melihat progress nyata dalam hitungan minggu?
        </p>
        <PrimaryBtn onClick={scrollToPricing} icon={ArrowRight}>Ya, Saya Mau Mulai Sekarang</PrimaryBtn>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: 14 }}>Bergabung dengan pelajar gitar lainnya di Gitar Sakti</p>
      </div>

      <div style={{ padding: "20px 20px 40px", textAlign: "center" }}>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, margin: 0 }}>© 2026 {p.name} × Gitar Sakti. Seluruh hak cipta dilindungi.</p>
      </div>
    </div>
  );
}


/* ---------------- HALAMAN KUSTOM (dibuat via Admin) ---------------- */
function CustomPageView({ slug, customPages, products, go, openProduct, addToCart, cart, ownedIds, pendingIds, accessProduct, videoProgress, curriculumData, role, onToggleStatus }) {
  const page = customPages.find((p) => p.slug === slug);
  if (!page) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: "'Manrope',sans-serif", color: C.muted }}>Halaman tidak ditemukan.</p>
        <div style={{ marginTop: 16 }}><GhostBtn onClick={() => go("home")}>Kembali ke Beranda</GhostBtn></div>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 20px 60px" }}>
      <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: C.text, margin: "0 0 24px" }}>{page.title.toUpperCase()}</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {page.blocks.map((block, i) => {
          if (block.type === "text") {
            return <p key={i} style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14.5, color: C.muted, lineHeight: 1.75, whiteSpace: "pre-line", maxWidth: 760 }}>{block.content}</p>;
          }
          if (block.type === "image" && block.url) {
            return <img key={i} src={block.url} alt="" style={{ width: "100%", maxWidth: 760, borderRadius: 14, border: `1px solid ${C.border}` }} />;
          }
          if (block.type === "products") {
            const items = block.productIds.map((id) => products.find((p) => p.id === id)).filter(Boolean);
            if (items.length === 0) return null;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }} className="gs-grid-3">
                {items.map((p) => <ProductCard key={p.id} p={p} onOpen={openProduct} onAdd={addToCart} inCart={cart.includes(p.id)} owned={ownedIds.includes(p.id)} pending={pendingIds?.includes(p.id)} onAccess={accessProduct} videoProgress={videoProgress} curriculumData={curriculumData} role={role} onToggleStatus={onToggleStatus} />)}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

/* ---------------- ABOUT (ringkas) ---------------- */
function AboutPage({ go, content, footerContent, role, editMode, updateSiteContent }) {
  const a = content || DEFAULT_SITE_CONTENT.about;
  const admin = role === "admin" && editMode;
  const onSaveAbout = (patch) => updateSiteContent("about", patch);
  const T = (key, area) => (admin ? <EditableText value={a[key]} admin onSave={(v) => onSaveAbout({ [key]: v })} tag="span" area={area} /> : a[key]);
  return (
    <div>
      <Section eyebrow={T("eyebrow")} title={T("title")} sub={T("sub", true)}>
        {admin ? (
          <EditableText value={a.body} admin onSave={(v) => onSaveAbout({ body: v })} tag="p" area style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted, lineHeight: 1.7, maxWidth: 640 }} />
        ) : (
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted, lineHeight: 1.7, maxWidth: 640 }}>
            {a.body}
          </p>
        )}
        <div style={{ marginTop: 24 }}><PrimaryBtn onClick={() => go("shop")} icon={ArrowRight}>{T("ctaLabel")}</PrimaryBtn></div>
      </Section>
      <Footer go={go} content={footerContent} admin={admin} onSave={(patch) => updateSiteContent("footer", patch)} />
    </div>
  );
}

/* ---------------- APP ---------------- */
export default function App() {
  // Kalau situs dibuka dengan tambahan ?halaman=nama-slug di URL (link dari iklan), langsung
  // arahkan ke landing page itu sejak render pertama — supaya tidak sempat "kelip" ke Beranda dulu.
  const [view, setView] = useState(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("halaman")) return "lp";
    return "home";
  });
  const [lpSlug, setLpSlug] = useState(() => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("halaman") : null));
  const [landingPages, setLandingPages] = useState([]);
  const [productSlug, setProductSlug] = useState(INITIAL_PRODUCTS[0].slug);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [curriculumData, setCurriculumData] = useState(INITIAL_CURRICULUM);
  const [curriculumOutline, setCurriculumOutline] = useState({});
  const [cart, setCart] = useState([]);
  const [coupon, setCoupon] = useState(null);
  const [redirectAfterAuth, setRedirectAfterAuth] = useState(null);
  const [preAuthView, setPreAuthView] = useState(null);
  const [customerSub, setCustomerSub] = useState("overview");
  const [adminSub, setAdminSub] = useState("overview");
  const [tampilanSub, setTampilanSub] = useState("menu");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [videoProgress, setVideoProgress] = useState({});
  const [videoCurrent, setVideoCurrent] = useState({});
  const [orders, setOrders] = useState(DEMO_ORDERS);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [coupons, setCoupons] = useState(INITIAL_COUPONS);
  const [siteContent, setSiteContent] = useState(DEFAULT_SITE_CONTENT);
  const [customPages, setCustomPages] = useState([]);
  const [customPageSlug, setCustomPageSlug] = useState(null);
  const [testimonials, setTestimonials] = useState(INITIAL_TESTIMONIALS);
  const [bankInfo, setBankInfo] = useState(DEFAULT_BANK_INFO);
  const [totalVisits, setTotalVisits] = useState(0);

  /* ---------------- MAPPER: baris database (snake_case) <-> bentuk data yang dipakai di seluruh app (camelCase) ---------------- */
  const mapProductRow = (row) => ({
    id: row.id, slug: row.slug, name: row.name, category: row.category, level: row.level,
    price: row.price, oldPrice: row.old_price, rating: Number(row.rating) || 0, reviews: row.reviews, sold: row.sold,
    badge: row.badge, duration: row.duration, format: row.format, hue: row.hue,
    desc: row.description, benefits: row.benefits || [], learn: row.learn_points || [],
    bonus: row.bonus, previewVideo: row.preview_video || "", pricingTiers: row.pricing_tiers, status: row.status,
  });
  const mapCouponRow = (row) => ({
    code: row.code, type: row.type, value: row.value, minPurchase: row.min_purchase,
    limit: row.usage_limit, used: row.used, expiry: row.expiry,
  });
  const mapOrderRow = (row) => ({
    id: row.id,
    date: formatDateID(new Date(row.created_at)),
    items: (row.items || []).map((it) => it.name),
    itemIds: (row.items || []).map((it) => it.id),
    total: row.total,
    discount: row.discount,
    couponCode: row.coupon_code,
    payment: row.payment,
    status: row.status,
    method: row.method,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    customerId: row.customer_id,
    proofImage: row.proof_image_url,
    proofNote: row.proof_note,
    proofSubmittedAt: row.proof_submitted_at ? formatDateID(new Date(row.proof_submitted_at)) : null,
  });

  /* ---------------- FETCH DATA DARI SUPABASE ---------------- */
  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*").order("sort_order");
    if (!error && data) setProducts(data.map(mapProductRow));
  };
  const fetchCurriculum = async () => {
    const { data, error } = await supabase.from("curriculum_videos").select("*").order("sort_order");
    if (error || !data) return;
    const outline = {};
    data.forEach((v) => {
      if (!outline[v.product_id]) outline[v.product_id] = [];
      outline[v.product_id].push(
        v.duration === SECTION_MARKER
          ? { id: v.id, type: "section", title: v.title }
          : { id: v.id, type: "video", title: v.title, desc: v.description || "", url: v.url || "", duration: v.duration || "" }
      );
    });
    const videosOnly = {};
    Object.keys(outline).forEach((pid) => {
      const vids = outline[pid].filter((x) => x.type === "video").map(({ id, title, desc, url, duration }) => ({ id, title, desc, url, duration }));
      if (vids.length > 0) videosOnly[pid] = vids;
    });
    setCurriculumOutline(outline);
    setCurriculumData(videosOnly);
  };
  const fetchCoupons = async () => {
    const { data, error } = await supabase.from("coupons").select("*").order("created_at");
    if (!error && data) setCoupons(data.map(mapCouponRow));
  };
  const fetchTestimonials = async () => {
    const { data, error } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
    if (error || !data) return;
    const grouped = {};
    data.forEach((t) => {
      if (!grouped[t.product_id]) grouped[t.product_id] = [];
      grouped[t.product_id].push({ id: t.id, rating: t.rating, quote: t.quote, name: t.name, date: formatDateID(new Date(t.created_at)) });
    });
    setTestimonials(grouped);
  };
  const fetchBankInfo = async () => {
    const { data } = await supabase.from("bank_info").select("*").eq("id", 1).maybeSingle();
    if (data) setBankInfo({ bankName: data.bank_name, accountNumber: data.account_number, accountHolder: data.account_holder });
  };
  const fetchSiteContent = async () => {
    const { data } = await supabase.from("site_content").select("*").eq("id", 1).maybeSingle();
    if (data && data.content && Object.keys(data.content).length > 0) setSiteContent(data.content);
  };
  const fetchCustomPages = async () => {
    const { data, error } = await supabase.from("custom_pages").select("*").order("created_at");
    if (!error && data) setCustomPages(data.map((p) => ({ id: p.id, slug: p.slug, title: p.title, blocks: p.content || [] })));
  };
  const fetchLandingPages = async () => {
    // RLS: pengunjung biasa cuma lihat yang status published, admin lihat semua (termasuk draft).
    const { data, error } = await supabase.from("landing_pages").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      setLandingPages(data.map((l) => ({
        id: l.id, slug: l.slug, name: l.name, productId: l.product_id,
        headline: l.headline, subheadline: l.subheadline, videoUrl: l.video_url,
        badgeText: l.badge_text, status: l.status, visits: l.visits || 0, orderClicks: l.order_clicks || 0,
      })));
    }
  };
  const fetchOrders = async () => {
    // RLS otomatis membatasi hasil: customer hanya lihat order miliknya, admin lihat semua.
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (!error && data) setOrders(data.map(mapOrderRow));
  };

  // Catat 1 kunjungan setiap kali situs dibuka (dipanggil sekali saat app pertama kali dimuat).
  // Siapa saja (belum login pun) boleh insert baris ini — lihat kebijakan di site_visits.sql.
  const logVisit = async () => {
    await supabase.from("site_visits").insert({});
  };
  // Total kunjungan cuma bisa dibaca oleh admin (dibatasi lewat RLS), dipanggil dari dashboard admin.
  const fetchTotalVisits = async () => {
    const { count } = await supabase.from("site_visits").select("*", { count: "exact", head: true });
    setTotalVisits(count || 0);
  };

  // Data toko (produk, kurikulum, kupon, testimoni, rekening, konten situs, halaman kustom) — publik,
  // dimuat sekali di awal, tidak bergantung status login.
  useEffect(() => {
    fetchProducts();
    fetchCurriculum();
    fetchCoupons();
    fetchTestimonials();
    fetchBankInfo();
    fetchSiteContent();
    fetchCustomPages();
    fetchLandingPages();
    logVisit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTestimonial = async (productId, { rating, quote, name }) => {
    if (!session) return;
    const { error } = await supabase.from("testimonials").insert({
      product_id: productId, customer_id: session.user.id, rating, quote, name,
    });
    if (!error) fetchTestimonials();
  };

  const updateBankInfo = async (data) => {
    setBankInfo(data); // optimistic
    await supabase.from("bank_info").update({
      bank_name: data.bankName, account_number: data.accountNumber, account_holder: data.accountHolder,
    }).eq("id", 1);
  };

  /* ---------------- AKUN & SESI (Supabase Auth) ---------------- */
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const role = profile?.role || null;

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(data || null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s) await fetchProfile(s.user.id);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s) await fetchProfile(s.user.id);
      else setProfile(null);
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pesanan bergantung siapa yang login (RLS membatasi hasil) — dimuat ulang tiap kali sesi
  // berubah, dan disinkronkan real-time supaya admin & customer tidak perlu refresh manual.
  useEffect(() => {
    if (!authReady) return;
    fetchOrders();
    const channel = supabase
      .channel("orders-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, session?.user?.id]);

  // Total kunjungan cuma relevan buat admin — diambil begitu status admin terdeteksi.
  useEffect(() => {
    if (profile?.role === "admin") fetchTotalVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role]);

  const registerCustomer = async ({ name, email, phone, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!name.trim() || !normalizedEmail || !password) return { ok: false, error: "Lengkapi semua kolom." };
    if (password.length < 6) return { ok: false, error: "Kata sandi minimal 6 karakter." };
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail, password,
      options: { data: { name: name.trim(), phone: phone?.trim() || "" } },
    });
    if (error) return { ok: false, error: error.message === "User already registered" ? "Email sudah terdaftar. Silakan masuk." : error.message };
    if (!data.session) {
      // Kalau "Confirm email" masih aktif di Supabase Auth settings, akun dibuat tapi belum
      // langsung bisa login sampai email diverifikasi.
      return { ok: false, error: "Akun dibuat. Silakan cek email untuk verifikasi sebelum masuk (atau matikan 'Confirm email' di Supabase untuk testing)." };
    }
    setSession(data.session);
    await fetchProfile(data.session.user.id);
    return { ok: true };
  };
  const loginCustomer = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { ok: false, error: "Email atau kata sandi salah." };
    setSession(data.session);
    await fetchProfile(data.user.id);
    return { ok: true };
  };
  const loginAdmin = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { ok: false, error: "Email atau kata sandi salah." };
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
    if (prof?.role !== "admin") {
      await supabase.auth.signOut();
      return { ok: false, error: "Akun ini tidak memiliki akses admin." };
    }
    setSession(data.session);
    setProfile(prof);
    return { ok: true };
  };
  const updateCustomerProfile = async (_email, patch) => {
    if (!session) return;
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev)); // optimistic
    await supabase.from("profiles").update(patch).eq("id", session.user.id);
  };
  const logout = async () => {
    await supabase.auth.signOut();
    go("home");
  };
  const changeAdminPassword = async (currentPw, newPw) => {
    if (newPw.length < 6) return { ok: false, error: "Kata sandi baru minimal 6 karakter." };
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: profile.email, password: currentPw });
    if (reauthError) return { ok: false, error: "Kata sandi saat ini salah." };
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  // Ekspor data toko (bukan data pribadi tiap customer, karena itu terlindungi RLS) sebagai backup manual.
  const exportAllData = async () => {
    const snapshot = { exportedAt: new Date().toISOString(), products, orders, coupons, testimonials, siteContent, customPages, bankInfo };
    try {
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gitarsakti-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {}
  };
  // Data sekarang tersimpan di database (bukan localStorage lagi), jadi "reset" tidak bisa
  // dilakukan dari browser. Kalau perlu reset data toko, lakukan lewat Supabase Table Editor
  // atau jalankan ulang SQL seed di SQL Editor.
  const resetAllData = () => {
    alert("Data sekarang tersimpan di database Supabase, bukan di browser. Untuk reset data, buka Supabase Dashboard -> Table Editor, atau jalankan ulang script seed.sql.");
  };

  // Sinkronkan tombol back browser/HP dengan navigasi di dalam app. Tanpa ini, browser tidak
  // punya history entry sama sekali untuk SPA ini sehingga back langsung keluar dari web.
  useEffect(() => {
    try {
      window.history.replaceState({ view, productSlug, customPageSlug, lpSlug }, "");
    } catch (e) {}
    const handlePopState = (e) => {
      const state = e.state;
      if (!state) { setView("home"); return; }
      if (state.productSlug) setProductSlug(state.productSlug);
      setCustomPageSlug(state.customPageSlug || null);
      setLpSlug(state.lpSlug || null);
      setView(state.view);
      setMobileOpen(false);
      window.scrollTo?.({ top: 0, behavior: "instant" });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setiap navigasi di dalam app didorong sebagai history entry browser yang sesungguhnya,
  // supaya tombol back (baik di browser maupun tombol back HP) mundur sesuai urutan halaman
  // yang benar-benar dikunjungi, bukan langsung keluar dari web.
  const go = (target, slug) => {
    const newProductSlug = slug || productSlug;
    if (slug) setProductSlug(slug);
    setView(target);
    setMobileOpen(false);
    window.scrollTo?.({ top: 0, behavior: "instant" });
    try {
      window.history.pushState({ view: target, productSlug: newProductSlug, customPageSlug, lpSlug }, "");
    } catch (e) { /* history API tidak tersedia — abaikan, navigasi tetap jalan lewat state */ }
  };
  // Buka landing page tertentu lewat slug-nya. URL address bar ikut berubah jadi ?halaman=slug
  // supaya link ini bisa dipakai langsung di iklan (Instagram/Facebook Ads dll) dan tetap
  // terbuka ke landing page yang benar meski halaman di-refresh atau dibuka di tab baru.
  const openLandingPage = (slug) => {
    setLpSlug(slug);
    setView("lp");
    setMobileOpen(false);
    window.scrollTo?.({ top: 0, behavior: "instant" });
    try {
      window.history.pushState({ view: "lp", productSlug, customPageSlug, lpSlug: slug }, "", `?halaman=${encodeURIComponent(slug)}`);
    } catch (e) {}
  };
  const openProduct = (slug) => go("product", slug);
  const currentAccount = role === "customer" && profile ? { name: profile.name, email: profile.email, phone: profile.phone } : null;
  // PENTING: orders sudah otomatis terbatas ke milik customer yang login (lewat RLS di database),
  // jadi tidak perlu filter manual lagi di sini — beda dengan versi localStorage sebelumnya yang
  // rawan bocor data antar-customer kalau lupa difilter.
  const ownedIds = role === "customer" ? Array.from(new Set(
    orders.filter((o) => o.payment === "PAID").flatMap((o) => o.itemIds).filter(Boolean)
  )) : [];
  // Produk yang sedang menunggu verifikasi pembayaran (belum PAID, belum juga Gagal) —
  // dipakai untuk mencegah customer checkout ganda untuk produk yang sama.
  const pendingIds = role === "customer" ? Array.from(new Set(
    orders.filter((o) => o.payment === "Pending").flatMap((o) => o.itemIds).filter((id) => id && !ownedIds.includes(id))
  )) : [];
  const goToAuth = () => {
    setPreAuthView({ view, slug: productSlug });
    go("auth");
  };
  const addToCart = (id) => {
    if (!role) {
      const prod = products.find((pr) => pr.id === id);
      setRedirectAfterAuth(prod ? { view: "product", slug: prod.slug } : null);
      setPreAuthView({ view, slug: productSlug });
      go("auth");
      return false;
    }
    if (ownedIds.includes(id) || pendingIds.includes(id)) return false;
    setCart((c) => (c.includes(id) ? c : [...c, id]));
    return true;
  };
  const goOrAuth = (target, slug) => {
    if (!role) { setRedirectAfterAuth({ view: target, slug }); setPreAuthView({ view, slug: productSlug }); go("auth"); return; }
    go(target, slug);
  };
  const onCustomerLogin = async ({ email, password }) => {
    const result = await loginCustomer({ email, password });
    if (result.ok) {
      if (redirectAfterAuth) { go(redirectAfterAuth.view, redirectAfterAuth.slug); setRedirectAfterAuth(null); }
      else go("customer");
    }
    return result;
  };
  const onCustomerRegister = async ({ name, email, phone, password }) => {
    const result = await registerCustomer({ name, email, phone, password });
    if (result.ok) {
      if (redirectAfterAuth) { go(redirectAfterAuth.view, redirectAfterAuth.slug); setRedirectAfterAuth(null); }
      else go("customer");
    }
    return result;
  };
  const onAdminLogin = async ({ email, password }) => {
    const result = await loginAdmin({ email, password });
    if (result.ok) { setRedirectAfterAuth(null); go("admin"); }
    return result;
  };
  const onBack = () => {
    if (preAuthView) { go(preAuthView.view, preAuthView.slug); setPreAuthView(null); }
    else go("home");
  };
  const accessProduct = (p) => {
    if (curriculumData[p.id] && curriculumData[p.id].length > 0) { go("learn", p.slug); return; }
    // Produk tanpa video (mis. bundle atau ebook) belum punya halaman materinya sendiri.
    // Sebelumnya tombol ini diam-diam mengarahkan kembali ke halaman produk yang sama,
    // yang tampak seperti tidak berfungsi karena tidak ada perubahan tampilan.
    alert(`Materi video untuk "${p.name}" belum ditambahkan. Tambahkan kurikulum lewat halaman edit produk di Admin.`);
  };
  const removeFromCart = (id) => setCart((c) => c.filter((x) => x !== id));
  const clearCart = () => { setCart([]); setCoupon(null); };

  const addOrder = async ({ cartProducts, total, discount, couponCode, method, customerName, customerEmail, customerPhone }) => {
    if (!session) return { ok: false, error: "Sesi tidak ditemukan, silakan masuk ulang." };
    const items = cartProducts.map((p) => ({ id: p.id, name: p.name, price: p.price }));
    const subtotal = cartProducts.reduce((s, p) => s + p.price, 0);
    const { data, error } = await supabase.from("orders").insert({
      customer_id: session.user.id,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      items, subtotal, discount, coupon_code: couponCode, total,
      // Midtrans belum terhubung — semua pesanan masuk sebagai Pending dan diverifikasi manual
      // oleh admin setelah customer mengunggah bukti transfer.
      payment: "Pending", status: "Menunggu Pembayaran", method,
    }).select().single();
    if (error) return { ok: false, error: error.message };
    fetchOrders();
    return { ok: true, orderId: data.id };
  };
  // Mengunci harga tier yang sedang berlaku (founder/early bird/reguler) ke produk sebelum
  // masuk keranjang, supaya harga di checkout sama persis dengan yang ditampilkan di landing page.
  const applyPricingAndBuy = (productId, price, oldPrice) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, price, oldPrice } : p))); // optimistic
    supabase.from("products").update({ price, old_price: oldPrice }).eq("id", productId).then(() => {});
    return addToCart(productId);
  };
  // Perubahan status (terutama jadi PAID) lewat RPC di server — bukan UPDATE langsung — supaya
  // penambahan counter "sold" produk & "used" kupon konsisten dan tidak bisa dipalsukan dari client.
  const updateOrderStatus = async (id, payment, status) => {
    const { error } = await supabase.rpc("admin_update_order_status", { p_order_id: id, p_payment: payment, p_status: status });
    if (error) { alert("Gagal mengubah status pesanan: " + error.message); return; }
    fetchOrders();
    fetchProducts();
    fetchCoupons();
  };
  // Upload foto ke Storage privat, lalu catat path-nya ke order lewat RPC (bukan UPDATE langsung,
  // supaya customer hanya bisa mengisi kolom bukti transfer, bukan kolom lain seperti payment/status).
  const attachPaymentProof = async (orderId, file, note) => {
    if (!session) return { ok: false, error: "Sesi tidak ditemukan." };
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${session.user.id}/${orderId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, file);
    if (uploadError) return { ok: false, error: uploadError.message };
    const { error: rpcError } = await supabase.rpc("attach_payment_proof", { p_order_id: orderId, p_proof_url: path, p_note: note });
    if (rpcError) return { ok: false, error: rpcError.message };
    fetchOrders();
    return { ok: true };
  };
  const goToPaymentConfirm = (orderId) => {
    setPendingOrderId(orderId);
    go("paymentconfirm");
  };
  // Dipakai setelah checkout/konfirmasi pembayaran supaya customer selalu mendarat di tab
  // Ringkasan (yang menampilkan pesanan Menunggu juga), bukan di tab terakhir yang mereka buka
  // sebelumnya (misal "Produk Saya", yang cuma menampilkan produk yang sudah PAID — kalau
  // mendarat di situ, produk yang baru dibeli terlihat seperti "hilang" padahal masih pending).
  const goToCustomerOverview = () => {
    setCustomerSub("overview");
    go("customer");
  };
  const cartProducts = cart.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const addProduct = async (data, items) => {
    let baseSlug = slugify(data.name) || `produk-${Date.now()}`;
    let slug = baseSlug;
    let n = 2;
    while (products.some((p) => p.slug === slug)) { slug = `${baseSlug}-${n}`; n++; }
    const videoCount = items.filter((it) => it.type === "video").length;
    const { data: inserted, error } = await supabase.from("products").insert({
      slug, name: data.name, category: data.category, level: data.level,
      price: data.price, old_price: data.oldPrice || data.price, rating: 0, reviews: 0, sold: 0,
      badge: "New", duration: data.duration || `${videoCount} video`, format: data.format || "Video Course",
      hue: data.hue || "#C9A24B", description: data.desc || "", benefits: data.benefits || [], learn_points: data.learn || [],
      bonus: data.bonus || "", status: data.status || "draft", preview_video: data.previewVideo || "",
      sort_order: products.length,
    }).select().single();
    if (error) { alert("Gagal menambah produk: " + error.message); return null; }
    if (items && items.length > 0) {
      await supabase.from("curriculum_videos").insert(items.map((it, i) => (
        it.type === "section"
          ? { product_id: inserted.id, title: it.title, description: "", url: "", duration: SECTION_MARKER, sort_order: i }
          : { product_id: inserted.id, title: it.title, description: it.desc || "", url: it.url || "", duration: it.duration || "", sort_order: i }
      )));
    }
    await fetchProducts();
    await fetchCurriculum();
    return mapProductRow(inserted);
  };
  const updateProduct = async (id, data, items) => {
    const videoCount = items.filter((it) => it.type === "video").length;
    const payload = {
      name: data.name, category: data.category, level: data.level,
      price: data.price, old_price: data.oldPrice || data.price, description: data.desc || "",
      status: data.status || "published", preview_video: data.previewVideo || "",
      benefits: data.benefits || [], learn_points: data.learn || [], bonus: data.bonus || "",
    };
    if (videoCount > 0) payload.duration = `${videoCount} video`;
    await supabase.from("products").update(payload).eq("id", id);
    await supabase.from("curriculum_videos").delete().eq("product_id", id);
    if (items && items.length > 0) {
      await supabase.from("curriculum_videos").insert(items.map((it, i) => (
        it.type === "section"
          ? { product_id: id, title: it.title, description: "", url: "", duration: SECTION_MARKER, sort_order: i }
          : { product_id: id, title: it.title, description: it.desc || "", url: it.url || "", duration: it.duration || "", sort_order: i }
      )));
    }
    await fetchProducts();
    await fetchCurriculum();
  };
  const toggleProductStatus = async (id) => {
    const current = products.find((p) => p.id === id);
    if (!current) return;
    const next = (current.status || "published") === "published" ? "draft" : "published";
    await supabase.from("products").update({ status: next }).eq("id", id);
    fetchProducts();
  };
  const deleteProduct = async (id) => {
    const hasOrders = orders.some((o) => o.itemIds.includes(id));
    if (hasOrders) {
      // Jangan benar-benar dihapus — kalau ada customer yang sudah membeli produk ini, menghapus
      // record-nya akan membuat mereka kehilangan akses ke materi yang sudah dibayar. Diarsipkan
      // saja: hilang dari Shop/Beranda, tapi tetap bisa diakses oleh yang sudah memilikinya.
      await supabase.from("products").update({ status: "archived" }).eq("id", id);
    } else {
      await supabase.from("curriculum_videos").delete().eq("product_id", id);
      await supabase.from("products").delete().eq("id", id);
    }
    fetchProducts();
    fetchCurriculum();
  };
  const moveProduct = async (id, direction) => {
    const idx = products.findIndex((p) => p.id === id);
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || newIdx < 0 || newIdx >= products.length) return;
    const a = products[idx], b = products[newIdx];
    setProducts((prev) => {
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
    await supabase.from("products").update({ sort_order: newIdx }).eq("id", a.id);
    await supabase.from("products").update({ sort_order: idx }).eq("id", b.id);
    fetchProducts();
  };
  const updateSiteContent = async (section, data) => {
    const next = { ...siteContent, [section]: { ...siteContent[section], ...data } };
    setSiteContent(next); // optimistic
    await supabase.from("site_content").update({ content: next }).eq("id", 1);
  };
  const openCustomPage = (slug) => {
    setCustomPageSlug(slug);
    setView("custompage");
    setMobileOpen(false);
    window.scrollTo?.({ top: 0, behavior: "instant" });
    try {
      window.history.pushState({ view: "custompage", productSlug, customPageSlug: slug }, "");
    } catch (e) {}
  };
  const goToAddPage = () => { setAdminSub("tampilan"); setTampilanSub("halaman"); go("admin"); };
  const addCustomPage = async (title, blocks) => {
    let baseSlug = slugify(title) || `halaman-${Date.now()}`;
    let slug = baseSlug;
    let n = 2;
    while (customPages.some((p) => p.slug === slug)) { slug = `${baseSlug}-${n}`; n++; }
    await supabase.from("custom_pages").insert({ slug, title, content: blocks });
    fetchCustomPages();
  };
  const updateCustomPage = async (id, title, blocks) => {
    await supabase.from("custom_pages").update({ title, content: blocks }).eq("id", id);
    fetchCustomPages();
  };
  const deleteCustomPage = async (id) => {
    await supabase.from("custom_pages").delete().eq("id", id);
    fetchCustomPages();
  };
  const addLandingPage = async (form) => {
    let baseSlug = slugify(form.name) || `lp-${Date.now()}`;
    let slug = baseSlug;
    let n = 2;
    while (landingPages.some((l) => l.slug === slug)) { slug = `${baseSlug}-${n}`; n++; }
    const { error } = await supabase.from("landing_pages").insert({
      slug, name: form.name, product_id: form.productId,
      headline: form.headline || "", subheadline: form.subheadline || "",
      video_url: form.videoUrl || "", badge_text: form.badgeText || "",
      status: "published",
    });
    fetchLandingPages();
    return { ok: !error, error: error?.message, slug };
  };
  const updateLandingPage = async (id, form) => {
    await supabase.from("landing_pages").update({
      name: form.name, product_id: form.productId,
      headline: form.headline || "", subheadline: form.subheadline || "",
      video_url: form.videoUrl || "", badge_text: form.badgeText || "",
      status: form.status || "published",
    }).eq("id", id);
    fetchLandingPages();
  };
  const deleteLandingPage = async (id) => {
    await supabase.from("landing_pages").delete().eq("id", id);
    fetchLandingPages();
  };
  const addCoupon = async (data) => {
    await supabase.from("coupons").insert({
      code: data.code, type: data.type, value: data.value,
      min_purchase: data.minPurchase || 0, usage_limit: data.limit || 0, used: 0, expiry: data.expiry || null,
    });
    fetchCoupons();
  };
  // Dihitung di client dari daftar kupon yang sudah di-fetch — cukup untuk kebutuhan sekarang.
  // (Ada juga RPC validate_coupon di database untuk validasi sisi-server yang lebih ketat kalau
  // nanti dibutuhkan, tapi belum dipakai supaya alur tampilan harga tetap instan/sinkron.)
  const calcDiscount = (subtotal, couponCode) => {
    if (!couponCode) return 0;
    const c = coupons.find((x) => x.code === couponCode);
    if (!c) return 0;
    if (c.minPurchase && subtotal < c.minPurchase) return 0;
    if (c.type === "percent") return Math.round(subtotal * (c.value / 100));
    return Math.min(c.value, subtotal);
  };

  if (!authReady) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted }}>Memuat...</span>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100%", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; min-height: 100%; background: ${C.bg}; }
        input:focus, select:focus { outline: 1px solid ${C.gold}; }
        ::placeholder { color: ${C.mutedDark}; }
        table td, table th { white-space: nowrap; }
        table { min-width: 560px; }
        .gs-scroll-hint { display: none; }
        .gs-edit-pencil { opacity: 0.55; transition: opacity .15s; }
        .gs-editable:hover .gs-edit-pencil { opacity: 1; }
        @media (max-width: 860px) {
          .gs-desktop-nav { display: none !important; }
          .gs-hero-grid { grid-template-columns: 1fr !important; }
          .gs-grid-2, .gs-grid-3, .gs-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .gs-footer-grid { grid-template-columns: 1fr 1fr !important; }
          .gs-dash-layout { flex-direction: column !important; }
          .gs-sidebar-wrap { width: 100% !important; }
          .gs-sidebar { flex-direction: row !important; gap: 8px !important; overflow-x: auto; overflow-y: hidden; padding-bottom: 6px; -webkit-overflow-scrolling: touch; }
          .gs-sidebar button { flex-shrink: 0; white-space: nowrap; }
          .gs-hero-title { font-size: 38px !important; line-height: 1.08 !important; }
          .gs-scroll-hint { display: flex !important; }
        }
        @media (max-width: 560px) {
          .gs-grid-2, .gs-grid-3, .gs-grid-4 { grid-template-columns: 1fr !important; }
          .gs-footer-grid { grid-template-columns: 1fr !important; }
          .gs-hero-title { font-size: 32px !important; }
        }
        @media (min-width: 861px) { .gs-mobile-toggle { display: none !important; } }
      `}</style>

      {view !== "lp" && <Header view={view} go={go} goOrAuth={goOrAuth} goToAuth={goToAuth} cartCount={cart.length} role={role} accountName={currentAccount?.name || "Akun"} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} customPages={customPages} openCustomPage={openCustomPage} customPageSlug={customPageSlug} content={siteContent.header} editMode={editMode} setEditMode={setEditMode} onSaveHeader={(data) => updateSiteContent("header", data)} goToAddPage={goToAddPage} />}

      {view === "home" && <HomePage go={go} openProduct={openProduct} addToCart={addToCart} cart={cart} ownedIds={ownedIds} pendingIds={pendingIds} accessProduct={accessProduct} videoProgress={videoProgress} products={products} curriculumData={curriculumData} content={siteContent} role={role} editMode={editMode} updateSiteContent={updateSiteContent} onToggleStatus={toggleProductStatus} />}
      {view === "shop" && <ShopPage go={go} openProduct={openProduct} addToCart={addToCart} cart={cart} ownedIds={ownedIds} pendingIds={pendingIds} accessProduct={accessProduct} videoProgress={videoProgress} products={products} curriculumData={curriculumData} content={siteContent} role={role} onToggleStatus={toggleProductStatus} />}
      {view === "product" && <ProductPage slug={productSlug} go={go} addToCart={addToCart} cart={cart} ownedIds={ownedIds} pendingIds={pendingIds} accessProduct={accessProduct} videoProgress={videoProgress} products={products} curriculumData={curriculumData} testimonials={testimonials} addTestimonial={addTestimonial} role={role} onToggleStatus={toggleProductStatus} />}
      {view === "cart" && <CartPage go={go} cartProducts={cartProducts} removeFromCart={removeFromCart} coupon={coupon} setCoupon={setCoupon} coupons={coupons} calcDiscount={calcDiscount} />}
      {view === "checkout" && (
        currentAccount ? (
          <CheckoutPage go={go} cartProducts={cartProducts} coupon={coupon} setCoupon={setCoupon} coupons={coupons} clearCart={clearCart} addOrder={addOrder} calcDiscount={calcDiscount} goToPaymentConfirm={goToPaymentConfirm} account={currentAccount} />
        ) : (
          <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted }}>Sesi kamu sudah berakhir. Silakan masuk kembali.</p>
            <div style={{ marginTop: 16 }}><PrimaryBtn onClick={() => go("auth")}>Masuk</PrimaryBtn></div>
          </div>
        )
      )}
      {view === "paymentconfirm" && <PaymentConfirmationPage go={go} order={orders.find((o) => o.id === pendingOrderId)} attachPaymentProof={attachPaymentProof} bankInfo={bankInfo} goToCustomerOverview={goToCustomerOverview} />}
      {view === "auth" && <AuthPage go={go} onCustomerLogin={onCustomerLogin} onCustomerRegister={onCustomerRegister} onAdminLogin={onAdminLogin} onBack={onBack} />}
      {view === "about" && <AboutPage go={go} content={siteContent.about} footerContent={siteContent.footer} role={role} editMode={editMode} updateSiteContent={updateSiteContent} />}
      {view === "lp" && <LandingPageTemplate lp={landingPages.find((l) => l.slug === lpSlug)} go={go} applyPricingAndBuy={applyPricingAndBuy} products={products} testimonials={testimonials} addTestimonial={addTestimonial} ownedIds={ownedIds} pendingIds={pendingIds} />}
      {(view === "privacy" || view === "terms" || view === "refund") && <LegalPage slug={view} go={go} />}
      {view === "custompage" && <CustomPageView slug={customPageSlug} customPages={customPages} products={products} go={go} openProduct={openProduct} addToCart={addToCart} cart={cart} ownedIds={ownedIds} pendingIds={pendingIds} accessProduct={accessProduct} videoProgress={videoProgress} curriculumData={curriculumData} role={role} onToggleStatus={toggleProductStatus} />}
      {view === "customer" && (
        currentAccount ? (
          <CustomerDashboard go={go} sub={customerSub} setSub={setCustomerSub} orders={orders} account={currentAccount} onLogout={logout} onUpdateProfile={updateCustomerProfile} videoProgress={videoProgress} products={products} curriculumData={curriculumData} goToPaymentConfirm={goToPaymentConfirm} accessProduct={accessProduct} />
        ) : (
          <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted }}>Sesi kamu sudah berakhir. Silakan masuk kembali.</p>
            <div style={{ marginTop: 16 }}><PrimaryBtn onClick={() => go("auth")}>Masuk</PrimaryBtn></div>
          </div>
        )
      )}
      {view === "learn" && (() => {
        const learnProduct = products.find((x) => x.slug === productSlug);
        const canAccess = learnProduct && (role === "admin" || (role === "customer" && ownedIds.includes(learnProduct.id)));
        if (!canAccess) {
          return (
            <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
              <Lock size={28} color={C.mutedDark} style={{ margin: "0 auto 14px" }} />
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted }}>Kamu belum memiliki akses ke materi ini.</p>
              <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center" }}>
                <GhostBtn onClick={() => go("shop")}>Lihat Produk</GhostBtn>
                {!role && <PrimaryBtn onClick={() => go("auth")}>Masuk</PrimaryBtn>}
              </div>
            </div>
          );
        }
        return <LearnPage slug={productSlug} go={go} progress={videoProgress} setProgress={setVideoProgress} current={videoCurrent} setCurrent={setVideoCurrent} products={products} curriculumData={curriculumData} curriculumOutline={curriculumOutline} />;
      })()}
      {view === "admin" && <AdminDashboard go={go} sub={adminSub} setSub={setAdminSub} onLogout={logout} products={products} addProduct={addProduct} updateProduct={updateProduct} toggleProductStatus={toggleProductStatus} deleteProduct={deleteProduct} moveProduct={moveProduct} curriculumData={curriculumData} curriculumOutline={curriculumOutline} coupons={coupons} addCoupon={addCoupon} siteContent={siteContent} updateSiteContent={updateSiteContent} customPages={customPages} addCustomPage={addCustomPage} updateCustomPage={updateCustomPage} deleteCustomPage={deleteCustomPage} tampilanSub={tampilanSub} setTampilanSub={setTampilanSub} orders={orders} updateOrderStatus={updateOrderStatus} bankInfo={bankInfo} updateBankInfo={updateBankInfo} onChangeAdminPassword={changeAdminPassword} onExportData={exportAllData} onResetData={resetAllData} totalVisits={totalVisits} landingPages={landingPages} addLandingPage={addLandingPage} updateLandingPage={updateLandingPage} deleteLandingPage={deleteLandingPage} openLandingPage={openLandingPage} />}
    </div>
  );
}
