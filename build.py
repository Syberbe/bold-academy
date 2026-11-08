"""Bouwt BOLD Academy: dist/ (GitHub Pages, volledige PWA) en preview/ (Claude-artifact)."""
import hashlib, json, os, re, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(ROOT, 'app')
VERSION = re.search(r"APP_VERSION = '([^']+)'", open(os.path.join(APP, 'js/app.js')).read()).group(1)

BODY = """<header class="topbar"><div class="topbar-in"><div class="brand"><b>BOLD</b><span>ACADEMY</span></div><span class="weekpill" id="weekpill"></span></div></header>
<main id="main"></main>
<div class="restbar" id="restbar" hidden>
  <div class="rb-track"><i id="rb-fill"></i></div>
  <div class="rb-in">
    <div class="rb-txt"><span class="rb-label" id="rb-label"></span><span class="rb-time" id="rb-time" role="timer">2:00</span></div>
    <div class="rb-btns"><button type="button" class="btn" id="rb-add">+30 sec</button><button type="button" class="btn" id="rb-stop">Stop</button></div>
  </div>
</div>
<nav class="nav" id="nav" aria-label="Hoofdmenu"></nav>
<noscript><p style="padding:24px">BOLD Academy heeft JavaScript nodig.</p></noscript>
<script src="vendor/three.min.js"></script>
<script src="js/data.js"></script>
<script src="js/engine2d.js"></script>
<script src="js/pose3d.js"></script>
<script src="js/view3d.js"></script>
<script src="js/app.js"></script>
"""

HEAD = """<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>BOLD Academy</title>
<meta name="description" content="Trainingsapp met 3D-oefeningen, logboek, rusttimer en weekschema. Alles blijft op je eigen toestel.">
<meta name="theme-color" content="#15171A">
<meta name="color-scheme" content="light dark">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="stylesheet" href="css/app.css">
</head>
<body>
"""

MANIFEST = {
    "name": "BOLD Academy", "short_name": "BOLD", "description": "Trainingsapp met 3D-oefeningen, logboek, rusttimer en weekschema.",
    "lang": "nl", "start_url": "./", "scope": "./", "display": "standalone", "orientation": "portrait",
    "background_color": "#15171A", "theme_color": "#15171A",
    "icons": [
        {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
    ]
}

SW = """/* BOLD Academy service worker: app-shell offline beschikbaar */
const CACHE = 'bold-%(ver)s';
const ASSETS = %(assets)s;
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
"""

def files_under(base):
    out = []
    for dp, _, fns in os.walk(base):
        for fn in fns:
            if fn.startswith('_'): continue
            out.append(os.path.relpath(os.path.join(dp, fn), base).replace(os.sep, '/'))
    return sorted(out)

def build_dist():
    dist = os.path.join(ROOT, 'dist')
    if os.path.exists(dist): shutil.rmtree(dist)
    shutil.copytree(APP, dist)
    open(os.path.join(dist, 'index.html'), 'w').write(HEAD + BODY + '</body>\n</html>\n')
    json.dump(MANIFEST, open(os.path.join(dist, 'manifest.webmanifest'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(dist, '.nojekyll'), 'w').write('')
    assets = ['./', './index.html'] + ['./' + f for f in files_under(dist) if f not in ('index.html', '.nojekyll', 'sw.js', 'README.md') and not f.endswith('.txt') and not f.endswith('LICENSE')]
    h = hashlib.sha1()
    for f in sorted(assets[2:]):
        h.update(open(os.path.join(dist, f[2:]), 'rb').read())
    ver = VERSION + '-' + h.hexdigest()[:8]
    open(os.path.join(dist, 'sw.js'), 'w').write(SW % {'ver': ver, 'assets': json.dumps(assets, indent=1)})
    shutil.copy(os.path.join(ROOT, 'README.md'), os.path.join(dist, 'README.md'))
    return dist, ver

def build_preview():
    pv = os.path.join(ROOT, 'preview')
    if os.path.exists(pv): shutil.rmtree(pv)
    shutil.copytree(APP, pv)
    page = ('<title>BOLD Academy</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
            '<link rel="stylesheet" href="css/app.css">\n' + BODY)
    open(os.path.join(pv, 'index.html'), 'w').write(page)
    return pv

if __name__ == '__main__':
    d, ver = build_dist(); p = build_preview()
    print('dist', d, ver); print('preview', p)
