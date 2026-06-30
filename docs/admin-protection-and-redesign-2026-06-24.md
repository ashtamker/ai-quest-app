# AI Quest — Admin Redesign + Instructor/Admin Protection (2026-06-24)

## Implemented

### Staff access protection
- Added a staff access gate before loading `#instructor` and `#admin` routes.
- Code is stored in `sessionStorage` for the current browser session only.
- Added logout button on staff routes.
- Admin login can also access instructor dashboard during the same session.
- Default accepted code is the event checkpoint/staff code from `events.json`: `AI2026`.
- Server can also use environment variables:
  - `AI_QUEST_INSTRUCTOR_CODE`
  - `AI_QUEST_ADMIN_CODE`

### Server-side protection
Protected endpoints now require `x-ai-quest-code`:
- Admin:
  - `GET /api/state`
  - `POST /api/admin/reset-runtime`
  - `POST /api/admin/companies`
  - `POST /api/admin/questions`
  - `POST /api/admin/model-problems`
- Instructor:
  - `GET /api/events/:eventId/teams`
  - `POST /api/events/:eventId/message`
  - `GET /api/submissions`
  - `PATCH /api/submissions/:id/review`
  - `POST /api/teams/:id/checkpoint-review`
  - `POST /api/teams/:id/message`
  - `POST /api/teams/:id/bonus`
  - `POST /api/teams/:id/reset`

Public/student endpoints remain available:
- Health/config/event lookup.
- Team creation/session.
- Student team fetch/save.
- Student logo/checkpoint upload and submissions.

### Admin redesign
- Replaced the huge all-at-once admin grid with a focused management dashboard.
- Added admin tabs:
  - Questions
  - Companies
  - Model Problem
  - Tools
- Added dashboard KPIs:
  - Companies count
  - Questions count
  - Abilities count
  - Missing translation/explanation count
- Added question management improvements:
  - Search by company/question/id.
  - Filter by company.
  - Filter by question type.
  - Question list with compact cards.
  - Focused editor for one selected/new question.
- Added company management improvements:
  - Search companies.
  - Compact company list with question count.
  - Focused company editor.
- Added tools section:
  - Reset runtime data.
  - Download JSON snapshot.
- Added responsive styling for mobile/tablet staff use.

## Files changed
- `server.mjs`
- `src/app/main.js`
- `src/data/repositories/ApiRepositories.js`
- `src/presentation/admin/AdminApp.js`
- `styles.css`
- `index.html`
- `tests/api-flow.test.mjs`

## QA

### Syntax + domain/API tests
Command:
```bash
npm test
```
Result:
- 6/6 tests passed.
- Covered:
  - Public assets and prefixed Opal paths.
  - Admin state blocked without code and allowed with admin code.
  - Arabic student journey.
  - Photo review and reset requiring instructor code.
  - Checkpoint approval requiring instructor code.
  - Admin write blocked without code and persisted with admin code.
  - Domain checkpoint/puzzle tests.
  - Hebrew/Arabic dictionary parity.
  - Arabic content coverage.

### Manual API auth smoke
Temporary local server checked:
- `GET /api/state` without code → `401`.
- `GET /api/events/by-code/GAVYAM` remains public → `200`.
- `GET /api/events/event-gav-yam/teams` without code → `401`.
- Same endpoint with `AI2026` → `200`.
- `GET /api/state` with `AI2026` as admin → `200`.
- `POST /api/admin/questions` without code → `401`.

## Notes
- This is basic operational protection, not enterprise-grade authentication.
- For real deployment, recommended next hardening step is separate instructor/admin codes through environment variables and optionally hide staff navigation links from student mode.
