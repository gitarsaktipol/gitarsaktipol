// Panel admin Gitar Sakti (Dasbor admin + form-form admin). Dipisah dari App.jsx dan dimuat
// hanya saat dibutuhkan (React.lazy), supaya pengunjung biasa tidak ikut mengunduh kode admin.
// Komponen & helper bersama diambil dari App.jsx.
import React, { useState, useEffect, useRef } from "react";
import {
  X, Search, ShoppingCart, Star, PlayCircle, Check, ChevronRight, LogOut, LayoutDashboard, Package, ClipboardList, Users, Tag, BarChart3, Settings, TrendingUp, DollarSign, ShoppingBag, Plus, Trash2, Pencil, ArrowRight, ArrowLeft, Eye, Filter, Music, Download, CreditCard, QrCode, Wallet, ShieldCheck, Youtube, Instagram, Copy, Landmark, Image as ImageIcon, ToggleLeft, ToggleRight, Truck, Shirt, ImagePlus, RotateCcw, Play,
} from "lucide-react";
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar,
} from "recharts";
import {
  Badge, C, CATEGORIES, Card, CopyableField, DashSidebar, DragHandle, FUNNEL, GhostBtn, LP_TEMPLATES, MONTHS_ID, PrimaryBtn, ProductThumb, ProofImage, RichTextEditor, Section, SortableList, StatCard, formatDateID, invokeFn, productStockTotal, rp, stripFretPrefix, supabase, toast, waLink,
} from "./App.jsx";

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

/* ---------------- ADMIN > PENGATURAN > FERTUNE ----------------
   Info = jawaban "kenapa menghapus akun" dari aplikasi FerTune (anonim).
   Dari Play Store / Dari Web = catatan pembelian FerTune per sumber (tabel fertune_purchases; ditulis oleh
   Edge Function saat pembayaran FerTune terpasang. Selama FerTune masih gratis, angkanya 0). */
function AdminFertune() {
  const [tab, setTab] = useState("info"); // info | playstore | web
  const [feedback, setFeedback] = useState(null);
  const [purchases, setPurchases] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    (async () => {
      const [f, p] = await Promise.all([
        supabase.from("fertune_feedback").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("fertune_purchases").select("*").order("created_at", { ascending: false }).limit(2000),
      ]);
      if (!alive) return;
      if (f.error || p.error) setError("Gagal memuat data FerTune: " + (f.error?.message || p.error?.message));
      setFeedback(f.data || []);
      setPurchases(p.data || []);
    })();
    return () => { alive = false; };
  }, []);
  const sansBold = { fontFamily: "'Manrope',sans-serif", fontWeight: 700 };
  const loading = feedback === null || purchases === null;
  const bySource = (src) => (purchases || []).filter((x) => x.source === src);
  const tabBtn = (key, label) => (tab === key
    ? <PrimaryBtn small onClick={() => setTab(key)}>{label}</PrimaryBtn>
    : <GhostBtn small onClick={() => setTab(key)}>{label}</GhostBtn>);

  const reasonCounts = {};
  (feedback || []).forEach((x) => { reasonCounts[x.reason] = (reasonCounts[x.reason] || 0) + 1; });
  const reasonList = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);
  const maxReason = reasonList.length ? reasonList[0][1] : 1;

  const renderPurchases = (src, label) => {
    const rows = bySource(src);
    const paid = rows.filter((x) => x.status === "paid");
    const refunded = rows.filter((x) => x.status === "refunded");
    const income = paid.reduce((a, x) => a + (x.amount || 0), 0);
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }} className="gs-grid-3">
          <StatCard label={`Pembelian lunas (${label})`} value={paid.length} icon={ShoppingBag} />
          <StatCard label="Total pendapatan" value={rp(income)} icon={DollarSign} />
          <StatCard label="Dikembalikan (refund)" value={refunded.length} icon={RotateCcw} />
        </div>
        {rows.length === 0 ? (
          <Card style={{ padding: 22, marginTop: 16, textAlign: "center" }}>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>
              Belum ada pembelian FerTune dari {label}. FerTune saat ini masih gratis; angka di sini terisi otomatis setelah FerTune berbayar dan pembayarannya
              {src === "playstore" ? " lewat Google Play Billing" : " lewat website"} tersambung.
            </p>
          </Card>
        ) : (
          <Card style={{ padding: 4, marginTop: 16 }}>
            {rows.slice(0, 50).map((x, i) => (
              <div key={x.id} style={{ padding: "11px 14px", borderBottom: i < Math.min(rows.length, 50) - 1 ? `1px solid ${C.border}` : "none", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ ...sansBold, fontSize: 13, color: C.text }}>{x.product}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.muted }}>{formatDateID(new Date(x.created_at))}{x.ref ? ` · ${String(x.ref).slice(0, 18)}` : ""}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.goldLight }}>{rp(x.amount)}</span>
                  <Badge tone={x.status === "paid" ? "gold" : "red"}>{x.status === "paid" ? "Lunas" : "Refund"}</Badge>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {tabBtn("info", `Info${feedback ? ` (${feedback.length})` : ""}`)}
        {tabBtn("playstore", "Dari Play Store")}
        {tabBtn("web", "Dari Web")}
      </div>
      {error && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.emberLight, marginBottom: 12 }}>{error}</p>}
      {loading ? (
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted }}>Memuat…</p>
      ) : tab === "info" ? (
        <div>
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.mutedDark, marginTop: 0, marginBottom: 14, lineHeight: 1.6 }}>
            Jawaban pengguna FerTune yang menghapus akun ("Kenapa kamu menghapus akun?"). Anonim: tidak terhubung ke nama atau email.
          </p>
          {feedback.length === 0 ? (
            <Card style={{ padding: 22, textAlign: "center" }}><p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: 0 }}>Belum ada umpan balik.</p></Card>
          ) : (
            <>
              <Card style={{ padding: 18, marginBottom: 16 }}>
                <h3 style={{ ...sansBold, fontSize: 14, color: C.text, margin: "0 0 12px" }}>Alasan terbanyak</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {reasonList.map(([reason, n]) => (
                    <div key={reason}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Manrope',sans-serif", fontSize: 12.5, color: C.text, marginBottom: 4 }}><span>{reason}</span><b>{n}</b></div>
                      <div style={{ height: 6, borderRadius: 999, background: C.surface2, overflow: "hidden" }}><div style={{ width: `${Math.round((n / maxReason) * 100)}%`, height: "100%", background: C.gold }} /></div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card style={{ padding: 4 }}>
                {feedback.map((x, i) => (
                  <div key={x.id} style={{ padding: "12px 14px", borderBottom: i < feedback.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ ...sansBold, fontSize: 13, color: C.text }}>{x.reason}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Badge tone="muted">{x.source === "playstore" ? "Play Store" : "Web"}</Badge>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.muted }}>{formatDateID(new Date(x.created_at))}</span>
                      </span>
                    </div>
                    {x.note && <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.muted, margin: "6px 0 0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{x.note}</p>}
                  </div>
                ))}
              </Card>
            </>
          )}
        </div>
      ) : tab === "playstore" ? renderPurchases("playstore", "Play Store") : renderPurchases("web", "Web")}
    </div>
  );
}

