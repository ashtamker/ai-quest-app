# Admin Station Type Control + Leaderboards — 2026-06-28

## User questions/request
- Asked whether instructor/admin have a score table after the game ends.
- Asked how admin can manage which companies are `מחזק מודל + ניקוד` vs `ידע + ניקוד`.
- Requested admin management for this classification.

## Implementation
- Added an Admin tab: `ניקוד`, showing a leaderboard table sorted by score.
- Added an Instructor leaderboard table near the top of the dashboard, showing team rank, score, completed companies, model abilities, and participants.
- Added `סוג תחנה` field to the Admin company editor:
  - `מחזק מודל + ניקוד` (`stationType: model`)
  - `ידע + ניקוד` (`stationType: knowledge`)
- Company list in Admin now shows each company’s station type.
- Existing JSON/CSV export remains available from the Events tab.

## QA
- `npm test` passed: 44/44.
- Live cache version: `20260628-admin-station-type-leaderboard`.
- Live Node API restarted.
- Live smoke verified `/api/health`, cache version, admin source markers (`name="stationType"`, `טבלת ניקוד`, labels), and instructor source markers (`leaderboard(teams, tr)`, `leaderboard-table`).
