import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const dumpPath = new URL('../../uploads/excel_dump.json', import.meta.url);
const dataDir = new URL('../server/data/', import.meta.url);
const seedPath = new URL('../src/data/data-sources/local/seed.js', import.meta.url);
const dump = JSON.parse(await readFile(dumpPath, 'utf8'));
const now = new Date().toISOString();

const existingAbilities = [
  ['security', 'אבטחת מידע', 'أمن المعلومات', 'security'],
  ['identity', 'הגנת זהויות', 'حماية الهويات', 'security'],
  ['data', 'דאטה איכותי', 'بيانات جيدة', 'data'],
  ['analysis', 'ניתוח מידע', 'تحليل البيانات', 'data'],
  ['cloud', 'ענן', 'سحابة', 'infrastructure'],
  ['compute', 'כוח עיבוד', 'قدرة معالجة', 'infrastructure'],
  ['hardware', 'חומרה ושבבים', 'عتاد ورقائق', 'infrastructure'],
  ['ux', 'חוויית משתמש', 'تجربة مستخدم', 'ux'],
  ['product', 'מוצר דיגיטלי', 'منتج رقمي', 'ux'],
  ['recommendation', 'מערכת המלצות', 'نظام توصيات', 'recommendation'],
  ['communication', 'תקשורת', 'اتصالات', 'communication'],
  ['content', 'תוכן ומדיה', 'محتوى وإعلام', 'content'],
  ['ethics', 'אתיקה ופרטיות', 'الأخلاقيات والخصوصية', 'ethics'],
  ['human', 'בקרה אנושית', 'رقابة بشرية', 'ethics'],
];
const currentIdByNorm = new Map([
  ['nvidia', 'nvidia'], ['cyberark', 'cyberark'], ['wix', 'wix'], ['taboola', 'taboola'], ['ibm', 'ibm'], ['oracle', 'oracle'], ['intel', 'intel'], ['dell', 'dell'], ['delltechnologies', 'dell'], ['audiocodes', 'audiocodes'], ['dalet', 'dalet'], ['siga', 'siga'], ['ecosystem', 'ecosystem'],
]);
const aliasNorm = new Map([
  ['cyberarkapaltonetworkscompany', 'cyberark'],
  ['cyberark', 'cyberark'],
  ['ozsoftware', 'ozsoftware'],
  ['rafael', 'rafael'],
  ['rezilion', 'rezilion'],
  ['tech7', 'tech7'],
  ['tech19', 'tech19'],
  ['pentadronerobotics', 'pentadrone'],
  ['pentadrone', 'pentadrone'],
]);
const preferredCompanyId = new Map([
  ['cyberark', 'cyberark'], ['nvidia', 'nvidia'], ['wix', 'wix'], ['taboola', 'taboola'], ['ibm', 'ibm'], ['oracle', 'oracle'], ['intel', 'intel'], ['delltechnologies', 'dell'], ['dell', 'dell'], ['audiocodes', 'audiocodes'], ['dalet', 'dalet'], ['siga', 'siga'],
  ['ozsoftware', 'oz-software'], ['rafael', 'rafael'], ['rezilion', 'rezilion'], ['tech7', 'tech7'], ['tech19', 'tech19'], ['pentadrone', 'penta-drone'],
]);
const correctMap = { 'א': 0, 'ב': 1, 'ג': 2, 'ד': 3, 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };

function norm(value = '') {
  return String(value).toLowerCase().trim()
    .replace(/\(a palo alto networks company\)/g, '')
    .replace(/technologies|technology|ltd|limited|group/g, '')
    .replace(/[^a-z0-9א-ת]+/g, '');
}
function canonicalKey(name) {
  const n = norm(name);
  return aliasNorm.get(n) || n;
}
function slug(value) {
  const ascii = String(value).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (ascii) return ascii;
  return `item-${hash(value).slice(0, 8)}`;
}
function hash(value) { return createHash('sha1').update(String(value)).digest('hex'); }
function abilityType(text = '', category = '', relevance = '') {
  const s = `${text} ${category} ${relevance}`;
  if (/סייבר|אבטח|זהויות|פרטיות|אמון/.test(s)) return 'security';
  if (/דאטה|נתונים|רפוא|בריאות|מחקר|ניתוח|AI|מידע/.test(s)) return 'data';
  if (/ענן|תשתיות|שרת|חומרה|שבבים|כוח עיבוד|אנרגיה|רובוט|רחפן|מערכות/.test(s)) return 'infrastructure';
  if (/מוצר|UX|משתמש|מובייל|אתרים|אפליקציה/.test(s)) return 'ux';
  if (/המלצות/.test(s)) return 'recommendation';
  if (/תקשורת|רשתות|קול/.test(s)) return 'communication';
  if (/תוכן|מדיה|שיווק|מוזיקה|יצירה/.test(s)) return 'content';
  if (/אקוסיסטם|יזמות|הכשרה|חינוך|משפט|ייעוץ|פיננס|בקרה|אחריות/.test(s)) return 'ethics';
  return 'data';
}
function pointsFor(row) {
  const level = Number(row.Level || 2);
  if (level === 1) return 10;
  if (level === 2) return 8;
  return 6;
}
function childFriendlyDescription(row) {
  const category = row.Category_HE || 'טכנולוגיה';
  const why = row['Why it helps / scoring note'] || 'החברה מוסיפה נקודת מבט או יכולת למסע.';
  return `${category}. ${why}`;
}

