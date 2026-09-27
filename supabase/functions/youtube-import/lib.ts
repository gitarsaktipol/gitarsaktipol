// Logika pengambilan data YouTube (dipakai oleh index.ts). Dipisah supaya bisa diuji terpisah.

export const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY") || "";
export const MAX_VIDEOS = 500;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const YT_HEADERS = {
  "User-Agent": UA,
  "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
  // Lewati halaman persetujuan cookie (muncul kalau function dijalankan dari server di Eropa).
  "Cookie": "CONSENT=YES+cb; SOCS=CAI",
};

export type Video = { videoId: string; title: string; description: string; duration: string; url: string; thumbnail: string };

// ---------- parsing link ----------
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function parseInput(text: string) {
  const playlists: string[] = [];
  const videos: string[] = [];
  const tokens = String(text || "").split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
  for (const raw of tokens) {
    let u: URL | null = null;
    try {
      u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch { /* bukan URL */ }
    if (!u || !/(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$/i.test(u.hostname)) {
      if (VIDEO_ID_RE.test(raw)) videos.push(raw);
      continue;
    }
    const list = u.searchParams.get("list");
    if (list && !/^(WL|LL|LM)$/.test(list)) { playlists.push(list); continue; }
    let id: string | null = null;
    if (/youtu\.be$/i.test(u.hostname)) id = u.pathname.split("/").filter(Boolean)[0] || null;
    else if (u.searchParams.get("v")) id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
      if (m) id = m[1];
    }
    if (id && VIDEO_ID_RE.test(id)) videos.push(id);
  }
  return { playlists: [...new Set(playlists)], videos: [...new Set(videos)] };
}

// ---------- util ----------
export function fmtSeconds(total: number) {
  if (!Number.isFinite(total) || total <= 0) return "";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

function isoDurationToSeconds(iso: string) {
  const m = String(iso || "").match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (+(m[1] || 0)) * 86400 + (+(m[2] || 0)) * 3600 + (+(m[3] || 0)) * 60 + (+(m[4] || 0));
}

function textOf(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.simpleText) return node.simpleText;
  if (node.content) return node.content;
  if (Array.isArray(node.runs)) return node.runs.map((r: any) => r.text || "").join("");
  return "";
}

function videoFromId(videoId: string, title: string, seconds = 0, description = "", durationText = ""): Video {
  return {
    videoId,
    title: (title || "").trim() || "Video",
    description: (description || "").trim(),
    duration: fmtSeconds(seconds) || durationText || "",
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

async function fetchText(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, headers: { ...YT_HEADERS, ...(init.headers || {}) }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`YouTube merespons ${res.status}`);
  return await res.text();
}

// Ambil objek JSON setelah "<varName> =" di HTML, dengan pencocokan kurung kurawal.
export function extractJsonVar(html: string, varName: string): any | null {
  const re = new RegExp(`(?:var\\s+|window\\[["']|\\b)${varName}["']?\\]?\\s*=\\s*\\{`);
  const m = re.exec(html);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  let depth = 0, inStr = false, esc = false, quote = "";
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === quote) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'") { inStr = true; quote = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function collect(obj: any, key: string, out: any[] = []) {
  if (!obj || typeof obj !== "object") return out;
  if (Array.isArray(obj)) { for (const it of obj) collect(it, key, out); return out; }
  for (const k of Object.keys(obj)) {
    if (k === key) out.push(obj[k]);
    else collect(obj[k], key, out);
  }
  return out;
}

export function videosFromInitialData(data: any): Video[] {
  const list: Video[] = [];
  for (const r of collect(data, "playlistVideoRenderer")) {
    if (!r?.videoId) continue;
    if (r.isPlayable === false) continue; // video privat/dihapus di dalam playlist
    list.push(videoFromId(r.videoId, textOf(r.title), Number(r.lengthSeconds) || 0, "", textOf(r.lengthText)));
  }
  if (list.length === 0) {
    // Tata letak baru YouTube ("lockupViewModel")
    for (const l of collect(data, "lockupViewModel")) {
      if (!l?.contentId || (l.contentType && l.contentType !== "LOCKUP_CONTENT_TYPE_VIDEO")) continue;
      const title = textOf(l?.metadata?.lockupMetadataViewModel?.title);
      const badges = collect(l, "thumbnailBadgeViewModel");
      // Teks badge durasi: "12:34" (hl=en) atau "12.34" (hl=id)
      const durText = badges.map((b: any) => b?.text).find((t: any) => typeof t === "string" && /^\d+([:.]\d{2}){1,2}$/.test(t)) || "";
      list.push(videoFromId(l.contentId, title, 0, "", durText.replace(/\./g, ":")));
    }
  }
  return list;
}

// Token untuk memuat video berikutnya (playlist > 100 video). Tata letak lama menaruhnya di
// continuationItemRenderer, tata letak baru di continuationItemViewModel.
function findContinuationToken(obj: any): string | null {
  if (!obj || typeof obj !== "object") return null;
  if (typeof obj.continuationCommand?.token === "string") return obj.continuationCommand.token;
  for (const v of Array.isArray(obj) ? obj : Object.values(obj)) {
    const t = findContinuationToken(v);
    if (t) return t;
  }
  return null;
}

export function continuationToken(data: any): string | null {
  for (const key of ["continuationItemRenderer", "continuationItemViewModel"]) {
    for (const c of collect(data, key)) {
      const t = findContinuationToken(c);
      if (t) return t;
    }
  }
  return null;
}

// ---------- playlist ----------
export async function playlistViaApi(listId: string) {
  const meta = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${listId}&key=${YOUTUBE_API_KEY}`).then((r) => r.json());
  if (meta.error) throw new Error(meta.error.message || "YouTube API error");
  const snippet = meta.items?.[0]?.snippet;
  if (!snippet) throw new Error("Playlist tidak ditemukan atau bersifat privat.");
  const items: { id: string; title: string; description: string }[] = [];
  let pageToken = "";
  do {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${listId}&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ""}`).then((x) => x.json());
    if (r.error) throw new Error(r.error.message || "YouTube API error");
    for (const it of r.items || []) {
      const id = it.contentDetails?.videoId;
      const t = it.snippet?.title || "";
      if (!id || t === "Private video" || t === "Deleted video") continue;
      items.push({ id, title: t, description: it.snippet?.description || "" });
    }
    pageToken = r.nextPageToken || "";
  } while (pageToken && items.length < MAX_VIDEOS);
  const durations = await durationsViaApi(items.map((i) => i.id));
  return {
    title: snippet.title || "",
    description: snippet.description || "",
    videos: items.map((i) => videoFromId(i.id, i.title, durations[i.id] || 0, i.description)),
  };
}

