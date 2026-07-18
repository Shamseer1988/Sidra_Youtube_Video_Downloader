// Sidra Media service worker — enables PWA install.
// Strategy: network-first for everything (this is a live media app);
// cache the app icons for offline shell niceties. Media streams and API
// calls are never cached.
const CACHE = "sidra-static-v1";
const PRECACHE = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  // Never intercept API or media streaming requests.
  if (url.pathname.startsWith("/api/")) return;

  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((hit) => hit || fetch(event.request)),
    );
  }
  // Everything else: default network behavior.
});
