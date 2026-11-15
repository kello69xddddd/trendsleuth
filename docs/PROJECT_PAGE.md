# Project page text (English, ready to paste)

> Versión en español: [PROJECT_PAGE_ES.md](PROJECT_PAGE_ES.md)

**Project name:** TrendSleuth

**Team:** Narek Vásconez, Alejandro Benítez, Jorge Chapi, Andrés Albán, Alexander Escobar · NASA Space Apps Challenge 2026 · Sangolquí (ESPE), Ecuador

**Challenge:** Be An Earth System Trend Detective!

**High-level summary**
Earth data goes up and down all the time, and reading hundreds of charts to find a real change is hard work.
TrendSleuth does that work in seconds. You pick a variable (rain, temperature, soil moisture and more) and the globe is painted: green where a rise is
confirmed, red where a fall is confirmed, stronger where the change is faster, and no colour where nothing is confirmed. Then you choose any place by name, by coordinates
or with a tap. The tool names its province and country, reads up to 45 years of NASA data and gives one clear verdict: **is there a trend, and how
strong is the evidence?** It first removes the seasons and the natural rhythms of the climate (El Niño and ten other
repeating phenomena), then tests what is left with standard statistics, and checks rainfall against a second NASA dataset.
The answer comes in three levels that go deeper: Beginner (the answer), Intermediate (the charts) and Pro (every test).

**Live app:** https://kello69xddddd.github.io/trendsleuth/
**Repository:** https://github.com/kello69xddddd/trendsleuth (MIT license)
**Project demo (7-slide deck, English):** https://github.com/kello69xddddd/trendsleuth/blob/main/docs/pitch/TrendSleuth_pitch_EN.pdf
**Audience:** high-school students in their last years and university students, and their teachers.

**How it answers the challenge**

| The challenge asks | TrendSleuth answers |
|---|---|
| Select variables | Seven NASA variables with simple definitions; a table shows which ones are changing at your place |
| Where is it changing? | A global trend map for each variable (green and red, stronger where the change is faster), any point on Earth (live NASA POWER data) with the name of its province and country, and a "Top trends" list found automatically |
| Visualize the change over time | Interactive time series: raw data, seasons removed, natural rhythm removed |
| How much is it changing? | Sen's slope per decade, in real units and in percent, with a 95% confidence range |
| Is it significant? | Seasonal Mann-Kendall test, t-test, confidence interval, and three robustness checks |
| Same process, opposite directions | Case files: the same El Niño makes Ecuador's coast wetter and its Amazon drier |
| Help users become data detectives | A guided demo of the main functions that you can pause and step through, nine solved cases, and a glossary of 31 words with examples and units |

**What it does**
- **Beginner, the answer.** One screen: trend or no trend, a four-step strength meter, the rate of change, and one plain sentence.
- **Intermediate, the charts.** Four interactive charts: *Over time*, *Then vs now* (the same phenomenon a decade ago and today,
  and the last 10 years against the 10 before), *Rhythms* (which repeating phenomena matter here) and *By month*.
- **Pro, the tests.** Every statistical check as passed or not passed, all the numbers, data sources, and downloads (JSON and CSV).
- **Trend map.** A 3D globe (NASA Blue Marble) in its real satellite colours, with zoom. Only confirmed trends are painted: green = rise, red = fall,
  stronger colour = faster change, no colour = not confirmed. For rain, two NASA datasets must agree. It works offline and falls back to a flat map if WebGL is not available.
- **Place finder.** Search a country or province, type latitude and longitude, or tap the map. The app shows the province and country and outlines it.
- **Outlook and warning.** For a confirmed trend, a card says if it may become a problem (Warning / Watch / Low concern), how much it would change by 2050 if it continues (with a 95% range) and one thing to do, based on the IPCC AR6 adaptation options. It is a sign to investigate, not a climate-model forecast.
- **Top trends.** For each variable, the region with the fastest confirmed rise and the fastest confirmed fall. One tap runs the full test there.

**How it works**
Monthly anomalies remove the yearly cycle. Then the engine tests ten repeating phenomena (El Niño 3.4, coastal El Niño 1+2,
Indian Ocean Dipole, NAO, AO, PNA, tropical North and South Atlantic, Southern Annular Mode, QBO) with a regression that
allows a different response in each calendar month and a lag of 0 to 6 months. The strongest one is removed only if it is
significant after a Bonferroni correction and explains at least 10% of the variation. The slow Pacific Decadal Oscillation is
reported but not removed, because 45 years cannot separate it from a trend. A periodogram compared with red noise scans for any
other rhythm. The trend is then tested with the seasonal Mann-Kendall test (Hirsch-Slack correction), Sen's slope with a 95%
confidence interval, and a t-test with AR(1)-adjusted errors. Robustness checks: months with no active rhythm, the record
without its last two years, and a second NASA dataset. If no trend is found, the tool says how many years of data would be
needed (Weatherhead et al. 1998). The global map uses the same seasonal Mann-Kendall test on every grid cell, with a 5% false
discovery rate (Benjamini-Hochberg). The Python engine is validated against `pymannkendall` and synthetic data, and the browser
engine reproduces it.

**What we found**
1. *Same El Niño, opposite results.* Rain on Ecuador's coast follows the coastal El Niño index (37% of the monthly variation).
   The Amazon basin above the country's largest hydropower plant responds in the opposite direction. There is no long-term rain trend yet: it is a cycle.
2. *A false lead.* One NASA dataset alone shows a "highly significant" increase of rain in that basin (p = 0.0003). The second one does not.
   Over land, only 25% of the significant MERRA-2 rain trends are confirmed by IMERG.
3. *A hidden trend.* Over Nauru and the Gilbert Islands (Kiribati) the raw record shows no trend (p = 0.56). After removing El Niño,
   rain falls by about 15% per decade since 1998 (p < 0.001), and the second dataset agrees. We present it as a lead to check with rain gauges, not as a final result.
4. *Then vs now.* On those islands the 2015–16 El Niño brought 113% more rain than normal; the 2026 El Niño, with the same index peak, 72% so far.

**Scope and limits**
Straight-line trends only. A record of 28 to 46 years cannot separate a forced trend from slow natural variability.
A link with a rhythm is an association, not proof of cause. Reanalysis data can contain artificial trends, so rain needs two sources for a "strong" verdict.

**NASA data**
NASA POWER v10 archives of MERRA-2, GPM IMERG and CERES SYN1deg, the NASA POWER monthly API, and the NASA Blue Marble image.
Full table with links, access dates and processing: `docs/DATA_AND_REFERENCES.md`.

**Other data and references**
NOAA PSL climate indices (11 series); Natural Earth borders (public domain); open-source libraries globe.gl / three.js and Plotly.js; method references in `docs/DATA_AND_REFERENCES.md`.

**Use of artificial intelligence**
Claude (Anthropic) was used for research, code, analysis, interface design and writing, under the direction and review of the team.
No AI-generated images, audio or video are used. Full declaration, including work prepared before the event: `docs/AI_AND_PRIOR_WORK.md`.
