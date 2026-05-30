const CACHE_NAME = "offline-cache";
const FALLBACK_URL = "/fallback.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(FALLBACK_URL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function serveFallback() {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(FALLBACK_URL);
  return (
    cached ||
    new Response("Service temporarily unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only intercept top-level page navigations. API calls, assets, and
  // cross-origin requests must keep their real responses (including errors).
  if (request.mode !== "navigate") {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // fetch() resolves for 4xx/5xx too, so a Cloudflare 503 (or any
        // server 5xx) lands here, not in catch(). Swap it for the fallback.
        if (response.status >= 500) {
          return serveFallback();
        }
        return response;
      })
      // Network failure / offline: fetch() rejects and we land here.
      .catch(() => serveFallback())
  );
});