export function AdminDashboard({ go, sub, setSub, onLogout, products, addProduct, updateProduct, toggleProductStatus, deleteProduct, reorderProducts, curriculumData, curriculumOutline, coupons, addCoupon, deleteCoupon, siteContent, updateSiteContent, customPages, addCustomPage, updateCustomPage, deleteCustomPage, tampilanSub, setTampilanSub, orders, updateOrderStatus, updateFulfillment, bankInfo, updateBankInfo, paymentMethods, addPaymentMethod, updatePaymentMethod, togglePaymentMethod, deletePaymentMethod, reorderPaymentMethods, onChangeAdminPassword, onExportData, onResetData, totalVisits, countVisitsSince, members, landingPages, addLandingPage, updateLandingPage, deleteLandingPage, openLandingPage, openLearnEditor }) {
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
                        <button onClick={() => toggleProductStatus(p.id)} title={status === "soon" ? "Segera Hadir — klik untuk buka penjualan" : status === "published" ? "Tampil di toko — klik untuk jadikan Draft" : "Draft — klik untuk tampilkan di toko"} className={`gs-switch ${status !== "draft" ? "on" : ""}`} style={{ border: "none", cursor: "pointer" }}>
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
            <Card style={{ padding: 18, cursor: "pointer" }} onClick={() => setSettingsSub("fertune")}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Music size={18} color={C.gold} />
                  <div>
                    <h3 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>FerTune</h3>
                    <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.muted, margin: "3px 0 0" }}>Umpan balik hapus akun, serta pembelian dari Play Store dan dari Web.</p>
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

        {sub === "settings" && settingsSub === "fertune" && (
          <div>
            <button onClick={() => setSettingsSub("menu")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 16 }}><ArrowLeft size={14} />Kembali ke Pengaturan</button>
            <AdminFertune />
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
export function YoutubeImportModal({ mode = "create", productName, onClose, onCreate, onAppend }) {
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
  // Asal pembeli (lihat captureAttribution di App.jsx): kampanye iklan, atau situs perujuk.
  const at = o.attribution;
  const sourceText = at ? ([at.utm_source, at.utm_medium, at.utm_campaign].filter(Boolean).join(" / ") || (at.fbclid ? "Iklan Meta (fbclid)" : at.gclid ? "Iklan Google (gclid)" : at.ref ? `dari ${at.ref}` : "")) + (at.utm_content ? ` · ${at.utm_content}` : "") : "";
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
          {sourceText && row("Sumber", sourceText)}
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
                {[["published", "Tampil di toko"], ["soon", "Segera hadir"], ["draft", "Draft"]].map(([k, l]) => (
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
              <button onClick={() => setStatus("soon")} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${status === "soon" ? C.gold : C.border}`, background: status === "soon" ? C.surface2 : "transparent", color: status === "soon" ? C.goldLight : C.muted, fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Segera Hadir</button>
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
