# Active Event Dropdown — 2026-06-29

## Change
- Added public `GET /api/events/active` endpoint returning active events with public team access only (no passwords).
- Added `listActiveEvents()` to API and local repositories.
- Student join screen now loads active events before team selection.
- If more than one active event exists, students choose the event from a dropdown.
- Team dropdown updates according to the selected event.
- If only one active event exists, the event code is hidden and displayed as a simple event label.

## Safety
- Public event/team lists do not expose team passwords.
- Team session creation still validates event code, selected team, personal name, and team password server-side.
- Existing fixed-team separation by `eventId` remains unchanged.

## QA
- `npm test` passed: 48/48.
- Live API restarted on port 4173.
- Live smoke verified:
  - `/api/health` OK.
  - `/api/events/active` returns active event codes and no team passwords.
  - `index.html` cache version: `20260629-active-event-dropdown`.
  - live StudentApp source includes `listActiveEvents`, `eventCodeSelect`, and `teamAccessSelect`.
