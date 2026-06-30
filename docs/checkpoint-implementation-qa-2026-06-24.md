# AI Quest — Checkpoint + Digital Puzzle Implementation QA (2026-06-24)

## Implemented
- Added checkpoint plan engine in `src/domain/use-cases/useCases.js`.
- Checkpoint plans adapt by activity duration:
  - 60 min: one food checkpoint after 4 companies.
  - 90 min: food checkpoint after 3 companies, instructor checkpoint after 6 companies.
  - 135 min: food checkpoint after 4 companies, instructor checkpoints after 8 and 12 companies.
- Food checkpoint is one-time only, because approved checkpoint IDs are tracked and skipped.
- Added digital puzzle pieces granted only after instructor approval.
- Student UI now shows:
  - Next checkpoint when threshold is reached.
  - Food photo upload for `food_photo` checkpoint.
  - Pending approval message.
  - Digital puzzle board in the model bag / checkpoint area.
- Instructor dashboard now shows:
  - Pending checkpoint details.
  - Checkpoint type.
  - Puzzle piece to grant.
  - Food checkpoint photo when submitted.
  - Approval button grants the piece and advances team stage.
- JSON API/server now persists:
  - `checkpoints[]`
  - `puzzlePieces[]`
  - uploaded food-checkpoint photo URL
  - checkpoint request/review history
- LocalStorage repository fallback now supports the same checkpoint/review behavior.
- Cache-busting updated in `index.html` to `20260624-checkpoints`.

## Files changed
- `server.mjs`
- `src/domain/use-cases/useCases.js`
- `src/data/repositories/ApiRepositories.js`
- `src/data/repositories/Repositories.js`
- `src/presentation/student/StudentApp.js`
- `src/presentation/instructor/InstructorApp.js`
- `styles.css`
- `index.html`
- `tests/domain.test.mjs`

## QA performed

### Static/runtime checks
Command:
```bash
node --check src/domain/use-cases/useCases.js \
  && node --check src/presentation/student/StudentApp.js \
  && node --check src/presentation/instructor/InstructorApp.js \
  && node --check src/data/repositories/ApiRepositories.js \
  && node --check src/data/repositories/Repositories.js \
  && node --check server.mjs \
  && npm test
```
Result:
- Passed.
- `domain tests passed 58 checkpoints 2`.

### Domain regression tests added
- First 90-minute checkpoint is `cp-food` / `food_photo`.
- Food checkpoint request sets status to `requested`.
- Instructor approval grants puzzle piece `טעינה`.
- Food checkpoint does not repeat after approval.
- After six companies, second checkpoint is `cp-progress-2`.
- Second approval grants puzzle piece `בקרה`.

### API integration QA
Temporary local server:
```bash
PORT=4174 node server.mjs
```
API flow exercised with `ApiRepositories` + use-cases:
1. Created team with normalized event code containing spaces: ` G A V Y A M `.
2. Completed 3 companies with photo submissions.
3. Confirmed next checkpoint is food checkpoint.
4. Submitted food checkpoint with uploaded photo blob.
5. Confirmed server stored requested checkpoint and photo URL.
6. Approved checkpoint as instructor.
7. Confirmed puzzle piece `טעינה` was granted.
8. Confirmed food checkpoint did not repeat.
9. Completed 3 more companies.
10. Confirmed second checkpoint appears.
11. Requested and approved second checkpoint.
12. Confirmed puzzle piece `בקרה` was granted.
13. Reviewed a company photo as invalid.
14. Confirmed team was moved to photo repair list.

Result:
```json
{
  "ok": true,
  "companies": 6,
  "pieces": ["טעינה", "בקרה"],
  "invalidPhotoRepair": true
}
```

## Notes / remaining follow-up
- Full browser/manual QA on the live Opal URL is still recommended after the live Node host reloads server-side changes.
- Admin grid redesign remains deferred.
- Final puzzle is currently a clear digital puzzle board/placeholder, not a full puzzle mini-game.
