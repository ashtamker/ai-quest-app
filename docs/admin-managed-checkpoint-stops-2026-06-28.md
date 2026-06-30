# Admin-managed checkpoint stops — 2026-06-28

## Change
Added event-level checkpoint stop management in Admin.

Default live `GAVYAM` stops:
1. Food/photo break after 4 completed companies — non-blocking, auto-approved.
2. Instructor checkpoint after 10 completed companies — blocking until instructor approval.
3. Instructor checkpoint after 17 completed companies — blocking until instructor approval.
4. Instructor checkpoint after 24 completed companies — blocking until instructor approval.

## Admin UI
Admin → Events now includes a “עצירות וצ׳קפוינטים” section with 4 stop rows.
Each stop can be configured by:
- Type: food/photo break or instructor approval checkpoint
- Threshold: after how many completed companies
- Title

## Runtime behavior
Student checkpoint logic now reads the event `checkpointConfig.stops` instead of hardcoded thresholds.
Food/photo stops are auto-approved and non-blocking.
Instructor checkpoints remain blocking until instructor approval.

## QA
- `npm test`: 41/41 passed.
- Cache-busting updated to `20260628-admin-checkpoint-stops`.
- Live Node API restarted.
- Live `/api/health` returned 200.
- Live `GAVYAM` config verified stops: `food_photo:4,instructor_approval:10,instructor_approval:17,instructor_approval:24`.
