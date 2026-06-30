# AI Quest — Blocking Instructor Checkpoints + Non-Blocking Food Break (2026-06-24)

## User decision
- Food break is **not** an instructor checkpoint.
- Food break should be only a photo upload and then the team can continue.
- All other checkpoints require the team to physically reach the instructor.
- While a team is at an instructor checkpoint, it must not continue exploring companies until the instructor approves in the dashboard.
- Checkpoint schedule:
  - First checkpoint after 4 completed companies.
  - Second checkpoint after 6 more companies: 10 total.
  - Then every 7 additional companies: 17, 24, 31, etc., until the activity/company list ends.
- Puzzle image and number of pieces should be configurable later by decision; do not hard-code a final image.

## Implemented behavior
### Student side
- Food break appears as a one-time non-blocking upload after 2 completed companies.
- After uploading a restaurant/cafe logo photo, the food break is auto-approved and the team can keep playing.
- Instructor checkpoints now act as a real gate:
  - At threshold 4, 10, 17, etc., the company list is hidden/locked.
  - The student sees a clear checkpoint screen telling them to go to the instructor.
  - They can request checkpoint review.
  - After requesting, the screen says it is waiting for instructor approval.
  - They cannot continue exploring companies until approval.

### Instructor side
- Dashboard continues to show teams with `checkpointStatus: requested`.
- Instructor approves/rejects from the dashboard.
- Approval grants the next digital puzzle piece and lets the team continue.
- Rejection leaves a message for the team.
- Fixed several UI text interpolation bugs in instructor actions/prompts.

### Domain rules
- `checkpointPlan()` now generates instructor checkpoints dynamically:
  - 4, 10, 17, 24, ...
- Puzzle pieces are currently named by sequence:
  - Hebrew: `חלק 1`, `חלק 2`, ...
  - Arabic: `قطعة 1`, `قطعة 2`, ...
- Added `foodBreakPlan()`, `nextFoodBreak()`, and `RequestFoodBreak`.
- Food break records as an approved checkpoint-like record with `autoApproved: true`, but does not set `checkpointStatus: requested` and does not enter the instructor queue.

## Files changed
- `src/domain/use-cases/useCases.js`
- `src/presentation/student/StudentApp.js`
- `src/presentation/instructor/InstructorApp.js`
- `src/data/repositories/ApiRepositories.js`
- `src/data/repositories/Repositories.js`
- `src/infrastructure/i18n/translations.js`
- `server.mjs`
- `tests/domain.test.mjs`
- `index.html`

## QA
Command:
```bash
node --check src/domain/use-cases/useCases.js && \
node --check src/presentation/student/StudentApp.js && \
node --check src/presentation/instructor/InstructorApp.js && \
node --check server.mjs && \
npm test
```

Result:
- 26/26 tests passed.

New/updated coverage:
- Instructor checkpoints trigger at 4, 10, and 17.
- Pending instructor checkpoint blocks progression until approval.
- Food break is auto-approved and non-blocking.
- Arabic checkpoint labels/pieces still work.
