// Minimal PWA service worker. Network-first, no caching of API/financial data.
const SHELL_CACHE = "xaman-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Never cache API / sensitive endpoints — always live from server.
  if (url.pathname.startsWith("/api")) {
    return; // fall through to network
  }
});
