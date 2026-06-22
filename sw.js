// Service Worker：アプリシェルをキャッシュしてオフライン対応＆高速化。
// 同一オリジンの GET はネット優先（更新を確実に反映）＋オフライン時キャッシュ。
// 外部 API（kenkoooo / Anthropic）は素通し（キャッシュしない）。
const CACHE = 'acs-v1';
const SHELL = [
  './', './index.html', './css/styles.css',
  './js/app.js', './js/config.js', './js/colors.js', './js/storage.js', './js/api.js',
  './js/diagnose.js', './js/recommend.js', './js/ai.js',
  './js/data/roadmap.js', './js/data/categories.js', './js/data/getstarted.js',
  './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 外部APIは素通し

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || caches.match('./index.html'))),
  );
});
