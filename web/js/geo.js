/* TrendSleuth · places.
   Turns coordinates into a name people know: province (or state) and country.
   Also finds a place by name, and draws country borders on the map.
   Works offline: borders come from Natural Earth (public domain), stored in data/places.topo.json. */
(function () {
  'use strict';
  const TS = window.TS;
  let DB = null, loading = null;

  // ---- TopoJSON -> polygons -------------------------------------------------------------
  function decode(topo) {
    const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
    const arcs = topo.arcs.map(a => { let x = 0, y = 0; return a.map(p => { x += p[0]; y += p[1]; return [x * sx + tx, y * sy + ty]; }); });
    const ring = ids => {
      const out = [];
      for (const i of ids) { const a = i < 0 ? arcs[~i] : arcs[i], n = a.length; for (let k = out.length ? 1 : 0; k < n; k++) out.push(i < 0 ? a[n - 1 - k] : a[k]); }
      return out;
    };
    const layer = obj => obj.geometries.filter(g => g.type).map(g => {
      const polys = (g.type === 'Polygon' ? [g.arcs] : g.arcs).map(p => p.map(ring)), b = [180, 90, -180, -90];
      for (const p of polys) for (const [x, y] of p[0]) { if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
      return { name: g.properties.name || '', country: g.properties.admin, bbox: b, polys };
    });
    const prov = layer(topo.objects.prov), ctry = layer(topo.objects.ctry);
    ctry.forEach(c => { c.name = c.country; c.isCountry = true; });
    const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const index = ctry.map(f => ({ f, key: fold(f.name), label: f.name }))
      .concat(prov.filter(f => f.name).map(f => ({ f, key: fold(f.name), label: f.name + ', ' + f.country })));
    return { prov, ctry, index, fold };
  }
  function load() {
    return loading || (loading = TS.data.places().then(t => { DB = decode(t); return DB; }).catch(e => { console.warn('Place names are not available:', e.message); loading = null; return null; }));
  }

  // ---- point in polygon -----------------------------------------------------------------
  function inRing(r, x, y) {
    let inside = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function contains(f, x, y) {
    const b = f.bbox; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return false;
    for (const p of f.polys) { if (!inRing(p[0], x, y)) continue; let hole = false; for (let h = 1; h < p.length; h++) if (inRing(p[h], x, y)) { hole = true; break; } if (!hole) return true; }
    return false;
  }
  const find = (list, x, y) => { for (const f of list) if (contains(f, x, y)) return f; return null; };

  function ocean(lat, lon) {
    if (lat > 66) return 'Arctic Ocean';
    if (lat < -60) return 'Southern Ocean';
    if (lat > 30 && lat < 46 && lon > -6 && lon < 36) return 'Mediterranean Sea';
    if (lon > -70 && lon < 20) return 'Atlantic Ocean';
    if (lat > 9 && lon > -98 && lon <= -60 && (lat > 18 || lon > -84)) return 'Atlantic Ocean';
    if ((lon >= 20 && lon <= 100 && lat < 31) || (lon > 100 && lon <= 146 && lat < -10)) return 'Indian Ocean';
    return 'Pacific Ocean';
  }

  /* Name of the place at these coordinates. Synchronous once the borders are loaded (use ready() first). */
  function locate(lat, lon) {
    if (!DB) return null;
    // the borders are simplified, so a point right on the coast can fall just outside: look a little around it
    for (const d of [0, 0.12, 0.3]) {
      const tries = d ? [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, -d], [d, -d], [-d, d]] : [[0, 0]];
      for (const [dx, dy] of tries) {
        const p = find(DB.prov, lon + dx, lat + dy);
        if (p) return { land: true, province: p.name, country: p.country, feature: p, near: d > 0 };
        const c = find(DB.ctry, lon + dx, lat + dy);
        if (c) return { land: true, province: '', country: c.country, feature: c, near: d > 0 };
      }
    }
    return { land: false, province: '', country: '', sea: ocean(lat, lon), feature: null };
  }
  const coordText = (lat, lon) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
  function label(loc) {
    if (!loc) return '';
    if (!loc.land) return loc.sea;
    return loc.province ? `${loc.province}, ${loc.country}` : loc.country;
  }

  // ---- search by name -------------------------------------------------------------------
  function centre(f) {
    let best = null, bestA = -1;
    for (const p of f.polys) {
      const r = p[0]; let a = 0, cx = 0, cy = 0;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const k = r[j][0] * r[i][1] - r[i][0] * r[j][1]; a += k; cx += (r[j][0] + r[i][0]) * k; cy += (r[j][1] + r[i][1]) * k; }
      if (Math.abs(a) > bestA && a !== 0) { bestA = Math.abs(a); best = [cy / (3 * a), cx / (3 * a)]; }
    }
    if (!best) return [(f.bbox[1] + f.bbox[3]) / 2, (f.bbox[0] + f.bbox[2]) / 2];
    if (contains(f, best[1], best[0])) return best;
    const r = f.polys[0][0][0]; return [r[1], r[0]];          // concave shape: fall back to a point on the border
  }
  function search(text, max = 6) {
    if (!DB) return [];
    const q = DB.fold(text.trim()); if (q.length < 2) return [];
    const starts = [], inside = [];
    for (const e of DB.index) { const i = e.key.indexOf(q); if (i === 0) starts.push(e); else if (i > 0 && (e.key[i - 1] === ' ' || e.key[i - 1] === '-')) inside.push(e); if (starts.length >= 40) break; }
    starts.sort((a, b) => (b.f.isCountry ? 1 : 0) - (a.f.isCountry ? 1 : 0) || a.key.length - b.key.length);
    return starts.concat(inside).slice(0, max).map(e => { const [lat, lon] = centre(e.f); return { label: e.label, lat, lon, kind: e.f.isCountry ? 'Country' : 'Province / state' }; });
  }

  // ---- drawing on the map texture (equirectangular canvas) --------------------------------
  function trace(ctx, f, W, H) {
    for (const p of f.polys) for (const r of p) {
      ctx.moveTo((r[0][0] + 180) / 360 * W, (90 - r[0][1]) / 180 * H);
      for (let i = 1; i < r.length; i++) ctx.lineTo((r[i][0] + 180) / 360 * W, (90 - r[i][1]) / 180 * H);
      ctx.closePath();
    }
  }
  function drawBorders(ctx, W, H) {
    if (!DB) return false;
    ctx.beginPath(); for (const f of DB.ctry) trace(ctx, f, W, H);
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.1, W / 2400); ctx.strokeStyle = 'rgba(255,255,255,.62)'; ctx.stroke();
    return true;
  }
  /* All land as one filled shape: used to give land and sea different tones on the globe. */
  function drawLand(ctx, W, H) {
    if (!DB) return false;
    ctx.beginPath(); for (const f of DB.ctry) trace(ctx, f, W, H);
    ctx.fillStyle = '#fff'; ctx.fill('evenodd');
    return true;
  }
  function drawOutline(ctx, f, W, H) {
    ctx.beginPath(); trace(ctx, f, W, H);
    const k = W / 2048; ctx.lineJoin = 'round'; ctx.lineWidth = 5 * k; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.stroke();
    ctx.lineWidth = 2.4 * k; ctx.strokeStyle = '#fff'; ctx.stroke();
  }

  TS.geo = { ready: load, loaded: () => !!DB, locate, label, coordText, search, drawBorders, drawLand, drawOutline, ocean };
})();
