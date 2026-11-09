const CACHE = 'colonies-v3';
const PRECACHE = [
  './',
  './index.html',
  './support.html',
  './missions.html',
  './manifest.json',
  './hero-landing.jpg',
  './hero-someday.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './covers/m1.jpg',
  './covers/m2.jpg',
  './covers/m3.jpg',
  './covers/m4.jpg',
  './covers/m5.jpg',
  './covers/m6.jpg',
  './mission1/index.html',
  './mission1/scene01.jpg',
  './mission1/scene02.jpg',
  './mission1/scene03.jpg',
  './mission1/scene04.jpg',
  './mission1/scene05.jpg',
  './mission1/scene06.jpg',
  './mission1/scene07.jpg',
  './mission1/scene08.jpg',
  './mission1/scene09.jpg',
  './mission1/solve/fan.html',
  './mission1/solve/fan.js',
  './mission1/solve/index.html',
  './mission1/solve/oxygen.html',
  './mission1/solve/oxygen.js',
  './mission1/solve/power.html',
  './mission1/solve/power.js',
  './mission1/solve/ring.html',
  './mission1/solve/ring.js',
  './mission1/solve/route.html',
  './mission1/solve/route.js',
  './mission1/solve/solve.css',
  './mission1/solve/solve.js',
  './mission1/audio/manifest.json',
  './mission1/audio/hero_01.mp3',
  './mission1/audio/hero_02.mp3',
  './mission1/audio/s01_01.mp3',
  './mission1/audio/s01_02.mp3',
  './mission1/audio/s01_03.mp3',
  './mission1/audio/s01_05.mp3',
  './mission1/audio/s01_06.mp3',
  './mission1/audio/s01_07.mp3',
  './mission1/audio/s01_08.mp3',
  './mission1/audio/s02_01.mp3',
  './mission1/audio/s02_02.mp3',
  './mission1/audio/s02_03.mp3',
  './mission1/audio/s02_05.mp3',
  './mission1/audio/s02_06.mp3',
  './mission1/audio/s02_07.mp3',
  './mission1/audio/s02_08.mp3',
  './mission1/audio/s03_01.mp3',
  './mission1/audio/s03_02.mp3',
  './mission1/audio/s03_03.mp3',
  './mission1/audio/s03_04.mp3',
  './mission1/audio/s03_06.mp3',
  './mission1/audio/s03_07.mp3',
  './mission1/audio/s03_08.mp3',
  './mission1/audio/s03_09.mp3',
  './mission1/audio/s03_10.mp3',
  './mission1/audio/s04_01.mp3',
  './mission1/audio/s04_02.mp3',
  './mission1/audio/s04_03.mp3',
  './mission1/audio/s04_05.mp3',
  './mission1/audio/s04_06.mp3',
  './mission1/audio/s04_07.mp3',
  './mission1/audio/s04_08.mp3',
  './mission1/audio/s05_01.mp3',
  './mission1/audio/s05_02.mp3',
  './mission1/audio/s05_03.mp3',
  './mission1/audio/s05_05.mp3',
  './mission1/audio/s05_06.mp3',
  './mission1/audio/s05_07.mp3',
  './mission1/audio/s05_08.mp3',
  './mission1/audio/s06_01.mp3',
  './mission1/audio/s06_02.mp3',
  './mission1/audio/s06_04.mp3',
  './mission1/audio/s06_05.mp3',
  './mission1/audio/s06_06.mp3',
  './mission1/audio/s06_07.mp3',
  './mission1/audio/s07_01.mp3',
  './mission1/audio/s07_02.mp3',
  './mission1/audio/s07_03.mp3',
  './mission1/audio/s07_04.mp3',
  './mission1/audio/s07_06.mp3',
  './mission1/audio/s07_07.mp3',
  './mission1/audio/s07_08.mp3',
  './mission1/audio/s07_09.mp3',
  './mission1/audio/s08_01.mp3',
  './mission1/audio/s08_02.mp3',
  './mission1/audio/s08_03.mp3',
  './mission1/audio/s08_05.mp3',
  './mission1/audio/s08_06.mp3',
  './mission1/audio/s08_07.mp3',
  './mission1/audio/s08_08.mp3',
  './mission1/audio/s09_01.mp3',
  './mission1/audio/s09_02.mp3',
  './mission1/audio/s09_03.mp3',
  './mission1/audio/s09_05.mp3',
  './mission1/audio/s09_06.mp3',
  './mission1/audio/s09_07.mp3',
  './mission1/audio/s09_08.mp3',
  './mission1/audio/silence_450.mp3'
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
