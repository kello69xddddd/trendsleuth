// Runs the JS engine on the same series as the Python reference and prints the largest relative difference.
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..'), E = require('../web/js/engine.js');
const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/data/cases.json'))).cases;
const N = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/data/nino.json')));
const nz = a => a.map(v => v === null ? NaN : v);
let worst = 0, fails = 0;
for (const c of cases) {
  const y = nz(c.series.y), off = (c.start_year - N.start_year) * 12;
  const drivers = { 'Nino 3.4': nz(N.nino34).slice(off, off + y.length), 'Nino 1+2': nz(N.nino12).slice(off, off + y.length) };
  const opts = { startYear: c.start_year, drivers };
  if (c.series.second) opts.second = { series: nz(c.series.second), start: [c.series.second_start, 1] };
  const j = E.analyze(y, opts);
  const pairs = [['mk_p', j.detection.mk_p, c.detection.mk_p], ['sen', j.detection.sen_per_decade, c.detection.sen_per_decade], ['sen_lo', j.detection.sen_lo, c.detection.sen_lo],
    ['ols_p', j.detection.ols_p, c.detection.ols_p], ['hom_p', j.robustness.homogeneity_p, c.robustness.homogeneity_p], ['enso_var', j.enso.variance_share, c.enso.variance_share],
    ['enso_p', j.enso.coef_p, c.enso.coef_p], ['adj', j.enso.trend_adj_per_decade, c.enso.trend_adj_per_decade], ['adj_p', j.enso.mk_p_adj, c.enso.mk_p_adj], ['adj_lo', j.enso.adj_lo, c.enso.adj_lo],
    ['neutral', j.enso.neutral.sen_per_decade, c.enso.neutral.sen_per_decade], ['neutral_p', j.enso.neutral.mk_p, c.enso.neutral.mk_p], ['years', j.detectability.years_needed, c.detectability.years_needed]];
  if (c.robustness.second && c.robustness.second.available) pairs.push(['sec1', j.robustness.second.primary.sen_per_decade, c.robustness.second.primary.sen_per_decade], ['sec2', j.robustness.second.second.sen_per_decade, c.robustness.second.second.sen_per_decade]);
  let cw = 0, who = '';
  for (const [k, a, b] of pairs) { const rel = Math.abs(a - b) / Math.max(Math.abs(b), 1e-6); const abs = Math.abs(a - b); const e = Math.min(rel, abs / 1e-4 * 1e-3 + (abs < 2e-3 ? 0 : rel)); if (e > cw) { cw = e; who = `${k}: js=${a} py=${b}`; } }
  const same = j.verdict.level === c.verdict.level && j.enso.index === c.enso.index && j.enso.lag_months === c.enso.lag_months && j.verdict.hidden_by_enso === c.verdict.hidden_by_enso;
  if (!same || cw > 0.05) fails++;   // inputs are rounded to 3 decimals in the JSON, so small differences are expected
  worst = Math.max(worst, cw);
  console.log(`${c.id.padEnd(14)} verdict js=${j.verdict.level} py=${c.verdict.level} idx ${j.enso.index}/${c.enso.index} lag ${j.enso.lag_months}/${c.enso.lag_months} worst ${cw.toExponential(2)} ${who}`);
}
console.log(fails ? `PARITY FAIL (${fails})` : `PARITY OK, worst diff ${worst.toExponential(2)}`);
process.exit(fails ? 1 : 0);
