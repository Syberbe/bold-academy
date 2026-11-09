/* BOLD Academy service worker: app-shell offline beschikbaar */
const CACHE = 'bold-0.2.4-7fad4ec9';
const ASSETS = [
 "./",
 "./index.html",
 "./css/app.css",
 "./fonts/archivo-latin-400-normal.woff2",
 "./fonts/archivo-latin-500-normal.woff2",
 "./fonts/archivo-latin-600-normal.woff2",
 "./fonts/big-shoulders-display-latin-700-normal.woff2",
 "./fonts/big-shoulders-display-latin-800-normal.woff2",
 "./fonts/jetbrains-mono-latin-500-normal.woff2",
 "./fonts/jetbrains-mono-latin-600-normal.woff2",
 "./icons/apple-touch-icon.png",
 "./icons/icon-192.png",
 "./icons/icon-512.png",
 "./icons/icon-maskable-512.png",
 "./js/app.js",
 "./js/data.js",
 "./js/engine2d.js",
 "./js/pose3d.js",
 "./js/view3d.js",
 "./manifest.webmanifest",
 "./vendor/three.min.js"
];
// altijd verse bestanden ophalen (niet uit de browsercache), zodat een update echt de nieuwe versie bewaart
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('bold-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then(hit => hit || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)));
});
