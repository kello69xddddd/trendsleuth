/* TrendSleuth · data store.
   Every dataset is a JSON file in web/data/. They load in parallel, and the heavy ones (place borders, chart library)
   load only when they are needed, so the first screen appears fast.
   Opened by double click (file://) browsers block fetch(), so we read the same data from data/offline.js instead. */
(function () {
  'use strict';
  const TS = window.TS = window.TS || {};
  const FILES = { cases: 'cases.json', nino: 'nino.json', drivers: 'drivers.json', trends: 'trends.json', top: 'top_trends.json' };
  const offline = location.protocol === 'file:';

  function script(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = resolve; s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }
  const json = file => fetch('data/' + file).then(r => { if (!r.ok) throw new Error(file + ': HTTP ' + r.status); return r.json(); });

  async function core() {
    if (offline) { await script('data/offline.js'); return window.TS_OFFLINE; }
    const keys = Object.keys(FILES), values = await Promise.all(keys.map(k => json(FILES[k])));
    return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
  }

  let places = null, plotly = null;
  TS.data = {
    offline, script,
    /* country and province borders (1.4 MB): loaded once, in the background */
    places() { return places || (places = offline ? Promise.resolve(window.TS_OFFLINE.places) : json('places.topo.json')); },
    earthURL() { return offline ? window.TS_OFFLINE.earth : 'data/earth.jpg'; },
    bumpURL() { return offline ? window.TS_OFFLINE.bump : 'data/earth_bump.png'; },
    /* the chart library (4.5 MB) is only needed on layer 2 */
    plotly() { return plotly || (plotly = window.Plotly ? Promise.resolve() : script('vendor/plotly.min.js')); }
  };

  const APP = ['vendor/globe.gl.min.js', 'js/engine.js', 'js/insights.js', 'js/geo.js', 'js/map.js', 'js/ui.js', 'js/app.js', 'js/toptrends.js', 'js/demo.js'];
  TS.ready = core().then(d => {
    for (const k of Object.keys(FILES)) TS.data[k] = d[k];
    window.TS_NINO = d.nino; window.TS_DRIVERS = d.drivers;      // read by insights.js
    return Promise.all(APP.map(script));                          // downloaded together, run in this order
  }).then(() => TS.app.init()).catch(err => {
    console.error(err);
    const el = document.getElementById('busy');
    if (el) el.innerHTML = ( '<p class="bootfail"><b>TrendSleuth could not load its data.</b> ' + String(err.message || err).replace(/</g, '&lt;') + '</p>');
  });
})();
