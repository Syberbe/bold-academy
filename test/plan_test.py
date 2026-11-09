"""Weekplanning met vaste datum: per week, verschuiven alleen binnen de week, overslaan."""
import datetime, json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); DIST = os.path.join(HERE, '..', 'dist'); OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
prog = json.loads(subprocess.run(['node', '-e', 'global.window={};require(process.argv[1]);process.stdout.write(JSON.stringify(window.BoldData.DEFAULT_PROGRAM))', os.path.join(DIST, 'js', 'data.js')], capture_output=True, text=True).stdout)
wd = {'C': 1, 'A': 4, 'B': 0}                     # zoals op de gsm: C ma, A do, B zo
for d in prog['days']: d['weekday'] = wd[d['id']]
prog['activities'] = [{'weekday': 2, 'name': 'Boulderen'}, {'weekday': 6, 'name': 'Boulderen'}]
sessions = json.load(open(os.path.join(HERE, 'fixture-logboek.json')))['sessions']
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8792', '--bind', '127.0.0.1'], cwd=DIST, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.6)
def week(pg):
    return pg.evaluate('''(() => { const t = new Date(); const p = __bold.plan(__bold.today ? __bold.today() : null); return 0; })()''')
def run(pg, when, label):
    pg.clock.set_fixed_time(datetime.datetime.fromisoformat(when))
    pg.goto('http://localhost:8792/'); pg.wait_for_timeout(700)
    chips = pg.evaluate('[...document.querySelectorAll(".wd")].map(w => w.querySelector(".dn").textContent + w.querySelector(".dd").textContent + ":" + [...w.querySelectorAll(".chip")].map(c => c.className.replace("chip ","") + "/" + c.textContent).join(","))')
    hero = pg.evaluate('document.querySelector(".hero h2").textContent + " | " + [...document.querySelectorAll(".hero .btn")].map(b => b.textContent).join(" + ")')
    moved = pg.evaluate('[...document.querySelectorAll(".moved li span")].map(e => e.textContent)')
    print(label, '\n  week :', ' '.join(chips), '\n  hero :', hero, '\n  moved:', moved)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Brussels', color_scheme='dark', device_scale_factor=2, service_workers='block')
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://localhost:8792/README.md')
        pg.evaluate('s => localStorage.setItem("bold.v1", s)', json.dumps({'version': 1, 'program': prog, 'sessions': sessions, 'settings': {'wake': True, 'sound': True}, 'active': None}))
        run(pg, '2026-11-09T20:03:00+01:00', 'ma 9 nov (zoals de schermafbeelding):')
        pg.screenshot(path=os.path.join(OUT, 'plan_ma9.png'))
        run(pg, '2026-11-10T09:00:00+01:00', 'di 10 nov, C maandag niet gedaan:')
        pg.click('.hero [data-skip]'); pg.wait_for_timeout(300)
        print('  na overslaan, skips:', pg.evaluate('JSON.stringify(__bold.state.skips)'), '| hero:', pg.evaluate('document.querySelector(".hero h2").textContent'))
        pg.screenshot(path=os.path.join(OUT, 'plan_di10_skipped.png'))
        pg.click('#toast button'); pg.wait_for_timeout(300)
        print('  ongedaan:', pg.evaluate('JSON.stringify(__bold.state.skips)'))
        run(pg, '2026-11-14T09:00:00+01:00', 'za 14 nov, C en A niet gedaan:')
        pg.screenshot(path=os.path.join(OUT, 'plan_za14.png'), full_page=True)
        run(pg, '2026-11-16T09:00:00+01:00', 'ma 16 nov, nieuwe week:')
        print('errors:', errs)
        b.close()
finally:
    srv.terminate()
