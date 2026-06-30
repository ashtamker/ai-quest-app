# AI Quest — Duration-Based Company Selection + Mobile Company Cards (2026-06-24)

## Implemented

### Duration-based company list
Student company list now changes according to selected activity duration:
- **135 minutes**: shows all companies.
- **90 minutes**: shows a medium list focused on known/large companies and high-priority relevant companies.
- **60 minutes**: shows a shorter focused list for phone use and fast gameplay.

Current production data counts:
- 60 minutes: 29 companies
- 90 minutes: 40 companies
- 135 minutes: 65 companies

Rules:
- Always include directly mission-relevant companies and essential known companies, e.g. Microsoft, NVIDIA, Intel, Oracle, IBM, Dell, CyberArk, Wix, Taboola, Rafael, Soroka.
- Other well-known companies and companies with required model abilities are prioritized after the mandatory set.
- Company field/category/ability is still hidden before opening a task, to avoid spoilers.

### Student GUI / mobile cards
- Company list remains non-spoiling but is now more game-like and phone-friendly.
- Each company is shown as a clickable card.
- Card states:
  - Open: blue style.
  - Completed: green style.
  - Needs photo retake: yellow style.
- Whole card is clickable for open/repair companies.
- Completed cards stay green and disabled from accidental re-opening.
- Buttons and card spacing improved for smartphone use.
- Added a duration note showing how many companies are visible out of the full bank.

## Files changed
- `src/domain/use-cases/useCases.js`
- `src/presentation/student/StudentApp.js`
- `src/infrastructure/i18n/translations.js`
- `styles.css`
- `index.html`
- `tests/domain.test.mjs`

## QA
Command:
```bash
npm test
```
Result:
- 24/24 tests passed.

Covered:
- Duration-aware company selection.
- 135 min shows all companies.
- 60/90 show fewer companies.
- Essential known/relevant companies are included in short activity list.
- Existing student/instructor/admin/API/auth/checkpoint/mobile/i18n tests continue to pass.
