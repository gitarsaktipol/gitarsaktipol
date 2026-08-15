import React, { useState, useMemo, useEffect } from "react";
import {
  Menu, X, Search, ShoppingCart, Star, PlayCircle, Lock, Check, ChevronRight,
  ChevronDown, User, LogOut, LayoutDashboard, Package, ClipboardList, Users,
  Tag, BarChart3, Settings, TrendingUp, DollarSign, ShoppingBag, Plus, Trash2,
  Pencil, ArrowRight, ArrowLeft, Sparkles, Eye, Filter, Music, Clock, Download,
  CreditCard, QrCode, Wallet, ShieldCheck, Youtube, Instagram
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";

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
const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const formatDateID = (d) => `${d.getDate().toString().padStart(2, "0")} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
const makeOrderId = (seq) => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}`;
  return `GS-${ymd}-${seq.toString().padStart(3, "0")}`;
};

/* ---------------- demo data ---------------- */
const CATEGORIES = [
  "Beginner Guitar", "Guitar Technique", "Melody", "Speed & Shredding",
  "Improvisation", "Music Theory", "Ebook", "Bundle",
];

const INITIAL_PRODUCTS = [
  {
    id: 1, slug: "secret-of-shredding", name: "Secret of Shredding",
    category: "Speed & Shredding", level: "Mahir", price: 199000, oldPrice: 1500000,
    rating: 4.9, reviews: 412, sold: 1240, badge: "Best Seller",
    duration: "8 jam video", format: "Video Course + Tab PDF",
    hue: "#B8432A",
    desc: "Program latihan terstruktur untuk menguasai alternate picking, economy picking, dan speed building tanpa merusak teknik dasarmu.",
    benefits: ["Kecepatan picking naik terukur tiap minggu", "Teknik tangan kanan & kiri sinkron", "Latihan metronome bertahap 60-200 BPM", "Bebas tension & cedera saat bermain cepat"],
    learn: ["Alternate picking fundamental", "Economy picking & sweep dasar", "String skipping presisi", "3 lagu shred untuk latihan aplikatif"],
    bonus: "Ebook 40 Warm-up Wajib Sebelum Latihan (gratis, tanpa batas waktu)",
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

const DEMO_CUSTOMER = { name: "Andra Saputra", email: "andra.saputra@email.com", phone: "0812-3456-7890" };

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

const ADMIN_ORDERS = [
  { id: "GS-20260813-118", customer: "Sinta Marlina", product: "Bundle Gitaris Lengkap", amount: 599000, method: "QRIS", payment: "Paid", status: "Selesai", date: "13 Agu 2026" },
  { id: "GS-20260813-117", customer: "Fajar Nugroho", product: "Secret of Shredding", amount: 199000, method: "Transfer Bank", payment: "Pending", status: "Menunggu", date: "13 Agu 2026" },
  { id: "GS-20260812-116", customer: "Wulan Sari", product: "Fondasi Gitar untuk Pemula", amount: 149000, method: "E-wallet", payment: "Paid", status: "Selesai", date: "12 Agu 2026" },
  { id: "GS-20260812-115", customer: "Bima Aditya", product: "Ebook 100 Lick Legendaris", amount: 79000, method: "QRIS", payment: "Failed", status: "Gagal", date: "12 Agu 2026" },
  { id: "GS-20260811-114", customer: "Andra Saputra", product: "Secret of Shredding", amount: 199000, method: "QRIS", payment: "Paid", status: "Selesai", date: "10 Agu 2026" },
];

const ADMIN_CUSTOMERS = [
  { name: "Andra Saputra", email: "andra.saputra@email.com", orders: 3, spending: 656000, joined: "12 Mar 2026" },
  { name: "Sinta Marlina", email: "sinta.marlina@email.com", orders: 1, spending: 599000, joined: "13 Agu 2026" },
  { name: "Fajar Nugroho", email: "fajar.n@email.com", orders: 1, spending: 199000, joined: "02 Jun 2026" },
  { name: "Wulan Sari", email: "wulan.sari@email.com", orders: 2, spending: 278000, joined: "20 Apr 2026" },
];

const INITIAL_COUPONS = [
  { code: "MERDEKA25", type: "percent", value: 25, minPurchase: 150000, limit: 200, used: 84, expiry: "31 Agu 2026" },
  { code: "PEMULA20K", type: "fixed", value: 20000, minPurchase: 100000, limit: 500, used: 312, expiry: "30 Sep 2026" },
];

const REVENUE_7D = [
  { day: "7 Agu", revenue: 1840000 }, { day: "8 Agu", revenue: 2210000 },
  { day: "9 Agu", revenue: 1650000 }, { day: "10 Agu", revenue: 2980000 },
  { day: "11 Agu", revenue: 2340000 }, { day: "12 Agu", revenue: 3120000 },
  { day: "13 Agu", revenue: 3860000 },
];

const FUNNEL = [
  { stage: "Kunjungan", value: 18400 }, { stage: "Lihat Produk", value: 9820 },
  { stage: "Add to Cart", value: 3260 }, { stage: "Checkout", value: 1480 },
  { stage: "Pembayaran", value: 1120 }, { stage: "Pembelian", value: 968 },
];

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

function Card({ children, style }) {
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, ...style }}>{children}</div>;
}

