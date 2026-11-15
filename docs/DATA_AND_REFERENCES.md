# Data and references

## NASA data used

| Resource | What we used | Link | Accessed (UTC) | Conditions of use | Transformation | Output that depends on it |
|---|---|---|---|---|---|---|
| NASA POWER v10, MERRA-2 monthly archive (Zarr) | PRECTOTCORR, T2M, T2M_MAX, T2M_MIN, TS, GWETROOT, GWETTOP, EVLAND, QV2M, RH2M, WS10M, TQV, 1981-01 to 2026-09, 0.5° × 0.625° | https://nasa-power.s3.amazonaws.com/ (`merra2/temporal/power_merra2_monthly_temporal_utc.zarr`) · https://power.larc.nasa.gov | 2026-11-14 | NASA open data; cite POWER and MERRA-2 (GMAO) | raw Zarr chunks decoded; 2 × 2 cell mean to 1° × 1.25° for the global scan; native resolution kept for tropical South America; region means with cos(latitude) weights | every case file, global scan, "phantom" map |
| NASA POWER v10, GPM IMERG monthly archive (Zarr) | IMERG_PRECTOT, 1998-01 to 2026-10, 0.1° | same bucket, `imerg/temporal/power_imerg_monthly_temporal_utc.zarr` | 2026-11-14 | NASA open data; cite GPM IMERG | mean of the 0.1° cells inside each 1° × 1.25° cell (at least 60 valid cells); native 0.1° kept for Ecuador | second witness in every rainfall case, open case, global agreement statistics |
| NASA POWER v10, CERES SYN1deg monthly archive (Zarr) | ALLSKY_SFC_SW_DWN, CLOUD_AMT, CLRSKY_SFC_SW_DWN, AOD_55_ADJ, 2001-01 to 2026-08, 1° | same bucket, `syn1deg/temporal/…` | 2026-11-14 | NASA open data; cite CERES | none (native grid) | exploratory scan only; not used in the final case files |
| NASA POWER monthly point API | the seven variables of the live app, 1981 to present | https://power.larc.nasa.gov/api/temporal/monthly/point | at the moment of each query (shown in the case file) | NASA open data | none; fill value −999 treated as missing | live investigations in the web app |

Challenge resources consulted: Giovanni, Hydrology Time Series (Data Rods), AppEEARS, Climate Data Online, KNMI Climate Explorer,
"Time-Series Analysis of Remotely-Sensed SeaWiFS Chlorophyll in River-Influenced Coastal Regions" (NTRS 20090042747). Giovanni and AppEEARS need an Earthdata login,
so the open POWER archive of the same MERRA-2 and IMERG products was used to keep the pipeline reproducible without credentials.

## Other data

| Resource | Use | Link | Accessed |
|---|---|---|---|
| NASA Blue Marble (NASA Earth Observatory), as packaged with the open-source `three-globe` library (MIT), 4096 × 2048, with its relief map | image and relief of the globe (stored inside the app, no tiles) | https://visibleearth.nasa.gov/collection/1484/blue-marble | 2026-11-14 |
| Natural Earth 1:10m Admin 1, States and Provinces (public domain), simplified to 6% with mapshaper | name of the province and country of a place, search by name, borders on the map. Two labels of Ecuador were swapped in the source (Napo and Tungurahua) and are corrected in `scripts/build_places.py` | https://www.naturalearthdata.com/downloads/10m-cultural-vectors/ · https://github.com/nvkelso/natural-earth-vector | 2026-11-14 |
| NOAA PSL Niño 3.4 and Niño 1+2 anomalies (ERSST v6, base 1981–2010) | natural-rhythm covariates | https://psl.noaa.gov/data/correlation/nina34.anom.data · https://psl.noaa.gov/data/correlation/nina1.anom.data | 2026-11-14 |
| NOAA PSL Dipole Mode Index (Indian Ocean Dipole, HadISST1.1), through 2026-07 | natural-rhythm covariate | https://psl.noaa.gov/data/timeseries/month/data/dmi.had.long.data | 2026-11-14 |
| NOAA CPC / PSL North Atlantic Oscillation (through 2026-07), Arctic Oscillation (2026-10), Pacific–North American pattern (2026-10) | natural-rhythm covariates | https://psl.noaa.gov/data/correlation/nao.data · ao.data · pna.data | 2026-11-14 |
| NOAA PSL Tropical North Atlantic and Tropical South Atlantic indices, through 2026-09 | natural-rhythm covariates | https://psl.noaa.gov/data/correlation/tna.data · tsa.data | 2026-11-14 |
| NOAA CPC / PSL Antarctic Oscillation (Southern Annular Mode) and QBO (30 hPa wind), through 2026-02 | natural-rhythm covariates | https://psl.noaa.gov/data/correlation/aao.data · qbo.data | 2026-11-14 |
| NOAA PSL Pacific Decadal Oscillation (ERSST v5), through 2026-07 | slow rhythm: reported, never removed | https://psl.noaa.gov/pdo/data/pdo.timeseries.ersstv5.data | 2026-11-14 |

