"""Simuleer de echte update: oude versie (0.2.0) met bestaande logs -> nieuwe versie via 'Vernieuwen'."""
import json, os, shutil, subprocess, sys, time
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, 'out', 'upg-site')
OLD = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'gh-pages')  # map met de vorige gepubliceerde versie (checkout van gh-pages)
NEW = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dist')
def serve(src):
    if os.path.exists(ROOT): shutil.rmtree(ROOT)
    shutil.copytree(src, ROOT, ignore=shutil.ignore_patterns('.git'))
fx = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixture-logboek.json')))
sessions = fx['sessions']
# extra: pelican op dag B na dag A, om de geschiedenis over dagen heen te testen
sessions['2026-11-06|B'] = {'date': '2026-11-06', 'day': 'B', 'items': {'B.pelican': {'sets': [9, 8], 'done': [True, True]}, 'B.pistol': {'sets': [8, 8], 'done': [True, True]}, 'B.ringpush': {'sets': [12, 11], 'done': [True, True]}}}
serve(OLD)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8790', '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.6)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844})
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        # gegevens klaarzetten zoals ze nu op de gsm staan (logs zonder 'ex'), vóór de app opstart
        pg.goto('http://localhost:8790/README.md')
        prog = subprocess.run(['node', '-e', 'global.window={};require(process.argv[1] + "/js/data.js");process.stdout.write(JSON.stringify(window.BoldData.DEFAULT_PROGRAM))', os.path.abspath(OLD)], capture_output=True, text=True).stdout
        state = {'version': 1, 'program': json.loads(prog), 'sessions': sessions, 'settings': {'wake': True, 'sound': True}, 'active': None}
        pg.evaluate('s => localStorage.setItem("bold.v1", s)', json.dumps(state))
        pg.goto('http://localhost:8790/'); pg.wait_for_timeout(1500)
        pg.reload(); pg.wait_for_timeout(1000)
        print('old version:', pg.evaluate('document.querySelector("script[src*=app]") && 0 || "?"'), 'sessions before:', pg.evaluate('Object.keys(__bold.state.sessions).length'),
              'sw controlled:', pg.evaluate('!!navigator.serviceWorker.controller'))
        before = json.loads(pg.evaluate('localStorage.getItem("bold.v1")'))
        # nieuwe versie op dezelfde plek zetten, zoals GitHub Pages doet
        serve(NEW)
        pg.reload(); pg.wait_for_timeout(800)
        pg.evaluate('navigator.serviceWorker.getRegistration().then(r => r.update())')  # zoals de browser doet bij openen
        toast = pg.locator('text=Vernieuwen')
        for _ in range(30):
            if toast.count(): break
            pg.wait_for_timeout(500)
        print('update toast:', toast.count(), pg.evaluate('navigator.serviceWorker.getRegistration().then(r => [!!r.active, !!r.waiting, !!r.installing])'),
              pg.evaluate('fetch("sw.js", {cache: "no-store"}).then(r => r.text()).then(t => t.split("\\n")[1])'))
        if toast.count():
            toast.first.click(); pg.wait_for_timeout(2500)
        print('caches:', pg.evaluate('caches.keys()'))
        ver = pg.evaluate('fetch("js/app.js").then(r => r.text()).then(t => t.match(/APP_VERSION = \\x27([^\\x27]+)/)[1])')
        after = json.loads(pg.evaluate('localStorage.getItem("bold.v1")'))
        print('running version:', ver)
        print('sessions after:', len(after['sessions']), 'same keys:', sorted(after['sessions']) == sorted(before['sessions']))
        same_vals = all(after['sessions'][k]['items'][i]['sets'] == v['sets'] and after['sessions'][k]['items'][i]['done'] == v['done'] for k, s in before['sessions'].items() for i, v in s['items'].items())
        print('all sets/done identical:', same_vals)
        print('entries tagged with ex:', sum(1 for s in after['sessions'].values() for e in s['items'].values() if e.get('ex')), '/', sum(len(s['items']) for s in after['sessions'].values()))
        print('safety copy kept:', pg.evaluate('!!localStorage.getItem("bold.v1.voor-0.2.1")'))
        # geschiedenis dag B: pelican moet ook dag A tonen
        pg.click('[data-tab=hist]'); pg.wait_for_timeout(400)
        pg.click('[data-hday=B]'); pg.wait_for_timeout(400)
        card = pg.locator('article.card', has_text='Pelican')
        print('pelican rows on B:', card.locator('tbody tr').all_inner_texts())
        card.screenshot(path=os.path.join(HERE, 'out', 'upg_pelican_hist.png'))
        pg.click('[data-hday=C]'); pg.wait_for_timeout(300)
        print('ringpush rows on C:', pg.locator('article.card', has_text='Ring push').locator('tbody tr').all_inner_texts())
        pg.locator('article.card', has_text='Ring push').screenshot(path=os.path.join(HERE, 'out', 'upg_ringpush_hist.png'))
        pg.click('[data-tab=train]'); pg.wait_for_timeout(300)
        if pg.locator('#finish').count(): pg.click('#finish'); pg.wait_for_timeout(300); pg.click('[data-tab=train]'); pg.wait_for_timeout(300)
        pg.click('[data-start=B]'); pg.wait_for_timeout(500); pg.click('[data-focus="B.pelican"]'); pg.wait_for_timeout(500)
        print('pelican hint on B:', pg.locator('#focus .target').inner_text(), '| prefill:', pg.locator('#sets output').all_inner_texts())
        pg.click('[data-focus="B.ringpush"]'); pg.wait_for_timeout(500)
        print('ringpush hint on B:', pg.locator('#focus .target').inner_text())
        print('errors:', errs)
        b.close()
finally:
    srv.terminate()
