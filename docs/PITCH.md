# Pitch (5 minutes, English B2) and 30-second video script

**One-line idea:** Analysing Earth data is a big problem. With TrendSleuth it is easy to know when a trend is really significant, and when it is not.

## 5-minute pitch

**0:00 · Hook (30 s)**
"This is 45 years of rain data for one place. It goes up, it goes down. Is it changing, or is it just weather?
Today, to answer that, you need to download files, clean them, remove the seasons, and run statistics. That takes hours. We do it in seconds."

**0:30 · The problem (40 s)**
- NASA has thousands of variables for every place on Earth. Nobody can read all those charts.
- A line that goes up is not always a trend. Seasons, El Niño and other natural rhythms can look like one, or hide one.
- One dataset can be wrong. So "is it significant?" is a hard question for a student, a journalist or a mayor.

**1:10 · The solution (50 s) · show the app**
- Step 1: choose a variable. The globe turns green where a rise is confirmed and red where a fall is confirmed. Stronger colour means faster change. No colour means not confirmed.
- Step 2: choose a place by name, by coordinates or with a tap. The app tells you the province and the country. Step 3: read the result.
- Beginner says trend or no trend, and how strong: none yet, weak, moderate or strong.
- Intermediate shows the charts. Pro shows every statistical check. You go as deep as you want.
- "Top trends" lists the strongest confirmed changes on Earth, found automatically.

**2:00 · Demo, case 1: a real trend (30 s)**
- Air temperature near Quito: +0.21 °C per decade, 5 of 5 checks passed. Verdict: strong.

**2:30 · Demo, case 2: a false lead (40 s)**
- One NASA dataset says the Coca river basin is getting wetter (p = 0.0003). The second NASA dataset disagrees.
- Verdict: weak. Over land, only 25% of "significant" rain trends in one dataset are confirmed by the other.

**3:10 · Demo, case 3: a hidden trend (60 s)**
- Nauru and Kiribati: the raw record shows nothing (p = 0.56).
- We test 11 natural rhythms, not only El Niño. Here El Niño explains 65% of the variation. We remove it.
- Now the trend is clear: 15% less rain per decade. Six of six checks passed.
- "Then vs now": the 2015–16 El Niño brought 113% more rain than normal there. The 2026 El Niño, 72% so far.

**4:10 · Why trust it, and close (50 s)**
- Standard methods: Mann-Kendall, Sen's slope, t-test, confidence intervals. Validated against a reference library.
- Open NASA data, open code, limits clearly stated. Built to international accessibility rules (WCAG).
- "Earth data is hard to read. TrendSleuth reads it for you and tells you when a change is real."

## Likely questions

| Question | Short answer |
|---|---|
| Is it only about El Niño? | No. We test 10 repeating phenomena and report one slow one (PDO). We also scan for any rhythm without a name. The yearly cycle is always removed first. |
| What does "significant" mean here? | Less than a 5% chance that the change is an accident, after correcting for the memory of the data. A "strong" verdict also needs the robustness checks. |
| Why not use Giovanni? | It needs an Earthdata login. We use the same products (MERRA-2, IMERG) from the open NASA POWER archive, so anyone can repeat our work. |
| Is it cause or correlation? | Association. The app says so in every case. |
| Could the hidden trend be slow natural variability? | Yes, it is possible. 28 to 46 years cannot separate them. It is written in the limits. |
| What did AI do? | It is declared in `docs/AI_AND_PRIOR_WORK.md`. |
| Does it work offline? | The trend map, the place names, Top trends, the nine cases and the demo work offline. Live places need internet for the NASA POWER API. |
| Why does the rain map have almost no colour? | Because we only paint a trend when two NASA datasets agree. No colour means "not confirmed", not "no change". |
| The map and the verdict of a place can differ. Why? | The map is a quick scan with one test. The verdict runs the full set of checks for that place. |

## 30-second video

| Time | Picture | Voice |
|---|---|---|
| 0–6 s | A noisy rain chart | "Earth data goes up and down all the time. Is this a real change, or just noise?" |
| 6–13 s | App: pick "Temperature", the globe turns green; search "Pichincha", verdict appears | "With TrendSleuth you pick a variable, the map shows where it is changing, and any place gets a verdict from 45 years of NASA data." |
| 13–19 s | False lead case, verdict "weak" | "One dataset says it is getting wetter. A second one disagrees. False lead." |
| 19–26 s | Atolls: toggle "El Niño removed", trend line becomes solid | "And when El Niño hides a change, we remove it. These Pacific islands are losing 15 percent of their rain per decade." |
| 26–30 s | Verdict screen | "TrendSleuth. Know when a trend is real." |
