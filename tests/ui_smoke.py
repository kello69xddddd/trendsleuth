"""Headless UI test of the TrendSleuth web app.
Checks on every screen: no page scroll, no text under 16 px, nothing cut off, no console errors, no external requests
(the NASA POWER call is answered with synthetic data in the real API format). Also times the actions that must feel instant.
Usage: python tests/ui_smoke.py [width height] [file|http] ["?flat=1"]      screenshots go to out/ui/"""
import sys, os, json, math, random, time, threading, functools, http.server
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); OUT = os.path.join(ROOT, 'out', 'ui'); os.makedirs(OUT, exist_ok=True)
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (1366, 650)
MODE = sys.argv[3] if len(sys.argv) > 3 else 'http'; QUERY = sys.argv[4] if len(sys.argv) > 4 else ''
tag = f"{W}x{H}_{MODE}" + ('_flat' if 'flat' in QUERY else '')

def launch(p, args):  # uses Chromium, or the installed Chrome
    try: return p.chromium.launch(args=args)
    except Exception: return p.chromium.launch(channel='chrome', args=args)

def mock_power():
    random.seed(3); par = {}
    for v, (base, amp, tr, ns) in {"PRECTOTCORR": (4, 2, 0.0, 1.2), "T2M": (14, 1, 0.025, 0.4), "T2M_MAX": (22, 1.5, 0.03, 0.6), "T2M_MIN": (7, 1, 0.02, 0.6), "GWETROOT": (0.6, 0.1, -0.0005, 0.03), "RH2M": (75, 5, -0.02, 2), "WS10M": (3, 0.5, 0, 0.3)}.items():
        d = {}
        for t in range(46 * 12):
            yr, mo = 1981 + t // 12, t % 12 + 1
            d[f"{yr}{mo:02d}"] = round(base + amp * math.sin(2 * math.pi * mo / 12) + tr * t / 12 + random.gauss(0, ns) if t < 549 else -999.0, 3)
        for yr in range(1981, 2027): d[f"{yr}13"] = -999.0
        par[v] = dict(sorted(d.items()))
    return json.dumps({"type": "Feature", "geometry": {"type": "Point", "coordinates": [-78.5, -0.2, 2850.0]}, "properties": {"parameter": par}})

CHECK = """() => {
  const out = {scroll: document.scrollingElement.scrollHeight > innerHeight + 1 || document.scrollingElement.scrollWidth > innerWidth + 1, small: [], clipped: []};
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none' && +s.opacity>0; };
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.closest('#globe canvas')) continue;
    const own = [...el.childNodes].some(n => n.nodeType===3 && n.textContent.trim());
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if ((own || el.tagName==='text') && fs < 15.9 && !el.closest('.lg i')) out.small.push(el.tagName+'.'+(el.className.baseVal||el.className)+':'+fs+':'+el.textContent.trim().slice(0,30));
  }
  for (const id of ['panel','L1','L2','L3','TT','ttList','detBody','stage']) { const el = document.getElementById(id); if (el && vis(el) && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)) out.clipped.push(id+':'+el.scrollHeight+'>'+el.clientHeight+' w'+el.scrollWidth+'>'+el.clientWidth); }
  const p = document.getElementById('panel').getBoundingClientRect();
  if (!document.querySelector('dialog[open]')) for (const el of document.querySelectorAll('#panel .view:not([hidden]) *')) { if(!vis(el)) continue; const r = el.getBoundingClientRect(); if (r.bottom > p.bottom + 1 || r.right > p.right + 1) { out.clipped.push('out:'+el.tagName+'.'+(el.className.baseVal||el.className)+' '+Math.round(r.bottom-p.bottom)); break; } }
  const st = document.getElementById('stage').getBoundingClientRect();
  for (const sel of ['.ask','.where','#legend','.zoom']) { const e = document.querySelector(sel); if (!e || !vis(e)) continue; const a = e.getBoundingClientRect(); if (a.right > st.right + 1 || a.bottom > st.bottom + 1 || a.left < st.left - 1) out.clipped.push('stage:'+sel); }
  const d = document.querySelector('dialog[open]'); if (d) { const r = d.getBoundingClientRect(); if (r.bottom > innerHeight + 1 || r.top < -1 || (d.id !== 'gloss' && d.scrollHeight > d.clientHeight + 2)) out.clipped.push('dialog:'+d.id+' '+d.scrollHeight+'>'+d.clientHeight); }
  return out; }"""

