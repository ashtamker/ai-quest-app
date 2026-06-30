# Station Knowledge/Model Labels — 2026-06-28

## User request
- Keep points for every completed company.
- Show students clearly whether a station strengthens the model or adds knowledge/points.
- Do not use the word “אקוסיסטם” in student-facing wording.

## Implementation
- Added `stationType` to company data:
  - `model`: completion gives points and model abilities.
  - `knowledge`: completion gives points and knowledge, but does not add direct model abilities.
- Default/fallback remains `model` for companies without explicit classification.
- Student company cards and task hero now show simple labels:
  - `מחזק מודל + ניקוד`
  - `ידע + ניקוד`
- Company task ability section changes for knowledge stations: it explains that the station adds team knowledge and points, but not a direct model ability.
- Success screen also adapts copy for knowledge stations.
- Scoring is preserved for all companies.

## Classified as knowledge + points
- `ecosystem`, `agmon-with-tulchinsky`, `bgn`, `brooks-keret`, `cbg`, `cyber-bgu`, `ilanot`, `pwc-israel`, `spark-marketing-il`, `tech7`, `tech19`, `wework`.

## Notes
- Some user-mentioned stations are not current company cards in the data bank, e.g. Leumi is currently a funding-photo stop rather than a regular company card.
- Several mentioned names such as Mandel/Merage/DesertTech/EcologyWise were not present in the current company bank, so they were not invented/added in this change.

## QA
- `npm test` passed: 43/43.
- Live cache version: `20260628-station-knowledge-model-labels`.
- Live Node API restarted.
- Live smoke verified `/api/health`, cache version, student source markers for labels, and live data counts: 53 model stations, 12 knowledge stations.
