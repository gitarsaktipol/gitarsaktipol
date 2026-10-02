import React, { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Menu, X, Search, ShoppingCart, Star, PlayCircle, Lock, Check, ChevronRight,
  ChevronDown, ChevronUp, User, LogOut, LayoutDashboard, Package, ClipboardList, Users,
  Tag, BarChart3, Settings, TrendingUp, DollarSign, ShoppingBag, Plus, Trash2,
  Pencil, ArrowRight, ArrowLeft, Sparkles, Eye, Filter, Music, Clock, Download,
  CreditCard, QrCode, Wallet, ShieldCheck, Youtube, Instagram, Copy, Upload, Landmark,
  Image as ImageIcon, Bold, Italic, Type, List, ToggleLeft, ToggleRight, Sun, Moon,
  GripVertical, Minus, Truck, Box, Shirt, Package2, ImagePlus, RotateCcw, Play, SkipForward, SkipBack, Sparkle,
} from "lucide-react";
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";

// Publishable key AMAN ditaruh di kode frontend (bukan rahasia) — akses data
// sesungguhnya dikontrol oleh RLS policy di database, bukan oleh key ini.
// Kunci rahasia (service_role) TIDAK BOLEH pernah ditaruh di sini.
// Banner "sedang dalam penyempurnaan" di atas header. Aktif secara default; untuk mematikannya saat
// launch, isi VITE_MODE_PERSIAPAN=0 di Vercel → Environment Variables lalu redeploy.
const SHOW_MAINTENANCE_BANNER = import.meta.env.VITE_MODE_PERSIAPAN !== "0";

const SUPABASE_URL = "https://addtajuxfoxcaezmkice.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_zc3y05OhRgEJQlum3x-brg_iehDElTb";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Panggil Supabase Edge Function dengan token sesi login (bukan publishable key), supaya
// function bisa memastikan siapa yang memanggil. Pesan error dari function ikut diteruskan.
const invokeFn = async (name, body) => {
  try {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) {
      let msg = error.message;
      try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; } catch (e) { /* bukan JSON */ }
      return { ok: false, error: msg };
    }
    if (data && data.ok === false) return { ok: false, error: data.error };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e?.message || "Gagal menghubungi server." };
  }
};

/* ---------------- design tokens (gaya iOS: putih bersih, aksen emas & terracotta) ---------------- */
const LIGHT_THEME = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  surface2: "#F5F5F7",
  border: "#E5E5EA",
  borderSoft: "#EFEFF2",
  gold: "#B8892E",
  goldLight: "#8A6416",
  ember: "#C1442A",
  emberLight: "#A83A24",
  text: "#1D1D1F",
  muted: "#6E6E73",
  mutedDark: "#86868B",
  btnPrimaryBg: "#1D1D1F",
  btnPrimaryText: "#FFFFFF",
  headerBg: "rgba(255,255,255,0.78)",
};
const DARK_THEME = {
  bg: "#121214",
  surface: "#1C1C1F",
  surface2: "#26262A",
  border: "#3A3A3F",
  borderSoft: "#2C2C30",
  gold: "#D4A94A",
  goldLight: "#E8C670",
  ember: "#E0553A",
  emberLight: "#FF6B4A",
  text: "#F2F2F3",
  muted: "#A1A1A6",
  mutedDark: "#8E8E93",
  btnPrimaryBg: "#F2F2F3",
  btnPrimaryText: "#1D1D1F",
  headerBg: "rgba(18,18,20,0.78)",
};
// "themeState" itu objek biasa (bukan React state) yang isinya bisa berubah — dipakai supaya C.xxx
// yang dipakai di ~800 tempat di seluruh file ini otomatis mengikuti tema aktif TANPA perlu ubah
// satu-satu. Caranya: C dibuat lewat Proxy, jadi tiap kali kode nulis C.text / C.bg / dst, nilainya
// selalu diambil live sesuai tema yang sedang aktif saat itu. Re-render dipicu oleh state React biasa
// (lihat useTheme di dalam App()), jadi tampilan tetap ikut alur React yang normal.
const themeState = { mode: "light" };
const C = new Proxy({}, {
  get(_target, key) {
    return (themeState.mode === "dark" ? DARK_THEME : LIGHT_THEME)[key];
  },
});

// Aset brand — taruh file gambar ini di folder "public" project (public/), path di bawah akan otomatis ketemu.
const LOGO_URL = "/gitar-sakti-logo.png";
// Menu alat musik (FerTune: tuner, latihan baca not, partitur). Disajikan di /fertune/ lewat
// rewrite di vercel.json. Nama menu belum final -- cukup ubah teks di bawah ini.
const FERTUNE_LABEL = "FerTune";
const FERTUNE_URL = "/fertune/";
const HERO_BG_URL = "/gitar-sakti-bg.jpg";

const rp = (n) => "Rp" + (Number(n) || 0).toLocaleString("id-ID");

const toEmbedUrl = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${u.pathname.split("/").filter(Boolean)[0]}`;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.includes("/embed/")) return url;
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const m = u.pathname.match(/\/(?:shorts|live)\/([A-Za-z0-9_-]{11})/);
      if (m) return `https://www.youtube.com/embed/${m[1]}`;
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
// Versi embed untuk halaman materi member: tanpa rekomendasi video channel lain di akhir video
// (rel=0) supaya member tidak "tersesat" ke YouTube di tengah belajar.
const toLessonEmbedUrl = (url) => {
  const base = toEmbedUrl(url);
  if (!base) return null;
  try {
    const u = new URL(base);
    if (u.hostname.includes("youtube.com")) {
      u.searchParams.set("rel", "0");
      u.searchParams.set("modestbranding", "1");
      u.searchParams.set("playsinline", "1");
    }
    return u.toString();
  } catch (e) { return base; }
};
// Kirim event ke Meta Pixel kalau sudah dipasang (lihat VITE_META_PIXEL_ID di README).
const trackEvent = (name, params) => {
  try { if (typeof window !== "undefined" && typeof window.fbq === "function") window.fbq("track", name, params); } catch (e) { /* abaikan */ }
};

// Link chat WhatsApp dari nomor Indonesia (08xx / +628xx / 628xx).
const waLink = (phone, text = "") => {
  let n = String(phone || "").replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

// Thumbnail otomatis dari video YouTube (dipakai sebagai gambar kartu produk).
const youtubeThumb = (url) => {
  const embed = toEmbedUrl(url);
  const m = embed && embed.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
};
// Gambar utama produk: foto yang diupload admin (merchandise), kalau tidak ada pakai
// thumbnail video preview YouTube (kelas video).
const productImage = (p) => (Array.isArray(p?.images) && p.images[0]) || youtubeThumb(p?.previewVideo) || null;
// Total stok barang fisik (null = tidak dibatasi). Kalau punya varian, jumlah stok semua varian.
const productStockTotal = (p) => {
  const vs = Array.isArray(p?.variants) ? p.variants : [];
  if (vs.length > 0) {
    if (vs.some((v) => v.stock === null || v.stock === undefined || v.stock === "")) return null;
    return vs.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  }
  return p?.stock === null || p?.stock === undefined ? null : Number(p.stock);
};
function ProductThumb({ p, size = 44, radius = 12 }) {
  const img = productImage(p);
  const physical = p?.productType === "physical";
  return (
    <div style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: "hidden", background: img ? `center / cover no-repeat url("${img}")` : `linear-gradient(135deg, ${(p?.hue || "#C9A24B")}44, ${C.surface2})`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.borderSoft}` }}>
      {!img && (physical ? <Package size={Math.round(size * 0.42)} color={p?.hue || C.gold} /> : <Music size={Math.round(size * 0.42)} color={p?.hue || C.gold} />)}
    </div>
  );
}
const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const formatDateID = (d) => `${d.getDate().toString().padStart(2, "0")} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
// Catatan: ID pesanan (format GS-YYYYMMDD-XXX) sekarang dibuat otomatis oleh database lewat
// sequence (lihat backend/schema.sql -> generate_order_id()), bukan dihitung di sini lagi —
// supaya tidak bentrok kalau ada beberapa customer checkout bersamaan.

const CATEGORIES = [
  "Beginner Guitar", "Guitar Technique", "Melody", "Speed & Shredding",
  "Improvisation", "Music Theory", "Ebook", "Bundle",
];

// Judul materi (section header) di kurikulum video disimpan sebagai baris curriculum_videos biasa,
// ditandai lewat sentinel ini di kolom "duration" — supaya tidak perlu menambah kolom baru di database.
const SECTION_MARKER = "__section__";

const FAQ_HOME = [
  { q: "Apakah materi bisa diakses selamanya?", a: "Ya. Setelah pembayaran terverifikasi, produk masuk ke akun kamu dan dapat diakses kapan saja tanpa batas waktu." },
  { q: "Apakah cocok untuk yang belum pernah pegang gitar?", a: "Cocok. Tersedia kategori Beginner Guitar yang disusun dari nol tanpa asumsi kemampuan sebelumnya." },
  { q: "Metode pembayaran apa saja yang tersedia?", a: "Sesuai metode yang tersedia di halaman checkout (mis. transfer bank atau QRIS). Setelah membayar, unggah bukti pembayaran — materi terbuka di akunmu begitu pembayaran diverifikasi admin, biasanya dalam 1x24 jam pada hari kerja." },
  { q: "Bagaimana jika ada kendala saat belajar?", a: "Kamu dapat menghubungi tim Gitar Sakti lewat kontak WhatsApp atau email yang tertera di bagian bawah halaman." },
];

// Nilai awal (default) rekening tujuan pembayaran. Bisa diganti admin lewat
// Pengaturan → Rekening — perubahan tersimpan di localStorage lewat state `bankInfo` di App().
const DEFAULT_BANK_INFO = {
  bankName: "Bank BCA",
  accountNumber: "-",
  accountHolder: "-",
};


// Testimoni asli dari pembeli, dikelompokkan per productId. Kosong di awal — diisi lewat form
// "Tulis Ulasan" yang hanya muncul untuk pembeli yang benar-benar sudah memiliki produk tsb.
const INITIAL_TESTIMONIALS = {};

const DEMO_ORDERS = [];

const ADMIN_ORDERS = [];

const ADMIN_CUSTOMERS = [];

const DEFAULT_SITE_CONTENT = {
  home: {
    heroBadge: "Kursus gitar online terstruktur — dari pemula hingga mahir",
    heroTitleLine: "KUASAI GITAR. KUASAI MELODI.",
    heroTitleHighlight: "JADI GITARIS",
    heroTitleEnd: "YANG KAMU IMPIKAN.",
    heroSubtitle: "Kursus video terstruktur dari fondasi dasar sampai teknik shredding lanjutan. Belajar sesuai ritme kamu, akses materi selamanya.",
    heroVideoUrl: "",
    heroCta1: "Lihat Semua Produk",
    heroCta2: "Lihat Contoh Materi",
    stat1Num: "24/7", stat1Label: "Akses materi kapan saja",
    stat2Num: "Dari Nol", stat2Label: "Jalur untuk pemula",
    stat3Num: "Video", stat3Label: "Kursus terstruktur",
    featuredEyebrow: "Pilihan Kami", featuredTitle: "Produk Unggulan",
    featuredSub: "Kursus dan materi pilihan dari Gitar Sakti untuk mulai belajar.",
    categoryEyebrow: "Jelajahi", categoryTitle: "Kategori Belajar",
    categorySub: "Pilih kategori sesuai level dan tujuan belajarmu.",
    whyEyebrow: "Kenapa Gitar Sakti", whyTitle: "Belajar dengan Jalur yang Jelas",
    whySub: "Materi disusun rapi dari dasar sampai mahir, dengan target yang jelas di setiap tahap.",
    whyItems: [
      { title: "Fondasi kuat", desc: "Materi disusun bertahap, tidak melompat sebelum dasar benar-benar melekat." },
      { title: "Latihan terarah", desc: "Materi disusun berurutan supaya mudah diikuti dan dilatih sesuai ritme kamu." },
      { title: "Praktik langsung", desc: "Belajar lewat contoh permainan di video, bukan cuma teori." },
      { title: "Akses selamanya", desc: "Satu kali beli, materi dapat diputar ulang kapan pun kamu butuh." },
      { title: "Dari pemula ke mahir", desc: "Jalur lengkap dari chord pertama sampai teknik shredding lanjutan." },
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
    instagramUrl: "",
    youtubeUrl: "",
    whatsapp: "",
    email: "",
    copyrightText: "© 2026 Gitar Sakti. Seluruh hak cipta dilindungi.",
  },
  about: {
    eyebrow: "Tentang Kami",
    title: "Gitar Sakti",
    sub: "Platform edukasi gitar digital yang dibangun untuk membantu siapa pun belajar gitar secara mandiri, terstruktur, dan bisa diukur progresnya.",
    body: "Kami percaya belajar gitar tidak harus membingungkan. Setiap course di Gitar Sakti disusun dengan jalur belajar yang jelas, dari fondasi dasar hingga teknik lanjutan seperti shredding dan improvisasi.",
    ctaLabel: "Mulai Belajar",
  },
};

// Teks contoh lama (berisi klaim yang tidak bisa dibuktikan, mis. "8.200+ siswa") mungkin sudah
// tersimpan di database dari versi awal. Kalau nilainya masih PERSIS sama dengan teks contoh lama
// (belum pernah diedit admin), ganti otomatis dengan teks baru yang jujur.
const LEGACY_PLACEHOLDER_TEXT = {
  home: {
    heroBadge: "Sudah dipercaya 8.200+ pelajar gitar di Indonesia",
    stat1Num: "8.200+", stat1Label: "Siswa aktif",
    stat2Num: "96%", stat2Label: "Rating positif",
    stat3Num: "6", stat3Label: "Kategori kursus",
    featuredEyebrow: "Pilihan Terpopuler",
    featuredSub: "Kursus dan materi yang paling banyak dipilih siswa Gitar Sakti bulan ini.",
    categorySub: "Dari nol sampai teknik lanjutan, semua level tersedia.",
  },
  about: {
    body: "Kami percaya belajar gitar tidak harus mahal atau membingungkan. Setiap course di Gitar Sakti disusun oleh instruktur berpengalaman, dengan jalur belajar yang jelas dari fondasi dasar hingga teknik lanjutan seperti shredding dan improvisasi.",
  },
  footer: { instagramUrl: "https://instagram.com/", youtubeUrl: "https://youtube.com/" },
};
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

const WHY_ICONS = [ShieldCheck, ClipboardList, Music, Clock, TrendingUp];
const stripFretPrefix = (t) => String(t || "").replace(/^\s*Fret\s*\d+\s*[—–-]\s*/i, "");
function WhyIcon({ idx }) {
  const Icon = WHY_ICONS[idx] || Sparkles;
  return (
    <div style={{ width: 38, height: 38, borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={18} color={C.gold} />
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

function Badge({ children, tone = "gold", dot }) {
  const map = {
    gold: { bg: `linear-gradient(135deg, ${C.goldLight}, ${C.gold})`, fg: "#1A140A", bd: "transparent" },
    ember: { bg: `linear-gradient(135deg, ${C.emberLight}, ${C.ember})`, fg: "#FFFFFF", bd: "transparent" },
    green: { bg: "rgba(52,168,83,0.14)", fg: "#2E9A4E", bd: "rgba(52,168,83,0.35)" },
    muted: { bg: C.surface2, fg: C.muted, bd: C.border },
  };
  const t = map[tone] || map.gold;
  return (
    <span className="gs-badge" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "'Manrope',sans-serif", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, whiteSpace: "nowrap" }}>
      {dot && <span className="gs-badge-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />}
      {children}
    </span>
  );
}

/* ---------------- teks berformat (bold/italic/judul/bullet) ---------------- */
// Parser ringan buat markdown sederhana: **tebal**, *miring*, "## " di awal baris jadi judul,
// dan "* " di awal baris (atau di tengah kalimat, hasil konten lama) jadi bullet list.
function parseInlineFormatting(text, keyPrefix = "") {
  const nodes = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[2] !== undefined) nodes.push(<strong key={`${keyPrefix}b${key++}`}>{match[2]}</strong>);
    else nodes.push(<em key={`${keyPrefix}i${key++}`}>{match[3]}</em>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function RichText({ text, style }) {
  if (!text) return null;
  // Konten lama sering nulis bullet " * " di tengah kalimat (bukan di awal baris) — ubah dulu
  // jadi baris baru supaya tetap kebaca rapi tanpa admin perlu edit ulang teks lamanya.
  const normalized = text.replace(/ \*(?!\*)\s+/g, "\n* ");
  const lines = normalized.split("\n");
  const blocks = [];
  let paragraph = [];
  let list = [];
  const flushParagraph = () => { if (paragraph.length) { blocks.push({ type: "p", content: paragraph.join(" ") }); paragraph = []; } };
  const flushList = () => { if (list.length) { blocks.push({ type: "ul", items: list }); list = []; } };
  lines.forEach((raw) => {
    const line = raw.trim();
    if (line === "") { flushParagraph(); flushList(); return; }
    if (/^##\s+/.test(line)) { flushParagraph(); flushList(); blocks.push({ type: "h", content: line.replace(/^##\s+/, "") }); return; }
    if (/^\*\s+/.test(line) && !/^\*\*/.test(line)) { flushParagraph(); list.push(line.replace(/^\*\s+/, "")); return; }
    flushList(); paragraph.push(line);
  });
  flushParagraph(); flushList();

  return (
    <div style={style}>
      {blocks.map((b, i) => {
        if (b.type === "h") return <p key={i} style={{ fontSize: "1.2em", fontWeight: 800, color: C.text, margin: i === 0 ? "0 0 8px" : "16px 0 8px" }}>{parseInlineFormatting(b.content, `h${i}`)}</p>;
        if (b.type === "ul") return (
          <ul key={i} style={{ margin: "6px 0 12px", paddingLeft: 20 }}>
            {b.items.map((item, j) => <li key={j} style={{ marginBottom: 4 }}>{parseInlineFormatting(item, `l${i}${j}`)}</li>)}
          </ul>
        );
        return <p key={i} style={{ margin: i === 0 ? "0 0 10px" : "10px 0" }}>{parseInlineFormatting(b.content, `p${i}`)}</p>;
      })}
    </div>
  );
}

const richToolbarBtnStyle = { display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", color: C.muted };

// Textarea deskripsi + toolbar Bold/Italic/Judul/Bullet. Tombolnya membungkus teks yang
// diseleksi dengan sintaks markdown ringan di atas (**, *, ## , * ), yang lalu dirender rapi
// oleh <RichText/> di halaman produk — jadi admin tidak perlu ngetik HTML atau simbol manual.
function RichTextEditor({ value, onChange, placeholder, rows = 6 }) {
  const taRef = useRef(null);
  const pendingSelection = useRef(null);

  useEffect(() => {
    if (pendingSelection.current && taRef.current) {
      const { start, end } = pendingSelection.current;
      taRef.current.focus();
      taRef.current.setSelectionRange(start, end);
      pendingSelection.current = null;
    }
  }, [value]);

  const applyWrap = (marker, placeholderText) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const inner = selected || placeholderText;
    const newValue = value.slice(0, start) + marker + inner + marker + value.slice(end);
    onChange(newValue);
    pendingSelection.current = { start: start + marker.length, end: start + marker.length + inner.length };
  };

  const applyLinePrefix = (prefix) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = value.indexOf("\n", end);
    if (lineEnd === -1) lineEnd = value.length;
    const block = value.slice(lineStart, lineEnd);
    const lines = block.split("\n");
    const alreadyPrefixed = lines.every((l) => l.trim() === "" || l.startsWith(prefix));
    const newLines = lines.map((l) => (l.trim() === "" ? l : alreadyPrefixed ? l.slice(prefix.length) : prefix + l));
    const newBlock = newLines.join("\n");
    const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
    onChange(newValue);
    pendingSelection.current = { start: lineStart, end: lineStart + newBlock.length };
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <button type="button" onClick={() => applyWrap("**", "teks tebal")} title="Tebal" style={richToolbarBtnStyle}><Bold size={13} /></button>
        <button type="button" onClick={() => applyWrap("*", "teks miring")} title="Miring" style={richToolbarBtnStyle}><Italic size={13} /></button>
        <button type="button" onClick={() => applyLinePrefix("## ")} title="Judul besar" style={richToolbarBtnStyle}><Type size={13} /></button>
        <button type="button" onClick={() => applyLinePrefix("* ")} title="Bullet list" style={richToolbarBtnStyle}><List size={13} /></button>
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{ width: "100%", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }}
      />
      <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, margin: "6px 0 0" }}>Pilih teks lalu klik tombol untuk memformat. Bisa juga ketik manual: **tebal**, *miring*, ## Judul, * poin list.</p>
    </div>
  );
}

// Efek riak (ripple) kecil di titik jari/kursor saat tombol ditekan — memberi rasa "tombol
// benar-benar ditekan" di HP maupun desktop.
const spawnRipple = (e) => {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.6;
  const span = document.createElement("span");
  span.className = "gs-ripple";
  span.style.width = span.style.height = `${size}px`;
  span.style.left = `${e.clientX - rect.left - size / 2}px`;
  span.style.top = `${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(span);
  span.addEventListener("animationend", () => span.remove());
};

// Tombol utama: gradasi kuningan/emas ala hardware gitar, kilau yang "menyapu" saat hover,
// ripple saat ditekan. "loading" menampilkan spinner & mencegah klik ganda.
function PrimaryBtn({ children, onClick, full, small, icon: Icon, loading, disabled, type = "button" }) {
  const off = loading || disabled;
  return (
    <button type={type} onClick={off ? undefined : onClick} onPointerDown={off ? undefined : spawnRipple} disabled={off} className="gs-btn gs-btn-primary" style={{
      position: "relative", overflow: "hidden", isolation: "isolate",
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      background: `linear-gradient(135deg, #F3D27A 0%, ${C.gold} 48%, #9C6F1F 100%)`, color: "#1A140A",
      border: "1px solid rgba(255,255,255,0.18)", fontFamily: "'Manrope',sans-serif", fontWeight: 800,
      fontSize: small ? 13 : 14.5, padding: small ? "9px 18px" : "13px 26px", letterSpacing: 0.2,
      borderRadius: 980, cursor: off ? "default" : "pointer", width: full ? "100%" : "auto", opacity: disabled ? 0.55 : 1,
      boxShadow: "0 6px 18px rgba(184,137,46,0.28), inset 0 1px 0 rgba(255,255,255,0.45)",
    }}>
      {loading && <span className="gs-spinner" />}
      {children}{Icon && !loading && <Icon size={small ? 15 : 16} className="gs-btn-icon" />}
    </button>
  );
}

function GhostBtn({ children, onClick, full, small, icon: Icon, loading, disabled, type = "button" }) {
  const off = loading || disabled;
  return (
    <button type={type} onClick={off ? undefined : onClick} onPointerDown={off ? undefined : spawnRipple} disabled={off} className="gs-btn gs-btn-ghost" style={{
      position: "relative", overflow: "hidden", isolation: "isolate",
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      background: C.surface, color: C.text, border: `1px solid ${C.border}`,
      fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: small ? 13 : 14.5,
      padding: small ? "8px 17px" : "12px 25px", borderRadius: 980, cursor: off ? "default" : "pointer",
      width: full ? "100%" : "auto", opacity: disabled ? 0.55 : 1,
    }}>
      {loading && <span className="gs-spinner" />}
      {children}{Icon && !loading && <Icon size={small ? 15 : 16} className="gs-btn-icon" />}
    </button>
  );
}

function Card({ children, style, onClick, className = "" }) {
  return (
    <div onClick={onClick} className={`gs-card ${onClick ? "gs-card-hover gs-card-click" : ""} ${className}`} style={{ background: C.surface, border: `1px solid ${C.borderSoft}`, borderRadius: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", ...style }}>
      {children}
    </div>
  );
}

// Angka yang "berjalan" naik saat pertama tampil (mis. omzet Rp0 -> Rp693.000, 0% -> 2.5%).
function AnimatedValue({ value }) {
  const str = String(value ?? "");
  const m = str.match(/^(\D*?)(\d[\d.,]*)(.*)$/);
  let target = NaN, decimals = 0;
  if (m) {
    if (/^\d{1,3}(\.\d{3})+$|^\d+$/.test(m[2])) target = Number(m[2].replace(/\./g, ""));
    else if (/^\d+\.\d+$/.test(m[2])) { target = Number(m[2]); decimals = m[2].split(".")[1].length; }
  }
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    let raf; const start = performance.now(); const dur = 750;
    const tick = (t) => {
      const k = Math.min(1, (t - start) / dur);
      setShown(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  if (!Number.isFinite(target)) return <>{str}</>;
  const num = decimals ? shown.toFixed(decimals) : Math.round(shown).toLocaleString("id-ID");
  return <>{m[1]}{num}{m[3]}</>;
}

/* ---------------- daftar yang bisa diurutkan: TAHAN lalu GESER ----------------
   Tekan & tahan ±0,3 detik di mana saja pada baris (HP maupun mouse) sampai baris "terangkat",
   lalu geser ke posisi baru. Pegangan titik-titik (grip) bisa langsung digeser tanpa menahan.
   Layar otomatis ikut menggulir kalau baris dibawa ke tepi atas/bawah layar. */
function DragHandle({ size = 18 }) {
  return (
    <span data-drag-handle className="gs-grip" title="Tahan & geser untuk mengubah urutan" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 36, borderRadius: 10, color: C.mutedDark, cursor: "grab", flexShrink: 0, touchAction: "none" }}>
      <GripVertical size={size} />
    </span>
  );
}

function SortableList({ items, getKey, renderItem, onReorder, gap = 10, disabled }) {
  const wrapRef = useRef(null);
  const sess = useRef(null);
  const [drag, setDrag] = useState(null); // { idx, over, dy }
  const [pressIdx, setPressIdx] = useState(null);

  const cleanup = () => {
    const c = sess.current;
    if (!c) return;
    clearTimeout(c.timer);
    cancelAnimationFrame(c.raf);
    document.removeEventListener("touchmove", c.onTouchMove);
    window.removeEventListener("pointermove", c.onMove);
    window.removeEventListener("pointerup", c.onUp);
    window.removeEventListener("pointercancel", c.onCancel);
    document.body.classList.remove("gs-dragging");
    sess.current = null;
    setPressIdx(null);
  };
  useEffect(() => cleanup, []);

  const update = () => {
    const c = sess.current;
    if (!c || !c.active) return;
    const dy = (c.lastY - c.startY) + (window.scrollY - c.startScroll);
    const r = c.rects[c.idx];
    const center = r.top + r.height / 2 + dy;
    let over = c.idx;
    c.rects.forEach((ri, i) => {
      if (i === c.idx) return;
      const ci = ri.top + ri.height / 2;
      if (i > c.idx && center > ci) over = Math.max(over, i);
      if (i < c.idx && center < ci) over = Math.min(over, i);
    });
    c.over = over;
    setDrag({ idx: c.idx, over, dy });
  };

  const activate = () => {
    const c = sess.current;
    if (!c || !wrapRef.current) return;
    const nodes = Array.from(wrapRef.current.children);
    c.rects = nodes.map((n) => { const r = n.getBoundingClientRect(); return { top: r.top + window.scrollY, height: r.height }; });
    c.startScroll = window.scrollY;
    c.active = true;
    c.over = c.idx;
    setPressIdx(null);
    try { navigator.vibrate && navigator.vibrate(12); } catch (e) { /* abaikan */ }
    document.body.classList.add("gs-dragging");
    setDrag({ idx: c.idx, over: c.idx, dy: 0 });
    const loop = () => {
      const cc = sess.current;
      if (!cc || !cc.active) return;
      const edge = 80;
      if (cc.lastY < edge) window.scrollBy(0, -Math.ceil((edge - cc.lastY) / 6));
      else if (cc.lastY > window.innerHeight - edge) window.scrollBy(0, Math.ceil((cc.lastY - (window.innerHeight - edge)) / 6));
      update();
      cc.raf = requestAnimationFrame(loop);
    };
    c.raf = requestAnimationFrame(loop);
  };

  const onPointerDown = (e, idx) => {
    if (disabled || items.length < 2) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const onHandle = !!e.target.closest("[data-drag-handle]");
    if (!onHandle && e.target.closest("button,input,textarea,select,a,label,iframe,[contenteditable='true'],[data-no-drag]")) return;
    cleanup();
    const c = { idx, startX: e.clientX, startY: e.clientY, lastY: e.clientY, active: false };
    sess.current = c;
    c.onTouchMove = (ev) => { if (sess.current && sess.current.active) ev.preventDefault(); };
    c.onMove = (ev) => {
      const cc = sess.current;
      if (!cc) return;
      if (!cc.active) {
        if (Math.hypot(ev.clientX - cc.startX, ev.clientY - cc.startY) > 8) cleanup();
        return;
      }
      cc.lastY = ev.clientY;
      update();
    };
    c.onUp = () => {
      const cc = sess.current;
      if (cc && cc.active && cc.over !== cc.idx) {
        const next = items.slice();
        const [moved] = next.splice(cc.idx, 1);
        next.splice(cc.over, 0, moved);
        onReorder(next, { from: cc.idx, to: cc.over });
      }
      cleanup();
      setDrag(null);
    };
    c.onCancel = () => { cleanup(); setDrag(null); };
    document.addEventListener("touchmove", c.onTouchMove, { passive: false });
    window.addEventListener("pointermove", c.onMove);
    window.addEventListener("pointerup", c.onUp);
    window.addEventListener("pointercancel", c.onCancel);
    if (onHandle) activate();
    else { setPressIdx(idx); c.timer = setTimeout(activate, 320); }
  };

  const h = drag && sess.current?.rects ? sess.current.rects[drag.idx].height + gap : 0;
  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {items.map((it, i) => {
        const dragging = !!drag && drag.idx === i;
        let ty = 0;
        if (drag) {
          if (dragging) ty = drag.dy;
          else if (drag.idx < drag.over && i > drag.idx && i <= drag.over) ty = -h;
          else if (drag.idx > drag.over && i >= drag.over && i < drag.idx) ty = h;
        }
        return (
          <div
            key={getKey(it)}
            onPointerDown={(e) => onPointerDown(e, i)}
            onContextMenu={(e) => { if (sess.current) e.preventDefault(); }}
            className={`gs-sort-item${dragging ? " is-dragging" : ""}${drag && !dragging ? " is-shifting" : ""}${pressIdx === i ? " is-pressing" : ""}`}
            style={{ position: "relative", zIndex: dragging ? 50 : 1, marginBottom: i < items.length - 1 ? gap : 0, transform: ty ? `translate3d(0, ${ty}px, 0)` : undefined }}
          >
            {renderItem(it, i, { dragging })}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- notifikasi toast (pengganti alert bawaan browser) ---------------- */
const toastBus = { listeners: new Set() };
const toast = (message, type = "info") => {
  toastBus.listeners.forEach((fn) => fn({ id: Date.now() + Math.random(), message: String(message), type }));
};
toast.success = (m) => toast(m, "success");
toast.error = (m) => toast(m, "error");
function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const fn = (t) => {
      setItems((prev) => [...prev.slice(-3), t]);
      setTimeout(() => setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, leaving: true } : x))), t.type === "error" ? 5200 : 3200);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), t.type === "error" ? 5600 : 3600);
    };
    toastBus.listeners.add(fn);
    return () => toastBus.listeners.delete(fn);
  }, []);
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 18, zIndex: 3000, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "none", padding: "0 16px" }}>
      {items.map((t) => (
        <div key={t.id} className={`gs-toast ${t.leaving ? "gs-toast-out" : ""}`} role="status" style={{ pointerEvents: "auto", maxWidth: 440, width: "100%", display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: 16, background: "rgba(24,22,28,0.94)", color: "#F4F1EA", border: `1px solid ${t.type === "error" ? "rgba(255,107,74,0.5)" : t.type === "success" ? "rgba(212,169,74,0.55)" : "rgba(255,255,255,0.12)"}`, boxShadow: "0 18px 40px rgba(0,0,0,0.35)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", fontFamily: "'Manrope',sans-serif", fontSize: 13.5, lineHeight: 1.5 }}>
          <span style={{ flexShrink: 0, marginTop: 1, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: t.type === "error" ? "#E0553A" : t.type === "success" ? "#D4A94A" : "#55535C" }}>
            {t.type === "error" ? <X size={12} color="#fff" /> : <Check size={12} color={t.type === "success" ? "#1A140A" : "#fff"} />}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
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

// Deskripsi video yang tampil di bawah player. Kalau teksnya panjang, otomatis dipotong
// jadi 3 baris + tombol "Tampilkan selengkapnya" (mirip YouTube). Saat admin, teks selalu
// tampil penuh & bisa diedit langsung (pakai EditableText), tanpa tombol sembunyikan.
function VideoDescription({ desc, admin, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const text = desc || "";
  const isLong = text.length > 180;

  if (!text && !admin) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <EditableText
        value={text}
        admin={admin}
        onSave={onSave}
        tag="p"
        area
        block
        style={{
          fontFamily: "'Manrope',sans-serif",
          fontSize: 13,
          color: C.muted,
          lineHeight: 1.6,
          margin: 0,
          ...(!admin && isLong && !expanded
            ? { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }
            : {}),
        }}
      />
      {!admin && isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 6, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, color: C.gold }}
        >
          {expanded ? "Tampilkan lebih sedikit" : "Tampilkan selengkapnya"}
        </button>
      )}
    </div>
  );
}

/* ---------------- product card ---------------- */
function ProductCard({ p, onOpen, onAdd, inCart, owned, pending, onAccess, videoProgress, curriculumData, role, onToggleStatus }) {
  const disc = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const isAdmin = role === "admin";
  const status = p.status || "published";
  const physical = p.productType === "physical";
  const img = productImage(p);
  const stock = physical ? productStockTotal(p) : null;
  const soldOut = physical && stock === 0;
  const curriculum = curriculumData?.[p.id];
  const completedCount = (videoProgress?.[p.id] || []).length;
  const pct = curriculum ? Math.round((completedCount / curriculum.length) * 100) : null;
  const [justAdded, setJustAdded] = useState(false);
  const handleAdd = (e) => {
    e.stopPropagation();
    if (physical && (p.variants || []).length > 0) { onOpen(p.slug); return; }
    if (onAdd(p.id, { silent: false })) { setJustAdded(true); setTimeout(() => setJustAdded(false), 1400); }
  };
  return (
    <Card className="gs-product-card gs-card-hover" onClick={() => onOpen(p.slug)} style={{ overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="gs-pc-media" style={{ position: "relative", aspectRatio: physical ? "1 / 1" : "16 / 10", overflow: "hidden", background: `linear-gradient(135deg, ${p.hue || C.gold}33, ${C.surface2})` }}>
        {img ? <div className="gs-pc-img" style={{ position: "absolute", inset: 0, background: `center / cover no-repeat url("${img}")` }} /> : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{physical ? <Package size={40} color={p.hue || C.gold} strokeWidth={1.3} /> : <Music size={40} color={p.hue || C.gold} strokeWidth={1.3} />}</div>
        )}
        <div className="gs-pc-shine" />
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {owned ? <Badge tone="gold">Dimiliki</Badge> : pending ? <Badge tone="ember" dot>Menunggu Bayar</Badge> : p.badge ? <Badge tone={p.badge === "Best Seller" ? "ember" : "gold"}>{p.badge}</Badge> : null}
          {physical && !owned && <span style={{ padding: "4px 9px", borderRadius: 999, background: "rgba(0,0,0,0.55)", color: "#fff", fontFamily: "'Manrope',sans-serif", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, backdropFilter: "blur(6px)" }}>MERCH</span>}
        </div>
        {!owned && !pending && disc > 0 && !soldOut && <div style={{ position: "absolute", top: 10, right: 10, background: "linear-gradient(135deg, #FF6B4A, #C1442A)", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 9px", borderRadius: 999, fontFamily: "'JetBrains Mono',monospace", boxShadow: "0 4px 12px rgba(193,68,42,0.35)" }}>-{disc}%</div>}
        {!physical && !owned && p.previewVideo && <div className="gs-pc-play" style={{ position: "absolute", left: "50%", top: "50%", width: 48, height: 48, margin: "-24px 0 0 -24px", borderRadius: "50%", background: "rgba(255,255,255,0.22)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}><Play size={20} color="#fff" fill="#fff" style={{ marginLeft: 2 }} /></div>}
        {soldOut && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Manrope',sans-serif", fontWeight: 800, letterSpacing: 2, color: "#fff", fontSize: 14 }}>STOK HABIS</div>}
        {owned && curriculum && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: "rgba(0,0,0,0.3)" }}><div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #F3D27A, #D4A94A)" }} /></div>
        )}
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
        <span style={{ fontSize: 10.5, color: C.gold, fontFamily: "'Manrope',sans-serif", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>{p.category || (physical ? "Merchandise" : "Kelas")}</span>
        <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15.5, fontWeight: 800, color: C.text, margin: 0, lineHeight: 1.3 }}>{p.name}</h3>
        {p.reviews > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StarRow rating={p.rating} size={12} />
            <span style={{ fontSize: 11.5, color: C.muted, fontFamily: "'Manrope',sans-serif" }}>{p.rating} ({p.reviews})</span>
          </div>
        )}
        {owned ? (
          <span style={{ marginTop: "auto", fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{curriculum ? `${completedCount}/${curriculum.length} video selesai · ${pct}%` : "Materi segera hadir"}</span>
        ) : pending ? (
          <span style={{ marginTop: "auto", fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark }}>Pesanan sedang diverifikasi</span>
        ) : (
          <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 17, color: C.goldLight }}>{rp(p.price)}</span>
            {disc > 0 && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.mutedDark, textDecoration: "line-through" }}>{rp(p.oldPrice)}</span>}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
          {isAdmin ? (
            <>
              <GhostBtn small full onClick={() => onOpen(p.slug)} icon={Eye}>Detail</GhostBtn>
              {status === "archived" ? <Badge tone="muted">Arsip</Badge> : (
                <button onClick={() => onToggleStatus && onToggleStatus(p.id)} className={`gs-switch ${status === "published" ? "on" : ""}`} title={status === "published" ? "Tampil — klik jadikan Draft" : "Draft — klik untuk tampilkan"} style={{ border: "none", cursor: "pointer" }}><span className="gs-switch-knob" /></button>
              )}
            </>
          ) : owned ? (
            <PrimaryBtn small full onClick={() => onAccess(p)} icon={Play}>{pct === 100 ? "Tonton Ulang" : completedCount > 0 ? "Lanjutkan" : "Mulai Belajar"}</PrimaryBtn>
          ) : pending ? (
            <GhostBtn small full onClick={() => onOpen(p.slug)} icon={Clock}>Lihat Status</GhostBtn>
          ) : (
            <>
              <GhostBtn small full onClick={() => onOpen(p.slug)}>{physical ? "Lihat" : "Detail"}</GhostBtn>
              <PrimaryBtn small full disabled={soldOut} onClick={handleAdd} icon={justAdded || (inCart && !physical) ? Check : ShoppingCart}>{justAdded ? "Masuk!" : inCart && !physical ? "Di Keranjang" : physical && (p.variants || []).length > 0 ? "Pilih" : "Keranjang"}</PrimaryBtn>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ---------------- header / footer ---------------- */
function Header({ view, go, goOrAuth, goToAuth, cartCount, role, accountName, mobileOpen, setMobileOpen, customPages, openCustomPage, customPageSlug, content, editMode, setEditMode, onSaveHeader, goToAddPage, theme, onToggleTheme, onLogout }) {
  const [canInstallPWA, setCanInstallPWA] = useState(false);
  useEffect(() => {
    if (window.__pwaDeferredPrompt) setCanInstallPWA(true);
    const onInstallable = () => setCanInstallPWA(true);
    const onInstalled = () => setCanInstallPWA(false);
    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const installPWA = async () => {
    const evt = window.__pwaDeferredPrompt;
    if (!evt) return;
    evt.prompt();
    try { await evt.userChoice; } catch (e) {}
    window.__pwaDeferredPrompt = null;
    setCanInstallPWA(false);
  };
  const h = content || DEFAULT_SITE_CONTENT.header;
  const admin = role === "admin" && editMode;
  const navItem = (label, target, saveKey) => (
    admin ? (
      <span style={{ display: "inline-block" }}>
        <EditableText value={label} admin onSave={(v) => onSaveHeader({ [saveKey]: v })} tag="span" style={{ color: view === target ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 14 }} />
      </span>
    ) : (
      <button onClick={() => go(target)} className={`gs-nav-link ${view === target ? "is-active" : ""}`} style={{ background: "none", border: "none", color: view === target ? C.text : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: view === target ? 700 : 600, fontSize: 14, cursor: "pointer", padding: "6px 2px" }}>{label}</button>
    )
  );
  return (
    <div className="gs-header" style={{ position: "sticky", top: 0, zIndex: 40, background: C.headerBg, backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", borderBottom: `1px solid ${C.borderSoft}` }}>
      {SHOW_MAINTENANCE_BANNER && (
        <div style={{ background: C.gold, color: "#1D1D1F", textAlign: "center", padding: "7px 16px", fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 }}>
          🔧 Website sedang dalam penyempurnaan — kamu tetap bisa melihat-lihat. Pembelian segera dibuka!
        </div>
      )}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div onClick={() => !admin && go("home")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: admin ? "default" : "pointer" }}>
          <img src={LOGO_URL} alt="Gitar Sakti" style={{ width: 34, height: 34, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
          {admin ? (
            <EditableText value={h.brandName} admin onSave={(v) => onSaveHeader({ brandName: v })} tag="span" style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: 1, color: C.text }} />
          ) : (
            <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: 1, color: C.text }}>{h.brandName}</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "center" }} className="gs-desktop-nav">
          {navItem(h.navBeranda, "home", "navBeranda")}
          {navItem(h.navProduk, "shop", "navProduk")}
          {role !== "admin" && <a href={FERTUNE_URL} className="gs-nav-link" style={{ color: C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 14, textDecoration: "none", padding: "6px 2px" }}>{FERTUNE_LABEL}</a>}
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
          <button onClick={onToggleTheme} className="gs-icon-btn" title={theme === "dark" ? "Mode terang" : "Mode gelap"} style={{ background: C.surface2, border: "none", borderRadius: 980, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {theme === "dark" ? <Sun size={16} color={C.text} /> : <Moon size={16} color={C.text} />}
          </button>
          {role === "admin" && (view === "home" || view === "about") && (
            <button
              onClick={() => setEditMode((v) => !v)}
              title="Mode Edit"
              className="gs-icon-btn"
              style={{
                display: "flex", alignItems: "center", gap: 6, background: editMode ? C.gold : C.surface2,
                border: "none", borderRadius: 980, padding: "8px 12px",
                cursor: "pointer", color: editMode ? "#fff" : C.text, fontFamily: "'Manrope',sans-serif",
                fontSize: 12.5, fontWeight: 700,
              }}
            >
              <Pencil size={13} />
              <span className="gs-desktop-nav">{editMode ? "Mode Edit: ON" : "Mode Edit"}</span>
            </button>
          )}
          {role !== "admin" && (
            <button onClick={() => goOrAuth("cart")} className="gs-icon-btn" style={{ position: "relative", background: C.surface2, border: "none", borderRadius: 980, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ShoppingCart size={16} color={C.text} />
              {cartCount > 0 && <span className="gs-cart-badge" style={{ position: "absolute", top: -4, right: -4, background: C.ember, color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 999, minWidth: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Manrope',sans-serif" }}>{cartCount}</span>}
            </button>
          )}
          {role ? (
            <button onClick={() => go(role === "admin" ? "admin" : "customer")} className="gs-icon-btn" style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface2, border: "none", borderRadius: 980, padding: "7px 14px 7px 8px", cursor: "pointer" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: `linear-gradient(160deg, ${C.goldLight}, ${C.ember})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><User size={12} color="#fff" /></span>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 700, color: C.text }} className="gs-desktop-nav">{role === "admin" ? "Admin" : accountName}</span>
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }} className="gs-desktop-nav">
              <GhostBtn small onClick={goToAuth}>Masuk</GhostBtn>
              <PrimaryBtn small onClick={goToAuth}>Daftar</PrimaryBtn>
            </div>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="gs-icon-btn" style={{ background: C.surface2, border: "none", borderRadius: 980, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Menu halaman">
            {mobileOpen ? <X size={16} color={C.text} /> : <Menu size={16} color={C.text} />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="gs-mobile-menu" style={{ borderTop: `1px solid ${C.borderSoft}`, padding: "12px 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="gs-mobile-toggle" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {navItem(h.navBeranda, "home", "navBeranda")}
            {navItem(h.navProduk, "shop", "navProduk")}
            {role !== "admin" && <a href={FERTUNE_URL} style={{ textAlign: "center", color: C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 14, textDecoration: "none", padding: "6px 2px" }}>{FERTUNE_LABEL}</a>}
            {customPages && customPages.map((p) => (
              <button key={p.id} onClick={() => { openCustomPage(p.slug); setMobileOpen(false); }} style={{ width: "100%", background: "none", border: "none", textAlign: "center", color: view === "custompage" && customPageSlug === p.slug ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer", padding: "6px 2px" }}>{p.title}</button>
            ))}
            {role !== "admin" && navItem(h.navTentang, "about", "navTentang")}
            {role === "admin" && (
              <button onClick={() => { goToAddPage(); setMobileOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: `1px dashed ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.gold, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", boxSizing: "border-box" }}>
                <Plus size={13} />Tambah Halaman
              </button>
            )}
            {role === "admin" && canInstallPWA && (
              <button onClick={() => { installPWA(); setMobileOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: `1px dashed ${C.gold}88`, borderRadius: 6, padding: "8px", color: C.goldLight, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
                <Download size={13} />Instal Aplikasi di HP
              </button>
            )}
          </div>
          {!role && <div className="gs-mobile-toggle" style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: `1px solid ${C.borderSoft}` }}><GhostBtn full small onClick={goToAuth}>Masuk</GhostBtn><PrimaryBtn full small onClick={goToAuth}>Daftar</PrimaryBtn></div>}
          <button onClick={onToggleTheme} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "none", border: `1px solid ${C.border}`, borderRadius: 980, padding: "9px 0", marginTop: 4, color: C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
          </button>
          {role && onLogout && (
            <button className="gs-mobile-toggle" onClick={() => { setMobileOpen(false); onLogout(); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "none", border: `1px solid ${C.border}`, borderRadius: 980, padding: "9px 0", color: C.ember, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              <LogOut size={14} />Keluar
            </button>
          )}
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={LOGO_URL} alt="Gitar Sakti" style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
            <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: 1, color: C.text }}>GITAR SAKTI</span>
          </div>
          {admin ? (
            <EditableText value={f.description} admin onSave={(v) => onSave({ description: v })} tag="p" area style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginTop: 10, lineHeight: 1.6, maxWidth: 280 }} />
          ) : (
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginTop: 10, lineHeight: 1.6, maxWidth: 280 }}>{f.description}</p>
          )}
          {admin ? (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>WhatsApp:</span>
              <EditableText value={f.whatsapp || "(isi nomor, mis. 0812xxxxxxx)"} admin onSave={(v) => onSave({ whatsapp: v })} tag="span" style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.text }} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Email:</span>
              <EditableText value={f.email || "(isi email kontak)"} admin onSave={(v) => onSave({ email: v })} tag="span" style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.text }} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Link Instagram (kosongkan kalau belum ada):</span>
              <EditableText value={f.instagramUrl || "(isi link Instagram)"} admin onSave={(v) => onSave({ instagramUrl: /^https?:\/\//i.test(v) ? v : "" })} tag="span" style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.text }} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Link YouTube (kosongkan kalau belum ada):</span>
              <EditableText value={f.youtubeUrl || "(isi link YouTube)"} admin onSave={(v) => onSave({ youtubeUrl: /^https?:\/\//i.test(v) ? v : "" })} tag="span" style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.text }} />
            </div>
          ) : (f.whatsapp || f.email) ? (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4, fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted }}>
              {f.whatsapp && <a href={waLink(f.whatsapp, "Halo Gitar Sakti, saya mau tanya...")} target="_blank" rel="noopener noreferrer" style={{ color: C.muted, textDecoration: "none" }}>WhatsApp: {f.whatsapp}</a>}
              {f.email && <a href={`mailto:${f.email}`} style={{ color: C.muted, textDecoration: "none" }}>Email: {f.email}</a>}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            {f.instagramUrl && <a href={f.instagramUrl} target="_blank" rel="noreferrer" style={{ width: 32, height: 32, borderRadius: 8, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}><Instagram size={15} color={C.goldLight} /></a>}
            {f.youtubeUrl && <a href={f.youtubeUrl} target="_blank" rel="noreferrer" style={{ width: 32, height: 32, borderRadius: 8, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}><Youtube size={15} color={C.goldLight} /></a>}
          </div>
        </div>
        {[
          { h: "Produk", items: ["Semua Produk"], target: "shop" },
          { h: "Perusahaan", items: ["Tentang Kami"], target: "about" },
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
      "Gitar Sakti mengumpulkan data yang kamu berikan saat mendaftar dan checkout: nama, email, nomor WhatsApp, serta bukti transfer yang diunggah saat konfirmasi pembayaran.",
      "Data ini digunakan untuk memproses pesanan, memverifikasi pembayaran, memberikan akses ke produk yang kamu beli, dan menghubungi kamu terkait pesanan. Data pribadi kamu tidak kami jual.",
      "Kami memakai penyedia layanan pihak ketiga (hosting, database, dan pengiriman email) yang memproses data atas nama kami. Kami juga dapat memakai alat pengukur iklan seperti Meta Pixel, yang mengirim data aktivitas di situs (mis. halaman atau produk yang dilihat, dimasukkan ke keranjang, atau checkout) ke penyedia tersebut untuk mengukur dan menyempurnakan iklan. Nama, email, nomor WhatsApp, dan bukti transfer kamu tidak kami bagikan untuk keperluan iklan.",
      "Bukti transfer yang kamu unggah hanya dapat dilihat oleh admin Gitar Sakti untuk keperluan verifikasi pembayaran.",
      "Kamu bisa menghubungi kami kapan saja untuk meminta data pribadimu dihapus dari sistem, selama tidak melanggar kewajiban pencatatan transaksi.",
    ],
  },
  terms: {
    title: "SYARAT & KETENTUAN",
    body: [
      "Dengan membeli produk di Gitar Sakti, kamu menyetujui bahwa seluruh materi (video, PDF, backing track) adalah untuk penggunaan pribadi dan tidak boleh dibagikan, dijual ulang, atau diunggah ulang ke platform lain.",
      "Akses ke materi diberikan setelah pembayaran diverifikasi oleh admin, biasanya dalam 1x24 jam pada hari kerja setelah bukti transfer diunggah.",
      "Harga yang tertera pada saat checkout adalah harga final yang berlaku untuk transaksi tersebut, termasuk apabila sedang berlaku harga promo/early bird.",
      "Gitar Sakti berhak menangguhkan akses akun yang terindikasi melakukan pelanggaran, termasuk pembagian materi tanpa izin.",
      "Hasil belajar setiap orang berbeda dan bergantung pada kemauan serta konsistensi latihan masing-masing. Kami tidak menjamin hasil atau tingkat kemampuan tertentu.",
    ],
  },
  refund: {
    title: "KEBIJAKAN REFUND",
    body: [
      "Karena produk berupa materi digital yang langsung bisa diakses setelah pembayaran diverifikasi, pembelian yang sudah selesai secara umum tidak dapat dikembalikan (non-refundable).",
      "Pengecualian berlaku apabila terjadi kesalahan dari pihak Gitar Sakti, misalnya pembayaran sudah diverifikasi tetapi materi tidak dapat diakses karena kendala teknis dari sistem.",
      "Untuk kendala seperti itu, silakan hubungi admin lewat kontak WhatsApp atau email yang tertera di bagian bawah halaman dengan menyertakan Order ID, dan akan kami proses secepatnya.",
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
      <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 30, color: C.text, margin: "0 0 20px" }}>{page.title}</h1>
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
      <Reveal>
        <div style={{ maxWidth: 620, marginBottom: 32 }}>
          {eyebrow && <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: C.gold }}>{eyebrow}</span>}
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 34, letterSpacing: 0.5, color: C.text, margin: "8px 0 0" }}>{title}</h2>
          {sub && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14.5, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>{sub}</p>}
        </div>
      </Reveal>
      {children}
    </div>
  );
}

// Elemen ini "muncul" dengan animasi geser + fade begitu user scroll sampai melihatnya —
// efek reveal ala halaman produk Apple. Animasi hanya main sekali per elemen (sekali muncul, tetap).
function Reveal({ children, delay = 0, className, style }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity .7s var(--gs-ease) ${delay}s, transform .7s var(--gs-ease) ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ---------------- LANJUTKAN BELAJAR ----------------
   Kartu besar untuk kelas yang terakhir ditonton (thumbnail video berikutnya + progres), plus
   daftar ringkas kelas lain yang sedang berjalan. Satu klik langsung ke video yang tertunda. */
function ContinueLearning({ items, onResume, compact }) {
  if (!items || items.length === 0) return null;
  const [main, ...rest] = items;
  const thumb = youtubeThumb(main.video?.url) || productImage(main.p);
  const finished = main.pct === 100;
  return (
    <div className="gs-anim-in">
      <Card className="gs-continue" onClick={() => onResume(main.p)} style={{ padding: 0, overflow: "hidden", display: "grid", gridTemplateColumns: compact ? "1fr" : "minmax(0,1.1fr) minmax(0,1fr)", border: `1px solid ${C.gold}44` }}>
        <div className="gs-continue-media" style={{ position: "relative", aspectRatio: "16 / 9", background: thumb ? `center / cover no-repeat url("${thumb}")` : `linear-gradient(135deg, ${main.p.hue || C.gold}55, #121214)` }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.65) 100%)" }} />
          <div className="gs-play-orb" style={{ position: "absolute", left: "50%", top: "50%", width: 64, height: 64, marginLeft: -32, marginTop: -32, borderRadius: "50%", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {finished ? <RotateCcw size={24} color="#fff" /> : <Play size={26} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />}
          </div>
          <div style={{ position: "absolute", left: 14, bottom: 12, right: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
              <div className="gs-progress-fill" style={{ width: `${main.pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #F3D27A, #D4A94A)" }} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, fontWeight: 700, color: "#fff" }}>{main.pct}%</span>
          </div>
        </div>
        <div style={{ padding: compact ? 18 : 24, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Manrope',sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: C.gold }}>
            <span className="gs-badge-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: C.gold }} />{finished ? "Kelas selesai — ulangi kapan saja" : "Lanjutkan belajar"}
          </span>
          <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: compact ? 18 : 22, color: C.text, margin: 0, lineHeight: 1.25 }}>{main.p.name}</h3>
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, margin: 0, lineHeight: 1.5 }}>
            <b style={{ color: C.text }}>Video {main.idx + 1} dari {main.total}</b>{main.video?.title ? ` · ${main.video.title}` : ""}
          </p>
          <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark }}>{main.done} dari {main.total} video selesai</span>
          <div style={{ marginTop: 4 }}><PrimaryBtn onClick={(e) => { e.stopPropagation(); onResume(main.p); }} icon={finished ? RotateCcw : Play}>{finished ? "Tonton Ulang" : main.done === 0 ? "Mulai Belajar" : "Lanjutkan"}</PrimaryBtn></div>
        </div>
      </Card>
      {rest.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>
          {rest.map((it) => (
            <Card key={it.p.id} onClick={() => onResume(it.p)} style={{ padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
              <ProductThumb p={it.p} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.p.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 999, background: C.surface2, overflow: "hidden" }}><div className="gs-progress-fill" style={{ width: `${it.pct}%`, height: "100%", background: C.gold }} /></div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: C.muted }}>{it.pct}%</span>
                </div>
              </div>
              <Play size={16} color={C.gold} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- HOME ---------------- */
function HomePage({ go, openProduct, addToCart, cart, ownedIds, pendingIds, accessProduct, videoProgress, products, curriculumData, content, role, editMode, updateSiteContent, onToggleStatus, testimonials, continueItems, onResume }) {
  const home = content.home;
  const admin = role === "admin" && editMode;
  const onSaveHome = (patch) => updateSiteContent("home", patch);
  const [heroVideoEditing, setHeroVideoEditing] = useState(false);
  const [heroVideoDraft, setHeroVideoDraft] = useState(home.heroVideoUrl || "");
  const T = (key, area) => (admin ? <EditableText value={home[key]} admin onSave={(v) => onSaveHome({ [key]: v })} tag="span" area={area} /> : home[key]);
  const featured = (role === "admin" ? products : products.filter((p) => (p.status || "published") === "published")).slice(0, 3);
  // Testimoni di beranda diambil dari ulasan ASLI pembeli (rating 4-5, terbaru), bukan contoh
  // karangan — menampilkan testimoni fiktif berisiko melanggar UU Perlindungan Konsumen.
  const realTestimonials = Object.entries(testimonials || {})
    .flatMap(([pid, list]) => (list || []).map((t) => ({ ...t, productName: products.find((p) => String(p.id) === String(pid))?.name })))
    .filter((t) => t.rating >= 4 && (t.quote || "").trim().length > 0)
    .slice(0, 3);
  const sampleProduct = featured.find((p) => p.previewVideo) || featured[0];
  return (
    <div>
      <div style={{ position: "relative", borderBottom: `1px solid ${C.borderSoft}`, overflow: "hidden", transform: "translateZ(0)" }}>
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, backgroundImage: `linear-gradient(100deg, rgba(10,10,14,0.90) 0%, rgba(10,10,14,0.72) 45%, rgba(10,10,14,0.45) 100%), radial-gradient(1100px 500px at 80% -10%, ${C.ember}33, transparent), url(${HERO_BG_URL})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 20px 40px", display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 40, alignItems: "center" }} className="gs-hero-grid">
          <div className="gs-anim-in">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <Sparkles size={14} color="#E0B24A" />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,0.82)" }}>{T("heroBadge")}</span>
            </div>
            <h1 className="gs-hero-title" style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 56, lineHeight: 1.02, letterSpacing: 0.5, color: "#fff", margin: 0 }}>
              {T("heroTitleLine")} <span style={{ color: "#E0B24A" }}>{T("heroTitleHighlight")}</span> {T("heroTitleEnd")}
            </h1>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15.5, color: "rgba(255,255,255,0.75)", marginTop: 20, maxWidth: 480, lineHeight: 1.65 }}>
              {T("heroSubtitle", true)}
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <PrimaryBtn onClick={() => go("shop")} icon={ArrowRight}>{T("heroCta1")}</PrimaryBtn>
              {sampleProduct && <GhostBtn onClick={() => openProduct(sampleProduct.slug)} icon={PlayCircle}>{T("heroCta2")}</GhostBtn>}
            </div>
            <div style={{ marginTop: 36, maxWidth: 420 }}><StringDivider /></div>
            <div style={{ display: "flex", gap: 28, marginTop: 18, flexWrap: "wrap" }}>
              {[["stat1Num", "stat1Label"], ["stat2Num", "stat2Label"], ["stat3Num", "stat3Label"]].map(([nk, lk]) => (
                <div key={lk}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 20, color: "#E0B24A" }}>{T(nk)}</div>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{T(lk)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="gs-anim-in gs-anim-in-2" style={{ position: "relative", height: 380, borderRadius: 16, background: "rgba(20,18,26,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.18)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 46px)` }} />
                {[70, 130, 190, 250, 310].map((top) => (
                  <div key={top} style={{ position: "absolute", left: 0, right: 0, top, height: 1.3, background: `linear-gradient(90deg, transparent, ${C.gold}88, transparent)` }} />
                ))}
                <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
                  <Music size={64} color="#E0B24A" strokeWidth={1} />
                  <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: "rgba(255,255,255,0.7)", marginTop: 12 }}>Kursus video terstruktur</p>
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

      {continueItems && continueItems.length > 0 && (
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 20px 0" }}>
          <ContinueLearning items={continueItems.slice(0, 4)} onResume={onResume} />
        </div>
      )}

      <Section eyebrow={T("featuredEyebrow")} title={T("featuredTitle")} sub={T("featuredSub", true)}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }} className="gs-grid-3">
          {featured.map((p, i) => <Reveal key={p.id} delay={i * 0.08}><ProductCard p={p} onOpen={openProduct} onAdd={addToCart} inCart={cart.includes(p.id)} owned={ownedIds.includes(p.id)} pending={pendingIds?.includes(p.id)} onAccess={accessProduct} videoProgress={videoProgress} curriculumData={curriculumData} role={role} onToggleStatus={onToggleStatus} /></Reveal>)}
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <PrimaryBtn onClick={() => go("shop")} icon={ArrowRight}>Jelajahi Produk</PrimaryBtn>
        </div>
      </Section>

      <Section eyebrow={T("whyEyebrow")} title={T("whyTitle")} sub={T("whySub", true)}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 22 }} className="gs-grid-2">
          {home.whyItems.map((item, idx) => {
            const saveItem = (field, v) => onSaveHome({ whyItems: home.whyItems.map((it, i) => (i === idx ? { ...it, [field]: v } : it)) });
            return (
              <Reveal key={idx} delay={idx * 0.06} style={{ display: "flex", gap: 14 }}>
                <WhyIcon idx={idx} />
                <div>
                  {admin ? (
                    <EditableText value={stripFretPrefix(item.title)} admin onSave={(v) => saveItem("title", v)} tag="h4" style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, margin: 0 }} />
                  ) : (
                    <h4 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, margin: 0 }}>{stripFretPrefix(item.title)}</h4>
                  )}
                  {admin ? (
                    <EditableText value={item.desc} admin onSave={(v) => saveItem("desc", v)} tag="p" area style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginTop: 6, lineHeight: 1.6 }} />
                  ) : (
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>{item.desc}</p>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {realTestimonials.length > 0 && (
      <div style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <Section eyebrow={T("testimonialEyebrow")} title={T("testimonialTitle")}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }} className="gs-grid-3">
            {realTestimonials.map((t, i) => (
              <Reveal key={t.id || i} delay={i * 0.08}>
                <Card style={{ padding: 20, background: C.surface2, border: `1px solid ${C.border}` }}>
                  <div style={{ marginBottom: 12, fontFamily: "'Manrope',sans-serif" }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{t.productName ? `Pembeli ${t.productName}` : "Pembeli terverifikasi"}</div>
                  </div>
                  <StarRow rating={t.rating} />
                  <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.text, marginTop: 12, marginBottom: 0, lineHeight: 1.6 }}>"{t.quote}"</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Section>
      </div>
      )}

      <Section eyebrow={T("faqEyebrow")} title={T("faqTitle")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQ_HOME.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </Section>

      <div style={{ borderTop: `1px solid ${C.borderSoft}` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "56px 20px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 32, color: C.text, margin: 0 }}>{T("ctaTitle")}</h2>
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
  const innerRef = useRef(null);
  const [h, setH] = useState(0);
  useEffect(() => {
    if (innerRef.current) setH(open ? innerRef.current.scrollHeight : 0);
  }, [open, a]);
  return (
    <div className="gs-card" style={{ border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", background: C.surface, border: "none", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, textAlign: "left" }}>{q}</span>
        <ChevronDown size={16} color={C.gold} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .35s var(--gs-spring)", flexShrink: 0, marginLeft: 12 }} />
      </button>
      <div style={{ height: h, overflow: "hidden", transition: "height .32s var(--gs-ease)" }}>
        <div ref={innerRef} style={{ padding: "0 16px 16px" }}><p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, lineHeight: 1.6, margin: 0 }}>{a}</p></div>
      </div>
    </div>
  );
}

/* ---------------- SHOP ---------------- */
function ShopPage({ go, openProduct, addToCart, cart, ownedIds, pendingIds, accessProduct, videoProgress, products, curriculumData, content, role, onToggleStatus }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("Terbaru");
  const [kind, setKind] = useState("all");
  const isAdmin = role === "admin";
  const visible = isAdmin ? products : products.filter((p) => (p.status || "published") === "published");
  const hasMerch = visible.some((p) => p.productType === "physical");

  const filtered = useMemo(() => {
    let list = visible.slice();
    if (kind !== "all") list = list.filter((p) => (kind === "physical" ? p.productType === "physical" : p.productType !== "physical"));
    list = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    if (sort === "Harga Terendah") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "Harga Tertinggi") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "Terlaris") list = [...list].sort((a, b) => b.sold - a.sold);
    if (sort === "Rating") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort, products, isAdmin, kind]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 20px 60px" }}>
      <div className="gs-anim-in" style={{ marginBottom: 24 }}>
        <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: C.gold }}>{content.shop.eyebrow}</span>
        <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 34, color: C.text, margin: "6px 0 0" }}>{content.shop.title}</h1>
      </div>

      <div className="gs-anim-in gs-anim-in-1" style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 8, background: C.surface2, border: "none", borderRadius: 980, padding: "10px 16px" }}>
          <Search size={15} color={C.muted} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk..." style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, width: "100%" }} />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ background: C.surface2, border: "none", borderRadius: 980, padding: "10px 16px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13 }}>
          {["Terbaru", "Terlaris", "Harga Terendah", "Harga Tertinggi", "Rating"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {hasMerch && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[["all", "Semua", Sparkles], ["digital", "Kelas Video", PlayCircle], ["physical", "Merchandise", Shirt]].map(([k, l, Icon]) => (
            <button key={k} onClick={() => setKind(k)} className="gs-chip" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 999, border: `1px solid ${kind === k ? C.gold : C.border}`, background: kind === k ? `linear-gradient(135deg, #F3D27A, ${C.gold})` : C.surface, color: kind === k ? "#1A140A" : C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 800, cursor: "pointer" }}><Icon size={14} />{l}</button>
          ))}
        </div>
      )}
      <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, marginBottom: 16 }}>{filtered.length} produk ditemukan</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }} className="gs-grid-3">
        {filtered.map((p, i) => <Reveal key={p.id} delay={Math.min(i, 5) * 0.05}><ProductCard p={p} onOpen={openProduct} onAdd={addToCart} inCart={cart.includes(p.id)} owned={ownedIds.includes(p.id)} pending={pendingIds?.includes(p.id)} onAccess={accessProduct} videoProgress={videoProgress} curriculumData={curriculumData} role={role} onToggleStatus={onToggleStatus} /></Reveal>)}
      </div>
      {filtered.length === 0 && <p style={{ fontFamily: "'Manrope',sans-serif", color: C.muted, textAlign: "center", padding: 40 }}>Tidak ada produk yang cocok dengan pencarianmu.</p>}
    </div>
  );
}

/* ---------------- PRODUCT DETAIL ---------------- */
/* ---------------- HALAMAN PRODUK MERCHANDISE (barang fisik) ---------------- */
function MerchProductPage({ p, go, addToCart, products, testimonials, role, shipping, onToggleStatus }) {
  const images = (p.images || []).length ? p.images : [];
  const [imgIdx, setImgIdx] = useState(0);
  const variants = p.variants || [];
  const firstAvail = variants.find((v) => v.stock === null || v.stock === undefined || v.stock === "" || Number(v.stock) > 0);
  const [variant, setVariant] = useState(variants.length === 1 ? variants[0].name : (firstAvail && variants.length <= 1 ? firstAvail.name : null));
  const [qty, setQty] = useState(1);
  const isAdmin = role === "admin";
  const disc = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const stockOf = (v) => (v ? v.stock : p.stock);
  const chosen = variants.find((v) => v.name === variant) || null;
  const avail = variants.length ? (chosen ? stockOf(chosen) : null) : p.stock;
  const unlimited = avail === null || avail === undefined || avail === "";
  const total = productStockTotal(p);
  const soldOut = total === 0;
  const reviews = testimonials[p.id] || [];
  const related = products.filter((x) => x.productType === "physical" && x.id !== p.id && (isAdmin || (x.status || "published") === "published")).slice(0, 4);
  const flat = Number(shipping?.flatFee) || 0;
  const freeAbove = Number(shipping?.freeAbove) || 0;

  const doAdd = (thenCheckout) => {
    if (variants.length && !variant) { toast("Pilih varian dulu ya."); return; }
    const ok = addToCart(p.id, { variant, qty, silent: thenCheckout });
    if (ok && thenCheckout) go("checkout");
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, marginBottom: 20 }}>
        <span onClick={() => go("home")} style={{ cursor: "pointer" }}>Beranda</span><ChevronRight size={12} />
        <span onClick={() => go("shop")} style={{ cursor: "pointer" }}>Merchandise</span><ChevronRight size={12} />
        <span style={{ color: C.text }}>{p.name}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 36, alignItems: "start" }} className="gs-hero-grid gs-anim-in">
        <div>
          <div className="gs-gallery-main" style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 24, overflow: "hidden", background: C.surface2, border: `1px solid ${C.borderSoft}` }}>
            {images.length ? (
              <img key={images[imgIdx]} src={images[imgIdx]} alt={p.name} className="gs-gallery-img" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${p.hue || C.gold}33, ${C.surface2})` }}><Package size={80} color={p.hue || C.gold} strokeWidth={1.2} /></div>
            )}
            {disc > 0 && !soldOut && <div style={{ position: "absolute", top: 14, left: 14 }}><Badge tone="ember">-{disc}%</Badge></div>}
            {soldOut && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 20, color: "#fff", letterSpacing: 2 }}>STOK HABIS</span></div>}
          </div>
          {images.length > 1 && (
            <div style={{ display: "flex", gap: 10, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
              {images.map((src, i) => (
                <button key={src + i} onClick={() => setImgIdx(i)} className="gs-thumb-btn" style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 14, overflow: "hidden", padding: 0, cursor: "pointer", border: `2px solid ${i === imgIdx ? C.gold : "transparent"}`, background: C.surface2, opacity: i === imgIdx ? 1 : 0.7 }}>
                  <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: "sticky", top: 90 }}>
          <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: C.gold }}>{p.category || "Merchandise"}</span>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 30, color: C.text, margin: "8px 0 10px", lineHeight: 1.15 }}>{p.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {reviews.length > 0 && <StarRow rating={reviews.reduce((a, t) => a + t.rating, 0) / reviews.length} />}
            <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted }}>{[reviews.length > 0 ? `${reviews.length} ulasan` : "", p.sold > 0 ? `${p.sold} terjual` : ""].filter(Boolean).join(" · ")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 16 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 30, color: C.goldLight }}>{rp(p.price)}</span>
            {disc > 0 && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, color: C.mutedDark, textDecoration: "line-through" }}>{rp(p.oldPrice)}</span>}
          </div>

          {variants.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 10 }}>Pilih varian{variant ? <span style={{ color: C.muted, fontWeight: 500 }}> · {variant}</span> : ""}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {variants.map((v) => {
                  const out = !(v.stock === null || v.stock === undefined || v.stock === "") && Number(v.stock) <= 0;
                  const on = variant === v.name;
                  return (
                    <button key={v.name} disabled={out} onClick={() => { setVariant(v.name); setQty(1); }} className="gs-chip gs-variant" style={{ minWidth: 52, padding: "10px 16px", borderRadius: 14, border: `1.5px solid ${on ? C.gold : C.border}`, background: on ? `${C.gold}1C` : C.surface, color: out ? C.mutedDark : on ? C.text : C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, fontWeight: 700, cursor: out ? "not-allowed" : "pointer", textDecoration: out ? "line-through" : "none", opacity: out ? 0.55 : 1 }}>{v.name}</button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20, flexWrap: "wrap" }}>
            <QtyStepper value={qty} max={unlimited ? 99 : Math.max(1, Number(avail))} onChange={(q) => setQty(Math.max(1, Math.min(unlimited ? 99 : Number(avail), q)))} />
            <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, color: soldOut ? C.emberLight : !unlimited && Number(avail) <= 5 ? C.ember : "#2E9A4E" }}>
              {soldOut ? "Stok habis" : variants.length && !variant ? "Pilih varian untuk cek stok" : unlimited ? "Stok tersedia" : Number(avail) <= 0 ? "Varian ini habis" : Number(avail) <= 5 ? `Tinggal ${avail} lagi!` : `Stok ${avail}`}
            </span>
          </div>

          {isAdmin ? (
            <div style={{ marginTop: 22, padding: 14, borderRadius: 14, background: C.surface2, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span>Mode admin — pembelian dinonaktifkan.</span>
              <button onClick={() => onToggleStatus && onToggleStatus(p.id)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}><Badge tone={(p.status || "published") === "published" ? "gold" : "muted"}>{(p.status || "published") === "published" ? "Tampil" : "Draft"}</Badge></button>
            </div>
          ) : (
            <div className="gs-buy-row" style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <div style={{ flex: 1 }}><PrimaryBtn full disabled={soldOut} onClick={() => doAdd(false)} icon={ShoppingCart}>Tambah ke Keranjang</PrimaryBtn></div>
              <div style={{ flex: 1 }}><GhostBtn full disabled={soldOut} onClick={() => doAdd(true)}>Beli Sekarang</GhostBtn></div>
            </div>
          )}

          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: C.surface2, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted }}>
              <Truck size={17} color={C.gold} style={{ flexShrink: 0 }} />
              <span>Ongkir {flat > 0 ? <b style={{ color: C.text }}>{rp(flat)}</b> : <b style={{ color: C.text }}>gratis</b>} ke seluruh Indonesia{freeAbove > 0 && flat > 0 ? <> · <b style={{ color: C.gold }}>gratis ongkir</b> belanja min. {rp(freeAbove)}</> : ""}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: C.surface2, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted }}>
              <ShieldCheck size={17} color={C.gold} style={{ flexShrink: 0 }} />
              <span>Nomor resi dikirim ke dashboard-mu setelah paket dikirim.</span>
            </div>
          </div>

          {p.desc && (
            <div style={{ marginTop: 22 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>Deskripsi</h3>
              <RichText text={p.desc} style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted, lineHeight: 1.7 }} />
            </div>
          )}
        </div>
      </div>

      {reviews.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>Ulasan Pembeli</h3>
          <TestimonialSection productId={p.id} owned={false} reviews={reviews} onSubmit={() => {}} emptyLabel="" />
        </div>
      )}

      {related.length > 0 && (
        <div style={{ marginTop: 44 }}>
          <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 14 }}>Merchandise lainnya</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }} className="gs-grid-4">
            {related.map((r) => (
              <Card key={r.id} onClick={() => go("product", r.slug)} style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ aspectRatio: "1 / 1", background: productImage(r) ? `center / cover no-repeat url("${productImage(r)}")` : C.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>{!productImage(r) && <Package size={34} color={C.gold} />}</div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13, color: C.goldLight, marginTop: 4 }}>{rp(r.price)}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductPage({ slug, go, addToCart, cart, ownedIds, pendingIds, accessProduct, videoProgress, products, curriculumData, testimonials, addTestimonial, role, onToggleStatus, shipping }) {
  const [previewBuyer, setPreviewBuyer] = useState(false);
  const p = products.find((x) => x.slug === slug);
  if (!p) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted }}>{products.length === 0 ? "Memuat produk..." : "Produk tidak ditemukan."}</p>
        {products.length > 0 && <div style={{ marginTop: 16 }}><PrimaryBtn onClick={() => go("shop")}>Lihat Semua Produk</PrimaryBtn></div>}
      </div>
    );
  }
  if (p.productType === "physical") {
    return <MerchProductPage p={p} go={go} addToCart={addToCart} products={products} testimonials={testimonials} role={role} shipping={shipping} onToggleStatus={onToggleStatus} />;
  }
  const related = products.filter((x) => x.category === p.category && x.id !== p.id && x.productType !== "physical" && (role === "admin" || (x.status || "published") === "published")).slice(0, 3);
  const disc = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const isAdmin = role === "admin";
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

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr", gap: 32 }} className="gs-hero-grid gs-anim-in">
        <div>
          {(() => {
            const embedUrl = toEmbedUrl(p.previewVideo);
            if (embedUrl) {
              return (
                <div>
                  <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, background: C.surface2 }}>
                    <iframe
                      key={p.previewVideo}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                      src={toAutoplayEmbedUrl(p.previewVideo)}
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
            <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 30, color: C.text, margin: "10px 0 8px" }}>{p.name.toUpperCase()}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <StarRow rating={liveRating} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted }}>{[liveReviewCount > 0 ? `${liveRating.toFixed(1)} · ${liveReviewCount} ulasan` : "", p.sold > 0 ? `${p.sold} terjual` : ""].filter(Boolean).join(" · ")}</span>
            </div>
            <RichText text={p.desc} style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14.5, color: C.muted, lineHeight: 1.7, marginTop: 16, maxWidth: 620 }} />
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

        <div className="gs-anim-in gs-anim-in-2">
          <Card style={{ padding: 22, position: "sticky", top: 90, boxShadow: "0 20px 40px rgba(0,0,0,0.06)" }}>
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
                  {disc > 0 && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.mutedDark, textDecoration: "line-through" }}>{rp(p.oldPrice)}</span>}
                </div>
                {disc > 0 && <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.ember, fontWeight: 700 }}>Hemat {disc}%</span>}
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
// Kotak input kupon (dipakai di Keranjang & Checkout). Kupon dicek ke server lewat RPC
// validate_coupon — daftar kupon tidak pernah dikirim ke browser pengunjung.
function CouponBox({ subtotal, coupon, setCoupon, validateCoupon }) {
  const [couponInput, setCouponInput] = useState(coupon?.code || "");
  const [couponMsg, setCouponMsg] = useState(coupon ? `Kupon ${coupon.code} diterapkan.` : "");
  const [checking, setChecking] = useState(false);
  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setCoupon(null); setCouponMsg(""); return; }
    setChecking(true);
    const r = await validateCoupon(code, subtotal);
    setChecking(false);
    if (!r.ok) { setCoupon(null); setCouponMsg(r.error || "Kode kupon tidak valid."); return; }
    setCoupon(r.coupon);
    setCouponMsg(r.coupon.type === "percent" ? `Kupon ${r.coupon.code} diterapkan — diskon ${r.coupon.value}%.` : `Kupon ${r.coupon.code} diterapkan — diskon ${rp(r.coupon.value)}.`);
  };
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyCoupon()} placeholder="Kode kupon" style={{ flex: 1, minWidth: 0, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13, boxSizing: "border-box" }} />
        <GhostBtn small onClick={applyCoupon}>{checking ? "Cek..." : "Pakai"}</GhostBtn>
      </div>
      {couponMsg && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: coupon ? C.gold : C.ember, marginTop: 6 }}>{couponMsg}</p>}
    </>
  );
}

// Ongkir tetap (diatur admin di Pengaturan → Pengiriman). Hanya berlaku kalau ada barang fisik.
// Angka final tetap dihitung server saat pesanan dibuat.
const calcShipping = (shipping, cartProducts, subtotalAfterDiscount) => {
  if (!cartProducts.some((p) => p.productType === "physical")) return 0;
  const fee = Number(shipping?.flatFee) || 0;
  const free = Number(shipping?.freeAbove) || 0;
  return free > 0 && subtotalAfterDiscount >= free ? 0 : fee;
};

function QtyStepper({ value, onChange, max }) {
  const btn = { width: 30, height: 30, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.surface2, borderRadius: 12, padding: 3 }}>
      <button onClick={() => onChange(value - 1)} disabled={value <= 1} className="gs-icon-btn" style={{ ...btn, opacity: value <= 1 ? 0.4 : 1 }} aria-label="Kurangi"><Minus size={14} color={C.text} /></button>
      <span key={value} className="gs-qty-num" style={{ minWidth: 22, textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13.5, color: C.text }}>{value}</span>
      <button onClick={() => onChange(value + 1)} disabled={max !== null && max !== undefined && value >= max} className="gs-icon-btn" style={{ ...btn, opacity: max !== null && max !== undefined && value >= max ? 0.4 : 1 }} aria-label="Tambah"><Plus size={14} color={C.text} /></button>
    </div>
  );
}

function CartPage({ go, cartProducts, removeFromCart, updateCartQty, shipping, coupon, setCoupon, validateCoupon, calcDiscount }) {
  const subtotal = cartProducts.reduce((s, p) => s + p.price * (p.qty || 1), 0);
  const discount = calcDiscount(subtotal, coupon);
  const shipFee = calcShipping(shipping, cartProducts, subtotal - discount);
  const hasPhysical = cartProducts.some((p) => p.productType === "physical");
  const total = subtotal - discount + shipFee;
  const freeAbove = Number(shipping?.freeAbove) || 0;

  return (
    <div className="gs-anim-in" style={{ maxWidth: 960, margin: "0 auto", padding: "36px 20px 60px" }}>
      <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 32, color: C.text, margin: "0 0 24px" }}>KERANJANG BELANJA</h1>
      {cartProducts.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <div className="gs-float" style={{ width: 72, height: 72, margin: "0 auto", borderRadius: "50%", background: `${C.gold}18`, display: "flex", alignItems: "center", justifyContent: "center" }}><ShoppingCart size={30} color={C.gold} /></div>
          <p style={{ fontFamily: "'Manrope',sans-serif", color: C.muted, marginTop: 16 }}>Keranjang kamu masih kosong.</p>
          <div style={{ marginTop: 16 }}><PrimaryBtn onClick={() => go("shop")} icon={ArrowRight}>Jelajahi Produk</PrimaryBtn></div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, alignItems: "start" }} className="gs-hero-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cartProducts.map((p, i) => {
              const physical = p.productType === "physical";
              const max = physical ? ((p.variants || []).length ? p.variants.find((v) => v.name === p.variant)?.stock : p.stock) : 1;
              return (
                <Reveal key={p.cartKey} delay={i * 0.05}>
                  <Card style={{ padding: 12, display: "flex", gap: 14, alignItems: "center" }}>
                    <ProductThumb p={p} size={72} radius={14} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text }}>{p.name}</div>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, marginTop: 2 }}>
                        {physical ? <>{p.variant ? <b style={{ color: C.text }}>{p.variant}</b> : null}{p.variant ? " · " : ""}Dikirim ke alamatmu</> : "Kelas digital · akses selamanya"}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                        {physical && <QtyStepper value={p.qty} max={max === "" ? null : max} onChange={(q) => updateCartQty(p.cartKey, q)} />}
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.goldLight, fontSize: 14 }}>{rp(p.price * (p.qty || 1))}</span>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(p.cartKey)} className="gs-icon-btn" title="Hapus" style={{ background: C.surface2, border: "none", cursor: "pointer", width: 36, height: 36, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", alignSelf: "flex-start" }}><Trash2 size={15} color={C.muted} /></button>
                  </Card>
                </Reveal>
              );
            })}
          </div>
          <div style={{ position: "sticky", top: 90 }}>
            <Card style={{ padding: 20 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, margin: 0 }}>Ringkasan Pesanan</h3>
              <CouponBox subtotal={subtotal} coupon={coupon} setCoupon={setCoupon} validateCoupon={validateCoupon} />
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, fontFamily: "'Manrope',sans-serif", fontSize: 13.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Subtotal</span><span style={{ color: C.text }}>{rp(subtotal)}</span></div>
                {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Diskon</span><span style={{ color: C.gold }}>-{rp(discount)}</span></div>}
                {hasPhysical && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Ongkir</span><span style={{ color: shipFee === 0 ? C.gold : C.text, fontWeight: shipFee === 0 ? 700 : 400 }}>{shipFee === 0 ? "GRATIS" : rp(shipFee)}</span></div>}
                {hasPhysical && freeAbove > 0 && shipFee > 0 && (
                  <div style={{ fontSize: 11.5, color: C.mutedDark, background: C.surface2, borderRadius: 10, padding: "8px 10px" }}>
                    <Truck size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Belanja {rp(freeAbove - (subtotal - discount))} lagi untuk <b style={{ color: C.text }}>gratis ongkir</b>.
                  </div>
                )}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={{ color: C.text, fontWeight: 700 }}>Total</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 18, color: C.goldLight }}>{rp(total)}</span></div>
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
function CheckoutPage({ go, cartProducts, shipping, savedAddress, coupon, setCoupon, validateCoupon, clearCart, addOrder, calcDiscount, goToPaymentConfirm, account, paymentMethods }) {
  const subtotal = cartProducts.reduce((s, p) => s + p.price * (p.qty || 1), 0);
  const discount = calcDiscount(subtotal, coupon);
  const hasPhysical = cartProducts.some((p) => p.productType === "physical");
  const shipFee = calcShipping(shipping, cartProducts, subtotal - discount);
  const total = subtotal - discount + shipFee;
  const [form, setForm] = useState({ name: account.name, phone: account.phone });
  const [addr, setAddr] = useState(() => ({ name: account.name || "", phone: account.phone || "", address: "", city: "", province: "", postal: "", note: "", ...(savedAddress || {}) }));
  const activeMethods = (paymentMethods || []).filter((m) => m.enabled);
  const [methodId, setMethodId] = useState(null);
  useEffect(() => { if (!methodId && activeMethods.length > 0) setMethodId(activeMethods[0].id); }, [activeMethods.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const iconForMethod = (icon) => ({ bank: Landmark, qris: QrCode, ewallet: Wallet, card: CreditCard }[icon] || CreditCard);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const placeOrder = async () => {
    if (submitting) return;
    if (!form.name.trim() || !form.phone.trim()) { setError("Lengkapi nama dan nomor WhatsApp terlebih dahulu."); return; }
    if (form.phone.replace(/\D/g, "").length < 9) { setError("Nomor WhatsApp sepertinya belum benar."); return; }
    if (cartProducts.length === 0) { setError("Keranjang kosong."); return; }
    if (hasPhysical && (!addr.name.trim() || !addr.phone.trim() || !addr.address.trim() || !addr.city.trim())) { setError("Lengkapi alamat pengiriman (nama penerima, nomor HP, alamat, kota)."); return; }
    if (!methodId) { setError("Pilih metode pembayaran terlebih dahulu."); return; }
    setError("");
    setSubmitting(true);
    const chosenMethod = activeMethods.find((m) => m.id === methodId);
    const result = await addOrder({
      cartProducts,
      total,
      discount,
      couponCode: coupon?.code || null,
      method: chosenMethod?.label || "-",
      paymentMethodId: methodId,
      customerName: form.name.trim(),
      // Email dikunci ke akun yang sedang login (bukan input bebas) supaya pesanan selalu
      // tercatat ke akun yang benar dan tidak bisa dipalsukan ke email orang lain.
      customerEmail: account.email,
      customerPhone: form.phone.trim(),
      shippingAddress: hasPhysical ? Object.fromEntries(Object.entries(addr).map(([k, v]) => [k, String(v || "").trim()])) : null,
    });
    setSubmitting(false);
    if (!result.ok) { setError(result.error || "Gagal membuat pesanan. Coba lagi."); return; }
    clearCart();
    goToPaymentConfirm(result.orderId);
  };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 20px 60px" }}>
      <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 32, color: C.text, margin: "0 0 24px" }}>CHECKOUT</h1>
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

          {hasPhysical && (
            <Card className="gs-anim-in" style={{ padding: 18, border: `1px solid ${C.gold}55` }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}><Truck size={17} color={C.gold} />Alamat Pengiriman</h3>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: -6 }}>Untuk merchandise di keranjangmu. Alamat ini tersimpan untuk belanja berikutnya.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="gs-grid-2">
                {[["name", "Nama Penerima"], ["phone", "No. HP Penerima"]].map(([k, l]) => (
                  <div key={k}>
                    <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{l}</label>
                    <input value={addr[k]} onChange={(e) => setAddr({ ...addr, [k]: e.target.value })} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Alamat Lengkap (jalan, no. rumah, RT/RW, kelurahan, kecamatan)</label>
                <textarea value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} rows={2} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box", resize: "vertical" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 0.8fr", gap: 10, marginTop: 10 }} className="gs-grid-3">
                {[["city", "Kota / Kabupaten"], ["province", "Provinsi"], ["postal", "Kode Pos"]].map(([k, l]) => (
                  <div key={k}>
                    <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{l}</label>
                    <input value={addr[k]} onChange={(e) => setAddr({ ...addr, [k]: e.target.value })} inputMode={k === "postal" ? "numeric" : undefined} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Catatan untuk kurir (opsional)</label>
                <input value={addr.note} onChange={(e) => setAddr({ ...addr, note: e.target.value })} placeholder="Mis. titip ke satpam" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
              </div>
            </Card>
          )}

          <Card style={{ padding: 18 }}>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Metode Pembayaran</h3>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: -4 }}>Setelah pesanan dibuat, kamu akan diarahkan ke halaman konfirmasi untuk melihat instruksi pembayaran sesuai metode yang dipilih.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {activeMethods.length === 0 && (
                <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, padding: "10px 0" }}>Belum ada metode pembayaran aktif. Hubungi admin toko.</p>
              )}
              {activeMethods.map((m) => {
                const Icon = iconForMethod(m.icon);
                return (
                  <div key={m.id} onClick={() => setMethodId(m.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, border: `1px solid ${methodId === m.id ? C.gold : C.border}`, background: methodId === m.id ? C.surface2 : "transparent", cursor: "pointer" }}>
                    <Icon size={17} color={methodId === m.id ? C.goldLight : C.muted} />
                    <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.text, fontWeight: methodId === m.id ? 700 : 500 }}>{m.label}</span>
                    {m.type === "midtrans" && <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 10, fontWeight: 700, color: C.gold, background: `${C.gold}18`, padding: "2px 7px", borderRadius: 999 }}>OTOMATIS</span>}
                    {methodId === m.id && <Check size={15} color={C.gold} style={{ marginLeft: "auto" }} />}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div>
          <Card style={{ padding: 18, position: "sticky", top: 90 }}>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Ringkasan Pesanan</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cartProducts.map((p) => (
                <div key={p.cartKey} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'Manrope',sans-serif", fontSize: 13 }}>
                  <ProductThumb p={p} size={36} radius={10} />
                  <span style={{ color: C.muted, flex: 1, minWidth: 0 }}>{p.name}{p.variant ? ` (${p.variant})` : ""}{p.qty > 1 ? ` ×${p.qty}` : ""}</span>
                  <span style={{ color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5 }}>{rp(p.price * (p.qty || 1))}</span>
                </div>
              ))}
            </div>
            <CouponBox subtotal={subtotal} coupon={coupon} setCoupon={setCoupon} validateCoupon={validateCoupon} />
            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8, fontFamily: "'Manrope',sans-serif", fontSize: 13.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Subtotal</span><span style={{ color: C.text }}>{rp(subtotal)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Diskon{coupon ? ` (${coupon.code})` : ""}</span><span style={{ color: discount ? C.gold : C.text }}>-{rp(discount)}</span></div>
              {hasPhysical && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Ongkir</span><span style={{ color: shipFee === 0 ? C.gold : C.text, fontWeight: shipFee === 0 ? 700 : 400 }}>{shipFee === 0 ? "GRATIS" : rp(shipFee)}</span></div>}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={{ color: C.text, fontWeight: 700 }}>Total Bayar</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 18, color: C.goldLight }}>{rp(total)}</span></div>
            </div>
            {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, marginTop: 10 }}>{error}</p>}
            <div style={{ marginTop: 16 }}><PrimaryBtn full onClick={placeOrder} loading={submitting} icon={ShieldCheck}>{submitting ? "Memproses..." : "Buat Pesanan"}</PrimaryBtn></div>
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

// Editor 1 metode pembayaran — dipakai untuk tambah baru maupun edit yang sudah ada.
// PENTING soal Midtrans: Server Key TIDAK ada field-nya di sini sama sekali (disengaja).
// Server Key cuma boleh disimpan sebagai secret di Edge Function (lihat panduan terpisah),
// karena kalau disimpan di tabel biasa, siapa pun yang bisa akses browser/API publik berpotensi
// membacanya. Client Key aman disimpan di sini karena memang didesain untuk dipakai di browser.
function PaymentMethodEditor({ initial, onSave, onCancel }) {
  const [type, setType] = useState(initial?.type || "manual");
  const [label, setLabel] = useState(initial?.label || "");
  const [icon, setIcon] = useState(initial?.icon || "bank");
  const [bankName, setBankName] = useState(initial?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber || "");
  const [accountHolder, setAccountHolder] = useState(initial?.accountHolder || "");
  const [qrisImageUrl, setQrisImageUrl] = useState(initial?.qrisImageUrl || "");
  const [instructions, setInstructions] = useState(initial?.instructions || "");
  const [midtransClientKey, setMidtransClientKey] = useState(initial?.midtransClientKey || "");
  const [midtransEnv, setMidtransEnv] = useState(initial?.midtransEnv || "sandbox");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fieldStyle = { width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" };
  const labelStyle = { fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted };

  const handleSave = async () => {
    if (!label.trim()) { setError("Nama metode wajib diisi."); return; }
    setError(""); setSaving(true);
    const result = await onSave({ type, label: label.trim(), icon, bankName, accountNumber, accountHolder, qrisImageUrl, instructions, midtransClientKey, midtransEnv });
    setSaving(false);
    if (!result.ok) { setError(result.error || "Gagal menyimpan."); return; }
  };

  return (
    <Card style={{ padding: 18, border: `1px solid ${C.gold}` }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: C.surface2, borderRadius: 10, padding: 4 }}>
        <button onClick={() => setType("manual")} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", background: type === "manual" ? C.surface : "transparent", boxShadow: type === "manual" ? "0 2px 8px rgba(0,0,0,0.08)" : "none", color: C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Manual</button>
        <button onClick={() => setType("midtrans")} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", background: type === "midtrans" ? C.surface : "transparent", boxShadow: type === "midtrans" ? "0 2px 8px rgba(0,0,0,0.08)" : "none", color: C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Otomatis (Midtrans)</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={labelStyle}>Nama Metode (tampil ke customer)</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={type === "midtrans" ? "Contoh: Kartu Kredit / Bayar Otomatis" : "Contoh: Transfer BCA, QRIS, DANA"} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Ikon</label>
          <select value={icon} onChange={(e) => setIcon(e.target.value)} style={fieldStyle}>
            <option value="bank">Bank / Transfer</option>
            <option value="qris">QRIS</option>
            <option value="ewallet">E-Wallet</option>
            <option value="card">Kartu</option>
          </select>
        </div>

        {type === "manual" ? (
          <>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, margin: 0 }}>Isi kolom yang relevan saja. Untuk QRIS, cukup tempel link gambar QRIS-nya. Untuk e-wallet (DANA/OVO/GoPay dll), pakai "Nomor Rekening" untuk nomor tujuan dan "Atas Nama" untuk nama pemilik.</p>
            <div>
              <label style={labelStyle}>Nama Bank / Penyedia (opsional)</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Contoh: Bank BCA, DANA" style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Nomor Rekening / Nomor Tujuan (opsional)</label>
              <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Contoh: 1234567890" style={{ ...fieldStyle, fontFamily: "'JetBrains Mono',monospace" }} />
            </div>
            <div>
              <label style={labelStyle}>Atas Nama (opsional)</label>
              <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Contoh: Nama Pemilik" style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Link Gambar QRIS (opsional)</label>
              <input value={qrisImageUrl} onChange={(e) => setQrisImageUrl(e.target.value)} placeholder="https://..." style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Instruksi Tambahan (opsional)</label>
              <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} placeholder="Contoh: Setelah transfer, screenshot bukti lalu unggah di halaman ini." style={{ ...fieldStyle, resize: "vertical" }} />
            </div>
          </>
        ) : (
          <>
            <div style={{ background: `${C.gold}12`, border: `1px solid ${C.gold}44`, borderRadius: 8, padding: 12, display: "flex", gap: 8 }}>
              <ShieldCheck size={16} color={C.gold} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, margin: 0, lineHeight: 1.6 }}>Demi keamanan, <b style={{ color: C.text }}>Server Key Midtrans tidak diisi di sini</b> — itu harus disetel lewat Supabase Edge Function secrets (bukan tabel database), supaya tidak bisa dibaca dari browser. Lihat file panduan yang saya siapkan terpisah untuk langkah lengkapnya. Metode ini baru benar-benar berfungsi otomatis setelah Edge Function-nya di-deploy.</p>
            </div>
            <div>
              <label style={labelStyle}>Midtrans Client Key (aman ditaruh di sini)</label>
              <input value={midtransClientKey} onChange={(e) => setMidtransClientKey(e.target.value)} placeholder="SB-Mid-client-..." style={{ ...fieldStyle, fontFamily: "'JetBrains Mono',monospace" }} />
            </div>
            <div>
              <label style={labelStyle}>Environment</label>
              <select value={midtransEnv} onChange={(e) => setMidtransEnv(e.target.value)} style={fieldStyle}>
                <option value="sandbox">Sandbox (uji coba)</option>
                <option value="production">Production (transaksi asli)</option>
              </select>
            </div>
          </>
        )}
      </div>

      {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, marginTop: 12 }}>{error}</p>}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <GhostBtn onClick={onCancel}>Batal</GhostBtn>
        <PrimaryBtn onClick={handleSave} icon={Check}>{saving ? "Menyimpan..." : "Simpan Metode"}</PrimaryBtn>
      </div>
    </Card>
  );
}

// Daftar + kelola metode pembayaran. Ini yang bikin metode pembayaran bisa ditambah/diedit/
// dihapus/diaktif-nonaktifkan sendiri oleh admin tanpa perlu ubah kode sama sekali.
function PaymentMethodsForm({ paymentMethods, onAdd, onUpdate, onToggle, onDelete, onReorder }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const iconLabel = { bank: "Bank / Transfer", qris: "QRIS", ewallet: "E-Wallet", card: "Kartu" };
  const IconFor = (icon) => ({ bank: Landmark, qris: QrCode, ewallet: Wallet, card: CreditCard }[icon] || CreditCard);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
      <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, margin: 0, lineHeight: 1.6 }}>Metode di sini yang tampil sebagai pilihan pembayaran di halaman Checkout. Aktifkan/nonaktifkan kapan pun, urutkan sesuai prioritas, tanpa perlu minta bantuan siapa pun.</p>

      {paymentMethods.length === 0 && !adding && (
        <Card style={{ padding: 24, textAlign: "center" }}>
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: 0 }}>Belum ada metode pembayaran. Tambahkan minimal 1 supaya customer bisa checkout.</p>
        </Card>
      )}

      {paymentMethods.length > 1 && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, margin: 0 }}>Tahan & geser untuk mengubah urutan tampil di checkout.</p>}
      <SortableList
        items={paymentMethods}
        getKey={(m) => m.id}
        onReorder={onReorder}
        disabled={!!editingId}
        renderItem={(m) => {
        const Icon = IconFor(m.icon);
        if (editingId === m.id) {
          return (
            <PaymentMethodEditor
              key={m.id}
              initial={m}
              onCancel={() => setEditingId(null)}
              onSave={async (data) => { const r = await onUpdate(m.id, data); if (r.ok) setEditingId(null); return r; }}
            />
          );
        }
        return (
          <Card style={{ padding: "12px 14px 12px 6px", opacity: m.enabled ? 1 : 0.6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <DragHandle />
              <div style={{ width: 34, height: 34, borderRadius: 8, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} color={C.gold} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.text }}>{m.label}</span>
                  {m.type === "midtrans" && <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 10, fontWeight: 700, color: C.gold, background: `${C.gold}18`, padding: "2px 7px", borderRadius: 999 }}>OTOMATIS</span>}
                </div>
                <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark }}>{iconLabel[m.icon] || m.icon}{m.type === "manual" && m.accountNumber ? ` • ${m.accountNumber}` : ""}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <button onClick={() => onToggle(m.id, !m.enabled)} title={m.enabled ? "Nonaktifkan" : "Aktifkan"} style={{ background: "none", border: "none", cursor: "pointer", padding: 5 }}>
                  {m.enabled ? <ToggleRight size={20} color={C.gold} /> : <ToggleLeft size={20} color={C.muted} />}
                </button>
                <button onClick={() => setEditingId(m.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 5 }}><Pencil size={14} color={C.muted} /></button>
                <button onClick={() => { if (window.confirm(`Hapus metode "${m.label}"?`)) onDelete(m.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 5 }}><Trash2 size={14} color={C.emberLight} /></button>
              </div>
            </div>
          </Card>
        );
        }}
      />

      {adding ? (
        <PaymentMethodEditor
          onCancel={() => setAdding(false)}
          onSave={async (data) => { const r = await onAdd(data); if (r.ok) setAdding(false); return r; }}
        />
      ) : (
        <GhostBtn onClick={() => setAdding(true)} icon={Plus}>Tambah Metode Pembayaran</GhostBtn>
      )}
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

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (next !== confirm) { setError("Konfirmasi kata sandi baru tidak cocok."); setSaved(false); return; }
    setSaving(true);
    const result = await onChangePassword(current, next);
    setSaving(false);
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
      <div style={{ marginTop: 14 }}><PrimaryBtn onClick={handleSave} icon={Check}>{saving ? "Menyimpan..." : "Simpan Kata Sandi Baru"}</PrimaryBtn></div>
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

function PaymentConfirmationPage({ go, order, attachPaymentProof, bankInfo, paymentMethods, goToCustomerOverview }) {
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
  const chosenMethod = (paymentMethods || []).find((m) => m.id === order.paymentMethodId) || null;
  const isMidtrans = chosenMethod?.type === "midtrans";

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
        <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 28, color: C.text, marginTop: 20 }}>BUKTI PEMBAYARAN TERKIRIM</h1>
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
      <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 30, color: C.text, margin: "0 0 6px" }}>KONFIRMASI PEMBAYARAN</h1>
      <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginBottom: 22 }}>Pesanan <b style={{ color: C.text }}>{order.id}</b> sudah dibuat. Silakan transfer ke rekening berikut, lalu unggah bukti pembayarannya.</p>

      <Card style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Landmark size={16} color={C.gold} />
          <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>{chosenMethod ? chosenMethod.label : "Transfer ke Rekening Ini"}</h3>
        </div>
        {isMidtrans ? (
          <div style={{ padding: "14px 0" }}>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, lineHeight: 1.6 }}>Pembayaran otomatis lewat Midtrans untuk metode ini belum sepenuhnya aktif. Silakan hubungi admin untuk menyelesaikan pembayaran, atau kembali ke keranjang dan pilih metode manual.</p>
          </div>
        ) : (
          <>
            <CopyableField label="Bank" value={chosenMethod?.bankName || bankInfo.bankName} />
            <CopyableField label="Nomor Rekening" value={chosenMethod?.accountNumber || bankInfo.accountNumber} />
            <CopyableField label="Atas Nama" value={chosenMethod?.accountHolder || bankInfo.accountHolder} />
            <CopyableField label="Jumlah Transfer" value={rp(order.total)} />
            {chosenMethod?.qrisImageUrl && (
              <div style={{ marginTop: 10, textAlign: "center" }}>
                <img src={chosenMethod.qrisImageUrl} alt={chosenMethod.label} style={{ maxWidth: 220, borderRadius: 10, border: `1px solid ${C.border}` }} />
              </div>
            )}
            {chosenMethod?.instructions && (
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, marginTop: 10, whiteSpace: "pre-line" }}>{chosenMethod.instructions}</p>
            )}
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, marginTop: 10 }}>Transfer sesuai nominal di atas ya, supaya admin lebih mudah mencocokkan dengan pesanan <b>{order.id}</b>.</p>
          </>
        )}
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
function AuthPage({ go, onCustomerLogin, onCustomerRegister, onAdminLogin, onForgotPassword, onBack }) {
  const [tab, setTab] = useState("customer"); // "customer" | "admin"
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  // Tombol tab "Admin" cuma muncul kalau buka halaman ini dengan tambahan
  // ?admin=1 di URL (mis. https://situskamu.com/?admin=1). Pengunjung biasa
  // tidak akan pernah lihat opsi ini.
  const isAdminAccessAllowed = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("admin") === "1";

  const inputStyle = { width: "100%", marginBottom: 10, background: C.surface2, border: "1px solid transparent", borderRadius: 12, padding: "12px 14px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 14, boxSizing: "border-box" };

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
  const submitForgot = async () => {
    setSubmitting(true);
    const result = await onForgotPassword(tab === "admin" ? adminEmail : email);
    setSubmitting(false);
    if (!result.ok) { setError(result.error); return; }
    setError("");
    setForgotSent(true);
  };

  return (
    <div className="gs-anim-in" style={{ maxWidth: 420, margin: "0 auto", padding: "60px 20px" }}>
      <button onClick={onBack} className="gs-icon-btn" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
        <ArrowLeft size={15} /> Kembali
      </button>
      <Card style={{ padding: 28, boxShadow: "0 20px 44px rgba(0,0,0,0.07)" }}>
        {isAdminAccessAllowed && (
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.surface2, borderRadius: 12, padding: 4 }}>
          <button onClick={() => { setTab("customer"); setError(""); }} className="gs-btn" style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", background: tab === "customer" ? C.surface : "transparent", boxShadow: tab === "customer" ? "0 2px 8px rgba(0,0,0,0.08)" : "none", color: C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Customer</button>
          <button onClick={() => { setTab("admin"); setError(""); }} className="gs-btn" style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", background: tab === "admin" ? C.surface : "transparent", boxShadow: tab === "admin" ? "0 2px 8px rgba(0,0,0,0.08)" : "none", color: C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Admin</button>
        </div>
        )}

        {mode === "forgot" ? (
          forgotSent ? (
            <>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.surface2, border: `1px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Check size={22} color={C.gold} />
              </div>
              <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 20, color: C.text, margin: "0 0 8px", textAlign: "center" }}>CEK EMAIL KAMU</h2>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginBottom: 18, textAlign: "center", lineHeight: 1.6 }}>Kalau <b style={{ color: C.text }}>{tab === "admin" ? adminEmail : email}</b> terdaftar, link untuk buat kata sandi baru sudah kami kirim. Cek juga folder Spam/Promosi kalau belum muncul.</p>
              <GhostBtn full onClick={() => { setMode("login"); setForgotSent(false); setError(""); }}>Kembali ke Masuk</GhostBtn>
            </>
          ) : (
            <>
              <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 24, color: C.text, margin: "0 0 4px" }}>LUPA KATA SANDI</h2>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginBottom: 18 }}>Masukkan email akun kamu, nanti kami kirim link untuk buat kata sandi baru.</p>
              <input value={tab === "admin" ? adminEmail : email} onChange={(e) => tab === "admin" ? setAdminEmail(e.target.value) : setEmail(e.target.value)} placeholder="Email" type="email" style={{ ...inputStyle, marginBottom: error ? 8 : 18 }} onKeyDown={(e) => e.key === "Enter" && submitForgot()} />
              {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, marginBottom: 14 }}>{error}</p>}
              <PrimaryBtn full onClick={submitForgot}>{submitting ? "Mengirim..." : "Kirim Link Reset"}</PrimaryBtn>
              <button onClick={() => { setMode("login"); setError(""); }} style={{ display: "block", margin: "14px auto 0", background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 600 }}>Kembali ke Masuk</button>
            </>
          )
        ) : tab === "customer" ? (
          <>
            <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.surface2, borderRadius: 12, padding: 4 }}>
              <button onClick={() => { setMode("login"); setError(""); }} className="gs-btn" style={{ flex: 1, padding: "7px 0", borderRadius: 9, border: "none", background: mode === "login" ? C.surface : "transparent", boxShadow: mode === "login" ? "0 2px 8px rgba(0,0,0,0.08)" : "none", color: C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Masuk</button>
              <button onClick={() => { setMode("register"); setError(""); }} className="gs-btn" style={{ flex: 1, padding: "7px 0", borderRadius: 9, border: "none", background: mode === "register" ? C.surface : "transparent", boxShadow: mode === "register" ? "0 2px 8px rgba(0,0,0,0.08)" : "none", color: C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Daftar</button>
            </div>
            <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 24, color: C.text, margin: "0 0 4px" }}>{mode === "login" ? "MASUK KE AKUN" : "BUAT AKUN BARU"}</h2>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginBottom: 18 }}>Masuk atau daftar diperlukan sebelum menambahkan produk ke keranjang.</p>
            {mode === "register" && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" style={inputStyle} />}
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" style={inputStyle} />
            {mode === "register" && <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Nomor WhatsApp" style={inputStyle} />}
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kata sandi" type="password" style={{ ...inputStyle, marginBottom: 6 }} />
            {mode === "login" && (
              <button onClick={() => { setMode("forgot"); setError(""); }} style={{ display: "block", marginBottom: 12, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 600, padding: 0 }}>Lupa kata sandi?</button>
            )}
            {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, marginBottom: 14, marginTop: mode === "login" ? 0 : 8 }}>{error}</p>}
            <PrimaryBtn full onClick={submitCustomer}>{submitting ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar & Masuk"}</PrimaryBtn>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 24, color: C.text, margin: "0 0 4px" }}>MASUK SEBAGAI ADMIN</h2>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginBottom: 18 }}>Gunakan akun yang sudah diberi akses admin. Kata sandi bisa diganti lewat Pengaturan → Keamanan setelah masuk.</p>
            <input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Email admin" type="email" style={inputStyle} />
            <input value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} placeholder="Kata sandi" type="password" style={{ ...inputStyle, marginBottom: 6 }} onKeyDown={(e) => e.key === "Enter" && submitAdmin()} />
            <button onClick={() => { setMode("forgot"); setError(""); }} style={{ display: "block", marginBottom: 12, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 600, padding: 0 }}>Lupa kata sandi?</button>
            {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, marginBottom: 14 }}>{error}</p>}
            <PrimaryBtn full onClick={submitAdmin}>{submitting ? "Memproses..." : "Masuk sebagai Admin"}</PrimaryBtn>
          </>
        )}
      </Card>
    </div>
  );
}

/* ---------------- LUPA / RESET KATA SANDI ---------------- */
function ResetPasswordPage({ go, onSubmit }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputStyle = { width: "100%", marginBottom: 10, background: C.surface2, border: "1px solid transparent", borderRadius: 12, padding: "12px 14px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 14, boxSizing: "border-box" };

  const handleSubmit = async () => {
    if (pw !== confirm) { setError("Konfirmasi kata sandi tidak cocok."); return; }
    setSubmitting(true);
    const result = await onSubmit(pw);
    setSubmitting(false);
    if (!result.ok) { setError(result.error); return; }
    setError("");
    setDone(true);
  };

  if (done) {
    return (
      <div className="gs-anim-in" style={{ maxWidth: 420, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.surface2, border: `1px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
          <Check size={26} color={C.gold} />
        </div>
        <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 22, color: C.text, marginTop: 18 }}>KATA SANDI DIPERBARUI</h2>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginTop: 8 }}>Kata sandi kamu sudah berhasil diganti. Silakan lanjut ke dashboard.</p>
        <div style={{ marginTop: 20 }}><PrimaryBtn onClick={() => go("customer")}>Lanjutkan</PrimaryBtn></div>
      </div>
    );
  }

  return (
    <div className="gs-anim-in" style={{ maxWidth: 420, margin: "0 auto", padding: "60px 20px" }}>
      <Card style={{ padding: 28, boxShadow: "0 20px 44px rgba(0,0,0,0.07)" }}>
        <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 24, color: C.text, margin: "0 0 4px" }}>BUAT KATA SANDI BARU</h2>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginBottom: 18 }}>Masukkan kata sandi baru untuk akun kamu.</p>
        <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Kata sandi baru" type="password" style={inputStyle} />
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Konfirmasi kata sandi baru" type="password" style={{ ...inputStyle, marginBottom: error ? 8 : 18 }} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, marginBottom: 14 }}>{error}</p>}
        <PrimaryBtn full onClick={handleSubmit}>{submitting ? "Menyimpan..." : "Simpan Kata Sandi Baru"}</PrimaryBtn>
      </Card>
    </div>
  );
}

/* ---------------- CUSTOMER DASHBOARD ---------------- */
// Sidebar dashboard: "pil" emas yang meluncur halus ke menu yang dipilih.
function DashSidebar({ items, active, onSelect, footer }) {
  const listRef = useRef(null);
  const [pill, setPill] = useState(null);
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-key="${active}"]`);
    if (el) setPill({ top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight });
  }, [active, items.length]);
  useEffect(() => {
    const onResize = () => {
      const el = listRef.current?.querySelector(`[data-key="${active}"]`);
      if (el) setPill({ top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active]);
  return (
    <div style={{ width: 228, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }} className="gs-sidebar-wrap">
      <div ref={listRef} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 3, background: C.surface2, borderRadius: 20, padding: 6, border: `1px solid ${C.borderSoft}` }} className="gs-sidebar">
        {pill && <div className="gs-sidebar-pill" style={{ position: "absolute", top: pill.top, left: pill.left, width: pill.width, height: pill.height, borderRadius: 14, background: C.surface, boxShadow: `0 6px 16px rgba(0,0,0,0.08), inset 0 0 0 1px ${C.gold}40`, pointerEvents: "none" }} />}
        {items.map(({ key, label, icon: Icon, count }) => (
          <button key={key} data-key={key} onClick={() => onSelect(key)} className="gs-side-item" style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 14, border: "none", cursor: "pointer", background: "transparent", color: active === key ? C.text : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: active === key ? 700 : 600, fontSize: 13.5, textAlign: "left" }}>
            <Icon size={16} color={active === key ? C.gold : C.muted} className="gs-side-icon" />
            <span style={{ flex: 1 }}>{label}</span>
            {count > 0 && <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: C.ember, color: "#fff", fontSize: 10.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{count}</span>}
          </button>
        ))}
      </div>
      {footer}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, hint }) {
  return (
    <Card className="gs-card-hover gs-stat" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{label}</span>
        <span className="gs-stat-icon" style={{ width: 34, height: 34, borderRadius: 11, background: `linear-gradient(135deg, ${C.gold}30, ${C.gold}10)`, border: `1px solid ${C.gold}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={15} color={C.gold} /></span>
      </div>
      <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 24, color: C.text, letterSpacing: -0.3 }}><AnimatedValue value={value} /></span>
      {hint && <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark }}>{hint}</span>}
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
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, marginTop: 4 }}>Email dipakai sebagai identitas akun. Hubungi admin kalau perlu menggantinya.</p>
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

function CustomerDashboard({ go, sub, setSub, orders, account, onLogout, onUpdateProfile, videoProgress, products, curriculumData, goToPaymentConfirm, accessProduct, onCancelOrder, continueItems, onResume }) {
  // "orders" di sini sudah otomatis terbatas ke milik customer yang login (lewat RLS di database).
  const myOrders = orders;
  const ownedIds = Array.from(new Set(
    myOrders.filter((o) => o.payment === "PAID").flatMap((o) => o.itemIds).filter(Boolean)
  ));
  const owned = products.filter((p) => ownedIds.includes(p.id) && p.productType !== "physical");
  const totalSpend = myOrders.filter((o) => o.payment === "PAID").reduce((s, o) => s + o.total, 0);

  const items = [
    { key: "products", label: "Produk Saya", icon: Package },
    { key: "overview", label: "Ringkasan", icon: LayoutDashboard },
    { key: "orders", label: "Pesanan", icon: ClipboardList },
    { key: "profile", label: "Profil", icon: User },
    { key: "fertune", label: FERTUNE_LABEL, icon: Music },
  ];

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "30px 20px 60px", display: "flex", gap: 28 }} className="gs-dash-layout">
      {/* "fertune" bukan sub-halaman dasbor: membuka aplikasi terpisah di /fertune/ (halaman penuh, bisa dipasang sebagai PWA) */}
      <DashSidebar items={items} active={sub} onSelect={(k) => (k === "fertune" ? window.location.assign(FERTUNE_URL) : setSub(k))} footer={
        <button className="gs-sidebar-logout" onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: C.ember, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer", marginTop: 14 }}>
          <LogOut size={16} />Keluar
        </button>
      } />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 28, color: C.text, margin: "0 0 20px" }}>
          {{ overview: "RINGKASAN AKUN", products: "PRODUK SAYA", orders: "PESANAN SAYA", profile: "PROFIL" }[sub]}
        </h1>

        {sub === "overview" && (
          <div>
            {continueItems && continueItems.length > 0 && <div style={{ marginBottom: 20 }}><ContinueLearning items={continueItems.slice(0, 3)} onResume={onResume} compact /></div>}
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
          <div>
          {continueItems && continueItems.length > 0 && <div style={{ marginBottom: 18 }}><ContinueLearning items={continueItems.slice(0, 1)} onResume={onResume} compact /></div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }} className="gs-grid-2">
            {owned.map((p) => {
              const curriculum = curriculumData[p.id];
              const completedCount = (videoProgress[p.id] || []).length;
              const pct = curriculum ? Math.round((completedCount / curriculum.length) * 100) : null;
              return (
                <Card key={p.id} onClick={() => (curriculum ? onResume(p) : accessProduct(p))} style={{ padding: 14, display: "flex", gap: 14, alignItems: "center" }}>
                  <ProductThumb p={p} size={64} radius={14} />
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
                    <GhostBtn small onClick={(e) => { e.stopPropagation(); if (curriculum) onResume(p); else accessProduct(p); }} icon={Play}>{pct === 100 ? "Tonton Ulang" : completedCount > 0 ? "Lanjutkan" : "Mulai"}</GhostBtn>
                  </div>
                </Card>
              );
            })}
          </div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {myOrders.map((o, i) => {
              const steps = ["Dikemas", "Dikirim", "Diterima"];
              const stepIdx = o.fulfillmentStatus ? steps.indexOf(o.fulfillmentStatus) : -1;
              const paid = o.payment === "PAID";
              const tone = paid ? "gold" : o.payment === "Failed" ? "muted" : "ember";
              return (
                <Reveal key={o.id} delay={Math.min(i, 6) * 0.04}>
                  <Card style={{ padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.muted }}>{o.id} · {o.date}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 8 }}>
                          {o.lines.map((l, j) => <span key={j} style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, fontWeight: 600, color: C.text }}>{l.name}{l.qty > 1 ? ` ×${l.qty}` : ""}</span>)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <Badge tone={tone} dot={o.payment === "Pending"}>{paid ? "Lunas" : o.payment === "Failed" ? o.status : o.proofImage ? "Sedang dicek" : "Belum dibayar"}</Badge>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 15, color: C.goldLight, marginTop: 8 }}>{rp(o.total)}</div>
                      </div>
                    </div>
                    {paid && o.shippingAddress && (
                      <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 14, background: C.surface2 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {steps.map((st, k) => (
                            <React.Fragment key={st}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: k <= stepIdx ? `linear-gradient(135deg, #F3D27A, ${C.gold})` : C.border, transition: "background .4s ease" }}>{k <= stepIdx ? <Check size={12} color="#1A140A" /> : null}</span>
                                <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 700, color: k <= stepIdx ? C.text : C.mutedDark }}>{st}</span>
                              </div>
                              {k < steps.length - 1 && <div style={{ flex: 1, height: 2, borderRadius: 2, background: k < stepIdx ? C.gold : C.border }} />}
                            </React.Fragment>
                          ))}
                        </div>
                        {o.trackingNumber && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted }}>
                            <span><Truck size={13} style={{ verticalAlign: -2, marginRight: 5 }} color={C.gold} />Resi: <b style={{ color: C.text, fontFamily: "'JetBrains Mono',monospace" }}>{o.trackingNumber}</b></span>
                            <button onClick={() => { try { navigator.clipboard.writeText(o.trackingNumber); toast.success("Nomor resi disalin"); } catch (e) {} }} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 999, padding: "4px 10px", cursor: "pointer", fontFamily: "'Manrope',sans-serif", fontSize: 11.5, fontWeight: 700, color: C.text }}><Copy size={11} />Salin</button>
                          </div>
                        )}
                      </div>
                    )}
                    {o.payment === "Pending" && (
                      <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
                        {!o.proofImage ? (
                          <>
                            <PrimaryBtn small onClick={() => goToPaymentConfirm(o.id)} icon={Upload}>Bayar & Upload Bukti</PrimaryBtn>
                            <button onClick={() => { if (window.confirm(`Batalkan pesanan ${o.id}? Kamu bisa checkout ulang setelahnya.`)) onCancelOrder(o.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.emberLight, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700 }}>Batalkan</button>
                          </>
                        ) : (
                          <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark }}>Bukti transfer sedang dicek admin — biasanya tidak lama.</span>
                        )}
                      </div>
                    )}
                  </Card>
                </Reveal>
              );
            })}
          </div>
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
        <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: size * 0.19, lineHeight: 1.05, color: "#fff", position: "relative", textAlign: "center", width: "100%" }}>{title}</span>
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
        <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Section "Kenapa Gitar Sakti"</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <FieldInput label="Label kecil (eyebrow)" value={form.whyEyebrow} onChange={(v) => set("whyEyebrow", v)} />
          <FieldInput label="Judul" value={form.whyTitle} onChange={(v) => set("whyTitle", v)} />
          <FieldInput label="Subjudul" value={form.whySub} onChange={(v) => set("whySub", v)} area />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {form.whyItems.map((item, idx) => (
            <div key={idx} style={{ padding: 12, borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
              <FieldInput label={`Poin ${idx + 1} — Judul`} value={stripFretPrefix(item.title)} onChange={(v) => setWhyItem(idx, "title", v)} />
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
function TampilanProdukForm({ content, onSave, onBack, products, onReorder }) {
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
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: -6, marginBottom: 14 }}><b style={{ color: C.text }}>Tahan & geser</b> baris untuk mengubah urutan. Urutan ini menentukan susunan default di katalog & 3 produk pertama yang tampil sebagai "Produk Unggulan" di Beranda.</p>
        <SortableList
          items={products}
          getKey={(p) => p.id}
          onReorder={onReorder}
          gap={8}
          renderItem={(p, idx) => (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 8px 4px", borderRadius: 14, background: C.surface2, border: `1px solid ${C.border}` }}>
              <DragHandle />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.mutedDark, width: 20 }}>{idx + 1}</span>
              <ProductThumb p={p} size={36} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, fontWeight: 600, color: C.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
            </div>
          )}
        />
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

function AdminDashboard({ go, sub, setSub, onLogout, products, addProduct, updateProduct, toggleProductStatus, deleteProduct, reorderProducts, curriculumData, curriculumOutline, coupons, addCoupon, deleteCoupon, siteContent, updateSiteContent, customPages, addCustomPage, updateCustomPage, deleteCustomPage, tampilanSub, setTampilanSub, orders, updateOrderStatus, updateFulfillment, bankInfo, updateBankInfo, paymentMethods, addPaymentMethod, updatePaymentMethod, togglePaymentMethod, deletePaymentMethod, reorderPaymentMethods, onChangeAdminPassword, onExportData, onResetData, totalVisits, countVisitsSince, members, landingPages, addLandingPage, updateLandingPage, deleteLandingPage, openLandingPage, openLearnEditor }) {
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showQuickProductForm, setShowQuickProductForm] = useState(false);
  const [showYoutubeImport, setShowYoutubeImport] = useState(false);
  const [merchForm, setMerchForm] = useState(null); // null = tertutup, {} = baru, objek produk = edit
  const [productQuery, setProductQuery] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState("all");
  const [orderFilter, setOrderFilter] = useState("perlu-cek");
  const [detailOrder, setDetailOrder] = useState(null);
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
    { key: "orders", label: "Pesanan", icon: ClipboardList, count: orders.filter((o) => (o.payment === "Pending" && o.proofImage) || needsShipping(o)).length },
    { key: "customers", label: "Pelanggan", icon: Users },
    { key: "coupons", label: "Kupon", icon: Tag },
    { key: "analytics", label: "Analitik", icon: BarChart3 },
    { key: "landingpages", label: "Landing Page", icon: TrendingUp },
    { key: "settings", label: "Pengaturan", icon: Settings },
  ];

  // ---- Filter periode Ringkasan: Hari Ini / Minggu Ini / Bulan Ini / Tahun Ini / Semua ----
  // Semua angka, grafik & produk terlaris di Ringkasan mengikuti periode yang dipilih.
  const [period, setPeriod] = useState("month");
  const [periodVisits, setPeriodVisits] = useState(null);
  const periodStart = (() => {
    const n = new Date();
    if (period === "today") return new Date(n.getFullYear(), n.getMonth(), n.getDate());
    if (period === "week") {
      const d = new Date(n.getFullYear(), n.getMonth(), n.getDate());
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // mulai hari Senin
      return d;
    }
    if (period === "month") return new Date(n.getFullYear(), n.getMonth(), 1);
    if (period === "year") return new Date(n.getFullYear(), 0, 1);
    return null; // semua
  })();
  const periodStartKey = periodStart ? periodStart.getTime() : 0;
  useEffect(() => {
    if (sub !== "overview" || !countVisitsSince) return;
    let active = true;
    setPeriodVisits(null);
    countVisitsSince(periodStart).then((c) => { if (active) setPeriodVisits(c); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStartKey, sub]);
  const inPeriod = (iso) => !periodStart || (iso && new Date(iso) >= periodStart);
  const periodOrders = orders.filter((o) => inPeriod(o.createdAt));
  const paidOrders = periodOrders.filter((o) => o.payment === "PAID");
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const periodMembers = (members || []).filter((m) => m.role !== "admin" && inPeriod(m.created_at));
  const visitsShown = periodVisits ?? (period === "all" ? totalVisits : null);

  // Grafik: per jam (hari ini), per hari (minggu/bulan ini), per bulan (tahun ini / semua).
  // Slot tanpa penjualan tetap tampil sebagai 0 supaya tren terbaca jujur, urut dari lama ke baru.
  const revenueChartData = (() => {
    const now = new Date();
    const buckets = [];
    if (period === "today") {
      for (let h = 0; h <= now.getHours(); h++) buckets.push({ key: `h${h}`, day: `${String(h).padStart(2, "0")}:00`, revenue: 0 });
    } else if (period === "week" || period === "month") {
      const d = new Date(periodStart);
      while (d <= now) {
        buckets.push({ key: `d${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, day: `${d.getDate()} ${MONTHS_ID[d.getMonth()]}`, revenue: 0 });
        d.setDate(d.getDate() + 1);
      }
    } else {
      const first = period === "year"
        ? new Date(now.getFullYear(), 0, 1)
        : (paidOrders.length ? new Date(Math.min(...paidOrders.map((o) => new Date(o.createdAt).getTime()))) : new Date(now.getFullYear(), now.getMonth(), 1));
      const d = new Date(first.getFullYear(), first.getMonth(), 1);
      while (d <= now) {
        buckets.push({ key: `m${d.getFullYear()}-${d.getMonth()}`, day: `${MONTHS_ID[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, revenue: 0 });
        d.setMonth(d.getMonth() + 1);
      }
    }
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    paidOrders.forEach((o) => {
      const t = new Date(o.createdAt);
      const key = period === "today" ? `h${t.getHours()}`
        : (period === "week" || period === "month") ? `d${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`
        : `m${t.getFullYear()}-${t.getMonth()}`;
      if (idx[key] !== undefined) buckets[idx[key]].revenue += o.total;
    });
    return buckets;
  })();
  const periodLabel = { today: "Hari Ini", week: "Minggu Ini", month: "Bulan Ini", year: "Tahun Ini", all: "Semua Waktu" }[period];
  const chartTitle = period === "today" ? "Omzet per Jam — Hari Ini" : (period === "week" || period === "month") ? `Omzet per Hari — ${periodLabel}` : `Omzet per Bulan — ${periodLabel}`;

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "30px 20px 60px", display: "flex", gap: 28 }} className="gs-dash-layout">
      <DashSidebar items={items} active={sub} onSelect={(k) => { setSub(k); setTampilanSub("menu"); setSettingsSub("menu"); }} footer={
        <button className="gs-sidebar-logout" onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: C.ember, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer", marginTop: 14 }}>
          <LogOut size={16} />Keluar
        </button>
      } />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 28, color: C.text, margin: "0 0 20px" }}>
          {sub === "tampilan"
            ? { menu: "TAMPILAN", beranda: "EDIT BERANDA", produk: "EDIT SEMUA PRODUK", halaman: "KELOLA HALAMAN" }[tampilanSub] || "TAMPILAN"
            : { overview: "RINGKASAN ADMIN", products: "MANAJEMEN PRODUK", orders: "MANAJEMEN PESANAN", customers: "MANAJEMEN PELANGGAN", coupons: "KUPON & PROMO", analytics: "ANALITIK", landingpages: "LANDING PAGE", settings: "PENGATURAN" }[sub]}
        </h1>

        {sub === "overview" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {[["today", "Hari Ini"], ["week", "Minggu Ini"], ["month", "Bulan Ini"], ["year", "Tahun Ini"], ["all", "Semua"]].map(([k, l]) => (
                <button key={k} onClick={() => setPeriod(k)} className="gs-chip" style={{ padding: "7px 14px", borderRadius: 999, border: `1px solid ${period === k ? C.gold : C.border}`, background: period === k ? C.surface2 : "transparent", color: period === k ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{l}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }} className="gs-grid-4">
              <StatCard label={`Omzet (Lunas) · ${periodLabel}`} value={rp(totalRevenue)} icon={DollarSign} />
              <StatCard label={`Pesanan Masuk · ${periodLabel}`} value={String(periodOrders.length)} icon={ClipboardList} />
              <StatCard label={`Pesanan Lunas · ${periodLabel}`} value={String(paidOrders.length)} icon={Check} />
              <StatCard label={`Kunjungan Web · ${periodLabel}`} value={visitsShown === null ? "…" : String(visitsShown)} icon={Eye} />
              <StatCard label={`Member Baru · ${periodLabel}`} value={String(periodMembers.length)} icon={Users} />
              <StatCard label={`Konversi · ${periodLabel}`} value={visitsShown > 0 ? ((paidOrders.length / visitsShown) * 100).toFixed(1) + "%" : "-"} icon={TrendingUp} />
            </div>
            <Card style={{ padding: 18, marginTop: 20 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginTop: 0 }}>{chartTitle}</h3>
              {paidOrders.length === 0 ? (
                <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, marginTop: 12, marginBottom: 4 }}>Belum ada pesanan lunas pada periode ini.</p>
              ) : (
                <div style={{ height: 220, marginTop: 8 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData}>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" stroke={C.muted} fontSize={11} tickLine={false} />
                      <YAxis stroke={C.muted} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000000 ? (v / 1000000).toFixed(1) + "jt" : (v / 1000).toFixed(0) + "rb")} />
                      <Tooltip cursor={{ fill: `${C.gold}14` }} contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "Manrope", fontSize: 12 }} formatter={(v) => [rp(v), "Omzet"]} />
                      <Bar dataKey="revenue" fill={C.gold} radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 24, marginBottom: 12 }}>Produk Terlaris · {periodLabel}</h3>
            {(() => {
              const salesCount = {};
              paidOrders.forEach((o) => {
                o.items.forEach((itemName) => {
                  salesCount[itemName] = (salesCount[itemName] || 0) + 1;
                });
              });
              const ranked = Object.entries(salesCount).sort((a, b) => b[1] - a[1]).slice(0, 4);
              if (ranked.length === 0) {
                return (
                  <Card style={{ padding: 24, textAlign: "center" }}>
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: 0 }}>Belum ada penjualan pada periode ini.</p>
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

        {sub === "products" && (() => {
          const q = productQuery.trim().toLowerCase();
          const filtered = products.filter((p) =>
            (productTypeFilter === "all" || (productTypeFilter === "physical" ? p.productType === "physical" : p.productType !== "physical")) &&
            (!q || p.name.toLowerCase().includes(q)));
          const canSort = !q && productTypeFilter === "all";
          const iconBtn = { background: C.surface2, border: `1px solid ${C.borderSoft}`, cursor: "pointer", width: 36, height: 36, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
          return (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
              <PrimaryBtn small icon={Youtube} onClick={() => setShowYoutubeImport(true)}>Kelas dari YouTube</PrimaryBtn>
              <GhostBtn small icon={Shirt} onClick={() => setMerchForm({})}>Merchandise</GhostBtn>
              <GhostBtn small icon={Plus} onClick={() => setShowQuickProductForm(true)}>Kelas Manual</GhostBtn>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: C.surface2, borderRadius: 999, padding: "9px 14px", border: `1px solid ${C.borderSoft}` }}>
                <Search size={15} color={C.muted} />
                <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Cari produk..." style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, width: "100%" }} />
              </div>
              {[["all", `Semua (${products.length})`], ["digital", `Kelas (${products.filter((p) => p.productType !== "physical").length})`], ["physical", `Merchandise (${products.filter((p) => p.productType === "physical").length})`]].map(([k, l]) => (
                <button key={k} onClick={() => setProductTypeFilter(k)} className="gs-chip" style={{ padding: "8px 14px", borderRadius: 999, border: `1px solid ${productTypeFilter === k ? C.gold : C.border}`, background: productTypeFilter === k ? C.surface2 : "transparent", color: productTypeFilter === k ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{l}</button>
              ))}
            </div>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, margin: "0 0 12px" }}>
              {canSort ? <><b style={{ color: C.text }}>Tahan & geser</b> kartu (atau tarik ikon ⋮⋮) untuk mengubah urutan tampil di toko.</> : "Kosongkan pencarian & pilih \"Semua\" untuk mengubah urutan."}
            </p>
            {filtered.length === 0 ? (
              <Card style={{ padding: 36, textAlign: "center" }}>
                <Package size={30} color={C.mutedDark} style={{ margin: "0 auto 10px" }} />
                <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, margin: 0 }}>{products.length === 0 ? "Belum ada produk. Mulai dari tombol di atas." : "Tidak ada produk yang cocok."}</p>
              </Card>
            ) : (
            <SortableList
              items={filtered}
              getKey={(p) => p.id}
              disabled={!canSort}
              onReorder={reorderProducts}
              renderItem={(p) => {
                const status = p.status || "published";
                const physical = p.productType === "physical";
                const vids = curriculumData[p.id]?.length || 0;
                const stockTotal = physical ? productStockTotal(p) : null;
                return (
                  <Card className="gs-admin-row" style={{ padding: "10px 12px 10px 4px", display: "flex", alignItems: "center", gap: 10, opacity: status === "archived" ? 0.6 : 1 }}>
                    {canSort ? <DragHandle /> : <span style={{ width: 8 }} />}
                    <ProductThumb p={p} size={54} radius={14} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap", fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.goldLight, fontSize: 12.5 }}>{rp(p.price)}</span>
                        <span>·</span>
                        {physical ? (
                          <span style={{ color: stockTotal === 0 ? C.emberLight : C.muted }}>{stockTotal === null ? "Stok tak dibatasi" : stockTotal === 0 ? "Stok habis" : `Stok ${stockTotal}`}{(p.variants || []).length > 0 ? ` · ${p.variants.length} varian` : ""}</span>
                        ) : (
                          <span style={{ color: vids === 0 ? C.emberLight : C.muted }}>{vids > 0 ? `${vids} video` : "Belum ada video"}</span>
                        )}
                        <span>·</span>
                        <span>{p.sold || 0} terjual</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} className="gs-row-actions">
                      {status === "archived" ? (
                        <Badge tone="muted">Arsip</Badge>
                      ) : (
                        <button onClick={() => toggleProductStatus(p.id)} title={status === "published" ? "Tampil di toko — klik untuk jadikan Draft" : "Draft — klik untuk tampilkan di toko"} className={`gs-switch ${status === "published" ? "on" : ""}`} style={{ border: "none", cursor: "pointer" }}>
                          <span className="gs-switch-knob" />
                        </button>
                      )}
                      <button onClick={() => go("product", p.slug)} title="Lihat halaman produk" style={iconBtn}><Eye size={15} color={C.muted} /></button>
                      {!physical && <button onClick={() => openLearnEditor(p.slug)} title="Kelola materi video" style={iconBtn}><PlayCircle size={15} color={C.gold} /></button>}
                      <button onClick={() => { if (physical) setMerchForm(p); else { setEditingProduct(p); setShowProductForm(true); } }} title="Edit produk" style={iconBtn}><Pencil size={14} color={C.muted} /></button>
                      <button onClick={() => setDeleteTarget(p)} title="Hapus produk" style={iconBtn}><Trash2 size={14} color={C.emberLight} /></button>
                    </div>
                  </Card>
                );
              }}
            />
            )}
          </div>
          );
        })()}

        {sub === "orders" && (
          <div>
            {orders.length === 0 ? (
              <Card style={{ padding: 32, textAlign: "center" }}>
                <ClipboardList size={28} color={C.mutedDark} style={{ margin: "0 auto 10px" }} />
                <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, margin: 0 }}>Belum ada pesanan masuk.</p>
              </Card>
            ) : (
              <>
                {(() => {
                  const needCheck = orders.filter((o) => o.payment === "Pending" && o.proofImage).length;
                  const needShip = orders.filter(needsShipping).length;
                  const tabs = [
                    ["perlu-cek", `Perlu Dicek (${needCheck})`],
                    ["perlu-kirim", `Perlu Dikirim (${needShip})`],
                    ["pending", `Belum Bayar (${orders.filter((o) => o.payment === "Pending" && !o.proofImage).length})`],
                    ["paid", `Lunas (${orders.filter((o) => o.payment === "PAID").length})`],
                    ["semua", `Semua (${orders.length})`],
                  ];
                  return (
                    <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                      {tabs.map(([k, l]) => (
                        <button key={k} onClick={() => setOrderFilter(k)} className="gs-chip" style={{ padding: "7px 12px", borderRadius: 999, border: `1px solid ${orderFilter === k ? C.gold : C.border}`, background: orderFilter === k ? C.surface2 : "transparent", color: orderFilter === k ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{l}</button>
                      ))}
                    </div>
                  );
                })()}
                <ScrollHint />
                <Card style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Manrope',sans-serif", fontSize: 12.5 }}>
                  <thead><tr style={{ background: C.surface2 }}>
                    {["Order ID", "Customer", "Produk", "Jumlah", "Metode", "Bukti Bayar", "Pembayaran", "Status", "Tanggal"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {(() => { const rows = orders.filter((o) => orderFilter === "semua" || (orderFilter === "perlu-kirim" && needsShipping(o)) || (orderFilter === "perlu-cek" && o.payment === "Pending" && o.proofImage) || (orderFilter === "pending" && o.payment === "Pending" && !o.proofImage) || (orderFilter === "paid" && o.payment === "PAID"));
                    return rows.length ? rows.map((o) => (
                      <tr key={o.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: "10px 14px" }}>
                          <button onClick={() => setDetailOrder(o)} title="Lihat detail pesanan" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: C.goldLight, textDecoration: "underline", textUnderlineOffset: 3 }}>{o.id}</button>
                          {o.shippingAddress && <div style={{ marginTop: 4 }}><Badge tone={o.fulfillmentStatus === "Dikirim" || o.fulfillmentStatus === "Diterima" ? "green" : "muted"}><Truck size={10} />{o.fulfillmentStatus || "Fisik"}</Badge></div>}
                        </td>
                        <td style={{ padding: "10px 14px", color: C.text }}>
                          <div>{o.customerName || "-"}</div>
                          {o.customerPhone && (
                            <a href={waLink(o.customerPhone, `Halo ${o.customerName || ""}, terkait pesanan ${o.id} di Gitar Sakti:`)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: C.gold }}>WA {o.customerPhone}</a>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px", color: C.muted }}>{o.lines.map((l) => `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ""}`).join(", ")}</td>
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
                    )) : <tr><td colSpan={9} style={{ padding: "36px 14px", textAlign: "center", color: C.mutedDark, fontSize: 13 }}>Tidak ada pesanan di kategori ini. 🎉</td></tr>;
                    })()}
                  </tbody>
                </table>
                </Card>
              </>
            )}
          </div>
        )}

        {sub === "customers" && (() => {
          // Semua akun terdaftar (termasuk yang belum pernah beli — ini "leads" untuk di-follow up).
          const customerMap = {};
          (members || []).filter((m) => m.role !== "admin").forEach((m) => {
            customerMap[m.id] = { id: m.id, name: m.name || "-", email: m.email, phone: m.phone, orders: 0, spending: 0, joined: m.created_at ? formatDateID(new Date(m.created_at)) : "-" };
          });
          orders.forEach((o) => {
            const key = o.customerId && customerMap[o.customerId] ? o.customerId : o.customerEmail;
            if (!key) return;
            if (!customerMap[key]) customerMap[key] = { id: key, name: o.customerName, email: o.customerEmail, phone: o.customerPhone, orders: 0, spending: 0, joined: o.date };
            customerMap[key].orders += 1;
            if (o.payment === "PAID") customerMap[key].spending += o.total;
          });
          const customerList = Object.values(customerMap).sort((a, b) => b.spending - a.spending || b.orders - a.orders);
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
                    {["Nama", "Email", "WhatsApp", "Total Order", "Total Belanja", "Bergabung"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.muted, fontWeight: 600 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {customerList.map((c) => (
                      <tr key={c.id || c.email} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: "10px 14px", color: C.text }}>{c.name}</td>
                        <td style={{ padding: "10px 14px", color: C.muted }}>{c.email}</td>
                        <td style={{ padding: "10px 14px" }}>{c.phone ? <a href={waLink(c.phone, `Halo ${c.name || ""}, `)} target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>{c.phone}</a> : <span style={{ color: C.mutedDark }}>-</span>}</td>
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
                  {["Kode", "Tipe", "Nilai", "Min. Belanja", "Terpakai", "Berlaku Sampai", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.muted, fontWeight: 600 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.code} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "10px 14px", color: C.goldLight, fontFamily: "'JetBrains Mono',monospace" }}>{c.code}</td>
                      <td style={{ padding: "10px 14px", color: C.muted }}>{c.type === "percent" ? "Persen" : "Nominal"}</td>
                      <td style={{ padding: "10px 14px", color: C.text }}>{c.type === "percent" ? `${c.value}%` : rp(c.value)}</td>
                      <td style={{ padding: "10px 14px", color: C.muted }}>{c.minPurchase ? rp(c.minPurchase) : "—"}</td>
                      <td style={{ padding: "10px 14px", color: C.muted }}>{c.used}/{c.limit > 0 ? c.limit : "∞"}</td>
                      <td style={{ padding: "10px 14px", color: c.expiry && /^\d{4}-\d{2}-\d{2}$/.test(c.expiry) && new Date(c.expiry + "T23:59:59") < new Date() ? C.emberLight : C.muted }}>{c.expiry && /^\d{4}-\d{2}-\d{2}$/.test(c.expiry) ? formatDateID(new Date(c.expiry + "T00:00:00")) + (new Date(c.expiry + "T23:59:59") < new Date() ? " (habis)" : "") : (c.expiry || "Tanpa batas")}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <button onClick={() => { if (window.confirm(`Hapus kupon "${c.code}"? Kupon ini tidak bisa dipakai lagi setelah dihapus.`)) deleteCoupon(c.code); }} title="Hapus kupon" style={{ background: "none", border: "none", cursor: "pointer", padding: 9, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Trash2 size={15} color={C.emberLight} />
                        </button>
                      </td>
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
                          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <PrimaryBtn small onClick={() => openLandingPage(lp.slug, true)} icon={Pencil}>Edit di Halaman</PrimaryBtn>
                            <GhostBtn small onClick={() => openLandingPage(lp.slug, false)} icon={Eye}>Lihat</GhostBtn>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => { setEditingLp(lp); setShowLpForm(true); }} title="Nama, produk & status" style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: "pointer" }}><Settings size={15} color={C.muted} /></button>
                          <button onClick={() => setDeleteLpTarget(lp)} title="Hapus" style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: "pointer" }}><Trash2 size={15} color={C.emberLight} /></button>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 24, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                        <div>
                          <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 20, color: C.text }}>{lp.visits}</div>
                          <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}>Total Kunjungan</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 20, color: C.goldLight }}>{lp.orderClicks}</div>
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
          <TampilanProdukForm content={siteContent.shop} onSave={(data) => updateSiteContent("shop", data)} onBack={() => setTampilanSub("menu")} products={products} onReorder={reorderProducts} />
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
                    <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>Metode Pembayaran</h3>
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, margin: "3px 0 0" }}>Kelola rekening, QRIS, e-wallet, dan pembayaran otomatis yang tampil di checkout.</p>
                  </div>
                </div>
                <ChevronRight size={16} color={C.muted} />
              </div>
            </Card>
            <Card style={{ padding: 18, cursor: "pointer" }} onClick={() => setSettingsSub("pengiriman")}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Truck size={18} color={C.gold} />
                  <div>
                    <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>Pengiriman (Merchandise)</h3>
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, margin: "3px 0 0" }}>Ongkir tetap per pesanan & batas gratis ongkir.</p>
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
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, margin: "3px 0 0" }}>Backup data toko ke file.</p>
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

        {sub === "settings" && settingsSub === "pengiriman" && (
          <div>
            <button onClick={() => setSettingsSub("menu")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 16 }}><ArrowLeft size={14} />Kembali ke Pengaturan</button>
            <ShippingSettingsForm value={siteContent.shipping || {}} onSave={(v) => updateSiteContent("shipping", v)} />
          </div>
        )}

        {sub === "settings" && settingsSub === "rekening" && (
          <div>
            <button onClick={() => setSettingsSub("menu")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 16 }}><ArrowLeft size={14} />Kembali ke Pengaturan</button>
            <PaymentMethodsForm paymentMethods={paymentMethods} onAdd={addPaymentMethod} onUpdate={updatePaymentMethod} onToggle={togglePaymentMethod} onDelete={deletePaymentMethod} onReorder={reorderPaymentMethods} />
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

      {detailOrder && (
        <OrderDetailModal
          order={orders.find((o) => o.id === detailOrder.id) || detailOrder}
          onClose={() => setDetailOrder(null)}
          onShowProof={(o) => { setDetailOrder(null); setShowProofOrder(o); }}
          onConfirmPaid={(o) => { setDetailOrder(null); setConfirmPaidOrder(o); }}
          onUpdateFulfillment={updateFulfillment}
        />
      )}

      {merchForm && (
        <MerchFormModal
          initial={merchForm.id ? merchForm : null}
          onClose={() => setMerchForm(null)}
          onSubmit={async (data) => {
            if (merchForm.id) {
              await updateProduct(merchForm.id, { ...merchForm, ...data }, []);
              toast.success("Merchandise diperbarui");
            } else {
              const created = await addProduct(data, []);
              if (!created) return;
              toast.success("Merchandise ditambahkan");
            }
            setMerchForm(null);
          }}
        />
      )}

      {showYoutubeImport && (
        <YoutubeImportModal
          mode="create"
          onClose={() => setShowYoutubeImport(false)}
          onCreate={async (data, items) => {
            const created = await addProduct(data, items);
            if (!created) return;
            setShowYoutubeImport(false);
            // Langsung buka halaman materi dalam Mode Edit supaya admin bisa cek hasil import.
            openLearnEditor(created.slug);
          }}
        />
      )}

      {showQuickProductForm && (
        <QuickProductFormModal
          onClose={() => setShowQuickProductForm(false)}
          onSubmit={async (data) => {
            const created = await addProduct(data, []);
            setShowQuickProductForm(false);
            // Langsung lompat ke tampilan pembeli produk ini dalam Mode Edit, biar admin bisa
            // langsung susun kurikulum & video-nya di tempat -- tidak perlu modal terpisah lagi.
            if (created && created.slug) openLearnEditor(created.slug);
          }}
        />
      )}

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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
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
          onSubmit={async (form) => {
            if (editingLp) {
              await updateLandingPage(editingLp.id, form);
              setShowLpForm(false);
              setEditingLp(null);
            } else {
              const result = await addLandingPage(form);
              setShowLpForm(false);
              setEditingLp(null);
              // Langsung lompat ke halaman aslinya dalam mode edit, biar admin bisa langsung
              // isi judul/video/teks lain lewat pensil tanpa harus cari-cari lagi di daftar.
              if (result.ok && result.slug) openLandingPage(result.slug, true);
            }
          }}
        />
      )}

      {deleteLpTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
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

/* ---------------- IMPORT DARI YOUTUBE ---------------- */
// Tempel link playlist YouTube (atau beberapa link video, satu per baris) -> semua video otomatis
// jadi daftar materi. mode "create": sekalian bikin produk baru (judul, deskripsi, harga, video
// preview). mode "append": tambahkan video ke materi produk yang sudah ada.
// Tips: upload video kelas ke YouTube sebagai "Tidak publik" (Unlisted) supaya tidak bisa dicari
// orang, lalu kumpulkan dalam 1 playlist (juga Tidak publik) dan tempel link playlist-nya di sini.
function YoutubeImportModal({ mode = "create", productName, onClose, onCreate, onAppend }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [titles, setTitles] = useState({});
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [level, setLevel] = useState("Semua Level");
  const [status, setStatus] = useState("draft");
  const [previewMode, setPreviewMode] = useState("first"); // first | none
  const [groupSize, setGroupSize] = useState(0); // 0 = tanpa judul bagian otomatis
  const [saving, setSaving] = useState(false);

  const fieldStyle = { width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" };
  const labelStyle = { fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted };

  const fetchVideos = async () => {
    if (!text.trim()) { setError("Tempel link YouTube dulu."); return; }
    setError(""); setLoading(true);
    const r = await invokeFn("youtube-import", { url: text });
    setLoading(false);
    if (!r.ok) { setError(r.error || "Gagal mengambil video dari YouTube."); return; }
    const data = r.data;
    setResult(data);
    setSelected(new Set(data.videos.map((v) => v.videoId)));
    setTitles(Object.fromEntries(data.videos.map((v) => [v.videoId, v.title])));
    if (mode === "create") {
      setName(data.title || "");
      setDesc(data.description || "");
    }
  };

  const chosen = (result?.videos || []).filter((v) => selected.has(v.videoId));
  const toggle = (id) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = result && selected.size === result.videos.length;

  const buildItems = () => {
    const items = [];
    chosen.forEach((v, i) => {
      if (groupSize > 0 && i % groupSize === 0) {
        items.push({ type: "section", title: `Bagian ${Math.floor(i / groupSize) + 1}` });
      }
      items.push({ type: "video", title: (titles[v.videoId] || v.title || "").trim() || `Video ${i + 1}`, desc: v.description || "", url: v.url, duration: v.duration || "" });
    });
    return items;
  };

  const submit = async () => {
    if (chosen.length === 0) { setError("Pilih minimal 1 video."); return; }
    if (mode === "create") {
      if (!name.trim()) { setError("Judul produk wajib diisi."); return; }
      if (!price || Number(price) <= 0) { setError("Harga wajib diisi."); return; }
    }
    setError(""); setSaving(true);
    const items = buildItems();
    if (mode === "create") {
      await onCreate({
        name: name.trim(), price: Number(price), oldPrice: oldPrice ? Number(oldPrice) : Number(price),
        category, level, desc: desc.trim(), status, benefits: [], learn: [], bonus: "",
        previewVideo: previewMode === "first" ? chosen[0].url : "",
        duration: `${chosen.length} video`, format: "Video Course",
      }, items);
    } else {
      await onAppend(items);
    }
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <Card style={{ width: "100%", maxWidth: 680, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 22, color: C.text, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Youtube size={22} color="#FF0000" />{mode === "create" ? "PRODUK DARI YOUTUBE" : "IMPORT VIDEO YOUTUBE"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color={C.muted} /></button>
        </div>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
          {mode === "create"
            ? "Tempel link playlist YouTube (atau beberapa link video, satu per baris). Semua video otomatis jadi materi kelas — judul, urutan & durasi terisi sendiri."
            : <>Video akan ditambahkan di akhir materi <b style={{ color: C.text }}>{productName}</b>.</>}
          {" "}Saran: set video & playlist ke <b style={{ color: C.text }}>Tidak publik (Unlisted)</b> supaya tidak bisa dicari orang di YouTube.
        </p>

        {!result ? (
          <>
            <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={"https://www.youtube.com/playlist?list=PL...\natau\nhttps://youtu.be/xxxxxxxxxxx\nhttps://youtu.be/yyyyyyyyyyy"} style={{ ...fieldStyle, fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, resize: "vertical" }} />
            {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, marginTop: 10 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <GhostBtn full onClick={onClose}>Batal</GhostBtn>
              <PrimaryBtn full onClick={fetchVideos} icon={Download}>{loading ? "Mengambil video..." : "Ambil Video"}</PrimaryBtn>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(result.warnings || []).map((w) => (
              <p key={w} style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, margin: 0, background: C.surface2, padding: "8px 10px", borderRadius: 8 }}>ⓘ {w}</p>
            ))}

            {mode === "create" && (
              <>
                <div>
                  <label style={labelStyle}>Judul Produk / Kelas</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Judul kelas" style={fieldStyle} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Harga Jual (Rp)</label>
                    <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="247000" style={{ ...fieldStyle, fontFamily: "'JetBrains Mono',monospace" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Harga Coret (opsional)</label>
                    <input type="number" min="0" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="497000" style={{ ...fieldStyle, fontFamily: "'JetBrains Mono',monospace" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Kategori</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={fieldStyle}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Level</label>
                    <select value={level} onChange={(e) => setLevel(e.target.value)} style={fieldStyle}>{["Pemula", "Menengah", "Mahir", "Semua Level"].map((l) => <option key={l}>{l}</option>)}</select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Deskripsi (diambil dari deskripsi playlist, boleh diubah)</label>
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} style={{ ...fieldStyle, resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <label style={labelStyle}>Video preview (gratis untuk calon pembeli)</label>
                    <select value={previewMode} onChange={(e) => setPreviewMode(e.target.value)} style={fieldStyle}>
                      <option value="first">Pakai video pertama</option>
                      <option value="none">Tanpa preview (atur nanti)</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <label style={labelStyle}>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} style={fieldStyle}>
                      <option value="draft">Draft (belum tampil di toko)</option>
                      <option value="published">Published (langsung dijual)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={labelStyle}>Kelompokkan jadi bagian/bab otomatis</label>
              <select value={groupSize} onChange={(e) => setGroupSize(Number(e.target.value))} style={fieldStyle}>
                <option value={0}>Tidak (tanpa judul bagian)</option>
                {[3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>Setiap {n} video (judul bagian bisa diganti nanti)</option>)}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>{selected.size} dari {result.videos.length} video dipilih</span>
              <button onClick={() => setSelected(allSelected ? new Set() : new Set(result.videos.map((v) => v.videoId)))} style={{ background: "none", border: "none", cursor: "pointer", color: C.gold, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700 }}>{allSelected ? "Kosongkan pilihan" : "Pilih semua"}</button>
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
              {result.videos.map((v, i) => (
                <div key={v.videoId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderBottom: i < result.videos.length - 1 ? `1px solid ${C.borderSoft}` : "none", opacity: selected.has(v.videoId) ? 1 : 0.45 }}>
                  <input type="checkbox" checked={selected.has(v.videoId)} onChange={() => toggle(v.videoId)} style={{ flexShrink: 0, width: 16, height: 16 }} />
                  <img src={v.thumbnail} alt="" loading="lazy" style={{ width: 64, height: 36, objectFit: "cover", borderRadius: 4, flexShrink: 0, background: C.surface2 }} />
                  <input value={titles[v.videoId] ?? v.title} onChange={(e) => setTitles((t) => ({ ...t, [v.videoId]: e.target.value }))} style={{ flex: 1, minWidth: 0, background: "transparent", border: `1px solid transparent`, borderRadius: 6, padding: "6px 8px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5 }} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.mutedDark, flexShrink: 0 }}>{v.duration || "—"}</span>
                </div>
              ))}
            </div>

            {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, margin: 0 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <GhostBtn full onClick={() => { setResult(null); setError(""); }} icon={ArrowLeft}>Ganti Link</GhostBtn>
              <PrimaryBtn full onClick={submit} icon={Check}>{saving ? "Menyimpan..." : mode === "create" ? `Buat Produk (${selected.size} video)` : `Tambahkan ${selected.size} Video`}</PrimaryBtn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ShippingSettingsForm({ value, onSave }) {
  const [flat, setFlat] = useState(value.flatFee !== undefined ? String(value.flatFee) : "20000");
  const [free, setFree] = useState(value.freeAbove ? String(value.freeAbove) : "");
  const [saving, setSaving] = useState(false);
  const field = { width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 13px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 14, boxSizing: "border-box" };
  const save = async () => {
    setSaving(true);
    await onSave({ flatFee: Math.max(0, Number(flat) || 0), freeAbove: free ? Math.max(0, Number(free) || 0) : 0 });
    setSaving(false);
    toast.success("Pengaturan ongkir disimpan");
  };
  return (
    <Card style={{ padding: 22, maxWidth: 480 }}>
      <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 16, color: C.text, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 8 }}><Truck size={18} color={C.gold} />Ongkos Kirim Tetap</h3>
      <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginTop: 0, lineHeight: 1.6 }}>Berlaku sekali per pesanan yang berisi merchandise (kelas video tidak kena ongkir). Dihitung di server, jadi pembeli tidak bisa mengubahnya.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
        <div>
          <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, fontWeight: 600 }}>Ongkir per pesanan (Rp)</span>
          <input type="number" min="0" value={flat} onChange={(e) => setFlat(e.target.value)} style={field} />
        </div>
        <div>
          <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, fontWeight: 600 }}>Gratis ongkir jika belanja minimal (Rp) — kosongkan kalau tidak ada</span>
          <input type="number" min="0" value={free} onChange={(e) => setFree(e.target.value)} placeholder="500000" style={field} />
        </div>
        <div style={{ padding: "10px 12px", borderRadius: 12, background: `${C.gold}12`, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted }}>
          Pembeli akan melihat: <b style={{ color: C.text }}>Ongkir {Number(flat) > 0 ? rp(Number(flat)) : "gratis"}</b>{Number(free) > 0 && Number(flat) > 0 ? <> · gratis ongkir belanja min. <b style={{ color: C.text }}>{rp(Number(free))}</b></> : ""}
        </div>
        <div><PrimaryBtn onClick={save} loading={saving} icon={Check}>Simpan</PrimaryBtn></div>
      </div>
    </Card>
  );
}

// Pesanan yang sudah lunas, berisi barang fisik, tapi belum dikirim.
const needsShipping = (o) => o.payment === "PAID" && !!o.shippingAddress && (!o.fulfillmentStatus || o.fulfillmentStatus === "Dikemas");

function OrderDetailModal({ order: o, onClose, onShowProof, onConfirmPaid, onUpdateFulfillment }) {
  const [fStatus, setFStatus] = useState(o.fulfillmentStatus || "Dikemas");
  const [resi, setResi] = useState(o.trackingNumber || "");
  const [saving, setSaving] = useState(false);
  const a = o.shippingAddress;
  const addrText = a ? `${a.name} (${a.phone})\n${a.address}\n${[a.city, a.province, a.postal].filter(Boolean).join(", ")}${a.note ? `\nCatatan: ${a.note}` : ""}` : "";
  const row = (l, v, strong) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontFamily: "'Manrope',sans-serif", fontSize: 13 }}><span style={{ color: C.muted }}>{l}</span><span style={{ color: strong ? C.goldLight : C.text, fontWeight: strong ? 800 : 500, fontFamily: strong ? "'JetBrains Mono',monospace" : undefined }}>{v}</span></div>
  );
  const save = async () => {
    setSaving(true);
    const ok = await onUpdateFulfillment(o.id, fStatus, resi);
    setSaving(false);
    if (ok) onClose();
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560 }}>
      <Card className="gs-modal" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.goldLight, fontWeight: 700 }}>{o.id}</div>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, marginTop: 2 }}>{o.date} · {o.method}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge tone={o.payment === "PAID" ? "gold" : o.payment === "Failed" ? "ember" : "muted"}>{o.payment === "PAID" ? "Lunas" : o.payment === "Failed" ? o.status : "Belum Lunas"}</Badge>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color={C.muted} /></button>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: C.surface2 }}>
          <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.text }}>{o.customerName}</div>
          <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{o.customerEmail}</div>
          {o.customerPhone && <a href={waLink(o.customerPhone, `Halo ${o.customerName || ""}, terkait pesanan ${o.id} di Gitar Sakti:`)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, color: "#2E9A4E" }}>Chat WhatsApp {o.customerPhone}</a>}
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {o.lines.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontFamily: "'Manrope',sans-serif", fontSize: 13 }}>
              <span style={{ color: C.text }}>{l.type === "physical" ? <Package size={12} style={{ verticalAlign: -1, marginRight: 5 }} color={C.gold} /> : <PlayCircle size={12} style={{ verticalAlign: -1, marginRight: 5 }} color={C.gold} />}{l.name}{l.qty > 1 ? <b> ×{l.qty}</b> : ""}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: C.text }}>{rp(l.price * (l.qty || 1))}</span>
            </div>
          ))}
          <div style={{ borderTop: `1px dashed ${C.border}`, margin: "4px 0" }} />
          {o.discount > 0 && row(`Diskon${o.couponCode ? ` (${o.couponCode})` : ""}`, `-${rp(o.discount)}`)}
          {o.shippingAddress && row("Ongkir", o.shippingFee ? rp(o.shippingFee) : "Gratis")}
          {row("Total", rp(o.total), true)}
        </div>

        {o.proofImage && <div style={{ marginTop: 12 }}><GhostBtn small onClick={() => onShowProof(o)} icon={ImageIcon}>Lihat Bukti Transfer</GhostBtn></div>}
        {o.payment === "Pending" && <div style={{ marginTop: 10 }}><PrimaryBtn small onClick={() => onConfirmPaid(o)} icon={Check}>Tandai Lunas</PrimaryBtn></div>}

        {a && (
          <div style={{ marginTop: 18, padding: 16, borderRadius: 16, border: `1px solid ${C.gold}55`, background: `${C.gold}0C` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 13.5, color: C.text, display: "flex", alignItems: "center", gap: 7 }}><Truck size={16} color={C.gold} />Kirim ke</span>
              <button onClick={() => { try { navigator.clipboard.writeText(addrText); toast.success("Alamat disalin"); } catch (e) {} }} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 999, padding: "5px 11px", cursor: "pointer", fontFamily: "'Manrope',sans-serif", fontSize: 11.5, fontWeight: 700, color: C.text }}><Copy size={12} />Salin alamat</button>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.text, margin: "10px 0 0", lineHeight: 1.6 }}>{addrText}</pre>
            {o.payment === "PAID" ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", gap: 6, background: C.surface2, borderRadius: 12, padding: 4 }}>
                  {["Dikemas", "Dikirim", "Diterima"].map((st) => (
                    <button key={st} onClick={() => setFStatus(st)} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", background: fStatus === st ? C.surface : "transparent", boxShadow: fStatus === st ? "0 2px 8px rgba(0,0,0,0.08)" : "none", color: fStatus === st ? C.text : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5, cursor: "pointer", transition: "all .25s ease" }}>{st}</button>
                  ))}
                </div>
                <input value={resi} onChange={(e) => setResi(e.target.value)} placeholder="Nomor resi + kurir (mis. JNE 0123456789)" style={{ width: "100%", marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 13px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <PrimaryBtn small onClick={save} loading={saving} icon={Check}>Simpan Status</PrimaryBtn>
                  {resi.trim() && a.phone && <GhostBtn small onClick={() => window.open(waLink(a.phone, `Halo ${a.name}, pesanan ${o.id} dari Gitar Sakti sudah dikirim 🎸\nNo. resi: ${resi.trim()}\nTerima kasih!`), "_blank")}>Kirim resi via WA</GhostBtn>}
                </div>
              </div>
            ) : (
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, margin: "10px 0 0" }}>Status pengiriman bisa diatur setelah pesanan lunas.</p>
            )}
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}

/* ---------------- FORM MERCHANDISE (barang fisik) ---------------- */
const MERCH_CATEGORIES = ["Pick", "Senar", "Gitar", "Aksesoris Gitar", "Kaos & Apparel", "Lainnya"];

// Foto diperkecil dulu di HP/laptop admin (maks 1600px, JPEG) sebelum diupload — lebih hemat
// kuota & halaman toko lebih cepat dibuka.
const resizeImage = (file, max = 1600) => new Promise((resolve) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((b) => { URL.revokeObjectURL(url); resolve(b || file); }, "image/jpeg", 0.86);
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
  img.src = url;
});
const uploadProductImage = async (file) => {
  const blob = await resizeImage(file);
  const path = `p/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from("product-images").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
};

function MerchFormModal({ initial, onClose, onSubmit }) {
  const isEdit = !!initial?.id;
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category && MERCH_CATEGORIES.includes(initial.category) ? initial.category : MERCH_CATEGORIES[0]);
  const [price, setPrice] = useState(initial?.price ? String(initial.price) : "");
  const [oldPrice, setOldPrice] = useState(initial?.oldPrice && initial.oldPrice !== initial.price ? String(initial.oldPrice) : "");
  const [desc, setDesc] = useState(initial?.desc || "");
  const [images, setImages] = useState(initial?.images || []);
  const [useVariants, setUseVariants] = useState((initial?.variants || []).length > 0);
  const [variants, setVariants] = useState(() => (initial?.variants || []).map((v, i) => ({ key: `v${i}-${v.name}`, name: v.name, stock: v.stock === null || v.stock === undefined ? "" : String(v.stock) })));
  const [stock, setStock] = useState(initial?.stock === null || initial?.stock === undefined ? "" : String(initial.stock));
  const [weight, setWeight] = useState(initial?.weightGrams ? String(initial.weightGrams) : "");
  const [status, setStatus] = useState(initial?.status || "published");
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const field = { width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 13px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" };
  const label = { fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, fontWeight: 600 };

  const onFiles = async (files) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith("image/")).slice(0, 8);
    if (!list.length) return;
    setUploading((n) => n + list.length);
    for (const f of list) {
      try {
        const url = await uploadProductImage(f);
        setImages((prev) => [...prev, url]);
      } catch (e) {
        toast.error("Gagal upload foto: " + (e?.message || ""));
      }
      setUploading((n) => n - 1);
    }
  };

  const submit = async () => {
    if (!name.trim()) { setError("Nama produk wajib diisi."); return; }
    if (!price || Number(price) <= 0) { setError("Harga wajib diisi."); return; }
    const cleanVariants = useVariants ? variants.filter((v) => v.name.trim()).map((v) => ({ name: v.name.trim(), stock: v.stock === "" ? null : Math.max(0, Number(v.stock) || 0) })) : [];
    if (useVariants && cleanVariants.length === 0) { setError("Isi minimal 1 varian, atau matikan pilihan varian."); return; }
    if (new Set(cleanVariants.map((v) => v.name.toLowerCase())).size !== cleanVariants.length) { setError("Nama varian tidak boleh kembar."); return; }
    setError(""); setSaving(true);
    await onSubmit({
      productType: "physical", name: name.trim(), category, level: "Semua Level",
      price: Number(price), oldPrice: oldPrice ? Number(oldPrice) : Number(price), desc: desc.trim(), status,
      images, variants: cleanVariants, stock: useVariants ? null : (stock === "" ? null : Math.max(0, Number(stock) || 0)),
      weightGrams: weight ? Number(weight) : null, previewVideo: "", benefits: [], learn: [], bonus: "",
      duration: "", format: "Merchandise",
    });
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <Card className="gs-modal" style={{ width: "100%", maxWidth: 640, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 22, color: C.text, margin: 0, display: "flex", alignItems: "center", gap: 10 }}><Shirt size={22} color={C.gold} />{isEdit ? "EDIT MERCHANDISE" : "MERCHANDISE BARU"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color={C.muted} /></button>
        </div>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, margin: "0 0 18px" }}>Pick, senar, gitar, kaos & aksesoris. Stok berkurang otomatis saat pesanan ditandai lunas.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <span style={label}>Foto produk (foto pertama = sampul)</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10, marginTop: 8 }}>
              {images.map((src, i) => (
                <div key={src} className="gs-anim-in" style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 14, overflow: "hidden", border: `2px solid ${i === 0 ? C.gold : C.borderSoft}`, background: C.surface2 }}>
                  <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {i === 0 && <span style={{ position: "absolute", left: 6, bottom: 6 }}><Badge tone="gold">Sampul</Badge></span>}
                  <div style={{ position: "absolute", top: 5, right: 5, display: "flex", gap: 4 }}>
                    {i > 0 && <button title="Jadikan sampul" onClick={() => setImages((prev) => [src, ...prev.filter((x) => x !== src)])} style={{ width: 26, height: 26, borderRadius: 8, border: "none", background: "rgba(0,0,0,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Star size={13} color="#F3D27A" /></button>}
                    <button title="Hapus foto" onClick={() => setImages((prev) => prev.filter((x) => x !== src))} style={{ width: 26, height: 26, borderRadius: 8, border: "none", background: "rgba(0,0,0,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={13} color="#fff" /></button>
                  </div>
                </div>
              ))}
              {Array.from({ length: uploading }).map((_, i) => <div key={`up${i}`} className="gs-skeleton" style={{ aspectRatio: "1 / 1", borderRadius: 14 }} />)}
              <button onClick={() => fileRef.current?.click()} className="gs-upload-tile" style={{ aspectRatio: "1 / 1", borderRadius: 14, border: `1.5px dashed ${C.gold}88`, background: `${C.gold}0D`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: C.goldLight, fontFamily: "'Manrope',sans-serif", fontSize: 11.5, fontWeight: 700 }}>
                <ImagePlus size={22} />Tambah foto
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
          </div>

          <div>
            <span style={label}>Nama Produk</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Pick Gitar Sakti 0.73mm (isi 5)" style={field} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <span style={label}>Kategori</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={field}>{MERCH_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <span style={label}>Harga Jual (Rp)</span>
              <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="35000" style={{ ...field, fontFamily: "'JetBrains Mono',monospace" }} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <span style={label}>Harga Coret (ops.)</span>
              <input type="number" min="0" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="50000" style={{ ...field, fontFamily: "'JetBrains Mono',monospace" }} />
            </div>
          </div>

          <div style={{ padding: 14, borderRadius: 16, background: C.surface2, border: `1px solid ${C.borderSoft}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, fontWeight: 700, color: C.text }}>Punya varian?</div>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark }}>Ukuran kaos (S/M/L), ketebalan pick, warna, dll — stok per varian.</div>
              </div>
              <button onClick={() => { setUseVariants((v) => !v); if (!variants.length) setVariants([{ key: `v${Date.now()}`, name: "", stock: "" }]); }} className={`gs-switch ${useVariants ? "on" : ""}`} style={{ border: "none", cursor: "pointer" }}><span className="gs-switch-knob" /></button>
            </div>
            {useVariants ? (
              <div style={{ marginTop: 12 }}>
                <SortableList
                  items={variants}
                  getKey={(v) => v.key}
                  gap={8}
                  onReorder={setVariants}
                  renderItem={(v) => (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, borderRadius: 12, padding: "6px 8px 6px 2px", border: `1px solid ${C.border}` }}>
                      <DragHandle size={16} />
                      <input value={v.name} onChange={(e) => setVariants((prev) => prev.map((x) => (x.key === v.key ? { ...x, name: e.target.value } : x)))} placeholder="Nama varian (mis. L)" style={{ ...field, marginTop: 0, flex: 2, minWidth: 0, padding: "9px 11px" }} />
                      <input type="number" min="0" value={v.stock} onChange={(e) => setVariants((prev) => prev.map((x) => (x.key === v.key ? { ...x, stock: e.target.value } : x)))} placeholder="Stok" title="Kosongkan = tidak dibatasi" style={{ ...field, marginTop: 0, flex: 1, minWidth: 0, padding: "9px 11px", fontFamily: "'JetBrains Mono',monospace" }} />
                      <button onClick={() => setVariants((prev) => prev.filter((x) => x.key !== v.key))} title="Hapus varian" style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}><Trash2 size={15} color={C.mutedDark} /></button>
                    </div>
                  )}
                />
                <div style={{ marginTop: 10 }}><GhostBtn small icon={Plus} onClick={() => setVariants((prev) => [...prev, { key: `v${Date.now()}`, name: "", stock: "" }])}>Tambah Varian</GhostBtn></div>
              </div>
            ) : (
              <div style={{ marginTop: 12, maxWidth: 220 }}>
                <span style={label}>Stok (kosongkan = tidak dibatasi)</span>
                <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="∞" style={{ ...field, fontFamily: "'JetBrains Mono',monospace" }} />
              </div>
            )}
          </div>

          <div>
            <span style={label}>Deskripsi</span>
            <div style={{ marginTop: 5 }}><RichTextEditor value={desc} onChange={setDesc} rows={4} placeholder="Bahan, ukuran, isi paket, cara perawatan..." /></div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <span style={label}>Berat (gram, opsional)</span>
              <input type="number" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="200" style={{ ...field, fontFamily: "'JetBrains Mono',monospace" }} />
            </div>
            <div style={{ flex: 1.4, minWidth: 200 }}>
              <span style={label}>Status</span>
              <div style={{ display: "flex", gap: 6, marginTop: 5, background: C.surface2, borderRadius: 12, padding: 4 }}>
                {[["published", "Tampil di toko"], ["draft", "Draft"]].map(([k, l]) => (
                  <button key={k} onClick={() => setStatus(k)} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", background: status === k ? C.surface : "transparent", boxShadow: status === k ? "0 2px 8px rgba(0,0,0,0.08)" : "none", color: status === k ? C.text : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5, cursor: "pointer", transition: "all .25s ease" }}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.emberLight, margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <GhostBtn full onClick={onClose}>Batal</GhostBtn>
            <PrimaryBtn full onClick={submit} loading={saving} disabled={uploading > 0} icon={Check}>{uploading > 0 ? "Menunggu upload..." : isEdit ? "Simpan Perubahan" : "Simpan Produk"}</PrimaryBtn>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- FORM TAMBAH PRODUK ---------------- */
// Modal ringkas buat langkah pertama bikin produk baru -- cuma 3 input. Sisanya (materi/video,
// kategori, level, deskripsi, dll) diisi belakangan langsung di tampilan aslinya (Mode Edit).
function QuickProductFormModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Judul produk wajib diisi."); return; }
    if (!price || Number(price) <= 0) { setError("Harga normal wajib diisi."); return; }
    setError("");
    setSaving(true);
    await onSubmit({
      name: name.trim(),
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : Number(price),
      category: "Umum", level: "Pemula", desc: "", benefits: [], learn: [], bonus: "", previewVideo: "", status: "draft",
    });
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <Card style={{ width: "100%", maxWidth: 420, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 24, color: C.text, margin: 0 }}>TAMBAH PRODUK</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color={C.muted} /></button>
        </div>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: 0, marginBottom: 18 }}>
          Isi ini dulu, sisanya (video, materi, deskripsi, dll) diisi langsung di halaman tampilan pembeli setelah ini tersimpan.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Judul Produk / Kelas</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Fondasi Gitar untuk Pemula" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Harga Normal (Rp)</label>
              <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="299000" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5, boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Harga Coret (opsional)</label>
              <input type="number" min="0" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="599000" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5, boxSizing: "border-box" }} />
            </div>
          </div>

          {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <GhostBtn full onClick={onClose}>Batal</GhostBtn>
            <PrimaryBtn full onClick={handleSubmit} icon={ArrowRight}>{saving ? "Menyimpan..." : "Simpan & Lanjutkan"}</PrimaryBtn>
          </div>
        </div>
      </Card>
    </div>
  );
}

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
  // Video/materi tidak lagi diedit di modal ini (sekarang lewat "Kelola Materi" langsung di
  // halaman aslinya) -- tapi kurikulum yang sudah ada tetap dibawa apa adanya waktu Simpan,
  // supaya video yang sudah diisi tidak ikut terhapus hanya karena admin ubah harga/deskripsi.
  const [items] = useState(() =>
    initialItems && initialItems.length > 0
      ? initialItems.map((it) => it.type === "section"
          ? { id: it.id, type: "section", title: it.title || "" }
          : { id: it.id, type: "video", title: it.title || "", desc: it.desc || "", url: it.url || "", duration: it.duration || "" })
      : []
  );
  const [error, setError] = useState("");

  const updateListItem = (setter) => (idx, value) => setter((list) => list.map((item, i) => (i === idx ? value : item)));
  const addListItem = (setter) => () => setter((list) => [...list, ""]);
  const removeListItem = (setter) => (idx) => setter((list) => list.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (!name.trim()) { setError("Nama produk wajib diisi."); return; }
    if (!price || Number(price) <= 0) { setError("Harga produk wajib diisi dengan benar."); return; }
    const validItems = items
      .filter((it) => it.title.trim())
      .map((it) => it.type === "section"
        ? { id: it.id, type: "section", title: it.title.trim() }
        : { id: it.id, type: "video", title: it.title.trim(), desc: (it.desc || "").trim(), url: (it.url || "").trim(), duration: (it.duration || "").trim() || "—" });
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <Card style={{ width: "100%", maxWidth: 620, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 24, color: C.text, margin: 0 }}>{isEdit ? "EDIT PRODUK" : "TAMBAH PRODUK BARU"}</h2>
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
            <div style={{ marginTop: 5 }}>
              <RichTextEditor value={desc} onChange={setDesc} rows={4} placeholder="Jelaskan singkat isi produk ini..." />
            </div>
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Link Video Preview (tampil di halaman produk)</label>
            <input value={previewVideo} onChange={(e) => setPreviewVideo(e.target.value)} placeholder="https://youtube.com/watch?v=..." style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, marginTop: 4 }}>Beda dengan video materi — ini video cuplikan/trailer yang tampil ke calon pembeli (gratis ditonton). Thumbnail-nya otomatis dipakai sebagai gambar kartu produk.</p>
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
            <div style={{ padding: 14, borderRadius: 10, background: `${C.gold}0F`, border: `1px solid ${C.gold}40`, display: "flex", alignItems: "center", gap: 10 }}>
              <PlayCircle size={18} color={C.goldLight} style={{ flexShrink: 0 }} />
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, margin: 0 }}>
                Video & materi sekarang diedit langsung di halaman tampilan pembeli. Simpan dulu perubahan di sini, lalu klik ikon ▶ "Kelola Materi" di daftar produk.
              </p>
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
      limit: limit ? Number(limit) : 0,
      expiry: expiry || null,
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <Card style={{ width: "100%", maxWidth: 440, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 24, color: C.text, margin: 0 }}>BUAT KODE DISKON</h2>
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
              <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Batas Pemakaian (0 = tanpa batas)</label>
              <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="100" style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5, boxSizing: "border-box" }} />
            </div>
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Berlaku Sampai (opsional — kosongkan kalau tanpa batas)</label>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
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
  // Headline, sub-judul, video, dan teks-teks lain sekarang diedit langsung di halamannya (tombol
  // "Edit di Halaman" -> klik ikon pensil di teks/video yang mau diubah). Modal ini ngurus hal yang
  // memang harus diatur di luar halaman: nama internal, produk, status, dan pengaturan Promo.
  const [name, setName] = useState(initialLp?.name || "");
  const [productId, setProductId] = useState(initialLp?.productId || products[0]?.id || "");
  const [status, setStatus] = useState(initialLp?.status || "published");
  const [template, setTemplate] = useState(initialLp?.extra?.template || "gold");
  const [error, setError] = useState("");

  const selectedProduct = products.find((pr) => pr.id === Number(productId)) || products[0];
  const legacyTiers = selectedProduct?.pricingTiers || null;
  const existingPromo = initialLp?.extra?.promo || (legacyTiers ? { enabled: true, founderPrice: legacyTiers.founderPrice, founderSlots: legacyTiers.founderSlots, earlyBirdHours: legacyTiers.earlyBirdHours } : null);
  // "Edit Promo": harga khusus untuk N pembeli pertama (custom, default 100) + batas waktu.
  // Begitu slot habis ATAU waktunya habis (mana lebih dulu), harga otomatis & permanen kembali
  // ke harga normal produk untuk SEMUA pengunjung berikutnya -- bukan cuma tampilan yang berkurang.
  const [promoEnabled, setPromoEnabled] = useState(existingPromo?.enabled || false);
  const [founderSlots, setFounderSlots] = useState(String(existingPromo?.founderSlots ?? 100));
  const [founderPrice, setFounderPrice] = useState(String(existingPromo?.founderPrice ?? selectedProduct?.price ?? ""));
  const [earlyBirdHours, setEarlyBirdHours] = useState(String(existingPromo?.earlyBirdHours ?? 72));

  const handleSubmit = () => {
    if (!name.trim()) { setError("Nama landing page wajib diisi."); return; }
    if (!productId) { setError("Pilih produk untuk landing page ini."); return; }
    if (promoEnabled && (!founderSlots || Number(founderSlots) <= 0)) { setError("Jumlah slot promo harus lebih dari 0."); return; }
    if (promoEnabled && (!founderPrice || Number(founderPrice) <= 0)) { setError("Harga promo harus diisi."); return; }
    setError("");
    const payload = { name: name.trim(), productId: Number(productId), status, template };
    if (initialLp) {
      payload.extra = {
        ...(initialLp.extra || {}),
        template,
        promo: {
          enabled: promoEnabled,
          founderSlots: Number(founderSlots) || 0,
          founderPrice: Number(founderPrice) || 0,
          earlyBirdHours: Number(earlyBirdHours) || 0,
        },
      };
    }
    onSubmit(payload);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <Card style={{ width: "100%", maxWidth: 460, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 24, color: C.text, margin: 0 }}>{initialLp ? "PENGATURAN LANDING PAGE" : "TAMBAH LANDING PAGE"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color={C.muted} /></button>
        </div>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: -10, marginBottom: 16 }}>
          {initialLp ? "Judul, video, dan teks lainnya diedit langsung di halamannya lewat tombol \"Edit di Halaman\"." : "Setelah dibuat, klik \"Edit di Halaman\" untuk mengisi judul, video, dan teks lainnya langsung di tampilan aslinya."}
        </p>

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
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Status</label>
            <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
              <button onClick={() => setStatus("published")} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${status === "published" ? C.gold : C.border}`, background: status === "published" ? C.surface2 : "transparent", color: status === "published" ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Aktif</button>
              <button onClick={() => setStatus("draft")} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${status === "draft" ? C.gold : C.border}`, background: status === "draft" ? C.surface2 : "transparent", color: status === "draft" ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Draft (belum bisa dibuka)</button>
            </div>
          </div>

          <div>
            <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Tampilan (Template)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 5 }}>
              {LP_TEMPLATES.map((t) => (
                <button key={t.key} onClick={() => setTemplate(t.key)} style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, border: `1px solid ${template === t.key ? C.gold : C.border}`, background: template === t.key ? C.surface2 : "transparent", color: template === t.key ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{t.label}</button>
              ))}
            </div>
          </div>

          {initialLp && (
            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 4, paddingTop: 14 }}>
              <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>Edit Promo</label>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, marginTop: 4, marginBottom: 10 }}>
                Harga khusus untuk sejumlah pembeli pertama (bisa diisi custom, mis. 100). Begitu slotnya habis ATAU waktunya habis — mana yang lebih dulu — harga otomatis kembali ke harga normal produk ({selectedProduct ? rp(selectedProduct.price) : "-"}) untuk semua orang, permanen.
              </p>

              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button onClick={() => setPromoEnabled(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${!promoEnabled ? C.gold : C.border}`, background: !promoEnabled ? C.surface2 : "transparent", color: !promoEnabled ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Tidak Pakai Promo</button>
                <button onClick={() => setPromoEnabled(true)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${promoEnabled ? C.gold : C.border}`, background: promoEnabled ? C.surface2 : "transparent", color: promoEnabled ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Pakai Harga Promo</button>
              </div>

              {promoEnabled && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}>Jumlah Pembeli Pertama (custom)</label>
                    <input type="number" min="1" value={founderSlots} onChange={(e) => setFounderSlots(e.target.value)} placeholder="100" style={{ width: "100%", marginTop: 4, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}>Harga Promo (Rp)</label>
                    <input type="number" min="0" value={founderPrice} onChange={(e) => setFounderPrice(e.target.value)} placeholder="247000" style={{ width: "100%", marginTop: 4, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}>Durasi Countdown (jam, sejak kunjungan pertama pengunjung)</label>
                    <input type="number" min="1" value={earlyBirdHours} onChange={(e) => setEarlyBirdHours(e.target.value)} placeholder="72" style={{ width: "100%", marginTop: 4, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, margin: 0 }}>
                    Slot dihitung dari total penjualan produk ini yang sebenarnya (bukan cuma tampilan) — begitu tembus {founderSlots || "0"}, promo tutup permanen untuk semua orang.
                  </p>
                </div>
              )}
            </div>
          )}

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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <Card style={{ width: "100%", maxWidth: 640, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 24, color: C.text, margin: 0 }}>{isEdit ? "EDIT HALAMAN" : "TAMBAH HALAMAN BARU"}</h2>
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
function LearnPage({ slug, go, progress, onMarkComplete, current, setCurrent, products, curriculumData, curriculumOutline, role, learnEditMode, setLearnEditMode, onSaveProduct, goToAdmin }) {
  const product = products.find((x) => x.slug === slug) || { id: null, name: "", hue: C.gold };
  const curriculum = curriculumData[product.id] || [];
  const outline = (curriculumOutline?.[product.id] && curriculumOutline[product.id].length > 0) ? curriculumOutline[product.id] : curriculum.map((v) => ({ type: "video", ...v }));
  const completed = progress[product.id] || [];
  // Saat member membuka kelas, langsung lanjut ke video pertama yang BELUM selesai
  // (bukan selalu mulai dari video 1).
  const firstUndone = curriculum.findIndex((_, i) => !completed.includes(i));
  const curIdx = Math.min(current[product.id] ?? (firstUndone === -1 ? 0 : firstUndone), Math.max(0, curriculum.length - 1));
  const video = curriculum[curIdx];
  const [showImport, setShowImport] = useState(false);
  // Catat kelas ini sebagai "terakhir dibuka" begitu halaman materi dibuka (untuk kartu Lanjutkan Belajar).
  useEffect(() => {
    if (product.id && curriculum.length > 0 && current[product.id] === undefined) setCurrent((prev) => ({ ...prev, [product.id]: curIdx }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, curriculum.length]);
  const isLast = curIdx === curriculum.length - 1;
  const isCurrentDone = video ? completed.includes(curIdx) : false;

  const selectVideo = (idx) => setCurrent((prev) => ({ ...prev, [product.id]: idx }));
  const markCompleteAndNext = () => {
    onMarkComplete(product.id, curIdx);
    if (!isLast) setCurrent((prev) => ({ ...prev, [product.id]: curIdx + 1 }));
  };

  // Mode Edit langsung di halaman materi (sama seperti landing page): cuma aktif kalau admin
  // memang menyalakannya lewat tombol di bar atas. Ini yang bikin admin bisa nyusun kurikulum
  // (judul kelas, video, link) langsung di tampilan asli yang dilihat pembeli, tanpa modal.
  const admin = role === "admin" && !!learnEditMode;

  // Setiap perubahan struktur kurikulum (tambah/hapus/urutkan/isi judul & link video) langsung
  // disimpan ke database lewat updateProduct yang sudah ada (full-replace curriculum_videos),
  // dengan data produk lain (harga, kategori, dst) dikirim apa adanya supaya tidak ikut berubah.
  const saveOutline = (newOutline) => onSaveProduct && onSaveProduct(product.id, { ...product }, newOutline);
  const updateItem = (idx, field, value) => saveOutline(outline.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  const removeItem = (idx) => {
    const it = outline[idx];
    if (!window.confirm(it?.type === "section" ? `Hapus judul bab "${it.title}"? Video di dalamnya tetap ada.` : `Hapus video "${it?.title || ""}"? Progres member untuk video ini ikut terhapus.`)) return;
    saveOutline(outline.filter((_, i) => i !== idx));
    if (idx === curIdx) selectVideo(Math.max(0, curIdx - 1));
  };
  const insertItemAt = (idx, newItem) => {
    const copy = outline.slice();
    copy.splice(idx, 0, newItem);
    saveOutline(copy);
  };
  const insertVideoAfter = (idx) => insertItemAt(idx + 1, { type: "video", title: "Video Baru", desc: "", url: "", duration: "" });
  const insertSectionAfter = (idx) => insertItemAt(idx + 1, { type: "section", title: "Judul Materi Baru" });
  const addVideoRow = () => saveOutline([...outline, { type: "video", title: "Video Baru", desc: "", url: "", duration: "" }]);
  const addSectionRow = () => saveOutline([...outline, { type: "section", title: "Judul Materi Baru" }]);

  const [collapsedSections, setCollapsedSections] = useState(() => new Set());
  const [expandedVideoIdx, setExpandedVideoIdx] = useState(() => new Set());
  const toggleSection = (key) => setCollapsedSections((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const toggleVideoExpand = (key) => setExpandedVideoIdx((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const outlineIndexForVideo = (k) => {
    let c = -1;
    for (let i = 0; i < outline.length; i++) {
      if (outline[i].type === "video") { c++; if (c === k) return i; }
    }
    return -1;
  };

  if (curriculum.length === 0 && !admin) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: "'Manrope',sans-serif", color: C.muted }}>Materi untuk produk ini sedang disiapkan. Kami akan mengabari kamu begitu siap.</p>
        <div style={{ marginTop: 16 }}><GhostBtn onClick={() => go("customer")}>Kembali ke Dashboard</GhostBtn></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 0 60px" }}>
      {/* Bar mode-edit -- cuma admin yang lihat, sama seperti di landing page */}
      {role === "admin" && (
        <div style={{ position: "sticky", top: 0, zIndex: 40, background: "#1a1420", borderBottom: `1px solid ${admin ? C.gold : C.borderSoft}`, padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <button onClick={goToAdmin} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 600, padding: 0 }}>
            <ArrowLeft size={14} />Kembali ke Admin <span style={{ color: C.mutedDark }}>· {product.name}</span>
          </button>
          <button
            onClick={() => setLearnEditMode && setLearnEditMode(!learnEditMode)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: admin ? C.gold : "none", border: `1px solid ${admin ? C.gold : C.border}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: admin ? "#161019" : C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5 }}
          >
            <Pencil size={13} />{admin ? "Mode Edit: ON" : "Mode Preview"}
          </button>
        </div>
      )}

      <div style={{ padding: "0 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, marginBottom: 16 }}>
        <span onClick={() => go("customer")} style={{ cursor: "pointer" }}>Dashboard</span><ChevronRight size={12} />
        <span onClick={() => go("customer")} style={{ cursor: "pointer" }}>Produk Saya</span><ChevronRight size={12} />
        <span style={{ color: C.text }}>{product.name}</span>
      </div>

      <div style={{ marginBottom: 18 }}>
        <EditableText
          value={product.name}
          admin={admin}
          onSave={(v) => onSaveProduct && onSaveProduct(product.id, { ...product, name: v }, outline)}
          tag="h1"
          block
          style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 28, color: C.text, margin: 0, textTransform: "uppercase" }}
        />
        {curriculum.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 999, background: C.surface2, overflow: "hidden" }}>
              <div style={{ width: `${(completed.length / curriculum.length) * 100}%`, height: "100%", background: "linear-gradient(90deg, #F3D27A, #B8892E)", borderRadius: 999, transition: "width .8s var(--gs-spring)" }} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>{Math.round((completed.length / curriculum.length) * 100)}% · {completed.length}/{curriculum.length}</span>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: curriculum.length > 0 ? "1fr 320px" : "1fr", gap: 24 }} className="gs-hero-grid">
        {curriculum.length > 0 && (
        <div>
          <div>
            <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.gold, fontWeight: 700 }}>VIDEO {curIdx + 1} DARI {curriculum.length}</span>
            <EditableText
              value={video.title}
              admin={admin}
              onSave={(v) => updateItem(outlineIndexForVideo(curIdx), "title", v)}
              tag="h2"
              block
              style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 19, color: C.text, margin: "6px 0" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={13} color={C.muted} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted }}>{video.duration}</span>
              {isCurrentDone && <span style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}><Check size={13} color={C.gold} /><span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.gold, fontWeight: 700 }}>Sudah selesai</span></span>}
            </div>
          </div>

          <div style={{ height: 14 }} />
          <LpVideoEditable url={video.url} admin={admin} onSave={(v) => updateItem(outlineIndexForVideo(curIdx), "url", v)}>
            {(() => {
              const embedUrl = toLessonEmbedUrl(video.url);
              if (embedUrl) {
                return (
                  <div>
                    <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, background: C.surface2 }}>
                      <iframe
                        key={embedUrl}
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
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted }}>{admin ? "Belum ada link video — klik ikon pensil di kanan atas" : "Video untuk materi ini segera hadir"}</span>
                </div>
              );
            })()}
          </LpVideoEditable>

          {(() => {
            const next = !isLast ? curriculum[curIdx + 1] : null;
            const allDone = completed.length >= curriculum.length && curriculum.length > 0;
            const nextThumb = next ? youtubeThumb(next.url) : null;
            return (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
                  <button onClick={() => curIdx > 0 && selectVideo(curIdx - 1)} disabled={curIdx === 0} title="Video sebelumnya" className="gs-btn gs-btn-ghost" style={{ width: 52, flexShrink: 0, borderRadius: 16, border: `1px solid ${C.border}`, background: C.surface, cursor: curIdx === 0 ? "default" : "pointer", opacity: curIdx === 0 ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                    <SkipBack size={18} color={C.text} />
                  </button>
                  <div style={{ flex: 1 }}>
                    {!isLast ? (
                      <PrimaryBtn full onClick={markCompleteAndNext} icon={SkipForward}>{isCurrentDone ? "Lanjut ke Video Berikutnya" : "Selesai & Lanjut"}</PrimaryBtn>
                    ) : !isCurrentDone ? (
                      <PrimaryBtn full onClick={markCompleteAndNext} icon={Check}>Tandai Selesai</PrimaryBtn>
                    ) : (
                      <GhostBtn full onClick={() => selectVideo(0)} icon={RotateCcw}>Ulangi dari Video 1</GhostBtn>
                    )}
                  </div>
                </div>
                {next && (
                  <Card onClick={() => selectVideo(curIdx + 1)} className="gs-next-card" style={{ padding: 10, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ position: "relative", width: 112, aspectRatio: "16 / 9", borderRadius: 10, overflow: "hidden", flexShrink: 0, background: nextThumb ? `center / cover no-repeat url("${nextThumb}")` : `linear-gradient(135deg, ${product.hue || C.gold}44, ${C.surface2})` }}>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)" }}><Play size={18} color="#fff" fill="#fff" /></div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 10.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: C.gold }}>Berikutnya · Video {curIdx + 2}</span>
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, fontWeight: 700, color: C.text, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{next.title}</div>
                      {next.duration && next.duration !== "—" && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.mutedDark }}>{next.duration}</span>}
                    </div>
                    <ChevronRight size={18} color={C.muted} className="gs-btn-icon" />
                  </Card>
                )}
                {allDone && (
                  <div className="gs-celebrate" style={{ position: "relative", overflow: "hidden", borderRadius: 20, padding: "22px 20px", background: "linear-gradient(135deg, #2A2112, #16120B)", border: `1px solid ${C.gold}66`, textAlign: "center" }}>
                    {Array.from({ length: 14 }).map((_, i) => (
                      <span key={i} className="gs-confetti" style={{ left: `${(i * 7.3) % 100}%`, animationDelay: `${(i % 7) * 0.18}s`, background: i % 3 === 0 ? "#F3D27A" : i % 3 === 1 ? "#E0553A" : "#FFFFFF" }} />
                    ))}
                    <div style={{ fontSize: 34 }}>🎸</div>
                    <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 20, color: "#F3D27A", margin: "6px 0 4px" }}>Selamat, kelas selesai!</h3>
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.75)", margin: 0 }}>Semua {curriculum.length} video sudah kamu tuntaskan. Ulangi latihan favoritmu kapan saja.</p>
                  </div>
                )}
              </div>
            );
          })()}

          <VideoDescription
            desc={video.desc}
            admin={admin}
            onSave={(v) => updateItem(outlineIndexForVideo(curIdx), "desc", v)}
          />
        </div>
        )}

        <div>
          {admin ? (
            <LearnCurriculumEditor
              outline={outline}
              curIdx={curIdx}
              onSelect={selectVideo}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              expandedVideoIdx={expandedVideoIdx}
              toggleVideoExpand={toggleVideoExpand}
              updateItem={updateItem}
              removeItem={removeItem}
              onReorderOutline={(next) => saveOutline(next)}
              insertVideoAfter={insertVideoAfter}
              insertSectionAfter={insertSectionAfter}
              addVideoRow={addVideoRow}
              addSectionRow={addSectionRow}
              onImportYoutube={() => setShowImport(true)}
            />
          ) : (
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
                  <div key={`v-${i}`} onClick={() => selectVideo(idx)} className="gs-lesson-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 10px", borderRadius: 12, cursor: "pointer", background: active ? `linear-gradient(90deg, ${C.gold}22, transparent)` : "transparent", boxShadow: active ? `inset 3px 0 0 ${C.gold}` : "none" }}>
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
          )}
        </div>
      </div>
      </div>
      {showImport && (
        <YoutubeImportModal
          mode="append"
          productName={product.name}
          onClose={() => setShowImport(false)}
          onAppend={async (items) => {
            await saveOutline([...outline, ...items]);
            setShowImport(false);
          }}
        />
      )}
    </div>
  );
}

// Editor kurikulum yang tampil live di LearnPage waktu Mode Edit ON. Semua baris (judul bab &
// video) bisa diurutkan dengan TAHAN & GESER. Bab bisa dilipat supaya daftar puluhan video tetap
// rapi; tiap perubahan langsung tersimpan ke database (tanpa tombol "Simpan").
function LearnCurriculumEditor({ outline, curIdx, onSelect, collapsedSections, toggleSection, expandedVideoIdx, toggleVideoExpand, updateItem, removeItem, onReorderOutline, insertVideoAfter, insertSectionAfter, addVideoRow, addSectionRow, onImportYoutube }) {
  const totalVideoCount = outline.filter((it) => it.type !== "section").length;
  const sectionCount = outline.filter((it) => it.type === "section").length;
  const secKey = (it, idx) => `s-${it.id ?? `new-${idx}`}`;

  // Baris yang terlihat (video di dalam bab yang dilipat disembunyikan).
  const rows = [];
  {
    let hidden = false;
    let vn = -1;
    outline.forEach((it, idx) => {
      if (it.type === "section") {
        const key = secKey(it, idx);
        hidden = collapsedSections.has(key);
        let count = 0;
        for (let j = idx + 1; j < outline.length && outline[j].type !== "section"; j++) count++;
        rows.push({ kind: "section", it, idx, key, count, collapsed: hidden });
      } else {
        vn++;
        if (!hidden) rows.push({ kind: "video", it, idx, vn, key: `v-${it.id ?? `new-${idx}`}` });
      }
    });
  }

  // Hasil geser pada baris yang terlihat -> urutan lengkap (termasuk video di bab terlipat).
  const handleReorder = (nextRows, { to }) => {
    const moved = nextRows[to];
    const after = nextRows[to + 1];
    const rest = outline.filter((_, i) => i !== moved.idx);
    const insertAt = after ? rest.indexOf(after.it) : rest.length;
    rest.splice(insertAt < 0 ? rest.length : insertAt, 0, moved.it);
    onReorderOutline(rest);
  };

  const iconBtn = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer", width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.mutedDark }}>{totalVideoCount} video{sectionCount ? ` · ${sectionCount} bab` : ""}</span>
        {onImportYoutube && outline.length > 0 && <PrimaryBtn small onClick={onImportYoutube} icon={Youtube}>Import dari YouTube</PrimaryBtn>}
      </div>
      {outline.length > 0 && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, margin: "0 0 10px" }}>Tahan & geser untuk mengurutkan</p>}
      {outline.length === 0 ? (
        <Card style={{ padding: 28, textAlign: "center" }}>
          <Youtube size={30} color={C.gold} style={{ margin: "0 auto 10px" }} />
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: "0 0 14px" }}>Belum ada materi. Cara tercepat: tempel link playlist YouTube.</p>
          {onImportYoutube && <PrimaryBtn small onClick={onImportYoutube} icon={Youtube}>Import dari YouTube</PrimaryBtn>}
        </Card>
      ) : (
      <SortableList
        items={rows}
        getKey={(r) => r.key}
        gap={8}
        onReorder={handleReorder}
        renderItem={(r) => {
          if (r.kind === "section") {
            return (
              <div style={{ padding: "10px 10px 10px 2px", borderRadius: 14, background: `linear-gradient(135deg, ${C.gold}22, ${C.gold}0A)`, border: `1px solid ${C.gold}55`, display: "flex", alignItems: "center", gap: 6 }}>
                <DragHandle />
                <button onClick={() => toggleSection(r.key)} title={r.collapsed ? "Buka bab" : "Lipat bab"} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", flexShrink: 0 }}>
                  <ChevronDown size={17} color={C.goldLight} style={{ transform: r.collapsed ? "rotate(-90deg)" : "none", transition: "transform .3s var(--gs-spring)" }} />
                </button>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 26, position: "relative" }}>
                  <EditableText value={r.it.title} admin onSave={(v) => updateItem(r.idx, "title", v)} tag="div" block style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 13.5, color: C.goldLight, textTransform: "uppercase", letterSpacing: 0.3 }} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.goldLight, opacity: 0.8 }}>{r.count} video</span>
                </div>
                <button onClick={() => insertVideoAfter(r.idx)} title="Tambah video di bab ini" style={{ ...iconBtn, borderColor: `${C.gold}66` }}><Plus size={15} color={C.goldLight} /></button>
                <button onClick={() => removeItem(r.idx)} title="Hapus judul bab (videonya tetap ada)" style={iconBtn}><Trash2 size={14} color={C.mutedDark} /></button>
              </div>
            );
          }
          const it = r.it;
          const expanded = expandedVideoIdx.has(r.idx);
          const active = r.vn === curIdx;
          return (
            <div style={{ borderRadius: 14, background: active ? C.surface2 : C.surface, border: `1px solid ${active ? C.gold : C.border}`, overflow: "hidden" }}>
              <div style={{ padding: "8px 8px 8px 2px", display: "flex", alignItems: "center", gap: 6 }}>
                <DragHandle />
                <button onClick={() => onSelect(r.vn)} title="Putar video ini" style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid ${active ? C.gold : C.border}`, background: active ? C.gold : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", padding: 0 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: active ? "#1A140A" : C.muted }}>{r.vn + 1}</span>
                </button>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 26, position: "relative" }}>
                  <EditableText value={it.title} admin onSave={(v) => updateItem(r.idx, "title", v)} tag="div" block style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    {it.duration && it.duration !== "—" && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: C.mutedDark }}>{it.duration}</span>}
                    {!it.url && <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 10.5, fontWeight: 700, color: C.emberLight }}>● link belum diisi</span>}
                  </div>
                </div>
                <button onClick={() => toggleVideoExpand(r.idx)} title="Link, deskripsi & durasi" style={iconBtn}>
                  <ChevronDown size={15} color={C.muted} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .3s var(--gs-spring)" }} />
                </button>
                <button onClick={() => insertVideoAfter(r.idx)} title="Sisipkan video setelah ini" style={iconBtn}><Plus size={15} color={C.mutedDark} /></button>
                <button onClick={() => removeItem(r.idx)} title="Hapus video" style={iconBtn}><Trash2 size={14} color={C.mutedDark} /></button>
              </div>
              {expanded && (
                <div className="gs-anim-in" data-no-drag style={{ padding: "12px 14px 14px", background: C.surface2, borderTop: `1px dashed ${C.border}`, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ position: "relative", paddingRight: 26 }}>
                    <span style={{ display: "block", fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, marginBottom: 4 }}>Link video (YouTube/Vimeo)</span>
                    <EditableText value={it.url || ""} admin onSave={(v) => updateItem(r.idx, "url", v)} tag="div" block style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: it.url ? C.text : C.mutedDark, wordBreak: "break-all" }} />
                  </div>
                  <div style={{ position: "relative", paddingRight: 26 }}>
                    <span style={{ display: "block", fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, marginBottom: 4 }}>Deskripsi singkat</span>
                    <EditableText value={it.desc || ""} admin onSave={(v) => updateItem(r.idx, "desc", v)} tag="div" area block style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: it.desc ? C.text : C.mutedDark }} />
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ position: "relative", paddingRight: 26, minWidth: 110 }}>
                      <span style={{ display: "block", fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, marginBottom: 4 }}>Durasi (mis. 12:30)</span>
                      <EditableText value={it.duration || ""} admin onSave={(v) => updateItem(r.idx, "duration", v)} tag="div" block style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: it.duration ? C.text : C.mutedDark }} />
                    </div>
                    <GhostBtn small onClick={() => insertSectionAfter(r.idx)} icon={Type}>Judul bab setelah ini</GhostBtn>
                  </div>
                </div>
              )}
            </div>
          );
        }}
      />
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <GhostBtn small onClick={addVideoRow} icon={Plus}>Video</GhostBtn>
        <GhostBtn small onClick={addSectionRow} icon={Type}>Judul Bab</GhostBtn>
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
  { label: "Materi Berurutan dari Dasar", us: true, other: "partial" },
  { label: "Bisa Ditonton Ulang", us: true, other: true },
];

const LP_GENERIC_FAQ = [
  { q: "Saya masih pemula, cocok ikut course ini?", a: "Materinya disusun bertahap dari dasar, jadi kamu bisa ikuti sesuai levelmu masing-masing." },
  { q: "Berapa lama saya bisa akses materinya?", a: "Akses selamanya — sekali bayar, kamu bisa tonton ulang kapan pun kamu mau." },
  { q: "Kalau saya belum ngerti materinya gimana?", a: "Kamu bisa ulang-ulang video sampai benar-benar paham, materinya tidak akan hilang." },
];

// Semua teks "marketing copy" landing page yang dulunya generik/hardcode, sekarang bisa ditimpa
// per-halaman lewat kolom extra (jsonb) -- ini nilai baku kalau belum pernah diedit.
const LP_EXTRA_DEFAULTS = {
  ctaText: "Ya, Saya Mau Belajar Sekarang",
  heroNote: "Akses terbuka setelah pembayaran diverifikasi",
  problemTitle: "Belajar Sendiri Itu ||Sering Bikin Stuck?",
  problemSubtitle: "Mari kita jujur sama diri sendiri...",
  problems: LP_GENERIC_PROBLEMS,
  quoteText: "\u201CKamu latihan KERAS, tapi bukan latihan dengan CARA yang benar.\u201D",
  comparisonHighlight: "Cara Lain",
  testimonialTitle: "Kata Mereka yang Sudah ||Merasakan Manfaatnya",
  bonusHeading: "Nilai Lebih yang Kamu Dapatkan",
  faqTitle: "Masih Ragu? ||Ini Jawabannya",
  faq: LP_GENERIC_FAQ,
  closingTitle: "Masih Mau ||Belajar Sendirian Tanpa Arah?",
  closingSubtitle: "Atau kamu mau mulai belajar dengan jalur yang jelas dan terukur, sesuai ritme kamu sendiri?",
  closingCtaText: "Ya, Saya Mau Mulai Sekarang",
  closingFooterNote: "Mulai belajar gitar bersama Gitar Sakti",
  // Teks-teks di blok harga + countdown (section "Harga Spesial"). Bagian jumlah slot & harga
  // itu sendiri diatur lewat "Edit Promo" di Pengaturan Landing Page, bukan di sini -- ini
  // cuma teksnya saja, silakan sesuaikan gaya bahasanya lewat pensil di halaman.
  promoActiveNote: "Harga Spesial Pendiri — sisa {sisa} dari {total} slot",
  promoExpiredTimeNote: "Harga sudah kembali ke harga normal",
  promoExpiredSlotNote: "Slot harga spesial sudah penuh — harga sudah kembali normal",
  promoOffNote: "Harga Spesial",
  promoCountdownLabel: "Harga Ini Berakhir Dalam",
  promoEndedLabel: "Periode harga spesial untuk kamu sudah berakhir",
  promoActivePriceLabel: "Harga Spesial Terbatas",
  promoNormalPriceLabel: "Harga Normal",
  trustBadge1: "Pembayaran Aman",
  trustBadge2: "Akses Setelah Verifikasi",
};

// Judul dua-warna (mis. "Belajar Sendiri Itu SERING BIKIN STUCK?") disimpan sebagai 1 string
// dengan pemisah "||" -- bagian setelah "||" otomatis ditampilkan warna emas. Dibuat terpisah
// dari EditableText biasa karena butuh tampilan baca yang custom (dua warna), bukan teks polos.
function LpTwoToneText({ value, onSave, admin, tag = "h2", style, accentStyle, accentClass, breakLine }) {
  const Tag = tag;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const renderTwoTone = (text) => {
    const parts = String(text || "").split("||");
    return <>{parts[0]}{parts[1] ? <>{breakLine ? <br /> : null}<span className={accentClass} style={accentStyle || (accentClass ? undefined : { color: C.goldLight })}>{parts[1]}</span></> : null}</>;
  };

  if (!admin) return <Tag style={style}>{renderTwoTone(value)}</Tag>;

  if (editing) {
    return (
      <span style={{ display: "block", margin: "2px 0", maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Teks judul || bagian ini jadi warna aksen"
          style={{ width: "100%", background: C.surface2, border: `1px solid ${C.gold}`, borderRadius: 6, padding: "7px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13, boxSizing: "border-box", textAlign: "center" }}
        />
        <span style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "center" }}>
          <button onClick={() => { onSave(draft); setEditing(false); }} title="Simpan" style={{ background: C.gold, border: "none", borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Check size={13} color="#161019" /></button>
          <button onClick={() => { setDraft(value); setEditing(false); }} title="Batal" style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={13} color={C.muted} /></button>
        </span>
        <span style={{ display: "block", textAlign: "center", fontFamily: "'Manrope',sans-serif", fontSize: 10.5, color: C.mutedDark, marginTop: 4 }}>Tulis "||" sebelum bagian yang mau ditampilkan warna aksen (emas/ungu sesuai template).</span>
      </span>
    );
  }

  return (
    <span className="gs-editable" style={{ position: "relative", display: "block" }}>
      <Tag style={style}>{renderTwoTone(value)}</Tag>
      <button onClick={() => setEditing(true)} className="gs-edit-pencil" title="Edit judul ini" style={{ position: "absolute", bottom: -8, right: "calc(50% - 60px)", width: 22, height: 22, borderRadius: 6, background: C.gold, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.45)", zIndex: 5 }}>
        <Pencil size={11} color="#161019" />
      </button>
    </span>
  );
}

// Overlay pensil buat ganti link video preview langsung di tempat -- tidak pakai EditableText
// biasa karena isinya bukan teks tapi player video (iframe/thumbnail).
function LpVideoEditable({ url, onSave, admin, children }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url);
  useEffect(() => { if (!editing) setDraft(url); }, [url, editing]);
  if (!admin) return children;
  return (
    <div>
      <div className="gs-editable" style={{ position: "relative" }}>
        {children}
        {!editing && (
          <button onClick={() => setEditing(true)} className="gs-edit-pencil" title="Ganti link video" style={{ position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 8, background: C.gold, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.5)", zIndex: 6, opacity: 1 }}>
            <Pencil size={14} color="#161019" />
          </button>
        )}
      </div>
      {editing && (
        <div style={{ marginTop: 10, marginBottom: 20, padding: 12, borderRadius: 10, background: C.surface2, border: `1px solid ${C.gold}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://youtube.com/watch?v=..." style={{ flex: 1, minWidth: 200, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, boxSizing: "border-box" }} />
          <button onClick={() => { onSave(draft); setEditing(false); }} style={{ background: C.gold, border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12, color: "#161019" }}><Check size={13} />Simpan</button>
          <button onClick={() => { setDraft(url); setEditing(false); }} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12, color: C.muted }}><X size={13} />Batal</button>
        </div>
      )}
    </div>
  );
}

// Label tombol (CTA) juga bisa diedit langsung, tapi kontrol editnya sengaja diletakkan DI LUAR
// elemen <button> aslinya (bukan di-nest di dalamnya) supaya tetap HTML yang valid dan supaya
// klik pensil/simpan/batal tidak ikut memicu aksi tombolnya (mis. scroll ke harga).
function LpEditableButtonLabel({ value, onSave, admin, children }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  if (!admin) return children;
  return (
    <span style={{ display: "inline-block" }}>
      <span className="gs-editable" style={{ position: "relative", display: "inline-block" }}>
        {children}
        {!editing && (
          <button onClick={() => setEditing(true)} className="gs-edit-pencil" title="Edit teks tombol" style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: 6, background: C.gold, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.45)", zIndex: 5 }}>
            <Pencil size={11} color="#161019" />
          </button>
        )}
      </span>
      {editing && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} style={{ background: C.surface2, border: `1px solid ${C.gold}`, borderRadius: 6, padding: "6px 9px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, boxSizing: "border-box", minWidth: 180 }} />
          <button onClick={() => { onSave(draft); setEditing(false); }} style={{ background: C.gold, border: "none", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Check size={13} color="#161019" /></button>
          <button onClick={() => { setDraft(value); setEditing(false); }} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={13} color={C.muted} /></button>
        </div>
      )}
    </span>
  );
}

// Badge status promo (mis. "Harga Spesial Pendiri — sisa 99 dari 100 slot") -- yang tampil ke
// pengunjung sudah otomatis diisi angka aslinya (displayValue), tapi yang diedit adalah kalimat
// MENTAH dengan placeholder {sisa}/{total} (rawValue) supaya tetap otomatis setelah disimpan.
function LpTemplateBadge({ displayValue, rawValue, onSave, admin, style }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(rawValue);
  useEffect(() => { if (!editing) setDraft(rawValue); }, [rawValue, editing]);
  if (!admin) return <span style={style}>{displayValue}</span>;

  if (editing) {
    return (
      <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6, maxWidth: 420 }}>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ width: "100%", background: C.surface2, border: `1px solid ${C.gold}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, boxSizing: "border-box", textAlign: "center" }}
        />
        <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 10.5, color: C.mutedDark }}>
          Pakai <b>{"{sisa}"}</b> & <b>{"{total}"}</b> supaya jumlah slot tetap otomatis update.
        </span>
        <span style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { onSave(draft); setEditing(false); }} title="Simpan" style={{ background: C.gold, border: "none", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Check size={13} color="#161019" /></button>
          <button onClick={() => { setDraft(rawValue); setEditing(false); }} title="Batal" style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={13} color={C.muted} /></button>
        </span>
      </span>
    );
  }

  return (
    <span className="gs-editable" style={{ position: "relative", display: "inline-block" }}>
      <span style={style}>{displayValue}</span>
      <button onClick={() => setEditing(true)} className="gs-edit-pencil" title="Edit kalimat ini" style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: 6, background: C.gold, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.45)", zIndex: 5 }}>
        <Pencil size={11} color="#161019" />
      </button>
    </span>
  );
}

/* ---------------- LANDING PAGE IKLAN (template, dipakai semua produk) ---------------- */
function LandingPageTemplate({ lp, go, applyPricingAndBuy, products, testimonials, addTestimonial, ownedIds, pendingIds, role, lpEditMode, setLpEditMode, onSaveLp, goToAdmin }) {
  const p = products.find((x) => x.id === lp?.productId);

  if (!lp || !p) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted }}>Landing page tidak ditemukan, atau produknya sudah tidak tersedia.</p>
      </div>
    );
  }

  // Promo harga bertingkat (harga khusus utk N pembeli pertama + batas waktu) sekarang diatur
  // per-landing-page lewat "Edit Promo" di Pengaturan Landing Page, bukan lagi hardcode di data
  // produk. Kalau LP ini belum pernah diatur promonya, jatuh ke pricingTiers lama dari produk
  // (kalau ada) supaya landing page yang sudah jalan sebelumnya tidak tiba-tiba berubah.
  const legacyTiers = p.pricingTiers || null;
  const promo = lp.extra?.promo || (legacyTiers
    ? { enabled: true, founderPrice: legacyTiers.founderPrice, founderSlots: legacyTiers.founderSlots, earlyBirdHours: legacyTiers.earlyBirdHours }
    : { enabled: false, founderPrice: p.price, founderSlots: 100, earlyBirdHours: 72 });
  const hasTiers = !!promo.enabled;
  const owned = ownedIds?.includes(p.id);
  const pending = pendingIds?.includes(p.id);
  const productReviews = testimonials?.[p.id] || [];
  const headline = lp.headline || p.name;
  const subheadline = lp.subheadline || p.desc;
  const badgeText = lp.badgeText || "Metode Latihan Yang Sudah Teruji";
  const videoUrl = lp.videoUrl || "";

  // Mode edit langsung di halaman: cuma aktif buat admin yang memang menyalakan "Mode Edit"
  // (lewat tombol di bar atas). Pengunjung biasa dan admin yang lagi "Lihat" saja tidak pernah
  // melihat ikon pensil ini -- tampilannya identik dengan yang dilihat calon pembeli.
  const admin = role === "admin" && !!lpEditMode;
  const extra = lp.extra || {};
  const getExtra = (key) => (extra[key] !== undefined && extra[key] !== null ? extra[key] : LP_EXTRA_DEFAULTS[key]);
  const saveCore = (field) => (value) => onSaveLp && onSaveLp(lp.id, { [field]: value });
  const saveExtra = (field) => (value) => onSaveLp && onSaveLp(lp.id, { extra: { ...extra, [field]: value } });
  const problemItems = getExtra("problems") || [];
  const updateProblemItem = (idx, patch) => saveExtra("problems")(problemItems.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addProblemItem = () => saveExtra("problems")([...problemItems, { title: "Masalah Baru", desc: "Jelaskan masalah yang sering dialami calon pembeli di sini." }]);
  const removeProblemItem = (idx) => saveExtra("problems")(problemItems.filter((_, i) => i !== idx));
  const faqItems = getExtra("faq") || [];
  const updateFaqItem = (idx, patch) => saveExtra("faq")(faqItems.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addFaqItem = () => saveExtra("faq")([...faqItems, { q: "Pertanyaan baru?", a: "Jawaban untuk pertanyaan ini." }]);
  const removeFaqItem = (idx) => saveExtra("faq")(faqItems.filter((_, i) => i !== idx));
  // Daftar bonus per-landing-page: tiap produk bisa punya banyak bonus (logo/icon + teks + nilai
  // harga), bukan cuma 1 baris teks seperti sebelumnya. Kalau belum pernah diisi lewat mode edit,
  // jatuh ke bonus lama dari data produk (field "Bonus" di form Edit Produk) supaya tidak hilang.
  const bonusItems = extra.bonusItems !== undefined ? (extra.bonusItems || []) : (p.bonus ? [{ icon: "✨", title: p.bonus, value: "" }] : []);
  const updateBonusItem = (idx, patch) => saveExtra("bonusItems")(bonusItems.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addBonusItem = () => saveExtra("bonusItems")([...bonusItems, { icon: "✨", title: "Bonus baru", value: "" }]);
  const removeBonusItem = (idx) => saveExtra("bonusItems")(bonusItems.filter((_, i) => i !== idx));
  const bonusValueTotal = bonusItems.reduce((sum, it) => {
    const n = parseInt(String(it.value || "").replace(/[^0-9]/g, ""), 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  useEffect(() => {
    // Catat 1 kunjungan landing page ini ke database (dipakai untuk statistik admin).
    // Titik integrasi Meta Pixel + Conversions API juga bisa ditaruh di sini kalau perlu nanti.
    supabase.rpc("increment_lp_visit", { p_slug: lp.slug }).then(() => {}).catch(() => {});
    trackEvent("ViewContent", { content_ids: [String(p.id)], content_name: p.name, content_type: "product", value: p.price, currency: "IDR" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lp.slug]);

  const scrollToPricing = () => {
    document.getElementById("lp-pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Countdown JUJUR: dihitung dari kunjungan PERTAMA user ke halaman ini, disimpan di localStorage
  // supaya tidak reset kalau halaman dibuka/refresh ulang. Begitu waktunya habis, tetap habis
  // selamanya untuk browser/user tsb. Hanya berlaku kalau promo LP ini dinyalakan.
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
    setDeadline(firstVisit + (promo.earlyBirdHours || 72) * 60 * 60 * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTiers, promo.earlyBirdHours]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!hasTiers) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasTiers]);

  // Begitu SALAH SATU habis duluan -- slot pembeli pertama terisi penuh, ATAU waktu countdown
  // habis -- harga otomatis & permanen kembali ke harga normal produk (p.price), bukan ke tingkat
  // harga lain. Slot dihitung dari p.sold ASLI (bertambah tiap transaksi sukses beneran, dari
  // seluruh landing page produk ini), jadi begitu 100 orang checkout, slotnya beneran habis untuk
  // semua orang, bukan cuma berkurang tampilan di layar.
  let currentPrice, anchorPrice, disc, tierNote, tierNoteKey, expired, founderSlotsLeft, promoActive, timeLeft, hh, mm, ss;
  if (hasTiers) {
    expired = deadline !== null && now >= deadline;
    timeLeft = deadline ? Math.max(0, Math.floor((deadline - now) / 1000)) : 0;
    hh = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
    mm = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
    ss = String(Math.floor(timeLeft % 60)).padStart(2, "0");
    founderSlotsLeft = Math.max(0, (promo.founderSlots || 0) - (p.sold || 0));
    // Promo aktif HANYA kalau slot masih ada DAN waktunya belum habis -- dua-duanya. Begitu
    // salah satu habis duluan, promoActive langsung false, jadi countdown-nya ikut disembunyikan
    // (bukan cuma teksnya yang berubah tapi timer-nya tetap jalan seolah masih ada promo).
    promoActive = !expired && founderSlotsLeft > 0;
    if (promoActive) {
      currentPrice = promo.founderPrice;
      tierNoteKey = "promoActiveNote";
      tierNote = getExtra("promoActiveNote").replace("{sisa}", founderSlotsLeft).replace("{total}", promo.founderSlots);
    } else {
      currentPrice = p.price;
      tierNoteKey = expired ? "promoExpiredTimeNote" : "promoExpiredSlotNote";
      tierNote = getExtra(tierNoteKey);
    }
    anchorPrice = p.price;
    disc = anchorPrice > currentPrice ? Math.round((1 - currentPrice / anchorPrice) * 100) : 0;
  } else {
    expired = true; // tanpa promo, langsung tampil harga apa adanya
    promoActive = false;
    currentPrice = p.price;
    anchorPrice = p.oldPrice && p.oldPrice > p.price ? p.oldPrice : p.price;
    disc = anchorPrice > currentPrice ? Math.round((1 - currentPrice / anchorPrice) * 100) : 0;
    tierNoteKey = "promoOffNote";
    tierNote = getExtra("promoOffNote");
  }

  const buyNow = () => {
    supabase.rpc("increment_lp_click", { p_slug: lp.slug }).then(() => {}).catch(() => {});
    if (applyPricingAndBuy(p.id, currentPrice, anchorPrice, lp.slug)) go("checkout");
  };

  return (
    <div style={{ background: C.bg, minHeight: "100%" }}>
      {/* Bar mode-edit -- cuma admin yang lihat, tidak pernah tampil ke calon pembeli */}
      {role === "admin" && (
        <div style={{ position: "sticky", top: 0, zIndex: 60, background: "#1a1420", borderBottom: `1px solid ${admin ? C.gold : C.borderSoft}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <button onClick={goToAdmin} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 600, padding: 0 }}>
            <ArrowLeft size={14} />Kembali ke Admin <span style={{ color: C.mutedDark }}>· {lp.name}</span>
          </button>
          <button
            onClick={() => setLpEditMode && setLpEditMode(!lpEditMode)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: admin ? C.gold : "none", border: `1px solid ${admin ? C.gold : C.border}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: admin ? "#161019" : C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12.5 }}
          >
            <Pencil size={13} />{admin ? "Mode Edit: ON" : "Mode Edit"}
          </button>
        </div>
      )}
      {admin && (
        <div style={{ background: `${C.gold}14`, borderBottom: `1px solid ${C.gold}33`, padding: "8px 16px", textAlign: "center" }}>
          <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.goldLight }}>Arahkan kursor ke teks/video mana pun lalu klik ikon pensil ✎ untuk edit langsung di tempat.</span>
        </div>
      )}

      {/* top bar minimal, tanpa menu navigasi supaya fokus konversi */}
      <div style={{ borderBottom: `1px solid ${C.borderSoft}`, padding: "14px 20px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <img src={LOGO_URL} alt="Gitar Sakti" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} />
          <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 19, letterSpacing: 1, color: C.text }}>GITAR SAKTI</span>
        </div>
      </div>

      {/* HERO / VSL */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px 8px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, background: C.surface2, border: `1px solid ${C.gold}55`, color: C.goldLight, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700 }}>
            <Sparkles size={14} />
            <EditableText value={badgeText} admin={admin} onSave={saveCore("badgeText")} tag="span" />
          </span>
        </div>

        <EditableText
          value={headline}
          admin={admin}
          onSave={saveCore("headline")}
          tag="h1"
          block
          style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 34, lineHeight: 1.12, letterSpacing: 0.3, color: C.text, textAlign: "center", margin: "0 0 14px" }}
        />
        <EditableText
          value={subheadline}
          admin={admin}
          onSave={saveCore("subheadline")}
          tag="p"
          area
          block
          style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, color: C.muted, textAlign: "center", maxWidth: 480, margin: "0 auto 26px", lineHeight: 1.65 }}
        />

        <LpVideoEditable url={videoUrl} admin={admin} onSave={saveCore("videoUrl")}>
          {videoUrl ? (
            toEmbedUrl(videoUrl) ? (
              <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 16, overflow: "hidden", border: `1px solid ${C.gold}33`, boxShadow: `0 0 60px ${C.gold}22`, marginBottom: 24, background: `linear-gradient(135deg, ${p.hue}33, ${C.surface2})` }}>
                <iframe
                  key={videoUrl}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                  src={toAutoplayEmbedUrl(videoUrl)}
                  title={`Video preview ${p.name}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              // URL yang dimasukkan bukan link YouTube/Vimeo yang dikenali -> tetap tampilkan
              // sebagai link keluar biasa daripada iframe kosong yang tidak akan pernah autoplay.
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
                    <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted }}>Tonton video preview ↗</span>
                  </div>
                </div>
              </a>
            )
          ) : admin ? (
            <div style={{ borderRadius: 16, border: `1px dashed ${C.border}`, marginBottom: 24, padding: "36px 20px", textAlign: "center", background: C.surface2 }}>
              <PlayCircle size={26} color={C.mutedDark} style={{ marginBottom: 8 }} />
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, margin: 0 }}>Belum ada video preview — klik ikon pensil di kanan atas untuk menambahkan link YouTube/Vimeo.</p>
            </div>
          ) : null}
        </LpVideoEditable>

        <div style={{ textAlign: "center" }}>
          <LpEditableButtonLabel value={getExtra("ctaText")} admin={admin} onSave={saveExtra("ctaText")}>
            <PrimaryBtn onClick={scrollToPricing} icon={ArrowRight}>{getExtra("ctaText")}</PrimaryBtn>
          </LpEditableButtonLabel>
          <div style={{ marginTop: 10 }}>
            <EditableText value={getExtra("heroNote")} admin={admin} onSave={saveExtra("heroNote")} tag="p" style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, margin: 0 }} />
          </div>
        </div>
      </div>

      {/* PROBLEM AGITATION */}
      <div style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <LpTwoToneText value={getExtra("problemTitle")} admin={admin} onSave={saveExtra("problemTitle")} tag="h2" style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, color: C.text, margin: 0 }} />
            <div style={{ marginTop: 8 }}>
              <EditableText value={getExtra("problemSubtitle")} admin={admin} onSave={saveExtra("problemSubtitle")} tag="p" style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, margin: 0 }} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {problemItems.map((item, idx) => (
              <Card key={idx} style={{ padding: 18, position: "relative" }}>
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.ember}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <X size={17} color={C.emberLight} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <EditableText value={item.title} admin={admin} onSave={(v) => updateProblemItem(idx, { title: v })} tag="h3" block style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14.5, color: C.text, margin: "0 0 4px" }} />
                    <EditableText value={item.desc} admin={admin} onSave={(v) => updateProblemItem(idx, { desc: v })} tag="p" area block style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.55 }} />
                  </div>
                  {admin && problemItems.length > 1 && (
                    <button onClick={() => removeProblemItem(idx)} title="Hapus poin ini" style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.mutedDark} /></button>
                  )}
                </div>
              </Card>
            ))}
            {admin && (
              <div><GhostBtn small onClick={addProblemItem} icon={Plus}>Tambah Poin Masalah</GhostBtn></div>
            )}
          </div>
          <div style={{ marginTop: 26, padding: 18, borderRadius: 12, background: `${C.gold}12`, borderLeft: `2px solid ${C.gold}` }}>
            <EditableText
              value={getExtra("quoteText")}
              admin={admin}
              onSave={saveExtra("quoteText")}
              tag="p"
              area
              block
              style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, color: C.text, fontStyle: "italic", margin: 0 }}
            />
          </div>
        </div>
      </div>

      {/* SOLUSI */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: C.gold }}>Perkenalkan</span>
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 28, color: C.text, margin: "8px 0" }}>{p.name}</h2>
          <RichText text={p.desc} style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, maxWidth: 420, margin: "0 auto" }} />
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
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, textAlign: "center", marginBottom: 20 }}>Sekilas tentang kursus ini</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
            {[p.sold > 0 ? [String(p.sold), "Pembeli"] : ["Baru", "Kelas Baru Dibuka"], p.rating > 0 ? [String(p.rating), "Rating Rata-rata"] : [p.level || "Semua Level", "Level"], [p.duration || "-", "Materi"]].map(([n, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, color: C.goldLight }}>{n}</div>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TESTIMONI — ulasan asli dari pembeli yang sudah memiliki produk ini */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
        <div style={{ marginBottom: 26 }}>
          <LpTwoToneText value={getExtra("testimonialTitle")} admin={admin} onSave={saveExtra("testimonialTitle")} tag="h2" style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, color: C.text, textAlign: "center", margin: 0 }} />
        </div>
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
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>{p.name} vs </span>
            <EditableText value={getExtra("comparisonHighlight")} admin={admin} onSave={saveExtra("comparisonHighlight")} tag="span" style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, color: C.goldLight }} />
          </div>
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

      {/* BONUS — bisa lebih dari 1, tiap bonus punya ikon/logo, teks, dan nilai harga sendiri.
          Diisi & dikelola langsung di sini (Mode Edit), lepas dari field "Bonus" produk. */}
      {(bonusItems.length > 0 || admin) ? (
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <Badge tone="gold">BONUS SPESIAL</Badge>
            <div style={{ marginTop: 12 }}>
              <EditableText value={getExtra("bonusHeading")} admin={admin} onSave={saveExtra("bonusHeading")} tag="h2" style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, color: C.text, margin: 0 }} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bonusItems.map((it, idx) => (
              <Card key={idx} style={{ padding: 16, position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {admin ? (
                    <EditableText
                      value={it.icon || "✨"}
                      admin
                      onSave={(v) => updateBonusItem(idx, { icon: (v || "✨").slice(0, 2) })}
                      tag="span"
                      style={{ width: 40, height: 40, borderRadius: 10, background: `${C.gold}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18, lineHeight: "40px", textAlign: "center" }}
                    />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.gold}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
                      {it.icon || "✨"}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <EditableText value={it.title} admin={admin} onSave={(v) => updateBonusItem(idx, { title: v })} tag="div" block style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.text, lineHeight: 1.5 }} />
                    {(it.value || admin) && (
                      <div style={{ marginTop: 4 }}>
                        {admin ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark }}>Nilai:</span>
                            <EditableText value={it.value || ""} admin onSave={(v) => updateBonusItem(idx, { value: v })} tag="span" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.goldLight, textDecoration: "line-through" }} />
                          </span>
                        ) : it.value ? (
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.goldLight, textDecoration: "line-through" }}>Senilai {it.value}</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {admin && bonusItems.length > 0 && (
                    <button onClick={() => removeBonusItem(idx)} title="Hapus bonus ini" style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.mutedDark} /></button>
                  )}
                </div>
              </Card>
            ))}
            {bonusItems.length === 0 && admin && (
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, fontStyle: "italic", textAlign: "center" }}>Belum ada bonus. Tambahkan lewat tombol di bawah.</p>
            )}
            {admin && (
              <div style={{ textAlign: "center" }}><GhostBtn small onClick={addBonusItem} icon={Plus}>Tambah Bonus</GhostBtn></div>
            )}
          </div>
          {bonusValueTotal > 0 && (
            <div style={{ marginTop: 18, textAlign: "center" }}>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted }}>Total nilai bonus: </span>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.goldLight }}>{rp(bonusValueTotal)}</span>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted }}> — GRATIS kalau kamu ikut sekarang</span>
            </div>
          )}
        </div>
      ) : null}

      {/* PRICING / CTA */}
      <div id="lp-pricing" style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "44px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            {admin ? (
              <LpTemplateBadge
                displayValue={tierNote}
                rawValue={getExtra(tierNoteKey)}
                onSave={saveExtra(tierNoteKey)}
                admin={admin}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, background: `${C.ember}18`, border: `1px solid ${C.ember}55`, color: C.emberLight, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700 }}
              />
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, background: `${C.ember}18`, border: `1px solid ${C.ember}55`, color: C.emberLight, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700 }}>
                {tierNote}
              </span>
            )}
            {admin && (
              <div style={{ marginTop: 8 }}>
                <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 10.5, color: C.mutedDark, fontStyle: "italic" }}>
                  Klik pensil di atas untuk edit kalimat ini — kata "Pendiri" cuma istilah pemasaran untuk "pembeli pertama", boleh diganti bebas. Pakai {"{sisa}"} & {"{total}"} kalau mau tetap otomatis menampilkan sisa slot.
                </span>
              </div>
            )}
          </div>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "26px 24px", textAlign: "center", borderBottom: `1px solid ${C.border}` }}>
              {hasTiers && promoActive ? (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <EditableText value={getExtra("promoCountdownLabel")} admin={admin} onSave={saveExtra("promoCountdownLabel")} tag="p" style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, margin: 0 }} />
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 24, color: C.emberLight, marginBottom: 16 }}>{hh} : {mm} : {ss}</div>
                </>
              ) : hasTiers ? (
                <div style={{ marginBottom: 16 }}>
                  <EditableText value={getExtra("promoEndedLabel")} admin={admin} onSave={saveExtra("promoEndedLabel")} tag="p" style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, margin: 0 }} />
                </div>
              ) : null}
              <EditableText
                value={getExtra(promoActive ? "promoActivePriceLabel" : "promoNormalPriceLabel")}
                admin={admin}
                onSave={saveExtra(promoActive ? "promoActivePriceLabel" : "promoNormalPriceLabel")}
                tag="span"
                style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}
              />
              {disc > 0 && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 20, color: C.mutedDark, textDecoration: "line-through" }}>{rp(anchorPrice)}</span>
                </div>
              )}
              <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 42, color: C.goldLight, margin: "6px 0" }}>{rp(currentPrice)}</div>
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
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}>
                  <ShieldCheck size={13} color={C.gold} /> <EditableText value={getExtra("trustBadge1")} admin={admin} onSave={saveExtra("trustBadge1")} tag="span" />
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}>
                  <Clock size={13} color={C.gold} /> <EditableText value={getExtra("trustBadge2")} admin={admin} onSave={saveExtra("trustBadge2")} tag="span" />
                </span>
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
        <div style={{ marginBottom: 22 }}>
          <LpTwoToneText value={getExtra("faqTitle")} admin={admin} onSave={saveExtra("faqTitle")} tag="h2" style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, color: C.text, textAlign: "center", margin: 0 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {admin ? (
            faqItems.map((f, i) => (
              <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", position: "relative", background: C.surface }}>
                <EditableText value={f.q} admin onSave={(v) => updateFaqItem(i, { q: v })} tag="div" block style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 6, paddingRight: 24 }} />
                <EditableText value={f.a} admin onSave={(v) => updateFaqItem(i, { a: v })} tag="p" area block style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, lineHeight: 1.6, margin: 0, paddingRight: 24 }} />
                {faqItems.length > 1 && (
                  <button onClick={() => removeFaqItem(i)} title="Hapus pertanyaan ini" style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color={C.mutedDark} /></button>
                )}
              </div>
            ))
          ) : (
            faqItems.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)
          )}
          {admin && (
            <div><GhostBtn small onClick={addFaqItem} icon={Plus}>Tambah Pertanyaan</GhostBtn></div>
          )}
        </div>
      </div>

      {/* CTA PENUTUP */}
      <div style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.surface, padding: "44px 20px 20px", textAlign: "center" }}>
        <LpTwoToneText value={getExtra("closingTitle")} admin={admin} onSave={saveExtra("closingTitle")} tag="h2" style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, color: C.text, margin: "0 0 12px" }} />
        <div style={{ maxWidth: 380, margin: "0 auto 22px" }}>
          <EditableText value={getExtra("closingSubtitle")} admin={admin} onSave={saveExtra("closingSubtitle")} tag="p" area block style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, lineHeight: 1.6, margin: 0 }} />
        </div>
        <LpEditableButtonLabel value={getExtra("closingCtaText")} admin={admin} onSave={saveExtra("closingCtaText")}>
          <PrimaryBtn onClick={scrollToPricing} icon={ArrowRight}>{getExtra("closingCtaText")}</PrimaryBtn>
        </LpEditableButtonLabel>
        <div style={{ marginTop: 14 }}>
          <EditableText value={getExtra("closingFooterNote")} admin={admin} onSave={saveExtra("closingFooterNote")} tag="p" style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, margin: 0 }} />
        </div>
      </div>

      <div style={{ padding: "20px 20px 40px", textAlign: "center" }}>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, margin: 0 }}>© 2026 {p.name} × Gitar Sakti. Seluruh hak cipta dilindungi.</p>
      </div>
    </div>
  );
}


/* ---------------- LANDING PAGE — TEMPLATE 2 "VIOLET" (gelap, gaya VSL, aksen ungu) ---------------- */
// Dipilih per-landing-page lewat Pengaturan Landing Page > Tampilan (disimpan di extra.template).
// Logika harga/promo/countdown SAMA dengan template klasik (jujur: slot dari penjualan asli,
// countdown dari kunjungan pertama) -- yang beda hanya tampilan & beberapa bagian baru.
const LP_TEMPLATES = [
  { key: "gold", label: "Klasik — tema Gitar Sakti (emas)" },
  { key: "violet", label: "Violet — gelap gaya VSL (ungu)" },
];

const V = { bg: "#0a0a0f", card: "#12121a", border: "#1f1f2e", muted: "#6b6b80", accent: "#a855f7", accentLight: "#c084fc", accentDark: "#7c3aed", green: "#4ade80", red: "#f87171" };
const V_DISPLAY = "'Space Grotesk',sans-serif";
const V_BODY = "'Inter',sans-serif";

const V_PATH = {
  bolt: "M13 10V3L4 14h7v7l9-11h-7z",
  music: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3",
  flask: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
  x: "M6 18L18 6M6 6l12 12",
  check: "M5 13l4 4L19 7",
  warn: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  chevron: "M19 9l-7 7-7-7",
};
const V_STAR = "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";
const V_FEATURE_ICONS = [V_PATH.bolt, V_PATH.music, V_PATH.flask];

const V_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
.lp2-root { background-color:#0a0a0f; background-image: radial-gradient(circle at 20% 50%, rgba(168,85,247,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.05) 0%, transparent 40%), radial-gradient(circle at 40% 80%, rgba(192,132,252,0.05) 0%, transparent 40%); color:#fff; font-family:'Inter',sans-serif; overflow-x:hidden; min-height:100%; -webkit-font-smoothing:antialiased; }
.lp2-root *, .lp2-root *::before, .lp2-root *::after { box-sizing:border-box; }
.lp2-gradient-text { background: linear-gradient(135deg,#a855f7 0%,#e879f9 50%,#a855f7 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.lp2-glow-violet { box-shadow: 0 0 60px rgba(168,85,247,.3), 0 0 100px rgba(168,85,247,.1); }
.lp2-glow-btn { box-shadow: 0 4px 30px rgba(168,85,247,.4), 0 0 60px rgba(168,85,247,.2); }
.lp2-card-glow { box-shadow: 0 4px 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05); }
.lp2-video { background: linear-gradient(145deg,#12121a 0%,#0a0a0f 100%); border:1px solid rgba(168,85,247,.2); }
.lp2-lines { background-image: repeating-linear-gradient(90deg, rgba(168,85,247,.03) 0px, rgba(168,85,247,.03) 1px, transparent 1px, transparent 60px); }
.lp2-btn { background: linear-gradient(135deg,#a855f7 0%,#9333ea 100%); color:#fff; border:none; cursor:pointer; text-decoration:none; transition: transform .2s ease, box-shadow .2s ease; }
.lp2-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 40px rgba(168,85,247,.5); }
.lp2-btn:active { transform: translateY(0); }
.lp2-strike { position:relative; display:inline-block; }
.lp2-strike::after { content:''; position:absolute; left:0; top:50%; width:100%; height:2px; background:#ef4444; transform:rotate(-8deg); }
.lp2-fade { opacity:0; transform: translateY(30px); transition: opacity .6s ease, transform .6s ease; }
.lp2-fade.lp2-in { opacity:1; transform:none; }
.lp2-pulse { animation: lp2Pulse 3s ease-in-out infinite; }
@keyframes lp2Pulse { 0%,100% { opacity:1; } 50% { opacity:.7; } }
.lp2-bonus { background:#12121a; border:1px solid #1f1f2e; border-left:2px solid transparent; border-radius:12px; overflow:hidden; position:relative; transition: border-color .3s ease, background .3s ease, transform .3s ease; }
.lp2-bonus:hover { border-left-color:#a855f7; background: rgba(168,85,247,.05); transform: translateX(4px); }
.lp2-bonus-img { transition: transform .3s ease; }
.lp2-bonus:hover .lp2-bonus-img { transform: scale(1.05); }
.lp2-bonus-flex { display:flex; flex-direction:column; }
.lp2-bonus-thumb { width:100%; height:160px; flex-shrink:0; overflow:hidden; }
.lp2-sep { display:none; width:1px; height:48px; background:#1f1f2e; }
@media (min-width:640px) {
  .lp2-bonus-flex { flex-direction:row; }
  .lp2-bonus-thumb { width:128px; height:96px; }
  .lp2-sep { display:block; }
}
.lp2-root button:focus-visible, .lp2-root a:focus-visible { outline:2px solid #a855f7; outline-offset:2px; }
@media (prefers-reduced-motion: reduce) {
  .lp2-fade { opacity:1; transform:none; transition:none; }
  .lp2-pulse { animation:none; }
  .lp2-btn { transition:none; }
  .lp2-bonus, .lp2-bonus-img { transition:none; }
}
`;

function Lp2Icon({ d, size = 20, color = "currentColor", sw = 2, style }) {
  return (
    <svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24" style={{ flexShrink: 0, ...style }} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d={d} />
    </svg>
  );
}
function Lp2Stars({ rating = 5, size = 20 }) {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" fill={i <= n ? "#facc15" : "#2a2a3a"} aria-hidden="true"><path d={V_STAR} /></svg>
      ))}
    </div>
  );
}
function Lp2Fade({ children, style, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} className={`lp2-fade${visible ? " lp2-in" : ""}`} style={{ transitionDelay: `${delay}s`, ...style }}>{children}</div>;
}
function Lp2Section({ children, bg, maxWidth = 672, pad = "64px 16px", id, style }) {
  return (
    <section id={id} style={{ width: "100%", padding: pad, background: bg, ...style }}>
      <div style={{ width: "100%", maxWidth, margin: "0 auto" }}>{children}</div>
    </section>
  );
}
function Lp2AddBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${V.accent}88`, borderRadius: 8, padding: "8px 14px", color: V.accentLight, fontFamily: V_BODY, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
      <Plus size={14} />{children}
    </button>
  );
}
function Lp2DelBtn({ onClick, title }) {
  return (
    <button onClick={onClick} title={title} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", zIndex: 3 }}><Trash2 size={14} color={V.muted} /></button>
  );
}

const LP2_DEFAULTS = {
  ...LP_EXTRA_DEFAULTS,
  proofCaption: "Sekilas tentang kursus ini",
  faqSubtitle: "Pertanyaan yang sering muncul dari calon member",
  mainSubtitle: "Video pembelajaran lengkap",
};

function LandingPageTemplateViolet(props) {
  const { lp, products } = props;
  const p = products.find((x) => x.id === lp?.productId);
  if (!lp || !p) {
    return (
      <div className="lp2-root" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
        <style>{V_CSS}</style>
        <p style={{ fontFamily: V_BODY, fontSize: 14, color: V.muted }}>Landing page tidak ditemukan, atau produknya sudah tidak tersedia.</p>
      </div>
    );
  }
  return <LpVioletBody {...props} p={p} />;
}

function LpVioletBody({ lp, p, go, applyPricingAndBuy, testimonials, ownedIds, pendingIds, role, lpEditMode, setLpEditMode, onSaveLp, goToAdmin }) {
  // --- Promo harga bertingkat: logika identik dengan template klasik ---
  const legacyTiers = p.pricingTiers || null;
  const promo = lp.extra?.promo || (legacyTiers
    ? { enabled: true, founderPrice: legacyTiers.founderPrice, founderSlots: legacyTiers.founderSlots, earlyBirdHours: legacyTiers.earlyBirdHours }
    : { enabled: false, founderPrice: p.price, founderSlots: 100, earlyBirdHours: 72 });
  const hasTiers = !!promo.enabled;
  const owned = ownedIds?.includes(p.id);
  const pending = pendingIds?.includes(p.id);
  const realReviews = testimonials?.[p.id] || [];
  const headline = lp.headline || p.name;
  const subheadline = lp.subheadline || p.desc;
  const badgeText = lp.badgeText || "Metode Latihan Yang Sudah Teruji";
  const videoUrl = lp.videoUrl || "";

  const admin = role === "admin" && !!lpEditMode;
  const extra = lp.extra || {};
  const getExtra = (key) => (extra[key] !== undefined && extra[key] !== null ? extra[key] : LP2_DEFAULTS[key]);
  const saveCore = (field) => (value) => onSaveLp && onSaveLp(lp.id, { [field]: value });
  const saveExtra = (field) => (value) => onSaveLp && onSaveLp(lp.id, { extra: { ...extra, [field]: value } });

  // Daftar-daftar yang bisa ditambah/hapus/diedit langsung di halaman
  const problemItems = getExtra("problems") || [];
  const updateProblemItem = (idx, patch) => saveExtra("problems")(problemItems.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addProblemItem = () => saveExtra("problems")([...problemItems, { title: "Masalah Baru", desc: "Jelaskan masalah yang sering dialami calon pembeli di sini." }]);
  const removeProblemItem = (idx) => saveExtra("problems")(problemItems.filter((_, i) => i !== idx));

  const featureItems = extra.features !== undefined ? (extra.features || []) : (p.learn || []).map((t) => ({ title: t, desc: "" }));
  const updateFeature = (idx, patch) => saveExtra("features")(featureItems.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addFeature = () => saveExtra("features")([...featureItems, { title: "Poin materi baru", desc: "Jelaskan apa yang dipelajari di poin ini." }]);
  const removeFeature = (idx) => saveExtra("features")(featureItems.filter((_, i) => i !== idx));

  const statItems = extra.stats !== undefined && extra.stats !== null ? extra.stats : [
    p.sold > 0 ? { num: String(p.sold), label: "Pembeli" } : { num: "Baru", label: "Kelas Baru Dibuka" },
    p.rating > 0 ? { num: String(p.rating), label: "Rating Rata-rata" } : { num: p.level || "Semua Level", label: "Level" },
    { num: p.duration || "-", label: "Materi" },
  ];
  const updateStat = (idx, patch) => saveExtra("stats")(statItems.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const manualTestis = extra.manualTestimonials || [];
  const updateManualTesti = (idx, patch) => saveExtra("manualTestimonials")(manualTestis.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addManualTesti = () => saveExtra("manualTestimonials")([...manualTestis, { name: "Nama Siswa", role: "Keterangan (mis. Mahasiswa, Bandung)", quote: "Tulis testimoni asli dari siswa di sini.", rating: 5 }]);
  const removeManualTesti = (idx) => saveExtra("manualTestimonials")(manualTestis.filter((_, i) => i !== idx));
  const allTestis = [
    ...manualTestis.map((t, i) => ({ ...t, _manual: true, _idx: i })),
    ...realReviews.map((t) => ({ name: t.name, role: t.date, quote: t.quote, rating: t.rating })),
  ];

  const comparisonRows = extra.comparison !== undefined && extra.comparison !== null ? extra.comparison : LP_COMPARISON.map((r) => ({ label: r.label, other: r.other }));
  const updateCompRow = (idx, patch) => saveExtra("comparison")(comparisonRows.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addCompRow = () => saveExtra("comparison")([...comparisonRows, { label: "Poin perbandingan baru", other: false }]);
  const removeCompRow = (idx) => saveExtra("comparison")(comparisonRows.filter((_, i) => i !== idx));

  const faqItems = getExtra("faq") || [];
  const updateFaqItem = (idx, patch) => saveExtra("faq")(faqItems.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addFaqItem = () => saveExtra("faq")([...faqItems, { q: "Pertanyaan baru?", a: "Jawaban untuk pertanyaan ini." }]);
  const removeFaqItem = (idx) => saveExtra("faq")(faqItems.filter((_, i) => i !== idx));

  const bonusItems = extra.bonusItems !== undefined ? (extra.bonusItems || []) : (p.bonus ? [{ icon: "✨", title: p.bonus, value: "" }] : []);
  const updateBonusItem = (idx, patch) => saveExtra("bonusItems")(bonusItems.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addBonusItem = () => saveExtra("bonusItems")([...bonusItems, { icon: "✨", title: "Bonus baru", subtitle: "BONUS - keterangan singkat", value: "", image: "" }]);
  const removeBonusItem = (idx) => saveExtra("bonusItems")(bonusItems.filter((_, i) => i !== idx));
  const bonusValueTotal = bonusItems.reduce((sum, it) => {
    const n = parseInt(String(it.value || "").replace(/[^0-9]/g, ""), 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  const [openFaq, setOpenFaq] = useState(-1);

  useEffect(() => {
    supabase.rpc("increment_lp_visit", { p_slug: lp.slug }).then(() => {}).catch(() => {});
    trackEvent("ViewContent", { content_ids: [String(p.id)], content_name: p.name, content_type: "product", value: p.price, currency: "IDR" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lp.slug]);

  const scrollToPricing = () => {
    document.getElementById("lp-pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Countdown JUJUR: dihitung dari kunjungan PERTAMA pengunjung, disimpan di localStorage.
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
      firstVisit = Date.now();
    }
    setDeadline(firstVisit + (promo.earlyBirdHours || 72) * 60 * 60 * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTiers, promo.earlyBirdHours]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!hasTiers) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasTiers]);

  // Promo aktif HANYA kalau slot masih ada DAN waktu belum habis; slot dihitung dari penjualan asli (p.sold).
  let currentPrice, anchorPrice, disc, tierNote, tierNoteKey, expired, founderSlotsLeft, promoActive, timeLeft, hh, mm, ss;
  if (hasTiers) {
    expired = deadline !== null && now >= deadline;
    timeLeft = deadline ? Math.max(0, Math.floor((deadline - now) / 1000)) : 0;
    hh = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
    mm = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
    ss = String(Math.floor(timeLeft % 60)).padStart(2, "0");
    founderSlotsLeft = Math.max(0, (promo.founderSlots || 0) - (p.sold || 0));
    promoActive = !expired && founderSlotsLeft > 0;
    if (promoActive) {
      currentPrice = promo.founderPrice;
      tierNoteKey = "promoActiveNote";
      tierNote = getExtra("promoActiveNote").replace("{sisa}", founderSlotsLeft).replace("{total}", promo.founderSlots);
    } else {
      currentPrice = p.price;
      tierNoteKey = expired ? "promoExpiredTimeNote" : "promoExpiredSlotNote";
      tierNote = getExtra(tierNoteKey);
    }
    anchorPrice = p.price;
    disc = anchorPrice > currentPrice ? Math.round((1 - currentPrice / anchorPrice) * 100) : 0;
  } else {
    expired = true;
    promoActive = false;
    currentPrice = p.price;
    anchorPrice = p.oldPrice && p.oldPrice > p.price ? p.oldPrice : p.price;
    disc = anchorPrice > currentPrice ? Math.round((1 - currentPrice / anchorPrice) * 100) : 0;
    tierNoteKey = "promoOffNote";
    tierNote = getExtra("promoOffNote");
  }

  const buyNow = () => {
    supabase.rpc("increment_lp_click", { p_slug: lp.slug }).then(() => {}).catch(() => {});
    if (applyPricingAndBuy(p.id, currentPrice, anchorPrice, lp.slug)) go("checkout");
  };

  const descPlain = String(p.desc || "").replace(/\*\*/g, "").replace(/^##\s+/gm, "").replace(/^\*\s+/gm, "• ");
  const twoToneAccent = { accentStyle: { color: V.accent } };
  const twoToneGradient = { accentClass: "lp2-gradient-text", accentStyle: {} };
  const h2Style = { fontFamily: V_DISPLAY, fontWeight: 700, fontSize: "clamp(24px, 2vw + 16px, 30px)", color: "#fff", margin: 0, lineHeight: 1.25, textAlign: "center" };
  const btnStyle = { display: "inline-block", padding: "16px 40px", borderRadius: 12, fontFamily: V_DISPLAY, fontWeight: 600, fontSize: 18 };
  const mainValueText = rp(anchorPrice);

  return (
    <div className="lp2-root">
      <style>{V_CSS}</style>

      {/* Bar mode-edit -- cuma admin yang lihat */}
      {role === "admin" && (
        <div style={{ position: "sticky", top: 0, zIndex: 60, background: "#1a1420", borderBottom: `1px solid ${admin ? V.accent : V.border}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <button onClick={goToAdmin} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#a1a1b5", fontFamily: V_BODY, fontSize: 12.5, fontWeight: 600, padding: 0 }}>
            <ArrowLeft size={14} />Kembali ke Admin <span style={{ color: V.muted }}>· {lp.name}</span>
          </button>
          <button
            onClick={() => setLpEditMode && setLpEditMode(!lpEditMode)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: admin ? V.accent : "none", border: `1px solid ${admin ? V.accent : V.border}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: "#fff", fontFamily: V_BODY, fontWeight: 700, fontSize: 12.5 }}
          >
            <Pencil size={13} />{admin ? "Mode Edit: ON" : "Mode Edit"}
          </button>
        </div>
      )}
      {admin && (
        <div style={{ background: `${V.accent}1f`, borderBottom: `1px solid ${V.accent}44`, padding: "8px 16px", textAlign: "center" }}>
          <span style={{ fontFamily: V_BODY, fontSize: 11.5, color: V.accentLight }}>Arahkan kursor ke teks/video mana pun lalu klik ikon pensil ✎ untuk edit langsung di tempat.</span>
        </div>
      )}

      {/* HERO / VSL */}
      <section className="lp2-lines" style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 16px" }}>
        <div style={{ width: "100%", maxWidth: 672, margin: "0 auto" }}>
          <Lp2Fade style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, background: `${V.accent}1a`, border: `1px solid ${V.accent}4d`, color: V.accent, fontFamily: V_BODY, fontSize: 14, fontWeight: 500 }}>
              <Lp2Icon d={V_PATH.bolt} size={16} />
              <EditableText value={badgeText} admin={admin} onSave={saveCore("badgeText")} tag="span" />
            </span>
          </Lp2Fade>

          <Lp2Fade>
            <LpTwoToneText
              value={headline}
              admin={admin}
              onSave={saveCore("headline")}
              tag="h1"
              breakLine
              {...twoToneGradient}
              style={{ fontFamily: V_DISPLAY, fontWeight: 700, fontSize: "clamp(30px, 4.5vw + 8px, 48px)", lineHeight: 1.25, textAlign: "center", color: "#fff", margin: "0 0 16px" }}
            />
          </Lp2Fade>
          <Lp2Fade>
            <EditableText
              value={subheadline}
              admin={admin}
              onSave={saveCore("subheadline")}
              tag="p"
              area
              block
              style={{ fontFamily: V_BODY, fontSize: 18, color: V.muted, textAlign: "center", maxWidth: 576, margin: "0 auto 32px", lineHeight: 1.6 }}
            />
          </Lp2Fade>

          <Lp2Fade>
            <LpVideoEditable url={videoUrl} admin={admin} onSave={saveCore("videoUrl")}>
              {videoUrl ? (
                toEmbedUrl(videoUrl) ? (
                  <div className="lp2-video lp2-glow-violet" style={{ position: "relative", paddingTop: "56.25%", borderRadius: 16, overflow: "hidden", marginBottom: 32 }}>
                    <iframe
                      key={videoUrl}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                      src={toEmbedUrl(videoUrl)}
                      title={`Video preview ${p.name}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="lp2-video lp2-glow-violet" style={{ display: "block", textDecoration: "none", borderRadius: 16, overflow: "hidden", marginBottom: 32 }}>
                    <div style={{ position: "relative", paddingTop: "56.25%" }}>
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                        <div style={{ width: 60, height: 60, borderRadius: "50%", border: `2px solid ${V.accentLight}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <PlayCircle size={30} color={V.accentLight} strokeWidth={1.2} />
                        </div>
                        <span style={{ fontFamily: V_BODY, fontSize: 12.5, color: V.muted }}>Tonton video preview ↗</span>
                      </div>
                    </div>
                  </a>
                )
              ) : admin ? (
                <div style={{ borderRadius: 16, border: `1px dashed ${V.border}`, marginBottom: 32, padding: "36px 20px", textAlign: "center", background: V.card }}>
                  <PlayCircle size={26} color={V.muted} style={{ marginBottom: 8 }} />
                  <p style={{ fontFamily: V_BODY, fontSize: 12.5, color: V.muted, margin: 0 }}>Belum ada video preview — klik ikon pensil di kanan atas untuk menambahkan link YouTube/Vimeo.</p>
                </div>
              ) : null}
            </LpVideoEditable>
          </Lp2Fade>

          <Lp2Fade style={{ textAlign: "center" }}>
            <LpEditableButtonLabel value={getExtra("ctaText")} admin={admin} onSave={saveExtra("ctaText")}>
              <button className="lp2-btn lp2-glow-btn" onClick={scrollToPricing} style={btnStyle}>{getExtra("ctaText")}</button>
            </LpEditableButtonLabel>
            <div style={{ marginTop: 12 }}>
              <EditableText value={getExtra("heroNote")} admin={admin} onSave={saveExtra("heroNote")} tag="p" style={{ fontFamily: V_BODY, fontSize: 14, color: V.muted, margin: 0 }} />
            </div>
          </Lp2Fade>
        </div>
      </section>

      {/* PROBLEM AGITATION */}
      <Lp2Section bg="rgba(18,18,26,0.5)">
        <Lp2Fade style={{ textAlign: "center", marginBottom: 48 }}>
          <LpTwoToneText value={getExtra("problemTitle")} admin={admin} onSave={saveExtra("problemTitle")} tag="h2" {...twoToneAccent} style={{ ...h2Style, marginBottom: 16 }} />
          <EditableText value={getExtra("problemSubtitle")} admin={admin} onSave={saveExtra("problemSubtitle")} tag="p" style={{ fontFamily: V_BODY, fontSize: 16, color: V.muted, margin: 0 }} />
        </Lp2Fade>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {problemItems.map((item, idx) => (
            <Lp2Fade key={idx}>
              <div style={{ position: "relative", background: "rgba(10,10,15,0.8)", borderRadius: 12, padding: 24, border: `1px solid ${V.border}`, display: "flex", gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Lp2Icon d={V_PATH.x} size={20} color="#f87171" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <EditableText value={item.title} admin={admin} onSave={(v) => updateProblemItem(idx, { title: v })} tag="h3" block style={{ fontFamily: V_BODY, fontWeight: 600, fontSize: 16, color: "#fff", margin: "0 0 4px" }} />
                  <EditableText value={item.desc} admin={admin} onSave={(v) => updateProblemItem(idx, { desc: v })} tag="p" area block style={{ fontFamily: V_BODY, fontSize: 14, color: V.muted, margin: 0, lineHeight: 1.6 }} />
                </div>
                {admin && problemItems.length > 1 && <Lp2DelBtn onClick={() => removeProblemItem(idx)} title="Hapus poin ini" />}
              </div>
            </Lp2Fade>
          ))}
          {admin && <div><Lp2AddBtn onClick={addProblemItem}>Tambah Poin Masalah</Lp2AddBtn></div>}
        </div>
        <Lp2Fade style={{ marginTop: 40 }}>
          <div style={{ padding: 24, borderRadius: 12, background: `linear-gradient(to right, ${V.accent}1a, transparent)`, borderLeft: `2px solid ${V.accent}` }}>
            <EditableText value={getExtra("quoteText")} admin={admin} onSave={saveExtra("quoteText")} tag="p" area block style={{ fontFamily: V_BODY, fontSize: 18, color: "#fff", fontStyle: "italic", margin: 0, lineHeight: 1.6 }} />
          </div>
        </Lp2Fade>
      </Lp2Section>

      {/* SOLUSI */}
      <Lp2Section>
        <Lp2Fade style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ fontFamily: V_BODY, fontSize: 14, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: V.accent }}>Perkenalkan</span>
          <h2 style={{ fontFamily: V_DISPLAY, fontWeight: 700, fontSize: "clamp(30px, 3vw + 18px, 36px)", color: "#fff", margin: "8px 0 16px", lineHeight: 1.2 }}>{p.name}</h2>
          {descPlain && <p style={{ fontFamily: V_BODY, fontSize: 16, color: V.muted, maxWidth: 512, margin: "0 auto", lineHeight: 1.6, whiteSpace: "pre-line" }}>{descPlain}</p>}
        </Lp2Fade>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {featureItems.map((f, idx) => (
            <Lp2Fade key={idx}>
              <div className="lp2-card-glow" style={{ position: "relative", background: V.card, borderRadius: 12, padding: 24, border: `1px solid ${V.border}`, display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${V.accent}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Lp2Icon d={V_FEATURE_ICONS[idx % V_FEATURE_ICONS.length]} size={24} color={V.accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <EditableText value={f.title} admin={admin} onSave={(v) => updateFeature(idx, { title: v })} tag="h3" block style={{ fontFamily: V_BODY, fontWeight: 600, fontSize: 18, color: "#fff", margin: "0 0 4px" }} />
                  {(f.desc || admin) && (
                    <EditableText value={f.desc || ""} admin={admin} onSave={(v) => updateFeature(idx, { desc: v })} tag="p" area block style={{ fontFamily: V_BODY, fontSize: 14, color: V.muted, margin: 0, lineHeight: 1.6 }} />
                  )}
                </div>
                {admin && <Lp2DelBtn onClick={() => removeFeature(idx)} title="Hapus poin ini" />}
              </div>
            </Lp2Fade>
          ))}
          {admin && <div><Lp2AddBtn onClick={addFeature}>Tambah Poin Materi</Lp2AddBtn></div>}
        </div>
      </Lp2Section>

      {/* SOCIAL PROOF */}
      <Lp2Section bg="rgba(18,18,26,0.3)" pad="48px 16px">
        <Lp2Fade style={{ textAlign: "center", marginBottom: 32 }}>
          <EditableText value={getExtra("proofCaption")} admin={admin} onSave={saveExtra("proofCaption")} tag="p" style={{ fontFamily: V_BODY, fontSize: 14, color: V.muted, margin: 0 }} />
        </Lp2Fade>
        <Lp2Fade style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 32 }}>
          {statItems.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="lp2-sep" />}
              <div style={{ textAlign: "center" }}>
                <EditableText value={s.num} admin={admin} onSave={(v) => updateStat(i, { num: v })} tag="div" block style={{ fontFamily: V_DISPLAY, fontWeight: 700, fontSize: 30 }} />
                <EditableText value={s.label} admin={admin} onSave={(v) => updateStat(i, { label: v })} tag="div" block style={{ fontFamily: V_BODY, fontSize: 14, color: V.muted }} />
              </div>
            </React.Fragment>
          ))}
        </Lp2Fade>
      </Lp2Section>

      {/* TESTIMONI — ulasan asli pembeli + testimoni yang kamu tambah manual di Mode Edit */}
      {(allTestis.length > 0 || admin) && (
        <Lp2Section>
          <Lp2Fade style={{ textAlign: "center", marginBottom: 48 }}>
            <LpTwoToneText value={getExtra("testimonialTitle")} admin={admin} onSave={saveExtra("testimonialTitle")} tag="h2" {...twoToneGradient} style={h2Style} />
          </Lp2Fade>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {allTestis.map((t, i) => (
              <Lp2Fade key={i}>
                <div style={{ position: "relative", background: V.card, borderRadius: 16, padding: 24, border: `1px solid ${V.border}` }}>
                  <Lp2Stars rating={t.rating ?? 5} />
                  {t._manual ? (
                    <EditableText value={t.quote} admin={admin} onSave={(v) => updateManualTesti(t._idx, { quote: v })} tag="p" area block style={{ fontFamily: V_BODY, fontSize: 16, color: "rgba(255,255,255,0.9)", fontStyle: "italic", margin: "0 0 16px", lineHeight: 1.6 }} />
                  ) : (
                    <p style={{ fontFamily: V_BODY, fontSize: 16, color: "rgba(255,255,255,0.9)", fontStyle: "italic", margin: "0 0 16px", lineHeight: 1.6 }}>"{t.quote}"</p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${V.accent}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: V_BODY, fontWeight: 600, color: V.accent }}>{String(t.name || "?").trim().charAt(0).toUpperCase()}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      {t._manual ? (
                        <>
                          <EditableText value={t.name} admin={admin} onSave={(v) => updateManualTesti(t._idx, { name: v })} tag="div" block style={{ fontFamily: V_BODY, fontWeight: 600, fontSize: 14, color: "#fff" }} />
                          <EditableText value={t.role || ""} admin={admin} onSave={(v) => updateManualTesti(t._idx, { role: v })} tag="div" block style={{ fontFamily: V_BODY, fontSize: 12, color: V.muted }} />
                        </>
                      ) : (
                        <>
                          <div style={{ fontFamily: V_BODY, fontWeight: 600, fontSize: 14, color: "#fff" }}>{t.name}</div>
                          {t.role && <div style={{ fontFamily: V_BODY, fontSize: 12, color: V.muted }}>{t.role}</div>}
                        </>
                      )}
                    </div>
                  </div>
                  {admin && t._manual && <Lp2DelBtn onClick={() => removeManualTesti(t._idx)} title="Hapus testimoni ini" />}
                </div>
              </Lp2Fade>
            ))}
            {admin && (
              <div>
                <Lp2AddBtn onClick={addManualTesti}>Tambah Testimoni</Lp2AddBtn>
                <p style={{ fontFamily: V_BODY, fontSize: 11.5, color: V.muted, margin: "8px 0 0", lineHeight: 1.5 }}>Isi dengan testimoni asli dari siswa kamu. Ulasan dari pembeli di website ini otomatis tampil juga di sini.</p>
              </div>
            )}
          </div>
        </Lp2Section>
      )}

      {/* PERBANDINGAN */}
      <Lp2Section bg="rgba(18,18,26,0.3)">
        <Lp2Fade style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={h2Style}>{p.name} vs <EditableText value={getExtra("comparisonHighlight")} admin={admin} onSave={saveExtra("comparisonHighlight")} tag="span" style={{ color: V.accent }} /></h2>
        </Lp2Fade>
        <Lp2Fade>
          <div style={{ overflow: "auto", borderRadius: 16, border: `1px solid ${V.border}` }}>
            <table style={{ width: "100%", minWidth: 360, borderCollapse: "collapse", fontFamily: V_BODY }}>
              <thead>
                <tr style={{ background: V.card }}>
                  <th style={{ textAlign: "left", padding: 16, fontWeight: 600, color: V.muted, fontSize: 16 }}>Perbandingan</th>
                  <th style={{ textAlign: "center", padding: 16, fontWeight: 600, color: V.accent, fontSize: 16 }}>{p.name}</th>
                  <th style={{ textAlign: "center", padding: 16, fontWeight: 600, color: V.muted, fontSize: 16 }}>{getExtra("comparisonHighlight")}</th>
                </tr>
              </thead>
              <tbody style={{ background: "rgba(10,10,15,0.5)" }}>
                {comparisonRows.map((row, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${V.border}` }}>
                    <td style={{ padding: 16, fontSize: 14, color: "#fff" }}>
                      <EditableText value={row.label} admin={admin} onSave={(v) => updateCompRow(i, { label: v })} tag="span" />
                      {admin && comparisonRows.length > 1 && (
                        <button onClick={() => removeCompRow(i)} title="Hapus baris ini" style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 8, verticalAlign: "middle" }}><Trash2 size={13} color={V.muted} /></button>
                      )}
                    </td>
                    <td style={{ padding: 16, textAlign: "center" }}>
                      <span style={{ display: "inline-flex", width: 24, height: 24, borderRadius: "50%", background: "rgba(34,197,94,0.2)", color: V.green, alignItems: "center", justifyContent: "center" }}><Lp2Icon d={V_PATH.check} size={16} /></span>
                    </td>
                    <td style={{ padding: 16, textAlign: "center" }}>
                      <button
                        onClick={admin ? () => updateCompRow(i, { other: row.other === "partial" ? false : "partial" }) : undefined}
                        title={admin ? "Klik untuk ganti: ✕ / ~" : undefined}
                        style={{ background: "none", border: "none", padding: 0, cursor: admin ? "pointer" : "default" }}
                      >
                        {row.other === "partial" ? (
                          <span style={{ display: "inline-flex", width: 24, height: 24, borderRadius: "50%", background: "rgba(234,179,8,0.2)", color: "#facc15", alignItems: "center", justifyContent: "center", fontSize: 14 }}>~</span>
                        ) : (
                          <span style={{ display: "inline-flex", width: 24, height: 24, borderRadius: "50%", background: "rgba(239,68,68,0.2)", color: "#f87171", alignItems: "center", justifyContent: "center" }}><Lp2Icon d={V_PATH.x} size={16} /></span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {admin && <div style={{ marginTop: 12 }}><Lp2AddBtn onClick={addCompRow}>Tambah Baris Perbandingan</Lp2AddBtn></div>}
        </Lp2Fade>
      </Lp2Section>

      {/* BONUS STACK */}
      {(bonusItems.length > 0 || admin) && (
        <Lp2Section bg="rgba(18,18,26,0.3)">
          <Lp2Fade style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ display: "inline-block", padding: "4px 16px", borderRadius: 999, background: `${V.accent}33`, color: V.accent, fontFamily: V_BODY, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>BONUS SPESIAL</span>
            <EditableText value={getExtra("bonusHeading")} admin={admin} onSave={saveExtra("bonusHeading")} tag="h2" block style={{ ...h2Style }} />
          </Lp2Fade>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Produk utama */}
            <Lp2Fade>
              <div className="lp2-bonus">
                <div className="lp2-bonus-flex">
                  <div className="lp2-bonus-thumb">
                    {extra.mainImage ? (
                      <img src={extra.mainImage} alt={p.name} className="lp2-bonus-img" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div className="lp2-bonus-img" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${p.hue || V.accentDark}55, ${V.card})` }}>
                        <Lp2Icon d={V_PATH.music} size={32} color={V.accentLight} />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: V_BODY, fontWeight: 600, fontSize: 14, color: "#fff" }}>{p.name} (Main Course)</div>
                      <EditableText value={getExtra("mainSubtitle")} admin={admin} onSave={saveExtra("mainSubtitle")} tag="div" block style={{ fontFamily: V_BODY, fontSize: 12, color: V.muted }} />
                      {admin && (
                        <div style={{ marginTop: 6, fontFamily: V_BODY, fontSize: 11.5, color: V.muted }}>
                          Gambar:{" "}
                          <EditableText value={extra.mainImage || "(belum ada — tempel link gambar)"} admin onSave={(v) => saveExtra("mainImage")(v.startsWith("(belum ada") ? "" : v.trim())} tag="span" style={{ color: V.accentLight, wordBreak: "break-all" }} />
                        </div>
                      )}
                    </div>
                    <div style={{ fontFamily: V_BODY, fontWeight: 600, fontSize: 14, color: V.accent, whiteSpace: "nowrap" }}>{mainValueText}</div>
                  </div>
                </div>
              </div>
            </Lp2Fade>

            {bonusItems.map((it, idx) => (
              <Lp2Fade key={idx}>
                <div className="lp2-bonus">
                  <div className="lp2-bonus-flex">
                    <div className="lp2-bonus-thumb">
                      {it.image ? (
                        <img src={it.image} alt={it.title} className="lp2-bonus-img" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div className="lp2-bonus-img" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${V.accent}33, ${V.card})`, fontSize: 32 }}>{it.icon || "✨"}</div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                      <div style={{ minWidth: 0 }}>
                        <EditableText value={it.title} admin={admin} onSave={(v) => updateBonusItem(idx, { title: v })} tag="div" block style={{ fontFamily: V_BODY, fontWeight: 600, fontSize: 14, color: "#fff" }} />
                        {(it.subtitle || admin) && (
                          <EditableText value={it.subtitle || "BONUS"} admin={admin} onSave={(v) => updateBonusItem(idx, { subtitle: v })} tag="div" block style={{ fontFamily: V_BODY, fontSize: 12, color: V.muted }} />
                        )}
                        {admin && (
                          <div style={{ marginTop: 6, fontFamily: V_BODY, fontSize: 11.5, color: V.muted }}>
                            Gambar:{" "}
                            <EditableText value={it.image || "(belum ada — tempel link gambar)"} admin onSave={(v) => updateBonusItem(idx, { image: v.startsWith("(belum ada") ? "" : v.trim() })} tag="span" style={{ color: V.accentLight, wordBreak: "break-all" }} />
                          </div>
                        )}
                      </div>
                      {(it.value || admin) && (
                        <div style={{ fontFamily: V_BODY, fontWeight: 600, fontSize: 14, color: V.green, whiteSpace: "nowrap" }}>
                          <EditableText value={it.value || "Rp 0"} admin={admin} onSave={(v) => updateBonusItem(idx, { value: v })} tag="span" />
                        </div>
                      )}
                    </div>
                  </div>
                  {admin && <Lp2DelBtn onClick={() => removeBonusItem(idx)} title="Hapus bonus ini" />}
                </div>
              </Lp2Fade>
            ))}
            {admin && <div><Lp2AddBtn onClick={addBonusItem}>Tambah Bonus</Lp2AddBtn></div>}
          </div>

          <Lp2Fade style={{ marginTop: 32 }}>
            <div style={{ padding: 24, borderRadius: 12, background: `linear-gradient(to right, ${V.accent}1a, ${V.accentDark}1a)`, border: `1px solid ${V.accent}4d` }}>
              {bonusValueTotal > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: V_BODY, color: V.muted }}>Total Nilai Keseluruhan:</span>
                  <span style={{ fontFamily: V_DISPLAY, fontSize: 28, fontWeight: 700, color: V.muted, textDecoration: "line-through" }}>{rp(anchorPrice + bonusValueTotal)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontFamily: V_BODY, fontWeight: 600 }}>{getExtra("promoNormalPriceLabel")}:</span>
                <span className="lp2-gradient-text" style={{ fontFamily: V_DISPLAY, fontSize: 28, fontWeight: 700 }}>{rp(anchorPrice)}</span>
              </div>
            </div>
          </Lp2Fade>
        </Lp2Section>
      )}

      {/* PRICING / CTA */}
      <Lp2Section id="lp-pricing">
        <Lp2Fade style={{ textAlign: "center", marginBottom: 32 }}>
          {admin ? (
            <LpTemplateBadge
              displayValue={tierNote}
              rawValue={getExtra(tierNoteKey)}
              onSave={saveExtra(tierNoteKey)}
              admin={admin}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: V.red, fontFamily: V_BODY, fontSize: 14 }}
            />
          ) : (
            <span className={promoActive ? "lp2-pulse" : undefined} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: V.red, fontFamily: V_BODY, fontSize: 14 }}>
              <Lp2Icon d={V_PATH.warn} size={16} />{tierNote}
            </span>
          )}
          {admin && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontFamily: V_BODY, fontSize: 10.5, color: V.muted, fontStyle: "italic" }}>
                Klik pensil untuk edit kalimat ini. Pakai {"{sisa}"} & {"{total}"} kalau mau tetap otomatis menampilkan sisa slot asli.
              </span>
            </div>
          )}
        </Lp2Fade>

        <Lp2Fade>
          <div className="lp2-card-glow" style={{ background: `linear-gradient(to bottom, ${V.card}, ${V.bg})`, borderRadius: 24, border: `1px solid ${V.border}`, overflow: "hidden" }}>
            <div style={{ padding: 40, textAlign: "center" }}>
              {hasTiers && promoActive ? (
                <div style={{ marginBottom: 16 }}>
                  <EditableText value={getExtra("promoCountdownLabel")} admin={admin} onSave={saveExtra("promoCountdownLabel")} tag="p" style={{ fontFamily: V_BODY, fontSize: 14, color: V.muted, margin: "0 0 8px" }} />
                  <div style={{ fontFamily: V_DISPLAY, fontWeight: 700, fontSize: 24, color: V.red }}>{hh} : {mm} : {ss}</div>
                </div>
              ) : hasTiers ? (
                <div style={{ marginBottom: 16 }}>
                  <EditableText value={getExtra("promoEndedLabel")} admin={admin} onSave={saveExtra("promoEndedLabel")} tag="p" style={{ fontFamily: V_BODY, fontSize: 14, color: V.muted, margin: 0 }} />
                </div>
              ) : null}
              <EditableText
                value={getExtra(promoActive ? "promoActivePriceLabel" : "promoNormalPriceLabel")}
                admin={admin}
                onSave={saveExtra(promoActive ? "promoActivePriceLabel" : "promoNormalPriceLabel")}
                tag="span"
                style={{ fontFamily: V_BODY, fontWeight: 700, fontSize: 18, color: "#fff" }}
              />
              {disc > 0 && (
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <span className="lp2-strike" style={{ fontFamily: V_BODY, fontWeight: 700, fontSize: 30, color: V.muted }}>{rp(anchorPrice)}</span>
                </div>
              )}
              <div className="lp2-gradient-text" style={{ fontFamily: V_DISPLAY, fontWeight: 700, fontSize: 48, margin: disc > 0 ? "0 0 8px" : "16px 0 8px", lineHeight: 1.15 }}>{rp(currentPrice)}</div>
              <p style={{ fontFamily: V_BODY, fontSize: 14, color: V.muted, margin: 0 }}>Akses selamanya, one-time payment</p>
            </div>

            <div style={{ padding: "0 32px 32px" }}>
              {pending ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 12px", borderRadius: 12, background: V.card, border: `1px solid ${V.red}66` }}>
                  <Lp2Icon d={V_PATH.clock} size={16} color={V.red} />
                  <span style={{ fontFamily: V_BODY, fontSize: 13.5, fontWeight: 600, color: V.red }}>Pesananmu sedang menunggu verifikasi pembayaran</span>
                </div>
              ) : owned ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 12px", borderRadius: 12, background: V.card, border: `1px solid ${V.accent}` }}>
                  <Lp2Icon d={V_PATH.check} size={16} color={V.accent} />
                  <span style={{ fontFamily: V_BODY, fontSize: 13.5, fontWeight: 600, color: V.accentLight }}>Kamu sudah memiliki produk ini</span>
                </div>
              ) : (
                <button className="lp2-btn lp2-glow-btn" onClick={buyNow} style={{ ...btnStyle, display: "block", width: "100%", textAlign: "center" }}>Beli Sekarang</button>
              )}
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap", color: V.muted, fontFamily: V_BODY, fontSize: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Lp2Icon d={V_PATH.shield} size={16} color={V.green} />
                  <EditableText value={getExtra("trustBadge1")} admin={admin} onSave={saveExtra("trustBadge1")} tag="span" />
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Lp2Icon d={V_PATH.clock} size={16} color={V.green} />
                  <EditableText value={getExtra("trustBadge2")} admin={admin} onSave={saveExtra("trustBadge2")} tag="span" />
                </span>
              </div>
            </div>
          </div>
        </Lp2Fade>

        <Lp2Fade style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 16 }}>
          {["Akses selamanya—sekali bayar, milik selamanya", "Bisa ditonton ulang kapanpun kamu mau", "Cocok untuk pemula sampai menengah dengan budget terbatas"].map((r) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: V_BODY, fontSize: 14, color: V.muted }}>
              <Lp2Icon d={V_PATH.check} size={20} color={V.accent} />{r}
            </div>
          ))}
        </Lp2Fade>
      </Lp2Section>

      {/* FAQ */}
      <Lp2Section bg="rgba(18,18,26,0.3)">
        <Lp2Fade style={{ textAlign: "center", marginBottom: 48 }}>
          <LpTwoToneText value={getExtra("faqTitle")} admin={admin} onSave={saveExtra("faqTitle")} tag="h2" {...twoToneGradient} style={{ ...h2Style, marginBottom: 16 }} />
          <EditableText value={getExtra("faqSubtitle")} admin={admin} onSave={saveExtra("faqSubtitle")} tag="p" style={{ fontFamily: V_BODY, fontSize: 16, color: V.muted, margin: 0 }} />
        </Lp2Fade>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {faqItems.map((f, i) => {
            const open = openFaq === i;
            return (
              <Lp2Fade key={i}>
                <div style={{ position: "relative", background: V.card, borderRadius: 12, border: `1px solid ${V.border}`, overflow: "hidden" }}>
                  {admin ? (
                    <div style={{ padding: "16px 20px" }}>
                      <EditableText value={f.q} admin onSave={(v) => updateFaqItem(i, { q: v })} tag="div" block style={{ fontFamily: V_BODY, fontWeight: 600, fontSize: 16, color: "#fff", marginBottom: 6, paddingRight: 24 }} />
                      <EditableText value={f.a} admin onSave={(v) => updateFaqItem(i, { a: v })} tag="p" area block style={{ fontFamily: V_BODY, fontSize: 14, color: V.muted, lineHeight: 1.6, margin: 0, paddingRight: 24 }} />
                      {faqItems.length > 1 && <Lp2DelBtn onClick={() => removeFaqItem(i)} title="Hapus pertanyaan ini" />}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setOpenFaq(open ? -1 : i)}
                        aria-expanded={open}
                        style={{ width: "100%", padding: 20, background: "none", border: "none", cursor: "pointer", textAlign: "left", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}
                      >
                        <span style={{ fontFamily: V_BODY, fontWeight: 600, fontSize: 16 }}>{f.q}</span>
                        <Lp2Icon d={V_PATH.chevron} size={20} color={V.accent} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .3s ease" }} />
                      </button>
                      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows .3s ease" }}>
                        <div style={{ overflow: "hidden" }}>
                          <div style={{ padding: "0 20px 20px", fontFamily: V_BODY, fontSize: 14, color: V.muted, lineHeight: 1.6 }}>{f.a}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Lp2Fade>
            );
          })}
          {admin && <div><Lp2AddBtn onClick={addFaqItem}>Tambah Pertanyaan</Lp2AddBtn></div>}
        </div>
      </Lp2Section>

      {/* CTA PENUTUP */}
      <Lp2Section bg="rgba(18,18,26,0.5)">
        <Lp2Fade style={{ textAlign: "center" }}>
          <LpTwoToneText value={getExtra("closingTitle")} admin={admin} onSave={saveExtra("closingTitle")} tag="h2" {...twoToneGradient} style={{ ...h2Style, marginBottom: 16 }} />
          <div style={{ maxWidth: 448, margin: "0 auto 32px" }}>
            <EditableText value={getExtra("closingSubtitle")} admin={admin} onSave={saveExtra("closingSubtitle")} tag="p" area block style={{ fontFamily: V_BODY, fontSize: 16, color: V.muted, lineHeight: 1.6, margin: 0 }} />
          </div>
          <LpEditableButtonLabel value={getExtra("closingCtaText")} admin={admin} onSave={saveExtra("closingCtaText")}>
            <button className="lp2-btn lp2-glow-btn" onClick={scrollToPricing} style={btnStyle}>{getExtra("closingCtaText")}</button>
          </LpEditableButtonLabel>
          <div style={{ marginTop: 16 }}>
            <EditableText value={getExtra("closingFooterNote")} admin={admin} onSave={saveExtra("closingFooterNote")} tag="p" style={{ fontFamily: V_BODY, fontSize: 14, color: V.muted, margin: 0 }} />
          </div>
        </Lp2Fade>
      </Lp2Section>

      <div style={{ width: "100%", padding: "24px 16px", textAlign: "center" }}>
        <p style={{ fontFamily: V_BODY, fontSize: 12, color: V.muted, margin: 0 }}>© 2026 {p.name} × Gitar Sakti. Seluruh hak cipta dilindungi.</p>
      </div>
    </div>
  );
}

// Pemilih template: landing page yang belum pernah diatur otomatis pakai template klasik (emas).
function LandingPageRouter(props) {
  const Tpl = props.lp?.extra?.template === "violet" ? LandingPageTemplateViolet : LandingPageTemplate;
  return <Tpl {...props} />;
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
      <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 32, color: C.text, margin: "0 0 24px" }}>{page.title.toUpperCase()}</h1>
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
  // Tema (terang/gelap): preferensi disimpan di localStorage browser supaya tetap kepilih
  // walau situs ditutup dan dibuka lagi. themeState.mode di-sync tiap render supaya Proxy "C"
  // di atas selalu baca nilai yang terbaru.
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("gs-theme");
      if (saved === "dark" || saved === "light") return saved;
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    }
    return "light";
  });
  themeState.mode = theme;
  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") window.localStorage.setItem("gs-theme", next);
      return next;
    });
  };

  const [view, setView] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("resetpw") === "1") return "resetpassword";
      if (params.get("halaman")) return "lp";
    }
    return "home";
  });
  const [lpSlug, setLpSlug] = useState(() => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("halaman") : null));
  // Mode edit khusus landing page: begitu admin klik "Edit di Halaman", halaman ini dibuka apa
  // adanya (sama persis dengan yang dilihat pengunjung) tapi tiap teks/video dikasih ikon pensil.
  const [lpEditMode, setLpEditMode] = useState(false);
  // Sama seperti landing page, tapi buat halaman materi (LearnPage) -- dipakai admin buat nyusun
  // kurikulum (judul kelas, video, link) langsung di tampilan asli yang dilihat pembeli.
  const [learnEditMode, setLearnEditMode] = useState(false);
  const [landingPages, setLandingPages] = useState([]);
  const [productSlug, setProductSlug] = useState(null);
  // Mulai kosong (bukan data contoh) supaya pengunjung tidak pernah melihat/membeli produk fiktif
  // sebelum data asli dari database selesai dimuat.
  const [products, setProducts] = useState([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [curriculumData, setCurriculumData] = useState({});
  const [curriculumOutline, setCurriculumOutline] = useState({});
  const [cart, setCart] = useState([]);
  // Harga khusus per produk di keranjang (mis. harga promo dari landing page) + asal LP-nya.
  const [cartPrices, setCartPrices] = useState({});
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
  // Video terakhir yang dibuka member per kelas { [productId]: { idx, at } } — dipakai kartu
  // "Lanjutkan Belajar". Disimpan di browser per akun (progres "selesai" tetap di database).
  const [lastWatched, setLastWatched] = useState({});
  const prevCurrentRef = useRef({});
  const [orders, setOrders] = useState(DEMO_ORDERS);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [coupons, setCoupons] = useState([]); // hanya terisi untuk admin (RLS)
  const [siteContent, setSiteContent] = useState(DEFAULT_SITE_CONTENT);
  const [customPages, setCustomPages] = useState([]);
  const [customPageSlug, setCustomPageSlug] = useState(null);
  const [testimonials, setTestimonials] = useState(INITIAL_TESTIMONIALS);
  const [bankInfo, setBankInfo] = useState(DEFAULT_BANK_INFO);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [totalVisits, setTotalVisits] = useState(0);

  /* ---------------- MAPPER: baris database (snake_case) <-> bentuk data yang dipakai di seluruh app (camelCase) ---------------- */
  const mapProductRow = (row) => ({
    id: row.id, slug: row.slug, name: row.name, category: row.category, level: row.level,
    price: row.price, oldPrice: row.old_price, rating: Number(row.rating) || 0, reviews: row.reviews, sold: row.sold,
    badge: row.badge, duration: row.duration, format: row.format, hue: row.hue,
    desc: row.description, benefits: row.benefits || [], learn: row.learn_points || [],
    bonus: row.bonus, previewVideo: row.preview_video || "", pricingTiers: row.pricing_tiers, status: row.status,
    productType: row.product_type || "digital", stock: row.stock ?? null, variants: Array.isArray(row.variants) ? row.variants : [],
    images: Array.isArray(row.images) ? row.images : [], weightGrams: row.weight_grams ?? null,
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
    createdAt: row.created_at,
    proofImage: row.proof_image_url,
    proofNote: row.proof_note,
    proofSubmittedAt: row.proof_submitted_at ? formatDateID(new Date(row.proof_submitted_at)) : null,
    paymentMethodId: row.payment_method_id || null,
    lines: (row.items || []).map((it) => ({ id: it.id, name: it.name, price: it.price, qty: it.qty || 1, variant: it.variant || null, type: it.type || null })),
    subtotal: row.subtotal,
    shippingFee: row.shipping_fee || 0,
    shippingAddress: row.shipping_address || null,
    fulfillmentStatus: row.fulfillment_status || null,
    trackingNumber: row.tracking_number || null,
  });
  const mapPaymentMethodRow = (row) => ({
    id: row.id, type: row.type, label: row.label, icon: row.icon, enabled: row.enabled, sortOrder: row.sort_order,
    bankName: row.bank_name, accountNumber: row.account_number, accountHolder: row.account_holder,
    qrisImageUrl: row.qris_image_url, instructions: row.instructions,
    midtransClientKey: row.midtrans_client_key, midtransEnv: row.midtrans_env || "sandbox",
  });

  /* ---------------- FETCH DATA DARI SUPABASE ---------------- */
  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*").order("sort_order");
    if (!error && data) setProducts(data.map(mapProductRow));
    setProductsLoaded(true);
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
  // Progres video yang sudah ditandai selesai oleh customer yang sedang login. Disimpan di tabel
  // video_progress (bukan lagi cuma di state browser), jadi tidak hilang saat logout/ganti perangkat.
  // Barisnya nyimpan video_id (bukan urutan/index), lalu di sini dikonversi balik ke index supaya
  // cocok sama cara LearnPage & ProductCard membaca progress (array index per produk).
  const fetchVideoProgress = async () => {
    const { data, error } = await supabase.from("video_progress").select("product_id, video_id");
    if (error || !data) return;
    const grouped = {};
    data.forEach((row) => {
      const vids = curriculumData[row.product_id] || [];
      const idx = vids.findIndex((v) => v.id == row.video_id);
      if (idx === -1) return; // video sudah dihapus/kurikulum berubah — lewati baris lama ini
      if (!grouped[row.product_id]) grouped[row.product_id] = [];
      grouped[row.product_id].push(idx);
    });
    setVideoProgress(grouped);
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
    if (data && data.content && Object.keys(data.content).length > 0) {
      // Gabung per bagian dengan default supaya bagian yang belum pernah disimpan tidak bikin halaman crash.
      const merged = { ...DEFAULT_SITE_CONTENT };
      for (const [k, v] of Object.entries(data.content)) merged[k] = v && typeof v === "object" && !Array.isArray(v) && DEFAULT_SITE_CONTENT[k] && typeof DEFAULT_SITE_CONTENT[k] === "object" && !Array.isArray(DEFAULT_SITE_CONTENT[k]) ? { ...DEFAULT_SITE_CONTENT[k], ...v } : v;
      for (const [section, legacy] of Object.entries(LEGACY_PLACEHOLDER_TEXT)) {
        if (!merged[section] || typeof merged[section] !== "object") continue;
        const fixed = { ...merged[section] };
        for (const [key, oldVal] of Object.entries(legacy)) if (fixed[key] === oldVal) fixed[key] = DEFAULT_SITE_CONTENT[section][key];
        merged[section] = fixed;
      }
      setSiteContent(merged);
    }
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
        // Kolom "extra" (jsonb) nampung semua teks tambahan yang bisa diedit langsung di halaman
        // (judul & isi section masalah, quote, FAQ, penutup, dst). Kalau kolomnya belum ada di
        // database (migrasi belum dijalankan), l.extra bakal undefined -> jatuh ke {} dengan aman,
        // dan LandingPageTemplate akan pakai teks generik bawaan.
        extra: l.extra || {},
      })));
    }
  };
  const fetchOrders = async () => {
    // RLS otomatis membatasi hasil: customer hanya lihat order miliknya, admin lihat semua.
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (!error && data) setOrders(data.map(mapOrderRow));
  };
  const fetchPaymentMethods = async () => {
    // enabled=true kelihatan oleh semua orang (perlu tampil di checkout publik), admin juga
    // lihat yang nonaktif lewat RLS admin — lihat kebijakan di payment_methods.sql.
    const { data, error } = await supabase.from("payment_methods").select("*").order("sort_order");
    if (!error && data) setPaymentMethods(data.map(mapPaymentMethodRow));
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
  // Jumlah kunjungan sejak tanggal tertentu (dipakai filter periode di Ringkasan admin).
  const countVisitsSince = async (since) => {
    let q = supabase.from("site_visits").select("*", { count: "exact", head: true });
    if (since) q = q.gte("visited_at", since.toISOString());
    const { count } = await q;
    return count || 0;
  };

  // Data toko (produk, kurikulum, kupon, testimoni, rekening, konten situs, halaman kustom) — publik,
  // dimuat sekali di awal, tidak bergantung status login.
  useEffect(() => {
    fetchProducts();
    fetchTestimonials();
    fetchBankInfo();
    fetchSiteContent();
    fetchCustomPages();
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

  /* ---------------- METODE PEMBAYARAN (bisa ditambah/diedit sendiri lewat Pengaturan → Metode Pembayaran,
     tanpa perlu edit kode). "manual" = rekening/QRIS/e-wallet yang diverifikasi admin secara manual.
     "midtrans" = pembayaran otomatis lewat Midtrans Snap. PENTING: Midtrans Server Key TIDAK PERNAH
     disimpan di tabel ini (bisa dibaca browser) — server key cuma boleh hidup sebagai secret di Edge
     Function. Yang disimpan di sini cuma Client Key, yang memang didesain aman untuk publik. ---------------- */
  const addPaymentMethod = async (m) => {
    const maxOrder = paymentMethods.reduce((max, p) => Math.max(max, p.sortOrder ?? -1), -1);
    const { error } = await supabase.from("payment_methods").insert({
      type: m.type, label: m.label, icon: m.icon, enabled: true, sort_order: maxOrder + 1,
      bank_name: m.bankName || null, account_number: m.accountNumber || null, account_holder: m.accountHolder || null,
      qris_image_url: m.qrisImageUrl || null, instructions: m.instructions || null,
      midtrans_client_key: m.midtransClientKey || null, midtrans_env: m.midtransEnv || "sandbox",
    });
    if (error) return { ok: false, error: error.message };
    fetchPaymentMethods();
    return { ok: true };
  };
  const updatePaymentMethod = async (id, m) => {
    const { error } = await supabase.from("payment_methods").update({
      type: m.type, label: m.label, icon: m.icon,
      bank_name: m.bankName || null, account_number: m.accountNumber || null, account_holder: m.accountHolder || null,
      qris_image_url: m.qrisImageUrl || null, instructions: m.instructions || null,
      midtrans_client_key: m.midtransClientKey || null, midtrans_env: m.midtransEnv || "sandbox",
    }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    fetchPaymentMethods();
    return { ok: true };
  };
  const togglePaymentMethod = async (id, enabled) => {
    setPaymentMethods((prev) => prev.map((p) => (p.id === id ? { ...p, enabled } : p))); // optimistic
    await supabase.from("payment_methods").update({ enabled }).eq("id", id);
  };
  const deletePaymentMethod = async (id) => {
    await supabase.from("payment_methods").delete().eq("id", id);
    fetchPaymentMethods();
  };
  // Simpan urutan hasil tahan-&-geser (sekali panggil ke server, tampilan langsung berubah).
  const reorderPaymentMethods = async (next) => {
    setPaymentMethods(next.map((m, i) => ({ ...m, sortOrder: i })));
    const { error } = await supabase.rpc("admin_reorder_payment_methods", { p_ids: next.map((m) => m.id) });
    if (error) { toast.error("Urutan gagal disimpan: " + error.message); fetchPaymentMethods(); return; }
    toast.success("Urutan metode pembayaran disimpan");
  };

  /* ---------------- EMAIL KONFIRMASI PESANAN ----------------
     Dikirim lewat Supabase Edge Function "send-order-email" (pakai Resend), BUKAN dari sini
     langsung — supaya API key pengirim email tidak pernah nongol di browser. Kalau Edge
     Function belum di-deploy, panggilan ini gagal diam-diam (tidak mengganggu alur checkout/
     verifikasi pembayaran yang tetap harus jalan meski emailnya gagal terkirim). */
  // Notifikasi Telegram ke HP/laptop admin -- dipanggil bersamaan dengan email, tidak saling
  // menunggu (non-blocking), supaya kalau Telegram gagal, proses checkout/upload tetap jalan.
  // Cukup kirim { orderId, kind } — isi email/notifikasi dibaca function langsung dari database,
  // dan function mengecek bahwa pemanggilnya memang pemilik pesanan / admin (anti-spam).
  const sendTelegramNotify = (orderId, kind) => { invokeFn("notify-telegram", { orderId, kind }); };
  const sendOrderEmail = (orderId, kind) => { invokeFn("send-order-email", { orderId, kind }); };

  /* ---------------- AKUN & SESI (Supabase Auth) ---------------- */
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const role = profile?.role || null;
  // Admin sering membiarkan tab terbuka lama (terutama di HP). Saat tab aktif lagi, ambil materi
  // terbaru supaya editor tidak menyimpan ulang salinan lama.
  useEffect(() => {
    if (role !== "admin") return;
    const onVisible = () => { if (document.visibilityState === "visible") fetchCurriculum(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [role]);

  // Daftar semua member terdaftar (hanya admin yang bisa membaca semua profil lewat RLS).
  const [members, setMembers] = useState([]);
  const fetchMembers = async () => {
    const { data, error } = await supabase.from("profiles").select("id, email, name, phone, role, created_at").order("created_at", { ascending: false });
    if (!error && data) setMembers(data);
  };

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
      // Link reset password dari email membawa token khusus yang memicu event ini otomatis —
      // begitu terdeteksi, arahkan ke halaman buat kata sandi baru.
      if (_event === "PASSWORD_RECOVERY") setView("resetpassword");
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

  // Data yang isinya bergantung siapa yang login (RLS): materi video (hanya pembeli/admin),
  // landing page draft & metode pembayaran nonaktif (admin), kupon & daftar member (admin).
  // Dimuat ulang tiap kali sesi/role berubah — sebelumnya hanya dimuat sekali saat halaman
  // dibuka, sehingga setelah login materi yang sudah dibeli tidak muncul sampai di-refresh.
  useEffect(() => {
    if (!authReady) return;
    fetchCurriculum();
    fetchLandingPages();
    fetchPaymentMethods();
    if (profile?.role === "admin") {
      fetchTotalVisits();
      fetchCoupons();
      fetchMembers();
    } else {
      setCoupons([]);
      setMembers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, session?.user?.id, profile?.role]);

  // Progres video: dimuat ulang tiap kali sesi berubah ATAU data kurikulum termuat/berubah —
  // butuh curriculumData supaya video_id dari database bisa dicocokkan ke index video yang benar.
  useEffect(() => {
    if (!authReady) return;
    if (!session) { setVideoProgress({}); return; } // logout / belum login -> progres lokal dikosongkan
    fetchVideoProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, session?.user?.id, curriculumData]);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) { prevCurrentRef.current = {}; setVideoCurrent({}); setLastWatched({}); return; }
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(`gs-last-${uid}`) || "{}") || {}; } catch (e) { saved = {}; }
    const cur = Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, v.idx]));
    prevCurrentRef.current = cur;
    setLastWatched(saved);
    setVideoCurrent(cur);
  }, [session?.user?.id]);
  useEffect(() => {
    const prev = prevCurrentRef.current;
    const changed = Object.keys(videoCurrent).filter((k) => videoCurrent[k] !== prev[k]);
    prevCurrentRef.current = videoCurrent;
    const uid = session?.user?.id;
    if (!changed.length || !uid) return;
    setLastWatched((lw) => {
      const next = { ...lw };
      changed.forEach((k) => { next[k] = { idx: videoCurrent[k], at: Date.now() }; });
      try { localStorage.setItem(`gs-last-${uid}`, JSON.stringify(next)); } catch (e) { /* abaikan */ }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoCurrent]);

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
    setCart([]);
    setCartPrices({});
    setCoupon(null);
    go("home");
  };
  const changeAdminPassword = async (currentPw, newPw) => {
    if (newPw.length < 8) return { ok: false, error: "Kata sandi baru minimal 8 karakter." };
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: profile.email, password: currentPw });
    if (reauthError) return { ok: false, error: "Kata sandi saat ini salah." };
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };
  // Lupa kata sandi: Supabase mengirim email berisi link reset. Link itu membawa balik ke situs
  // ini dengan token khusus di URL, yang otomatis memicu event "PASSWORD_RECOVERY" (ditangani di
  // listener onAuthStateChange di atas) dan mengarahkan ke halaman ResetPasswordPage.
  // CATATAN: kalau email ini tidak sampai ke inbox customer, kemungkinan besar penyebabnya bukan
  // di kode, tapi karena Supabase Auth bawaan (gratis) sangat dibatasi jumlah kirimnya per jam dan
  // sering nyangkut di folder Spam. Solusinya: pasang custom SMTP (mis. lewat Resend/Brevo) di
  // Supabase Dashboard → Authentication → Emails → SMTP Settings.
  const forgotPassword = async (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return { ok: false, error: "Masukkan email kamu terlebih dahulu." };
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?resetpw=1` : undefined,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };
  const resetPasswordConfirm = async (newPw) => {
    if (newPw.length < 6) return { ok: false, error: "Kata sandi minimal 6 karakter." };
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
    toast("Data sekarang tersimpan di database Supabase, bukan di browser. Untuk reset data, buka Supabase Dashboard -> Table Editor, atau jalankan ulang script seed.sql.");
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
  const openLandingPage = (slug, editMode) => {
    setLpSlug(slug);
    setLpEditMode(!!editMode);
    setView("lp");
    setMobileOpen(false);
    window.scrollTo?.({ top: 0, behavior: "instant" });
    try {
      window.history.pushState({ view: "lp", productSlug, customPageSlug, lpSlug: slug }, "", `?halaman=${encodeURIComponent(slug)}`);
    } catch (e) {}
  };
  const openProduct = (slug) => go("product", slug);
  // Buka LearnPage (tampilan pembeli/member) langsung dalam Mode Edit -- ini yang dipakai setelah
  // produk baru dibuat, dan lewat tombol "Kelola Materi" di daftar produk admin.
  const openLearnEditor = (slug) => {
    // Editor menyimpan SELURUH daftar materi sekaligus, jadi harus mulai dari data terbaru di
    // server — kalau tidak, salinan lama di browser bisa menimpa perubahan yang lebih baru.
    fetchCurriculum();
    setProductSlug(slug);
    setLearnEditMode(true);
    setView("learn");
    setMobileOpen(false);
    window.scrollTo?.({ top: 0, behavior: "instant" });
    try {
      window.history.pushState({ view: "learn", productSlug: slug, customPageSlug, lpSlug }, "");
    } catch (e) {}
  };
  const currentAccount = role === "customer" && profile ? { name: profile.name, email: profile.email, phone: profile.phone } : null;
  // PENTING: orders sudah otomatis terbatas ke milik customer yang login (lewat RLS di database),
  // jadi tidak perlu filter manual lagi di sini — beda dengan versi localStorage sebelumnya yang
  // rawan bocor data antar-customer kalau lupa difilter.
  // Hanya produk DIGITAL yang "dimiliki" (akses materi). Barang fisik bisa dibeli berulang kali.
  const physicalIds = new Set(products.filter((p) => p.productType === "physical").map((p) => p.id));
  const ownedIds = role === "customer" ? Array.from(new Set(
    orders.filter((o) => o.payment === "PAID").flatMap((o) => o.itemIds).filter((id) => id && !physicalIds.has(id))
  )) : [];
  // Produk yang sedang menunggu verifikasi pembayaran (belum PAID, belum juga Gagal) —
  // dipakai untuk mencegah customer checkout ganda untuk produk yang sama.
  const pendingIds = role === "customer" ? Array.from(new Set(
    orders.filter((o) => o.payment === "Pending").flatMap((o) => o.itemIds).filter((id) => id && !physicalIds.has(id) && !ownedIds.includes(id))
  )) : [];
  // Begitu admin memverifikasi pembayaran (pesanan jadi PAID lewat realtime), materi produk itu
  // langsung dimuat — member tidak perlu refresh halaman.
  const ownedKey = ownedIds.slice().sort().join(",");
  useEffect(() => {
    if (authReady && ownedKey) fetchCurriculum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedKey]);
  const goToAuth = () => {
    setPreAuthView({ view, slug: productSlug });
    go("auth");
  };
  // Isi keranjang: [{ key, id, variant, qty }]. Produk digital selalu qty 1; barang fisik boleh
  // beberapa buah & per varian (mis. Kaos L x2 + Kaos M x1).
  const addToCart = (id, opts = {}) => {
    if (!role) {
      const prod = products.find((pr) => pr.id === id);
      setRedirectAfterAuth(prod ? { view: "product", slug: prod.slug } : null);
      setPreAuthView({ view, slug: productSlug });
      go("auth");
      return false;
    }
    if (role === "admin") { toast("Akun admin tidak bisa membeli. Gunakan akun customer untuk uji coba pembelian."); return false; }
    const prod = products.find((pr) => pr.id === id);
    if (!prod) return false;
    if (prod.productType === "physical") {
      const hasVariants = (prod.variants || []).length > 0;
      const variant = opts.variant || null;
      if (hasVariants && !variant) { go("product", prod.slug); toast("Pilih varian dulu ya (ukuran / tipe)."); return false; }
      const avail = hasVariants ? (prod.variants.find((v) => v.name === variant)?.stock ?? null) : prod.stock;
      const key = `${id}|${variant || ""}`;
      const qty = Math.max(1, Number(opts.qty) || 1);
      const inCartQty = cart.find((e) => e.key === key)?.qty || 0;
      if (avail !== null && avail !== undefined && avail !== "" && inCartQty + qty > Number(avail)) {
        toast.error(Number(avail) <= 0 ? "Stok habis." : `Stok tersisa ${avail}.`);
        return false;
      }
      setCart((c) => (c.some((e) => e.key === key) ? c.map((e) => (e.key === key ? { ...e, qty: e.qty + qty } : e)) : [...c, { key, id, variant, qty }]));
      if (!opts.silent) toast.success(`${prod.name}${variant ? ` (${variant})` : ""} masuk keranjang`);
    } else {
      if (ownedIds.includes(id) || pendingIds.includes(id)) return false;
      setCart((c) => (c.some((e) => e.id === id) ? c : [...c, { key: `${id}|`, id, variant: null, qty: 1 }]));
    }
    trackEvent("AddToCart", { content_ids: [String(id)], content_name: prod.name, value: prod.price, currency: "IDR" });
    return true;
  };
  const updateCartQty = (key, qty) => {
    const entry = cart.find((e) => e.key === key);
    const prod = entry && products.find((p) => p.id === entry.id);
    if (!prod) return;
    const avail = (prod.variants || []).length > 0 ? prod.variants.find((v) => v.name === entry.variant)?.stock : prod.stock;
    let q = Math.max(1, Math.min(99, Number(qty) || 1));
    if (avail !== null && avail !== undefined && avail !== "" && q > Number(avail)) { q = Math.max(1, Number(avail)); toast(`Stok tersisa ${avail}.`); }
    setCart((c) => c.map((e) => (e.key === key ? { ...e, qty: q } : e)));
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
    if (curriculumData[p.id] && curriculumData[p.id].length > 0) { resumeLesson(p); return; }
    // Produk tanpa video (mis. bundle atau ebook) belum punya halaman materinya sendiri.
    // Sebelumnya tombol ini diam-diam mengarahkan kembali ke halaman produk yang sama,
    // yang tampak seperti tidak berfungsi karena tidak ada perubahan tampilan.
    if (role === "admin") { openLearnEditor(p.slug); return; }
    toast(`Materi "${p.name}" sedang disiapkan. Kami akan mengabari kamu begitu materinya siap diakses.`);
  };
  // Video yang paling pas untuk dilanjutkan: video terakhir dibuka (kalau belum selesai),
  // kalau sudah selesai -> video berikutnya yang belum selesai.
  const resumeIndex = (p) => {
    const vids = curriculumData[p.id] || [];
    const done = videoProgress[p.id] || [];
    const last = lastWatched[p.id]?.idx;
    if (last !== undefined && last < vids.length && !done.includes(last)) return last;
    const after = vids.findIndex((_, i) => i > (last ?? -1) && !done.includes(i));
    if (after !== -1) return after;
    const any = vids.findIndex((_, i) => !done.includes(i));
    return any === -1 ? Math.max(0, vids.length - 1) : any;
  };
  const resumeLesson = (p) => {
    const idx = resumeIndex(p);
    setVideoCurrent((prev) => ({ ...prev, [p.id]: idx }));
    go("learn", p.slug);
  };
  const continueItems = role === "customer"
    ? products
      .filter((p) => p.productType !== "physical" && ownedIds.includes(p.id) && (curriculumData[p.id] || []).length > 0)
      .map((p) => {
        const vids = curriculumData[p.id];
        const done = (videoProgress[p.id] || []).length;
        const idx = resumeIndex(p);
        return { p, total: vids.length, done, idx, video: vids[idx], pct: Math.round((done / vids.length) * 100), at: lastWatched[p.id]?.at || 0 };
      })
      .sort((a, b) => (b.at - a.at) || (a.pct === 100) - (b.pct === 100))
    : [];

  const removeFromCart = (key) => {
    const entry = cart.find((e) => e.key === key || e.id === key);
    if (!entry) return;
    setCart((c) => c.filter((e) => e.key !== entry.key));
    if (!cart.some((e) => e.id === entry.id && e.key !== entry.key)) setCartPrices((prev) => { const n = { ...prev }; delete n[entry.id]; return n; });
  };
  const clearCart = () => { setCart([]); setCartPrices({}); setCoupon(null); };

  // Harga, diskon & total yang dikirim di sini hanya "permintaan" — database (trigger
  // orders_before_insert) menghitung ulang semuanya dari harga produk & kupon asli, jadi tidak
  // bisa dimanipulasi dari browser. "lp" = slug landing page asal (untuk harga promo).
  const addOrder = async ({ cartProducts, total, discount, couponCode, method, paymentMethodId, customerName, customerEmail, customerPhone, shippingAddress }) => {
    if (!session) return { ok: false, error: "Sesi tidak ditemukan, silakan masuk ulang." };
    const items = cartProducts.map((p) => ({ id: p.id, name: p.name, price: p.price, qty: p.qty || 1, ...(p.variant ? { variant: p.variant } : {}), ...(p.lpSlug ? { lp: p.lpSlug } : {}) }));
    const subtotal = cartProducts.reduce((s, p) => s + p.price * (p.qty || 1), 0);
    const { data, error } = await supabase.from("orders").insert({
      customer_id: session.user.id,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      items, subtotal, discount, coupon_code: couponCode, total,
      payment: "Pending", status: "Menunggu Pembayaran", method, payment_method_id: paymentMethodId || null,
      ...(shippingAddress ? { shipping_address: shippingAddress } : {}),
    }).select().single();
    if (error) return { ok: false, error: error.message };
    // Simpan juga nomor WA terbaru ke profil supaya checkout berikutnya otomatis terisi.
    if (customerPhone && customerPhone !== profile?.phone) {
      supabase.from("profiles").update({ phone: customerPhone }).eq("id", session.user.id).then(() => {});
      setProfile((prev) => (prev ? { ...prev, phone: customerPhone } : prev));
    }
    // Alamat terakhir disimpan di profil supaya belanja merchandise berikutnya tinggal klik.
    if (shippingAddress) {
      supabase.from("profiles").update({ address: shippingAddress }).eq("id", session.user.id).then(() => {});
      setProfile((prev) => (prev ? { ...prev, address: shippingAddress } : prev));
    }
    await fetchOrders();
    fetchProducts(); // stok terbaru
    sendOrderEmail(data.id, "created");
    // Telegram admin sengaja hanya dikirim saat bukti transfer diupload (bukan saat pesanan dibuat).
    trackEvent("InitiateCheckout", { value: data.total, currency: "IDR", content_ids: items.map((i) => String(i.id)) });
    return { ok: true, orderId: data.id };
  };
  // Mengunci harga tier yang sedang berlaku (founder/early bird/reguler) ke produk sebelum
  // masuk keranjang, supaya harga di checkout sama persis dengan yang ditampilkan di landing page.
  // Sebelumnya fungsi ini MENGUBAH harga produk di database (kalau yang klik admin, harga produk
  // permanen berubah jadi harga promo). Sekarang harga promo cuma "ditempel" di keranjang pembeli
  // ini, dan tetap diverifikasi ulang oleh database saat pesanan dibuat.
  const applyPricingAndBuy = (productId, price, oldPrice, lpSlug) => {
    const ok = addToCart(productId);
    if (ok) setCartPrices((prev) => ({ ...prev, [productId]: { price, oldPrice, lpSlug } }));
    return ok;
  };
  // Perubahan status (terutama jadi PAID) lewat RPC di server — bukan UPDATE langsung — supaya
  // penambahan counter "sold" produk & "used" kupon konsisten dan tidak bisa dipalsukan dari client.
  const updateFulfillment = async (id, status, tracking) => {
    const { error } = await supabase.rpc("admin_update_fulfillment", { p_order_id: id, p_status: status, p_tracking: tracking || "" });
    if (error) { toast.error(error.message); return false; }
    if (status === "Dikirim") sendOrderEmail(id, "shipped");
    toast.success(status === "Dikirim" ? "Status: Dikirim — pembeli dikabari lewat email" : `Status pengiriman: ${status}`);
    fetchOrders();
    return true;
  };
  const updateOrderStatus = async (id, payment, status) => {
    const { error } = await supabase.rpc("admin_update_order_status", { p_order_id: id, p_payment: payment, p_status: status });
    if (error) { toast.error("Gagal mengubah status pesanan: " + error.message); return; }
    if (payment === "PAID") sendOrderEmail(id, "paid");
    fetchOrders();
    fetchProducts();
    fetchCoupons();
  };
  // Upload foto ke Storage privat, lalu catat path-nya ke order lewat RPC (bukan UPDATE langsung,
  // supaya customer hanya bisa mengisi kolom bukti transfer, bukan kolom lain seperti payment/status).
  const attachPaymentProof = async (orderId, file, note) => {
    if (!session) return { ok: false, error: "Sesi tidak ditemukan." };
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${session.user.id}/${orderId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, file);
    if (uploadError) return { ok: false, error: uploadError.message };
    const { error: rpcError } = await supabase.rpc("attach_payment_proof", { p_order_id: orderId, p_proof_url: path, p_note: note });
    if (rpcError) return { ok: false, error: rpcError.message };
    sendOrderEmail(orderId, "proof_uploaded");
    sendTelegramNotify(orderId, "proof_uploaded");
    fetchOrders();
    return { ok: true };
  };
  // Customer membatalkan pesanan yang belum dibayar (misal salah pilih / mau ganti metode).
  const cancelOrder = async (orderId) => {
    const { error } = await supabase.rpc("cancel_my_order", { p_order_id: orderId });
    if (error) { toast.error(error.message); return; }
    fetchOrders();
  };
  const goToPaymentConfirm = (orderId) => {
    setPendingOrderId(orderId);
    go("paymentconfirm");
  };
  // Tandai 1 video selesai ditonton. Update state lokal dulu (biar terasa instan di LearnPage),
  // lalu simpan permanen ke tabel video_progress supaya tidak hilang saat logout/ganti perangkat.
  // "idx" tetap dipakai di seluruh UI (LearnPage, ProductCard, dll), tapi yang disimpan ke database
  // adalah video_id asli-nya — lebih tahan kalau urutan kurikulum berubah di kemudian hari.
  const markVideoComplete = (productId, idx) => {
    setVideoProgress((prev) => {
      const list = prev[productId] || [];
      if (list.includes(idx)) return prev;
      return { ...prev, [productId]: [...list, idx] };
    });
    if (!session) return; // belum login (seharusnya tidak terjadi di halaman ini, jaga-jaga saja)
    const video = curriculumData[productId]?.[idx];
    if (!video?.id) return; // data kurikulum belum termuat, lewati simpan ke server kali ini
    supabase.from("video_progress").insert({
      customer_id: session.user.id, product_id: productId, video_id: video.id,
    }).then(({ error }) => {
      // 23505 = baris sudah ada (unique constraint) — aman diabaikan, bukan error sungguhan
      if (error && error.code !== "23505") console.error("Gagal menyimpan progres video:", error.message);
    });
  };
  // Dipakai setelah checkout/konfirmasi pembayaran supaya customer selalu mendarat di tab
  // Ringkasan (yang menampilkan pesanan Menunggu juga), bukan di tab terakhir yang mereka buka
  // sebelumnya (misal "Produk Saya", yang cuma menampilkan produk yang sudah PAID — kalau
  // mendarat di situ, produk yang baru dibeli terlihat seperti "hilang" padahal masih pending).
  const goToCustomerOverview = () => {
    setCustomerSub("overview");
    go("customer");
  };
  const cartProducts = cart.map((e) => {
    const p = products.find((x) => x.id === e.id);
    if (!p) return null;
    const o = p.productType !== "physical" ? cartPrices[e.id] : null;
    const base = { ...p, cartKey: e.key, variant: e.variant, qty: p.productType === "physical" ? e.qty : 1 };
    return o ? { ...base, price: o.price, oldPrice: o.oldPrice, lpSlug: o.lpSlug } : base;
  }).filter(Boolean);
  const cartIds = cart.map((e) => e.id);
  const cartCount = cart.reduce((sum, e) => sum + (e.qty || 1), 0);
  const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const addProduct = async (data, items = []) => {
    let baseSlug = slugify(data.name) || `produk-${Date.now()}`;
    let slug = baseSlug;
    let n = 2;
    while (products.some((p) => p.slug === slug)) { slug = `${baseSlug}-${n}`; n++; }
    const videoCount = items.filter((it) => it.type !== "section").length;
    const { data: inserted, error } = await supabase.from("products").insert({
      slug, name: data.name, category: data.category, level: data.level,
      price: data.price, old_price: data.oldPrice || data.price, rating: 0, reviews: 0, sold: 0,
      badge: "New", duration: data.productType === "physical" ? "" : (data.duration || `${videoCount} video`), format: data.format || "Video Course",
      hue: data.hue || "#C9A24B", description: data.desc || "", benefits: data.benefits || [], learn_points: data.learn || [],
      bonus: data.bonus || "", status: data.status || "draft", preview_video: data.previewVideo || "",
      sort_order: products.length,
      product_type: data.productType === "physical" ? "physical" : "digital",
      ...(data.productType === "physical" ? { stock: data.stock ?? null, variants: data.variants || [], images: data.images || [], weight_grams: data.weightGrams ?? null } : {}),
    }).select().single();
    if (error) { toast.error("Gagal menambah produk: " + error.message); return null; }
    if (items && items.length > 0) {
      const { error: curErr } = await supabase.rpc("admin_save_curriculum", { p_product_id: inserted.id, p_items: items });
      if (curErr) toast.error("Produk tersimpan, tapi materi gagal disimpan: " + curErr.message);
    }
    await fetchProducts();
    await fetchCurriculum();
    return mapProductRow(inserted);
  };
  const updateProduct = async (id, data, items = []) => {
    const videoCount = items.filter((it) => it.type !== "section").length;
    // Optimis: tampilan materi langsung berubah (mis. setelah geser urutan), server menyusul.
    setCurriculumOutline((prev) => ({ ...prev, [id]: items }));
    setCurriculumData((prev) => ({ ...prev, [id]: items.filter((it) => it.type !== "section").map(({ id: vid, title, desc, url, duration }) => ({ id: vid, title, desc, url, duration })) }));
    const payload = {
      name: data.name, category: data.category, level: data.level,
      price: data.price, old_price: data.oldPrice || data.price, description: data.desc || "",
      status: data.status || "published", preview_video: data.previewVideo || "",
      benefits: data.benefits || [], learn_points: data.learn || [], bonus: data.bonus || "",
    };
    if (data.productType === "physical") {
      Object.assign(payload, { stock: data.stock ?? null, variants: data.variants || [], images: data.images || [], weight_grams: data.weightGrams ?? null });
    }
    if (videoCount > 0) payload.duration = `${videoCount} video`;
    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) { toast.error("Gagal menyimpan produk: " + error.message); return; }
    // Materi disimpan lewat RPC yang MEMPERTAHANKAN id video lama (update di tempat), bukan
    // hapus-semua-lalu-buat-ulang — kalau id berubah, progres belajar semua member ikut hilang.
    const { error: curErr } = await supabase.rpc("admin_save_curriculum", { p_product_id: id, p_items: items || [] });
    if (curErr) toast.error("Gagal menyimpan materi: " + curErr.message);
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
  const reorderProducts = async (next) => {
    setProducts(next);
    const { error } = await supabase.rpc("admin_reorder_products", { p_ids: next.map((p) => p.id) });
    if (error) { toast.error("Urutan gagal disimpan: " + error.message); fetchProducts(); return; }
    toast.success("Urutan produk disimpan");
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
    const row = {
      slug, name: form.name, product_id: form.productId,
      headline: form.headline || "", subheadline: form.subheadline || "",
      video_url: form.videoUrl || "", badge_text: form.badgeText || "",
      status: form.status || "published",
    };
    if (form.template && form.template !== "gold") row.extra = { template: form.template };
    const { error } = await supabase.from("landing_pages").insert(row);
    fetchLandingPages();
    return { ok: !error, error: error?.message, slug };
  };
  const updateLandingPage = async (id, form) => {
    // Kolom biasa (headline/subheadline/dst) dan patch parsial dari edit-inline di halaman
    // (mis. cuma { extra: {...} } saja waktu isi 1 field lewat pensil) sama-sama lewat sini.
    const payload = {};
    if (form.name !== undefined) payload.name = form.name;
    if (form.productId !== undefined) payload.product_id = form.productId;
    if (form.status !== undefined) payload.status = form.status;
    if (form.headline !== undefined) payload.headline = form.headline || "";
    if (form.subheadline !== undefined) payload.subheadline = form.subheadline || "";
    if (form.videoUrl !== undefined) payload.video_url = form.videoUrl || "";
    if (form.badgeText !== undefined) payload.badge_text = form.badgeText || "";
    if (form.extra !== undefined) payload.extra = form.extra;
    const { error } = await supabase.from("landing_pages").update(payload).eq("id", id);
    fetchLandingPages();
    return { ok: !error, error: error?.message };
  };
  const deleteLandingPage = async (id) => {
    await supabase.from("landing_pages").delete().eq("id", id);
    fetchLandingPages();
  };
  const addCoupon = async (data) => {
    const { error } = await supabase.from("coupons").insert({
      code: data.code, type: data.type, value: data.value,
      min_purchase: data.minPurchase || 0, usage_limit: data.limit || 0, used: 0, expiry: data.expiry || null,
    });
    if (error) toast.error(error.code === "23505" ? "Kode kupon itu sudah ada." : "Gagal menyimpan kupon: " + error.message);
    fetchCoupons();
  };
  const deleteCoupon = async (code) => {
    const { data, error } = await supabase.from("coupons").delete().eq("code", code).select();
    if (error || !data || data.length === 0) {
      toast.error("Kupon gagal dihapus. Coba muat ulang halaman dan pastikan kamu masih login sebagai admin.");
    }
    if (coupon?.code === code) setCoupon(null);
    fetchCoupons();
  };
  // Kupon dicek ke server (RPC validate_coupon: kode, kedaluwarsa, kuota, minimum belanja).
  // Hasilnya disimpan di state "coupon" hanya untuk menampilkan perkiraan diskon — angka final
  // tetap dihitung ulang oleh database saat pesanan dibuat.
  const validateCoupon = async (code, subtotal) => {
    if (!session) return { ok: false, error: "Masuk dulu untuk memakai kupon." };
    const { data, error } = await supabase.rpc("validate_coupon", { p_code: code, p_subtotal: subtotal });
    if (error) return { ok: false, error: "Gagal mengecek kupon. Coba lagi." };
    const r = Array.isArray(data) ? data[0] : data;
    if (!r?.ok) return { ok: false, error: r?.error || "Kode kupon tidak valid." };
    return { ok: true, coupon: { code: r.code, type: r.coupon_type, value: r.coupon_value, minPurchase: r.min_purchase || 0 } };
  };
  const calcDiscount = (subtotal, c) => {
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
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        :root {
          --gs-ease: cubic-bezier(0.22, 1, 0.36, 1);
          --gs-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; min-height: 100%; background: ${C.bg}; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Manrope', sans-serif; -webkit-font-smoothing: antialiased; }
        a { text-decoration: none; }
        input:focus, select:focus, textarea:focus { outline: none; box-shadow: 0 0 0 4px ${C.gold}26; border-color: ${C.gold} !important; }
        input, select, textarea, button { transition: box-shadow .25s var(--gs-ease), border-color .25s var(--gs-ease), background-color .2s var(--gs-ease), transform .18s var(--gs-spring), opacity .2s ease; }
        ::placeholder { color: ${C.mutedDark}; }
        table td, table th { white-space: nowrap; }
        table { min-width: 560px; }
        .gs-scroll-hint { display: none; }
        .gs-edit-pencil { opacity: 0.55; transition: opacity .15s, transform .18s var(--gs-spring); }
        .gs-editable:hover .gs-edit-pencil { opacity: 1; }
        .gs-edit-pencil:hover { transform: scale(1.12); }
        .gs-edit-pencil:active { transform: scale(0.92); }

        /* ---- gerakan ala iOS: transisi lembut & pantulan halus (spring) ---- */
        @keyframes gsFadeInUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gsFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gsPopIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
        @keyframes gsSlideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gsPulseRing { 0% { box-shadow: 0 0 0 0 ${C.gold}55; } 70% { box-shadow: 0 0 0 10px ${C.gold}00; } 100% { box-shadow: 0 0 0 0 ${C.gold}00; } }

        .gs-anim-in { animation: gsFadeInUp .6s var(--gs-ease) both; }
        .gs-anim-in-1 { animation-delay: .05s; }
        .gs-anim-in-2 { animation-delay: .12s; }
        .gs-anim-in-3 { animation-delay: .19s; }
        .gs-anim-in-4 { animation-delay: .26s; }

        .gs-header { transition: background-color .3s var(--gs-ease); }

        .gs-btn { transition: transform .25s var(--gs-spring), opacity .18s ease, box-shadow .3s var(--gs-ease), background-color .2s ease, border-color .25s ease; will-change: transform; -webkit-tap-highlight-color: transparent; }
        .gs-btn:not(:disabled):hover { transform: translateY(-2px); }
        .gs-btn:not(:disabled):active { transform: scale(0.96) translateY(0); transition-duration: .08s; }
        .gs-btn-icon { transition: transform .3s var(--gs-spring); }
        .gs-btn:not(:disabled):hover .gs-btn-icon { transform: translateX(3px); }
        /* kilau yang menyapu tombol emas saat hover */
        .gs-btn-primary::before { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.55) 45%, transparent 70%); transform: translateX(-120%); transition: transform .8s var(--gs-ease); }
        .gs-btn-primary:not(:disabled):hover::before { transform: translateX(120%); }
        .gs-btn-primary:not(:disabled):hover { box-shadow: 0 12px 28px rgba(184,137,46,0.42), inset 0 1px 0 rgba(255,255,255,0.5) !important; }
        .gs-btn-ghost:not(:disabled):hover { border-color: ${C.gold} !important; box-shadow: 0 8px 20px rgba(0,0,0,0.08), 0 0 0 3px ${C.gold}1F; }
        .gs-ripple { position: absolute; border-radius: 50%; pointer-events: none; background: currentColor; opacity: .22; transform: scale(0); animation: gsRipple .6s var(--gs-ease) forwards; z-index: -1; }
        @keyframes gsRipple { to { transform: scale(1); opacity: 0; } }
        .gs-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent; animation: gsSpin .7s linear infinite; flex-shrink: 0; }
        @keyframes gsSpin { to { transform: rotate(360deg); } }
        .gs-badge-dot { animation: gsPulseDot 1.8s ease-in-out infinite; }
        @keyframes gsPulseDot { 0%,100% { opacity: 1; } 50% { opacity: .35; } }

        /* toast */
        .gs-toast { animation: gsToastIn .45s var(--gs-spring) both; }
        .gs-toast-out { animation: gsToastOut .35s var(--gs-ease) both; }
        @keyframes gsToastIn { from { opacity: 0; transform: translateY(16px) scale(.96); } to { opacity: 1; transform: none; } }
        @keyframes gsToastOut { to { opacity: 0; transform: translateY(10px) scale(.97); } }

        /* sidebar dashboard */
        .gs-sidebar-pill { transition: top .45s var(--gs-spring), left .45s var(--gs-spring), width .45s var(--gs-spring), height .45s var(--gs-spring); }
        .gs-side-item { transition: color .2s ease, transform .2s var(--gs-spring); -webkit-tap-highlight-color: transparent; }
        .gs-side-item:hover { color: ${C.text} !important; }
        .gs-side-item:active { transform: scale(.97); }
        .gs-side-item:hover .gs-side-icon { transform: rotate(-8deg) scale(1.1); }
        .gs-side-icon { transition: transform .3s var(--gs-spring); }

        /* kartu statistik: garis emas "senar" di atas saat hover */
        .gs-stat::after { content: ""; position: absolute; left: 18px; right: 18px; top: 0; height: 2px; border-radius: 2px; background: linear-gradient(90deg, transparent, ${C.gold}, transparent); transform: scaleX(0); transition: transform .5s var(--gs-ease); }
        .gs-stat:hover::after { transform: scaleX(1); }
        .gs-stat:hover .gs-stat-icon { transform: rotate(-10deg) scale(1.08); }
        .gs-stat-icon { transition: transform .35s var(--gs-spring); }

        /* chip filter / pil pilihan */
        .gs-chip { transition: all .25s var(--gs-ease); -webkit-tap-highlight-color: transparent; }
        .gs-chip:hover { border-color: ${C.gold} !important; color: ${C.text} !important; }
        .gs-chip:active { transform: scale(.95); }

        /* link navigasi header dengan garis bawah yang tumbuh */
        .gs-nav-link { position: relative; }
        .gs-nav-link::after { content: ""; position: absolute; left: 2px; right: 2px; bottom: 0; height: 2px; border-radius: 2px; background: ${C.gold}; transform: scaleX(0); transition: transform .35s var(--gs-spring); }
        .gs-nav-link:hover::after, .gs-nav-link.is-active::after { transform: scaleX(1); }

        /* skeleton loading */
        .gs-skeleton { background: linear-gradient(90deg, ${C.surface2} 25%, ${C.border} 37%, ${C.surface2} 63%); background-size: 400% 100%; animation: gsShimmer 1.4s ease infinite; border-radius: 12px; }
        @keyframes gsShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

        /* kartu lanjutkan belajar */
        .gs-continue .gs-continue-media { transition: transform .6s var(--gs-ease); }
        .gs-continue:hover .gs-play-orb { transform: scale(1.12); background: rgba(212,169,74,0.85) !important; border-color: #F3D27A !important; }
        .gs-play-orb { transition: transform .4s var(--gs-spring), background .3s ease; animation: gsOrb 2.4s ease-in-out infinite; }
        @keyframes gsOrb { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.35); } 60% { box-shadow: 0 0 0 16px rgba(255,255,255,0); } }
        .gs-progress-fill { animation: gsGrow 1.1s var(--gs-ease) both; transform-origin: left; }
        @keyframes gsGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @media (max-width: 760px) { .gs-continue { grid-template-columns: 1fr !important; } }
        @media (max-width: 480px) { .gs-buy-row { flex-direction: column; } }

        .gs-next-card:hover .gs-btn-icon { transform: translateX(4px); }
        .gs-celebrate { animation: gsPopIn .6s var(--gs-spring) both; }
        .gs-confetti { position: absolute; top: -10px; width: 7px; height: 12px; border-radius: 2px; opacity: 0; animation: gsConfetti 2.6s ease-in infinite; }
        @keyframes gsConfetti { 0% { opacity: 1; transform: translateY(0) rotate(0); } 100% { opacity: 0; transform: translateY(170px) rotate(540deg); } }

        .gs-lesson-row { transition: background .25s ease, transform .2s var(--gs-spring); }
        .gs-lesson-row:hover { background: ${C.surface2}; }
        .gs-lesson-row:active { transform: scale(.98); }

        .gs-qty-num { animation: gsPopIn .3s var(--gs-spring) both; }
        .gs-float { animation: gsFloat 3.2s ease-in-out infinite; }
        @keyframes gsFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

        .gs-gallery-img { animation: gsFadeIn .45s var(--gs-ease) both; transition: transform .8s var(--gs-ease); }
        .gs-gallery-main:hover .gs-gallery-img { transform: scale(1.06); }
        .gs-thumb-btn { transition: opacity .2s ease, border-color .2s ease, transform .2s var(--gs-spring); }
        .gs-thumb-btn:hover { opacity: 1 !important; transform: translateY(-2px); }
        .gs-variant:not(:disabled):active { transform: scale(.94); }

        /* kartu produk */
        .gs-pc-img { transition: transform .9s var(--gs-ease); }
        .gs-product-card:hover .gs-pc-img { transform: scale(1.08); }
        .gs-pc-shine { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 48%, transparent 66%); transform: translateX(-120%); transition: transform 1s var(--gs-ease); pointer-events: none; }
        .gs-product-card:hover .gs-pc-shine { transform: translateX(120%); }
        .gs-pc-play { transition: transform .4s var(--gs-spring), background .3s ease; }
        .gs-product-card:hover .gs-pc-play { transform: scale(1.15); background: rgba(212,169,74,0.85) !important; }

        .gs-modal { animation: gsPopIn .4s var(--gs-spring) both; }
        .gs-upload-tile { transition: background .25s ease, transform .25s var(--gs-spring); }
        .gs-upload-tile:hover { background: ${C.gold}1F !important; transform: translateY(-2px); }

        /* sakelar on/off */
        .gs-switch { position: relative; width: 44px; height: 26px; border-radius: 999px; background: ${C.border}; transition: background .3s var(--gs-ease); padding: 0; flex-shrink: 0; }
        .gs-switch.on { background: linear-gradient(135deg, #F3D27A, ${C.gold}); }
        .gs-switch-knob { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.25); transition: transform .35s var(--gs-spring); }
        .gs-switch.on .gs-switch-knob { transform: translateX(18px); }
        .gs-switch:active .gs-switch-knob { width: 24px; }
        @media (max-width: 560px) { .gs-row-actions button[title="Lihat halaman produk"] { display: none !important; } }

        /* tahan & geser */
        .gs-sort-item { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
        .gs-sort-item > * { transition: transform .3s var(--gs-spring), box-shadow .3s var(--gs-ease); }
        .gs-sort-item.is-shifting { transition: transform .32s var(--gs-spring); }
        .gs-sort-item.is-pressing > * { transform: scale(.975); transition: transform .32s ease; }
        .gs-sort-item.is-dragging { cursor: grabbing; }
        .gs-sort-item.is-dragging > * { transform: scale(1.025) rotate(-.4deg); box-shadow: 0 24px 48px rgba(0,0,0,.22), 0 0 0 2px ${C.gold} !important; }
        .gs-grip:hover { color: ${C.gold} !important; background: ${C.gold}14; }
        body.gs-dragging, body.gs-dragging * { cursor: grabbing !important; -webkit-user-select: none; user-select: none; }

        ::selection { background: ${C.gold}55; }
        *::-webkit-scrollbar { width: 10px; height: 10px; }
        *::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; }
        *::-webkit-scrollbar-thumb:hover { background: ${C.gold}88; background-clip: padding-box; border: 2px solid transparent; }
        button:focus-visible, a:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }

        .gs-icon-btn { transition: transform .22s var(--gs-spring), background-color .2s ease; }
        .gs-icon-btn:hover { transform: translateY(-1px) scale(1.04); }
        .gs-icon-btn:active { transform: scale(0.92); }
        .gs-cart-badge { animation: gsPopIn .35s var(--gs-spring) both; }

        .gs-card { transition: transform .35s var(--gs-spring), box-shadow .35s var(--gs-ease), border-color .3s ease; }
        .gs-card-hover:hover { transform: translateY(-4px); box-shadow: 0 18px 38px rgba(0,0,0,0.10), 0 0 0 1px ${C.gold}40 !important; border-color: ${C.gold}55 !important; }
        .gs-card-click { cursor: pointer; }
        .gs-card-hover:active { transform: translateY(-1px) scale(0.995); }

        .gs-mobile-menu { animation: gsSlideDown .32s var(--gs-ease) both; transform-origin: top center; }
        .gs-page-enter { animation: gsFadeIn .45s var(--gs-ease) backwards; }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
        }
        @media (max-width: 860px) {
          .gs-desktop-nav { display: none !important; }
          .gs-sidebar-logout { display: none !important; }
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

      <ToastHost />
      {view !== "lp" && <Header view={view} go={go} goOrAuth={goOrAuth} goToAuth={goToAuth} cartCount={cartCount} role={role} accountName={currentAccount?.name || "Akun"} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} customPages={customPages} openCustomPage={openCustomPage} customPageSlug={customPageSlug} content={siteContent.header} editMode={editMode} setEditMode={setEditMode} onSaveHeader={(data) => updateSiteContent("header", data)} goToAddPage={goToAddPage} theme={theme} onToggleTheme={toggleTheme} onLogout={logout} />}

      <div key={view + (productSlug || "") + (customPageSlug || "")} className="gs-page-enter">
      {view === "home" && <HomePage go={go} openProduct={openProduct} addToCart={addToCart} cart={cartIds} ownedIds={ownedIds} pendingIds={pendingIds} accessProduct={accessProduct} videoProgress={videoProgress} products={products} curriculumData={curriculumData} content={siteContent} role={role} editMode={editMode} updateSiteContent={updateSiteContent} onToggleStatus={toggleProductStatus} testimonials={testimonials} continueItems={continueItems} onResume={resumeLesson} />}
      {view === "shop" && <ShopPage go={go} openProduct={openProduct} addToCart={addToCart} cart={cartIds} ownedIds={ownedIds} pendingIds={pendingIds} accessProduct={accessProduct} videoProgress={videoProgress} products={products} curriculumData={curriculumData} content={siteContent} role={role} onToggleStatus={toggleProductStatus} />}
      {view === "product" && <ProductPage slug={productSlug} go={go} addToCart={addToCart} cart={cartIds} ownedIds={ownedIds} pendingIds={pendingIds} accessProduct={accessProduct} videoProgress={videoProgress} products={products} curriculumData={curriculumData} testimonials={testimonials} addTestimonial={addTestimonial} role={role} onToggleStatus={toggleProductStatus} shipping={siteContent.shipping} />}
      {view === "cart" && <CartPage go={go} cartProducts={cartProducts} removeFromCart={removeFromCart} updateCartQty={updateCartQty} shipping={siteContent.shipping} coupon={coupon} setCoupon={setCoupon} validateCoupon={validateCoupon} calcDiscount={calcDiscount} />}
      {view === "checkout" && (
        currentAccount ? (
          <CheckoutPage go={go} cartProducts={cartProducts} shipping={siteContent.shipping} savedAddress={profile?.address} coupon={coupon} setCoupon={setCoupon} validateCoupon={validateCoupon} clearCart={clearCart} addOrder={addOrder} calcDiscount={calcDiscount} goToPaymentConfirm={goToPaymentConfirm} account={currentAccount} paymentMethods={paymentMethods} />
        ) : (
          <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted }}>Sesi kamu sudah berakhir. Silakan masuk kembali.</p>
            <div style={{ marginTop: 16 }}><PrimaryBtn onClick={() => go("auth")}>Masuk</PrimaryBtn></div>
          </div>
        )
      )}
      {view === "paymentconfirm" && <PaymentConfirmationPage go={go} order={orders.find((o) => o.id === pendingOrderId)} attachPaymentProof={attachPaymentProof} bankInfo={bankInfo} paymentMethods={paymentMethods} goToCustomerOverview={goToCustomerOverview} />}
      {view === "auth" && <AuthPage go={go} onCustomerLogin={onCustomerLogin} onCustomerRegister={onCustomerRegister} onAdminLogin={onAdminLogin} onForgotPassword={forgotPassword} onBack={onBack} />}
      {view === "resetpassword" && <ResetPasswordPage go={go} onSubmit={resetPasswordConfirm} />}
      {view === "about" && <AboutPage go={go} content={siteContent.about} footerContent={siteContent.footer} role={role} editMode={editMode} updateSiteContent={updateSiteContent} />}
      {view === "lp" && <LandingPageRouter lp={landingPages.find((l) => l.slug === lpSlug)} go={go} applyPricingAndBuy={applyPricingAndBuy} products={products} testimonials={testimonials} addTestimonial={addTestimonial} ownedIds={ownedIds} pendingIds={pendingIds} role={role} lpEditMode={lpEditMode} setLpEditMode={setLpEditMode} onSaveLp={updateLandingPage} goToAdmin={() => go("admin")} />}
      {(view === "privacy" || view === "terms" || view === "refund") && <LegalPage slug={view} go={go} />}
      {view === "custompage" && <CustomPageView slug={customPageSlug} customPages={customPages} products={products} go={go} openProduct={openProduct} addToCart={addToCart} cart={cartIds} ownedIds={ownedIds} pendingIds={pendingIds} accessProduct={accessProduct} videoProgress={videoProgress} curriculumData={curriculumData} role={role} onToggleStatus={toggleProductStatus} />}
      {view === "customer" && (
        currentAccount ? (
          <CustomerDashboard go={go} sub={customerSub} setSub={setCustomerSub} orders={orders} account={currentAccount} onLogout={logout} onUpdateProfile={updateCustomerProfile} videoProgress={videoProgress} products={products} curriculumData={curriculumData} goToPaymentConfirm={goToPaymentConfirm} accessProduct={accessProduct} onCancelOrder={cancelOrder} continueItems={continueItems} onResume={resumeLesson} />
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
        return <LearnPage slug={productSlug} go={go} progress={videoProgress} onMarkComplete={markVideoComplete} current={videoCurrent} setCurrent={setVideoCurrent} products={products} curriculumData={curriculumData} curriculumOutline={curriculumOutline} role={role} learnEditMode={learnEditMode} setLearnEditMode={setLearnEditMode} onSaveProduct={updateProduct} goToAdmin={() => go("admin")} />;
      })()}
      {view === "admin" && <AdminDashboard go={go} sub={adminSub} setSub={setAdminSub} onLogout={logout} products={products} addProduct={addProduct} updateProduct={updateProduct} toggleProductStatus={toggleProductStatus} deleteProduct={deleteProduct} reorderProducts={reorderProducts} curriculumData={curriculumData} curriculumOutline={curriculumOutline} coupons={coupons} addCoupon={addCoupon} deleteCoupon={deleteCoupon} siteContent={siteContent} updateSiteContent={updateSiteContent} customPages={customPages} addCustomPage={addCustomPage} updateCustomPage={updateCustomPage} deleteCustomPage={deleteCustomPage} tampilanSub={tampilanSub} setTampilanSub={setTampilanSub} orders={orders} updateOrderStatus={updateOrderStatus} updateFulfillment={updateFulfillment} bankInfo={bankInfo} updateBankInfo={updateBankInfo} paymentMethods={paymentMethods} addPaymentMethod={addPaymentMethod} updatePaymentMethod={updatePaymentMethod} togglePaymentMethod={togglePaymentMethod} deletePaymentMethod={deletePaymentMethod} reorderPaymentMethods={reorderPaymentMethods} onChangeAdminPassword={changeAdminPassword} onExportData={exportAllData} onResetData={resetAllData} totalVisits={totalVisits} countVisitsSince={countVisitsSince} members={members} landingPages={landingPages} addLandingPage={addLandingPage} updateLandingPage={updateLandingPage} deleteLandingPage={deleteLandingPage} openLandingPage={openLandingPage} openLearnEditor={openLearnEditor} />}
      </div>
    </div>
  );
}
