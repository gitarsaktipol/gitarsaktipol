// Edge Function: ambil daftar video dari link YouTube (playlist ATAU satu/beberapa link video)
// supaya admin bisa bikin produk + kurikulum lengkap cukup dengan tempel link.
//
// Hanya admin yang boleh memanggil (dicek dari JWT sesi login).
// Opsional tapi disarankan: set secret YOUTUBE_API_KEY (YouTube Data API v3, gratis dari
// Google Cloud Console) supaya lebih stabil & dapat durasi tiap video secara akurat:
//   supabase secrets set YOUTUBE_API_KEY=AIza...
// Tanpa API key, function ini membaca halaman publik YouTube (tetap jalan untuk playlist
// publik/unlisted, tapi bisa berubah sewaktu-waktu kalau YouTube mengubah tampilannya).

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  YOUTUBE_API_KEY, MAX_VIDEOS, type Video, parseInput, playlistViaApi, playlistViaScrape, videosViaApi, videoViaScrape, mapLimit,
} from "./lib.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ---------- handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method tidak didukung." }, 405);

  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: userData } = await admin.auth.getUser(jwt);
    const uid = userData?.user?.id;
    if (!uid) return json({ ok: false, error: "Sesi login tidak valid. Silakan masuk ulang sebagai admin." }, 401);
    const { data: prof } = await admin.from("profiles").select("role").eq("id", uid).maybeSingle();
    if (prof?.role !== "admin") return json({ ok: false, error: "Hanya admin yang boleh import dari YouTube." }, 403);

    const body = await req.json().catch(() => ({}));
    const { playlists, videos: videoIds } = parseInput(body?.url || body?.text || "");
    if (playlists.length === 0 && videoIds.length === 0) {
      return json({ ok: false, error: "Link YouTube tidak dikenali. Tempel link playlist (…/playlist?list=…) atau link video (youtu.be/… / youtube.com/watch?v=…)." });
    }

    const warnings: string[] = [];
    let title = "";
    let description = "";
    const videos: Video[] = [];

    for (const listId of playlists) {
      const r = YOUTUBE_API_KEY ? await playlistViaApi(listId) : await playlistViaScrape(listId);
      if (!title) { title = r.title; description = r.description; }
      videos.push(...r.videos);
    }

    if (videoIds.length > 0) {
      let singles: Video[];
      if (YOUTUBE_API_KEY) singles = await videosViaApi(videoIds);
      else singles = (await mapLimit(videoIds, 5, videoViaScrape)).filter(Boolean) as Video[];
      const missing = videoIds.length - singles.length;
      if (missing > 0) warnings.push(`${missing} link video tidak bisa dibaca (mungkin privat/dihapus) dan dilewati.`);
      videos.push(...singles);
      if (!title && singles.length === 1) { title = singles[0].title; description = singles[0].description; }
    }

    // Buang duplikat (video yang sama muncul 2x)
    const seen = new Set<string>();
    const unique = videos.filter((v) => (seen.has(v.videoId) ? false : (seen.add(v.videoId), true))).slice(0, MAX_VIDEOS);
    if (unique.length === 0) return json({ ok: false, error: "Tidak ada video yang bisa diambil dari link tersebut." });
    if (!YOUTUBE_API_KEY && unique.some((v) => !v.duration)) {
      warnings.push("Sebagian durasi video tidak terbaca. Pasang YOUTUBE_API_KEY di Supabase secrets supaya durasi selalu akurat.");
    }

    return json({ ok: true, source: playlists.length > 0 ? "playlist" : "videos", title, description, videos: unique, warnings });
  } catch (e) {
    return json({ ok: false, error: (e as Error)?.message || "Gagal mengambil data dari YouTube." });
  }
});
