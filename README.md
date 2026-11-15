# TrendSleuth

**Is it really changing? Earth data is hard to read. TrendSleuth reads it for you and tells you when a change is real.**

NASA Space Apps Challenge 2026 · *Be An Earth System Trend Detective!* · Sangolquí (ESPE), Ecuador
Team: Narek Vásconez, Alejandro Benítez, Jorge Chapi, Andrés Albán, Alexander Escobar

| | Link |
|---|---|
| Live app | https://kello69xddddd.github.io/trendsleuth/ |
| Repository | https://github.com/kello69xddddd/trendsleuth |
| Project page | [docs/PROJECT_PAGE.md](docs/PROJECT_PAGE.md) · [Español](docs/PROJECT_PAGE_ES.md) |
| Pitch deck (7 slides, PDF) | [English](docs/pitch/TrendSleuth_pitch_EN.pdf) · [Español](docs/pitch/TrendSleuth_pitch_ES.pdf) |
| NASA data and references | [docs/DATA_AND_REFERENCES.md](docs/DATA_AND_REFERENCES.md) |
| Use of AI | [docs/AI_AND_PRIOR_WORK.md](docs/AI_AND_PRIOR_WORK.md) |
| License | [MIT](LICENSE) |

> Versión en español: [README_ES.md](README_ES.md)

Choose a variable and the globe is painted: **green** where a rise is confirmed, **red** where a fall is confirmed,
stronger where the change is faster, and no colour where no trend is confirmed. Then choose a place (search a name, type coordinates or tap the map) and
TrendSleuth names the province and country, reads up to 45 years of NASA data, removes the seasons and the natural
rhythms of the climate, tests what is left, checks a second NASA dataset, and gives one verdict:
**no trend yet / weak / moderate / strong**. A student can read it and a scientist can check it.

| The challenge asks | TrendSleuth answers |
|---|---|
| What is changing? | Seven variables per place, with simple definitions and a table of what else is changing there |
| Where? | A global trend map for each of the seven variables, any point on Earth (live NASA POWER call), and the name of the province and country of that point |
| How much? | Sen's slope per decade with a 95% confidence range, in real units and in percent |
| Is it significant? | Seasonal Mann-Kendall test, AR(1)-adjusted t-test, confidence interval, and three robustness checks |
| Trend or cycle? | Ten repeating phenomena tested and removed when they matter, one slow one reported, plus a scan for any other rhythm |

## The app: one screen, three levels

| Part | What you see |
|---|---|
| Globe | 3D globe with the NASA Blue Marble satellite image (4096 × 2048, relief, country borders, zoom). Only confirmed trends are painted: green = rise, red = fall, stronger colour = faster change, no colour = not confirmed. The legend gives the share of the map in each class |
| Place | One search box: a name (country or province), coordinates, or a tap on the globe. It shows the province and country and outlines it. When it is empty it offers the solved cases |
| Beginner · the answer | Trend or no trend, strength meter, rate of change, one plain sentence, one small chart. The panel turns pastel green for a rise and pastel red for a fall |
| Intermediate · the charts | Over time · then vs now (a decade ago and today) · rhythms · by month |
| Pro · the tests | Every check (passed or not), the numbers that the other levels do not show, sources with links, downloads (JSON, CSV), the other variables at this place |
| Top trends | One button: for each variable, the region with the fastest confirmed rise and the fastest confirmed fall, found automatically. If no large land region qualifies, a smaller one or an open-sea area is used and marked |
| Glossary | 31 words in plain English with examples and units, with search and three groups: basics, tests, units |
| Welcome pop-up | Opens once: the three steps and what each level contains. The app behind it already shows a variable, a place and a result |
| Guided demo | A step-by-step tour of the main functions with Pause / Play, Back and Next (space bar and arrow keys) |

