# Login Event Code Fix

Date: 2026-06-24

## Problem

User still saw: “קוד אירוע לא נמצא. נסו GAVYAM” even though the live API had an active `GAVYAM` event.

## Root cause found

The server accepted `GAVYAM` and `gavyam`, but rejected codes with leading/trailing spaces, e.g. `GAVYAM ` or ` GAVYAM`. On mobile this can happen through paste/autocomplete/invisible whitespace.

## Fix

- Normalize event code on client before lookup/create:
  - remove all whitespace
  - trim
  - case-insensitive lookup
- Normalize event code in API repository.
- Normalize event code in localStorage fallback repository.
- Normalize event code in server endpoints:
  - `GET /api/events/by-code/:code`
  - `POST /api/teams/session`
- Added cache-busting query to `index.html` script/style links so browsers fetch the new client code.

## Verification

Passed:

- `npm test`
- Module imports for use cases and repositories
- Local server join smoke test with:
  - `GAVYAM`
  - `GAVYAM `
  - ` GAVYAM`
  - `GAV YAM`
- Live index now references `main.js?v=20260624-1002` and `styles.css?v=20260624-1002`.

## Note

The already-running live Node server may not pick up server-side normalization until restarted by its host manager, but the cache-busted frontend now sends normalized event codes, which should resolve the user-facing login issue.
