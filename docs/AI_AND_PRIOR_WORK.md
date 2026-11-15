# Declaration: use of AI and work prepared before the event

This file exists because the local protocol (NASA Space Apps Sangolquí 2026) asks teams to declare AI use
and any component prepared before the competition period. It states what actually happened.

**Team:** Narek Vásconez, Alejandro Benítez, Jorge Chapi, Andrés Albán, Alexander Escobar.

## AI tools

| Tool | Where | What for |
|---|---|---|
| Claude (Anthropic), models Opus 5.5 and Fable 5.2, in the Claude app | whole repository | reading the challenge and the resources; designing the method; writing the Python engine, the grid scan, the JavaScript port, the web app and its redesigns, the data build scripts, the tests, the figures and these documents; running the analysis on the NASA data; literature search for the hidden-trend case |

No AI-generated images, video or audio are used. Figures are plots of NASA data. The globe image is the NASA Blue Marble.
The NASA logo and other NASA marks are not used.

Human direction (the team): choice of challenge and audience, the "detective" concept, the idea of grouping by region and
comparing like seasons, the El Niño / Ecuador focus, the requirement to look for trends others miss, and the review of results.
During the event the team reviewed the first version and wrote a list of corrections (English at B2 level, any repeating
phenomenon and not only El Niño, a three-layer interface on one screen with large text, a 3D globe, a decade-ago-versus-now
comparison, international design standards). The second version was built from that list.
A second review by the team and the mentors gave a new list (data files in JSON and an ordered project; a world map shaded
green, red or grey by trend instead of dots; a lighter Apple-style design; no delay when a variable is selected; the province and
country of the chosen place; a demo that can be paused and teaches the main functions; a "Top trends" button). The third version was built from it.

## Timeline

| When (Ecuador time) | What |
|---|---|
| 30–31 Oct 2026 | concept and one-page plan (no code) |
| Fri 13 Nov, 22:45 → Sat 14 Nov, about 06:30 | data download from the public NASA POWER bucket; Evidence Engine; global scan; case files; first web app; tests; documents. **This is before the official start (Sat 14 Nov, 09:00).** |
| Sat 14 Nov, from 11:00 (during the event) | team review and corrections; nine more NOAA climate indices added; rhythm ranking, rhythm scan, decade comparison and event comparison (`web/js/insights.js`); full interface redesign (three layers, 3D globe, guided demo); documents rewritten |
| Sat 14 Nov, from 13:00 (during the event) | third version from the second list of corrections: data converted to JSON and project reorganised (`web/js`, `web/css`, build scripts); trend scan of six more variables and global trend map; Top trends; place names from Natural Earth; light redesign; guided demo with pause; speed work; tests and documents updated |
| Sat 14 Nov, from 22:00 (during the event) | fifth version from the team's list `Correcciones_2.docx`: quieter globe colours (land and sea in different tones), no flicker in the trend layer, darker page with soft nebula shapes, outlook and warning card with one recommendation (`outlook()` in `web/js/app.js`), problem / solution / impact in the welcome window |
| Sat 14 – Sun 15 Nov | *to be completed by the team: what else was built, changed or checked during the event* |

Everything dated before 09:00 on 14 November is prior work and is declared as such.

## What was checked by a person

*To be completed by the team before submission (for example: re-ran the tests, opened the app on two laptops, checked the numbers of the three cases, tried five live places).*
