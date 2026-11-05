// Edge Function: kirim email konfirmasi/invoice pesanan lewat Resend.
// Secrets yang dipakai (Supabase Dashboard -> Edge Functions -> Secrets):
//   RESEND_API_KEY=re_xxxxxxxxxxxx                       (wajib)
//   SITE_URL=https://gitarsakti.com                       (link tombol "Masuk ke Akun")
//   FROM_EMAIL="Gitar Sakti <no-reply@gitarsakti.com>"    (domain harus diverifikasi di Resend)
//
// Keamanan: isi email TIDAK diambil dari data kiriman browser. Function ini hanya menerima
// { orderId, kind }, lalu membaca pesanan langsung dari database. Email hanya dikirim ke
// pemilik pesanan, dan hanya kalau yang memanggil adalah pemilik pesanan itu sendiri atau admin
// (kind "paid" khusus admin). Jadi function ini tidak bisa disalahgunakan untuk spam/phishing.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { INTRO, SUBJECT, renderOrderEmail, type EmailKind } from "./template.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "https://gitarsakti.com";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Gitar Sakti <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY belum di-set sebagai secret." }, 500);

    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    // Panggilan internal dari Edge Function lain (mis. midtrans-webhook) memakai service role key.
    // Itu bukan JWT pengguna, jadi dianggap setara admin dan melewati pemeriksaan pengguna.
    const isService = jwt !== "" && jwt === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    let uid: string | undefined;
    if (!isService) {
      const { data: userData } = await db.auth.getUser(jwt);
      uid = userData?.user?.id;
      if (!uid) return json({ error: "Tidak terautentikasi." }, 401);
    }

    const { orderId, kind: rawKind } = await req.json();
    const kind: EmailKind = Object.hasOwn(SUBJECT, rawKind ?? "") ? rawKind : "created";
    if (!orderId) return json({ error: "orderId wajib diisi." }, 400);

    const { data: order } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return json({ error: "Pesanan tidak ditemukan." }, 404);
    const { data: caller } = isService ? { data: null } : await db.from("profiles").select("role").eq("id", uid).maybeSingle();
    const isAdmin = isService || caller?.role === "admin";
    const adminOnly = kind === "paid" || kind === "shipped";
    if (adminOnly ? !(isAdmin && order.payment === "PAID") : !(isAdmin || order.customer_id === uid)) {
      return json({ error: "Tidak diizinkan." }, 403);
    }

    const items = Array.isArray(order.items) ? order.items : [];

    // Kalimat pembuka menyesuaikan isi pesanan (produk digital / merchandise / campuran) dan metode bayar,
    // supaya tidak menyebut hal yang tidak dibeli (mis. "merchandise" untuk pembeli kelas saja).
    const hasPhysical = items.some((it: any) => it?.type === "physical");
    const hasDigital = items.some((it: any) => (it?.type || "digital") !== "physical");
    const { data: payMethod } = order.payment_method_id
      ? await db.from("payment_methods").select("type").eq("id", order.payment_method_id).maybeSingle()
      : { data: null };
    let intro = INTRO[kind];
    if (kind === "paid") {
      intro = hasPhysical && hasDigital
        ? "Pembayaran untuk pesanan berikut sudah kami terima. Produk digital kamu sudah bisa diakses di dashboard, dan merchandise segera kami kemas — terima kasih!"
        : hasPhysical
          ? "Pembayaran untuk pesanan berikut sudah kami terima. Pesananmu segera kami kemas dan kirim — terima kasih!"
          : "Pembayaran untuk pesanan berikut sudah kami terima. Produk kamu sudah bisa diakses di dashboard — selamat belajar!";
    } else if (kind === "created" && payMethod?.type === "midtrans") {
      intro = "Kami sudah menerima pesanan kamu. Silakan selesaikan pembayaran lewat tombol \"Bayar Sekarang\" di halaman konfirmasi atau di menu Pesanan pada dashboard kamu.";
    }
    const mail = renderOrderEmail(kind, order, intro, SITE_URL);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: order.customer_email, subject: mail.subject, html: mail.html, text: mail.text }),
    });
    if (!res.ok) return json({ error: await res.text() }, 502);
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
