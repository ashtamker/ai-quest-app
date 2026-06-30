# AI Quest — Fixed Teams, Passwords, Optional Logo Bonus, Puzzle Toggle (2026-06-28)

## User requests handled
- Confirm live data storage is server-side rather than localStorage.
- Create 6 fixed teams with color names and initial passwords.
- Let students choose a team, enter its password, and join the shared team game.
- Support parallel work from multiple devices in the same team.
- Prevent already-completed companies from being completed/scored again.
- Disable final puzzle by default, with Admin ability to enable/disable and upload an image.
- Make company logo upload optional; completing a company is not blocked by missing logo.
- Award logo upload as a bonus only.

## Implemented behavior
- Production mode still requires the Node/JSON API server. If API health fails, the student UI stops instead of silently using localStorage. Local fallback remains only for explicit `?demo=1` / `?local=1`.
- Added `event.teamAccess` with six fixed teams:
  - צוות אדום — `R4821`
  - צוות לבן — `W7394`
  - צוות כחול — `B5168`
  - צוות ירוק — `G2947`
  - צוות צהוב — `Y8635`
  - צוות סגול — `P1476`
- Public event/team endpoints expose team IDs/names only, not passwords.
- Student join screen now shows team selection + team password.
- Correct password returns a stable shared team record like `event-gav-yam-red`; repeated logins to the same color reuse the same server-side team.
- Wrong team password is rejected.
- Admin event editor now shows team passwords so Admin can change them.
- Added instructor/admin API endpoint to change a team password: `POST /api/events/:id/team-password` with staff code.
- Added server-side atomic company completion endpoint: `POST /api/teams/:id/complete-company`.
  - Scores and completion are applied server-side.
  - If the company is already completed, it is not scored again.
  - This reduces race conditions when several devices in the same team work concurrently.
- Logo photo is optional in the student company task.
  - No logo photo: company can still be completed.
  - Logo photo uploaded: +5 logo bonus and submission appears for instructor review.
  - If instructor marks logo invalid, company remains completed and only logo bonus is removed/flagged for retake.
- Puzzle is disabled by default in event seed and runtime data.
  - Admin puzzle tab now has an enable/disable checkbox.
  - Puzzle UI is hidden from students unless enabled.

## Files changed
- `server.mjs`
- `server/data/events.json`
- `src/data/data-sources/local/seed.js`
- `src/data/repositories/ApiRepositories.js`
- `src/data/repositories/Repositories.js`
- `src/domain/use-cases/useCases.js`
- `src/presentation/student/StudentApp.js`
- `src/presentation/admin/AdminApp.js`
- `tests/api-flow.test.mjs`

## QA
Command:
```bash
npm test
```
Result:
- 38/38 tests passed.

New coverage added:
- Fixed event teams require passwords.
- Public team list does not expose passwords.
- Re-entering the same color team reuses the same shared server-side team record.
- Invalid logo photo no longer blocks company completion.
