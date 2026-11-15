/* TrendSleuth Evidence Engine - JavaScript port of trendsleuth/engine.py.
   Same statistics, same rules; cross-checked against the Python reference (tests/test_js_parity.py).
   Works in the browser (window.TSEngine) and in Node (module.exports). */
(function (root) {
  'use strict';
  const fin = Number.isFinite;

  // ---------- special functions ----------
  function gammaln(x) {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t);
    let s = 1.000000000190015;
    for (let j = 0; j < 6; j++) s += c[j] / ++y;
    return -t + Math.log(2.5066282746310005 * s / x);
  }
  function betacf(a, b, x) {
    const FPMIN = 1e-300; let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-14) break;
    }
    return h;
  }
  function betai(a, b, x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function gammp(a, x) {
    if (x <= 0) return 0;
    if (x < a + 1) { let ap = a, sum = 1 / a, del = sum; for (let n = 0; n < 500; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 3e-14) break; } return sum * Math.exp(-x + a * Math.log(x) - gammaln(a)); }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-14) break; }
    return 1 - Math.exp(-x + a * Math.log(x) - gammaln(a)) * h;
  }
  const normCdf = z => 0.5 * (1 + erf(z / Math.SQRT2));
  function erf(x) { const s = x < 0 ? -1 : 1; x = Math.abs(x); return s * gammp(0.5, x * x); }
  const pFromZ = z => 2 * (1 - normCdf(Math.abs(z)));
  const tTwoSidedP = (t, df) => betai(df / 2, 0.5, df / (df + t * t));
  function tCrit975(df) { let lo = 0, hi = 1000; for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (tTwoSidedP(mid, df) > 0.05) lo = mid; else hi = mid; } return (lo + hi) / 2; }
  const fSf = (f, d1, d2) => f <= 0 ? 1 : betai(d2 / 2, d1 / 2, d2 / (d2 + d1 * f));
  const chi2Sf = (x, k) => 1 - gammp(k / 2, x / 2);
  const Z95 = 1.959963984540054;

  // ---------- helpers ----------
  const mean = a => { let s = 0, n = 0; for (const v of a) if (fin(v)) { s += v; n++; } return n ? s / n : NaN; };
  const variance = a => { const m = mean(a); let s = 0, n = 0; for (const v of a) if (fin(v)) { s += (v - m) * (v - m); n++; } return n ? s / n : NaN; };
  function median(sorted) { const n = sorted.length; return n % 2 ? sorted[(n - 1) / 2] : 0.5 * (sorted[n / 2 - 1] + sorted[n / 2]); }
  const pyRound = x => { const r = Math.round(x); return (Math.abs(x % 1) === 0.5 && r % 2 !== 0) ? r - 1 : r; };
  function asMatrix(y, startMonth) {
    const lead = startMonth - 1, n = lead + y.length, ny = Math.ceil(n / 12), m = [];
    for (let i = 0; i < ny; i++) { const row = new Array(12).fill(NaN); m.push(row); }
    for (let i = 0; i < y.length; i++) { const k = lead + i; m[Math.floor(k / 12)][k % 12] = y[i]; }
    return m;
  }
  function anomalies(y, startMonth = 1) {
    const clim = new Array(12).fill(0), cnt = new Array(12).fill(0);
    y.forEach((v, i) => { if (fin(v)) { const g = (i + startMonth - 1) % 12; clim[g] += v; cnt[g]++; } });
    for (let g = 0; g < 12; g++) clim[g] = cnt[g] ? clim[g] / cnt[g] : NaN;
    return { anom: y.map((v, i) => fin(v) ? v - clim[(i + startMonth - 1) % 12] : NaN), clim };
  }
  function mkSVar(col) {
    const x = col.filter(fin), n = x.length;
    if (n < 4) return { s: 0, v: 0, n };
    let s = 0;
    for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) s += Math.sign(x[j] - x[i]);
    const xs = x.slice().sort((a, b) => a - b); let tie = 0, run = 1;
    for (let i = 1; i <= n; i++) { if (i < n && xs[i] === xs[i - 1]) run++; else { if (run > 1) tie += run * (run - 1) * (2 * run + 5); run = 1; } }
    return { s, v: (n * (n - 1) * (2 * n + 5) - tie) / 18, n };
  }
  const zFromS = (s, v) => v <= 0 ? 0 : s > 0 ? (s - 1) / Math.sqrt(v) : s < 0 ? (s + 1) / Math.sqrt(v) : 0;
  function ranksWithMissing(col) {
    const idx = []; col.forEach((v, i) => { if (fin(v)) idx.push(i); });
    const r = new Array(col.length).fill((idx.length + 1) / 2);
    idx.sort((a, b) => col[a] - col[b]);
    let i = 0;
    while (i < idx.length) { let j = i; while (j + 1 < idx.length && col[idx[j + 1]] === col[idx[i]]) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k]] = avg; i = j + 1; }
    return { r, n: idx.length };
  }

  // ---------- layer 1 ----------
  function seasonalMK(y, startMonth = 1, correlated = true) {
    const m = asMatrix(y, startMonth), ny = m.length;
    const S = [], V = [], N = []; const cols = [];
    for (let g = 0; g < 12; g++) { const col = m.map(r => r[g]); cols.push(col); const o = mkSVar(col); S.push(o.s); V.push(o.v); N.push(o.n); }
    const sTot = S.reduce((a, b) => a + b, 0), varInd = V.reduce((a, b) => a + b, 0); let varTot = varInd;
    if (correlated) {
      const ranks = cols.map(c => ranksWithMissing(c).r);
      const npair = ny * (ny - 1) / 2, sgn = cols.map(() => new Int8Array(npair));
      for (let g = 0; g < 12; g++) { let k = 0; for (let i = 0; i < ny - 1; i++) for (let j = i + 1; j < ny; j++) { const d = cols[g][j] - cols[g][i]; sgn[g][k++] = fin(d) ? Math.sign(d) : 0; } }
      let cov = 0;
      for (let g = 0; g < 11; g++) for (let h = g + 1; h < 12; h++) {
        let kk = 0; for (let k = 0; k < npair; k++) kk += sgn[g][k] * sgn[h][k];
        let rr = 0; for (let i = 0; i < ny; i++) rr += ranks[g][i] * ranks[h][i];
        cov += (kk + 4 * rr - ny * (N[g] + 1) * (N[h] + 1)) / 3;
      }
      varTot = varInd + 2 * cov; if (varTot <= 0) varTot = varInd;
    }
    const Z = zFromS(sTot, varTot), Zm = S.map((s, g) => zFromS(s, V[g]));
    return { S: sTot, var: varTot, varInd, Z, p: pFromZ(Z), Zmonth: Zm, pMonth: Zm.map(pFromZ), nMonth: N };
  }
  function seasonalSen(y, startMonth = 1, varS = null) {
    const m = asMatrix(y, startMonth), ny = m.length, all = [], per = new Array(12).fill(NaN);
    for (let g = 0; g < 12; g++) {
      const d = [];
      for (let i = 0; i < ny - 1; i++) for (let j = i + 1; j < ny; j++) { const v = (m[j][g] - m[i][g]) / (j - i); if (fin(v)) d.push(v); }
      if (d.length) { d.sort((a, b) => a - b); per[g] = median(d); for (const v of d) all.push(v); }
    }
    if (!all.length) return { slope: NaN, lo: NaN, hi: NaN, slopeMonth: per };
    all.sort((a, b) => a - b);
    let lo = NaN, hi = NaN;
    if (varS !== null && varS > 0) {
      const c = Z95 * Math.sqrt(varS), np = all.length, m1 = pyRound((np - c) / 2) - 1, m2 = pyRound((np + c) / 2);
      if (m1 >= 0 && m1 < np && m2 >= 0 && m2 < np) { lo = all[m1]; hi = all[m2]; }
    }
    return { slope: median(all), lo, hi, slopeMonth: per };
  }
  function ar1(x) {
    const a = [], b = [];
    for (let i = 0; i < x.length - 1; i++) if (fin(x[i]) && fin(x[i + 1])) { a.push(x[i]); b.push(x[i + 1]); }
    if (a.length < 8) return 0;
    const ma = mean(a), mb = mean(b); let sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
    const den = Math.sqrt(saa * sbb); return den > 0 ? sab / den : 0;
  }
  function invert(A) {
    const n = A.length, M = A.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => i === j ? 1 : 0)));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c];
      for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map(r => r.slice(n));
  }
  function olsAr1(anom, extra = null) {
    const n = anom.length, tbar = (n - 1) / 24, rows = [];
    for (let i = 0; i < n; i++) { const r = [1, i / 12 - tbar]; if (extra) for (const v of extra[i]) r.push(v); rows.push(r); }
    const k = rows[0].length, ok = rows.map((r, i) => fin(anom[i]) && r.every(fin));
    const nobs = ok.filter(Boolean).length; if (nobs < k + 8) return null;
    const XtX = Array.from({ length: k }, () => new Array(k).fill(0)), Xty = new Array(k).fill(0);
    for (let i = 0; i < n; i++) if (ok[i]) for (let a = 0; a < k; a++) { Xty[a] += rows[i][a] * anom[i]; for (let b = 0; b < k; b++) XtX[a][b] += rows[i][a] * rows[i][b]; }
    const inv = invert(XtX), beta = inv.map(r => r.reduce((s, v, j) => s + v * Xty[j], 0));
    const resid = new Array(n).fill(NaN); let sse = 0, sy = 0, cnt = 0;
    for (let i = 0; i < n; i++) if (ok[i]) { resid[i] = anom[i] - rows[i].reduce((s, v, j) => s + v * beta[j], 0); sse += resid[i] ** 2; sy += anom[i]; cnt++; }
    const ybar = sy / cnt; let sst = 0; for (let i = 0; i < n; i++) if (ok[i]) sst += (anom[i] - ybar) ** 2;
    const r1 = Math.max(Math.min(ar1(resid), 0.99), -0.99);
    const neff = r1 > 0 ? Math.max(nobs * (1 - r1) / (1 + r1), k + 2) : nobs;
    const s2 = sse / Math.max(neff - k, 1), dof = Math.max(neff - k, 1), tc = tCrit975(dof);
    const se = inv.map((r, i) => Math.sqrt(r[i] * s2)), t = beta.map((b, i) => b / se[i]);
    return { beta, se, t, p: t.map(v => tTwoSidedP(v, dof)), lo: beta.map((b, i) => b - tc * se[i]), hi: beta.map((b, i) => b + tc * se[i]),
      r1, neff, n: nobs, dof, resid, r2: sst > 0 ? 1 - sse / sst : 0, sigma: Math.sqrt(sse / Math.max(nobs - k, 1)), sse };
  }

  // ---------- layer 3 ----------
  function lagged(x, lag, n) { const out = new Array(n).fill(NaN); for (let i = lag; i < n; i++) { const v = x[i - lag]; out[i] = (v === undefined || v === null) ? NaN : v; } return out; }
  function bestLag(anom, nino, maxLag = 6) {
    const n = anom.length; let sx = 0, sy = 0, sxx = 0, sxy = 0, c = 0;
    for (let i = 0; i < n; i++) if (fin(anom[i])) { sx += i; sy += anom[i]; sxx += i * i; sxy += i * anom[i]; c++; }
    if (c < 36) return { lag: 0, r: 0 };
    const b = (c * sxy - sx * sy) / (c * sxx - sx * sx), a = (sy - b * sx) / c, det = anom.map((v, i) => v - (a + b * i));
    let best = 0, bestR = 0;
    for (let lag = 0; lag <= maxLag; lag++) {
      const x = lagged(nino, lag, n), u = [], w = [];
      for (let i = 0; i < n; i++) if (fin(det[i]) && fin(x[i])) { u.push(det[i]); w.push(x[i]); }
      if (u.length < 36) continue;
      const mu = mean(u), mw = mean(w); let suw = 0, suu = 0, sww = 0;
      for (let i = 0; i < u.length; i++) { suw += (u[i] - mu) * (w[i] - mw); suu += (u[i] - mu) ** 2; sww += (w[i] - mw) ** 2; }
      const r = suw / Math.sqrt(suu * sww);
      if (Math.abs(r) > Math.abs(bestR)) { best = lag; bestR = r; }
    }
    return { lag: best, r: bestR };
  }
  function ensoDesign(nino, lag, n, startMonth) {
    const x = lagged(nino, lag, n);
    return x.map((v, i) => { const m = (i + startMonth - 1) % 12; return [v, v * Math.cos(2 * Math.PI * m / 12), v * Math.sin(2 * Math.PI * m / 12)]; });
  }
  function ensoLayer(anom, ninoIn, n, startMonth, rawTrend, maxLag) {
    const nino = Array.from({ length: n }, (_, i) => { const v = ninoIn[i]; return (v === undefined || v === null) ? NaN : v; });
    const { lag, r } = bestLag(anom, nino, maxLag), X = ensoDesign(nino, lag, n, startMonth), fit = olsAr1(anom, X);
    if (!fit) return null;
    const coefs = fit.beta.slice(2), okx = X.map(row => row.every(fin));
    const contrib = X.map((row, i) => okx[i] ? row[0] * coefs[0] + row[1] * coefs[1] + row[2] * coefs[2] : 0);
    const adj = anom.map((v, i) => v - contrib[i]);
    const mk = seasonalMK(adj, startMonth), sen = seasonalSen(adj, startMonth, mk.var);
    const last = nino.slice(-12), recent = last.some(fin) ? mean(last) : 0;
    const ok = anom.map((v, i) => fin(v) && okx[i]);
    const r0 = olsAr1(anom.map((v, i) => ok[i] ? v : NaN));
    const dof = Math.max(fit.neff - 5, 1), F = Math.max((r0.sse - fit.sse) / 3, 0) / (fit.sse / dof), pEnso = fSf(F, 3, dof);
    const sens = Array.from({ length: 12 }, (_, m) => coefs[0] + coefs[1] * Math.cos(2 * Math.PI * m / 12) + coefs[2] * Math.sin(2 * Math.PI * m / 12));
    let peak = 0; sens.forEach((v, i) => { if (Math.abs(v) > Math.abs(sens[peak])) peak = i; });
    const cOk = contrib.filter((_, i) => ok[i]), aOk = anom.filter((_, i) => ok[i]), va = variance(aOk);
    const adjTr = sen.slope * 10;
    return { summary: { lag_months: lag, r_detrended: r, coefs, sensitivity_by_month: sens, peak_month: peak + 1, peak_sensitivity: sens[peak], coef: sens[peak], coef_p: pEnso,
        variance_share: va > 0 ? variance(cOk) / va : 0, trend_adj_per_decade: adjTr, adj_lo: sen.lo * 10, adj_hi: sen.hi * 10, mk_p_adj: mk.p,
        ols_adj_per_decade: fit.beta[1] * 10, ols_adj_p: fit.p[1], trend_change_share: rawTrend ? Math.abs(rawTrend - adjTr) / Math.abs(rawTrend) : 0,
        nino_last12: recent, end_bias_alert: Math.abs(recent) >= 0.5 && pEnso < 0.05, direction: (sens[peak] > 0 ? 'higher' : 'lower') + ' during El Nino' }, adj, fit };
  }
  function weatherheadYears(slopePerYear, sigma, phi) {
    if (!fin(slopePerYear) || slopePerYear === 0 || sigma <= 0) return Infinity;
    phi = Math.min(Math.max(phi, 0), 0.98);
    return Math.pow((3.3 * sigma / Math.abs(slopePerYear)) * Math.sqrt((1 + phi) / (1 - phi)), 2 / 3);
  }
  function precheck(y, startMonth = 1, minYears = 15, minCoverage = 0.9) {
    const n = y.length, nf = y.filter(fin).length, coverage = n ? nf / n : 0; let gaps = 0, run = 0;
    for (const v of y) { run = fin(v) ? 0 : run + 1; gaps = Math.max(gaps, run); }
    const { anom, clim } = anomalies(y, startMonth), vt = nf > 2 ? variance(y) : 0, seas = vt > 0 ? 1 - variance(anom) / vt : 0, years = n / 12, issues = [];
    if (years < minYears) issues.push(`record is short (${years.toFixed(1)} yr < ${minYears})`);
    if (coverage < minCoverage) issues.push(`coverage ${(coverage * 100).toFixed(0)}% < ${(minCoverage * 100).toFixed(0)}%`);
    if (gaps > 6) issues.push(`gap of ${gaps} consecutive months`);
    if (vt === 0) issues.push('series is constant');
    return { ok: !issues.length, issues, n_months: n, years, coverage, longest_gap: gaps, seasonality_share: Math.max(seas, 0), climatology: clim };
  }
  const g3 = v => fin(v) ? Number(v.toPrecision(3)).toString() : 'n/a';

  function compareSecond(y, start, second, secondStart, driver) {
    const a0 = start[0] * 12 + start[1] - 1, b0 = secondStart[0] * 12 + secondStart[1] - 1;
    let lo = Math.max(a0, b0); const hi = Math.min(a0 + y.length, b0 + second.length);
    lo += ((-lo % 12) + 12) % 12;
    if (hi - lo < 180) return { available: false, reason: 'common period shorter than 15 years' };
    const res = [], raws = [];
    for (const [s, off] of [[y, a0], [second, b0]]) {
      let an = anomalies(s.slice(lo - off, hi - off)).anom; raws.push(an);
      if (driver) {
        const seg = Array.from({ length: an.length }, (_, i) => { const v = driver.series[lo - driver.start + i]; return (v === undefined || v === null) ? NaN : v; });
        const X = ensoDesign(seg, driver.lag, an.length, 1), fit = olsAr1(an, X);
        if (fit) an = an.map((v, i) => X[i].every(fin) ? v - (X[i][0] * fit.beta[2] + X[i][1] * fit.beta[3] + X[i][2] * fit.beta[4]) : v);
      }
      const mk = seasonalMK(an), sl = seasonalSen(an, 1, mk.var);
      res.push({ sen_per_decade: sl.slope * 10, lo: sl.lo * 10, hi: sl.hi * 10, mk_p: mk.p });
    }
    return { available: true, common_start: `${Math.floor(lo / 12)}-${String(lo % 12 + 1).padStart(2, '0')}`, common_years: (hi - lo) / 12, enso_adjusted: !!driver,
      primary: res[0], second: res[1], same_sign: Math.sign(res[0].sen_per_decade) === Math.sign(res[1].sen_per_decade),
      ci_overlap: res[0].lo <= res[1].hi && res[1].lo <= res[0].hi };
  }

  function verdict(c, alpha = 0.05) {
    const d = c.detection, r = c.robustness, e = c.enso, useAdj = !!c.cycle_matters, checks = [];
    const add = (key, passed, text) => checks.push({ key, passed, text });
    const rawSig = d.mk_p < alpha;
    let trend, lo, hi, pMk, pOls, olsTr, tag = '';
    if (useAdj) { trend = e.trend_adj_per_decade; lo = e.adj_lo; hi = e.adj_hi; pMk = e.mk_p_adj; pOls = e.ols_adj_p; olsTr = e.ols_adj_per_decade; tag = ` after removing ${e.index}`; }
    else { trend = d.sen_per_decade; lo = d.sen_lo; hi = d.sen_hi; pMk = d.mk_p; pOls = d.ols_p; olsTr = d.ols_per_decade; }
    const sigMk = pMk < alpha, sigOls = pOls < alpha && Math.sign(olsTr) === Math.sign(trend), ciOk = fin(lo) && (lo > 0 || hi < 0);
    add('mk', sigMk, `Seasonal Mann-Kendall, serial-correlation corrected${tag}: p = ${g3(pMk)}`);
    add('ols', sigOls, `Linear-trend t-test with AR(1)-adjusted errors${tag}: p = ${g3(pOls)}`);
    add('ci', ciOk, `95% confidence interval [${g3(lo)}, ${g3(hi)}] per decade excludes zero`);
    const extra = []; let neutOk = null;
    if (e && useAdj) {
      const nt = e.neutral; neutOk = Math.sign(nt.sen_per_decade) === Math.sign(trend) && nt.mk_p < 0.10;
      add('neutral', neutOk, `Model-free check, neutral months only (${nt.n_months} months): ${g3(nt.sen_per_decade)} per decade, p = ${g3(nt.mk_p)}`); extra.push(neutOk);
    } else if (e) {
      const ok = e.mk_p_adj < alpha && Math.sign(e.trend_adj_per_decade) === Math.sign(d.sen_per_decade);
      add('enso', ok, `Unchanged after removing ${e.index} (p = ${g3(e.mk_p_adj)}; the cycle explains ${(e.variance_share * 100).toFixed(0)}% of the variance)`); extra.push(ok);
    }
    const es = useAdj ? r.end_sensitivity_adj : r.end_sensitivity;
    if (es) { const ok = Math.sign(es.sen_per_decade) === Math.sign(trend) && Math.abs(es.sen_per_decade) >= 0.5 * Math.abs(trend); add('end', ok, `Stable when the last 24 months are removed (${g3(es.sen_per_decade)} per decade)`); extra.push(ok); }
    const sec = r.second; let disputed = false;
    if (sec && sec.available) {
      const ok = sec.same_sign && sec.ci_overlap && sec.second.mk_p < 0.10; disputed = !sec.same_sign;
      add('second', ok, `Independent dataset over ${sec.common_start.slice(0, 4)}-: ${g3(sec.primary.sen_per_decade)} vs ${g3(sec.second.sen_per_decade)} per decade` + (disputed ? ' (opposite sign)' : ok ? ' (confirmed)' : ' (not confirmed)')); extra.push(ok);
    }
    const core = [sigMk, sigOls, ciOk], nCore = core.filter(Boolean).length, nExtra = extra.filter(Boolean).length;
    let level;
    if (nCore === 3 && nExtra === extra.length) level = 'STRONG';
    else if (sigMk && nCore >= 2 && nExtra >= extra.length - 1 && neutOk !== false) level = 'MODERATE';
    else if (sigMk || sigOls || pMk < 0.10) level = 'WEAK';
    else level = 'NOT YET';
    if (disputed && (level === 'STRONG' || level === 'MODERATE')) level = 'WEAK';
    const det = c.detectability; let note = null;
    if ((level === 'NOT YET' || level === 'WEAK') && fin(det.years_needed)) note = `A trend of this size needs about ${det.years_needed.toFixed(0)} years of data to be detected; ${det.years_available.toFixed(0)} are available.`;
    return { level, direction: trend > 0 ? 'increasing' : 'decreasing', trend_per_decade: trend, trend_lo: lo, trend_hi: hi, judged_on: useAdj ? 'cycle-adjusted series' : 'raw anomalies',
      checks, hidden_by_enso: useAdj && !rawSig && sigMk, explained_by_enso: useAdj && rawSig && !sigMk, sources_disagree: disputed, seasonal_conflict: r.homogeneity_p < 0.05, note };
  }

  /* y: monthly values from January of startYear. opts: {drivers: {name: series aligned with y}, second: {series, start:[y,m]} | {grid: {...}}, units, name} */
  function analyze(y, opts = {}) {
    const startYear = opts.startYear || 1981, startMonth = 1, alpha = 0.05, n = y.length, cut = 24;
    const pc = precheck(y, startMonth);
    const ym = k => { const t = startYear * 12 + k; return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, '0')}`; };
    const c = { name: opts.name || '', units: opts.units || '', start: ym(0), end: ym(n - 1), precheck: pc };
    if (!pc.ok) { c.verdict = { level: 'NO VERDICT', reason: pc.issues.join('; '), checks: [] }; return c; }
    const { anom } = anomalies(y, startMonth);
    const smk = seasonalMK(anom, startMonth), sen = seasonalSen(anom, startMonth, smk.var), ols = olsAr1(anom);
    const meanAbs = mean(y.map(Math.abs));
    const d = c.detection = { mk_Z: smk.Z, mk_p: smk.p, mk_p_naive: pFromZ(zFromS(smk.S, smk.varInd)), sen_per_decade: sen.slope * 10, sen_lo: sen.lo * 10, sen_hi: sen.hi * 10,
      ols_per_decade: ols.beta[1] * 10, ols_lo: ols.lo[1] * 10, ols_hi: ols.hi[1] * 10, ols_p: ols.p[1], ar1: ols.r1, n_eff: ols.neff,
      pct_per_decade: meanAbs > 0 ? sen.slope * 10 / meanAbs * 100 : null, total_change: sen.slope * n / 12 };
    const zbar = smk.Zmonth.reduce((a, b) => a + b, 0) / 12, homChi2 = smk.Zmonth.reduce((a, z) => a + z * z, 0) - 12 * zbar * zbar;
    const rob = c.robustness = { homogeneity_chi2: homChi2, homogeneity_p: chi2Sf(homChi2, 11),
      months: smk.Zmonth.map((z, g) => ({ month: g + 1, sen_per_decade: sen.slopeMonth[g] * 10, Z: z, p: smk.pMonth[g] })), end_sensitivity: null };
    if (n > 180 + cut) { const a2 = anom.slice(0, n - cut), s2 = seasonalMK(a2, startMonth), sl2 = seasonalSen(a2, startMonth); rob.end_sensitivity = { months_removed: cut, sen_per_decade: sl2.slope * 10, mk_p: s2.p }; }
    let enso = null, adjusted = anom, ensoFit = null;
    if (opts.drivers) {
      const tried = [];
      for (const [label, series] of Object.entries(opts.drivers)) { const res = ensoLayer(anom, series, n, startMonth, d.sen_per_decade, 6); if (res) { res.summary.index = label; tried.push(res); } }
      if (tried.length) {
        tried.sort((a, b) => b.summary.variance_share - a.summary.variance_share);
        enso = tried[0].summary; adjusted = tried[0].adj; ensoFit = tried[0].fit;
        enso.alternatives = tried.slice(1).map(t => ({ index: t.summary.index, variance_share: t.summary.variance_share, p: t.summary.coef_p, peak_month: t.summary.peak_month, peak_sensitivity: t.summary.peak_sensitivity }));
      }
    }
    c.enso = enso;
    const useAdj = c.cycle_matters = !!(enso && enso.coef_p < (opts.alphaDriver || alpha) && enso.variance_share >= 0.10); // alphaDriver: Bonferroni level when many rhythms are screened
    if (enso) {
      const idx = opts.drivers[enso.index], lg = lagged(Array.from({ length: n }, (_, i) => idx[i]), enso.lag_months, n);
      const neut = anom.map((v, i) => Math.abs(lg[i]) < 0.5 ? v : NaN), mkn = seasonalMK(neut, startMonth), sln = seasonalSen(neut, startMonth, mkn.var);
      enso.neutral = { n_months: neut.filter(fin).length, sen_per_decade: sln.slope * 10, lo: sln.lo * 10, hi: sln.hi * 10, mk_p: mkn.p };
      if (useAdj && n > 180 + cut) { const a4 = adjusted.slice(0, n - cut), s4 = seasonalMK(a4, startMonth), sl4 = seasonalSen(a4, startMonth); rob.end_sensitivity_adj = { months_removed: cut, sen_per_decade: sl4.slope * 10, mk_p: s4.p }; }
    }
    if (opts.second && opts.second.series) {
      const drv = useAdj ? { series: opts.drivers[enso.index], start: startYear * 12, lag: enso.lag_months } : null;
      rob.second = compareSecond(y, [startYear, 1], opts.second.series, opts.second.start, drv);
    } else if (opts.second && opts.second.grid) {
      // pre-computed IMERG cell (1998-2025): compare with this series over the same window
      const g = opts.second.grid, i0 = (1998 - startYear) * 12, i1 = (2026 - startYear) * 12;
      if (i0 >= 0 && n >= i1 && fin(g.sen)) {
        const seg = (useAdj ? adjusted : anom).slice(i0, i1), mk = seasonalMK(seg), sl = seasonalSen(seg, 1, mk.var);
        const gs = useAdj ? g.sen_adj : g.sen, gz = useAdj ? g.z_adj : g.z, se = Math.abs(gz) > 0.05 ? Math.abs(gs / gz) : Math.abs(gs) * 20 + 1e-9;
        const p1 = { sen_per_decade: sl.slope * 10, lo: sl.lo * 10, hi: sl.hi * 10, mk_p: mk.p }, p2 = { sen_per_decade: gs, lo: gs - 1.96 * se, hi: gs + 1.96 * se, mk_p: pFromZ(gz) };
        rob.second = { available: true, common_start: '1998-01', common_years: 28, enso_adjusted: useAdj, primary: p1, second: p2, grid_lookup: true,
          same_sign: Math.sign(p1.sen_per_decade) === Math.sign(p2.sen_per_decade), ci_overlap: p1.lo <= p2.hi && p2.lo <= p1.hi };
      }
    }
    const base = enso ? ensoFit : ols, phi = Math.max(base.r1, 0), slopeN = (enso ? enso.trend_adj_per_decade : d.sen_per_decade) / 10, nstar = weatherheadYears(slopeN, base.sigma, phi);
    c.detectability = { noise_sigma: base.sigma, noise_ar1: phi, years_needed: nstar, years_available: n / 12, years_missing: Math.max(nstar - n / 12, 0) };
    c.verdict = verdict(c, alpha);
    c.series = { anomaly: anom, adjusted };
    return c;
  }

  const api = { analyze, anomalies, seasonalMK, seasonalSen, olsAr1, ar1, weatherheadYears, precheck, pFromZ, tTwoSidedP, fSf, chi2Sf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TSEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
