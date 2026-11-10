// Edge Function: memeriksa langganan Premium FerTune yang dibeli lewat Google Play.
//
// Dipanggil aplikasi FerTune (TWA Play Store) setelah membeli / saat dibuka (maks 1x sehari per token),
// dengan body {"sku": "premium_bulanan" | "premium_tahunan", "purchaseToken": "..."}.
//  - Token diperiksa ke Google Play Developer API (subscriptionsv2) memakai akun layanan Google Cloud
//    (secret GOOGLE_PLAY_SERVICE_ACCOUNT = isi file JSON kunci akun layanan). Token palsu otomatis ditolak Google.
//  - Pembelian yang belum di-acknowledge akan di-acknowledge (kalau tidak, Google mengembalikan uang setelah 3 hari).
//  - Pesanan yang aktif dicatat ke tabel fertune_purchases (source "playstore", ref = nomor pesanan Google Play,
//    unik → perpanjangan tiap periode = baris baru, panggilan berulang tidak menggandakan).
//    Masa gratis (free trial) dicatat nominal 0; pembelian penguji lisensi diberi label "(uji)" dan nominal 0.
//  - Login TIDAK wajib (FerTune bisa dipakai tanpa akun). Bila ada JWT pengguna yang sah, user_id ikut dicatat
//    DAN akun itu ikut Premium sampai masa langganan berakhir (RPC fertune_play_grant → fertune_grants), jadi
//    pembeli Play juga Premium di web. Satu langganan hanya untuk satu akun.
//  - verify_jwt=false: fungsi memeriksa sendiri (keabsahan ditentukan Google, bukan pemanggil).
//
// Hak Premium di aplikasi TIDAK bergantung pada fungsi ini (aplikasi membaca langganan langsung dari Google Play
// di HP), jadi bila fungsi ini gagal, pengguna tetap Premium; hanya pencatatan yang tertunda.

import { createClient } from "jsr:@supabase/supabase-js@2";

const PACKAGE = "com.gitarsakti.fertune";
// Harga untuk catatan admin (Rupiah). Harga sebenarnya diatur di Play Console.
const PRICE: Record<string, number> = { premium_bulanan: 45000, premium_tahunan: 350000 };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const b64url = (data: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

let cachedToken: { token: string; exp: number } | null = null;

// Token akses Google (OAuth2, alur akun layanan / JWT bearer).
async function googleAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const raw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT");
  if (!raw) throw new Error("NO_SERVICE_ACCOUNT");
  const sa = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${b64url(sig)}`,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error("GOOGLE_AUTH_FAILED");
  cachedToken = { token: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 };
  return cachedToken.token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method tidak didukung." }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const sku = String(body?.sku || "");
    const token = String(body?.purchaseToken || "");
    if (!(sku in PRICE)) return json({ ok: false, error: "Produk tidak dikenal." }, 400);
    if (!token || token.length > 2000 || !/^[\w.\-:]+$/.test(token)) return json({ ok: false, error: "Token tidak sah." }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // Pengguna yang sedang login (opsional).
    let uid: string | null = null;
    let email: string | null = null;
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (jwt) {
      const { data } = await admin.auth.getUser(jwt).catch(() => ({ data: null as any }));
      uid = data?.user?.id ?? null;
      email = data?.user?.email ?? null;
    }

    let access: string;
    try {
      access = await googleAccessToken();
    } catch (e) {
      const msg = (e as Error).message;
      return json({ ok: false, error: msg === "NO_SERVICE_ACCOUNT" ? "Server belum disambungkan ke Google Play." : "Gagal masuk ke Google Play API." }, 503);
    }

    const api = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;
    const r = await fetch(`${api}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (r.status === 404 || r.status === 410 || r.status === 400) return json({ ok: true, active: false }, 200);
    if (!r.ok) return json({ ok: false, error: "Google Play tidak menjawab. Coba lagi nanti." }, 502);
    const sub = await r.json();

    const state = String(sub.subscriptionState || "");
    const active = state === "SUBSCRIPTION_STATE_ACTIVE" || state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD";
    const items: any[] = Array.isArray(sub.lineItems) ? sub.lineItems : [];
    const item = items.find((x) => x.productId === sku) || items[0] || {};
    const productId = String(item.productId || sku);
    if (!(productId in PRICE)) return json({ ok: false, error: "Produk tidak dikenal." }, 400);

    // Acknowledge (wajib dalam 3 hari).
    if (active && sub.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING") {
      await fetch(`${api}/purchases/subscriptions/${productId}/tokens/${encodeURIComponent(token)}:acknowledge`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => null);
    }

    // Catat pesanan (sekali per nomor pesanan).
    const orderId = String(item.latestSuccessfulOrderId || sub.latestOrderId || "");
    if (active && orderId) {
      const isTest = !!sub.testPurchase;
      const isTrial = !!item.offerPhase?.freeTrial;
      await admin.from("fertune_purchases").upsert({
        user_id: uid,
        source: "playstore",
        product: productId + (isTest ? " (uji)" : isTrial ? " (masa gratis)" : ""),
        amount: isTest || isTrial ? 0 : PRICE[productId],
        status: "paid",
        ref: orderId,
      }, { onConflict: "ref", ignoreDuplicates: true });
    }

    // Premium menempel di AKUN: bila pembeli sedang masuk akun, akunnya ikut Premium sampai masa langganan berakhir
    // (berlaku juga di web). Satu langganan Play hanya untuk satu akun (fertune_play_links).
    let linked = false;
    if (active && email && item.expiryTime) {
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))))
        .map((b) => b.toString(16).padStart(2, "0")).join("");
      const { data: ok } = await admin.rpc("fertune_play_grant", { p_token_hash: hash, p_email: email, p_until: item.expiryTime });
      linked = ok === true;
    }

    return json({ ok: true, active, sku: productId, expiry: item.expiryTime || null, linked });
  } catch (_e) {
    return json({ ok: false, error: "Terjadi kesalahan. Coba lagi." }, 500);
  }
});