/* ---------------- product card ---------------- */
function ProductCard({ p, onOpen, onAdd, inCart, owned, onAccess, videoProgress, curriculumData }) {
  const disc = Math.round((1 - p.price / p.oldPrice) * 100);
  const curriculum = curriculumData?.[p.id];
  const completedCount = (videoProgress?.[p.id] || []).length;
  const pct = curriculum ? Math.round((completedCount / curriculum.length) * 100) : null;
  return (
    <Card style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div onClick={() => onOpen(p.slug)} style={{ cursor: "pointer", height: 148, background: `linear-gradient(135deg, ${p.hue}33, ${C.surface2})`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${C.border}` }}>
        <Music size={36} color={p.hue} strokeWidth={1.3} />
        {owned ? (
          <div style={{ position: "absolute", top: 10, left: 10 }}><Badge tone="gold">Dimiliki</Badge></div>
        ) : p.badge && <div style={{ position: "absolute", top: 10, left: 10 }}><Badge tone={p.badge === "Best Seller" ? "ember" : "gold"}>{p.badge}</Badge></div>}
        {!owned && <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.55)", color: C.goldLight, fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6, fontFamily: "'JetBrains Mono',monospace" }}>-{disc}%</div>}
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
        ) : (
          <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 16, color: C.goldLight }}>{rp(p.price)}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: C.mutedDark, textDecoration: "line-through" }}>{rp(p.oldPrice)}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {owned ? (
            <PrimaryBtn small full onClick={() => onAccess(p)} icon={PlayCircle}>Akses Produk</PrimaryBtn>
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
function Header({ view, go, goOrAuth, goToAuth, cartCount, role, setRole, mobileOpen, setMobileOpen }) {
  const navItem = (label, target) => (
    <button onClick={() => go(target)} style={{ background: "none", border: "none", color: view === target ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer", padding: "6px 2px" }}>{label}</button>
  );
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(11,10,15,0.92)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${C.borderSoft}` }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div onClick={() => go("home")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: `linear-gradient(160deg, ${C.goldLight}, ${C.ember})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Music size={18} color="#161019" strokeWidth={2} />
          </div>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1, color: C.text }}>GITAR SAKTI</span>
        </div>

        <div style={{ display: "flex", gap: 24 }} className="gs-desktop-nav">
          {navItem("Beranda", "home")}
          {navItem("Produk", "shop")}
          {navItem("Tentang", "about")}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => goOrAuth("cart")} style={{ position: "relative", background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: "pointer" }}>
            <ShoppingCart size={17} color={C.text} />
            {cartCount > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: C.ember, color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 999, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace" }}>{cartCount}</span>}
          </button>
          {role ? (
            <button onClick={() => go(role === "admin" ? "admin" : "customer")} style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}>
              <User size={15} color={C.goldLight} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 700, color: C.text }} className="gs-desktop-nav">{role === "admin" ? "Admin" : DEMO_CUSTOMER.name}</span>
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }} className="gs-desktop-nav">
              <GhostBtn small onClick={goToAuth}>Masuk</GhostBtn>
              <PrimaryBtn small onClick={goToAuth}>Daftar</PrimaryBtn>
            </div>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="gs-mobile-toggle" style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: "pointer" }}>
            {mobileOpen ? <X size={17} color={C.text} /> : <Menu size={17} color={C.text} />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div style={{ borderTop: `1px solid ${C.borderSoft}`, padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {navItem("Beranda", "home")}
          {navItem("Produk", "shop")}
          {navItem("Tentang", "about")}
          {!role && <><GhostBtn full small onClick={goToAuth}>Masuk</GhostBtn><PrimaryBtn full small onClick={goToAuth}>Daftar</PrimaryBtn></>}
        </div>
      )}
    </div>
  );
}

function Footer({ go }) {
  return (
    <div style={{ borderTop: `1px solid ${C.borderSoft}`, marginTop: 60, padding: "40px 20px 24px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 32 }} className="gs-footer-grid">
        <div>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1, color: C.text }}>GITAR SAKTI</span>
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginTop: 10, lineHeight: 1.6, maxWidth: 280 }}>Platform edukasi gitar digital untuk pemula hingga mahir. Belajar terstruktur, akses selamanya.</p>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}><Instagram size={15} color={C.goldLight} /></div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}><Youtube size={15} color={C.goldLight} /></div>
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
        <span>© 2026 Gitar Sakti. Seluruh hak cipta dilindungi.</span>
        <span onClick={() => go("lp")} style={{ cursor: "pointer", textDecoration: "underline" }}>Pratinjau landing page iklan (demo) →</span>
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
function HomePage({ go, openProduct, addToCart, cart, ownedIds, accessProduct, videoProgress, products, curriculumData }) {
  const featured = products.filter((p) => (p.status || "published") === "published").slice(0, 3);
  return (
    <div>
      <div style={{ borderBottom: `1px solid ${C.borderSoft}`, background: `radial-gradient(1100px 500px at 80% -10%, ${C.ember}22, transparent)` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 20px 40px", display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 40, alignItems: "center" }} className="gs-hero-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <Sparkles size={14} color={C.gold} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, color: C.muted }}>Sudah dipercaya 8.200+ pelajar gitar di Indonesia</span>
            </div>
            <h1 className="gs-hero-title" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 56, lineHeight: 1.02, letterSpacing: 0.5, color: C.text, margin: 0 }}>
              KUASAI GITAR. KUASAI MELODI. <span style={{ color: C.goldLight }}>JADI GITARIS</span> YANG KAMU IMPIKAN.
            </h1>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15.5, color: C.muted, marginTop: 20, maxWidth: 480, lineHeight: 1.65 }}>
              Kursus video terstruktur dari fondasi dasar sampai teknik shredding lanjutan. Belajar sesuai ritme kamu, akses materi selamanya.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <PrimaryBtn onClick={() => go("shop")} icon={ArrowRight}>Lihat Semua Produk</PrimaryBtn>
              <GhostBtn onClick={() => openProduct("secret-of-shredding")} icon={PlayCircle}>Lihat Contoh Materi</GhostBtn>
            </div>
            <div style={{ marginTop: 36, maxWidth: 420 }}><StringDivider /></div>
            <div style={{ display: "flex", gap: 28, marginTop: 18, flexWrap: "wrap" }}>
              {[["8.200+", "Siswa aktif"], ["96%", "Rating positif"], ["6", "Kategori kursus"]].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 20, color: C.goldLight }}>{n}</div>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: "relative", height: 380, borderRadius: 16, background: `linear-gradient(160deg, ${C.surface2}, ${C.bg})`, border: `1px solid ${C.border}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(90deg, ${C.border} 0, ${C.border} 1px, transparent 1px, transparent 46px)` }} />
            {[70, 130, 190, 250, 310].map((top) => (
              <div key={top} style={{ position: "absolute", left: 0, right: 0, top, height: 1.3, background: `linear-gradient(90deg, transparent, ${C.gold}88, transparent)` }} />
            ))}
            <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
              <Music size={64} color={C.goldLight} strokeWidth={1} />
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, marginTop: 12 }}>Video course + tab interaktif</p>
            </div>
          </div>
        </div>
      </div>

      <Section eyebrow="Pilihan Terpopuler" title="Produk Unggulan" sub="Kursus dan materi yang paling banyak dipilih siswa Gitar Sakti bulan ini.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }} className="gs-grid-3">
          {featured.map((p) => <ProductCard key={p.id} p={p} onOpen={openProduct} onAdd={addToCart} inCart={cart.includes(p.id)} owned={ownedIds.includes(p.id)} onAccess={accessProduct} videoProgress={videoProgress} curriculumData={curriculumData} />)}
        </div>
      </Section>

      <div style={{ borderTop: `1px solid ${C.borderSoft}`, borderBottom: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <Section eyebrow="Jelajahi" title="Kategori Belajar" sub="Dari nol sampai teknik lanjutan, semua level tersedia.">
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

      <Section eyebrow="Kenapa Gitar Sakti" title="Belajar dengan Jalur yang Jelas" sub="Struktur kurikulum mengikuti posisi fret 3, 5, 7, 9, dan 12 — titik penanda yang dikenal setiap gitaris.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 22 }} className="gs-grid-2">
          {[
            ["Fret 3 — Fondasi kuat", "Materi disusun bertahap, tidak melompat sebelum dasar benar-benar melekat."],
            ["Fret 5 — Latihan terarah", "Setiap course punya target latihan mingguan yang jelas dan bisa diukur."],
            ["Fret 7 — Praktik nyata", "Belajar lewat lagu dan backing track, bukan cuma teori di atas kertas."],
            ["Fret 9 — Akses selamanya", "Satu kali beli, materi dapat diputar ulang kapan pun kamu butuh."],
            ["Fret 12 — Dari pemula ke mahir", "Jalur lengkap dari chord pertama sampai teknik shredding lanjutan."],
          ].map(([h, d]) => (
            <div key={h} style={{ display: "flex", gap: 12 }}>
              <FretDot />
              <div>
                <h4 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, margin: 0 }}>{h}</h4>
                <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <Section eyebrow="Kata Mereka" title="Cerita dari Siswa Gitar Sakti">
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

      <Section eyebrow="Sering Ditanyakan" title="FAQ">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQ_HOME.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </Section>

      <div style={{ borderTop: `1px solid ${C.borderSoft}` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "56px 20px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: C.text, margin: 0 }}>SIAP MULAI PERJALANAN GITARMU?</h2>
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted, marginTop: 10 }}>Pilih course pertama kamu hari ini dan mulai latihan terstruktur.</p>
          <div style={{ marginTop: 20 }}><PrimaryBtn onClick={() => go("shop")} icon={ArrowRight}>Jelajahi Produk</PrimaryBtn></div>
        </div>
      </div>

      <Footer go={go} />
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
function ShopPage({ go, openProduct, addToCart, cart, ownedIds, accessProduct, videoProgress, products, curriculumData }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Semua");
  const [sort, setSort] = useState("Terbaru");

  const filtered = useMemo(() => {
    let list = products.filter((p) => (p.status || "published") === "published");
    list = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    if (cat !== "Semua") list = list.filter((p) => p.category === cat);
    if (sort === "Harga Terendah") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "Harga Tertinggi") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "Terlaris") list = [...list].sort((a, b) => b.sold - a.sold);
    if (sort === "Rating") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [q, cat, sort, products]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 20px 60px" }}>
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: C.gold }}>Katalog</span>
        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, color: C.text, margin: "6px 0 0" }}>SEMUA PRODUK</h1>
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
        {filtered.map((p) => <ProductCard key={p.id} p={p} onOpen={openProduct} onAdd={addToCart} inCart={cart.includes(p.id)} owned={ownedIds.includes(p.id)} onAccess={accessProduct} videoProgress={videoProgress} curriculumData={curriculumData} />)}
      </div>
      {filtered.length === 0 && <p style={{ fontFamily: "'Manrope',sans-serif", color: C.muted, textAlign: "center", padding: 40 }}>Tidak ada produk yang cocok dengan pencarianmu.</p>}
    </div>
  );
}

/* ---------------- PRODUCT DETAIL ---------------- */
function ProductPage({ slug, go, addToCart, cart, ownedIds, accessProduct, videoProgress, products, curriculumData }) {
  const p = products.find((x) => x.slug === slug) || products[0];
  const related = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 3);
  const disc = Math.round((1 - p.price / p.oldPrice) * 100);
  const owned = ownedIds.includes(p.id);
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
                <a href={p.previewVideo} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none", height: 300, borderRadius: 14, background: `linear-gradient(135deg, ${p.hue}33, ${C.surface2})`, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
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
              <StarRow rating={p.rating} />
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted }}>{p.rating} · {p.reviews} ulasan · {p.sold} terjual</span>
            </div>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14.5, color: C.muted, lineHeight: 1.7, marginTop: 16, maxWidth: 620 }}>{p.desc}</p>
          </div>

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

          <div style={{ marginTop: 26 }}>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: C.text }}>Manfaat</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {p.benefits.map((b) => (
                <div key={b} style={{ display: "flex", gap: 10 }}><FretDot /><span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted }}>{b}</span></div>
              ))}
            </div>
          </div>

          {related.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>Produk terkait</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }} className="gs-grid-3">
                {related.map((r) => <ProductCard key={r.id} p={r} onOpen={(s) => go("product", s)} onAdd={addToCart} inCart={cart.includes(r.id)} owned={ownedIds.includes(r.id)} onAccess={accessProduct} videoProgress={videoProgress} curriculumData={curriculumData} />)}
              </div>
            </div>
          )}
        </div>

        <div>
          <Card style={{ padding: 20, position: "sticky", top: 90 }}>
            {owned ? (
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

            {!owned && (
              <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
                <Sparkles size={15} color={C.gold} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}><b style={{ color: C.text }}>Bonus:</b> {p.bonus}</span>
              </div>
            )}

            {owned ? (
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: C.surface2, border: `1px solid ${C.gold}` }}>
                  <Check size={15} color={C.gold} />
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700, color: C.goldLight }}>Kamu sudah memiliki produk ini</span>
                </div>
                <PrimaryBtn full onClick={() => accessProduct(p)} icon={PlayCircle}>Akses Produk</PrimaryBtn>
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
function CheckoutPage({ go, cartProducts, coupon, clearCart, orders, addOrder, calcDiscount }) {
  const subtotal = cartProducts.reduce((s, p) => s + p.price, 0);
  const discount = calcDiscount(subtotal, coupon);
  const total = subtotal - discount;
  const [form, setForm] = useState({ name: DEMO_CUSTOMER.name, email: DEMO_CUSTOMER.email, phone: DEMO_CUSTOMER.phone });
  const [method, setMethod] = useState("qris");
  const [error, setError] = useState("");
  const methodLabel = { qris: "QRIS", bank: "Transfer Bank", ewallet: "E-Wallet" };

  const placeOrder = () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) { setError("Lengkapi nama, email, dan nomor WhatsApp terlebih dahulu."); return; }
    if (cartProducts.length === 0) { setError("Keranjang kosong."); return; }
    setError("");
    addOrder({
      id: makeOrderId(orders.length + 1),
      date: formatDateID(new Date()),
      items: cartProducts.map((p) => p.name),
      total,
      payment: "PAID",
      status: "Selesai",
      method: methodLabel[method],
    });
    clearCart();
    go("success");
  };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 20px 60px" }}>
      <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: C.text, margin: "0 0 24px" }}>CHECKOUT</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }} className="gs-hero-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card style={{ padding: 18 }}>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Informasi Pelanggan</h3>
            {[["name", "Nama Lengkap"], ["email", "Email"], ["phone", "Nomor WhatsApp"]].map(([k, l]) => (
              <div key={k} style={{ marginTop: 12 }}>
                <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{l}</label>
                <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
              </div>
            ))}
          </Card>

          <Card style={{ padding: 18 }}>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 0 }}>Metode Pembayaran</h3>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: -4 }}>Diproses melalui payment gateway, order otomatis terverifikasi lewat webhook.</p>
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
            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8, fontFamily: "'Manrope',sans-serif", fontSize: 13.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Subtotal</span><span style={{ color: C.text }}>{rp(subtotal)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>Diskon</span><span style={{ color: C.text }}>-{rp(discount)}</span></div>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}><span style={{ color: C.text, fontWeight: 700 }}>Total Bayar</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.goldLight }}>{rp(total)}</span></div>
            </div>
            {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.emberLight, marginTop: 10 }}>{error}</p>}
            <div style={{ marginTop: 16 }}><PrimaryBtn full onClick={placeOrder}>Bayar Sekarang</PrimaryBtn></div>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, marginTop: 10, lineHeight: 1.5 }}>Dengan melanjutkan, produk akan otomatis masuk ke akunmu setelah pembayaran berhasil diverifikasi server.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SuccessPage({ go }) {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.surface2, border: `1px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
        <Check size={26} color={C.gold} />
      </div>
      <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, color: C.text, marginTop: 20 }}>PESANAN BERHASIL DIBUAT</h1>
      <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>Webhook pembayaran sedang diverifikasi server. Produk akan otomatis muncul di dashboard begitu status berubah menjadi PAID.</p>
      <div style={{ marginTop: 26, display: "flex", gap: 12, justifyContent: "center" }}>
        <GhostBtn onClick={() => go("shop")}>Lanjut Belanja</GhostBtn>
        <PrimaryBtn onClick={() => go("customer")} icon={ArrowRight}>Ke Dashboard</PrimaryBtn>
      </div>
    </div>
  );
}

