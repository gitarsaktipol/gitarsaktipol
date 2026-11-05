// Render pratinjau 4 email pesanan ke folder (tanpa mengirim email).
// Pakai: node --experimental-strip-types scripts/preview-order-email.mjs <folder-keluaran>
import { writeFileSync, mkdirSync } from "node:fs";
import { renderOrderEmail, INTRO } from "../supabase/functions/send-order-email/template.ts";

const out = process.argv[2] || "email-preview";
mkdirSync(out, { recursive: true });
const site = "https://gitarsakti.com";
const digital = { id: "GS-CONTOH01", customer_name: "Budi", status: "Menunggu Pembayaran", discount: 0, total: 149000,
  items: [{ name: "Kelas Gitar Dasar (contoh)", qty: 1, price: 149000, type: "digital" }] };
const mixed = { id: "GS-CONTOH02", customer_name: "Budi", status: "Dikirim", discount: 20000, total: 244000, shipping_fee: 15000,
  tracking_number: "JNE1234567890", shipping_address: { name: "Budi", address: "Jl. Contoh No. 1", city: "Blitar" },
  items: [{ name: "Kelas Gitar Dasar (contoh)", qty: 1, price: 149000, type: "digital" }, { name: "Kaos Gitar Sakti (contoh) — L", qty: 2, price: 50000, type: "physical" }] };
const cases = [
  ["created", digital, INTRO.created],
  ["proof_uploaded", { ...digital, status: "Menunggu Verifikasi" }, INTRO.proof_uploaded],
  ["paid", { ...digital, status: "Selesai" }, "Pembayaran untuk pesanan berikut sudah kami terima. Produk kamu sudah bisa diakses di dashboard — selamat belajar!"],
  ["shipped", mixed, INTRO.shipped],
];
for (const [kind, order, intro] of cases) {
  const m = renderOrderEmail(kind, order, intro, site);
  writeFileSync(`${out}/${kind}.html`, m.html);
  writeFileSync(`${out}/${kind}.txt`, `Subjek: ${m.subject}\n\n${m.text}\n`);
}
console.log("ok", out);
