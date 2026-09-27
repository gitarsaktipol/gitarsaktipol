// Edge Function: kirim email konfirmasi/invoice pesanan lewat Resend.
// Secrets yang dipakai (Supabase Dashboard -> Edge Functions -> Secrets):
//   RESEND_API_KEY=re_xxxxxxxxxxxx                       (wajib)
//   SITE_URL=https://domainkamu.com                       (link tombol "Masuk ke Akun")
//   FROM_EMAIL="Gitar Sakti <no-reply@domainkamu.com>"    (domain harus diverifikasi di Resend)
//
// Keamanan: isi email TIDAK diambil dari data kiriman browser. Function ini hanya menerima
// { orderId, kind }, lalu membaca pesanan langsung dari database. Email hanya dikirim ke
// pemilik pesanan, dan hanya kalau yang memanggil adalah pemilik pesanan itu sendiri atau admin
// (kind "paid" khusus admin). Jadi function ini tidak bisa disalahgunakan untuk spam/phishing.

import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "https://gitarsaktipol.vercel.app";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Gitar Sakti <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const rupiah = (n: unknown) => "Rp" + (Number(n) || 0).toLocaleString("id-ID");

const SUBJECT: Record<string, (id: string) => string> = {
  created: (id) => `Pesanan Diterima — ${id}`,
  proof_uploaded: (id) => `Bukti Pembayaran Diterima — Pesanan ${id}`,
  paid: (id) => `Pembayaran Dikonfirmasi — Pesanan ${id}`,
};
const HEADING: Record<string, string> = {
  created: "Terima Kasih, Pesanan Kamu Diterima",
  proof_uploaded: "Bukti Pembayaran Kamu Sudah Kami Terima",
  paid: "Pembayaran Kamu Sudah Dikonfirmasi",
};
const INTRO: Record<string, string> = {
  created: "Kami sudah menerima pesanan kamu. Silakan selesaikan pembayaran sesuai instruksi di halaman konfirmasi, lalu unggah bukti transfernya.",
  proof_uploaded: "Bukti transfer kamu sudah kami terima dan sedang dicek oleh tim kami. Kami akan kirim email lagi begitu pembayaran terverifikasi.",
  paid: "Pembayaran untuk pesanan berikut sudah kami verifikasi. Materi sudah bisa diakses di dashboard kamu — selamat berlatih!",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY belum di-set sebagai secret." }, 500);

    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: userData } = await db.auth.getUser(jwt);
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "Tidak terautentikasi." }, 401);

    const { orderId, kind: rawKind } = await req.json();
    const kind = SUBJECT[rawKind] ? rawKind : "created";
    if (!orderId) return json({ error: "orderId wajib diisi." }, 400);

    const { data: order } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return json({ error: "Pesanan tidak ditemukan." }, 404);
    const { data: caller } = await db.from("profiles").select("role").eq("id", uid).maybeSingle();
    const isAdmin = caller?.role === "admin";
    if (kind === "paid" ? !(isAdmin && order.payment === "PAID") : !(isAdmin || order.customer_id === uid)) {
      return json({ error: "Tidak diizinkan." }, 403);
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const itemsRows = items.map((it: any) =>
      `<tr><td style="padding:8px 0;color:#1D1D1F;font-size:13.5px;">${esc(it?.name)}</td><td style="padding:8px 0;text-align:right;color:#1D1D1F;font-size:13.5px;">${rupiah(it?.price)}</td></tr>`
    ).join("");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;">
        <div style="background:#1D1D1F;padding:24px;text-align:center;">
          <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:1px;">GITAR SAKTI</span>
        </div>
        <div style="padding:28px 24px;">
          <h2 style="color:#1D1D1F;margin:0 0 10px;">${HEADING[kind]}</h2>
          <p style="color:#6E6E73;font-size:14px;line-height:1.6;">Halo ${esc(order.customer_name)}, ${INTRO[kind]}</p>
          ${itemsRows ? `<table style="width:100%;border-collapse:collapse;margin-top:16px;border-top:1px solid #E5E5EA;">${itemsRows}</table>` : ""}
          <div style="border-top:1px solid #E5E5EA;margin-top:10px;padding-top:12px;">
            <table style="width:100%;">
              <tr><td style="color:#6E6E73;font-size:13px;">Diskon</td><td style="text-align:right;color:#1D1D1F;font-size:13px;">-${rupiah(order.discount)}</td></tr>
              <tr><td style="color:#1D1D1F;font-weight:700;padding-top:6px;">Total</td><td style="text-align:right;color:#8A6416;font-weight:700;padding-top:6px;">${rupiah(order.total)}</td></tr>
            </table>
          </div>
          <p style="color:#6E6E73;font-size:12.5px;margin-top:16px;">ID Pesanan: <b style="color:#1D1D1F;">${esc(order.id)}</b> &nbsp;•&nbsp; Status: <b style="color:#1D1D1F;">${esc(order.status)}</b></p>
          <a href="${esc(SITE_URL)}" style="display:inline-block;margin-top:18px;background:#1D1D1F;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:700;">Masuk ke Akun</a>
          <p style="color:#86868B;font-size:11px;margin-top:24px;">Email ini dikirim otomatis oleh Gitar Sakti. Kalau kamu merasa tidak melakukan pemesanan ini, abaikan email ini.</p>
        </div>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: order.customer_email, subject: SUBJECT[kind](order.id), html }),
    });
    if (!res.ok) return json({ error: await res.text() }, 502);
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
