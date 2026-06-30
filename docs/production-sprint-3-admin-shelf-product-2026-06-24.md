# AI Quest — Production Sprint 3: Admin Shelf-Product Readiness (2026-06-24)

## Goal
Move the admin dashboard from content editing only toward shelf-product operation for repeated events.

Sprint 3 focuses on:
- Event management.
- Per-event codes.
- Active company selection.
- Event duplication.
- Results export groundwork.

## Implemented

### 1. Admin Events tab
Added a new Admin tab: `אירועים`.

The tab shows:
- Existing events.
- Event code.
- Active company count.
- Instructor code.
- Admin code.
- Active/inactive status.

### 2. Event editor
Admin can now edit/create event-level settings:
- Event name.
- Student event code.
- Instructor code.
- Admin code.
- Available durations.
- Active/inactive status.
- Active companies for the event.

The active company picker allows selecting which companies appear in that event.

### 3. Event duplication
Admin can duplicate an existing event.

Behavior:
- Prompts for a new event code.
- Creates a copy as inactive by default.
- Preserves company selection, durations, model problem, and code structure.

### 4. Results export groundwork
Added event results export endpoints and admin UI actions:
- Export JSON.
- Export CSV.

Result rows include:
- Team ID/name.
- Language.
- Duration.
- Participant count.
- Score.
- Completed companies count.
- Abilities count.
- Puzzle pieces count.
- Approved/rejected checkpoints.
- Photo retake count.
- Created/last activity timestamps.

### 5. Server endpoints
Added admin-only endpoints:
- `POST /api/admin/events`
- `POST /api/admin/events/:id/duplicate`
- `GET /api/admin/events/:id/results`
- `GET /api/admin/events/:id/results?format=csv`

Instructor code cannot use these endpoints.

### 6. Repository support
Added support in both API and explicit local demo repository:
- `saveEvent()`
- `duplicateEvent()`
- `eventResults()`

### 7. Styling
Added CSS for:
- Events admin split layout.
- Active company picker grid.
- Mobile-friendly event management controls.

### 8. Cache busting
Updated frontend cache version:
- `20260624-production-sprint3`

## Files changed
- `server.mjs`
- `src/data/repositories/ApiRepositories.js`
- `src/data/repositories/Repositories.js`
- `src/presentation/admin/AdminApp.js`
- `styles.css`
- `index.html`
- `tests/api-flow.test.mjs`
- `tests/static-mobile.test.mjs`

## QA
Command:
```bash
npm test
```

Result:
- 30/30 tests passed.

New coverage:
- Admin can manage events.
- Instructor code cannot manage events.
- Admin can duplicate event.
- Event code lookup works after update.
- Event results JSON export works.
- Event results CSV export works.
- Static tests verify admin event-management UI and repository surfaces.

## Remaining recommended next sprint
Sprint 4 — Puzzle + reports polish:
- Define puzzle image and number of pieces.
- Add puzzle configuration to event/admin.
- Improve results report UI beyond raw export.
- Add teacher-facing summary report.
