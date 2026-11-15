# Pitch (English summary of the 5-minute pitch)

> Español: [PITCH_ES.md](PITCH_ES.md) · Project Demo deck: [pitch/TrendSleuth_pitch_EN.pdf](pitch/TrendSleuth_pitch_EN.pdf)

The live pitch in Sangolquí is in Spanish. Both decks follow the 7-slide structure of the global Project Demo guide (NASA Space Apps 2026): overview, problem, solution, NASA data, prototype, results and closing.

1. **Project overview.** 2026 challenge *Be An Earth System Trend Detective!* In October 2026 the coastal El Niño reached +4.3 °C off Ecuador: is this the usual climate, or is something changing for good? TrendSleuth tells you, with NASA data, if a change on Earth is real or a false alarm.
2. **Problem.** By eye, 28 years of Pacific rain show no clear answer. El Niño can hide or create a trend, one dataset can lie, and doing it right takes code and statistics. Over land, only 1 in 4 rain trends from one NASA dataset is confirmed by the other. Students, teachers, local governments, water and energy planners and farmers face this.
3. **Solution.** NASA data in, clear verdict out. Input: a variable and any place. Process: remove seasons and El Niño, run four tests, ask a second NASA dataset. Output: real trend, false lead or natural cycle, plus a warning and advice when it is a risk. It separates real trends from natural cycles, as the challenge asks.
4. **NASA data.** MERRA-2 (GMAO): 7 variables, 1981–2025, trend test in every cell. GPM IMERG: rain, 1998–2025, second witness. NASA POWER API: any point on Earth, live. Blue Marble: the 3D globe. About 52,000 cells, at most 5% false positives.
5. **Prototype.** Live web app: choose a variable, choose a place, read the verdict. Works today: no login, any place on Earth, demo cases offline. Not yet: Spanish version, phone layout.
6. **Results (measured in our tests).** Quito: real trend, +0.21 °C per decade. Coca basin: false lead (p = 0.0003 in one dataset, not confirmed by the other). Nauru and Kiribati: hidden drying, −15% rain per decade after removing El Niño. Southern Amazon: −9% per decade, as published research reports. Beneficiaries: high-school and university students and their teachers.
7. **Closing.** Next: a school pilot in December 2026 (measuring time to answer and correct verdicts) and, in 2027, a Spanish version checked against weather stations. Live app: https://kello69xddddd.github.io/trendsleuth/ · Credits: NASA POWER, MERRA-2 (GMAO), GPM IMERG, Blue Marble, NOAA PSL. AI use declared. MIT license.
