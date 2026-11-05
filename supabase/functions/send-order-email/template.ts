// Templat email pesanan Gitar Sakti (HTML + teks polos).
// Fungsi murni tanpa akses database/jaringan, supaya bisa dirender untuk pratinjau
// (lihat scripts/preview-order-email.mjs) tanpa mengirim email sungguhan.
//
// Tata letak: tabel 600 px di tengah (aman untuk Gmail, Outlook, Apple Mail), menyusut
// ke lebar layar di HP. Semua gaya inline; blok <style> hanya tambahan untuk HP.

export type EmailKind = "created" | "proof_uploaded" | "paid" | "shipped";

export interface EmailOrder {
  id: string;
  customer_name?: string | null;
  status?: string | null;
  discount?: number | null;
  total?: number | null;
  shipping_fee?: number | null;
  tracking_number?: string | null;
  shipping_address?: { name?: string; address?: string; city?: string } | null;
  items?: Array<{ name?: string; qty?: number; price?: number; type?: string }> | null;
}

// Warna merek (sama dengan situs): hitam, emas, abu.
const INK = "#1D1D1F";
const MUTED = "#6E6E73";
const FAINT = "#86868B";
const LINE = "#E5E5EA";
const GOLD = "#C9A24B";
const GOLD_DEEP = "#8A6416";
const CREAM = "#FBF6EA";
const CREAM_LINE = "#E8D29B";
const PAGE_BG = "#F2F2F4";

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export const rupiah = (n: unknown) => "Rp" + (Number(n) || 0).toLocaleString("id-ID");

export const SUBJECT: Record<EmailKind, (id: string) => string> = {
  created: (id) => `Pesanan Diterima — ${id}`,
  proof_uploaded: (id) => `Bukti Pembayaran Diterima — Pesanan ${id}`,
  paid: (id) => `Pembayaran Dikonfirmasi — Pesanan ${id}`,
  shipped: (id) => `Pesanan ${id} Sudah Dikirim`,
};
export const HEADING: Record<EmailKind, string> = {
  created: "Terima Kasih, Pesanan Kamu Diterima",
  proof_uploaded: "Bukti Pembayaran Kamu Sudah Kami Terima",
  paid: "Pembayaran Kamu Sudah Dikonfirmasi",
  shipped: "Paketmu Sedang Dalam Perjalanan",
};
export const INTRO: Record<EmailKind, string> = {
  created: "Kami sudah menerima pesanan kamu. Silakan selesaikan pembayaran sesuai instruksi di halaman konfirmasi, lalu unggah bukti transfernya.",
  proof_uploaded: "Bukti transfer kamu sudah kami terima dan sedang dicek oleh tim kami. Kami akan kirim email lagi begitu pembayaran terverifikasi.",
  paid: "Pembayaran untuk pesanan berikut sudah kami verifikasi. Kelas video sudah bisa diakses di dashboard kamu, dan merchandise segera kami kemas — selamat berlatih!",
  shipped: "Pesanan merchandise kamu sudah kami serahkan ke kurir. Nomor resi ada di bawah dan juga di menu Pesanan di dashboard.",
};
const FOOTNOTE = "Email ini dikirim otomatis oleh Gitar Sakti. Kalau kamu merasa tidak melakukan pemesanan ini, abaikan email ini.";
const BUTTON = "Masuk ke Akun";

