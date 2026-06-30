# AI Quest — Official Logos, Admin Code, Question UI Fix (2026-06-24)

## User feedback handled
1. The previous logo support was not enough: the app showed fallback marks for many companies instead of official logos.
2. The question UI on the company task page was visually misaligned; radio circles were too large.
3. Admin code must be different from instructor code: `Admin1092`.

## Official logos
- Fetched the Gav Yam Negev companies page: `https://careers.gavyam-negev.co.il/portal/companies`.
- Extracted embedded company logos from the official Gav Yam Negev site into local files under:
  - `assets/company-logos/`
- Added source tracking file:
  - `server/data/gavyam-logo-sources.json`
- Updated `server/data/companies.json` so every company now has `logoUrl`.
- Updated local fallback seed:
  - `src/data/data-sources/local/seed.js`
- Added static server support for:
  - `/assets/company-logos/*`
  - `.svg` MIME type
- For `ecosystem / Innovation Center`, the Gav Yam companies page did not expose a distinct company logo. To avoid assigning an incorrect company logo, it uses the official Gav Yam Negev logo from the same official site.

## Admin code separation
- Instructor code remains: `AI2026`.
- Admin code is now: `Admin1092`.
- Server-side admin authorization now accepts only admin-specific codes for admin endpoints.
- Instructor code no longer opens admin endpoints.
- UI access-gate wording now distinguishes instructor and admin codes.

## Question UI polish
- Radio inputs are now custom-styled smaller circles.
- Answer options are aligned as clean selectable rows/cards.
- Checked state highlights the selected answer row.
- Mobile sizing was tightened so options stay readable and aligned.

## Files changed
- `server.mjs`
- `server/data/events.json`
- `server/data/companies.json`
- `server/data/gavyam-logo-sources.json`
- `src/data/data-sources/local/seed.js`
- `src/app/main.js`
- `styles.css`
- `index.html`
- `tests/api-flow.test.mjs`
- `assets/company-logos/*`
- `scripts/extract-gavyam-logos.mjs`

## QA
Command:
```bash
npm test
```
Result:
- 26/26 tests passed.

Additional coverage added:
- Verifies every company in state has `logoUrl`.
- Verifies at least one served logo asset returns HTTP 200 with image content type.
- Existing test still confirms instructor code cannot perform admin updates.
