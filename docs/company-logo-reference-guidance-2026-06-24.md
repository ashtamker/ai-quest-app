# AI Quest — Company Logo Reference Guidance (2026-06-24)

## Implemented
- Added logo/reference fields to all companies:
  - `logoUrl` — optional URL for official/reference logo image when a reliable source is available.
  - `logoMark` — mandatory short fallback mark for every company.
  - `logoAltHe` / `logoAltAr` — accessible alt text.
- All 65 companies now have `logoMark` and a `logoUrl` string field.
- Updated local seed data to include the same company logo fields.

## Student UI
- Company cards now show a logo/reference mark.
- Company task screen shows a larger logo/reference panel.
- Added clear student instruction:
  - The logo shown in the app is only for identification.
  - Teams still must upload a real photo from the park/building/signage.
  - They should photograph a logo on a building, entrance sign, or official signage.

## Admin UI
- Company editor now includes:
  - `logoUrl` for official/reference logo image URL.
  - `logoMark` for fallback display.
- This allows gradual replacement of fallback marks with reliable official logo images.

## Important Product Decision
We did **not** fabricate official logos for companies without a reliable source. The app displays a fallback identity mark until an official/reference logo URL is added through Admin.

## QA
Command:
```bash
npm test
```
Result:
- 24/24 tests passed.
- Added data coverage: every company must include `logoMark` and `logoUrl` string.