export function renderOrderEmail(kind: EmailKind, order: EmailOrder, intro: string, siteUrl: string) {
  const items = Array.isArray(order.items) ? order.items : [];
  const site = esc(siteUrl);
  const lineTotal = (it: any) => (Number(it?.price) || 0) * (Number(it?.qty) || 1);
  const qtyTxt = (it: any) => (Number(it?.qty) > 1 ? ` ×${Number(it.qty)}` : "");
  const addr = order.shipping_address;
  const showResi = kind === "shipped" && !!order.tracking_number;

  const cell = (txt: string, extra = "") =>
    `<td style="padding:10px 0;font-family:${FONT};font-size:14px;line-height:1.45;color:${INK};${extra}">${txt}</td>`;
  const itemsRows = items.map((it: any, i: number) =>
    `<tr>${cell(esc(it?.name) + qtyTxt(it), i ? `border-top:1px solid ${LINE};` : "")}${cell(rupiah(lineTotal(it)), `text-align:right;white-space:nowrap;padding-left:12px;${i ? `border-top:1px solid ${LINE};` : ""}`)}</tr>`
  ).join("");
  const sumRow = (label: string, value: string) =>
    `<tr><td style="padding:3px 0;font-family:${FONT};font-size:13px;color:${MUTED};">${label}</td><td style="padding:3px 0;font-family:${FONT};font-size:13px;color:${INK};text-align:right;white-space:nowrap;">${value}</td></tr>`;

  const preheader = `Halo ${order.customer_name ?? ""}, ${intro}`.slice(0, 140);

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(SUBJECT[kind](order.id))}</title>
<style>
  @media only screen and (max-width:620px){
    .gs-pad{padding-left:20px!important;padding-right:20px!important;}
    .gs-h1{font-size:21px!important;line-height:1.3!important;}
    .gs-btn a{display:block!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAGE_BG};font-size:1px;line-height:1px;">${esc(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE_BG};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
    <tr><td align="center" style="background:${INK};padding:26px 24px 22px;">
      <img src="${site}/gitar-sakti-logo.png" width="60" height="60" alt="Gitar Sakti" style="display:block;margin:0 auto 10px;width:60px;height:60px;border-radius:14px;border:0;">
      <div style="font-family:${FONT};color:#ffffff;font-size:19px;font-weight:800;letter-spacing:2px;">GITAR SAKTI</div>
    </td></tr>
    <tr><td style="background:${GOLD};height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>
    <tr><td class="gs-pad" style="padding:32px 36px 8px;">
      <h1 class="gs-h1" style="margin:0 0 12px;font-family:${FONT};font-size:23px;line-height:1.3;font-weight:800;color:${INK};">${HEADING[kind]}</h1>
      <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.65;color:${MUTED};">Halo ${esc(order.customer_name)}, ${intro}</p>
    </td></tr>
    <tr><td class="gs-pad" style="padding:22px 36px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${LINE};border-radius:12px;">
        <tr><td style="padding:6px 16px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${itemsRows}
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${LINE};margin-top:${itemsRows ? "4px" : "6px"};">
            <tr><td colspan="2" style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>
            ${sumRow("Diskon", `-${rupiah(order.discount)}`)}
            ${addr ? sumRow("Ongkir", order.shipping_fee ? rupiah(order.shipping_fee) : "Gratis") : ""}
            <tr><td style="padding:8px 0 0;font-family:${FONT};font-size:15px;font-weight:800;color:${INK};">Total</td><td style="padding:8px 0 0;font-family:${FONT};font-size:17px;font-weight:800;color:${GOLD_DEEP};text-align:right;white-space:nowrap;">${rupiah(order.total)}</td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
    ${showResi ? `<tr><td class="gs-pad" style="padding:16px 36px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};border:1px solid ${CREAM_LINE};border-radius:12px;">
        <tr><td style="padding:14px 16px;font-family:${FONT};font-size:14px;color:${INK};">No. resi: <b style="font-size:16px;letter-spacing:.5px;">${esc(order.tracking_number)}</b></td></tr>
      </table>
    </td></tr>` : ""}
    ${addr ? `<tr><td class="gs-pad" style="padding:14px 36px 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">Dikirim ke: <b style="color:${INK};">${esc(addr.name)}</b>, ${esc(addr.address)}, ${esc(addr.city)}</td></tr>` : ""}
    <tr><td class="gs-pad" style="padding:12px 36px 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">ID Pesanan: <b style="color:${INK};">${esc(order.id)}</b> &nbsp;•&nbsp; Status: <b style="color:${INK};">${esc(order.status)}</b></td></tr>
    <tr><td class="gs-pad gs-btn" align="center" style="padding:26px 36px 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
        <td align="center" bgcolor="${INK}" style="border-radius:999px;">
          <a href="${site}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${BUTTON}</a>
        </td>
      </tr></table>
    </td></tr>
    <tr><td class="gs-pad" style="padding:22px 36px 28px;">
      <p style="margin:0;padding-top:16px;border-top:1px solid ${LINE};font-family:${FONT};font-size:11.5px;line-height:1.6;color:${FAINT};">${FOOTNOTE}</p>
    </td></tr>
  </table>
  <div style="font-family:${FONT};font-size:11px;color:${FAINT};padding:14px 0 0;"><a href="${site}" style="color:${FAINT};text-decoration:none;">gitarsakti.com</a></div>
</td></tr>
</table>
</body>
</html>`;

  // Versi teks polos (untuk aplikasi email yang tidak menampilkan HTML & mengurangi risiko spam).
  const t: string[] = ["GITAR SAKTI", "", HEADING[kind], "", `Halo ${order.customer_name ?? ""}, ${intro}`, ""];
  if (items.length) {
    for (const it of items) t.push(`- ${it?.name ?? ""}${qtyTxt(it)}: ${rupiah(lineTotal(it))}`);
    t.push("");
  }
  t.push(`Diskon: -${rupiah(order.discount)}`);
  if (addr) t.push(`Ongkir: ${order.shipping_fee ? rupiah(order.shipping_fee) : "Gratis"}`);
  t.push(`Total: ${rupiah(order.total)}`, "");
  if (showResi) t.push(`No. resi: ${order.tracking_number}`, "");
  if (addr) t.push(`Dikirim ke: ${addr.name ?? ""}, ${addr.address ?? ""}, ${addr.city ?? ""}`);
  t.push(`ID Pesanan: ${order.id} • Status: ${order.status ?? ""}`, "", `${BUTTON}: ${siteUrl}`, "", "---", FOOTNOTE);
  const text = t.join("\n");

  return { subject: SUBJECT[kind](order.id), html, text };
}
