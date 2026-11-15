/* TrendSleuth · the map.
   A 3D globe (globe.gl) with the NASA Blue Marble image in quiet colours: the sea is dark and the land is lighter and
   less vivid, so the trend colours are easy to read and you can still tell continents from sea.
   When a variable is chosen, only the confirmed trends are painted on top:
     green = confirmed upward trend · red = confirmed downward trend · no colour = trend not confirmed.
   The colour is stronger where the change is faster and fainter where it is slow (data/trends.json, "mag" 1..9).
   Speed: the satellite image, the trend colours and the borders are separate layers on the graphics card.
   Changing the variable only redraws the small trend layer, so it takes a few milliseconds. A flat map is used when WebGL is not available (?flat=1). */
(function () {
  'use strict';
  const TS = window.TS;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const UP = [52, 211, 120], DOWN = [255, 84, 64];             // green, red (see --shade-u / --shade-d in the CSS)
  const alpha = m => Math.round(255 * (0.16 + 0.07 * m));     // mag 1 -> 0.23 (faint) ... mag 9 -> 0.79 (strong): on an even base map this is the only thing that changes the colour
  const ALT_MIN = 0.22, ALT_MAX = 4.2;
  const OW = 1440, OH = 720;                                   // trend layer: the data grid is 288 x 180, so this is plenty
  let W = 4096, H = 2048, K = 1;                              // K: altitude scale, so the globe always fits the free part of the stage
  const M = { inset: [0, 0], moved: false, layers: null, kind: null, globe: null, el: null, img: null, base: null, borders: null, cv: document.createElement('canvas'), small: document.createElement('canvas'), key: null, sel: null, outline: null, ready: false, onPick: null };

  function webglOK() { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } }

  /* The base map: two flat, calm tones (sea and land) with only a little of the satellite image on top for texture.
     Why flat: on a photo, snow and deserts are white and the sea is almost black, so the trend colour would look
     strong or weak because of the ground below. On an even base, the strength of the colour shows only the trend. */
  const SEA_TONE = '#1D3C69', LAND_TONE = '#4E5A66', TEXTURE = 0.3;
  function makeBase(img) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = SEA_TONE; x.fillRect(0, 0, W, H);
    if (!img) return c;
    x.imageSmoothingQuality = 'high'; x.globalAlpha = TEXTURE; x.filter = 'saturate(.6)'; x.drawImage(img, 0, 0, W, H); x.filter = 'none'; x.globalAlpha = 1;
    if (TS.geo.loaded()) {
      const l = document.createElement('canvas'); l.width = W; l.height = H; const lx = l.getContext('2d');
      lx.filter = 'blur(' + (W / 2048).toFixed(1) + 'px)'; TS.geo.drawLand(lx, W, H); lx.filter = 'none';   // soft coast, no hard cut
      lx.globalCompositeOperation = 'source-in'; lx.fillStyle = LAND_TONE; lx.fillRect(0, 0, W, H);
      lx.globalCompositeOperation = 'source-atop'; lx.globalAlpha = TEXTURE; lx.filter = 'saturate(.35)'; lx.imageSmoothingQuality = 'high'; lx.drawImage(img, 0, 0, W, H);
      x.drawImage(l, 0, 0);
    }
    return c;
  }
  /* Country borders, drawn once on their own layer when the place data arrives. */
  function makeBorders() {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    return TS.geo.drawBorders(c.getContext('2d'), W, H) ? c : null;
  }
  /* The confirmed trends of the chosen variable, drawn on any canvas of size w x h. */
  function drawTrend(x, w, h) {
    const T = TS.data.trends, g = T.grid, v = M.key && T.vars[M.key]; if (!v) return;
    // one pixel per grid cell, then stretched with smoothing: soft edges instead of squares
    const s = M.small; s.width = g.nlon; s.height = g.nlat; const sx = s.getContext('2d'), im = sx.createImageData(g.nlon, g.nlat), d = im.data, cls = v.cls, mag = v.mag;
    for (let i = 0; i < g.nlat; i++) for (let j = 0; j < g.nlon; j++) {
      const k = i * g.nlon + j, c = cls[k]; if (c !== 'u' && c !== 'd') continue;
      const col = c === 'u' ? UP : DOWN, o = ((g.nlat - 1 - i) * g.nlon + j) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = alpha(mag ? +mag[k] || 1 : 5);
    }
    sx.putImageData(im, 0, 0);
    const x0 = (g.lon0 - g.dlon / 2 + 180) / 360 * w, y0 = (90 - (g.lat0 + (g.nlat - 0.5) * g.dlat)) / 180 * h, dw = g.nlon * g.dlon / 360 * w, dh = g.nlat * g.dlat / 180 * h;
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(s, x0, y0, dw, dh); x.drawImage(s, x0 + w, y0, dw, dh);
  }
  function drawLines(x) { if (M.borders) x.drawImage(M.borders, 0, 0); if (M.outline) TS.geo.drawOutline(x, M.outline, W, H); }

  /* 3D: the satellite image, the trend colours and the lines are three separate layers on the graphics card.
     Changing the variable only updates the small trend layer, so it is instant on any computer.
     what = 'trend' | 'lines' | undefined (everything). */
  function paint(what) {
    if (M.layers) {
      const L = M.layers;
      if (!what) { const mat = M.globe.globeMaterial(); mat.map.image = M.base; mat.map.needsUpdate = true; }
      if (!what || what === 'trend') { const x = L.trend.cv.getContext('2d'); x.clearRect(0, 0, OW, OH); drawTrend(x, OW, OH); L.trend.tex.needsUpdate = true; }
      if (!what || what === 'lines') { const c = L.lines.cv; if (c.width !== W) { c.width = W; c.height = H; } const x = c.getContext('2d'); x.clearRect(0, 0, W, H); drawLines(x); L.lines.tex.needsUpdate = true; }
      return;
    }
    // flat map, or a browser where the layers could not be made: one picture with everything
    const cv = M.cv, x = cv.getContext('2d');
    if (cv.width !== W) { cv.width = W; cv.height = H; }
    x.globalAlpha = 1; x.drawImage(M.base, 0, 0); drawTrend(x, W, H); drawLines(x);
    push();
  }
  function push() {
    if (M.kind === '3d') { const mat = M.globe.globeMaterial(); if (mat && mat.map) { mat.map.image = M.cv; mat.map.needsUpdate = true; } }
    else if (M.kind === '2d') { const c = M.globe.querySelector('canvas'); c.width = 2048; c.height = 1024; c.getContext('2d').drawImage(M.cv, 0, 0, 2048, 1024); }
  }
  /* Two transparent spheres just above the globe: trend colours, then borders and the outline of the chosen place. */
  function makeLayers() {
    try {
      const g = M.globe, mat = g.globeMaterial(), aniso = g.renderer().capabilities.getMaxAnisotropy(); let mesh = null;
      g.scene().traverse(o => { if (o.isMesh && o.material === mat) mesh = o; });
      if (!mesh || !mat.map) return;
      const layer = (w, h, scale, order) => {
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const tex = new mat.map.constructor(cv); tex.colorSpace = mat.map.colorSpace; tex.anisotropy = aniso; tex.needsUpdate = true;
        // depthTest off: the layers sit on the globe and are always in front of it, so they can never flicker against it
        const m = new mat.constructor({ map: tex, transparent: true, depthWrite: false, depthTest: false, shininess: 0 });
        const o = new mesh.constructor(mesh.geometry, m); o.scale.setScalar(scale); o.renderOrder = order; mesh.add(o);
        return { cv, tex };
      };
      M.layers = { trend: layer(OW, OH, 1.001, 1), lines: layer(W, H, 1.002, 2) };
    } catch (e) { M.layers = null; console.warn('Map layers are not available, using one picture:', e.message); }
  }
  function marker() {
    const list = [];
    if (M.sel) { const b = document.createElement('div'); b.className = 'pin sel'; list.push({ lat: M.sel[0], lng: M.sel[1], el: b }); }
    if (M.kind === '3d') { M.globe.htmlElementsData(list); M.globe.ringsData(M.sel && !REDUCED ? [{ lat: M.sel[0], lng: M.sel[1] }] : []); }
    else if (M.kind === '2d') { M.globe.querySelectorAll('.pin').forEach(e => e.remove()); list.forEach(m => { m.el.style.left = (m.lng + 180) / 360 * 100 + '%'; m.el.style.top = (90 - m.lat) / 180 * 100 + '%'; M.globe.appendChild(m.el); }); }
  }
  /* Sharp texture at any angle and distance. */
  function sharpen() {
    try {
      const mat = M.globe.globeMaterial(), r = M.globe.renderer();
      if (mat && mat.map && r) { mat.map.anisotropy = r.capabilities.getMaxAnisotropy(); mat.map.needsUpdate = true; }
      if (mat) { mat.bumpScale = 5; mat.shininess = 4; }
    } catch (e) { /* the default filtering is used */ }
  }

  /* The globe fills the whole stage, behind the cards of steps 1 and 2. Its centre is moved to the middle of the
     free area (below the cards, above the legend) and its size is fitted to that area. */
  function fit() {
    if (M.kind !== '3d') return;
    const g = M.globe, h = M.el.clientHeight, w = M.el.clientWidth, [top, bottom] = M.inset;
    g.width(w); g.height(h);
    const free = Math.max(140, h - top - bottom), size = Math.min(free, w * 0.94), t = 0.4663 * 0.9 * size / h, alt = 1 / Math.sin(Math.atan(t)) - 1;
    K = alt / 1.7; g.globeOffset([0, (top - bottom) / 2]);
    if (!M.moved) g.pointOfView({ lat: 5, lng: -95, altitude: alt });
  }
  function init(el, onPick) {
    M.el = el; M.onPick = onPick; M.base = makeBase(null);
    try {
      if (!webglOK() || !window.Globe || new URLSearchParams(location.search).get('flat')) throw new Error('no webgl');
      const g = new window.Globe(el, { animateIn: false, waitForGlobeReady: true, rendererConfig: { antialias: true, alpha: true, powerPreference: 'high-performance' } });
      g.backgroundColor('rgba(0,0,0,0)').showAtmosphere(true).atmosphereColor('#5AA8FF').atmosphereAltitude(0.2)
        .htmlElementsData([]).htmlLat('lat').htmlLng('lng').htmlAltitude(0.012).htmlElement(d => d.el)
        .ringsData([]).ringLat('lat').ringLng('lng').ringColor(() => t => `rgba(255,255,255,${1 - t})`).ringMaxRadius(5).ringPropagationSpeed(2.2).ringRepeatPeriod(1100)
        .onGlobeClick(({ lat, lng }) => M.onPick(lat, lng));
      if (g.htmlElementVisibilityModifier) g.htmlElementVisibilityModifier((e, vis) => { e.style.opacity = vis ? 1 : 0; });
      const c = g.controls(); c.autoRotate = !REDUCED; c.autoRotateSpeed = 0.4; c.minDistance = 100 * (1 + ALT_MIN); c.maxDistance = 100 * (1 + ALT_MAX * 2); c.enablePan = false; c.zoomSpeed = 1.1;
      el.addEventListener('pointerdown', () => { c.autoRotate = false; });
      el.addEventListener('wheel', () => { c.autoRotate = false; }, { passive: true });
      M.kind = '3d'; M.globe = g;
      new ResizeObserver(fit).observe(el); fit();
      g.onGlobeReady(() => { M.ready = true; sharpen(); makeLayers(); paint(); });
      g.globeImageUrl(TS.data.earthURL());
      if (TS.data.bumpURL()) g.bumpImageUrl(TS.data.bumpURL());
    } catch (e) {
      M.kind = '2d'; el.innerHTML = '<div class="flat"><div class="map"><canvas></canvas></div></div>';
      const map = el.querySelector('.map');
      map.querySelector('canvas').addEventListener('click', ev => { const r = ev.currentTarget.getBoundingClientRect(); M.onPick(90 - (ev.clientY - r.top) / r.height * 180, (ev.clientX - r.left) / r.width * 360 - 180); });
      M.globe = map; M.ready = true; const z = document.querySelector('.zoom'); if (z) z.hidden = true;   // the flat map has no zoom
    }
    const img = new Image();
    img.onload = () => {
      let max = 4096; try { if (M.kind === '3d') max = Math.min(8192, M.globe.renderer().capabilities.maxTextureSize); } catch (e) { /* keep 4096 */ }
      W = Math.max(2048, Math.min(max, img.naturalWidth)); H = W / 2;
      M.img = img; M.base = makeBase(img); if (TS.geo.loaded()) M.borders = makeBorders(); if (M.ready) paint();
    };
    img.src = TS.data.earthURL();
    TS.geo.ready().then(db => { if (db) { M.borders = makeBorders(); if (M.img) M.base = makeBase(M.img); if (M.ready) paint(); } });
    if (M.ready) paint();
  }
  function zoom(f) {
    if (M.kind !== '3d') return;
    const p = M.globe.pointOfView(); M.globe.controls().autoRotate = false; M.moved = true;
    M.globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: Math.max(ALT_MIN, Math.min(ALT_MAX, p.altitude * f)) }, REDUCED ? 0 : 350);
  }

  TS.map = {
    init, zoom,
    /* pixels covered by the cards at the top and by the legend at the bottom of the stage */
    inset(top, bottom) { M.inset = [top, bottom]; M.el.style.setProperty('--top', top + 'px'); fit(); },
    get kind() { return M.kind; },
    get layered() { return !!M.layers; },
    get globe() { return M.globe; },
    /* paint the confirmed trends of this variable */
    setVar(key) { if (M.key === key) return; M.key = key; if (M.ready) paint('trend'); },
    /* move to a place and mark it */
    select(lat, lon, alt) {
      M.sel = [lat, lon];
      if (M.kind === '3d') { M.globe.controls().autoRotate = false; M.moved = true; M.globe.pointOfView({ lat: lat * 0.85, lng: lon, altitude: (alt || 1.5) * K }, REDUCED ? 0 : 900); }
      marker();
    },
    /* feature = province or country polygon to outline (optional) */
    outline(feature) { if (M.outline === feature) return; M.outline = feature || null; if (M.ready) paint('lines'); },
    look(lat, lon, alt, ms) { if (M.kind === '3d') { M.globe.controls().autoRotate = false; M.moved = true; M.globe.pointOfView({ lat, lng: lon, altitude: (alt || 1.9) * K }, REDUCED ? 0 : (ms || 1200)); } },
    spin(on) { if (M.kind === '3d') M.globe.controls().autoRotate = on && !REDUCED; }
  };
})();
