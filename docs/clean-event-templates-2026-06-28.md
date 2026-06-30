# Clean Event Templates — 2026-06-28

## User question
- Asked whether creating a new event as Admin preserves all settings, especially after using duplicate.

## Findings
- Event duplication already copied most configuration: active companies, checkpoint stops, team access/passwords, durations, puzzle config, codes/settings.
- Creating a brand new event from the Admin button used default settings rather than the currently selected event settings.
- Duplication could also carry live state fields from the source event, such as paused/finalized status, which is undesirable for a clean new event.

## Change
- Admin “אירוע חדש” now opens a clean template based on the currently selected/active event settings.
- New event template preserves configuration such as:
  - active company list
  - checkpoint stops
  - team access/password setup
  - durations/languages
  - selected model problem
  - puzzle config
- New event template resets runtime state:
  - new event code is blank and must be chosen
  - inactive by default
  - `gameStatus: running`
  - no `finalizedAt`/`pausedAt`
- Duplicate event API now creates a clean copy of settings and also resets runtime state to running/unfinalized/unpaused.

## QA
- `npm test` passed: 44/44.
- Live cache version: `20260628-clean-event-templates`.
- Live Node API restarted.
- Live smoke verified `/api/health`, cache version, and live Admin source markers `newEventTemplate`, `currentEvent`, and `gameStatus: 'running'`.