const rows = dump.Companies_Questions;
const header = rows[0];
const questionRows = rows.slice(1).filter(r => r?.[0]).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] || ''])));
const groups = new Map();
for (const row of questionRows) {
  const key = canonicalKey(row.Company);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}

const abilityByName = new Map();
const abilities = existingAbilities.map(([id, nameHe, nameAr, type]) => ({ id, nameHe, nameAr, type, modelImpact: { [type]: 20 } }));
for (const a of abilities) abilityByName.set(norm(a.nameHe), a.id);
function getAbility(row) {
  const nameHe = row.Ability_HE || row.Category_HE || 'יכולת טכנולוגית';
  const key = norm(nameHe);
  if (abilityByName.has(key)) return abilityByName.get(key);
  const type = abilityType(row.Ability_HE, row.Category_HE, row['Model relevance']);
  const id = `ability-${slug(nameHe) || hash(nameHe).slice(0, 8)}`.slice(0, 64);
  const uniqueId = abilities.some(a => a.id === id) ? `${id}-${hash(nameHe).slice(0, 5)}` : id;
  abilities.push({ id: uniqueId, nameHe, nameAr: nameHe, type, modelImpact: { [type]: 20 } });
  abilityByName.set(key, uniqueId);
  return uniqueId;
}

const companies = [];
const questions = [];
const importLog = { generatedAt: now, groups: [], aliasesMerged: [], warnings: [] };
for (const [key, list] of groups) {
  const first = list[0];
  const display = first.Display_HE || first.Company;
  const id = preferredCompanyId.get(key) || currentIdByNorm.get(key) || slug(display);
  const aliases = [...new Set(list.map(r => r.Company))];
  if (aliases.length > 1) importLog.aliasesMerged.push({ id, aliases });
  const abilityIds = [...new Set(list.map(getAbility))];
  const level = Math.max(1, Math.min(3, Number(first.Level || 2)));
  companies.push({
    id,
    nameHe: display,
    nameAr: display,
    nameEn: display,
    field: first.Category_HE || 'טכנולוגיה',
    level,
    abilityIds,
    descriptionHe: childFriendlyDescription(first),
    descriptionAr: childFriendlyDescription(first),
    modelRelevance: first['Model relevance'] || '',
    sourceUrl: first['Source URL'] || '',
    aliases,
    active: true
  });
  const seenQuestions = new Set();
  let qIndex = 0;
  for (const row of list) {
    const qKey = [row.Question_HE, row.Option_A, row.Option_B, row.Option_C, row.Option_D].map(x => String(x).trim()).join('|');
    if (seenQuestions.has(qKey)) continue;
    seenQuestions.add(qKey);
    qIndex += 1;
    const options = [row.Option_A, row.Option_B, row.Option_C, row.Option_D].filter(Boolean);
    const correct = correctMap[String(row.Correct || '').trim()] ?? 0;
    questions.push({
      id: `${id}-excel-q${qIndex}`,
      companyId: id,
      type: 'single',
      textHe: row.Question_HE,
      textAr: row.Question_HE,
      optionsHe: options,
      optionsAr: options,
      correctAnswer: correct,
      explanationHe: row.Explanation_HE || '',
      explanationAr: row.Explanation_HE || '',
      points: pointsFor(row),
      difficulty: row.Difficulty || '',
      sourceUrl: row['Source URL'] || '',
      active: true
    });
  }
  importLog.groups.push({ id, display, aliases, questions: qIndex, abilityIds });
}