export async function playlistViaScrape(listId: string) {
  const html = await fetchText(`https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}&hl=en&gl=ID`);
  const data = extractJsonVar(html, "ytInitialData");
  if (!data) throw new Error("Tidak bisa membaca halaman playlist. Pastikan playlist bersifat Publik atau Tidak Publik (unlisted), bukan Privat.");
  const title = data?.metadata?.playlistMetadataRenderer?.title
    || textOf(data?.header?.playlistHeaderRenderer?.title)
    || textOf(data?.header?.pageHeaderRenderer?.pageTitle)
    || "";
  const description = data?.metadata?.playlistMetadataRenderer?.description || "";
  const videos = videosFromInitialData(data);

  // Playlist > 100 video dimuat bertahap lewat token lanjutan.
  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] || "2.20240101.00.00";
  const visitorData = html.match(/"VISITOR_DATA":"([^"]+)"/)?.[1];
  let token = continuationToken(data);
  let guard = 0;
  while (token && apiKey && videos.length < MAX_VIDEOS && guard++ < 10) {
    const res = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}&prettyPrint=false`, {
      method: "POST",
      headers: {
        ...YT_HEADERS,
        "Content-Type": "application/json",
        "X-Youtube-Client-Name": "1",
        "X-Youtube-Client-Version": clientVersion,
        ...(visitorData ? { "X-Goog-Visitor-Id": visitorData } : {}),
      },
      body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion, hl: "en", gl: "ID", visitorData } }, continuation: token }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) break;
    const more = await res.json();
    const added = videosFromInitialData(more);
    if (added.length === 0) break;
    videos.push(...added);
    token = continuationToken(more);
  }
  if (videos.length === 0) throw new Error("Playlist kosong, privat, atau tidak ditemukan.");
  return { title, description, videos };
}

// ---------- video satuan ----------
async function durationsViaApi(ids: string[]) {
  const out: Record<string, number> = {};
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${chunk.join(",")}&key=${YOUTUBE_API_KEY}`).then((x) => x.json());
    for (const it of r.items || []) out[it.id] = isoDurationToSeconds(it.contentDetails?.duration);
  }
  return out;
}

export async function videosViaApi(ids: string[]) {
  const out: Video[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${chunk.join(",")}&key=${YOUTUBE_API_KEY}`).then((x) => x.json());
    if (r.error) throw new Error(r.error.message || "YouTube API error");
    const byId: Record<string, any> = {};
    for (const it of r.items || []) byId[it.id] = it;
    for (const id of chunk) {
      const it = byId[id];
      if (!it) continue;
      out.push(videoFromId(id, it.snippet?.title, isoDurationToSeconds(it.contentDetails?.duration), it.snippet?.description));
    }
  }
  return out;
}

export async function videoViaScrape(id: string): Promise<Video | null> {
  try {
    const html = await fetchText(`https://www.youtube.com/watch?v=${id}&hl=en&gl=ID`);
    const pr = extractJsonVar(html, "ytInitialPlayerResponse");
    const d = pr?.videoDetails;
    if (d?.videoId) return videoFromId(id, d.title, Number(d.lengthSeconds) || 0, d.shortDescription || "");
  } catch { /* coba oEmbed */ }
  try {
    const o = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { signal: AbortSignal.timeout(10000) });
    if (o.ok) {
      const j = await o.json();
      return videoFromId(id, j.title || "");
    }
  } catch { /* abaikan */ }
  return null;
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

