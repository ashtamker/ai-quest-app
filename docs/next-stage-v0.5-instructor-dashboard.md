# AI Quest v0.5 — Instructor Dashboard Upgrade

Date: 2026-06-24

## Completed

- Added instructor dashboard auto-refresh every 15 seconds.
- Added persistent dashboard search and filters:
  - action required
  - checkpoints
  - stuck teams
  - photos
  - invalid photos
  - all teams
- Added bulk instructor messages:
  - message all visible/filtered teams
  - message all teams in the event
- Added team reset flow:
  - reset one team from the dashboard
  - clears progress, score, completed companies, abilities, repairs, checkpoint state and team submissions
  - keeps the team session alive with a reset message
- Kept runtime-wide reset behind confirmation.
- Improved photo review behavior:
  - marking a photo invalid now sends a team message
  - removes that company from completed companies
  - recalculates abilities based on remaining completed companies
  - subtracts awarded task points and photo completion points
  - surfaces invalid photos in a dedicated dashboard tab
- Added API endpoints:
  - `POST /api/events/:eventId/message`
  - `POST /api/teams/:teamId/reset`
- Added localStorage fallback methods for the same capabilities.

## Verification

- `npm test` passed.
- Module imports passed for InstructorApp and repositories.
- Local API smoke test passed:
  - `GET /api/health`
  - create test team
  - send group message
  - reset team
- Smoke-test runtime data was cleaned after verification.

## Next recommended stage

Implement checkpoint rules by activity duration: 60/90/135 minutes, including required completed-company counts, stages, and repair requirements.
