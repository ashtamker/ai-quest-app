# Instructor live refresh + student team banner — 2026-06-28

## Changes

### Instructor dashboard live refresh
- Added event-level SSE endpoint: `GET /api/events/:id/stream`.
- Instructor dashboard connects with `EventSource` and refreshes on `event-update`.
- Server emits event updates when teams change, including company completion, team joins, resets, AI helper, checkpoints, messages, photo review/delete/upload, pause/resume, and finalization.
- Existing auto-refresh remains as fallback.

### Student team name visibility
- Added a prominent top banner under the student header:
  - `אתם משחקים בתור <team name>`
- This is visible for every team so students can confirm which team/device they are using.

## QA
- `npm test`: 41/41 passed.
- Cache-busting updated to `20260628-instructor-live-refresh-team-banner`.
- Live Node API restarted.
- Live `/api/health` returned 200.
- Live frontend version verified.
- Live InstructorApp JS verified includes `ensureLiveStream`.
- Live CSS verified includes `student-team-banner`.
- Live event SSE endpoint verified with `text/event-stream`.
- Live behavior verified: completing a company for test team emitted `event: event-update` with reason `company-completed` on `/api/events/event-gav-yam/stream`.
