# AI Quest — Production Sprint 4: Final Mission + Model Readiness Gate (2026-06-24)

## Goal
Close the game flow with a clear instructor/admin-controlled ending and a final mission.

The final mission is to build an improved AI model that solves the opening problem: helping students discover a suitable future technology field, while using the abilities collected during the company exploration.

## Implemented

### 1. Instructor/Admin can end the activity
Added event finalization:
- Instructor dashboard button: `סיים פעילות ופתח משימה סופית`.
- Admin event editor button: `סיים פעילות ופתח משימה סופית`.

When triggered:
- The event gets `finalizedAt`.
- Teams receive a message that exploration ended.
- Student company exploration is replaced with the final mission screen.

Server endpoint:
- `POST /api/events/:id/finalize`
- Requires staff code; instructor and admin codes are accepted.

Repository method:
- `finalizeEvent(eventId)` in API and local demo repositories.

### 2. Final mission gate
Teams can build the improved model only if they completed:

> At least 3 companies in every required ability domain.

Current required domains:
- Data
- Security
- UX
- Recommendation
- Ethics / Privacy

The student final screen shows progress per domain as `x/3`.

If ready:
- They see the final Base44 prompt.
- Prompt instructs them to build the improved AI model for the opening problem.

If not ready:
- They see which domains are incomplete.
- They can still present what they achieved, but the final model prompt is locked.

### 3. Model repair rule tightened
`RepairModel` now succeeds only when:
- The team is ready for the final mission, meaning 3 companies per required domain.
- The selected abilities include at least 3 required domains.

Successful repair now grants 25 points instead of the earlier looser 15-point rule.

### 4. Company/ability coverage verified
Audit showed `recommendation` had only 1 company originally.

Added recommendation relevance to additional suitable companies:
- 2bPrecise
- HyperGuest
- Lightricks
- Microsoft
- Wix
- Plus existing Taboola

Final active company-bank coverage:
- Data: 20 companies
- Security: 10 companies
- UX: 5 companies
- Recommendation: 6 companies
- Ethics: 15 companies

Also updated duration-based company selection to ensure each activity list includes at least 5 companies for every required ability domain.

Verified selected-list coverage:
- 60 min: Data 11, Security 8, UX 5, Recommendation 5, Ethics 5
- 90 min: Data 13, Security 8, UX 5, Recommendation 5, Ethics 5
- 135 min: Data 20, Security 10, UX 5, Recommendation 6, Ethics 15

### 5. Student final mission UI
Updated final screen:
- New title: `המשימה הסופית: בונים מודל משופר`.
- Shows readiness by domain.
- Shows strengths/weaknesses.
- Shows completed companies and puzzle progress.
- Locks or unlocks final prompt based on readiness.

### 6. Cache busting
Updated frontend cache version:
- `20260624-production-sprint4`

## Files changed
- `server.mjs`
- `src/domain/use-cases/useCases.js`
- `src/presentation/student/StudentApp.js`
- `src/presentation/instructor/InstructorApp.js`
- `src/presentation/admin/AdminApp.js`
- `src/data/repositories/ApiRepositories.js`
- `src/data/repositories/Repositories.js`
- `src/infrastructure/i18n/translations.js`
- `server/data/companies.json`
- `src/data/data-sources/local/seed.js`
- `styles.css`
- `index.html`
- `tests/domain.test.mjs`
- `tests/api-flow.test.mjs`
- `tests/static-mobile.test.mjs`

## QA
Command:
```bash
npm test
```

Result:
- 35/35 tests passed.

New coverage:
- Event finalization requires staff access.
- Instructor can finalize event.
- Student config receives `event.finalizedAt`.
- Final mission requires 3 completed companies in each required domain.
- Each required domain has at least 5 active companies in the bank.
- RepairModel only succeeds for final-mission-ready teams.
- Admin/instructor UI exposes finalization controls.