Design rules: "less is more". Every fact is shown once: what you ask is on the left (variable, place), the answer is on the right.
Neutral interface, not too dark and not too light (slate page with very quiet stars, dark window for the globe, light result panel),
that follows Apple's Human Interface Guidelines (system font, soft cards, one colour reserved for steps 1, 2, 3),
no page scroll on a laptop screen, text never smaller than 16 px, WCAG 2.2 AA contrast, 44 px targets, full keyboard use
(keys 1, 2, 3 change level; Esc closes), reduced-motion support, and a flat map if WebGL is not available.
Colour is never the only signal: the legend and the cards also use arrows and words.

Speed: the data files load in parallel, the chart library and the borders load in the background, the map shading is drawn
on a canvas and sent straight to the graphics card, and each place is analysed once and kept in memory.
Changing the variable repaints the map in a few milliseconds.

## Run it

```
start.bat  (Windows)  or  ./start.sh  (macOS, Linux)     starts a small local server and opens the app
web/index.html             also opens by double click (no server); live places need internet
web/index.html?demo=1      start the guided demo          ?top=1  open Top trends
web/index.html?case=pac_atolls                            open one solved case
web/index.html?v=T2M&lat=-0.2&lon=-78.5                   open a variable and a place

pip install -r requirements.txt
python -m pytest tests/test_engine.py -q      # 10 validation tests of the engine
node tests/js_parity.js                       # browser engine == Python engine
node tests/insights_check.js                  # rhythms, decades and events on the nine cases
python tests/ui_smoke.py 1366 650 http        # headless UI test: no scroll, no text under 16 px, no errors, timings
python tests/ui_smoke.py 1280 600 file        # the same, opened by double click
```

## Data pipeline (everything the app reads is JSON)

```
scripts/fetch_power_zarr.js, reduce_packs.py   NASA POWER archive  ->  data/proc/*.npz   (not in the repository: 700 MB)
scripts/global_scan.py NAME y0 y1              trend test on every grid cell  ->  out/scan/*.npz
scripts/build_cases.py                         ->  web/data/cases.json, nino.json
scripts/build_places.py                        Natural Earth borders  ->  data/geo/places.topo.json
scripts/build_web_data.py                      ->  web/data/trends.json, top_trends.json, places.topo.json, offline.js
```

| File in `web/data/` | Content |
|---|---|
| `trends.json` | global trend map of the 7 variables (1.0° × 1.25°): no data / not confirmed / confirmed up / confirmed down, the speed of each confirmed trend from 1 to 9 (`mag`), and the IMERG second witness for rain |
| `top_trends.json` | fastest confirmed rise and fall of each variable, by country or province (`tier`: land, small, sea) |
| `cases.json` | nine solved cases with their series and global statistics |
| `nino.json`, `drivers.json` | 11 climate indices (NOAA PSL) |
| `places.topo.json` | country and province borders (Natural Earth, simplified) |
| `earth.jpg`, `earth_bump.png` | NASA Blue Marble, 4096 × 2048, and its relief map. A larger `earth.jpg` (up to 8192 × 4096) is used at full size without code changes |
| `offline.js` | generated copy of the files above in one script. Browsers block `fetch()` on `file://`, so the app uses it when opened by double click |

**Map rule.** A cell is "confirmed" when the seasonal Mann-Kendall test (Hirsch-Slack) passes with a 5% false discovery rate
over the whole map (Benjamini-Hochberg). For rain, two NASA datasets (MERRA-2 and GPM IMERG, 1998–2025) must both pass and agree.
The map is a quick scan with one test. The verdict of a place uses the full engine below, so the two can differ.

## How the detective works

