// Service worker minimal -- cuma supaya browser mengizinkan tombol "Install app".
// Tidak menyimpan data offline, tidak mengubah perilaku website; semua tetap
// dimuat langsung dari internet seperti biasa.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {}); // wajib ada minimal 1 listener fetch supaya PWA dianggap "installable"