// Keep the existing local ecosystem station without duplicating spreadsheet companies.
if (!companies.some(c => c.id === 'ecosystem')) {
  companies.push({ id: 'ecosystem', nameHe: 'מרכז חדשנות', nameAr: 'מרכז חדשנות', nameEn: 'Innovation Center', field: 'אקוסיסטם', level: 3, abilityIds: ['human', 'ethics'], descriptionHe: 'תחנת אקוסיסטם שמחברת חברות, תלמידים, יזמים וקהילה.', descriptionAr: 'תחנת אקוסיסטם שמחברת חברות, תלמידים, יזמים וקהילה.', modelRelevance: 'עקיף / אקוסיסטם', sourceUrl: '', aliases: ['מרכז חדשנות'], active: true });
  questions.push({ id: 'ecosystem-excel-q1', companyId: 'ecosystem', type: 'single', textHe: 'מהו אקוסיסטם הייטק?', textAr: 'מהו אקוסיסטם הייטק?', optionsHe: ['רשת של חברות, אנשים, ידע ושיתופי פעולה', 'רק בניין אחד', 'רק מחשב חזק', 'רק שיעור בבית ספר'], optionsAr: ['רשת של חברות, אנשים, ידע ושיתופי פעולה', 'רק בניין אחד', 'רק מחשב חזק', 'רק שיעור בבית ספר'], correctAnswer: 0, explanationHe: 'פארק הייטק מצליח כולל חברות, יזמים, אקדמיה, שירותים וקהילה.', explanationAr: 'פארק הייטק מצליח כולל חברות, יזמים, אקדמיה, שירותים וקהילה.', points: 6, active: true });
}

companies.sort((a, b) => a.nameHe.localeCompare(b.nameHe, 'he'));
questions.sort((a, b) => a.companyId.localeCompare(b.companyId) || a.id.localeCompare(b.id));
const events = [{
  id: 'event-gav-yam',
  name: 'AI Quest גב־ים נגב',
  code: 'GAVYAM',
  active: true,
  availableLanguages: ['he', 'ar'],
  availableDurations: [60, 90, 135],
  selectedModelProblemId: 'future-field',
  activeCompanyIds: companies.map(c => c.id),
  checkpointConfig: { type: 'code', code: 'AI2026' }
}];
const modelProblems = [{
  id: 'future-field', active: true,
  titleHe: 'בחירת תחום עתידי', titleAr: 'اختيار مجال مستقبلي',
  descriptionHe: 'מודל AI שעוזר לבני נוער לגלות תחום טכנולוגי עתידי. כרגע חסרים לו מידע איכותי, אבטחה, חוויית משתמש, אחריות ובקרה אנושית.',
  descriptionAr: 'نموذج يساعد الطلاب على اكتشاف مجال تكنولوجي مستقبلي ويحتاج إلى معلومات جيدة، حماية، تجربة مستخدم، مسؤولية ورقابة بشرية.',
  requiredAbilityTypes: ['data', 'security', 'ux', 'recommendation', 'ethics'],
  base44PromptTemplateHe: 'בנה אפליקציה רספונסיבית בעברית ובערבית שעוזרת לתלמידים בכיתות ז׳-ט׳ לגלות תחום טכנולוגי עתידי מתאים.',
  base44PromptTemplateAr: 'ابنِ تطبيقًا متجاوبًا بالعبرية والعربية يساعد الطلاب على اكتشاف مجال تكنولوجي مستقبلي مناسب.'
}];
const storyRows = Object.fromEntries(dump.Story.slice(1).map(r => [r[0], r[1]]));
const glossaryHeader = dump.Glossary[0];
const glossary = dump.Glossary.slice(1).filter(r => r?.[0]).map(r => Object.fromEntries(glossaryHeader.map((h, i) => [h, r[i] || ''])));
const content = {
  openingStory: { he: storyRows.Hebrew || '', ar: storyRows.Arabic || '' },
  glossary: glossary.map(row => ({ termHe: row['מושג'], explanationHe: row['הסבר לילדים'], exampleHe: row['דוגמה בפעילות'], termAr: row['Arabic Term'], explanationAr: row['Arabic Explanation'] })),
  languageNote: 'Questions imported from the spreadsheet are currently Hebrew-first; Arabic story and glossary are available. Question translation should be reviewed later.',
  importedFrom: 'AI_Quest_Company_Question_Bank.xlsx',
  importedAt: now
};

await mkdir(dataDir, { recursive: true });
for (const [name, value] of Object.entries({ events, companies, questions, abilities, 'model-problems': modelProblems, content })) {
  await writeFile(new URL(`${name}.json`, dataDir), JSON.stringify(value, null, 2));
}
await writeFile(new URL('import-log-question-bank.json', dataDir), JSON.stringify(importLog, null, 2));

const seed = { events, modelProblems, abilities, companies, questions, teams: [], submissions: [], messages: [], content };
const seedJs = `export const seed = ${JSON.stringify(seed, null, 2)};\n`;
await writeFile(seedPath, seedJs);
console.log(JSON.stringify({ companies: companies.length, questions: questions.length, abilities: abilities.length, aliasesMerged: importLog.aliasesMerged.length }, null, 2));
