# Pitch (English summary of the 5-minute local pitch)

> Español: [PITCH_ES.md](PITCH_ES.md) · Deck: [pitch/TrendSleuth_pitch_EN.pdf](pitch/TrendSleuth_pitch_EN.pdf)

The live pitch in Sangolquí is in Spanish. It follows the 7-slide structure of the local guide.

1. **Challenge and team.** In October 2026 the coastal El Niño reached +4.3 °C off Ecuador. Is this the usual climate, or is something changing for good? That is the challenge *Be An Earth System Trend Detective!* Our answer, TrendSleuth, tells you with NASA data if a change on Earth is real or a false alarm.
2. **Problem.** By eye, 28 years of Pacific rain show no clear answer. El Niño can hide or create a trend, one dataset can lie, and doing it right takes code and statistics. Over land, only 1 in 4 "significant" rain trends from one NASA dataset is confirmed by the other. Students, teachers, local governments, water and energy planners and farmers are affected.
3. **Solution.** Three steps (variable, place, verdict) and, if the trend is a risk, a warning with the change by 2050 and what to do. No code, no statistics, no login.
4. **NASA data and science.** MERRA-2 (GMAO), GPM IMERG (GPM mission) and the NASA POWER API. Seasons and ten natural rhythms are removed, four tests are run, and rain must be confirmed by a second dataset. About 52,000 grid cells, at most 5% false positives.
5. **Architecture and live demo.** NASA POWER → Python → JSON → JavaScript engine → 3D globe. Quito: real trend (+0.21 °C per decade). Coca basin: false lead (p = 0.0003 in one dataset, not confirmed). Pacific atolls: hidden drying (−15% per decade after removing El Niño).
6. **Impact, usability, scalability.** Fewer false alarms, answers in seconds, a warning with one action. Relevant in Ecuador today and worldwide (southern Amazon −9% rain per decade, as published research reports). Built for high-school and university students and their teachers; next steps: a school pilot and a Spanish version.
7. **Transparency, resources and team.** AI use declared, credits to NASA, NOAA and the IPCC, MIT-licensed code. Team: Narek Vásconez, Alejandro Benítez, Jorge Chapi, Andrés Albán, Alexander Escobar.
