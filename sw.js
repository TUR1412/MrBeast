/* eslint-disable no-restricted-globals */

const CACHE_NAME = "mrbeast-cache-20260111-01";
const CORE_ASSETS = [
  "./",
  "index.html",
  "robots.txt",
  "site.webmanifest",
  "assets/favicon.svg",
  "assets/styles.css",
  "assets/app.js",
  "assets/ui.css",
  "assets/ha/ha.css",
  "assets/ha/boot.mjs",
  "assets/ha/logger.mjs",
  "assets/ha/telemetry.mjs",
  "assets/ha/error-boundary.mjs",
  "assets/ha/perf.mjs",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const urls = CORE_ASSETS.map((p) => new URL(p, self.registration.scope).toString());
      await cache.addAll(urls);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function isNavigation(request) {
  return request.mode === "navigate" || (request.destination === "" && request.headers.get("accept")?.includes("text/html"));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for document navigations; cache-first for static assets.
  if (isNavigation(request)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cached = await caches.match(request, { ignoreSearch: true });
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request, { ignoreSearch: true });
      if (cached) return cached;

      const response = await fetch(request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    })(),
  );
});

