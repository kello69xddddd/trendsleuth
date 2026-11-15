# Findings

All numbers come from `out/cases.json` (built by `scripts/build_cases.py`) and `out/scan/` (built by
`scripts/global_scan.py`). Trends are seasonal Sen slopes with 95 % confidence intervals; p-values are from the
seasonal Mann-Kendall test with the Hirsch-Slack correction unless stated otherwise.
Data end in September 2026 (MERRA-2) and October 2026 (IMERG, NOAA indices).

## Case 1 · Same Niño, opposite fates (Ecuador) — verdict: cycle, not trend

| Region (GPM IMERG, 1998–2026) | Best index | Share of monthly swings | Peak response | Trend | Verdict |
|---|---|---|---|---|---|
| Coast (3.5°S–1°N, 80.9–79.4°W) | Niño 1+2, lag 0 | 37 % (p < 0.001) | +2.3 mm/day per °C in February | −0.15 [−0.38, +0.04] mm/day per decade after removing the cycle | NOT YET |
| Amazon, Coca basin (0.8°S–0.3°N, 78.3–77.3°W) | Niño 3.4, lag 2 | 7 % (p = 0.0008) | −0.73 mm/day per °C in January | −0.03 [−0.29, +0.24] | NOT YET |
| Austro, Paute basin (3.2–2.3°S, 79.3–78.4°W) | Niño 1+2, lag 0 | 8 % (p = 0.001) | +0.84 mm/day per °C in March | −0.10 [−0.31, +0.09] | NOT YET |

- The coast does not follow the usual Niño 3.4 index (4 % of the swings); it follows the coastal index Niño 1+2. The engine tests both and reports which one matters.
- The Coca basin, upstream of Ecuador's largest hydropower plant, responds with the opposite sign.
- For the Paute basin El Niño explains little. Its droughts are not simply "El Niño".
- At the current signal size the coast would need about 70 years of data to show a trend. What Ecuador lives through is the cycle.
- Context: in October 2026 NOAA's Niño 1+2 anomaly is +4.31 °C and Niño 3.4 is +2.30 °C (ERSST v6). The record ends inside a strong event, which is exactly when a naive trend line is most biased.
- Temperature is different: the northern Andes warm by +0.21 [+0.16, +0.26] °C per decade (MERRA-2, 1981–2026), STRONG, also after removing El Niño (which explains 37 % of the monthly swings).

## Case 2 · The phantom wetting — verdict: false lead

Same Coca basin, analysed with MERRA-2 only, as a single-source tool would:

- +0.32 [+0.15, +0.49] mm/day per decade (+7.6 % per decade), p = 0.0003 (a textbook test gives p ≈ 10⁻¹²).
- It passes Mann-Kendall, the t-test, the confidence interval, the El Niño check and the end-point check.
- GPM IMERG over 1998–2026 shows −0.03 mm/day per decade (not significant). The two NASA sources disagree, so the verdict is capped at WEAK.

Global version of the same test (land, 60°S–60°N, 1998–2025, 11 804 cells of 1° × 1.25°):

| | Share |
|---|---|
| Land with a "significant" MERRA-2 rainfall trend, textbook test | 50 % |
| … after correcting for serial correlation | 40 % (one in five disappears) |
| … of those, confirmed by IMERG (significant, same sign) | 25 % |
| … of those, opposite sign in IMERG | 24 % |

## Case 3 · Open case: the hidden drying of the equatorial Pacific atolls — verdict: STRONG, hidden by El Niño

Region: Nauru and the Gilbert Islands of Kiribati (6°S–3°N, 160–178°E).

| Test | GPM IMERG 1998–2026 | MERRA-2 1981–2026 |
|---|---|---|
| Raw trend | −0.25 mm/day per decade, p = 0.56 | −0.31, p = 0.17 |
| Share of monthly swings explained by Niño 3.4 | 65 % | 51 % |
| Trend after removing El Niño | **−0.86 [−1.28, −0.44]** (−15 % per decade), p = 0.0001 | **−0.51 [−0.73, −0.29]** (−10 % per decade), p < 0.0001 |
| t-test with AR(1) errors, after removing El Niño | p = 0.0007 | p < 0.0001 |
| Neutral months only (model-free) | −1.07, p = 0.003 (154 months) | −0.53, p = 0.006 (255 months) |
| Last 24 months removed | −0.82 | −0.48 |
| The other dataset, 1998–2026, El Niño removed | MERRA-2: −0.67 | IMERG: −0.84 |

Plain numbers (no model): average rainfall by ENSO state, first versus second half of each record.

| State | IMERG 1998–2012 → 2012–2026 | MERRA-2 1981–2003 → 2004–2026 |
|---|---|---|
| Neutral | 6.1 → 4.6 mm/day (−25 %) | 6.0 → 4.2 (−30 %) |
| La Niña | 3.0 → 2.5 (−16 %) | 2.5 → 2.2 (−11 %) |
| El Niño | 9.6 → 10.3 (+7 %) | 8.5 → 8.4 (−1 %) |

