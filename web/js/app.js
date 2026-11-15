/* TrendSleuth · the app.
   One screen, three levels that get deeper: Beginner (the answer) -> Intermediate (the charts) -> Pro (the tests).
   Design rule: every fact is shown once. The left side is what you ask (variable, place), the right side is the answer.
   Live data: NASA POWER monthly API (MERRA-2). Case files: MERRA-2 + GPM IMERG box averages (data/cases.json).
   Statistics: engine.js (Evidence Engine) + insights.js (rhythms, decades, events).
   Other modules: store.js (data), geo.js (place names), map.js (globe), toptrends.js, demo.js. */
(function () {
  'use strict';
  const TS = window.TS, E = window.TSEngine, I = window.TSInsights, PRE = TS.data.cases, TR = TS.data.trends;
  const $ = id => document.getElementById(id), fin = Number.isFinite, nz = a => a.map(v => (v === null || v === undefined) ? NaN : v);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const FONT = getComputedStyle(document.body).fontFamily;
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const ico = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  const idle = fn => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 120));

  const VARS = {
    PRECTOTCORR: { label: 'Rain', units: 'mm/day', pct: true, noun: 'Rainfall', up: 'Getting wetter', down: 'Getting drier', icon: ico('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z"/>'),
      def: 'Rain: how much rain and snow falls, as an average per day (mm/day).' },
    T2M: { label: 'Temperature', units: '°C', noun: 'Air temperature', up: 'Getting warmer', down: 'Getting cooler', icon: ico('<path d="M10 4a2 2 0 0 1 4 0v9.500a4.500 4.500 0 1 1-4 0z"/><path d="M12 9v7"/>'),
      def: 'Temperature: the average air temperature 2 metres above the ground (°C).' },
    T2M_MAX: { label: 'Hot days', units: '°C', noun: 'The hottest temperature of the month', up: 'Hot days are getting hotter', down: 'Hot days are getting cooler', icon: ico('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>'),
      def: 'Hot days: the highest air temperature reached each month (°C).' },
    T2M_MIN: { label: 'Cold nights', units: '°C', noun: 'The coldest temperature of the month', up: 'Cold nights are getting warmer', down: 'Cold nights are getting colder', icon: ico('<path d="M20 14.500A8 8 0 1 1 9.500 4a6.500 6.500 0 0 0 10.500 10.500z"/>'),
      def: 'Cold nights: the lowest air temperature reached each month (°C).' },
    GWETROOT: { label: 'Soil moisture', units: 'fraction', pct: true, noun: 'Soil moisture', up: 'Soil is getting wetter', down: 'Soil is getting drier', icon: ico('<path d="M12 21V11"/><path d="M12 11c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 14c0-3-2-5-6-5 0 3 2 5 6 5z"/><path d="M4 21h16"/>'),
      def: 'Soil moisture: how wet the soil is where plant roots grow. From 0 (dry) to 1 (full of water). Land only.' },
    RH2M: { label: 'Humidity', units: '%', noun: 'Relative humidity', up: 'Air is getting more humid', down: 'Air is getting drier', icon: ico('<path d="M7 4s4 4.500 4 7.500a4 4 0 0 1-8 0C3 8.500 7 4 7 4z"/><path d="M17 11s3 3.400 3 5.700a3 3 0 0 1-6 0c0-2.300 3-5.700 3-5.700z"/>'),
      def: 'Humidity: how close the air near the ground is to being full of water vapour (%).' },
    WS10M: { label: 'Wind', units: 'm/s', pct: true, noun: 'Wind speed', up: 'Getting windier', down: 'Getting calmer', icon: ico('<path d="M3 9h11a3 3 0 1 0-3-3"/><path d="M3 14h15a3 3 0 1 1-3 3"/>'),
      def: 'Wind: the average wind speed 10 metres above the ground (m/s).' }
  };
  // colours with at least 4.5:1 contrast on white (WCAG 2.2 AA)
  const INK = { green: '#248A3D', blue: '#0071E3', orange: '#B25000', gray: '#6E6E73', red: '#D70015' };
  const LEVELS = {
    'STRONG': { n: 4, head: 'Yes. This is a real trend.' }, 'MODERATE': { n: 3, head: 'Probably a real trend.' },
    'WEAK': { n: 2, head: 'Not sure yet.' }, 'NOT YET': { n: 1, head: 'No trend found yet.' }, 'NO VERDICT': { n: 0, head: 'Not enough data to judge.' }
  };
  /* One colour rule for the whole app: green = rising, red = falling. It is used only when the trend is confirmed
     (strong or moderate, and not a false lead or a natural cycle). Everything else is neutral. */
  function tone(S) {
    const v = S.c.verdict, n = LEVELS[v.level].n;
    if (n < 3 || v.sources_disagree || v.explained_by_enso) return 'none';
    return v.trend_per_decade > 0 ? 'up' : 'down';
  }
  const toneInk = S => { const t = tone(S); return t === 'up' ? INK.green : t === 'down' ? INK.red : LEVELS[S.c.verdict.level].n === 2 ? INK.orange : INK.gray; };
  const CH = { ink: '#1D1D1F', soft: '#6E6E73', grid: 'rgba(0,0,0,.07)', zero: 'rgba(0,0,0,.4)', pos: '#0A84FF', neg: '#FF9F0A', trend: '#5E5CE6', second: '#00A3B4', mute: '#AEAEB2', slow: '#AF52DE' };
  const METER = ['No trend yet', 'Weak', 'Moderate', 'Strong'];
  const TAGS = { cycle: 'Natural cycle', hidden: 'Hidden trend', phantom: 'False lead', known: 'Known trend', trend: 'Trend' };
  const PLACES = [['Sahara desert', 23.0, 10.0], ['Amazon rainforest', -3.0, -62.0], ['Svalbard, Arctic', 78.2, 15.6], ['Ganges delta', 22.5, 90.0]];
  const START_CASE = 'ec_quito_t';                 // the app opens with a variable and a place already chosen (works offline)
  const SUGGEST = [['ec_quito_t', 'Quito: is it getting warmer?'], ['ec_coca_m2', 'Coca basin: a false lead'], ['pac_atolls', 'Pacific atolls: a hidden trend'], ['ec_costa', 'Ecuador coast: an El Niño cycle'], ['amazon_south', 'Southern Amazon: less rain']];
  const state = { v: 'T2M', layer: 1, ev: 'time', view: 'anom', det: 'checks', cur: null, cache: {}, done: {}, phen: null, demo: 0, top: false };

  const fmt = (v, d = 2) => !fin(v) ? 'n/a' : (v > 0 ? '+' : v < 0 ? '−' : '') + (Math.abs(v) >= 100 ? Math.abs(v).toFixed(0) : Math.abs(v) >= 10 ? Math.abs(v).toFixed(1) : Math.abs(v) < 0.095 && v !== 0 ? Math.abs(v).toFixed(3) : Math.abs(v).toFixed(d));
  const num = (v, d = 2) => fmt(v, d).replace('+', '');
  const p3 = p => !fin(p) ? 'n/a' : p < 0.001 ? '< 0.001' : p.toFixed(3);
  const pctS = v => !fin(v) ? 'n/a' : (Math.round(v) > 0 ? '+' : Math.round(v) < 0 ? '−' : '') + Math.abs(Math.round(v)) + '%';
  const pS = p => !fin(p) ? 'p = n/a' : p < 0.001 ? 'p < 0.001' : 'p = ' + p.toFixed(3);
  const coord = TS.geo.coordText;
  const mean = a => { let s = 0, n = 0; a.forEach(v => { if (fin(v)) { s += v; n++; } }); return n ? s / n : NaN; };
  const rname = name => (I.BY_NAME[name] || { label: name }).label, rshort = name => (I.BY_NAME[name] || { short: name }).short;

  // ================================================================== 1 What? (variable + map legend)
  function renderVars() {
    $('vars').innerHTML = Object.entries(VARS).map(([k, v]) => `<button class="pill" role="radio" data-k="${k}" aria-checked="${k === state.v}">${v.icon}${v.label}</button>`).join('');
    $('vardef').textContent = VARS[state.v].def;
    $('vars').querySelectorAll('button').forEach(b => b.onclick = () => setVar(b.dataset.k));
  }
  function renderLegend() {
    const s = TR.vars[state.v].share, pc = x => (x > 0 && x < 0.005 ? '<1' : Math.round(x * 100)) + '%';
    $('legend').innerHTML = `<span class="lg d"><i aria-hidden="true"></i>Falling <b>${pc(s.down)}</b></span><span class="lg u"><i aria-hidden="true"></i>Rising <b>${pc(s.up)}</b></span><span class="lg n"><i aria-hidden="true"></i>Not confirmed <b>${pc(s.none)}</b></span>`;
    $('legend').title = 'Share of the map. Stronger colour means faster change.';
  }
  /* Changing the variable repaints the map at once. If a live place is open, its verdict is updated
     from memory (the data of all seven variables arrived with the first request). */
  function setVar(k, quiet) {
    if (!VARS[k] || k === state.v) return;
    state.v = k; renderVars(); renderLegend(); TS.map.setVar(k);
    if (TS.top && state.top) TS.top.render();
    // the answer on the right must always be about the variable chosen on the left
    if (!quiet && state.cur && !state.demo && !state.top) investigate(state.cur.lat, state.cur.lon);
  }

  // ================================================================== 2 Where? (place name, search, coordinates)
  /* The place is shown in one spot only: the search box of step 2. */
  function showPlace(lat, lon, loc) {
    const name = !loc ? coord(lat, lon) : loc.land ? TS.geo.label(loc) : `${loc.sea} · ${coord(lat, lon)}`;
    state.place = name; $('q').title = name; if (document.activeElement !== $('q')) $('q').value = name;
  }
  let placeToken = 0;
  /* Mark a place on the map and name it (province and country). The name arrives as soon as the borders are loaded. */
  function setPlace(lat, lon, alt, then) {
    const my = ++placeToken;
    TS.map.select(lat, lon, alt);
    const apply = () => { const loc = TS.geo.locate(lat, lon); showPlace(lat, lon, loc); TS.map.outline(loc && loc.feature); if (then) then(loc); return loc; };
    if (TS.geo.loaded()) return apply();
    showPlace(lat, lon, null); TS.map.outline(null);
    TS.geo.ready().then(db => { if (my === placeToken && db) apply(); else if (my === placeToken) showPlace(lat, lon, { land: false, sea: 'Selected place' }); });
    return null;
  }
  function initSearch() {
    const q = $('q'), list = $('qList'); let items = [], cur = -1, t = 0;
    const close = () => { list.hidden = true; q.setAttribute('aria-expanded', 'false'); cur = -1; };
    const pick = it => { close(); q.blur(); if (it.caseId) openCase(it.caseId); else { q.value = it.label; investigate(it.lat, it.lon); } };
    const draw = () => {
      if (!items.length) { close(); return; }
      list.innerHTML = items.map((it, i) => (it.head ? `<li class="head" role="presentation">${it.head}</li>` : '') + `<li role="option" id="qo${i}" data-i="${i}" aria-selected="${i === cur}"><b>${esc(it.label)}</b><span>${it.kind}</span></li>`).join('');
      list.style.maxHeight = Math.max(120, Math.round($('stage').getBoundingClientRect().bottom - q.getBoundingClientRect().bottom - 22)) + 'px';   // never longer than the stage
      list.hidden = false; q.setAttribute('aria-expanded', 'true'); if (cur >= 0) q.setAttribute('aria-activedescendant', 'qo' + cur); else q.removeAttribute('aria-activedescendant');
      list.querySelectorAll('li[data-i]').forEach(li => li.onpointerdown = ev => { ev.preventDefault(); pick(items[+li.dataset.i]); });
    };
    const coords = s => { const m = s.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/); if (!m) return null; const la = +m[1].replace(',', '.'), lo = +m[2].replace(',', '.'); return Math.abs(la) <= 90 && Math.abs(lo) <= 180 ? [la, lo] : null; };
    /* Nothing typed yet: offer the solved cases and a few places, so nobody starts from an empty box. */
    const suggest = () => {
      items = SUGGEST.map(([id, label], i) => PRE.cases.some(c => c.id === id) && { head: i ? '' : 'Solved cases', label, kind: 'Solved case', caseId: id }).filter(Boolean)
        .concat(PLACES.map((p, i) => ({ head: i ? '' : 'Or try', label: p[0], lat: p[1], lon: p[2], kind: 'Live NASA data' })));
      cur = -1; draw();
    };
    const find = () => {
      const text = q.value.trim(); if (!text) { suggest(); return; }
      const c = coords(text);
      if (c) { items = [{ label: coord(c[0], c[1]), lat: c[0], lon: c[1], kind: 'Coordinates' }]; cur = 0; draw(); return; }
      TS.geo.ready().then(() => { items = TS.geo.search(text, 6); cur = items.length ? 0 : -1; draw(); });
    };
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(find, 90); });
    q.addEventListener('focus', () => { TS.geo.ready(); q.select(); if (!state.demo) suggest(); });
    q.addEventListener('blur', () => setTimeout(() => { close(); if (state.place) q.value = state.place; }, 120));
    q.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { if (!items.length) return; ev.preventDefault(); cur = (cur + (ev.key === 'ArrowDown' ? 1 : items.length - 1) + (cur < 0 && ev.key === 'ArrowUp' ? 1 : 0)) % items.length; draw(); }
      else if (ev.key === 'Enter') { ev.preventDefault(); if (!list.hidden && items[cur]) pick(items[cur]); else { const c = coords(q.value); if (c) pick({ label: coord(c[0], c[1]), lat: c[0], lon: c[1] }); } }
      else if (ev.key === 'Escape') { close(); q.blur(); ev.stopPropagation(); }
    });
    $('where').onsubmit = ev => ev.preventDefault();
  }

  // ================================================================== data + analysis
  function gridCell(lat, lon) {
    const g = TR.grid, w = TR.rain_witness, i = Math.round((lat - g.lat0) / g.dlat), j = ((Math.round((lon - g.lon0) / g.dlon) % g.nlon) + g.nlon) % g.nlon;
    if (i < 0 || i >= g.nlat) return null; const k = i * g.nlon + j; if (w.sen[k] === null) return null;
    return { sen: w.sen[k] / 100, z: w.z[k] / 10, sen_adj: w.sen_adj[k] / 100, z_adj: w.z_adj[k] / 10 };
  }
  function scene(tClim, pClim, lat, isLand) {
    if (!isLand) return 'Open ocean';
    const days = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], P = pClim.map((v, i) => v * days[i]);
    const Tann = mean(tClim), Pann = P.reduce((a, b) => a + b, 0), tmin = Math.min(...tClim), tmax = Math.max(...tClim);
    const summer = lat >= 0 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 0, 1, 2], ps = summer.reduce((a, i) => a + P[i], 0) / Pann, pth = 20 * Tann + (ps >= 0.7 ? 280 : ps >= 0.3 ? 140 : 0);
    if (tmax < 10) return 'Polar or high-mountain climate';
    if (Pann < pth) return Pann < pth / 2 ? 'Desert climate' : 'Semi-dry (steppe) climate';
    if (tmin >= 18) return Math.min(...P) >= 60 ? 'Tropical rainforest climate' : 'Tropical climate with a dry season';
    return tmin > 0 ? 'Temperate climate' : 'Cold continental climate';
  }
  /* ---- live data from NASA POWER, made fast ----
     1. The chosen variable is asked alone, so its answer is small and comes first. The other six are asked at the same
        time in a second request and arrive while the reader looks at the result.
     2. MERRA-2 has one value per cell of 0.5° x 0.625°. Two points in the same cell have the same data, so the data
        is kept per cell: a second click nearby needs no download.
     3. Finished cells are kept in the browser for 7 days (localStorage). A place opened before, for example when
        preparing a presentation, opens at once, even with a slow connection. */
  const CELL = (lat, lon) => (Math.round(lat * 2) / 2).toFixed(1) + ',' + (Math.round(lon / 0.625) * 0.625).toFixed(3);
  const STORE = 'ts_power_v1', KEEP_MS = 7 * 864e5, KEEP_N = 30;
  function recall(cell) {
    try { const d = (JSON.parse(localStorage.getItem(STORE) || '{}'))[cell]; if (d && Date.now() - d.t < KEEP_MS && Object.keys(VARS).every(k => Array.isArray(d.series[k]))) return d; } catch (e) { /* no storage */ }
    return null;
  }
  function remember(cell, D) {
    try {
      const all = JSON.parse(localStorage.getItem(STORE) || '{}'); all[cell] = { t: Date.now(), series: D.series, urls: D.urls, accessed: D.accessed, elevation: D.elevation };
      Object.keys(all).sort((x, y) => all[y].t - all[x].t).slice(KEEP_N).forEach(k => delete all[k]);
      localStorage.setItem(STORE, JSON.stringify(all));
    } catch (e) { /* storage full or blocked: the app works the same, only without this memory */ }
  }
  async function request(lat, lon, list) {
    const yr = new Date().getFullYear(); let url, js;
    for (const end of [yr, yr - 1]) {
      url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${list.join(',')}&community=AG&longitude=${lon.toFixed(3)}&latitude=${lat.toFixed(3)}&start=1981&end=${end}&format=JSON`;
      const r = await fetch(url); if (r.ok) { js = await r.json(); break; }
    }
    if (!js || !js.properties) throw new Error('NASA POWER did not answer for this place.');
    const out = { url, accessed: new Date().toISOString(), series: {}, elevation: js.geometry && js.geometry.coordinates ? js.geometry.coordinates[2] : null };
    for (const k of list) {
      const o = js.properties.parameter[k] || {}, y = [];
      Object.keys(o).sort().forEach(d => { if (d.slice(4) !== '13') y.push(o[d] <= -900 ? NaN : o[d]); });
      let n = y.length; while (n > 0 && !fin(y[n - 1])) n--;
      out.series[k] = y.slice(0, n);
    }
    return out;
  }
  /* The data of the cell around this place, with variable k ready. data.wait[v] = download in progress for variable v. */
  function fetchPower(lat, lon, k) {
    const cell = CELL(lat, lon), all = Object.keys(VARS); let D = state.cache[cell];
    if (!D) {
      const m = recall(cell); D = state.cache[cell] = { cell, series: {}, urls: {}, accessed: null, elevation: null, wait: {} };
      if (m) { all.forEach(v => { D.series[v] = nz(m.series[v]); }); D.urls = m.urls || {}; D.accessed = m.accessed; D.elevation = m.elevation; D.saved = true; }
    }
    if (D.series[k]) return Promise.resolve(D);
    if (!D.wait[k]) {
      const ask = list => {
        const p = request(lat, lon, list).then(r => {
          Object.assign(D.series, r.series); list.forEach(v => { D.urls[v] = r.url; delete D.wait[v]; });
          D.accessed = r.accessed; if (r.elevation !== null) D.elevation = r.elevation;
          if (all.every(v => D.series[v])) remember(cell, D);
          return D;
        }, e => { list.forEach(v => delete D.wait[v]); throw e; });
        list.forEach(v => { D.wait[v] = p; }); return p;
      };
      const rest = all.filter(v => v !== k && !D.series[v] && !D.wait[v]);
      ask([k]); if (rest.length) ask(rest).catch(() => { /* reported when one of these variables is opened */ });
    }
    return D.wait[k];
  }
  const hasData = (lat, lon, k) => { const D = state.cache[CELL(lat, lon)]; return !!(D && D.series[k]) || (!D && !!recall(CELL(lat, lon))); };
  /* Climate of the place in two words. Needs temperature, rain and soil moisture, so it may arrive a moment after the result. */
  function sceneText(D, lat) {
    if (D.sceneDone) return D.sceneDone;
    const s = D.series; if (!s.T2M || !s.PRECTOTCORR || !s.GWETROOT) return 'Live NASA data';
    const sc = scene(E.anomalies(s.T2M).clim, E.anomalies(s.PRECTOTCORR).clim, lat, s.GWETROOT.filter(fin).length > 100);
    return D.sceneDone = sc + (D.elevation !== null ? ', ' + Math.round(D.elevation) + ' m' : '');
  }
  function runLive(data, k, lat, lon) {
    const y = data.series[k], opts = { startYear: 1981, units: VARS[k].units, name: VARS[k].noun };
    if (k === 'PRECTOTCORR') { const g = gridCell(lat, lon); if (g) opts.second = { grid: g }; }
    return I.analyze(y, opts);
  }
  /* The full result for one place and one variable. Computed once, then kept in memory. */
  function liveResult(data, key, k, lat, lon) {
    const id = key + '|' + k; if (state.done[id]) return state.done[id];
    if (!data.series[k]) throw new Error('The data for this variable has not arrived yet.');
    const c = runLive(data, k, lat, lon);
    const S = { live: true, c, y: data.series[k], startYear: 1981, k, lat, lon, data, key, mean: mean(data.series[k]), units: VARS[k].units, noun: VARS[k].noun, pct: !!VARS[k].pct,
      get scene() { return sceneText(data, lat); },
      prov: { primary: 'NASA POWER monthly API, MERRA-2 parameter ' + k, url: data.urls[k], accessed: data.accessed, second: c.robustness && c.robustness.second ? 'NASA GPM IMERG (pre-computed 1998–2025 trend of the 1° × 1.25° cell around this place)' : null } };
    extras(S); return state.done[id] = S;
  }
  /* The extra studies (rhythm ranking, decade comparison, rhythm scan) are only shown in the charts and the tests.
     They are computed the first time they are needed, so the first answer appears sooner. */
  function extras(S) {
    const ok = S.c.verdict.level !== 'NO VERDICT';
    const lazy = (name, make) => Object.defineProperty(S, name, { configurable: true, enumerable: true, get() { const v = make(); Object.defineProperty(S, name, { value: v, enumerable: true }); return v; } });
    lazy('rh', () => ok ? I.rhythms(S.y, S.startYear, S.c) : { list: [], seasons: NaN, tested: 0 });
    lazy('dec', () => ok ? I.decades(S.y, S.startYear) : undefined);
    lazy('spec', () => ok ? I.spectrum(nz(S.c.series.anomaly)) : undefined);
  }
  function present(S) {
    const c = S.c; state.cur = S; state.view = c.cycle_matters ? 'adj' : 'anom'; state.phen = c.cycle_matters ? c.enso.index : 'Nino 3.4';
    $('layers').querySelectorAll('button').forEach(b => b.disabled = false);
  }
  const placeText = S => S.live ? `${S.loc ? TS.geo.label(S.loc) : coord(S.lat, S.lon)} · ${S.scene}` : S.place;
  let token = 0;
  async function investigate(lat, lon) {
    lat = Math.max(-89.9, Math.min(89.9, +lat)); lon = ((+lon + 540) % 360) - 180; if (!fin(lat) || !fin(lon)) return;
    const my = ++token, key = lat.toFixed(2) + ',' + lon.toFixed(2), k = state.v; closeTop(true);
    let loc = null; setPlace(lat, lon, 0, l => { loc = l; if (state.cur && state.cur.key === key) { state.cur.loc = l; } });
    const ready = state.done[key + '|' + k];
    if (!ready) { show('busy'); $('busyText').textContent = hasData(lat, lon, k) ? `Testing ${VARS[k].label.toLowerCase()} here…` : `Reading 45 years of NASA ${VARS[k].label.toLowerCase()} data for ${coord(lat, lon)}…`; }
    try {
      const data = await fetchPower(lat, lon, k); if (my !== token) return;
      if (!ready) await frame();                              // let the screen update before the statistics run
      if (my !== token) return;
      const S = liveResult(data, key, k, lat, lon); S.loc = loc; S.title = `${VARS[k].noun} at ${coord(lat, lon)}`;
      present(S); setLayer(1); warm(data, key, lat, lon, my); idle(() => { if (my === token) { void S.rh; void S.dec; void S.spec; } });
    } catch (e) {
      if (my !== token) return;
      $('err').innerHTML = `<div><b>We could not reach NASA right now.</b>Live places need an internet connection (${esc(e.message)}). The solved cases and the map work offline.</div><div class="actions"><button class="btn primary" id="retry">Try again</button><button class="btn" id="errCases">Open a solved case</button></div>`;
      show('err'); setTone('none'); $('retry').onclick = () => investigate(lat, lon); $('errCases').onclick = () => openCase(START_CASE);
    }
  }
  /* While the reader looks at the verdict, test the other six variables in the background, one at a time.
     After that, changing the variable is instant. */
  function warm(data, key, lat, lon, my) {
    Promise.all(Object.keys(VARS).map(v => data.series[v] ? null : data.wait[v])).then(() => {
      if (my !== token) return;
      if (state.cur && state.cur.key === key) { if (state.layer === 1) $('kicker').textContent = kicker(state.cur); else if (state.layer === 3) renderDetails(); }   // the climate of the place is known now
      const todo = Object.keys(VARS).filter(k => !state.done[key + '|' + k]);
      const step = () => { if (my !== token || !todo.length) return; try { const r = liveResult(data, key, todo.shift(), lat, lon); void r.rh; } catch (e) { /* shown when the variable is opened */ } idle(step); };
      idle(step);
    }).catch(() => { /* the other variables will be asked again when they are opened */ });
  }
  function openCase(id) {
    const pc = PRE.cases.find(x => x.id === id); if (!pc) return; ++token; closeTop(true);
    const y = nz(pc.series.y), temp = pc.units === '°C', k = temp ? 'T2M' : 'PRECTOTCORR', opts = { startYear: pc.start_year, units: pc.units, name: pc.name };
    if (pc.series.second) opts.second = { series: nz(pc.series.second), start: [pc.series.second_start, 1] };
    const la = (pc.box[0] + pc.box[1]) / 2, lo = (pc.box[2] + pc.box[3]) / 2;
    setVar(k, true);
    const S = state.done['case|' + id] || (state.done['case|' + id] = (() => { const s = { live: false, id, c: I.analyze(y, opts), y, startYear: pc.start_year, k, lat: la, lon: lo, mean: pc.mean, units: pc.units, noun: VARS[k].noun, pct: !temp, title: pc.title, place: pc.region, story: pc.story,
      second: pc.series.second ? { y: nz(pc.series.second), startYear: pc.series.second_start, label: pc.secondary.label } : null, primaryLabel: pc.primary.label,
      prov: { primary: pc.primary.product, url: 'https://nasa-power.s3.amazonaws.com/ (public NASA POWER archive)', accessed: pc.primary.fetched, second: pc.secondary ? pc.secondary.product : null, def: pc.primary.definition } }; extras(s); return s; })());
    present(S); setPlace(la, lo, 1.5); setLayer(1);
  }

  // ================================================================== layers
  function show(id) { ['busy', 'err', 'L1', 'L2', 'L3', 'TT'].forEach(v => { $(v).hidden = v !== id; }); }
  /* The panel takes a soft pastel colour from the result: green = rising, red = falling, neutral = no confirmed trend. */
  function setTone(t) { document.body.dataset.tone = t; }
  function setLayer(n, sub) {
    if (!state.cur) return; state.layer = n; state.top = false; $('topBtn').setAttribute('aria-pressed', 'false');
    if (n === 2 && sub) state.ev = sub; if (n === 3 && sub) state.det = sub;
    $('layers').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(+b.dataset.l === n)));
    show('L' + n); setTone(tone(state.cur));
    if (n === 1) renderVerdict(); else if (n === 2) renderEvidence(); else renderDetails();
  }
  function closeTop(silent) { if (!state.top) return; state.top = false; $('topBtn').setAttribute('aria-pressed', 'false'); if (!silent) { if (state.cur) setLayer(state.layer); else show('busy'); } }
  function openTop() { state.top = true; $('topBtn').setAttribute('aria-pressed', 'true'); $('layers').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', 'false')); show('TT'); setTone('none'); TS.top.render(); }
  /* The variable and the place are already on the left. Here we only add what is new: the kind of place and the years. */
  const kicker = S => `${S.live ? S.scene : 'Solved case: ' + TAGS[S.story].toLowerCase()} · ${S.c.start.slice(0, 4)}–${S.c.end.slice(0, 4)}`;
  function words(S) { const V = VARS[S.k], t = S.c.verdict.trend_per_decade; return t > 0 ? V.up : V.down; }
  /* One sentence in plain words. The number is not repeated here: it is the big figure just above. */
  function plain(S) {
    const c = S.c, v = c.verdict, e = c.enso, tr = v.trend_per_decade, noun = S.noun;
    if (v.level === 'NO VERDICT') return `The record here did not pass the quality check (${v.reason}), so we do not give a verdict.`;
    const dir = tr > 0 ? 'going up' : 'going down';
    if (v.sources_disagree) return 'One NASA dataset shows a clear trend here, but a second NASA dataset points the other way. A tool with only one source would get this wrong.';
    if (v.hidden_by_enso && (v.level === 'STRONG' || v.level === 'MODERATE')) return `The raw record shows nothing, because ${rname(e.index)} swings cover the change. After removing that rhythm, ${noun.toLowerCase()} is clearly ${dir}.`;
    if (v.explained_by_enso) return `It looks like a trend, but it is a natural rhythm: after removing ${rname(e.index)}, no significant trend is left.`;
    if (v.level === 'STRONG') return `${noun} is ${dir} here. Every check agrees, so this change is statistically significant.`;
    if (v.level === 'MODERATE') return `${noun} is probably ${dir} here. Most checks agree, but one does not.`;
    if (v.level === 'WEAK') return `There are signs that ${noun.toLowerCase()} is ${dir}, but the evidence is not solid. Do not report this as a trend.`;
    return 'The change is still smaller than the natural ups and downs. This does not prove that nothing is changing. It may only need more years of data.';
  }
  // ================================================================== outlook: is the trend a problem, and what to do
  /* For each variable and direction: what the change can mean for people and nature, and one piece of advice.
     The advice follows the adaptation options of IPCC AR6 Working Group II. calm = a direction that is rarely harmful. */
  /* [short risk, short advice, full risk, full advice] */
  const IMPACT = {
    PRECTOTCORR: { up: ['Floods, landslides', 'Check drainage, protect slopes', 'More floods, landslides and soil erosion.', 'Check drainage and flood maps, protect slopes, and store the extra water.'],
      down: ['Less water, more fire', 'Store water, drought-ready crops', 'Less water for people, crops, rivers and hydropower. More fire risk.', 'Save and store water, plant crops that need less water, and do not depend only on hydropower.'] },
    T2M: { up: ['Heat stress', 'More shade, heat alerts', 'Heat stress for people, crops and animals. More water demand. Ice and snow shrink.', 'Plant trees and shade in cities, set heat alerts, and choose crops that tolerate heat.'],
      down: ['Possible frost', 'Check local stations first', 'Cooling is unusual today. Possible frost risk for crops.', 'Compare with local weather stations before you act.'], calmDown: true },
    T2M_MAX: { up: ['Dangerous heatwaves', 'Heat alerts, cool shelters', 'More dangerous heatwaves for children, older people and outdoor workers. More fire weather.', 'Set early heat warnings, cool shelters and safe working hours.'],
      down: ['Fewer hot extremes', 'Keep watching', 'Fewer extreme hot days.', 'No action needed. Keep watching.'], calmDown: true },
    T2M_MIN: { up: ['Warmer nights, pests', 'Watch pests, shift planting', 'Warmer nights: people and crops recover less from the heat of the day. Pests and mosquitoes survive in higher places.', 'Watch for pests and mosquito diseases at higher altitudes, and adapt planting dates.'],
      down: ['Frost damage', 'Frost alerts for farmers', 'Colder nights: frost damage to crops, cold stress for people and animals.', 'Send frost alerts to farmers and prepare shelter.'] },
    GWETROOT: { up: ['Waterlogging', 'Improve drainage', 'Wetter soil helps plants, but too much water brings landslides and crop disease.', 'Improve drainage and watch slopes in the rainy season.'],
      down: ['Smaller harvests, fire', 'Efficient irrigation, soil cover', 'Drier soil: smaller harvests, stressed forests and more fire.', 'Use efficient irrigation and soil cover, plant drought-tolerant crops, and prevent fires.'] },
    RH2M: { up: ['Muggy heat, mosquitoes', 'Add humidity to heat alerts', 'More humid air makes heat feel worse and helps mould and mosquitoes.', 'Include humidity in heat alerts and control mosquitoes.'],
      down: ['Dry plants, more fire', 'Fire prevention, irrigation', 'Drier air: plants lose water faster and fires spread more easily.', 'Strengthen fire prevention and use efficient irrigation.'] },
    WS10M: { up: ['Erosion, storm damage', 'Windbreaks, check structures', 'Stronger wind: more erosion and storm damage. Also more wind energy.', 'Plant windbreaks, check roofs and structures, and study wind power.'],
      down: ['Less wind power', 'Review wind plans, watch air quality', 'Calmer air: less wind power, and air pollution stays longer in cities.', 'Review wind-energy plans and watch air quality.'] }
  };
  const OICON = {
    act: '<path d="M12 3.200L22 20.500H2z" fill="currentColor" stroke="none"/><path d="M12 9.500v5" stroke="#fff"/><circle cx="12" cy="17.300" r=".6" fill="#fff" stroke="#fff"/>',
    watch: '<path d="M12 3.500L21.500 20H2.500z"/><path d="M12 10v4.500"/><circle cx="12" cy="17.200" r=".5" fill="currentColor"/>',
    low: '<circle cx="12" cy="12" r="9"/><path d="M7.500 12.300l3 3 6-6.500"/>',
    none: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.600" r=".5" fill="currentColor"/>'
  };
  const cdf = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - q : q; };
  /* Is this trend a problem? Only a confirmed trend can give a warning.
     Projection: the measured change per decade, continued in a straight line to 2050, with its 95% range.
     Level: the projected change against the normal ups and downs of the place (signal-to-noise), or against the normal value.
       warning = change by 2050 larger than the normal monthly ups and downs, or 20% of the normal value or more
       watch   = at least half of the normal ups and downs, or 10% or more
     It is a warning sign to investigate, not a forecast from a climate model. */
  function outlook(S) {
    const c = S.c, v = c.verdict, t = tone(S), L = LEVELS[v.level].n;
    if (v.level === 'NO VERDICT') return null;
    const none = (risk, big, sub, act, full) => ({ lv: 'none', n: 0, word: 'No warning', risk, label: 'Why', big, sub, act, full });
    if (v.sources_disagree) return none('False lead', 'Sources disagree', 'One dataset is not enough', 'Check a local station', 'The two NASA datasets disagree, so there is no trend to act on. Do not base decisions on one dataset.');
    if (v.explained_by_enso) return none('Natural cycle', 'It comes back', 'Follows ' + rshort(c.enso.index), 'Follow seasonal forecasts', `The change follows ${rname(c.enso.index)} and comes back. The risk is the cycle, not a trend. Prepare for the next strong phase.`);
    if (t === 'none') {
      const miss = c.detectability && fin(c.detectability.years_missing) && c.detectability.years_missing > 0 ? Math.ceil(c.detectability.years_missing) : 0;
      return none(L === 2 ? 'Trend not confirmed' : 'No trend found', miss ? `+${miss} years` : 'Not yet', miss ? 'of data needed to be sure' : 'Inside the normal ups and downs', 'Keep watching, do not report a trend', 'There is no confirmed change to act on.');
    }
    const up = v.trend_per_decade > 0, imp = (IMPACT[S.k] || IMPACT.T2M)[up ? 'up' : 'down'], calm = !up && (IMPACT[S.k] || {}).calmDown;
    const dec = Math.max(0, (2050 - +c.end.slice(0, 4)) / 10), d = v.trend_per_decade * dec, a = v.trend_lo * dec, b = v.trend_hi * dec, lo = Math.min(a, b), hi = Math.max(a, b);
    const sig = c.detectability && c.detectability.noise_sigma, R = sig > 0 ? Math.abs(d) / sig : NaN, pc = S.pct && S.mean ? Math.abs(100 * d / S.mean) : NaN;
    let lv = (R >= 1 || pc >= 20) ? 'act' : (R >= 0.5 || pc >= 10) ? 'watch' : 'low';
    if (calm) lv = 'low';
    const se = (v.trend_hi - v.trend_lo) / 3.92, P = se > 0 ? cdf(Math.abs(v.trend_per_decade) / se) : NaN, sure = !fin(P) ? '' : P > 0.99 ? '>99% sure' : Math.round(P * 100) + '% sure';
    const isPc = fin(pc), y0 = +c.start.slice(0, 4), y1 = +c.end.slice(0, 4), since = v.trend_per_decade * (c.precheck && c.precheck.years ? c.precheck.years : y1 - y0) / 10;
    const val = q => isPc ? pctS(100 * q / S.mean) : `${fmt(q)} ${S.units}`;
    // the year when the change became larger than the normal ups and downs of this place (signal = noise)
    const yEm = sig > 0 ? Math.round(y0 + 10 * sig / Math.abs(v.trend_per_decade)) : NaN;
    const why = !fin(yEm) || yEm > 2100 ? 'Still within normal' : yEm <= y1 ? `Beyond normal since ${yEm}` : `Beyond normal by ~${yEm}`;
    return { lv, n: lv === 'act' ? 3 : lv === 'watch' ? 2 : 1, word: lv === 'act' ? 'Warning' : lv === 'watch' ? 'Watch' : 'Low concern', risk: why, label: `Change since ${y0}`,
      big: val(since), sub: `${val(d)} more by 2050`, doLabel: 'Risk: ' + imp[0].toLowerCase(), act: imp[1],
      full: `${imp[2]} Since ${y0}: ${fmt(since)} ${S.units}. If the trend continues in a straight line: ${fmt(d)} ${S.units} more by 2050 (95% range ${fmt(lo)} to ${fmt(hi)} ${S.units}${sure ? ', direction ' + sure : ''}). ${imp[3]}`, R, pc, P, d, since, yEm };
  }
  function renderOutlook(S) {
    const o = outlook(S), el = $('outlook'); el.hidden = !o; if (!o) return;
    el.dataset.lv = o.lv; el.title = o.full; el.setAttribute('aria-label', `${o.word}. ${o.full}`);
    el.innerHTML = `<div class="ol lv"><b><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${OICON[o.lv]}</svg>${esc(o.word)}<span class="gauge" aria-hidden="true">${[1, 2, 3].map(i => `<i${i <= o.n ? ' class="on"' : ''}></i>`).join('')}</span></b><em>${esc(o.risk)}</em></div>` +
      `<div class="ol"><small>${esc(o.label)}</small><b>${esc(o.big)}</b><em>${esc(o.sub)}</em></div>` +
      `<div class="ol do"><small><span>${esc(o.doLabel || 'What to do')}</span><button class="qm" id="outlookWhy" aria-label="How we estimate this">?</button></small><b>${esc(o.act)}</b></div>`;
    $('outlookWhy').onclick = () => TS.gloss.open('Outlook');
  }
  function headline(S) {
    const v = S.c.verdict;
    if (v.sources_disagree) return 'False lead. The data sources disagree.';
    if (v.hidden_by_enso && (v.level === 'STRONG' || v.level === 'MODERATE')) return 'Yes. A hidden trend.';
    if (v.explained_by_enso) return 'No. It is a natural cycle.';
    return LEVELS[v.level].head;
  }
  function renderVerdict() {
    const S = state.cur, c = S.c, v = c.verdict, L = LEVELS[v.level], none = v.level === 'NO VERDICT', sure = L.n >= 3, col = toneInk(S);
    $('kicker').textContent = kicker(S);
    $('headline').textContent = headline(S); $('headline').style.color = col;
    $('meter').style.setProperty('--lv', col); $('meter').setAttribute('aria-label', 'Strength of the evidence: ' + (L.n ? METER[L.n - 1] : 'no verdict'));
    $('meter').innerHTML = METER.map((m, i) => `<div class="${i < L.n ? 'on' : ''}${i === L.n - 1 ? ' cur' : ''}">${m}</div>`).join('');
    const up = v.trend_per_decade > 0, path = none || L.n === 1 ? '<path d="M5 12h14"/>' : up ? '<path d="M6 17L17 6M9 6h8v8"/>' : '<path d="M6 7l11 11M9 18h8v-8"/>';
    $('arrow').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    if (none) { $('bignum').textContent = 'No verdict'; $('bigsub').textContent = 'Try another variable or a place nearby.'; }
    else {
      const rate = `${fmt(v.trend_per_decade)} ${S.units} per decade`, pc = S.pct && S.mean ? ` (${pctS(100 * v.trend_per_decade / S.mean)})` : '';
      $('bignum').textContent = L.n === 1 ? 'No clear direction' : rate + (sure ? pc : '');
      $('bigsub').textContent = L.n === 1 ? `Best estimate ${rate}, but it could be zero.` : sure ? words(S) : 'Possible change, not confirmed';
    }
    $('plain').textContent = plain(S); renderOutlook(S);
    $('spark').hidden = none; if (!none) {
      const base = nz(c.cycle_matters ? c.series.adjusted : c.series.anomaly), sr = runmean(base), ok = sr.filter(fin), n = sr.length;
      // a scale with round numbers: 3 or 4 lines that always include zero (zero = the normal value of this place)
      let lo = Math.min(0, ...ok), hi = Math.max(0, ...ok); const raw = (hi - lo || 1) / 3, pw = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(m => m * pw).find(q => q >= raw) || raw;
      lo = Math.floor(lo / st + 1e-9) * st; hi = Math.ceil(hi / st - 1e-9) * st; const dg = Math.max(0, -Math.floor(Math.log10(st) + 1e-9)) + (String(st / pw).includes('.') ? 1 : 0);
      const X = i => (i / (n - 1) * 1000).toFixed(1), Y = q => (290 - (q - lo) / (hi - lo) * 280).toFixed(1), ticks = []; for (let q = lo; q <= hi + st / 2; q += st) ticks.push(Math.abs(q) < st / 1e6 ? 0 : q);
      const tl = trendLine(base, v.trend_per_decade); let dpath = '', pen = false;
      sr.forEach((q, i) => { if (fin(q)) { dpath += (pen ? 'L' : 'M') + X(i) + ' ' + Y(q); pen = true; } else pen = false; });
      const y0 = +c.start.slice(0, 4), m0 = +(c.start.slice(5, 7) || 1) - 1, years = []; for (let yr = Math.ceil(y0 / 10) * 10; ; yr += 10) { const f = ((yr - y0) * 12 - m0) / (n - 1); if (f > 0.97) break; if (f >= 0.09) years.push([yr, f]); }
      const tick = q => (q > 0 ? '+' : q < 0 ? '−' : '') + Math.abs(q).toFixed(dg);
      $('spark').innerHTML = `<span class="cap"><b>Change from normal</b> (${esc(S.units)}) · 12-month average${c.cycle_matters ? ', rhythm removed' : ''}</span>` +
        `<span class="plot"><svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">` +
        ticks.map(q => `<path d="M0 ${Y(q)}H1000" stroke="#1D1D1F" stroke-width="${q === 0 ? 1.4 : 1}" opacity="${q === 0 ? .45 : .13}" vector-effect="non-scaling-stroke"/>`).join('') +
        years.map(([, f]) => `<path d="M${(f * 1000).toFixed(1)} 0V300" stroke="#1D1D1F" stroke-width="1" opacity=".08" vector-effect="non-scaling-stroke"/>`).join('') +
        `<path d="${dpath}" fill="none" stroke="#1D1D1F" stroke-width="1.8" vector-effect="non-scaling-stroke" opacity=".55"/><path d="M0 ${Y(tl[0])}L1000 ${Y(tl[1])}" fill="none" stroke="${col}" stroke-width="4" vector-effect="non-scaling-stroke" ${L.n >= 3 ? '' : 'stroke-dasharray="10 8"'}/></svg>` +
        ticks.map(q => `<i class="yl" style="top:${(Y(q) / 3).toFixed(1)}%">${tick(q)}</i>`).join('') + `<i class="xl" style="left:0">${y0}</i>` + years.map(([yr, f]) => `<i class="xl" style="left:${(f * 100).toFixed(1)}%">${yr}</i>`).join('') + `</span>`;
    }
    $('L1').querySelectorAll('[data-go]').forEach(b => { b.disabled = none; b.onclick = () => { const [l, s] = b.dataset.go.split(':'); setLayer(+l, s); }; });
  }

  // ------------------------------------------------------------------ charts
  function lay(extra) {
    const ax = { gridcolor: CH.grid, zerolinecolor: CH.zero, linecolor: 'rgba(0,0,0,.18)', tickfont: { size: 16 }, automargin: true };
    return Object.assign({ margin: { l: 66, r: 18, t: 10, b: 40 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { family: FONT, size: 16, color: CH.ink }, xaxis: Object.assign({}, ax), yaxis: Object.assign({}, ax),
      legend: { orientation: 'h', x: 0, y: 1, yanchor: 'bottom', font: { size: 16 }, bgcolor: 'rgba(0,0,0,0)' }, hoverlabel: { bgcolor: '#FFFFFF', bordercolor: '#D2D2D7', font: { size: 16, family: FONT, color: CH.ink } }, hovermode: 'x unified', bargap: 0.08 }, extra || {});
  }
  const CFG = { displayModeBar: false, responsive: true };
  const ytitle = t => ({ title: { text: t, font: { size: 16 }, standoff: 8 } });
  function runmean(a, w = 12) { return a.map((_, i) => { if (i < w - 1) return null; let s = 0, n = 0; for (let k = i - w + 1; k <= i; k++) if (fin(a[k])) { s += a[k]; n++; } return n >= w * 0.75 ? s / n : null; }); }
  function dates(n, y0) { return Array.from({ length: n }, (_, i) => `${y0 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}-15`); }
  function trendLine(series, slopePerDecade) { const n = series.length, b = slopePerDecade / 120, res = []; series.forEach((v, i) => { if (fin(v)) res.push(v - b * i); }); res.sort((x, y) => x - y); const a = res.length ? res[Math.floor(res.length / 2)] : 0; return [a, a + b * (n - 1)]; }
  function segHTML(id, items, cur) { return `<div class="seg light" id="${id}" role="radiogroup">${items.map(([k, t]) => `<button role="radio" data-x="${k}" aria-checked="${k === cur}">${t}</button>`).join('')}</div>`; }

  function renderEvidence() {
    const S = state.cur; if (S.c.verdict.level === 'NO VERDICT') { setLayer(1); return; }
    $('evTabs').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.e === state.ev)));
    const draw = () => { if (state.cur !== S || state.layer !== 2 || $('L2').hidden) return; ({ time: drawTime, tvn: drawThenNow, rhythm: drawRhythm, month: drawMonth })[state.ev](); requestAnimationFrame(() => window.Plotly.Plots.resize($('chart'))); };
    if (window.Plotly) draw(); else { $('evNote').textContent = 'Loading the chart…'; $('evExtra').innerHTML = ''; TS.data.plotly().then(draw); }
  }
  function drawTime() {
    const S = state.cur, c = S.c, n = S.y.length, x = dates(n, S.startYear), anom = nz(c.series.anomaly), adj = nz(c.series.adjusted), tr = [];
    const canAdj = !!c.cycle_matters, view = state.view === 'adj' && !canAdj ? 'anom' : state.view, items = [['raw', 'Raw data'], ['anom', 'Seasons removed']];
    if (canAdj) items.push(['adj', rshort(c.enso.index) + ' removed']);
    $('evExtra').innerHTML = segHTML('viewSeg', items, view);
    $('viewSeg').querySelectorAll('button').forEach(b => b.onclick = () => { state.view = b.dataset.x; drawTime(); });
    const L = lay({ yaxis: Object.assign(lay().yaxis, ytitle(S.units)) }); let note;
    if (view === 'raw') {
      tr.push({ x, y: S.y, name: S.live ? 'NASA MERRA-2' : S.primaryLabel, mode: 'lines', line: { color: CH.ink, width: 1.2 } });
      if (S.second) tr.push({ x: dates(S.second.y.length, S.second.startYear), y: S.second.y, name: S.second.label, mode: 'lines', line: { color: CH.second, width: 1.3 }, opacity: .9 });
      note = `This is the raw monthly record. <b>The seasons explain ${(c.precheck.seasonality_share * 100).toFixed(0)}%</b> of its ups and downs, so any slow change is hard to see.`;
    } else {
      const s = view === 'adj' ? adj : anom, slope = view === 'adj' ? c.enso.trend_adj_per_decade : c.detection.sen_per_decade, p = view === 'adj' ? c.enso.mk_p_adj : c.detection.mk_p, tl = trendLine(s, slope);
      tr.push({ x, y: s, name: 'Each month', type: 'bar', marker: { color: s.map(v => v >= 0 ? CH.pos : CH.neg) }, opacity: .45 });
      if (view === 'adj') tr.push({ x, y: runmean(anom), name: 'Before removing', mode: 'lines', line: { color: CH.soft, width: 2, dash: 'dot' } });
      tr.push({ x, y: runmean(s), name: '12-month average', mode: 'lines', line: { color: CH.ink, width: 2.4 } });
      tr.push({ x: [x[0], x[n - 1]], y: tl, name: `Trend ${fmt(slope)} per decade`, mode: 'lines', line: { color: CH.trend, width: 4, dash: p < 0.05 ? 'solid' : 'dash' } });
      if (S.second && view === 'anom') { const a2 = E.anomalies(S.second.y).anom; tr.push({ x: dates(a2.length, S.second.startYear), y: runmean(a2), name: 'Second NASA dataset', mode: 'lines', line: { color: CH.second, width: 2.2 } }); }
      note = view === 'adj' ? `Here we also took out what <b>${rname(c.enso.index)}</b> explains (${(c.enso.variance_share * 100).toFixed(0)}% of the swings). What is left is the slow change. The purple line is the trend: ${p < 0.05 ? '<b>solid = significant</b>' : '<b>dashed = not significant</b>'} (${pS(p)}).`
        : `Each month is compared with its own normal value, so the seasons are gone. The purple line is the trend: ${p < 0.05 ? '<b>solid = significant</b>' : '<b>dashed = not significant</b>'} (${pS(p)}).`;
    }
    $('evNote').innerHTML = note; window.Plotly.react('chart', tr, L, CFG);
  }
  function drawThenNow() {
    const S = state.cur, d = S.dec, ev = I.events(S.y, S.startYear, state.phen), opts = I.LIB.filter(x => !x.slow).map(x => `<option value="${esc(x.name)}"${x.name === state.phen ? ' selected' : ''}>${esc(x.label)}</option>`).join('');
    const val = e => S.pct && fin(e.pct) ? pctS(e.pct) : `${fmt(e.anom)} ${S.units}`;
    const sub = e => S.pct && fin(e.pct) ? `${fmt(e.anom)} ${S.units} vs normal` : 'vs normal';
    let cards = `<label class="evcard" style="flex:0 1 auto"><small>Phenomenon</small><select id="phenSel" aria-label="Phenomenon to compare">${opts}</select></label>`;
    if (ev && !ev.none) {
      const u = ev.meta.unit === 'SD' ? ' SD' : ' °C';
      cards += `<div class="evcard"><small>${ev.decadeApart ? 'A decade ago' : 'Last time'} · ${esc(ev.phase)} ${ev.then.years}</small><b>${val(ev.then)}</b><small>${sub(ev.then)} · index peak ${fmt(ev.then.peak, 1)}${u}</small></div>` +
        `<div class="evcard now"><small>Now · ${esc(ev.phase)} ${ev.now.years}${ev.now.ongoing ? ' (still going)' : ''}</small><b>${val(ev.now)}</b><small>${sub(ev.now)} · index peak ${fmt(ev.now.peak, 1)}${u}</small></div>`;
    } else cards += `<div class="evcard"><small>${esc(rname(state.phen))}</small><b>Quiet now</b><small>No strong event in the last 2½ years to compare.</small></div>`;
    $('evExtra').innerHTML = cards; $('phenSel').onchange = e => { state.phen = e.target.value; drawThenNow(); };
    if (!d) { $('evNote').innerHTML = 'This record is shorter than 20 years, so two full decades cannot be compared.'; window.Plotly.purge('chart'); return; }
    const sig = d.p < 0.05;
    $('evNote').innerHTML = `<b>Same phenomenon, a decade apart</b> (cards), and the <b>last 10 years against the 10 before</b> (chart): ${S.noun.toLowerCase()} changed by <b>${S.pct ? pctS(d.pct) : fmt(d.diff) + ' ' + S.units}</b> (${num(d.then.mean)} → ${num(d.now.mean)} ${S.units}). ${sig ? 'That is more than normal year-to-year change' : 'That is inside normal year-to-year change'} (${pS(d.p)}).`;
    window.Plotly.react('chart', [{ x: MON, y: d.then.clim, name: d.then.label, type: 'bar', marker: { color: CH.mute } }, { x: MON, y: d.now.clim, name: d.now.label, type: 'bar', marker: { color: CH.pos } }],
      lay({ barmode: 'group', bargap: 0.25, yaxis: Object.assign(lay().yaxis, ytitle(S.units)) }), CFG);
  }
  function drawRhythm() {
    const S = state.cur, R = S.rh, top = R.list.slice(0, 6).reverse(), sp = S.spec, c = S.c; $('evExtra').innerHTML = '';
    const col = r => r.slow ? CH.slow : r.significant ? CH.pos : CH.mute, best = R.list[0];
    const tr = [{ type: 'bar', orientation: 'h', y: top.map(r => r.meta.short), x: top.map(r => r.share * 100), marker: { color: top.map(col) }, text: top.map(r => (r.share * 100).toFixed(0) + '%'), textposition: 'outside', textfont: { size: 16 }, cliponaxis: false,
      customdata: top.map(r => r.meta.label + (r.slow ? ' (slow: reported, not removed)' : r.significant ? ' (significant)' : ' (not significant)')), hovertemplate: '%{customdata}<br>%{x:.0f}% of the swings<extra></extra>', showlegend: false }];
    const L = lay({ hovermode: 'closest', margin: { l: 96, r: 18, t: 34, b: 46 }, xaxis: Object.assign(lay().xaxis, { domain: sp ? [0, 0.44] : [0, 1], range: [0, Math.max(20, ...top.map(r => r.share * 100)) * 1.25], title: { text: '% of the swings explained', font: { size: 16 } } }),
      annotations: [{ text: '<b>Known rhythms</b>', xref: 'paper', yref: 'paper', x: 0, y: 1.0, yanchor: 'bottom', showarrow: false, font: { size: 16 } }] });
    if (sp) {
      tr.push({ x: sp.period, y: sp.ratio, xaxis: 'x2', yaxis: 'y2', mode: 'lines', fill: 'tozeroy', line: { color: CH.trend, width: 2.5 }, fillcolor: 'rgba(94,92,230,.12)', hovertemplate: 'every %{x:.1f} years<br>%{y:.1f}× the noise level<extra></extra>', showlegend: false });
      L.xaxis2 = Object.assign(lay().xaxis, { domain: [0.58, 1], anchor: 'y2', type: 'log', tickvals: [1.5, 2, 3, 5, 8, 12], ticktext: ['1.5', '2', '3', '5', '8', '12'], title: { text: 'repeats every … years', font: { size: 16 } } });
      L.yaxis2 = Object.assign(lay().yaxis, { anchor: 'x2', rangemode: 'tozero', title: { text: 'strength', font: { size: 16 }, standoff: 6 } });
      L.shapes = [{ type: 'line', xref: 'x2 domain', yref: 'y2', x0: 0, x1: 1, y0: 1, y1: 1, line: { color: CH.ink, width: 2, dash: 'dash' } }];
      L.annotations.push({ text: '<b>Any rhythm (scan)</b>', xref: 'paper', yref: 'paper', x: 0.58, y: 1.0, yanchor: 'bottom', xanchor: 'left', showarrow: false, font: { size: 16 } });
    }
    const pk = sp && sp.peaks[0];
    $('evNote').innerHTML = `We do not test only El Niño. We test <b>${R.tested} repeating phenomena</b> and also scan for any rhythm without a name. Here the <b>seasons explain ${(R.seasons * 100).toFixed(0)}%</b> of the raw record. ` +
      (best ? `Of the rest, <b>${best.meta.label}</b> explains the most (${(best.share * 100).toFixed(0)}%${best.significant ? ', significant' : ', not significant'}). ` : '') + (pk ? `The scan (right) finds a rhythm about <b>every ${pk.years.toFixed(1)} years</b>, above the dashed noise line.` : 'In the scan (right), nothing rises above the dashed noise line.');
    window.Plotly.react('chart', tr, L, CFG);
  }
  function drawMonth() {
    const S = state.cur, m = S.c.robustness.months, sig = m.filter(o => o.p < 0.05).length; $('evExtra').innerHTML = '';
    $('evNote').innerHTML = `The change is not the same all year. Each bar is the trend of one calendar month. <b>${sig} of 12 months</b> are significant on their own (in colour).` + (S.c.verdict.seasonal_conflict ? ' The months disagree, so be careful with one single yearly number.' : '');
    window.Plotly.react('chart', [{ x: MON, y: m.map(o => o.sen_per_decade), type: 'bar', marker: { color: m.map(o => o.p < 0.05 ? (o.sen_per_decade > 0 ? CH.pos : CH.neg) : '#C7C7CC') }, hovertemplate: '%{x}: %{y:.2f} per decade<extra></extra>' }],
      lay({ bargap: 0.25, hovermode: 'closest', yaxis: Object.assign(lay().yaxis, ytitle(S.units + ' per decade')) }), CFG);
  }

  // ------------------------------------------------------------------ details
  const CHECK = { mk: ['Is the direction consistent?', 'Seasonal Mann-Kendall test'], ols: ['Is the slope different from zero?', 't-test on the trend line'], ci: ['Does the 95% range exclude zero?', "Sen's slope confidence interval"],
    neutral: ['Is it still there in quiet months?', 'Only months with no active rhythm'], enso: ['Is it the same after removing the main rhythm?', 'Natural cycle removed'], end: ['Is it stable without the last 2 years?', 'End-of-record check'], second: ['Does a second NASA dataset agree?', 'Independent source'] };
  function renderDetails() {
    const S = state.cur, c = S.c, v = c.verdict; if (v.level === 'NO VERDICT') { setLayer(1); return; }
    const elseBtn = $('detTabs').querySelector('[data-d="else"]'); elseBtn.disabled = !S.live; if (!S.live && state.det === 'else') state.det = 'checks';
    $('detTabs').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.d === state.det)));
    const d = c.detection, det = c.detectability, e = c.enso, B = $('detBody');
    if (state.det === 'checks') {
      B.innerHTML = v.checks.map(ch => {
        const m = ch.text.match(/p = ([\d.e<\- ]+)/), val = ch.key === 'ci' ? `${fmt(v.trend_lo)} to ${fmt(v.trend_hi)}` : ch.key === 'end' && c.robustness ? fmt((c.cycle_matters ? c.robustness.end_sensitivity_adj : c.robustness.end_sensitivity).sen_per_decade) + ' per decade'
          : ch.key === 'second' ? `${fmt(c.robustness.second.primary.sen_per_decade)} vs ${fmt(c.robustness.second.second.sen_per_decade)}` : m ? pS(parseFloat(m[1])) : '';
        return `<div class="check ${ch.passed ? 'pass' : 'fail'}"><span class="ic" aria-hidden="true">${ch.passed ? '✓' : '–'}</span><div><b>${CHECK[ch.key][0]}</b><span>${CHECK[ch.key][1]}${ch.key === 'mk' || ch.key === 'ols' ? ', corrected for the memory of the data' : ''} · ${ch.passed ? 'passed' : 'not passed'}</span></div><em>${val}</em></div>`;
      }).join('');
    } else if (state.det === 'numbers') {
      // Only what the other screens do not show: the rate and its range are on Beginner and Checks, the p-values on Checks.
      const top = S.rh.list.find(r => !r.slow);
      const N = [['Judged on', v.judged_on === 'raw anomalies' ? 'seasons removed' : 'seasons + rhythm removed'], ['Seasons explain', `${(c.precheck.seasonality_share * 100).toFixed(0)}% of the raw record`],
        ['Main natural rhythm', c.cycle_matters ? `${rshort(e.index)}, ${(e.variance_share * 100).toFixed(0)}%` : top ? `${rshort(top.name)}, ${(top.share * 100).toFixed(0)}%` : 'none'],
        ['Textbook p-value (no correction)', p3(d.mk_p_naive)], ['Memory of the data (lag-1)', num(d.ar1)], ['Independent months', `${d.n_eff.toFixed(0)} of ${c.precheck.n_months}`],
        ['Years of data', det.years_available.toFixed(0)], ['Years needed to be sure', fin(det.years_needed) ? det.years_needed.toFixed(0) : '–'], ['Mean value', `${num(S.mean)} ${S.units}`]];
      B.innerHTML = `<div class="nums">${N.map(([k, val]) => `<div class="num"><small>${k}</small><b>${esc(val)}</b></div>`).join('')}</div>`;
    } else if (state.det === 'data') {
      const p = S.prov, href = (p.url || '').split(' ')[0], rest = (p.url || '').slice(href.length), link = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;
      B.innerHTML = `<div class="prov"><p><small>Main data · ${S.live ? coord(S.lat, S.lon) : esc(S.place)}</small>${esc(p.primary)} · ${c.start} to ${c.end} · monthly</p>` + (p.second ? `<p><small>Second witness</small>${esc(p.second)}</p>` : '') +
        `<p><small>Natural rhythms tested (${S.rh.tested})</small>${I.LIB.map(x => x.short).join(', ')} · ${link('https://psl.noaa.gov/data/climateindices/list/', 'NOAA PSL')}, through ${window.TS_NINO.last}</p>` +
        `<p><small>Source link · accessed ${esc((p.accessed || '').slice(0, 10))}</small>${link(href, href.length > 74 ? href.slice(0, 72) + '…' : href)}${esc(rest)}</p>` +
        `<p class="limits"><small>Limits</small>We test straight-line trends only. A link with a rhythm is an association, not proof of cause.</p>` +
        `<div class="actions"><button class="btn primary" id="dlJson">Download case file (JSON)</button><button class="btn" id="dlCsv">Download series (CSV)</button></div></div>`;
      $('dlJson').onclick = () => download('json'); $('dlCsv').onclick = () => download('csv');
    } else {
      const rows = Object.keys(VARS).map(k => { let r; try { r = liveResult(S.data, S.key, k, S.lat, S.lon).c; } catch (err) { return ''; } const vv = r.verdict, L = LEVELS[vv.level];
        const tn = L.n >= 3 && !vv.sources_disagree && !vv.explained_by_enso ? (vv.trend_per_decade > 0 ? INK.green : INK.red) : INK.gray;
        return `<tr class="rowlink" data-k="${k}" tabindex="0"><td><b>${VARS[k].label}</b></td><td style="color:${tn};font-weight:700">${L.n ? METER[L.n - 1] : 'No data'}</td><td>${L.n >= 2 ? fmt(vv.trend_per_decade) + ' ' + VARS[k].units + ' per decade' : '–'}</td><td>${vv.hidden_by_enso ? 'hidden by a rhythm' : vv.sources_disagree ? 'sources disagree' : vv.explained_by_enso ? 'natural cycle' : ''}</td></tr>`; }).join('');
      B.innerHTML = `<table><thead><tr><th>Variable</th><th>Evidence</th><th>Change</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table>`;
      B.querySelectorAll('.rowlink').forEach(tr => { const go = () => { setVar(tr.dataset.k, true); investigate(S.lat, S.lon); }; tr.onclick = go; tr.onkeydown = ev => { if (ev.key === 'Enter') go(); }; });
    }
  }
  function download(kind) {
    const S = state.cur; if (!S) return; let blob, name;
    if (kind === 'csv') {
      const a = nz(S.c.series.anomaly), j = nz(S.c.series.adjusted), rows = ['date,value,anomaly,anomaly_rhythm_removed'];
      S.y.forEach((v, i) => rows.push(`${S.startYear + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')},${fin(v) ? v : ''},${fin(a[i]) ? a[i].toFixed(4) : ''},${fin(j[i]) ? j[i].toFixed(4) : ''}`));
      blob = new Blob([rows.join('\n')], { type: 'text/csv' }); name = 'trendsleuth_series.csv';
    } else {
      const c = JSON.parse(JSON.stringify(S.c, (k, v) => typeof v === 'number' && !fin(v) ? null : v));
      blob = new Blob([JSON.stringify({ tool: 'TrendSleuth Evidence Engine v1.1', title: S.title, place: placeText(S), provenance: S.prov, units: S.units, rhythms: S.rh.list.map(r => ({ name: r.name, share: r.share, p: r.p, significant: r.significant, slow: !!r.slow })), decades: S.dec, raw_series: S.y.map(v => fin(v) ? v : null), case: c }, null, 1)], { type: 'application/json' }); name = 'trendsleuth_case_file.json';
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ================================================================== init
  function init() {
    renderVars(); renderLegend(); initSearch();
    TS.map.init($('globe'), (lat, lon) => { if (!state.demo) investigate(lat, lon); });
    TS.map.setVar(state.v);
    const inset = () => { const st = $('stage').getBoundingClientRect(); TS.map.inset(Math.round($('where').getBoundingClientRect().bottom - st.top), Math.round(st.bottom - $('legend').getBoundingClientRect().top + 6)); };
    inset(); new ResizeObserver(inset).observe($('stage')); new ResizeObserver(inset).observe(document.querySelector('.ask'));
    const g = PRE.global_stats;
    $('gstats').innerHTML = `<div><b>${(g.share_confirmed_by_imerg * 100).toFixed(0)}%</b>of the "significant" rain trends in one NASA dataset are confirmed by a second one.</div>` +
      `<div><b>${(g.share_lost_to_serial_correlation * 100).toFixed(0)}%</b>of textbook trends disappear with a stricter test.</div><div><b>${g.hidden_area_Mkm2.toFixed(1)} M km²</b>of land and sea hide a rain trend behind El Niño.</div>`;
    $('zoomIn').onclick = () => TS.map.zoom(0.6); $('zoomOut').onclick = () => TS.map.zoom(1.6);
    $('layers').querySelectorAll('button').forEach(b => { b.disabled = true; b.onclick = () => setLayer(+b.dataset.l); });
    $('evTabs').querySelectorAll('button').forEach(b => b.onclick = () => { state.ev = b.dataset.e; renderEvidence(); });
    $('detTabs').querySelectorAll('button').forEach(b => b.onclick = () => { state.det = b.dataset.d; renderDetails(); });
    $('topBtn').onclick = () => { if (state.demo) return; state.top ? closeTop() : openTop(); }; $('ttClose').onclick = () => closeTop();
    $('demoBtn').onclick = () => TS.demo.start();
    $('helpBtn').onclick = () => $('help').showModal(); $('helpClose').onclick = () => $('help').close();
    $('glossBtn').onclick = () => TS.gloss.open(); TS.gloss.init();
    const hello = $('hello'), bye = () => { hello.close(); try { sessionStorage.setItem('ts_hello', '1'); } catch (e) { /* private mode */ } };
    $('helloClose').onclick = $('helloGo').onclick = bye; $('helloDemo').onclick = () => { bye(); TS.demo.start(); };
    $('helloAgain').onclick = () => { $('help').close(); hello.showModal(); };
    document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', ev => { if (ev.target === d) d.close(); }));   // a click outside closes it
    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') { if (state.demo) TS.demo.stop(); }
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName) || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (state.demo) { if (ev.key === ' ') { ev.preventDefault(); TS.demo.toggle(); } else if (ev.key === 'ArrowRight') TS.demo.next(); else if (ev.key === 'ArrowLeft') TS.demo.prev(); return; }
      if (['1', '2', '3'].includes(ev.key) && state.cur) setLayer(+ev.key);
    });
    window.addEventListener('resize', () => { if (state.layer === 2 && state.cur && !$('L2').hidden && window.Plotly) window.Plotly.Plots.resize($('chart')); });
    // heavy extras load after the first screen is ready
    setTimeout(() => { TS.geo.ready(); idle(() => TS.data.plotly()); }, 400);
    const q = new URLSearchParams(location.search);
    if (VARS[q.get('v')]) setVar(q.get('v'), true);
    // The app never opens empty: a variable and a place are already chosen.
    if (q.get('lat') && q.get('lon')) investigate(+q.get('lat'), +q.get('lon')); else openCase(PRE.cases.some(c => c.id === q.get('case')) ? q.get('case') : START_CASE);
    if (q.get('top')) openTop();
    let seen = false; try { seen = !!sessionStorage.getItem('ts_hello'); } catch (e) { /* private mode */ }
    if (q.get('demo')) TS.demo.start(); else if (!seen && !q.get('nohello')) hello.showModal();
  }
  TS.app = { init, state, VARS, INK, openCase, investigate, setLayer, setVar, setPlace, openTop, closeTop, closeSheet: () => {}, show, fmt, pctS, esc, $ };
})();
