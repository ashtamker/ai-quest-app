# Shuffled Answer Options — 2026-06-28

## Request
- Confirm whether Excel import updated answers as well as questions.
- Avoid having the correct answer almost always in option 1 or 2.
- Shuffle answer option positions while preserving the correct content.

## Answer/content handling
- The Excel import already updated:
  - question text
  - all answer options
  - correct answer index based on א/ב/ג/ד
  - explanation after the answer
  - points/difficulty
- However, the Excel file had the correct option mostly/always in answer א.

## Implementation
- Deterministically reshuffled answer options in `server/data/questions.json`.
- Updated `correctAnswer` for every shuffled question so the same correct content remains correct after moving position.
- Applied to the whole question bank, not only Excel-imported questions.
- Synced `src/data/data-sources/local/seed.js` to keep demo/local behavior aligned.
- Used deterministic shuffling by question id so options do not randomly change after refresh.

## Result
- Before shuffle: 117/120 questions had correct answer at index 0.
- After shuffle:
  - option 1: 31 correct answers
  - option 2: 29 correct answers
  - option 3: 31 correct answers
  - option 4: 29 correct answers
- Excel-imported questions after shuffle:
  - option 1: 20
  - option 2: 18
  - option 3: 20
  - option 4: 21

## QA
- `npm test` passed: 47/47.
- Live cache version: `20260628-shuffled-answer-options`.
- Live Node API restarted.
- Live smoke verified:
  - `/api/health` OK.
  - cache version updated.
  - live config has 120 questions.
  - correct answer distribution is `{0:31, 1:29, 2:31, 3:29}`.
  - NVIDIA verified questions now have correct answers at positions 3, 4, and 2.
  - staff team password smoke still returns red `R4821`.