What is known and what is new:

- Official assessments report no significant rainfall trend for these countries, because El Niño variability is too large (PACCSAP 2014 country reports for Nauru and Kiribati; Pacific "NextGen" climate updates).
- A strengthening of the Pacific Walker circulation since the early 1990s is documented (L'Heureux et al. 2013; Heede & Fedorov 2023) and is physically consistent with less rain over the central equatorial Pacific. Whether it is forced or natural decadal variability is debated.
- In our literature search we did not find a study that quantifies this decline for the atolls after removing ENSO, or one that extends to 2026. We present it as an open case, not as an established result.

What would close the case: the monthly rain-gauge records of Tarawa and Nauru, analysed the same way; a third satellite product (GPCP); and a longer record, since 28–46 years cannot rule out a decadal swing (PDO/IPO).

In the 1° × 1.25° global scan, cells where both datasets show a trend only after removing El Niño cover 5.5 million km², mostly ocean, centred on this region.

## Validation: known trends re-discovered

| Region | Result | Literature |
|---|---|---|
| Southern Amazon (14–8°S, 65–58°W) | −0.43 mm/day per decade (−9 % per decade), STRONG, both sources | documented drying and longer dry season |
| North China (36–44°N, 105–120°E) | +0.05 mm/day per decade (+5 % per decade), STRONG, both sources | documented wetting |

## Validation: synthetic tests (`tests/test_engine.py`)

| Test | Result |
|---|---|
| Identical S, Var(S) and Sen slope to `pymannkendall` | passes |
| False positives, no trend, AR(1) = 0.6 noise | textbook test 30 %, corrected test 6 % |
| No trend, record ending in a super El Niño | mean spurious trend 0.119 → 0.020 after removing ENSO |
| Real trend masked by ENSO | detection rate 42 % → 100 % after removing ENSO |
| Browser engine versus Python engine on the 9 case files | same verdicts; numbers within 3 % (inputs rounded to 3 decimals) |

## A lead we rejected

"The coast of Ecuador is drying underneath El Niño" looked significant in the regression (MERRA-2, p = 0.007).
The neutral-months test did not confirm it (p = 0.43 to 0.84): the signal came from the weak rain response of the
2015–16 and 2023–24 events, not from a background drying. That test is now part of the engine.


## Added on 14 November: more rhythms, and "then vs now"

**More than El Niño.** Every record is now tested against ten repeating phenomena (Niño 3.4, Niño 1+2, Indian Ocean Dipole,
NAO, AO, PNA, tropical North and South Atlantic, Southern Annular Mode, QBO) with a Bonferroni-corrected test, and the PDO is
reported without being removed. With the larger set, the verdicts and trend values of the nine case files do not change
(`node tests/insights_check.js`). The yearly cycle explains from 8% (Pacific atolls) to 89% (southern Amazon) of the raw variation.

| Case | Main rhythm (share of the monthly variation) | Other significant rhythms |
|---|---|---|
| Ecuador coast, rain | coastal El Niño 37% | none |
| Coca basin, rain | El Niño 7% (not significant) | none |
| Quito region, temperature | El Niño 37% | coastal El Niño 19%, Tropical North Atlantic 17%, Indian Ocean Dipole 12% |
| Pacific atolls, rain | El Niño 65% | coastal El Niño 26%, Indian Ocean Dipole 20%; PDO 17% (slow, reported only) |
| Southern Amazon, rain | coastal El Niño 6% (not significant) | none |
| North China, rain | Tropical South Atlantic 4% (not significant) | none |

**The same phenomenon a decade apart** (mean anomaly in the seven months around the peak of the index; the 2026 event is still going, so its window is shorter):

| Place | El Niño 2015–16 | El Niño 2026 (so far) |
|---|---|---|
| Pacific atolls, rain | +6.8 mm/day (+113%), index peak +2.2 °C | +3.5 mm/day (+72%), index peak +2.2 °C |
| Ecuador coast, rain (coastal index) | +0.7 mm/day (+50%), peak +2.2 °C | +3.3 mm/day, peak +4.1 °C; the months so far are in the dry season, so the percentage is very large |
| Quito region, temperature | +1.0 °C | +1.6 °C |
| Southern Amazon, rain | −1.7 mm/day (−25%) | −0.3 mm/day (−17%) |

**Last 10 years against the 10 before** (Nov 2006 – Oct 2016 and Nov 2016 – Oct 2026; Welch t-test on yearly means):
southern Amazon −17% (p = 0.012), North China +24% (p = 0.006), Pacific atolls −13% (p = 0.47, inside normal year-to-year change because El Niño years dominate), Ecuador coast +6% (p = 0.60).
