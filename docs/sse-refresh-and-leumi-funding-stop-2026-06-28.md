# SSE refresh + Bank Leumi funding stop — 2026-06-28

## Changes

### Student live sync
- Student fallback polling changed from 8 seconds to 60 seconds.
- Added server-sent events (SSE) endpoint: `GET /api/teams/:id/stream`.
- Student UI connects with `EventSource` when available.
- When a team changes on the server, the server sends `team-update`; other devices in the same team refresh immediately.
- Added manual “רענון נתונים” button in the student header.
- `CalculateModelQuality` now saves only when the calculated value changes, preventing refresh loops.

### Bank Leumi funding stop
- Added additional non-blocking photo stop:
  - `funding_photo` after 7 completed companies by default.
  - Title: `מימון מבנק לאומי`.
  - Prompt: the team received funding and must photograph/upload a Bank Leumi logo.
- Default `GAVYAM` stops are now:
  1. `food_photo:4`
  2. `funding_photo:7`
  3. `instructor_approval:10`
  4. `instructor_approval:17`
  5. `instructor_approval:24`
- Admin event editor now supports 5 managed stops and includes type `funding_photo`.

## QA
- `npm test`: 41/41 passed.
- Cache-busting updated to `20260628-sse-refresh-leumi-stop`.
- Live Node API restarted.
- Live `/api/health` returned 200.
- Live frontend version verified.
- Live `GAVYAM` stops verified: `food_photo:4,funding_photo:7,instructor_approval:10,instructor_approval:17,instructor_approval:24`.
- Live SSE endpoint verified with `text/event-stream`.
- Live SSE behavior verified: completing a company for a test team emitted `event: team-update` with reason `company-completed`.
