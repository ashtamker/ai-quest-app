# Excel Question Review + Import — 2026-06-28
## Summary
- Reviewed attached Excel file `AI_Quest_Verified_Logos_Questions_HE.xlsx`.
- Excel contained 50 companies / bodies and 103 Hebrew questions.
- Safely matched 39 existing app companies and imported 79 verified questions after removing one Excel company that is not in the current app (`SITE123`).
- Final app question bank now has 120 questions across 65 current app companies.
- Duplicate Hebrew question texts were reduced from 15 repeated templates before import to 7 after import. Remaining duplicates are only on companies not covered by the Excel file.
- Imported station classification from Excel where safely matched: `מחזק מודל` → `model`, `ניקוד + אקוסיסטם` → `knowledge`. Student UI still does not use the word “אקוסיסטם”.
- Arabic fields currently mirror the Hebrew Excel text for newly imported questions because the provided file is Hebrew-only; Arabic review/translation should be a separate pass if Arabic gameplay is required.

## Company-by-company status
| Company in app | id | stationType | Questions after update | Status |
|---|---:|---|---:|---|
| 2bPrecise | `2bprecise` | `model` | 2 | Updated from Excel |
| Agmon with Tulchinsky | `agmon-with-tulchinsky` | `knowledge` | 2 | Updated from Excel |
| Altera Digital Health | `altera-digital-health` | `model` | 2 | Updated from Excel |
| AudioCodes | `audiocodes` | `model` | 2 | Updated from Excel |
| BGN | `bgn` | `knowledge` | 2 | Updated from Excel |
| Bone Sci Bio | `bone-sci-bio` | `model` | 2 | Kept existing questions — no safe Excel match |
| brooks-keret | `brooks-keret` | `knowledge` | 2 | Updated from Excel |
| CaPow | `capow` | `model` | 2 | Updated from Excel |
| CBG | `cbg` | `knowledge` | 2 | Updated from Excel |
| Cert | `cert` | `model` | 2 | Kept existing questions — no safe Excel match |
| Cyber@BGU | `cyber-bgu` | `knowledge` | 2 | Updated from Excel |
| CyberArk | `cyberark` | `model` | 3 | Updated from Excel |
| Cyberglobes | `cyberglobes` | `model` | 2 | Updated from Excel |
| Dalet | `dalet` | `model` | 2 | Updated from Excel |
| DCIC | `dcic` | `model` | 1 | Kept existing questions — no safe Excel match |
| DELL Technologies | `dell` | `model` | 2 | Updated from Excel |
| DRS RADA Technologies | `drs-rada-technologies` | `model` | 2 | Updated from Excel |
| energyteam | `energyteam` | `model` | 1 | Kept existing questions — no safe Excel match |
| ENTER | `enter` | `model` | 1 | Kept existing questions — no safe Excel match |
| FinSec Innovation Lab | `finsec-innovation-lab` | `model` | 1 | Kept existing questions — no safe Excel match |
| HyperGuest | `hyperguest` | `model` | 2 | Kept existing questions — no safe Excel match |
| IBM | `ibm` | `model` | 2 | Updated from Excel |
| Ilanot | `ilanot` | `knowledge` | 2 | Updated from Excel |
| Innovation Basecamp | `innovation-basecamp` | `model` | 2 | Kept existing questions — no safe Excel match |
| Intel | `intel` | `model` | 2 | Updated from Excel |
| Leidos | `leidos` | `model` | 2 | Updated from Excel |
| Let | `let` | `model` | 1 | Kept existing questions — no safe Excel match |
| Let Group Ltd - atmos | `let-group-ltd-atmos` | `knowledge` | 2 | Updated from Excel |
| Lightricks | `lightricks` | `model` | 2 | Kept existing questions — no safe Excel match |
| liolan | `liolan` | `model` | 1 | Kept existing questions — no safe Excel match |
| MDCLONE | `mdclone` | `model` | 2 | Updated from Excel |
| Micro | `micro` | `model` | 1 | Kept existing questions — no safe Excel match |
| Microsoft | `microsoft` | `model` | 2 | Updated from Excel |
| Morphisec | `morphisec` | `model` | 2 | Updated from Excel |
| Nitzanim | `nitzanim` | `model` | 1 | Kept existing questions — no safe Excel match |
| Novocure | `novocure` | `model` | 2 | Kept existing questions — no safe Excel match |
| Nvidia | `nvidia` | `model` | 3 | Updated from Excel |
| Oracle | `oracle` | `model` | 2 | Updated from Excel |
| Oz software | `oz-software` | `model` | 2 | Kept existing questions — no safe Excel match |
| Penta Drone Robotics | `penta-drone` | `model` | 2 | Updated from Excel |
| PWC Israel | `pwc-israel` | `knowledge` | 2 | Updated from Excel |
| RAD | `rad` | `model` | 2 | Updated from Excel |
| RAFAEL | `rafael` | `model` | 2 | Updated from Excel |
| Retama | `retama` | `model` | 1 | Kept existing questions — no safe Excel match |
| Rezilion | `rezilion` | `model` | 3 | Kept existing questions — no safe Excel match |
| Ribbon | `ribbon` | `model` | 2 | Updated from Excel |
| RSecurity | `rsecurity` | `model` | 2 | Kept existing questions — no safe Excel match |
| SIGA | `siga` | `model` | 2 | Kept existing questions — no safe Excel match |
| Sigmabit | `sigmabit` | `model` | 2 | Kept existing questions — no safe Excel match |
| SignatureIT | `signatureit` | `model` | 1 | Kept existing questions — no safe Excel match |
| Siraj | `siraj` | `knowledge` | 2 | Updated from Excel |
| Soroka | `soroka` | `model` | 2 | Kept existing questions — no safe Excel match |
| SoundCampaign | `soundcampaign` | `model` | 1 | Kept existing questions — no safe Excel match |
| Spark Marketing IL | `spark-marketing-il` | `knowledge` | 2 | Updated from Excel |
| Swiftness | `swiftness` | `model` | 2 | Kept existing questions — no safe Excel match |
| taboola | `taboola` | `model` | 3 | Updated from Excel |
| Tap Mobile | `tap-mobile` | `model` | 2 | Updated from Excel |
| Tech 7 | `tech7` | `knowledge` | 2 | Updated from Excel |
| Tech19 | `tech19` | `knowledge` | 2 | Updated from Excel |
| THREEDOTS ONLINE | `threedots-online` | `model` | 1 | Kept existing questions — no safe Excel match |
| UpNext Innovate LTD | `upnext-innovate-ltd` | `model` | 1 | Kept existing questions — no safe Excel match |
| WEKA | `weka` | `model` | 2 | Updated from Excel |
| Wework | `wework` | `knowledge` | 2 | Updated from Excel |
| WIX | `wix` | `model` | 2 | Updated from Excel |
| מרכז חדשנות | `ecosystem` | `knowledge` | 1 | Kept existing questions — no safe Excel match |

## Excel companies not imported automatically
These names were present in the Excel file but do not currently have a safe matching company card in the app data, so they were not imported automatically:

- Cyber Israel
- DesertTech
- EcologyWise
- Elbit Systems
- FBC&Co
- Leumi
- LexisNexis
- Mandel Leadership Institute
- Merage Foundation Israel
- Synergy7
- Voyager Labs
- SITE123 — skipped because it is not currently present as a company card in the app data.

## Quality notes
- The Excel questions are generally better for gameplay because they are company/domain-specific rather than generic repeated questions like “what should we ask about an unfamiliar technology company?”.
- The biggest improvement is for knowledge stations: questions now focus on ecosystem role, research, legal/business support, training, or workspace value, instead of pretending every station directly improves the AI model.
- Remaining weak/repeated questions are concentrated in app companies that were not covered by the Excel file. Recommended next pass: create similar company-specific questions for those remaining companies or remove inactive companies from short activities.
