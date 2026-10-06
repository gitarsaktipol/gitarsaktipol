// Edge Function: pengguna menghapus akunnya sendiri dari aplikasi FerTune
// (syarat Google Play untuk aplikasi yang membolehkan pembuatan akun).
//
// Akun ini SAMA dengan akun website Gitar Sakti, jadi aturannya hati-hati:
//  - Hanya akun milik pemanggil (dari JWT). Admin tidak pernah dihapus lewat sini.
//  - Wajib body {"confirm": true}.
//  - Kalau akun punya pesanan/testimoni (riwayat transaksi harus disimpan), akun TIDAK dihapus;
//    yang dihapus hanya data cloud FerTune (tabel fertune_scores). Hasilnya scope="fertune_only".
//  - Kalau tidak ada riwayat pesanan, seluruh akun dihapus (profil, progres belajar, partitur ikut
//    terhapus lewat ON DELETE CASCADE). Hasilnya scope="account".

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method tidak didukung." }, 405);

  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: userData } = await admin.auth.getUser(jwt);
    const uid = userData?.user?.id;
    if (!uid) return json({ ok: false, error: "Sesi login tidak valid. Silakan masuk ulang." }, 401);

    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== true) return json({ ok: false, error: "Konfirmasi diperlukan." }, 400);

    const { data: prof } = await admin.from("profiles").select("role").eq("id", uid).maybeSingle();
    if (prof?.role === "admin") return json({ ok: false, error: "Akun admin tidak bisa dihapus dari aplikasi." }, 403);

    const [orders, testi] = await Promise.all([
      admin.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", uid),
      admin.from("testimonials").select("id", { count: "exact", head: true }).eq("customer_id", uid),
    ]);
    if (orders.error || testi.error) return json({ ok: false, error: "Gagal memeriksa data akun. Coba lagi." }, 500);

    if ((orders.count ?? 0) > 0 || (testi.count ?? 0) > 0) {
      const del = await admin.from("fertune_scores").delete().eq("user_id", uid);
      if (del.error) return json({ ok: false, error: "Gagal menghapus data FerTune. Coba lagi." }, 500);
      return json({ ok: true, scope: "fertune_only" });
    }

    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) return json({ ok: false, error: "Gagal menghapus akun. Coba lagi." }, 500);
    return json({ ok: true, scope: "account" });
  } catch (_e) {
    return json({ ok: false, error: "Terjadi kesalahan. Coba lagi." }, 500);
  }
});
