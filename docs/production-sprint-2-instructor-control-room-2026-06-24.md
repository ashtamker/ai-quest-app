# AI Quest — Production Sprint 2: Instructor Control Room (2026-06-24)

## Goal
Upgrade the instructor dashboard from a basic dashboard to a practical field control room for a live 50-student activity with teams of 5–6 students.

## Implemented

### 1. Treatment queue
Added a top-level “תור טיפול עכשיו” / field treatment queue.

Priority order:
1. Teams waiting at instructor checkpoint.
2. Teams with pending photo review.
3. Teams that appear stuck.
4. Other active items.

Each queue item shows:
- Team name.
- Current status.
- Waiting/activity time.
- Completed company count.

Clicking a queue item scrolls to the relevant team card.

### 2. Priority scoring
Added `priorityScore()` to rank action items.

The score gives higher priority to:
- Pending checkpoint.
- Pending photo review.
- Stuck teams.
- Longer checkpoint waiting time.

### 3. Expanded team card
Team cards now show more operational context:
- Current status.
- Companies completed.
- Score.
- Abilities collected.
- Puzzle pieces collected.
- Waiting time / last activity.
- Current checkpoint details.
- Instructor checklist text.
- Recent completed companies.
- Recent messages.

### 4. Faster field actions
Added quick action:
- “הודעה מהירה” / quick message — sends a ready-made message telling the team to come to the instructor checkpoint.

Kept existing actions:
- Approve checkpoint.
- Reject checkpoint with note.
- Bonus.
- Custom message.
- Reset team.

### 5. Control room styling
Added CSS for:
- Control-room hero.
- Treatment queue panel.
- Queue items by status.
- Expanded team detail grid.
- Checkpoint waiting badge.
- Mobile/tablet responsiveness.

### 6. Bug fix
Fixed `bind()` to receive `tr` translation object properly. Before this sprint, some instructor action prompts relied on `tr` without it being passed into scope.

## Files changed
- `src/presentation/instructor/InstructorApp.js`
- `styles.css`
- `tests/static-mobile.test.mjs`
- `index.html`

## QA
Command:
```bash
npm test
```

Result:
- 28/28 tests passed.

New coverage:
- Instructor dashboard exposes control-room surfaces:
  - `priorityScore`
  - `treatmentQueue`
  - `data-focus-team`
  - `team-detail-grid`
  - `data-quick-message`
- CSS includes Production Sprint 2 control-room styles.

## Remaining recommended next sprint
Sprint 3 — Admin product shelf readiness:
- Event management.
- Per-event codes.
- Active company selection.
- Duplicate/reset event.
- Export results groundwork if time permits.