| Step | Question | Method |
|---|---|---|
| 0 Pre-check | Can we use this record? | coverage, gaps, length. No verdict if it fails |
| 1 Seasons | What is normal for each month? | monthly anomalies (the yearly cycle is removed) |
| 2 Rhythms | Is it a natural cycle? | regression on 10 climate indices with a month-dependent response and a lag of 0–6 months; Bonferroni-corrected; the strongest one is removed if it explains at least 10% of the variation. PDO is reported, not removed. A periodogram against red noise scans for any other rhythm |
| 3 Trend | Is there a change? | seasonal Mann-Kendall with Hirsch-Slack covariance · Sen's slope + 95% CI · t-test with AR(1)-adjusted errors |
| 4 Robustness | Does it survive? | months with no active rhythm · last 24 months removed · second NASA dataset (rain) |
| Verdict | How strong is the evidence? | open rules; every check is listed · years of data needed (Weatherhead 1998) |
| Then vs now | What changed in a decade? | last 10 years against the 10 before (Welch t-test) · the same phenomenon about a decade ago and now |

Rhythms tested: El Niño (Niño 3.4), coastal El Niño (Niño 1+2), Indian Ocean Dipole, North Atlantic Oscillation,
Arctic Oscillation, Pacific–North American pattern, Tropical North Atlantic, Tropical South Atlantic,
Southern Annular Mode, Quasi-Biennial Oscillation, and (reported only) the Pacific Decadal Oscillation.

## What we found (details in `docs/FINDINGS.md`)

1. **Same El Niño, opposite results (Ecuador).** Coastal rain follows the coastal index Niño 1+2 (37% of the monthly
   variation). The Amazon basin above Coca Codo Sinclair responds to Niño 3.4 in the opposite direction. No long-term rain trend yet: it is a cycle.
2. **A false lead.** MERRA-2 alone shows a "highly significant" increase of rain in that basin (+7.6% per decade, p = 0.0003).
   GPM IMERG does not. Over land, only 25% of the significant MERRA-2 rain trends are confirmed by IMERG and 24% have the opposite sign.
3. **A hidden trend.** Over Nauru and the Gilbert Islands (Kiribati) the raw record shows no trend (p = 0.56). After removing
   El Niño, rain falls by 0.86 mm/day per decade (−15% per decade, p < 0.001) in IMERG and by 0.51 mm/day per decade in MERRA-2 since 1981.
4. **Then vs now.** On those islands the 2015–16 El Niño brought 113% more rain than normal; the 2026 El Niño, with the same index peak (+2.2 °C), 72% so far.

## Repository

```
web/index.html          the page
web/css/style.css       design
web/js/store.js         loads the data (JSON in parallel; offline.js on file://)
web/js/engine.js        the Evidence Engine in JavaScript (same results as trendsleuth/engine.py)
web/js/insights.js      rhythms, rhythm scan, decade comparison, event comparison
web/js/geo.js           province and country of a point, search by name, borders
web/js/map.js           globe and trend colours
web/js/ui.js            glossary and star background
web/js/app.js           variable, place, and the three levels (Beginner, Intermediate, Pro)
web/js/toptrends.js     Top trends          web/js/demo.js   guided demo
web/data/               JSON data           web/vendor/      globe.gl, Plotly.js
trendsleuth/            engine.py (reference), grid.py (whole grids, numba), io.py
scripts/                data pipeline (see above)
tests/                  engine validation, JS parity, insights check, UI test
docs/                   project page text, pitch, findings, data and references, AI and prior-work declaration
```

## Limits

Straight-line trends only. With 28–46 years of data, a forced trend cannot be separated from slow natural variability.
A statistical link is not a cause. Reanalysis data can contain artificial trends.
The hidden trend needs confirmation with rain-gauge records before anyone acts on it.

Place names come from Natural Earth; we corrected the labels of two provinces of Ecuador (see `scripts/build_places.py`), and other errors may remain.

Data: NASA POWER (MERRA-2, GPM IMERG, CERES), NASA Blue Marble, NOAA PSL climate indices, Natural Earth borders. NASA does not endorse this project.
Use of AI tools and of work prepared before the event is declared in `docs/AI_AND_PRIOR_WORK.md`.
