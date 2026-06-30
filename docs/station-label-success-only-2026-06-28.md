# Station Label Success-Only UI — 2026-06-28

## User feedback
- Screenshot showed that station labels on company cards made the design feel cluttered.
- User requested not to show the model/knowledge message on the company card; show it only after students answer/complete the company.

## Change
- Removed `מחזק מודל + ניקוד` / `ידע + ניקוד` labels from company cards.
- Removed pre-completion station-type notice from the company task hero.
- Replaced the pre-completion ability/knowledge reveal with neutral copy: students will see what the station added after submitting the task.
- Kept the success screen distinction:
  - Model stations show model-strengthening abilities.
  - Knowledge stations show that they added knowledge and points.

## QA
- `npm test` passed: 43/43.
- Live cache version: `20260628-station-label-success-only`.
- Live Node API restarted.
- Live smoke verified `/api/health`, cache version, no card/hero station-label source markers, and success-screen knowledge message still present.
