# AI Quest — Excel Question Bank Review

Date: 2026-06-24
Source file: `package/uploads/AI_Quest_Company_Question_Bank.xlsx`

## Sheets reviewed

1. `Companies_Questions`
2. `Glossary`
3. `Story`
4. `Legacy_App_Check`

## High-level findings

- Total question rows: 129
- Raw company names: 72
- Canonical company groups after normalization: 65
- Companies/questions that directly match the current app database: 11 company groups
- New company groups to add or map: 54
- Duplicate/alias groups detected: 6
- Critical missing fields in question rows: 0

## Current app matches

These match the actual current `server/data/companies.json` database:

- AudioCodes → `audiocodes`
- CyberArk / CyberArk variants → `cyberark`
- DELL Technologies → `dell`
- Dalet → `dalet`
- IBM → `ibm`
- Intel → `intel`
- Nvidia → `nvidia`
- Oracle → `oracle`
- SIGA → `siga`
- WIX → `wix`
- taboola → `taboola`

Note: the Excel column `In current app?` marks additional companies as current, but they are not in the actual current app database. The import should trust the real app data, not only the spreadsheet flag.

## Existing app company not directly found in workbook

- `ecosystem` / מרכז חדשנות

Recommendation: keep it as a game/ecosystem station or map it to `Innovation Basecamp`, `Tech 7`, `ENTER`, or `DCIC` only after product decision.

## Alias / duplicate company groups to merge

- CyberArk / CyberArk (A Palo Alto Networks Company) / cyberark
- Oz software / ozsoftware
- RAFAEL / Rafael
- Rezilion / rezilion
- Tech 7 / Tech7
- Tech19 / tech-19

Recommendation: create a canonical id for each group and merge questions under it.

## New company groups to add or map

- 2bPrecise
- Agmon with Tulchinsky
- Altera Digital Health
- BGN
- Bone Sci Bio
- CBG
- CaPow
- Cert
- Cyber@BGU
- Cyberglobes
- DCIC
- DRS RADA Technologies
- ENTER
- FinSec Innovation Lab
- HyperGuest
- Ilanot
- Innovation Basecamp
- Leidos
- Let
- Let Group Ltd - atmos
- Lightricks
- MDCLONE
- Micro
- Microsoft
- Morphisec
- Nitzanim
- Novocure
- Oz software
- PWC Israel
- Penta Drone Robotics
- RAD
- RAFAEL
- RSecurity
- Retama
- Rezilion
- Ribbon
- Sigmabit
- SignatureIT
- Siraj
- Soroka
- SoundCampaign
- Spark Marketing IL
- Swiftness
- THREEDOTS ONLINE
- Tap Mobile
- Tech 7
- Tech19
- UpNext Innovate LTD
- WEKA
- Wework
- brooks-keret
- energyteam
- liolan
- pentadrone

## Question quality notes

The spreadsheet is structured well and has no critical missing fields. However, there are repeated question patterns used across many companies. This is not necessarily wrong, but if imported as-is it may feel generic.

Repeated patterns include:

- “מה השאלה הכי טובה לשאול על חברה טכנולוגית שלא מכירים?” — 17 companies
- “איך חברה שאינה חברת AI יכולה עדיין להיות חלק מפארק הייטק?” — 14 companies
- “מהו אקוסיסטם הייטק?” — 8 companies
- Cyber/security questions repeated across CyberArk, Morphisec, Rezilion, RSecurity, etc.
- Communication questions repeated across AudioCodes, RAD, Ribbon.
- Startup/ecosystem questions repeated across Innovation Basecamp, Tech 7, Tech7.

Recommendation: import these as a first real content bank, but add a `theme`/`ability` layer and present them as company-relevant research questions. Later, we can improve uniqueness for high-priority companies.

## Story sheet

The workbook includes a Hebrew and Arabic opening story. It should replace/expand the current short mission intro.

Implementation recommendation:

- Store story in event config or a new content module.
- Show it after team login as an immersive opening screen.
- Add a “הבנתי, יוצאים למשימה” button before the company list.
- Keep the language simple and game-like.

## Glossary sheet

The glossary includes 15 terms in Hebrew and Arabic. It is useful, but should not be presented as a technical dictionary wall.

Implementation recommendation:

- Add a “מילון קצר” / “مفردات قصيرة” collapsible card.
- Show only 3–5 terms at a time or terms relevant to the current company/question.
- Avoid overusing technical words in questions.
- When using words like דאטה, אלגוריתם, ענן, שרת, הטיה — add a short child-friendly explanation nearby.

## Legacy app check

Legacy items to treat carefully:

- Deutsche Telekom, Ness, HP, Lenovo, Cisco: not found in checked official portal; verify physically before adding.
- Allscripts: recommended replacement with Altera Digital Health if signage changed.
- מסלול אלפא: not a regular company; can be ecosystem/training station.

## Recommended import approach

1. Create a normalized import script from the Excel dump.
2. Merge aliases into canonical company ids.
3. Add new abilities from `Ability_HE` while mapping them into broad simple ability types.
4. Replace/extend `server/data/companies.json` and `server/data/questions.json`.
5. Add story/glossary content into a new content file or event config.
6. Update student UI:
   - opening story screen
   - simple glossary card
   - child-friendly wording around technical terms
7. Run tests and local smoke checks.

## Important product decision before import

Do we want to add all 54 new company groups immediately, or import only companies that are definitely physically present in the park?

Recommended: import all spreadsheet companies, but mark questionable/legacy-only items as inactive unless confirmed.
