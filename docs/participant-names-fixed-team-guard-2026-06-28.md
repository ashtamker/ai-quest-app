# Participant Names + Fixed Team Guard — 2026-06-28

## What changed
- Student join form now asks for a personal name/nickname in addition to fixed team and team password.
- `CreateTeamSession` forwards `participantName` to the repository/API.
- Server records participants on the stable fixed-team record (`participants[]`) instead of creating separate/free teams.
- Rejoining the same fixed team with another participant name appends/updates the participant list while preserving the same team id.
- Instructor team cards now show a "משתתפים בצוות" / Arabic equivalent list.
- For events with fixed `teamAccess` (including `GAVYAM`), the server now rejects joins without a selected valid team (`team_required`) and rejects missing participant name (`participant_name_required`).
- Instructor team listing filters out invalid legacy/free teams for fixed-team events, so unnamed/invalid records are not shown in the dashboard.

## QA
- `npm test` passed: 42/42.
- Live restarted with cache version `20260628-participant-names-fixed-teams`.
- Live smoke verified:
  - `/api/health` returns 200.
  - `GAVYAM` join without fixed team returns `400 team_required`.
  - wrong red-team password returns `401 invalid_team_password`.
  - correct password without participant name returns `400 participant_name_required`.
  - live student JS includes `participantName`.
  - live instructor JS includes `participantsList`.
  - instructor live team list returns no unnamed/invalid teams after filtering.

## Notes
- Live smoke intentionally avoided a successful test join to prevent adding artificial participant names to the real event dashboard.
