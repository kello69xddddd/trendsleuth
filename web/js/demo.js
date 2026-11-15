/* TrendSleuth · guided demo.
   A slow, step-by-step tour of the most important functions. The viewer is in control:
   Pause / Play (or the space bar), Back and Next (or the arrow keys), Close (or Esc).
   Each step points at the part of the screen it explains. Uses only stored data, so it also runs offline. */
(function () {
  'use strict';
  const TS = window.TS, $ = id => document.getElementById(id);
  const STEPS = [
    { ms: 9000, title: 'The problem', side: 'left', text: 'Earth data goes up and down all the time. Finding a real change in all that movement is hard work. TrendSleuth does it for you.',
      run: A => { A.closeTop(); TS.map.spin(true); } },
    { ms: 11000, title: '1 · Choose a variable', side: 'right', spot: '.ask', text: 'Choose what to study, for example temperature. The globe is painted at once: green is a confirmed rise, red is a confirmed fall. Stronger colour means faster change.',
      run: A => { A.setVar('T2M', true); TS.map.look(15, 10, 2.0); } },
    { ms: 11000, title: 'Read the globe', side: 'right', spot: '#legend', text: 'Now rain. Almost all the colour is gone: two NASA datasets must agree before we call it a trend. The legend shows how much of the map is confirmed.',
      run: A => { A.setVar('PRECTOTCORR', true); TS.map.look(5, -60, 2.0); } },
    { ms: 11000, title: '2 · Choose a place', side: 'right', spot: '.where', text: 'Search a name, type coordinates or tap the globe. TrendSleuth names the province and the country, so you always know where you are.',
      run: A => A.openCase('ec_quito_t') },
    { ms: 11000, title: '3 · Read the result', side: 'left', spot: '#panel', text: 'Beginner level: one answer in plain words. Near Quito the air is 0.21 °C warmer every decade. The panel turns green for a rise and red for a fall.',
      run: A => { A.openCase('ec_quito_t'); } },
    { ms: 11000, title: 'See the charts', side: 'left', spot: '#panel', text: 'Intermediate level: the chart shows why. Seasons and natural rhythms are removed. The purple trend line is solid, so the change is significant.',
      run: A => { A.openCase('ec_quito_t'); A.state.view = 'adj'; A.setLayer(2, 'time'); } },
    { ms: 11000, title: 'A false lead', side: 'left', spot: '#panel', text: 'In this river basin one NASA dataset shows more rain. The second one disagrees, so the globe shows no colour here and the verdict is only "weak".',
      run: A => A.openCase('ec_coca_m2') },
    { ms: 12000, title: 'A hidden trend', side: 'left', spot: '#panel', text: 'On these Pacific islands the raw record shows nothing, because El Niño covers the change. We test 11 natural rhythms and remove the one that matters. The drying appears.',
      run: A => { A.openCase('pac_atolls'); A.state.view = 'adj'; A.setLayer(2, 'time'); } },
    { ms: 9000, title: 'Check every test', side: 'left', spot: '#panel', text: 'Pro level: every statistical check, with the numbers and the data sources. The glossary explains each word.',
      run: A => { A.openCase('pac_atolls'); A.setLayer(3, 'checks'); } },
    { ms: 10000, title: 'Top trends', side: 'left', spot: '#topBtn', text: 'One button lists the strongest confirmed changes on Earth, found automatically. Tap any of them to test it.',
      run: A => { A.setVar('T2M', true); A.openTop(); TS.map.look(20, 20, 2.1); } },
    { ms: 8000, title: 'Your turn', side: 'right', spot: '.ask, .where', text: 'Choose a variable, choose any place on Earth, and read your own result in seconds.',
      run: A => { A.openCase('ec_quito_t'); } }
  ];
  const D = { i: -1, paused: false, left: 0, last: 0, raf: 0 };
  const fast = () => window.TS_FAST_DEMO ? 0.03 : 1;

  function spot(sel) {
    document.querySelectorAll('.spot').forEach(e => e.classList.remove('spot'));
    if (sel) document.querySelectorAll(sel).forEach(e => { if (!e.hidden) e.classList.add('spot'); });
  }
  /* The text bar sits over the half of the screen that the step is NOT talking about, so it never hides what it explains. */
  function dock() {
    const bar = $('demoBar'), s = STEPS[D.i]; if (!s || window.innerWidth <= 900) { bar.style.left = bar.style.width = ''; bar.classList.remove('docked'); return; }
    const r = $(s.side === 'left' ? 'stage' : 'panel').getBoundingClientRect();
    bar.classList.add('docked'); bar.style.left = (r.left + 10) + 'px'; bar.style.width = (r.width - 20) + 'px';
  }
  function go(i) {
    if (i < 0) i = 0;
    if (i >= STEPS.length) { stop(); return; }
    const s = STEPS[i]; D.i = i; D.left = s.ms * fast(); D.last = performance.now();
    $('demoCount').textContent = `${i + 1} of ${STEPS.length}`; $('demoStep').textContent = s.title; $('demoText').textContent = s.text;
    s.run(TS.app); spot(s.spot); dock(); bar();
  }
  function bar() {
    const s = STEPS[D.i], done = 1 - D.left / (s.ms * fast());
    $('demoDots').querySelectorAll('i').forEach((d, k) => { d.style.setProperty('--f', k < D.i ? 1 : k === D.i ? Math.max(0, Math.min(1, done)) : 0); });
  }
  function tick(now) {
    if (D.i < 0) return;
    if (!D.paused) { D.left -= now - D.last; if (D.left <= 0) { go(D.i + 1); if (D.i < 0) return; } else bar(); }
    D.last = now; D.raf = requestAnimationFrame(tick);
  }
  function setPaused(p) {
    D.paused = p; D.last = performance.now();
    const b = $('demoPause'); b.textContent = p ? 'Play' : 'Pause'; b.setAttribute('aria-pressed', String(p)); $('demoBar').classList.toggle('paused', p);
  }
  function start() {
    if (D.i >= 0) return;
    TS.app.state.demo = 1; document.querySelectorAll('dialog[open]').forEach(d => d.close()); $('demoBar').hidden = false; $('demoBtn').disabled = true;
    $('demoDots').innerHTML = STEPS.map(() => '<i></i>').join(''); setPaused(false); go(0); D.raf = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(D.raf); D.i = -1; TS.app.state.demo = 0; spot(null); $('demoBar').hidden = true; $('demoBtn').disabled = false;
  }
  window.addEventListener('resize', () => { if (D.i >= 0) dock(); });
  $('demoPause').onclick = () => setPaused(!D.paused);
  $('demoNext').onclick = () => go(D.i + 1);
  $('demoPrev').onclick = () => go(D.i - 1);
  $('demoStop').onclick = stop;
  TS.demo = { start, stop, toggle: () => setPaused(!D.paused), next: () => go(D.i + 1), prev: () => go(D.i - 1), get step() { return D.i; }, get paused() { return D.paused; }, steps: STEPS.length };
})();
