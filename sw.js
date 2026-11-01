// Boston Sports. Cache names start with "bs-" and only "bs-" caches are ever cleaned up,
// so this never touches the caches of other apps on the same site.
const SHELL = "bs-shell-v55";
const DATA = "bs-data";
const SHELL_FILES = ["./", "index.html", "manifest.webmanifest",
  "css/base.css", "css/sports.css", "js/app.js", "js/sports.js",
  "icons/ps-icon-192.png", "icons/ps-icon-512.png", "brand/logo-full.svg", "brand/logo-horizontal.svg",
  "fonts/manrope-latin-500-normal.woff2", "fonts/manrope-latin-600-normal.woff2",
  "fonts/manrope-latin-700-normal.woff2", "fonts/manrope-latin-800-normal.woff2",
  "fonts/barlow-condensed-latin-500-normal.woff2", "fonts/barlow-condensed-latin-600-normal.woff2",
  "fonts/barlow-condensed-latin-700-normal.woff2", "fonts/archivo-black-latin-400-normal.woff2"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("bs-") && k !== SHELL && k !== DATA).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network first (new issues and app updates show up right away), cache when offline.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const bucket = url.pathname.endsWith(".json") ? DATA : SHELL;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(bucket).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