Processing of the nine added indices: each one is standardised (mean 0, standard deviation 1 over 1981–2010) and rounded to 0.05
(`web/data/drivers.json`). Months not yet published are left empty and are not used in the regression.
The Atlantic Multidecadal Oscillation is not included because NOAA PSL stopped updating that series in January 2023.
The first version of the app used OpenStreetMap tiles; they are no longer used.

A Niño 3.4 index computed from the MERRA-2 skin temperature (5°S–5°N, 170–120°W) correlates 0.98 with the NOAA index
(1981–2026) and was used for the global grid scan. The last three months of MERRA-2 run about 0.3–0.9 °C warmer than ERSST there, so the case files use the NOAA index.

## Global trend map and Top trends

For each of the seven variables, the seasonal Mann-Kendall test with the Hirsch-Slack covariance is run on every cell of the
1.0° × 1.25° grid (`scripts/global_scan.py`; MERRA-2 1981–2025). A cell is "confirmed" at a 5% false discovery rate over the
whole map (Benjamini-Hochberg, as recommended by Wilks 2016). For rain the period is 1998–2025 and a cell is confirmed only if
MERRA-2 and GPM IMERG both pass at p < 0.05 and agree on the direction (60°S–60°N).
Share of the map: rain 3% up, 3% down, 94% not confirmed; temperature 70% up, 4% down; hot days 64% / 4%; cold nights 74% / 3%;
soil moisture (land) 21% / 13%; humidity 26% / 9%; wind 10% / 8%.
"Top trends" ranks countries and provinces with at least 12 grid cells where at least 70% of the area is confirmed in the same
direction, by the area-weighted mean Sen slope (`scripts/build_web_data.py`). It is a list of leads from one reanalysis
(two datasets for rain); each one should be opened and tested.

## Software

Python: numpy, scipy, numba, numcodecs, matplotlib, pymannkendall (validation only), pytest, FastAPI (optional), Playwright (UI test).
Browser: Plotly.js 2.35 and globe.gl 2.46 with three.js (MIT licences, bundled in `web/vendor`). Build: mapshaper (MPL-2.0) for the borders.

## Methods references

- Hirsch, Slack & Smith (1982). Techniques of trend analysis for monthly water quality data. *Water Resources Research* 18.
- Hirsch & Slack (1984). A nonparametric trend test for seasonal data with serial dependence. *Water Resources Research* 20.
- Sen (1968); Gilbert (1987), *Statistical Methods for Environmental Pollution Monitoring* (seasonal Kendall slope and its confidence interval).
- van Belle & Hughes (1984). Nonparametric tests for trend in water quality (homogeneity between seasons).
- Santer et al. (2008). Consistency of modelled and observed temperature trends (AR(1) effective sample size).
- Weatherhead et al. (1998). Factors affecting the detection of trends. *JGR* 103.
- Foster & Rahmstorf (2011). Global temperature evolution 1979–2010. *Environmental Research Letters* 6 (removing ENSO by regression).
- Torrence & Compo (1998). A practical guide to wavelet analysis. *BAMS* 79 (testing spectral peaks against red noise).
- Wilks (2016). "The stippling shows statistically significant grid points". *BAMS* 97 (multiple testing on maps).
- Collaud Coen et al. (2020). Effects of prewhitening on Mann-Kendall trends. *AMT* 13.

## Context for the open case

- PACCSAP (2014). *Climate Variability, Extremes and Change in the Western Tropical Pacific*, country reports for Nauru (ch. 8) and Kiribati (ch. 6): rainfall trends not significant.
- RCCAP / CSIRO "NextGen" Pacific climate updates: observed rainfall trends not significant because of ENSO variability.
- L'Heureux, Lee & Lyon (2013). Recent multidecadal strengthening of the Walker circulation. *Nature Climate Change*.
- Heede & Fedorov (2023). Colder eastern equatorial Pacific and stronger Walker circulation in the early 21st century. *GRL*.
- "Ocean Surface Warming and Long-Term Variability in Rainfall in Equatorial Pacific Atolls". *Atmosphere* 15(6), 666 (2024).

Design standards followed by the interface: W3C Web Content Accessibility Guidelines (WCAG) 2.2, level AA; WAI-ARIA 1.2 roles for tabs and dialogs; SI units; ISO 8601 dates.

NASA does not endorse this project. Non-U.S.-Government sources are used under their own terms.
