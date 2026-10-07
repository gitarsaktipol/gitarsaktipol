// Edge Function: penerima notifikasi pembayaran Midtrans (HTTP Notification / webhook).
// Daftarkan di Midtrans Dashboard > Settings > Payment > Notification URL (isi untuk Sandbox DAN Production):
//   https://addtajuxfoxcaezmkice.supabase.co/functions/v1/midtrans-webhook
//
// Function ini dibuat verify_jwt = false (Midtrans tidak mengirim JWT Supabase). Keamanannya:
//  1. signature_key = SHA512(order_id + status_code + gross_amount + ServerKey) HARUS cocok
//     (dicoba dengan kunci sandbox lalu production; yang cocok menentukan lingkungannya).
//  2. Status dicek ulang langsung ke API Midtrans (bukan percaya isi kiriman), dan nominalnya
//     harus sama dengan total pesanan di database.
//  3. Pesanan hanya bisa ditandai lunas lewat fungsi database yang khusus service_role.
// Secrets: MIDTRANS_SERVER_KEY_SANDBOX, MIDTRANS_SERVER_KEY_PRODUCTION (+ opsional TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID).

import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const ENV_KEYS = {
  sandbox: { secret: "MIDTRANS_SERVER_KEY_SANDBOX", api: "https://api.sandbox.midtrans.com" },
  production: { secret: "MIDTRANS_SERVER_KEY_PRODUCTION", api: "https://api.midtrans.com" },
} as const;

async function sha512Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};
const rupiah = (n: unknown) => "Rp" + (Number(n) || 0).toLocaleString("id-ID");

async function notifyTelegram(text: string) {
  const token = (Deno.env.get("TELEGRAM_BOT_TOKEN") || "").trim();
  const chat = (Deno.env.get("TELEGRAM_CHAT_ID") || "").trim();
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
    });
  } catch (_e) { /* notifikasi gagal tidak boleh menggagalkan webhook */ }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Method tidak didukung." }, 405);

  try {
    const n = await req.json().catch(() => null);
    const orderId = String(n?.order_id ?? "");
    const statusCode = String(n?.status_code ?? "");
    const gross = String(n?.gross_amount ?? "");
    const signature = String(n?.signature_key ?? "").toLowerCase();
    if (!orderId || !statusCode || !gross || !signature) return json({ ok: false, error: "Data tidak lengkap." }, 400);

    // 1. Verifikasi tanda tangan -> tentukan lingkungan
    let env: "sandbox" | "production" | null = null;
    let serverKey = "";
    for (const e of ["sandbox", "production"] as const) {
      const key = (Deno.env.get(ENV_KEYS[e].secret) || "").trim();
      if (key && safeEqual(await sha512Hex(orderId + statusCode + gross + key), signature)) { env = e; serverKey = key; break; }
    }
    if (!env) {
      console.error(`Tanda tangan tidak cocok untuk order_id=${orderId}`);
      return json({ ok: false, error: "Tanda tangan tidak valid." }, 401);
    }

    // 2. Cek ulang status ke Midtrans (sumber kebenaran)
    const sres = await fetch(`${ENV_KEYS[env].api}/v2/${encodeURIComponent(orderId)}/status`, {
      headers: { Accept: "application/json", Authorization: "Basic " + btoa(serverKey + ":") },
    });
    const st = await sres.json().catch(() => ({}));
    if (!sres.ok || String(st?.status_code) === "404") {
      // Mis. tombol "Test notification" di dashboard Midtrans memakai order_id contoh. Jawab 200 supaya tidak diulang terus.
      console.error(`Status Midtrans untuk ${orderId} tidak ditemukan (${sres.status}).`);
      return json({ ok: true, ignored: true });
    }

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    // order_id Midtrans = id pesanan (percobaan 1) atau "<id pesanan>-<n>" (percobaan ke-n). Pembayaran dari
    // percobaan lama tetap harus tercatat (uang sudah masuk), jadi cari lewat kedua bentuk id.
    const baseId = orderId.replace(/-\d+$/, "");
    const { data: found } = await db.from("orders").select("*").in("id", [orderId, baseId]);
    const order = (found || []).find((o: any) => o.id === orderId) || (found || [])[0];
    if (!order || !(orderId === order.id || orderId.startsWith(order.id + "-"))) {
      console.error(`Pesanan untuk order_id Midtrans=${orderId} tidak ada.`);
      return json({ ok: true, ignored: true });
    }

    // 3. Nominal harus sama dengan total di database
    if (Math.round(Number(st.gross_amount)) !== Math.round(Number(order.total))) {
      console.error(`Nominal tidak cocok untuk ${order.id}: midtrans=${st.gross_amount} db=${order.total}`);
      return json({ ok: false, error: "Nominal tidak cocok." }, 400);
    }

    const ts = String(st.transaction_status || "");
    const fraud = String(st.fraud_status || "");
    const via = String(st.payment_type || "");

    if ((ts === "settlement") || (ts === "capture" && (fraud === "accept" || fraud === ""))) {
      const { data: newly, error } = await db.rpc("system_mark_order_paid", { p_order_id: order.id, p_via: via });
      if (error) { console.error(`Gagal menandai lunas ${order.id}: ${error.message}`); return json({ ok: false, error: "Gagal memproses." }, 500); }
      if (newly) {
        // Email "Pembayaran Dikonfirmasi" ke pembeli lewat send-order-email (Resend), dipanggil dengan service role key.
        try {
          const er = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-order-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ orderId: order.id, kind: "paid" }),
          });
          if (!er.ok) console.error(`Email pembayaran ditolak (${er.status}) untuk ${order.id}: ${(await er.text()).slice(0, 200)}`);
        } catch (e) { console.error(`Email pembayaran gagal untuk ${order.id}: ${(e as Error).message}`); }
        await notifyTelegram(
          `💳 Pembayaran Online Masuk!\n\nID Pesanan: ${order.id}\nPembeli: ${order.customer_name || "-"}\nTotal: ${rupiah(order.total)}\nMetode: ${via || "Midtrans"}\n\nProduk sudah otomatis aktif di akun pembeli.`,
        );
      }
    } else if (["deny", "cancel", "expire", "failure"].includes(ts)) {
      // Hanya percobaan bayar TERBARU yang boleh membatalkan pesanan (percobaan lama yang kedaluwarsa diabaikan).
      if (order.midtrans_order_id === orderId) await db.rpc("system_fail_order", { p_order_id: order.id });
    }
    // pending / authorize / refund / dll: tidak ada perubahan

    return json({ ok: true });
  } catch (e) {
    console.error(`midtrans-webhook error: ${(e as Error).message}`);
    return json({ ok: false, error: "Terjadi kesalahan." }, 500);
  }
});
