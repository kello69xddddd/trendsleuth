/* TrendSleuth Insights: everything that goes beyond one trend test.
   - rhythms():  which repeating phenomena (El Niño, IOD, NAO, ...) matter at this place
   - spectrum(): scan for ANY repeating rhythm, even one that has no name (periodogram vs. red noise)
   - decades():  the last 10 years against the 10 years before
   - events():   the same phenomenon a decade ago and now
   Uses the validated Evidence Engine (engine.js) for every statistical test. */
(function (root) {
  'use strict';
  const E = root.TSEngine, fin = Number.isFinite;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const nz = a => a.map(v => (v === null || v === undefined) ? NaN : v);
  const mean = a => { let s = 0, n = 0; for (const v of a) if (fin(v)) { s += v; n++; } return n ? s / n : NaN; };

  // ---- library of repeating phenomena -------------------------------------------------
  const NINO_META = {
    'Nino 3.4': { key: 'nino34', label: 'El Niño / La Niña', short: 'El Niño', unit: '°C', period: 'every 2–7 years', home: [0, -145], enso: true,
      desc: 'Every few years the central Pacific Ocean gets warmer (El Niño) or cooler (La Niña). It is the strongest natural rhythm of the world\'s weather.' },
    'Nino 1+2': { key: 'nino12', label: 'Coastal El Niño', short: 'Coastal Niño', unit: '°C', period: 'every 2–7 years', home: [-5, -85], enso: true,
      desc: 'The same El Niño rhythm, measured next to the coast of Ecuador and Peru. It controls heavy rain on that coast.' }
  };
  function library() {
    const N = root.TS_NINO, D = root.TS_DRIVERS, lib = [];
    for (const [name, m] of Object.entries(NINO_META)) lib.push(Object.assign({ name, series: nz(N[m.key]), slow: false, last: N.last, source: 'NOAA PSL (ERSST v6)' }, m));
    if (D) for (const d of D.list) lib.push({ name: d.label, key: d.key, label: d.label, short: d.short, unit: 'SD', period: d.period, home: d.home, desc: d.desc, slow: d.slow, last: d.last, source: d.source, url: d.url, series: nz(d.z) });
    return lib;
  }
  const LIB = library(), BY_NAME = Object.fromEntries(LIB.map(d => [d.name, d]));
  function slice(d, startYear, n) { const off = (startYear - 1981) * 12; return Array.from({ length: n }, (_, i) => { const v = d.series[off + i]; return v === undefined ? NaN : v; }); }
  function drivers(startYear, n, slow) { const o = {}; LIB.filter(d => !!d.slow === !!slow).forEach(d => { o[d.name] = slice(d, startYear, n); }); return o; }
  const nRemovable = LIB.filter(d => !d.slow).length;

  /* Full analysis of a monthly series against every repeating phenomenon in the library. */
  function analyze(y, opts) {
    const n = y.length, sy = opts.startYear || 1981;
    return E.analyze(y, Object.assign({}, opts, { drivers: drivers(sy, n, false), alphaDriver: 0.05 / nRemovable }));
  }
  /* Ranking of the phenomena for one place. c = result of analyze() (or any engine case). */
  function rhythms(y, startYear, c) {
    const n = y.length, out = [];
    let full = c;
    if (!c || !c.enso || !c.enso.alternatives || c.enso.alternatives.length < nRemovable - 1) full = analyze(y, { startYear });
    if (full && full.enso) {
      const e = full.enso;
      out.push({ name: e.index, share: e.variance_share, p: e.coef_p, peak_month: e.peak_month, sens: e.peak_sensitivity, lag: e.lag_months });
      (e.alternatives || []).forEach(a => out.push({ name: a.index, share: a.variance_share, p: a.p, peak_month: a.peak_month, sens: a.peak_sensitivity }));
    }
    const slowC = E.analyze(y, { startYear, drivers: drivers(startYear, n, true) });
    if (slowC && slowC.enso) { const e = slowC.enso; out.push({ name: e.index, share: e.variance_share, p: e.coef_p, peak_month: e.peak_month, sens: e.peak_sensitivity, slow: true }); }
    out.forEach(r => { r.meta = BY_NAME[r.name]; r.significant = r.p < 0.05 / nRemovable && r.share >= 0.10; });
    out.sort((a, b) => b.share - a.share);
    return { list: out, seasons: full && full.precheck ? full.precheck.seasonality_share : NaN, tested: out.length };
  }

  /* Periodogram of the de-seasonalised, de-trended series against an AR(1) "red noise" background.
     A value above 1 means the rhythm is stronger than 95% of what noise with the same memory would give. */
  function spectrum(anom) {
    const n = anom.length; let sx = 0, sy = 0, sxx = 0, sxy = 0, c = 0;
    for (let i = 0; i < n; i++) if (fin(anom[i])) { sx += i; sy += anom[i]; sxx += i * i; sxy += i * anom[i]; c++; }
    if (c < 120) return null;
    const b = (c * sxy - sx * sy) / (c * sxx - sx * sx), a = (sy - b * sx) / c;
    const x = anom.map((v, i) => fin(v) ? v - (a + b * i) : 0);
    let v = 0; for (const u of x) v += u * u; v /= n; if (!(v > 0)) return null;
    const r = Math.max(0, Math.min(0.95, E.ar1(x))), per = [], raw = [];
    for (let k = 2; k <= Math.floor(n / 2); k++) {
      const years = n / k / 12; if (years < 1.2 || years > n / 12 / 2.5) continue;
      let re = 0, im = 0; const w = 2 * Math.PI * k / n;
      for (let i = 0; i < n; i++) { re += x[i] * Math.cos(w * i); im -= x[i] * Math.sin(w * i); }
      const pw = (re * re + im * im) / (n * v), red = (1 - r * r) / (1 + r * r - 2 * r * Math.cos(w));
      per.push(years); raw.push(pw / red);
    }
    // 95% level for the WHOLE scan (many periods are tested at once), not for one period
    const thr = -Math.log(1 - Math.pow(0.95, 1 / Math.max(per.length, 1))), ratio = raw.map(q => q / thr);
    const peaks = [];
    for (let i = 1; i < per.length - 1; i++) if (ratio[i] > 1.0 && ratio[i] >= ratio[i - 1] && ratio[i] >= ratio[i + 1]) peaks.push({ years: per[i], ratio: ratio[i] });
    peaks.sort((p, q) => q.ratio - p.ratio);
    return { period: per, ratio, peaks: peaks.slice(0, 2), memory: r };
  }

  /* The last 10 years against the 10 years before (same calendar months in both blocks). */
  function decades(y, startYear) {
    const n = y.length; if (n < 240) return null;
    const lab = i => { const t = startYear * 12 + i; return MON[t % 12] + ' ' + Math.floor(t / 12); };
    const block = from => {
      const clim = new Array(12).fill(0), cnt = new Array(12).fill(0), yrs = [];
      for (let k = 0; k < 10; k++) yrs.push(mean(y.slice(from + 12 * k, from + 12 * k + 12)));
      for (let i = from; i < from + 120; i++) if (fin(y[i])) { const g = (i + 0) % 12; clim[g] += y[i]; cnt[g]++; }
      return { label: lab(from) + ' – ' + lab(from + 119), short: Math.floor((startYear * 12 + from) / 12) + '–' + Math.floor((startYear * 12 + from + 119) / 12),
        mean: mean(y.slice(from, from + 120)), clim: clim.map((s, g) => cnt[g] ? s / cnt[g] : NaN), years: yrs.filter(fin) };
    };
    const A = block(n - 240), B = block(n - 120), va = variance(A.years), vb = variance(B.years), na = A.years.length, nb = B.years.length;
    const se = Math.sqrt(va / na + vb / nb), t = se > 0 ? (B.mean - A.mean) / se : 0;
    const df = se > 0 ? Math.pow(va / na + vb / nb, 2) / (Math.pow(va / na, 2) / (na - 1) + Math.pow(vb / nb, 2) / (nb - 1)) : 1;
    // calendar order: rotate so that index 0 = January
    const rot = startYear * 12 % 12; // series always starts in January, so rot = 0
    return { then: A, now: B, diff: B.mean - A.mean, pct: A.mean ? 100 * (B.mean - A.mean) / Math.abs(A.mean) : NaN, p: E.tTwoSidedP(t, Math.max(df, 1)), rot };
  }
  function variance(a) { const m = mean(a); let s = 0; for (const v of a) s += (v - m) * (v - m); return a.length > 1 ? s / (a.length - 1) : 0; }

  /* The same phenomenon about a decade ago and now: how did this place respond each time? */
  function events(y, startYear, name) {
    const d = BY_NAME[name]; if (!d) return null;
    const n = y.length, idx = slice(d, startYear, n), an = E.anomalies(y), anom = an.anom, clim = an.clim;
    const sm = idx.map((_, i) => mean([idx[i - 1], idx[i], idx[i + 1]].filter(fin)));
    let last = n - 1; while (last > 0 && !(fin(sm[last]) && fin(anom[last]))) last--;
    const argmax = (lo, hi, sign) => { let b = -1; for (let i = Math.max(lo, 3); i <= Math.min(hi, last); i++) if (fin(sm[i]) && (b < 0 || (sign ? sign * sm[i] > sign * sm[b] : Math.abs(sm[i]) > Math.abs(sm[b])))) b = i; return b; };
    const iNow = argmax(last - 29, last, 0); if (iNow < 0 || Math.abs(sm[iNow]) < 0.8) return { none: true, meta: d };
    const sign = Math.sign(sm[iNow]);
    let iThen = argmax(iNow - 156, iNow - 84, sign), decadeApart = true;
    if (iThen < 0 || sign * sm[iThen] < 0.8) { iThen = argmax(0, iNow - 60, sign); decadeApart = false; }
    if (iThen < 0 || sign * sm[iThen] < 0.8) return { none: true, meta: d };
    const sum = i => {
      const a = [], x = [], cl = []; const lo = Math.max(i - 3, 0), hi = Math.min(i + 3, last);
      for (let k = lo; k <= hi; k++) if (fin(anom[k])) { a.push(anom[k]); cl.push(clim[k % 12]); if (fin(idx[k])) x.push(idx[k]); }
      const y0 = Math.floor((startYear * 12 + lo) / 12), y1 = Math.floor((startYear * 12 + hi) / 12), ma = mean(a), mc = mean(cl), mx = mean(x);
      return { years: y0 === y1 ? String(y0) : y0 + '–' + String(y1).slice(2), peak: sm[i], peak_date: MON[(startYear * 12 + i) % 12] + ' ' + Math.floor((startYear * 12 + i) / 12),
        anom: ma, pct: mc ? 100 * ma / Math.abs(mc) : NaN, index_mean: mx, per_unit: mx ? ma / mx : NaN, months: a.length, ongoing: hi === last && i + 3 > last };
    };
    const phase = d.enso ? (sign > 0 ? 'El Niño' : 'La Niña') : d.short + (sign > 0 ? ' positive phase' : ' negative phase');
    return { meta: d, phase, sign, decadeApart, then: sum(iThen), now: sum(iNow) };
  }

  /* Latest state of each phenomenon, for the globe. */
  function status() {
    return LIB.map(d => {
      let i = d.series.length - 1; while (i > 0 && !fin(d.series[i])) i--;
      const v = d.series[i], a = Math.abs(v), size = a >= 1.5 ? 'strong' : a >= 1 ? 'moderate' : a >= 0.5 ? 'weak' : 'neutral';
      const word = size === 'neutral' ? 'Neutral' : d.enso ? (size[0].toUpperCase() + size.slice(1) + (v > 0 ? ' El Niño' : ' La Niña')) : (size[0].toUpperCase() + size.slice(1) + (v > 0 ? ' positive phase' : ' negative phase'));
      return { d, value: v, date: MON[i % 12] + ' ' + (1981 + Math.floor(i / 12)), word, size };
    });
  }

  root.TSInsights = { LIB, BY_NAME, analyze, rhythms, spectrum, decades, events, status, slice, nRemovable };
})(typeof window !== 'undefined' ? window : globalThis);
