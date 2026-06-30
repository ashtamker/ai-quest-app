# Company Task AI Helper — 2026-06-28

## Change
- Added an AI helper card directly inside each company task screen.
- The helper is rendered between the company hero/header and the company completion form so it does not nest forms or interfere with submitting the task.
- The form sends the active `companyId` automatically to the existing `/api/teams/:id/ai-helper` endpoint.
- Answers are stored per company in sessionStorage (`aiQuest.companyAiAnswer.<companyId>`) so returning to the company keeps the recent helper answer visible on that device.
- The existing one-time +3 AI helper bonus behavior remains unchanged.

## QA
- `npm test` passed: 42/42.
- Live cache version bumped to `20260628-company-task-ai-helper`.
- Live Node API restarted.
- Live smoke verified:
  - `/api/health` returns 200.
  - live `index.html` includes the new cache version.
  - live StudentApp source contains `companyAiHelperForm`, `עוזר AI לחברה הזו`, and `שאלו על החברה הזו`.
