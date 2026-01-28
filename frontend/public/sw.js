self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through fetch, no caching logic for MVP
  event.respondWith(fetch(event.request));
});
