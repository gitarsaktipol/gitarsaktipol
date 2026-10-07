// Edge Function: buat transaksi Midtrans Snap untuk pesanan milik pemanggil.
//
// Secrets (Supabase Dashboard -> Edge Functions -> Secrets). Server Key TIDAK BOLEH ada di kode/repo/chat:
//   MIDTRANS_SERVER_KEY_SANDBOX      (Midtrans > Environment: Sandbox > Settings > Access Keys)
//   MIDTRANS_SERVER_KEY_PRODUCTION   (Midtrans > Environment: Production > Settings > Access Keys)
//   SITE_URL=https://gitarsakti.com
//
// Keamanan: nominal dan isi pesanan dibaca dari database (sudah dihitung ulang oleh trigger
// orders_before_insert), bukan dari kiriman browser. Hanya pemilik pesanan yang masih "Pending"
// yang bisa membuat transaksi. Lingkungan (sandbox/production) dan Client Key diambil dari baris
// payment_methods yang dipilih saat checkout (type = 'midtrans').

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SITE_URL = (Deno.env.get("SITE_URL") || "https://gitarsakti.com").replace(/\/$/, "");
const HOSTS = {
  sandbox: { snapApi: "https://app.sandbox.midtrans.com/snap/v1/transactions", snapJs: "https://app.sandbox.midtrans.com/snap/snap.js" },
  production: { snapApi: "https://app.midtrans.com/snap/v1/transactions", snapJs: "https://app.midtrans.com/snap/snap.js" },
} as const;
const serverKeyFor = (env: "sandbox" | "production") =>
  (Deno.env.get(env === "production" ? "MIDTRANS_SERVER_KEY_PRODUCTION" : "MIDTRANS_SERVER_KEY_SANDBOX") || "").trim();

const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method tidak didukung." }, 405);

  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: userData } = await db.auth.getUser(jwt);
    const uid = userData?.user?.id;
    if (!uid) return json({ ok: false, error: "Sesi login tidak valid. Silakan masuk ulang." }, 401);

    const { orderId } = await req.json().catch(() => ({}));
    if (!orderId || typeof orderId !== "string") return json({ ok: false, error: "orderId wajib diisi." }, 400);

    const { data: order } = await db.from("orders").select("*").eq("id", orderId).eq("customer_id", uid).maybeSingle();
    if (!order) return json({ ok: false, error: "Pesanan tidak ditemukan." }, 404);
    if (order.payment !== "Pending") return json({ ok: false, error: "Pesanan ini sudah diproses." }, 409);

    const { data: method } = await db.from("payment_methods").select("*").eq("id", order.payment_method_id).maybeSingle();
    if (!method || method.type !== "midtrans" || !method.enabled) {
      return json({ ok: false, error: "Metode pembayaran online tidak tersedia untuk pesanan ini." }, 400);
    }
    const env: "sandbox" | "production" = method.midtrans_env === "production" ? "production" : "sandbox";
    const clientKey = String(method.midtrans_client_key || "").trim();
    const serverKey = serverKeyFor(env);
    if (!clientKey || !serverKey) {
      console.error(`Midtrans belum dikonfigurasi (env=${env}): clientKey=${!!clientKey} serverKey=${!!serverKey}`);
      return json({ ok: false, error: "Pembayaran online belum aktif. Silakan hubungi admin atau pilih metode lain." }, 503);
    }

    // Token Snap berlaku 24 jam. Kalau masih segar & lingkungannya sama, pakai lagi (buka ulang popup yang sama).
    const tokenAge = order.midtrans_token_at ? Date.now() - new Date(order.midtrans_token_at).getTime() : Infinity;
    if (order.midtrans_token && order.midtrans_env === env && tokenAge < 20 * 3600 * 1000) {
      return json({ ok: true, token: order.midtrans_token, clientKey, snapUrl: HOSTS[env].snapJs, env });
    }

    const attempt = (order.midtrans_attempt || 0) + 1;
    const midtransOrderId = attempt === 1 ? order.id : `${order.id}-${attempt}`;

    // Rincian barang. Total rincian HARUS sama dengan gross_amount, kalau tidak Midtrans menolak.
    const items = Array.isArray(order.items) ? order.items : [];
    const lines: { id: string; price: number; quantity: number; name: string }[] = items.map((it: any, i: number) => ({
      id: clip(it?.id ?? i + 1, 50),
      price: Math.round(Number(it?.price) || 0),
      quantity: Math.max(1, Math.round(Number(it?.qty) || 1)),
      name: clip(it?.name || "Produk", 50),
    }));
    if (Number(order.discount) > 0) lines.push({ id: "DISKON", price: -Math.round(Number(order.discount)), quantity: 1, name: "Diskon" });
    if (Number(order.shipping_fee) > 0) lines.push({ id: "ONGKIR", price: Math.round(Number(order.shipping_fee)), quantity: 1, name: "Ongkos kirim" });
    const grossAmount = Math.round(Number(order.total));
    const sum = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const itemDetails = sum === grossAmount ? lines : [{ id: clip(order.id, 50), price: grossAmount, quantity: 1, name: clip(`Pesanan ${order.id}`, 50) }];

    const payload = {
      transaction_details: { order_id: midtransOrderId, gross_amount: grossAmount },
      item_details: itemDetails,
      customer_details: {
        first_name: clip(order.customer_name, 100),
        email: clip(order.customer_email, 100),
        phone: clip(order.customer_phone, 20),
      },
      expiry: { unit: "hours", duration: 24 },
      callbacks: { finish: SITE_URL },
    };

    const res = await fetch(HOSTS[env].snapApi, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Basic " + btoa(serverKey + ":"),
      },
      body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out?.token) {
      console.error(`Midtrans menolak (${res.status}) order ${midtransOrderId}: ${JSON.stringify(out?.error_messages || out).slice(0, 500)}`);
      return json({ ok: false, error: "Gagal membuat pembayaran online. Coba lagi sebentar atau pilih metode lain." }, 502);
    }

    const { error: upErr } = await db.from("orders").update({
      midtrans_token: out.token,
      midtrans_order_id: midtransOrderId,
      midtrans_attempt: attempt,
      midtrans_env: env,
      midtrans_token_at: new Date().toISOString(),
    }).eq("id", order.id).eq("payment", "Pending");
    if (upErr) {
      console.error(`Gagal menyimpan token untuk ${order.id}: ${upErr.message}`);
      return json({ ok: false, error: "Gagal menyimpan pembayaran. Coba lagi." }, 500);
    }

    return json({ ok: true, token: out.token, clientKey, snapUrl: HOSTS[env].snapJs, env });
  } catch (e) {
    console.error(`midtrans-create-transaction error: ${(e as Error).message}`);
    return json({ ok: false, error: "Terjadi kesalahan. Coba lagi." }, 500);
  }
});
