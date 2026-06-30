# AI Quest — Game Pause, Photo Delete, AI Helper, Checkpoint Clarification (2026-06-28)

## User requests handled
- Instructor/Admin can stop a specific game so students cannot complete tasks.
- Confirm event code `GAVYAM` still works.
- Instructor dashboard can delete uploaded photos.
- Add an in-game AI helper once the game starts.
- AI helper answers questions about companies, app flow, and stuck teams.
- AI helper encourages students to ask about companies in the park.
- Teams using AI helper receive bonus points.
- Clarify current checkpoint behavior and ensure it supports physical instructor approval before companies reopen.

## Implemented behavior

### Event pause / stop
- Added event-level `gameStatus`: `running` / `paused`.
- `GAVYAM` still resolves while paused; this is intentional so existing teams can load the app and see the pause message.
- When paused:
  - `POST /api/teams/:id/complete-company` returns `423 game_paused`.
  - `POST /api/teams/:id/checkpoint-request` returns `423 game_paused`.
  - `POST /api/teams/:id/ai-helper` returns `423 game_paused`.
  - Student UI hides company completion flow and shows a pause message.
- Instructor dashboard has a button: “עצור משחק זמנית” / “פתח משחק מחדש”.
- Admin event editor has a checkbox to pause/unpause the event.
- Pause/resume sends messages to all teams.

### Instructor photo delete
- Added `DELETE /api/submissions/:id` with instructor/admin staff access.
- Instructor dashboard photo cards now include “מחק תמונה”.
- Deleting a photo removes the submission/photo record from dashboard review.
- Deleting a photo does not remove completed company progress.

### In-game AI helper
- Added student-side helper card after game start.
- Teams can ask questions about a company, app flow, or being stuck.
- Helper currently answers from internal app/company data; it does not call an external model.
- First AI helper use awards +3 points once per team.
- Further helper uses answer without extra bonus.
- Server tracks `aiHelperUses` and `aiHelperBonusAwarded` on the team.

### Checkpoint current behavior
- Instructor checkpoint schedule remains:
  - after 4 completed companies,
  - then after 6 additional companies — 10 total,
  - then every 7 additional companies — 17, 24, 31, etc.
- When a checkpoint threshold is reached, student company exploration is locked.
- Student sees a checkpoint gate and must send a checkpoint request.
- Instructor dashboard shows the team as waiting for checkpoint.
- Instructor approves/rejects from dashboard.
- Approval increments stage and companies reopen.
- Rejection leaves the team blocked until they resolve it and request/return again.

## Files changed
- `server.mjs`
- `server/data/events.json`
- `src/data/data-sources/local/seed.js`
- `src/data/repositories/ApiRepositories.js`
- `src/data/repositories/Repositories.js`
- `src/presentation/student/StudentApp.js`
- `src/presentation/instructor/InstructorApp.js`
- `src/presentation/admin/AdminApp.js`
- `tests/api-flow.test.mjs`

## QA
Command:
```bash
npm test
```
Result:
- 41/41 tests passed.

New coverage added:
- `GAVYAM` still resolves while game is paused.
- Paused game blocks company completion.
- Resumed game allows completion again.
- Instructor can delete submitted photo records without changing company completion.
- AI helper answers from company data and awards one-time bonus.
