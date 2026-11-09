const CACHE = 'colonies-v1';
const PRECACHE = [
  './', './index.html', './support.html', './manifest.json',
  './hero-landing.jpg', './hero-someday.jpg',
  './icons/icon-192.png', './icons/icon-512.png',
  './covers/m1.jpg', './covers/m2.jpg', './covers/m3.jpg',
  './covers/m4.jpg', './covers/m5.jpg', './covers/m6.jpg',
  './mission1/index.html'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ||
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => cached)
    )
  );
});
