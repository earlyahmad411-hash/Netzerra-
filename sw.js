/* ══════════════════════════════════════════════
   Netzerra Service Worker — Offline Support
   Caches static assets so calculators work
   without internet (Kenya field use)
══════════════════════════════════════════════ */

const CACHE = 'netzerra-v7-waste-ai';
const PRECACHE = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './netzerra-enterprise.css',
  './netzerra-enterprise.js',
  './netzerra-validation.js',
  './netzerra-ai.js',
  './netzerra-nuclear.js',
  './netzerra-nuclear.css',
  './netzerra-waste-management.js',
  './netzerra-waste-management.css',
  './netzerra-intelligence.js',
  './netzerra-intelligence.css',
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
];

// Install — cache all static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE.map(url => new Request(url, {mode:'no-cors'}))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // don't fail install if CDN unreachable
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for JS/CSS (ensures latest code), cache-first for fonts/CDN
self.addEventListener('fetch', e => {
  // Skip non-GET and chrome-extension requests
  if (e.request.method !== 'GET') return;
  if (e.request.url.startsWith('chrome-extension')) return;

  // Network-first for same-origin assets (ensures code updates are picked up)
  if (e.request.url.includes(self.location.origin)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(cached => {
          if (cached) return cached;
          if (e.request.mode === 'navigate') return caches.match('./index.html');
        }))
    );
    return;
  }

  // Cache-first for external CDN assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => undefined);
    })
  );
});
