// Cache only public app assets. Authenticated API responses must never be stored.
const CACHE = 'one-v20';
const ASSETS = ['./', './index.html', './styles.css?v=10', './auth-enhancements.css?v=1', './pwa-mobile-fix.css?v=1', './deletion-enhancements.css?v=2', './deletion-enhancements.js?v=2', './app.js?v=11', './auth-enhancements.js?v=2', './checklist-enhancements.js?v=1', './integrations-enhancements.css?v=1', './integrations-enhancements.js?v=1', './smart-action-enhancements.js?v=1', './manifest.json', './icon-192.png', './icon-512.png'];
const publicUrls = new Set(ASSETS.map(path => new URL(path, self.location.href).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('one-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.headers.has('authorization') || !publicUrls.has(event.request.url)) return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(async () => (await caches.match(event.request)) || Response.error()));
});
