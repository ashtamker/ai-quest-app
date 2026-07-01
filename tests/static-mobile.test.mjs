import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');

async function text(file) {
  return readFile(path.join(ROOT, file), 'utf8');
}

test('mobile-first CSS keeps all primary surfaces usable on phones', async () => {
  const css = await text('styles.css');
  assert.match(css, /Mobile-first hardening pass/);
  assert.match(css, /@media\(max-width:43\.75rem\)/);
  assert.match(css, /@media\(max-width:26\.25rem\)/);
  assert.match(css, /\.company-grid\{grid-template-columns:1fr!important/);
  assert.match(css, /\.team-board,\.photo-board\{grid-template-columns:1fr!important/);
  assert.match(css, /\.admin-grid,\.questions-admin\{grid-template-columns:1fr!important/);
  assert.match(css, /\.sticky-actions\{position:sticky/);
  assert.match(css, /input,select,textarea\{font-size:1rem/);
  assert.match(css, /\.language-switch/);
  assert.match(css, /Student Mobile Redesign Pass/);
  assert.match(css, /\.student-stats/);
  assert.match(css, /\.grid-main aside\{order:2!important\}/);
  assert.match(css, /grid-template-areas:'logo top' 'logo title' 'hint hint' 'button button'/);
  assert.match(css, /@media\(max-width:23\.75rem\)/);
  assert.match(css, /Mobile Logo Visibility Pass/);
  assert.match(css, /grid-template-columns:5\.375rem minmax\(0,1fr\)!important/);
  assert.match(css, /\.company-logo\.card\{[\s\S]*width:5\.375rem!important;[\s\S]*height:5\.375rem!important/);
  assert.match(css, /\.company-logo\.hero\{width:7rem!important;height:7rem!important/);
  assert.match(css, /Mobile Company Card Deck/);
  assert.match(css, /grid-template-areas:'status' 'logo' 'title'!important/);
  assert.match(css, /\.company-card \.no-spoiler,[\s\S]*\.company-card button\{[\s\S]*display:none!important/);
  assert.match(css, /\.company-card\.done\{[\s\S]*border-color:rgba\(52,211,153,.88\)!important/);
  assert.match(css, /\.company-card\.needs-fix\{[\s\S]*border-color:rgba\(251,191,36,.9\)!important/);
  assert.match(css, /Mobile Back Navigation/);
  assert.match(css, /\.task-screen>#backCompanies\{[\s\S]*position:sticky/);
  assert.match(css, /\.task-screen>#backCompanies\{[\s\S]*width:100%!important/);
  assert.match(css, /\.task-screen>#backCompanies::before/);
  assert.match(css, /Mobile Ability Preview/);
  assert.match(css, /\.ability-preview \.chips span\{[\s\S]*font-size:1\.25rem!important/);
  assert.match(css, /\.ability-preview \.chips span\{[\s\S]*font-weight:900!important/);
});

test('student company status labels say unsolved instead of ambiguous open', async () => {
  const i18n = await text('src/infrastructure/i18n/translations.js');
  assert.match(i18n, /openCompanies: 'לא פתורות'/);
  assert.match(i18n, /openStatus: 'לא פתורה'/);
  assert.match(i18n, /openCompanies: 'غير محلولة'/);
  assert.match(i18n, /openStatus: 'غير محلولة'/);
  assert.doesNotMatch(i18n, /openStatus: 'פתוחה'/);
  assert.doesNotMatch(i18n, /openCompanies: 'פתוחות'/);
});

test('photo-fix labels explain that the instructor rejected the photo', async () => {
  const i18n = await text('src/infrastructure/i18n/translations.js');
  assert.match(i18n, /needsFix: 'צילום לא אושר'/);
  assert.match(i18n, /needsFixStatus: 'צריך לצלם שוב'/);
  assert.match(i18n, /needsFix: 'الصورة لم تُقبل'/);
  assert.match(i18n, /needsFixStatus: 'يجب التصوير مرة أخرى'/);
  assert.doesNotMatch(i18n, /needsFix: 'צילום מחדש'/);
  assert.doesNotMatch(i18n, /needsFixStatus: 'דורשת צילום מחדש'/);
});

test('instructor photo board does not show already approved photos', async () => {
  const instructor = await text('src/presentation/instructor/InstructorApp.js');
  assert.match(instructor, /const pendingPhotos = subs\.filter\(s => s\.instructorReviewStatus === 'pending'\)/);
  assert.match(instructor, /if \(this\.filter === 'photos'\) return this\.photos\(data\.pendingPhotos, data, tr\)/);
  assert.doesNotMatch(instructor, /this\.photos\(data\.pendingPhotos\.length \? data\.pendingPhotos : data\.subs/);
});

test('task back button clearly returns to all companies', async () => {
  const i18n = await text('src/infrastructure/i18n/translations.js');
  assert.match(i18n, /backToCompanies: 'חזרה לכל החברות'/);
  assert.match(i18n, /backToCompanies: 'العودة إلى كل الشركات'/);
  assert.doesNotMatch(i18n, /backToCompanies: 'חזרה לרשימת החברות'/);
});

test('app shell exposes a persistent language selector and localized navigation', async () => {
  const main = await text('src/app/main.js');
  assert.match(main, /localStorage\.getItem\('aiQuest\.language'\)/);
  assert.match(main, /id="appLanguage"/);
  assert.match(main, /language-switch/);
  assert.match(main, /app\.className=`app-shell route-\$\{route\}`/);
  assert.match(main, /bootError/);
  assert.match(main, /connection-error/);
  assert.match(main, /listActiveEvents\?await repo\.listActiveEvents\(\)/);
  assert.match(main, /t\(l,'student'\)/);
  assert.match(main, /t\(l,'instructor'\)/);
  assert.match(main, /t\(l,'admin'\)/);
});

test('student join screen lets students choose among active events before team selection', async () => {
  const student = await text('src/presentation/student/StudentApp.js');
  const apiRepo = await text('src/data/repositories/ApiRepositories.js');
  assert.match(apiRepo, /listActiveEvents\(\)/);
  assert.match(student, /listActiveEvents/);
  assert.match(student, /id="eventCodeSelect"/);
  assert.match(student, /id="teamAccessSelect"/);
  assert.match(student, /teamsForEvent/);
  assert.doesNotMatch(student, /field\(t\(l,'eventCode'\),'eventCode',eventCode\)/);
});

test('student screen writes language changes back to existing teams', async () => {
  const student = await text('src/presentation/student/StudentApp.js');
  assert.match(student, /team\.language!==this\.appLanguage/);
  assert.match(student, /await this\.repo\.saveTeam\(team\)/);
  assert.match(student, /localStorage\.setItem\('aiQuest\.language'/);
  assert.match(student, /student-topbar/);
  assert.match(student, /student-stats/);
  assert.doesNotMatch(student, /story-card" open/);
  assert.match(student, /teamUpdates\(team\)/);
  assert.match(student, /final-score-grid/);
});

test('Arabic model bag and repair screens do not hardcode Hebrew labels', async () => {
  const student = await text('src/presentation/student/StudentApp.js');
  const i18n = await text('src/infrastructure/i18n/translations.js');
  assert.match(student, /t\(l,'modelProgressByAbility'\)/);
  assert.match(student, /t\(l,'digitalPuzzle'\)/);
  assert.match(student, /t\(l,'points'\)/);
  assert.match(student, /abilityTypeLabel\(type,l\)/);
  assert.match(student, /t\(l,'repairedSoFar'\)/);
  assert.match(student, /t\(l,'repairModelButton'\)/);
  assert.match(i18n, /modelProgressByAbility: 'التقدم حسب مجالات القدرة:'/);
  assert.match(i18n, /digitalPuzzle: 'الأحجية الرقمية'/);
  assert.match(i18n, /repairModelButton: 'أصلحوا النموذج بالقدرات التي اخترتموها'/);
});

test('final mission copy explains model training as an educational process', async () => {
  const student = await text('src/presentation/student/StudentApp.js');
  const i18n = await text('src/infrastructure/i18n/translations.js');
  const useCases = await text('src/domain/use-cases/useCases.js');
  assert.match(student, /t\(l,'finalTrainingText'\)/);
  assert.match(i18n, /finalTrainingText: 'אימון המודל הוא תהליך חינוכי/);
  assert.match(i18n, /לפחות 3 חברות בכל תחום: דאטה, אבטחה, חוויית משתמש, המלצות ואתיקה/);
  assert.match(useCases, /אימון המודל הוא תהליך חינוכי/);
  assert.match(useCases, /דאטה, אבטחה, חוויית משתמש, המלצות ואתיקה/);
});

test('production mode does not silently fall back to localStorage', async () => {
  const apiRepo = await text('src/data/repositories/ApiRepositories.js');
  assert.match(apiRepo, /allowDemoFallback/);
  assert.match(apiRepo, /throw new Error\('api_unavailable'\)/);
  assert.match(apiRepo, /params\.get\('demo'\) === '1'/);
});



test('admin manages team count and instructor sees team passwords', async () => {
  const admin = await text('src/presentation/admin/AdminApp.js');
  const instructor = await text('src/presentation/instructor/InstructorApp.js');
  const apiRepo = await text('src/data/repositories/ApiRepositories.js');
  assert.match(admin, /teamAccessEditor/);
  assert.match(admin, /addTeamCount/);
  assert.match(admin, /teamDelete:/);
  assert.match(instructor, /teamPasswordsPanel/);
  assert.match(instructor, /צוותים וסיסמאות/);
  assert.match(apiRepo, /\/api\/staff\/events\//);
});

test('admin and instructor expose leaderboard and station type management', async () => {
  const admin = await text('src/presentation/admin/AdminApp.js');
  const instructor = await text('src/presentation/instructor/InstructorApp.js');
  assert.match(admin, /name="stationType"/);
  assert.match(admin, /מחזק מודל \+ ניקוד/);
  assert.match(admin, /ידע \+ ניקוד/);
  assert.match(admin, /id: 'results'/);
  assert.match(admin, /leaderboardTable/);
  assert.match(instructor, /leaderboard\(teams, tr\)/);
  assert.match(instructor, /טבלת ניקוד/);
});

test('instructor dashboard loads active events and exposes event switching', async () => {
  const instructor = await text('src/presentation/instructor/InstructorApp.js');
  assert.match(instructor, /listActiveEvents/);
  assert.match(instructor, /aiQuest\.instructor\.eventId/);
  assert.match(instructor, /id="instructorEventSelect"/);
});

test('admin dashboard exposes shelf-product event management surfaces', async () => {
  const admin = await text('src/presentation/admin/AdminApp.js');
  const apiRepo = await text('src/data/repositories/ApiRepositories.js');
  const css = await text('styles.css');
  assert.match(admin, /id: 'events'/);
  assert.match(admin, /id: 'puzzle'/);
  assert.match(admin, /eventForm/);
  assert.match(admin, /puzzleForm/);
  assert.match(admin, /activeCompanyIds/);
  assert.match(admin, /data-duplicate-event/);
  assert.match(admin, /data-finalize-event/);
  assert.match(admin, /data-export-csv/);
  assert.match(apiRepo, /saveEvent/);
  assert.match(apiRepo, /duplicateEvent/);
  assert.match(apiRepo, /eventResults/);
  assert.match(apiRepo, /finalizeEvent/);
  assert.match(apiRepo, /uploadPuzzleImage/);
  assert.match(css, /Production Sprint 3/);
  assert.match(css, /Production Sprint 5/);
  assert.match(css, /\.image-puzzle/);
  assert.match(css, /\.company-pick-grid/);
});

test('instructor dashboard exposes field control room surfaces', async () => {
  const instructor = await text('src/presentation/instructor/InstructorApp.js');
  const css = await text('styles.css');
  assert.match(instructor, /priorityScore/);
  assert.match(instructor, /treatmentQueue/);
  assert.match(instructor, /data-focus-team/);
  assert.match(instructor, /team-detail-grid/);
  assert.match(instructor, /data-quick-message/);
  assert.match(instructor, /bind\(event, visible, allTeams, tr\)/);
  assert.match(css, /Production Sprint 2/);
  assert.match(css, /\.queue-panel/);
  assert.match(css, /\.team-detail-grid/);
});
