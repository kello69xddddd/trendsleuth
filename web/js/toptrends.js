/* TrendSleuth · Top trends.
   The strongest confirmed changes on Earth, found automatically by scripts/build_web_data.py (data/top_trends.json):
   for each variable, the country or province with the fastest confirmed rise and the fastest confirmed fall.
   If no large land region qualifies, a smaller one is used ("small region"), and then an open-sea block ("open sea").
   A card is a lead, not a verdict: tapping it runs the full test for that place. */
(function () {
  'use strict';
  const TS = window.TS;
  const ARROW = { up: '<path d="M6 17L17 6M9 6h8v8"/>', down: '<path d="M6 7l11 11M9 18h8v-8"/>' };

  const SHORT = { 'Democratic Republic of the Congo': 'DR Congo', 'United Republic of Tanzania': 'Tanzania', 'United States of America': 'USA' };
  const TIER = { small: 'small area', sea: 'open sea' };

  function cell(t, A) {
    if (!t) return '<div class="tt none">No confirmed region</div>';
    const c = SHORT[t.country] || t.country, where = t.tier === 'sea' ? t.name : t.name === t.country ? c : `${t.name}, ${c}`, tier = TIER[t.tier] ? ` · ${TIER[t.tier]}` : '';
    const rate = t.pct !== null && t.pct !== undefined ? A.pctS(t.pct) : `${A.fmt(t.slope)} ${t.units === '%' ? 'points' : t.units}`;
    return `<button class="tt ${t.dir}" data-lat="${t.lat}" data-lon="${t.lon}" data-v="${t.var}" aria-label="${A.esc(A.VARS[t.var].label)}, ${t.dir === 'up' ? 'rising' : 'falling'} in ${A.esc(where)}, ${rate} per decade. Run the full test.">` +
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ARROW[t.dir]}</svg>` +
      `<span title="${A.esc(where + tier)}"><b>${rate}</b><small>${A.esc(where + tier)}</small></span></button>`;
  }
  function render() {
    const A = TS.app, list = TS.data.top.list, cur = A.state.v;
    A.$('ttNote').innerHTML = 'These are leads, not conclusions. Tap one to run the full test there.';
    A.$('ttList').innerHTML = '<div class="tthead" aria-hidden="true"><span>Share of the map</span><span>Rising fastest</span><span>Falling fastest</span></div>' + Object.keys(A.VARS).map(k => {
      const V = A.VARS[k], by = d => list.find(t => t.var === k && t.dir === d), sh = TS.data.trends.vars[k].share, pc = x => (x > 0 && x < 0.005 ? '<1' : Math.round(x * 100)) + '%';
      return `<div class="ttrow${k === cur ? ' cur' : ''}"><button class="ttvar" data-v="${k}" aria-label="Show ${A.esc(V.label)} on the map. Rising on ${pc(sh.up)} of the map, falling on ${pc(sh.down)}.">${V.icon}<span><b>${V.label}</b><small title="Share of the map with a confirmed rise and a confirmed fall"><em class="u">▲ ${pc(sh.up)}</em><em class="d">▼ ${pc(sh.down)}</em></small></span></button>${cell(by('up'), A)}${cell(by('down'), A)}</div>`;
    }).join('');
    A.$('ttList').querySelectorAll('.ttvar').forEach(b => b.onclick = () => A.setVar(b.dataset.v));
    A.$('ttList').querySelectorAll('.tt[data-lat]').forEach(b => {
      const go = () => { A.setVar(b.dataset.v, true); A.investigate(+b.dataset.lat, +b.dataset.lon); };
      b.onclick = go;
      b.onmouseenter = b.onfocus = () => { if (!A.state.demo) TS.map.look(+b.dataset.lat * 0.85, +b.dataset.lon, 1.7, 700); };
    });
  }
  TS.top = { render };
})();
