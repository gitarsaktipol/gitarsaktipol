// Edge Function: kirim notifikasi ke Telegram admin saat ada pesanan baru / bukti transfer diupload.
// Secrets (Supabase Dashboard -> Edge Functions -> Secrets):
//   TELEGRAM_BOT_TOKEN=123456:ABC...   (token dari @BotFather)
//   TELEGRAM_CHAT_ID=123456789         (chat id admin)
//   SITE_URL=https://domainkamu.com
// JANGAN taruh token bot di kode yang di-commit ke GitHub.
//
// Keamanan: data pesanan dibaca dari database (bukan dari kiriman browser), dan hanya pemilik
// pesanan / admin yang bisa memicu notifikasi untuk pesanan tsb — jadi tidak bisa dipakai orang
// lain untuk spam ke Telegram admin.

import { createClient } from "jsr:@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "";
const SITE_URL = Deno.env.get("SITE_URL") || "https://gitarsaktipol.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const rupiah = (n: unknown) => "Rp" + (Number(n) || 0).toLocaleString("id-ID");

const TITLE: Record<string, string> = {
  created: "🛒 Pesanan Baru Masuk",
  proof_uploaded: "💰 Bukti Transfer Diupload -- Cek Sekarang!",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return json({ error: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum di-set." }, 500);

    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: userData } = await db.auth.getUser(jwt);
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "Tidak terautentikasi." }, 401);

    const { orderId, kind } = await req.json();
    if (!orderId) return json({ error: "orderId wajib diisi." }, 400);
    const { data: order } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return json({ error: "Pesanan tidak ditemukan." }, 404);
    if (order.customer_id !== uid) {
      const { data: caller } = await db.from("profiles").select("role").eq("id", uid).maybeSingle();
      if (caller?.role !== "admin") return json({ error: "Tidak diizinkan." }, 403);
    }

    const itemNames = (Array.isArray(order.items) ? order.items : []).map((it: any) => it?.name ? `${it.name}${Number(it.qty) > 1 ? ` x${Number(it.qty)}` : ""}` : "").filter(Boolean).join(", ") || "-";
    const a = order.shipping_address;
    const shipText = a ? `\nKirim ke: ${a.name} (${a.phone}), ${a.address}, ${a.city}${a.province ? ", " + a.province : ""} ${a.postal || ""}\nOngkir: ${rupiah(order.shipping_fee)}` : "";
    const text =
      `${TITLE[kind] || "🔔 Update Pesanan"}\n\n` +
      `ID Pesanan: ${order.id}\n` +
      `Pembeli: ${order.customer_name || "-"}\n` +
      `Email: ${order.customer_email || "-"}\n` +
      `WhatsApp: ${order.customer_phone || "-"}\n` +
      `Produk: ${itemNames}\n` +
      `Total: ${rupiah(order.total)}${shipText}\n` +
      `Metode: ${order.method || "-"}\n\n` +
      `Buka Admin > Pesanan: ${SITE_URL}/?admin=1`;

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
    });
    if (!res.ok) return json({ error: await res.text() }, 502);
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
