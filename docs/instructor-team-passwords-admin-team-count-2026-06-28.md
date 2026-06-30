# Instructor Team Passwords + Admin Team Count — 2026-06-28

## Request
- Show fixed-team passwords to the instructor in the instructor dashboard.
- Let Admin manage the number of teams, including more than the default 6 teams.

## Implementation
### Instructor
- Added a protected staff API endpoint:
  - `GET /api/staff/events/:id/team-access`
- Requires instructor/admin staff code.
- Returns team id, name, and password for instructor use.
- Student/public team access remains password-free:
  - `GET /api/events/:id/team-access` returns only id/name.
- Added Instructor dashboard card: `צוותים וסיסמאות`.

### Admin
- Replaced the simple password-only editor with full team access management:
  - edit team id
  - edit team name
  - edit password
  - mark team for deletion
  - add a chosen number of new teams on save
- New team defaults are generated as:
  - id: `teamN`
  - name: `צוות N`
  - password: `TN123!` style
- Server sanitizes/saves team access with unique ids and keeps passwords intact, including `!`.

## Safety
- Public/student team list does not expose passwords.
- Instructor password list requires staff code.
- Existing fixed-team passwords restored and verified:
  - red `R4821`
  - white `W7394`
  - blue `B5168`
  - green `G2947`
  - yellow `Y8635`
  - purple `P1476`

## QA
- `npm test` passed: 47/47.
- Added API test verifying Admin can configure 8 teams and students can join the 8th team.
- Added API check verifying public team access hides passwords and staff team access exposes passwords.
- Live cache version: `20260628-team-passwords-admin-team-count`.
- Live Node API restarted.
- Live smoke verified:
  - `/api/health` OK.
  - frontend cache version updated.
  - public team access: 6 teams, no password field.
  - staff team access: 6 teams, red password `R4821`.
  - Admin source includes `teamAccessEditor` and `addTeamCount`.
