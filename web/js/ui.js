/* TrendSleuth · small interface parts: the glossary and the star background. */
(function () {
  'use strict';
  const TS = window.TS, $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  /* ------------------------------------------------------------------ glossary
     Every word the app uses, in one sentence, with an example or the unit. c = basics | tests | units */
  const WORDS = [
    { c: 'basics', t: 'Trend', d: 'A slow change in one direction over many years.', e: 'The air near Quito is 0.21 °C warmer every decade.' },
    { c: 'basics', t: 'Natural cycle (rhythm)', d: 'A change that comes and goes again. It is not a trend.', e: 'The seasons, or El Niño every few years.' },
    { c: 'basics', t: 'Noise', d: 'Small random ups and downs with no pattern.', e: 'One rainy month does not mean the climate is wetter.' },
    { c: 'basics', t: 'Season', d: 'The yearly cycle. We remove it first, because it is the biggest movement in most records.' },
    { c: 'basics', t: 'Anomaly', d: 'How far a month is from what is normal for that month.', e: 'A July that is 1 °C warmer than the average July has an anomaly of +1 °C.' },
    { c: 'basics', t: 'El Niño and La Niña', d: 'A natural rhythm of the Pacific Ocean. Every 2 to 7 years it changes rain and temperature in many countries for some months.' },
    { c: 'basics', t: 'Confirmed trend', d: 'A trend that passed the statistical test on the map. It is painted green (rising) or red (falling).' },
    { c: 'basics', t: 'No colour on the globe', d: 'No confirmed trend there. It may be noise, a natural cycle, or a change that is still too small to see.' },
    { c: 'basics', t: 'False lead', d: 'One dataset shows a trend, but a second dataset does not agree. We do not call it a trend.' },
    { c: 'basics', t: 'Hidden trend', d: 'A real trend that you cannot see in the raw record, because a natural cycle covers it.' },
    { c: 'basics', t: 'Top trends', d: 'For each variable, the region where it rises fastest and the region where it falls fastest. They are leads to investigate, not conclusions.' },
    { c: 'basics', t: 'Outlook (if it continues)', d: 'The measured change per decade, continued in a straight line to 2050, with its 95% range. It is a simple projection to see if a trend may become a problem. It is not a forecast from a climate model.', e: '+0.21 °C per decade from 2026 to 2050 is about +0.5 °C.' },
    { c: 'basics', t: 'Warning level', d: 'Only a confirmed trend can give a warning. Warning: by 2050 the extra change is larger than the normal ups and downs of that place, or 20% of its normal value or more. Watch: half of that. Low concern: less. The advice follows the adaptation options of the IPCC AR6 report.' },
    { c: 'basics', t: 'Normal range', d: 'The usual size of the monthly ups and downs of a place, after the seasons and the trend are removed. When the total change since the start of the record is larger than this, we say the place is beyond normal, and we give the year when that happened or will happen.', e: 'Quito: normal swings of 0.3 °C and +0.21 °C per decade, so it left its normal range about 14 years after 1981.' },
    { c: 'basics', t: 'MERRA-2', d: 'A NASA reanalysis: a computer model that mixes millions of observations to describe the weather of every month since 1980, everywhere on Earth.' },
    { c: 'basics', t: 'GPM IMERG', d: 'NASA rain measured from satellites. We use it as a second witness for rain.' },
    { c: 'tests', t: 'Significant', d: 'Very unlikely to be an accident. We use the usual limit: less than a 5% chance (p < 0.05).' },
    { c: 'tests', t: 'p-value', d: 'The chance of seeing a change this big if nothing was really changing. Small is strong evidence.', e: 'p < 0.001 means less than 1 chance in 1,000.' },
    { c: 'tests', t: 'Mann-Kendall test', d: 'Asks one question: do later values tend to be higher (or lower) than earlier ones? It works well with data that is not a perfect line.' },
    { c: 'tests', t: "Sen's slope", d: 'The speed of the change. It is the middle value of the slopes between all pairs of points, so one strange year cannot move it much.' },
    { c: 'tests', t: '95% range (confidence interval)', d: 'The true speed of change is very probably inside this range. If the range includes zero, there may be no change at all.', e: '−1.28 to −0.44 does not include zero, so the fall is real.' },
    { c: 'tests', t: 't-test', d: 'Checks if the slope of the straight trend line is different from zero.' },
    { c: 'tests', t: 'Memory of the data', d: 'A warm month is often followed by another warm month. This makes trends look stronger than they are, so we correct the tests for it.' },
    { c: 'tests', t: 'Textbook p-value', d: 'The p-value without the correction for memory. We show it only to compare: it is often too optimistic.' },
    { c: 'tests', t: 'Second witness', d: 'A second, independent NASA dataset. For rain, both must show the same direction.' },
    { c: 'tests', t: 'False discovery rate', d: 'When you test thousands of places, some pass by pure luck. We limit those lucky passes to 5% of the map.' },
    { c: 'tests', t: 'Years needed', d: 'How many years of data are necessary to see a trend of this size through the noise.' },
    { c: 'units', t: 'per decade', d: 'How much the value changes every 10 years.', e: '+0.2 °C per decade is +1 °C in 50 years.' },
    { c: 'units', t: 'mm/day', d: 'Rain: millimetres of water per day, as a monthly average. 1 mm is 1 litre on each square metre.' },
    { c: 'units', t: '°C', d: 'Temperature, hot days and cold nights: degrees Celsius, measured 2 metres above the ground.' },
    { c: 'units', t: 'fraction (0 to 1)', d: 'Soil moisture: 0 is completely dry soil and 1 is soil full of water.' },
    { c: 'units', t: '% and points', d: 'Humidity is a percentage. Its change is given in points: from 70% to 73% is +3 points.' },
    { c: 'units', t: 'm/s', d: 'Wind: metres per second, measured 10 metres above the ground. 1 m/s is 3.6 km/h.' },
    { c: 'units', t: '% per decade', d: 'For rain, soil moisture and wind: the change every 10 years, compared with the normal value of that place.' }
  ];
  const CAT = { basics: 'Basics', tests: 'Tests', units: 'Units' };
  const G = { cat: 'all' };
  function draw() {
    const q = $('glossQ').value.trim().toLowerCase();
    const list = WORDS.filter(w => (G.cat === 'all' || w.c === G.cat) && (!q || (w.t + ' ' + w.d).toLowerCase().includes(q)));
    $('glossList').innerHTML = list.length ? list.map(w => `<div class="${w.c}"><dt>${esc(w.t)}<small>${CAT[w.c]}</small></dt><dd>${esc(w.d)}${w.e ? `<em>${esc(w.e)}</em>` : ''}</dd></div>`).join('')
      : '<p class="empty">No word found. Try a shorter search.</p>';
    $('glossList').scrollTop = 0;
  }
  TS.gloss = {
    init() {
      $('glossQ').addEventListener('input', draw);
      $('glossCat').querySelectorAll('button').forEach(b => b.onclick = () => { G.cat = b.dataset.c; $('glossCat').querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b))); draw(); });
      $('glossClose').onclick = () => $('gloss').close();
    },
    open(word) { $('glossQ').value = word || ''; draw(); $('gloss').showModal(); $('glossQ').focus(); },
    words: WORDS.length
  };

  /* ------------------------------------------------------------------ stars
     A very quiet star field behind the whole page: small, faint stars on three layers.
     The layers move a few pixels with the pointer, which gives a feeling of depth. */
  function stars() {
    const layers = [['sky1', 150, 0.55, 0.34], ['sky2', 60, 0.8, 0.46], ['sky3', 14, 1.1, 0.62]];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = window.innerWidth + 60, h = window.innerHeight + 60;
    for (const [id, n, r, a] of layers) {
      const c = $(id); if (!c) continue; c.width = w * dpr; c.height = h * dpr; const x = c.getContext('2d'); x.scale(dpr, dpr);
      const count = Math.round(n * w * h / (1366 * 700));
      for (let i = 0; i < count; i++) {
        const tint = rnd(); x.fillStyle = tint > 0.86 ? '#BFD8FF' : tint < 0.08 ? '#FFE3C4' : '#FFFFFF';
        x.globalAlpha = a * (0.35 + 0.65 * rnd()); x.beginPath(); x.arc(rnd() * w, rnd() * h, r * (0.6 + 0.6 * rnd()), 0, 6.3); x.fill();
      }
    }
  }
  if ($('sky')) {
    stars(); let t = 0; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(stars, 200); });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.addEventListener('pointermove', ev => { const dx = ev.clientX / window.innerWidth - 0.5, dy = ev.clientY / window.innerHeight - 0.5; $('sky').style.setProperty('--px', dx.toFixed(3)); $('sky').style.setProperty('--py', dy.toFixed(3)); }, { passive: true });
    }
  }
})();