/* ---------------- AUTH ---------------- */
function AuthPage({ go, onCustomerLogin, onAdminLogin, onBack }) {
  const [mode, setMode] = useState("login");
  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "60px 20px" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
        <ArrowLeft size={15} /> Kembali
      </button>
      <Card style={{ padding: 28 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button onClick={() => setMode("login")} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${mode === "login" ? C.gold : C.border}`, background: mode === "login" ? C.surface2 : "transparent", color: C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Masuk</button>
          <button onClick={() => setMode("register")} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${mode === "register" ? C.gold : C.border}`, background: mode === "register" ? C.surface2 : "transparent", color: C.text, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Daftar</button>
        </div>
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: C.text, margin: "0 0 4px" }}>{mode === "login" ? "MASUK KE AKUN" : "BUAT AKUN BARU"}</h2>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginBottom: 18 }}>Masuk atau daftar diperlukan sebelum menambahkan produk ke keranjang. Prototipe demo — pilih peran untuk mencoba dashboard.</p>
        {mode === "register" && <input placeholder="Nama lengkap" style={{ width: "100%", marginBottom: 10, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />}
        <input placeholder="Email" style={{ width: "100%", marginBottom: 10, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
        <input placeholder="Kata sandi" type="password" style={{ width: "100%", marginBottom: 18, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <PrimaryBtn full onClick={onCustomerLogin}>{mode === "login" ? "Masuk sebagai Customer (demo)" : "Daftar & Masuk sebagai Customer"}</PrimaryBtn>
          <GhostBtn full onClick={onAdminLogin}>Masuk sebagai Admin (demo)</GhostBtn>
        </div>
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

function CustomerDashboard({ go, sub, setSub, role, setRole, orders, videoProgress, products, curriculumData }) {
  const ownedIds = Array.from(new Set(
    orders.filter((o) => o.payment === "PAID")
      .flatMap((o) => o.items)
      .map((itemName) => products.find((p) => p.name === itemName)?.id)
      .filter(Boolean)
  ));
  const owned = products.filter((p) => ownedIds.includes(p.id));
  const totalSpend = orders.reduce((s, o) => s + o.total, 0);

  const items = [
    { key: "overview", label: "Ringkasan", icon: LayoutDashboard },
    { key: "products", label: "Produk Saya", icon: Package },
    { key: "orders", label: "Pesanan", icon: ClipboardList },
    { key: "profile", label: "Profil", icon: User },
  ];

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "30px 20px 60px", display: "flex", gap: 28 }} className="gs-dash-layout">
      <DashSidebar items={items} active={sub} onSelect={setSub} footer={
        <button onClick={() => { setRole(null); go("home"); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: C.ember, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer", marginTop: 14 }}>
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
              <StatCard label="Total Pesanan" value={orders.length} icon={ClipboardList} />
            </div>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 26, marginBottom: 12 }}>Pesanan Terbaru</h3>
            {orders.length === 0 ? (
              <Card style={{ padding: 24, textAlign: "center" }}>
                <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: 0 }}>Belum ada pesanan. Coba beli produk untuk melihat alurnya di sini.</p>
                <div style={{ marginTop: 12 }}><PrimaryBtn small onClick={() => go("shop")}>Jelajahi Produk</PrimaryBtn></div>
              </Card>
            ) : (
              <Card style={{ padding: 4 }}>
                {orders.slice(0, 3).map((o, i) => (
                  <div key={o.id} style={{ padding: "12px 14px", borderBottom: i < Math.min(orders.length, 3) - 1 ? `1px solid ${C.border}` : "none", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
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
                    <GhostBtn small onClick={() => (curriculum ? go("learn", p.slug) : go("product", p.slug))} icon={PlayCircle}>Akses Produk</GhostBtn>
                  </div>
                </Card>
              );
            })}
          </div>
          )
        )}

        {sub === "orders" && (
          orders.length === 0 ? (
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
                {["Order ID", "Tanggal", "Produk", "Total", "Pembayaran", "Status"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 14px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, whiteSpace: "nowrap" }}>{o.id}</td>
                    <td style={{ padding: "10px 14px", color: C.muted, whiteSpace: "nowrap" }}>{o.date}</td>
                    <td style={{ padding: "10px 14px", color: C.text, whiteSpace: "nowrap" }}>{o.items.join(", ")}</td>
                    <td style={{ padding: "10px 14px", color: C.goldLight, fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>{rp(o.total)}</td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}><Badge>{o.payment}</Badge></td>
                    <td style={{ padding: "10px 14px", color: C.muted, whiteSpace: "nowrap" }}>{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          </>
          )
        )}

        {sub === "profile" && (
          <Card style={{ padding: 20, maxWidth: 420 }}>
            {[["Nama", DEMO_CUSTOMER.name], ["Email", DEMO_CUSTOMER.email], ["WhatsApp", DEMO_CUSTOMER.phone]].map(([l, v]) => (
              <div key={l} style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{l}</label>
                <input defaultValue={v} style={{ width: "100%", marginTop: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 13.5, boxSizing: "border-box" }} />
              </div>
            ))}
            <PrimaryBtn onClick={() => {}}>Simpan Perubahan</PrimaryBtn>
          </Card>
        )}
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

function StatusBadge({ status }) {
  const map = { Selesai: "gold", Menunggu: "muted", Gagal: "ember", Paid: "gold", Pending: "muted", Failed: "ember" };
  return <Badge tone={map[status] || "muted"}>{status}</Badge>;
}

function AdminDashboard({ go, sub, setSub, setRole, products, addProduct, updateProduct, toggleProductStatus, curriculumData, coupons, addCoupon }) {
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const items = [
    { key: "overview", label: "Ringkasan", icon: LayoutDashboard },
    { key: "products", label: "Produk", icon: Package },
    { key: "orders", label: "Pesanan", icon: ClipboardList },
    { key: "customers", label: "Pelanggan", icon: Users },
    { key: "coupons", label: "Kupon", icon: Tag },
    { key: "analytics", label: "Analitik", icon: BarChart3 },
    { key: "settings", label: "Pengaturan", icon: Settings },
  ];

  const totalRevenue = REVENUE_7D.reduce((s, d) => s + d.revenue, 0);

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "30px 20px 60px", display: "flex", gap: 28 }} className="gs-dash-layout">
      <DashSidebar items={items} active={sub} onSelect={setSub} footer={
        <button onClick={() => { setRole(null); go("home"); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: C.ember, fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer", marginTop: 14 }}>
          <LogOut size={16} />Keluar
        </button>
      } />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: C.text, margin: "0 0 20px" }}>
          {{ overview: "RINGKASAN ADMIN", products: "MANAJEMEN PRODUK", orders: "MANAJEMEN PESANAN", customers: "MANAJEMEN PELANGGAN", coupons: "KUPON & PROMO", analytics: "ANALITIK", settings: "PENGATURAN" }[sub]}
        </h1>

        {sub === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }} className="gs-grid-4">
              <StatCard label="Total Revenue (7 hari)" value={rp(totalRevenue)} icon={DollarSign} />
              <StatCard label="Total Orders" value="1.482" icon={ClipboardList} />
              <StatCard label="Total Customers" value="968" icon={Users} />
              <StatCard label="Conversion Rate" value="5,3%" icon={TrendingUp} />
            </div>
            <Card style={{ padding: 18, marginTop: 20 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginTop: 0 }}>Revenue 7 Hari Terakhir</h3>
              <div style={{ height: 220, marginTop: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={REVENUE_7D}>
                    <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                    <XAxis dataKey="day" stroke={C.muted} fontSize={11} />
                    <YAxis stroke={C.muted} fontSize={11} tickFormatter={(v) => (v / 1000000).toFixed(1) + "jt"} />
                    <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "Manrope", fontSize: 12 }} formatter={(v) => rp(v)} />
                    <Line type="monotone" dataKey="revenue" stroke={C.gold} strokeWidth={2.5} dot={{ r: 3, fill: C.gold }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, marginTop: 24, marginBottom: 12 }}>Produk Terlaris</h3>
            <Card style={{ padding: 4 }}>
              {[...products].sort((a, b) => b.sold - a.sold).slice(0, 4).map((p, i) => (
                <div key={p.id} style={{ padding: "12px 14px", borderBottom: i < 3 ? `1px solid ${C.border}` : "none", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.text }}>{p.name}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: C.muted }}>{p.sold} terjual</span>
                </div>
              ))}
            </Card>
          </div>
        )}

        {sub === "products" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}><PrimaryBtn small icon={Plus} onClick={() => { setEditingProduct(null); setShowProductForm(true); }}>Tambah Produk</PrimaryBtn></div>
            <ScrollHint />
            <Card style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Manrope',sans-serif", fontSize: 12.5 }}>
                <thead><tr style={{ background: C.surface2 }}>
                  {["Produk", "Kategori", "Harga", "Video", "Status", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.muted, fontWeight: 600 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {products.map((p) => {
                    const status = p.status || "published";
                    return (
                      <tr key={p.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: "10px 14px", color: C.text }}>{p.name}</td>
                        <td style={{ padding: "10px 14px", color: C.muted }}>{p.category}</td>
                        <td style={{ padding: "10px 14px", color: C.goldLight, fontFamily: "'JetBrains Mono',monospace" }}>{rp(p.price)}</td>
                        <td style={{ padding: "10px 14px", color: C.muted }}>{curriculumData[p.id] ? `${curriculumData[p.id].length} video` : "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <button onClick={() => toggleProductStatus(p.id)} style={{ border: "none", cursor: "pointer", padding: 0, background: "none" }} title="Klik untuk ubah status">
                            <Badge tone={status === "published" ? "gold" : "muted"}>{status === "published" ? "Published" : "Draft"}</Badge>
                          </button>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setEditingProduct(p); setShowProductForm(true); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                              <Pencil size={14} color={C.muted} />
                            </button>
                            <Trash2 size={14} color={C.muted} style={{ cursor: "pointer" }} />
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
            <ScrollHint />
            <Card style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Manrope',sans-serif", fontSize: 12.5 }}>
              <thead><tr style={{ background: C.surface2 }}>
                {["Order ID", "Customer", "Produk", "Jumlah", "Metode", "Pembayaran", "Status", "Tanggal"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {ADMIN_ORDERS.map((o) => (
                  <tr key={o.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: C.text }}>{o.id}</td>
                    <td style={{ padding: "10px 14px", color: C.text }}>{o.customer}</td>
                    <td style={{ padding: "10px 14px", color: C.muted }}>{o.product}</td>
                    <td style={{ padding: "10px 14px", color: C.goldLight, fontFamily: "'JetBrains Mono',monospace" }}>{rp(o.amount)}</td>
                    <td style={{ padding: "10px 14px", color: C.muted }}>{o.method}</td>
                    <td style={{ padding: "10px 14px" }}><StatusBadge status={o.payment} /></td>
                    <td style={{ padding: "10px 14px", color: C.muted }}>{o.status}</td>
                    <td style={{ padding: "10px 14px", color: C.muted, whiteSpace: "nowrap" }}>{o.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </Card>
          </div>
        )}

        {sub === "customers" && (
          <div>
            <ScrollHint />
            <Card style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Manrope',sans-serif", fontSize: 12.5 }}>
              <thead><tr style={{ background: C.surface2 }}>
                {["Nama", "Email", "Total Order", "Total Belanja", "Bergabung"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.muted, fontWeight: 600 }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {ADMIN_CUSTOMERS.map((c) => (
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
          </div>
        )}

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

        {sub === "analytics" && (
          <div>
            <Card style={{ padding: 18 }}>
              <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, marginTop: 0 }}>Funnel Konversi</h3>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: -6 }}>Visitor → Product View → Add to Cart → Checkout → Payment → Purchase</p>
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
            </Card>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 18 }} className="gs-grid-3">
              <StatCard label="Add to Cart Rate" value="33,2%" icon={ShoppingCart} />
              <StatCard label="Checkout Rate" value="45,4%" icon={ClipboardList} />
              <StatCard label="Purchase Rate" value="65,4%" icon={TrendingUp} />
            </div>
          </div>
        )}

        {sub === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[
              { h: "Umum", fields: ["Nama Website: Gitar Sakti", "Mata Uang: IDR (Rp)", "Email Kontak: hello@gitarsakti.id"] },
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
        )}
      </div>

      {showProductForm && (
        <ProductFormModal
          initialProduct={editingProduct}
          initialVideos={editingProduct ? (curriculumData[editingProduct.id] || []) : []}
          onClose={() => { setShowProductForm(false); setEditingProduct(null); }}
          onSubmit={(data, videos) => {
            if (editingProduct) updateProduct(editingProduct.id, data, videos);
            else addProduct(data, videos);
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
    </div>
  );
}

/* ---------------- FORM TAMBAH PRODUK ---------------- */
function ProductFormModal({ onClose, onSubmit, initialProduct, initialVideos }) {
  const isEdit = !!initialProduct;
  const [name, setName] = useState(initialProduct?.name || "");
  const [category, setCategory] = useState(initialProduct?.category || CATEGORIES[0]);
  const [level, setLevel] = useState(initialProduct?.level || "Semua Level");
  const [price, setPrice] = useState(initialProduct?.price ? String(initialProduct.price) : "");
  const [oldPrice, setOldPrice] = useState(initialProduct?.oldPrice ? String(initialProduct.oldPrice) : "");
  const [desc, setDesc] = useState(initialProduct?.desc || "");
  const [previewVideo, setPreviewVideo] = useState(initialProduct?.previewVideo || "");
  const [status, setStatus] = useState(initialProduct?.status || "draft");
  const [videos, setVideos] = useState(
    initialVideos && initialVideos.length > 0
      ? initialVideos.map((v) => ({ title: v.title || "", desc: v.desc || "", url: v.url || "", duration: v.duration || "" }))
      : [{ title: "", desc: "", url: "", duration: "" }]
  );
  const [error, setError] = useState("");

  const updateVideo = (idx, field, value) => {
    setVideos((v) => v.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };
  const addVideoRow = () => setVideos((v) => [...v, { title: "", desc: "", url: "", duration: "" }]);
  const removeVideoRow = (idx) => setVideos((v) => v.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (!name.trim()) { setError("Nama produk wajib diisi."); return; }
    if (!price || Number(price) <= 0) { setError("Harga produk wajib diisi dengan benar."); return; }
    const validVideos = videos.filter((v) => v.title.trim());
    setError("");
    onSubmit(
      {
        name: name.trim(), category, level, price: Number(price),
        oldPrice: oldPrice ? Number(oldPrice) : Number(price), desc: desc.trim(), status,
        previewVideo: previewVideo.trim(),
      },
      validVideos.map((v) => ({ title: v.title.trim(), desc: v.desc.trim(), url: v.url.trim(), duration: v.duration.trim() || "—" }))
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>Video Materi</label>
              <GhostBtn small onClick={addVideoRow} icon={Plus}>Tambah Video</GhostBtn>
            </div>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.mutedDark, marginTop: -6, marginBottom: 10 }}>Masukkan link video (YouTube/Vimeo/dll) — upload file langsung belum didukung di prototipe ini.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {videos.map((v, idx) => (
                <div key={idx} style={{ padding: 12, borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.muted }}>Video {idx + 1}</span>
                    {videos.length > 1 && <button onClick={() => removeVideoRow(idx)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={13} color={C.mutedDark} /></button>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input value={v.title} onChange={(e) => updateVideo(idx, "title", e.target.value)} placeholder="Judul video" style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, boxSizing: "border-box" }} />
                    <input value={v.desc} onChange={(e) => updateVideo(idx, "desc", e.target.value)} placeholder="Deskripsi singkat video" style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={v.url} onChange={(e) => updateVideo(idx, "url", e.target.value)} placeholder="Link video (https://...)" style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, boxSizing: "border-box" }} />
                      <input value={v.duration} onChange={(e) => updateVideo(idx, "duration", e.target.value)} placeholder="Durasi (mis. 12:30)" style={{ width: 110, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, boxSizing: "border-box" }} />
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

/* ---------------- LEARN / VIDEO PLAYER ---------------- */
function LearnPage({ slug, go, progress, setProgress, current, setCurrent, products, curriculumData }) {
  const product = products.find((x) => x.slug === slug) || products[0];
  const curriculum = curriculumData[product.id] || [];
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
                <a href={video.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none", height: 340, borderRadius: 14, background: `linear-gradient(135deg, ${product.hue}33, ${C.surface2})`, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
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
            {curriculum.map((v, idx) => {
              const done = completed.includes(idx);
              const active = idx === curIdx;
              return (
                <div key={idx} onClick={() => selectVideo(idx)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 10px", borderRadius: 8, cursor: "pointer", background: active ? C.surface2 : "transparent" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${done ? C.gold : C.border}`, background: done ? C.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {done ? <Check size={13} color="#1A140A" /> : <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: C.muted }}>{idx + 1}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? C.goldLight : C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.title}</div>
                    <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.muted }}>{v.duration}</div>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}

const LP_PROBLEMS = [
  { title: "Tutorial YouTube Terlalu Random", desc: "Nonton dari video satu ke video lain, tapi gak ada sistem yang jelas. Akhirnya malah makin bingung." },
  { title: "Diajari Teman, Tapi Tetap Nggak Ngerti", desc: "Temennya jago, tapi gak bisa ngajar dengan baik. Yang kamu dapat cuma \"coba aja lagi\" tanpa tau cara benerinnya." },
  { title: "Latihan Bertahun-tahun, Progress Minim", desc: "Sudah 2-3 tahun rutin latihan, tapi speed masih di tempat. Kayak ada yang salah dengan cara latih kamu." },
];

const LP_LEARN = [
  { title: "Teknik Shredding Fundamental", desc: "Pelajari dasar-dasar yang sering dilewatkan, dari alternate picking sampai economy picking yang efisien.", icon: "bolt" },
  { title: "Membaca Not Balok & Tablatur", desc: "Ngerti baca partitur dan tab dengan mudah, jadi kamu bisa belajar lagu apapun secara mandiri.", icon: "note" },
  { title: "Panduan 10 Exercise", desc: "Latihan-latihan yang jarang dibahas di kelas manapun, dirancang khusus untuk memaksimalkan progress.", icon: "list" },
];

const LP_TESTIMONIALS = [
  { name: "Rizky A.", role: "Mahasiswa, Bandung", quote: "Dulu udah 2 tahun main gitar tapi speed mentok di 100 BPM. Setelah ikut Secret of Shredding dan latihan sesuai materinya, sekarang bisa tembus 160 BPM dengan bersih. Cara ngajarnya emang beda, langsung ke poinnya." },
  { name: "Dimas P.", role: "Pelajar SMA, Jakarta", quote: "Gue udah nonton puluhan video YouTube tentang shredding, tapi tetep aja bingung musti mulai dari mana. Course ini ngerapikan semua. Bonus 10 lick-nya juga keren banget, langsung bisa dipraktekin." },
  { name: "Bagas S.", role: "Mahasiswa, Surabaya", quote: "Scale pentatonic yang dijelasin di bonus itu game changer banget. Dulu cuma tau bentuk A pentatonik doang, sekarang bisa eksplorasi semua posisi. Worth it banget untuk harganya!" },
];

const LP_COMPARISON = [
  { label: "Struktur Materi", us: true, other: false },
  { label: "Exercise Spesifik", us: true, other: false },
  { label: "Bisa Ditonton Ulang", us: true, other: false },
  { label: "Bonus Scale & Lick", us: true, other: false },
  { label: "Harga Terjangkau", us: true, other: "partial" },
];

const LP_BONUSES = [
  { title: "Secret of Shredding (Main Course)", desc: "Video pembelajaran lengkap", value: 1500000, main: true, tag: "COURSE", cover: "SECRET OF SHRED", hue: "#B8432A" },
  { title: "Membaca Not Balok & Tablatur Simple", desc: "BONUS — Panduan praktis", value: 599000, tag: "PANDUAN", cover: "BACA TAB & NOT", hue: "#3E7D64" },
  { title: "Panduan 10 Exercise Langka", desc: "BONUS — Latihan eksklusif", value: 100000, tag: "LATIHAN", cover: "10 EXERCISE", hue: "#7C6BB0" },
  { title: "Scale Pentatonic Eksklusif", desc: "BONUS — Scale lengkap", value: 499000, tag: "SCALE", cover: "PENTATONIC", hue: "#C9A24B" },
  { title: "10 Lick untuk Praktek", desc: "BONUS — Lick siap pakai", value: 2500000, tag: "LICK", cover: "10 LICK", hue: "#B8432A" },
];

const LP_FAQ = [
  { q: "Saya udah latihan lama, tapi tetap gak jago-jago. Course ini cocok?", a: "Justru ini yang sering terjadi. Banyak gitaris latihan bertahun-tahun tapi pakai metode yang salah. Di Secret of Shredding, kamu akan tau mana latihan yang efektif dan mana yang cuma buang-buang waktu." },
  { q: "Banyak tutorial gratis di YouTube, kenapa harus beli?", a: "Tutorial YouTube itu bagus, tapi kebanyakan nggak punya struktur yang jelas. Secret of Shredding disusun sistematis dari dasar sampai advanced, jadi kamu tinggal ikutin step by step." },
  { q: "Sering diajari teman tapi tetap tidak bisa, bedanya apa?", a: "Teman yang jago belum tentu bisa ngajar dengan baik. Di course ini, materi sudah disusun dengan cara yang mudah dipahami. Plus, kamu bisa ulang-ulang nonton sampai benar-benar ngerti." },
  { q: "Saya pemula total, bisa ikut?", a: "Course ini cocok untuk level pemula menengah ke atas. Kalau kamu sudah bisa pegang gitar dan tau posisi chord dasar, insyaallah bisa ngikut." },
];

/* ---------------- LANDING PAGE IKLAN (Secret of Shredding) ---------------- */
function LandingSecretShredding({ go, addToCart, products }) {
  const p = products.find((x) => x.slug === "secret-of-shredding");
  const disc = Math.round((1 - p.price / p.oldPrice) * 100);
  const bonusTotal = LP_BONUSES.reduce((s, b) => s + b.value, 0);

  useEffect(() => {
    // Titik integrasi Meta Pixel + Conversions API (server-side, pakai event_id yang sama untuk deduplikasi)
    console.log("[MetaPixel] ViewContent", { content_id: p.id, content_name: p.name, value: p.price, currency: "IDR" });
  }, []);

  const buyNow = () => { if (addToCart(p.id)) go("checkout"); };
  const scrollToPricing = () => {
    document.getElementById("lp-pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Countdown evergreen 2 jam — disimpan di memori (state), bukan localStorage
  const [timeLeft, setTimeLeft] = useState(2 * 60 * 60);
  useEffect(() => {
    const id = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
  const mm = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
  const ss = String(Math.floor(timeLeft % 60)).padStart(2, "0");

  // Slot tersisa (indikator, bukan klaim absolut)
  const [slots, setSlots] = useState(23);
  useEffect(() => {
    const id = setInterval(() => setSlots((s) => (s > 5 ? s - 1 : s)), 45000);
    return () => clearInterval(id);
  }, []);

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
            <Sparkles size={14} /> Metode Latihan Yang Sudah Teruji
          </span>
        </div>

        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, lineHeight: 1.12, letterSpacing: 0.3, color: C.text, textAlign: "center", margin: "0 0 14px" }}>
          Sudah Latihan Bertahun-Tahun<br />
          <span style={{ color: C.goldLight }}>Tapi Melodi Masih Lambat & Berantakan?</span>
        </h1>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, color: C.muted, textAlign: "center", maxWidth: 480, margin: "0 auto 26px", lineHeight: 1.65 }}>
          Temukan rahasia teknik shredding yang membuat latihan kamu jauh lebih efektif — tanpa harus menghabiskan ribuan jam sia-sia.
        </p>

        <a
          href="https://www.youtube.com/watch?v=nzuzPzMa_8Y"
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

        <div style={{ textAlign: "center" }}>
          <PrimaryBtn onClick={scrollToPricing} icon={ArrowRight}>Ya, Saya Ingin Bisa Shredding</PrimaryBtn>
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: 10 }}>Akses langsung setelah pembayaran</p>
        </div>
      </div>

      {/* PROBLEM AGITATION */}
      <div style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.text, margin: 0 }}>
              Bermain Melody Dengan Kecepatan Tinggi Itu <span style={{ color: C.goldLight }}>Sangat Sulit?</span>
            </h2>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, marginTop: 8 }}>Mari kita jujur sama diri sendiri...</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {LP_PROBLEMS.map((item) => (
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
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: C.text, margin: "8px 0" }}>Secret of Shredding</h2>
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, maxWidth: 420, margin: "0 auto" }}>Course yang fokus pada teknik-teknik spesifik untuk meningkatkan speed dan akurasi main gitar kamu.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {LP_LEARN.map((item) => (
            <Card key={item.title} style={{ padding: 18 }}>
              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.gold}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Sparkles size={18} color={C.goldLight} />
                </div>
                <div>
                  <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text, margin: "0 0 4px" }}>{item.title}</h3>
                  <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.55 }}>{item.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* SOCIAL PROOF */}
      <div style={{ borderTop: `1px solid ${C.borderSoft}`, borderBottom: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, textAlign: "center", marginBottom: 20 }}>Dipercaya oleh ratusan gitaris pemula & menengah</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
            {[["500+", "Member Aktif"], ["4.8", "Rating Rata-rata"], ["15+", "Video Materi"]].map(([n, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.goldLight }}>{n}</div>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TESTIMONI */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.text, textAlign: "center", marginBottom: 26 }}>
          Kata Mereka yang Sudah <span style={{ color: C.goldLight }}>Merasakan Manfaatnya</span>
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {LP_TESTIMONIALS.map((t) => (
            <Card key={t.name} style={{ padding: 18 }}>
              <StarRow rating={5} />
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.text, marginTop: 10, marginBottom: 12, lineHeight: 1.6, fontStyle: "italic" }}>"{t.quote}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${C.gold}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, color: C.goldLight }}>{t.name[0]}</span>
                </div>
                <div>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, color: C.text }}>{t.name}</div>
                  <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}>{t.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* PERBANDINGAN */}
      <div style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.text, textAlign: "center", marginBottom: 24 }}>
            Secret of Shredding vs <span style={{ color: C.goldLight }}>Cara Lain</span>
          </h2>
          <Card style={{ overflow: "auto", padding: 0 }}>
            <table style={{ width: "100%", minWidth: 420, borderCollapse: "collapse", fontFamily: "'Manrope',sans-serif", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.surface2 }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: C.muted, fontWeight: 600 }}>Perbandingan</th>
                  <th style={{ textAlign: "center", padding: "12px 16px", color: C.goldLight, fontWeight: 700 }}>Secret of Shredding</th>
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

      {/* BONUS STACK */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Badge tone="gold">BONUS SPESIAL</Badge>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.text, margin: "12px 0 0" }}>Nilai Lebih yang Kamu Dapatkan</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {LP_BONUSES.map((b) => (
            <Card key={b.title} style={{ padding: 14, display: "flex", alignItems: "center", gap: 14 }}>
              <BookCover title={b.cover} tag={b.tag} hue={b.hue} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13.5, color: C.text }}>{b.title}</div>
                <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}>{b.desc}</div>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, fontWeight: 700, color: b.main ? C.goldLight : C.gold, whiteSpace: "nowrap" }}>{rp(b.value)}</div>
            </Card>
          ))}
        </div>
        <div style={{ marginTop: 18, padding: 18, borderRadius: 12, background: `${C.gold}12`, border: `1px solid ${C.gold}44` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted }}>Total Nilai Keseluruhan:</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 18, color: C.mutedDark, textDecoration: "line-through" }}>{rp(bonusTotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>Harga Normal:</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 22, color: C.goldLight }}>Rp1.500.000</span>
          </div>
        </div>
      </div>

      {/* PRICING / CTA */}
      <div id="lp-pricing" style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.surface }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "44px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, background: `${C.ember}18`, border: `1px solid ${C.ember}55`, color: C.emberLight, fontFamily: "'Manrope',sans-serif", fontSize: 12.5, fontWeight: 700 }}>
              Sisa Slot: {slots}
            </span>
          </div>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "26px 24px", textAlign: "center", borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.muted, marginBottom: 8 }}>Promo Berakhir Dalam</p>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 24, color: C.emberLight, marginBottom: 16 }}>{hh} : {mm} : {ss}</div>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>Harga Spesial Terbatas</span>
              <div style={{ marginTop: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 20, color: C.mutedDark, textDecoration: "line-through" }}>Rp1.500.000</span>
              </div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, color: C.goldLight, margin: "6px 0" }}>Rp199.000</div>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted }}>Akses selamanya, one-time payment</p>
            </div>
            <div style={{ padding: 20 }}>
              <PrimaryBtn full onClick={buyNow} icon={ArrowRight}>Beli Sekarang</PrimaryBtn>
              <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 14 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}><ShieldCheck size={13} color={C.gold} /> Pembayaran Aman</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Manrope',sans-serif", fontSize: 11.5, color: C.muted }}><Clock size={13} color={C.gold} /> Akses Instan</span>
              </div>
            </div>
          </Card>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {["Akses selamanya—sekali bayar, milik selamanya", "Bisa ditonton ulang kapanpun kamu mau", "Cocok untuk pelajar & mahasiswa dengan budget terbatas"].map((r) => (
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
          {LP_FAQ.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </div>

      {/* CTA PENUTUP */}
      <div style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.surface, padding: "44px 20px 20px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: C.text, margin: "0 0 12px" }}>
          Masih Mau <span style={{ color: C.goldLight }}>Latihan Sia-sia?</span>
        </h2>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13.5, color: C.muted, maxWidth: 380, margin: "0 auto 22px", lineHeight: 1.6 }}>
          Atau kamu mau mulai latihan dengan cara yang benar dan melihat progress nyata dalam hitungan minggu?
        </p>
        <PrimaryBtn onClick={scrollToPricing} icon={ArrowRight}>Ya, Saya Mau Bisa Shredding</PrimaryBtn>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.mutedDark, marginTop: 14 }}>Bergabung dengan 500+ gitaris lainnya</p>
      </div>

      <div style={{ padding: "20px 20px 40px", textAlign: "center" }}>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.mutedDark, margin: 0 }}>© 2026 Secret of Shredding × Gitar Sakti. Seluruh hak cipta dilindungi.</p>
      </div>
    </div>
  );
}