errors, bad = [], 0
if MODE == 'http':
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=os.path.join(ROOT, 'web'))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler); threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{srv.server_address[1]}/index.html"
else:
    base = "file://" + os.path.join(ROOT, "web", "index.html")

with sync_playwright() as p:
    b = launch(p, ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={"width": W, "height": H})
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append("PAGEERR " + str(e)))
    reqs = []; pg.on("request", lambda r: reqs.append(r.url) if r.url.startswith('http') and '127.0.0.1' not in r.url else None)
    pg.route("**/power.larc.nasa.gov/**", lambda r: r.fulfill(status=200, content_type="application/json", body=mock_power()))
    def snap(name, wait=1300):
        global bad
        pg.wait_for_timeout(wait); r = pg.evaluate(CHECK); pg.screenshot(path=os.path.join(OUT, f"{tag}_{name}.png"))
        ok = not (r['scroll'] or r['small'] or r['clipped']); bad += 0 if ok else 1
        print('OK ' if ok else 'BAD', name, '' if ok else json.dumps(r)[:500])
    ms = lambda js: pg.evaluate("async () => { const t = performance.now(); await (async () => { %s })(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - t); }" % js)

    t = time.time(); pg.goto(base + QUERY); pg.wait_for_function("window.TS && TS.app && document.querySelector('#vars button') && !document.getElementById('L1').hidden", timeout=60000)
    print(f"first screen ready in {time.time() - t:.2f} s ({MODE})"); pg.wait_for_timeout(2500)
    print('map:', pg.evaluate("TS.map.kind"))
    # the welcome pop-up opens once, with a close button; the app behind it already shows a variable, a place and a result
    assert pg.evaluate("document.getElementById('hello').open"); snap('0_hello'); pg.click('#helloClose'); assert not pg.evaluate("document.getElementById('hello').open")
    snap('0_start'); print('   start:', pg.input_value('#q'), '|', pg.inner_text('#headline'), '|', pg.inner_text('#bignum'), '| tone', pg.evaluate("document.body.dataset.tone"))
    assert 'Pichincha' in pg.input_value('#q') and pg.evaluate("document.body.dataset.tone") == 'up'
    # 1 Choose a variable: every variable repaints the globe; this must be instant
    times = [ms(f"TS.app.setVar('{k}', true)") for k in ['T2M_MAX', 'T2M_MIN', 'GWETROOT', 'RH2M', 'WS10M', 'PRECTOTCORR', 'T2M']]
    print('variable -> map repaint, ms:', times); print('   legend:', pg.inner_text('#legend').replace('\n', ' '))
    # 2 Choose a place: suggestions, search by name, coordinates
    pg.click('#q'); pg.wait_for_timeout(400); print('   suggestions:', pg.inner_text('#qList').replace('\n', ' | ')[:200]); snap('2_suggest', 300)
    pg.fill('#q', 'pichin'); pg.wait_for_timeout(1500); print('   search "pichin":', pg.inner_text('#qList').replace('\n', ' | ')); snap('2_search', 300)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1500); snap('2_live_L1'); print('   place:', pg.input_value('#q')); print('   ', pg.inner_text('#kicker'), '|', pg.inner_text('#headline'), '|', pg.inner_text('#bignum'))
    assert 'Pichincha' in pg.input_value('#q') and 'Ecuador' in pg.input_value('#q')
    pg.wait_for_timeout(2500)   # the other variables are tested in the background
    print('variable change on an open place, ms:', [ms(f"TS.app.setVar('{k}'); await new Promise(r => setTimeout(r, 0))") for k in ['PRECTOTCORR', 'WS10M', 'GWETROOT']])
    snap('2_live_down'); print('   tone for a confirmed fall:', pg.evaluate("document.body.dataset.tone"))
    pg.evaluate("TS.app.setLayer(3,'else')"); snap('2_live_L3_else')
    pg.fill('#q', '48.85, 2.35'); pg.wait_for_timeout(400); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500); print('   48.85, 2.35 ->', pg.input_value('#q'))
    pg.fill('#q', '0, -140'); pg.wait_for_timeout(400); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500); print('   0, -140 ->', pg.input_value('#q'))
    pg.click('#zoomIn'); pg.click('#zoomIn'); snap('2_zoom', 900)
    # solved cases, three levels
    for cid in ['pac_atolls', 'ec_coca_m2', 'ec_costa', 'amazon_south', 'ec_quito_t']:
        pg.evaluate(f"TS.app.openCase('{cid}')"); snap(cid + '_L1'); print('   ', pg.inner_text('#headline'), '|', pg.inner_text('#bignum'), '|', pg.input_value('#q'), '| tone', pg.evaluate("document.body.dataset.tone"))
        if cid in ('pac_atolls', 'ec_costa'):
            for e in ['time', 'tvn', 'rhythm', 'month']:
                pg.evaluate(f"TS.app.setLayer(2,'{e}')"); snap(cid + '_L2_' + e, 1800)
            for d in ['checks', 'numbers', 'data']:
                pg.evaluate(f"TS.app.setLayer(3,'{d}')"); snap(cid + '_L3_' + d)
    # top trends: every variable has a rise and a fall
    pg.click('#topBtn'); snap('4_top'); print('   top trends:', pg.inner_text('#ttList').replace('\n', ' ')[:300])
    assert pg.evaluate("document.querySelectorAll('#ttList .tt.none').length") == 0
    pg.click('#ttList .tt.up'); pg.wait_for_timeout(1500); snap('4_top_open'); print('   opened:', pg.input_value('#q'))
    if W > 1100: pg.click('#helpBtn'); snap('5_help', 3600); pg.keyboard.press('Escape')
    pg.click('#glossBtn'); snap('5_glossary'); pg.fill('#glossQ', 'p-value'); pg.wait_for_timeout(300); print('   glossary:', pg.evaluate("TS.gloss.words"), 'words; "p-value" ->', pg.evaluate("document.querySelectorAll('#glossList > div').length"), 'found'); pg.click('#glossClose')
    # guided demo: pause, next, back, then run to the end
    pg.click('#demoBtn'); pg.click('#demoPause'); s0 = pg.evaluate("TS.demo.step"); snap('6_demo_1', 1500)   # paused at once: a slow test machine must not let step 1 run out
    assert pg.evaluate("TS.demo.paused") and pg.evaluate("TS.demo.step") == s0 == 0
    for i in range(pg.evaluate("TS.demo.steps") - 1):
        pg.click('#demoNext'); snap(f'6_demo_{i + 2}', 1500)
    pg.click('#demoPrev'); pg.wait_for_timeout(400); print('   demo: paused on step', pg.evaluate("TS.demo.step") + 1, 'of', pg.evaluate("TS.demo.steps"), '|', pg.inner_text('#demoStep'))
    pg.evaluate("window.TS_FAST_DEMO = 1"); pg.click('#demoPause'); pg.click('#demoNext'); pg.wait_for_timeout(1500)
    print('   demo ended by itself:', pg.evaluate("document.getElementById('demoBar').hidden"))
    b.close()
ext = sorted({u.split('?')[0] for u in reqs if 'power.larc' not in u})
print("external requests:", ext); print("console errors:", errors[:8]); print('RESULT', 'OK' if not (bad or errors or ext) else f'CHECK ({bad} screens)')
sys.exit(1 if (bad or errors or ext) else 0)
