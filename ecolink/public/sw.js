const CACHE_VERSION = "ecolink-pwa-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const SAME_ORIGIN_STATIC_ASSETS = [
  "/",
  "/ecolink-icon-192.png",
  "/ecolink-icon-512.png",
  "/ecolink-maskable-512.png",
  "/eco-guide-bot.svg",
  "/map-recycling-center.svg",
  "/map-waste-report.svg",
  "/recycle-car.svg",
];

function offlineFallback() {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#087c78">
    <title>EcoLink Offline</title>
    <style>
      body {
        min-height: 100dvh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #f2f7f7;
        color: #173547;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(100%, 360px);
        border: 1px solid #d8e3e5;
        border-radius: 16px;
        background: white;
        padding: 24px;
        box-shadow: 0 18px 60px rgba(11, 53, 88, .08);
      }
      h1 {
        margin: 0;
        color: #0b3558;
        font-size: 1.35rem;
      }
      p {
        margin: 10px 0 0;
        color: #526a75;
        line-height: 1.55;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>EcoLink is offline</h1>
      <p>Reconnect to load maps, reports, rewards, and account data. Cached app assets will be ready when the network returns.</p>
    </main>
  </body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
      status: 503,
      statusText: "Offline",
    },
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(SAME_ORIGIN_STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("ecolink-pwa-") && key !== APP_SHELL_CACHE && key !== STATIC_CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/auth/")) return;
  if (url.pathname.startsWith("/sign-in") || url.pathname.startsWith("/sign-up")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (url.pathname === "/" && response.ok) {
            const copy = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(async () => (
          await caches.match("/")
          ?? await caches.match("/index.html")
          ?? offlineFallback()
        )),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || SAME_ORIGIN_STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }
});