/* ---------------- ABOUT (ringkas) ---------------- */
function AboutPage({ go }) {
  return (
    <div>
      <Section eyebrow="Tentang Kami" title="Gitar Sakti" sub="Platform edukasi gitar digital yang dibangun untuk membantu siapa pun belajar gitar secara mandiri, terstruktur, dan bisa diukur progresnya.">
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: C.muted, lineHeight: 1.7, maxWidth: 640 }}>
          Kami percaya belajar gitar tidak harus mahal atau membingungkan. Setiap course di Gitar Sakti disusun oleh instruktur berpengalaman, dengan jalur belajar yang jelas dari fondasi dasar hingga teknik lanjutan seperti shredding dan improvisasi.
        </p>
        <div style={{ marginTop: 24 }}><PrimaryBtn onClick={() => go("shop")} icon={ArrowRight}>Mulai Belajar</PrimaryBtn></div>
      </Section>
      <Footer go={go} />
    </div>
  );
}

/* ---------------- APP ---------------- */
export default function App() {
  const [view, setView] = useState("home");
  const [productSlug, setProductSlug] = useState(INITIAL_PRODUCTS[0].slug);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [curriculumData, setCurriculumData] = useState(INITIAL_CURRICULUM);
  const [cart, setCart] = useState([]);
  const [coupon, setCoupon] = useState(null);
  const [role, setRole] = useState(null);
  const [redirectAfterAuth, setRedirectAfterAuth] = useState(null);
  const [preAuthView, setPreAuthView] = useState(null);
  const [customerSub, setCustomerSub] = useState("overview");
  const [adminSub, setAdminSub] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [videoProgress, setVideoProgress] = useState({});
  const [videoCurrent, setVideoCurrent] = useState({});
  const [orders, setOrders] = useState(DEMO_ORDERS);
  const [coupons, setCoupons] = useState(INITIAL_COUPONS);

  const go = (target, slug) => {
    if (slug) setProductSlug(slug);
    setView(target);
    setMobileOpen(false);
    window.scrollTo?.({ top: 0, behavior: "instant" });
  };
  const openProduct = (slug) => go("product", slug);
  const ownedIds = role === "customer" ? Array.from(new Set(
    orders.filter((o) => o.payment === "PAID")
      .flatMap((o) => o.items)
      .map((itemName) => products.find((p) => p.name === itemName)?.id)
      .filter(Boolean)
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
    if (ownedIds.includes(id)) return false;
    setCart((c) => (c.includes(id) ? c : [...c, id]));
    return true;
  };
  const goOrAuth = (target, slug) => {
    if (!role) { setRedirectAfterAuth({ view: target, slug }); setPreAuthView({ view, slug: productSlug }); go("auth"); return; }
    go(target, slug);
  };
  const onCustomerLogin = () => {
    setRole("customer");
    if (redirectAfterAuth) { go(redirectAfterAuth.view, redirectAfterAuth.slug); setRedirectAfterAuth(null); }
    else go("shop");
  };
  const onAdminLogin = () => { setRole("admin"); setRedirectAfterAuth(null); go("admin"); };
  const onBack = () => {
    if (preAuthView) { go(preAuthView.view, preAuthView.slug); setPreAuthView(null); }
    else go("home");
  };
  const accessProduct = (p) => (curriculumData[p.id] ? go("learn", p.slug) : go("product", p.slug));
  const removeFromCart = (id) => setCart((c) => c.filter((x) => x !== id));
  const clearCart = () => { setCart([]); setCoupon(null); };
  const addOrder = (order) => setOrders((prev) => [order, ...prev]);
  const cartProducts = cart.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const addProduct = (data, videos) => {
    const newId = products.reduce((m, p) => Math.max(m, p.id), 0) + 1;
    let baseSlug = slugify(data.name) || `produk-${newId}`;
    let slug = baseSlug;
    let n = 2;
    while (products.some((p) => p.slug === slug)) { slug = `${baseSlug}-${n}`; n++; }
    const newProduct = {
      id: newId, slug, name: data.name, category: data.category, level: data.level,
      price: data.price, oldPrice: data.oldPrice || data.price, rating: 5, reviews: 0, sold: 0,
      badge: "New", duration: data.duration || `${videos.length} video`, format: data.format || "Video Course",
      hue: data.hue || "#C9A24B", desc: data.desc || "", benefits: data.benefits || [], learn: data.learn || [],
      bonus: data.bonus || "", status: data.status || "draft", previewVideo: data.previewVideo || "",
    };
    setProducts((prev) => [...prev, newProduct]);
    if (videos && videos.length > 0) {
      setCurriculumData((prev) => ({ ...prev, [newId]: videos }));
    }
    return newProduct;
  };
  const updateProduct = (id, data, videos) => {
    setProducts((prev) => prev.map((p) => (
      p.id === id
        ? {
            ...p, name: data.name, category: data.category, level: data.level,
            price: data.price, oldPrice: data.oldPrice || data.price, desc: data.desc || "",
            status: data.status || p.status || "published", previewVideo: data.previewVideo || "",
            duration: videos.length > 0 ? `${videos.length} video` : p.duration,
          }
        : p
    )));
    setCurriculumData((prev) => ({ ...prev, [id]: videos }));
  };
  const toggleProductStatus = (id) => {
    setProducts((prev) => prev.map((p) => (
      p.id === id ? { ...p, status: (p.status || "published") === "published" ? "draft" : "published" } : p
    )));
  };
  const addCoupon = (data) => {
    setCoupons((prev) => [...prev, { ...data, used: 0 }]);
  };
  const calcDiscount = (subtotal, couponCode) => {
    if (!couponCode) return 0;
    const c = coupons.find((x) => x.code === couponCode);
    if (!c) return 0;
    if (c.minPurchase && subtotal < c.minPurchase) return 0;
    if (c.type === "percent") return Math.round(subtotal * (c.value / 100));
    return Math.min(c.value, subtotal);
  };

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

      {view !== "lp" && <Header view={view} go={go} goOrAuth={goOrAuth} goToAuth={goToAuth} cartCount={cart.length} role={role} setRole={setRole} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />}

      {view === "home" && <HomePage go={go} openProduct={openProduct} addToCart={addToCart} cart={cart} ownedIds={ownedIds} accessProduct={accessProduct} videoProgress={videoProgress} products={products} curriculumData={curriculumData} />}
      {view === "shop" && <ShopPage go={go} openProduct={openProduct} addToCart={addToCart} cart={cart} ownedIds={ownedIds} accessProduct={accessProduct} videoProgress={videoProgress} products={products} curriculumData={curriculumData} />}
      {view === "product" && <ProductPage slug={productSlug} go={go} addToCart={addToCart} cart={cart} ownedIds={ownedIds} accessProduct={accessProduct} videoProgress={videoProgress} products={products} curriculumData={curriculumData} />}
      {view === "cart" && <CartPage go={go} cartProducts={cartProducts} removeFromCart={removeFromCart} coupon={coupon} setCoupon={setCoupon} coupons={coupons} calcDiscount={calcDiscount} />}
      {view === "checkout" && <CheckoutPage go={go} cartProducts={cartProducts} coupon={coupon} clearCart={clearCart} orders={orders} addOrder={addOrder} calcDiscount={calcDiscount} />}
      {view === "success" && <SuccessPage go={go} />}
      {view === "auth" && <AuthPage go={go} onCustomerLogin={onCustomerLogin} onAdminLogin={onAdminLogin} onBack={onBack} />}
      {view === "about" && <AboutPage go={go} />}
      {view === "lp" && <LandingSecretShredding go={go} addToCart={addToCart} products={products} />}
      {view === "customer" && <CustomerDashboard go={go} sub={customerSub} setSub={setCustomerSub} role={role} setRole={setRole} orders={orders} videoProgress={videoProgress} products={products} curriculumData={curriculumData} />}
      {view === "learn" && <LearnPage slug={productSlug} go={go} progress={videoProgress} setProgress={setVideoProgress} current={videoCurrent} setCurrent={setVideoCurrent} products={products} curriculumData={curriculumData} />}
      {view === "admin" && <AdminDashboard go={go} sub={adminSub} setSub={setAdminSub} setRole={setRole} products={products} addProduct={addProduct} updateProduct={updateProduct} toggleProductStatus={toggleProductStatus} curriculumData={curriculumData} coupons={coupons} addCoupon={addCoupon} />}
    </div>
  );
}
