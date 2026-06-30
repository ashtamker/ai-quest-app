# AI Quest v0.4 — Admin Questions + Research Question Bank

Date: 2026-06-24

## Completed

- Added admin UI for question management under `#admin`:
  - create new question
  - edit existing question
  - select company
  - select question type: multiple choice, true/false, short open answer
  - edit Hebrew/Arabic text, options, explanations, points and active status
- Added JSON API endpoint: `POST /api/admin/questions`.
- Added repository support for saving questions in both API mode and localStorage fallback mode.
- Updated student company task screen to render:
  - multiple-choice questions
  - true/false questions
  - short open-answer questions
- Updated domain scoring to grade short answers by accepted keywords.
- Replaced generic question bank with 30 company-specific research challenges:
  - level 1 companies: 3 questions each
  - level 2 companies: 2 questions each
  - level 3 company: 1 question

## Verification

- `npm test` passed.
- Browser module imports passed for AdminApp, StudentApp and ApiRepositories.
- Local API smoke test passed:
  - `GET /api/health`
  - `GET /api/state` returned 30 questions
  - `POST /api/admin/questions` saved a question successfully
- Runtime test question was removed after the smoke test.

## Next recommended stage

Implement dashboard polling/search/group messages/reset controls, then handle invalid photo review behavior end-to-end.
