/* Service worker du Carnet de dépenses.
   Incrémenter VERSION à chaque modification des fichiers pour forcer la mise à jour. */
const VERSION = "v1";
const CACHE = "carnet-depenses-" + VERSION;
const FONTS_CACHE = "carnet-depenses-fonts";

// Chemins relatifs à l'emplacement de sw.js : marche sous /depenses/ sur GitHub Pages.
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-192.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS.map(u => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k.startsWith("carnet-depenses-") && k !== CACHE && k !== FONTS_CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache d'abord, réseau en secours.
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !isFont) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: sameOrigin }).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(isFont ? FONTS_CACHE : CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => {
        // Hors ligne : une navigation retombe sur la page de l'appli.
        if (req.mode === "navigate") return caches.match("index.html");
        return Response.error();
      });
    })
  );
});
