import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const readJson = async (p) => JSON.parse(await readFile(join(root, p), 'utf8'));
const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const letter = i => ['א','ב','ג','ד','ה','ו'][i] || String(i+1);

const [events, companiesAll, questionsAll, abilities, modelProblems, content] = await Promise.all([
  readJson('server/data/events.json'),
  readJson('server/data/companies.json'),
  readJson('server/data/questions.json'),
  readJson('server/data/abilities.json'),
  readJson('server/data/model-problems.json'),
  readJson('server/data/content.json'),
]);

const event = events.find(e => e.id === 'event-gav-yam') || events[0];
const activeIds = new Set(event.activeCompanyIds || []);
const companies = companiesAll.filter(c => activeIds.has(c.id) && c.active !== false);
const questionsByCompany = new Map();
for (const q of questionsAll.filter(q => q.active !== false)) {
  if (!questionsByCompany.has(q.companyId)) questionsByCompany.set(q.companyId, []);
  questionsByCompany.get(q.companyId).push(q);
}
const abilityById = new Map(abilities.map(a => [a.id, a]));
const problem = modelProblems.find(p => p.id === event.selectedModelProblemId) || modelProblems[0];
const typeLabels = {
  data: ['דאטה', 'بيانات'], security: ['אבטחה', 'حماية'], ux: ['חוויית משתמש', 'تجربة مستخدم'],
  recommendation: ['המלצות', 'توصيات'], ethics: ['אתיקה ובקרה', 'أخلاقيات ورقابة'], infrastructure: ['תשתיות', 'بنية تحتية'],
  communication: ['תקשורת', 'اتصالات'], content: ['תוכן', 'محتوى']
};

function abilityChips(c) {
  return [...new Set((c.abilityIds || []).map(id => abilityById.get(id)?.type).filter(Boolean))]
    .map(t => `<span>${esc(typeLabels[t]?.[0] || t)}</span>`).join('');
}

function checkpointThresholds(max=65) { const out=[]; let next=4, step=6; while(next<=max){ out.push(next); next+=step; step=7; } return out; }

const preferred = ['microsoft','nvidia','intel','oracle','ibm','dell','cyberark','wix','taboola','rafael','soroka','audiocodes','morphisec','mdclone','novocure','lightricks','weka','ribbon','rad','dalet','leidos','pwc-israel','drs-rada-technologies','bgn','cyber-bgu','tech7','innovation-basecamp'];
const sortedCompanies = [...companies].sort((a,b) => {
  const ia = preferred.indexOf(a.id), ib = preferred.indexOf(b.id);
  if (ia >= 0 || ib >= 0) return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  return (a.nameHe || a.nameEn || '').localeCompare(b.nameHe || b.nameEn || '', 'he');
});

const cards = sortedCompanies.map((c, idx) => {
  const qs = (questionsByCompany.get(c.id) || []).slice(0, 2);
  const logo = c.logoUrl ? `<img src="${esc(c.logoUrl.replace('./',''))}" alt="${esc(c.logoAltHe || c.nameHe)}">` : `<b>${esc(c.logoMark || c.nameHe?.[0] || '?')}</b>`;
  const qHtml = qs.map((q, qi) => `
    <div class="question">
      <h4>${idx+1}.${qi+1} ${esc(q.textHe)}</h4>
      <p class="ar">${esc(q.textAr)}</p>
      <div class="options">
        ${(q.optionsHe || []).map((o, oi) => `<label><span class="circle">${letter(oi)}</span><span>${esc(o)}</span><small class="ar">${esc(q.optionsAr?.[oi] || '')}</small></label>`).join('')}
      </div>
      <div class="answer-line">תשובת הצוות / إجابة الفريق: ____________________</div>
    </div>`).join('');
  return `<section class="company-card">
    <div class="company-head">
      <div class="logo">${logo}</div>
      <div><small>משימת חברה ${idx+1}</small><h3>${esc(c.nameHe || c.nameEn)}</h3><p class="ar name-ar">${esc(c.nameAr || '')}</p><p class="field">${esc(c.field)}</p></div>
    </div>
    <div class="chips">${abilityChips(c)}</div>
    <p class="desc">${esc(c.descriptionHe || '')}</p>
    <div class="logo-work"><b>אימות לוגו / شعار الشركة</b><br>מצאו את הלוגו בפארק. ציירו/תארו אותו בקצרה וקבלו אישור מדריך:<br><span>____________________________________________________________</span></div>
    ${qHtml || '<p class="muted">אין שאלות פעילות לחברה זו — כתבו מה גיליתם עליה.</p><div class="free-lines"></div>'}
    <div class="score-box"><span>ניקוד משימה</span><b>____</b><span>אישור מדריך</span><b>____</b></div>
  </section>`;
}).join('\n');

const glossary = (content.glossary || []).slice(0, 12).map(g => `<div><b>${esc(g.termHe)}</b><span class="ar">${esc(g.termAr || '')}</span><p>${esc(g.explanationHe || '')}</p></div>`).join('');
const checkpoints = checkpointThresholds(65).map((n,i) => `<tr><td>${i+1}</td><td>אחרי ${n} חברות</td><td>גשו למדריך, הציגו 2–3 דברים שלמדתם וקבלו חלק פאזל.</td><td class="sign"></td></tr>`).join('');
const puzzle = Array.from({length:12},(_,i)=>`<div>${i+1}</div>`).join('');
const domains = (problem.requiredAbilityTypes || []).map(t => `<tr><td>${esc(typeLabels[t]?.[0] || t)}<br><span class="ar">${esc(typeLabels[t]?.[1] || '')}</span></td><td></td><td></td><td></td><td class="sign"></td></tr>`).join('');

const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI Quest — חוברת עבודה לצוות</title>
<style>
:root{--ink:#10243f;--blue:#1558d6;--cyan:#27c5f5;--purple:#7c5cff;--line:#cbd5e1;--soft:#f4f8ff;--good:#16a34a;--warn:#f59e0b}*{box-sizing:border-box}body{margin:0;background:#eaf1fb;color:var(--ink);font-family:Arial,'Noto Sans Hebrew','Noto Sans Arabic',sans-serif;line-height:1.45}.sheet{width:210mm;min-height:297mm;margin:0 auto 18px;background:white;padding:16mm;box-shadow:0 12px 30px #0002;position:relative;overflow:hidden}.cover{background:radial-gradient(circle at top left,#56d6ff55,transparent 35%),linear-gradient(135deg,#071d38,#123d66 55%,#2f1f76);color:white;display:flex;flex-direction:column;justify-content:space-between}.cover h1{font-size:54px;margin:0;line-height:.95}.cover h2{font-size:28px;margin:12px 0;color:#b8eeff}.badge{display:inline-block;border:2px solid #75dfff;border-radius:999px;padding:8px 16px;font-weight:800}.team-box{background:#ffffff16;border:1px solid #ffffff44;border-radius:24px;padding:18px;font-size:20px}.team-box div{border-bottom:1px dashed #fff8;padding:10px 0}.ar{direction:rtl;color:#52657d;font-size:.92em}.cover .ar{color:#d7ecff}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.card{border:1px solid var(--line);border-radius:18px;padding:14px;background:var(--soft)}h1,h2,h3{margin:0 0 10px}h2{font-size:28px;color:#123d66;border-bottom:4px solid #dbeafe;padding-bottom:8px}h3{font-size:22px}.muted{color:#64748b}.big-note{font-size:20px;font-weight:800;background:#fff7ed;border:2px solid #fed7aa;border-radius:18px;padding:14px}.story{white-space:pre-line;font-size:16px}.company-card{break-inside:avoid;page-break-inside:avoid;border:2px solid #dbeafe;border-radius:22px;padding:14px;margin:0 0 12px;background:linear-gradient(180deg,#fff,#f8fbff)}.company-head{display:grid;grid-template-columns:94px 1fr;gap:14px;align-items:center}.logo{width:94px;height:94px;border:1px solid #dbeafe;border-radius:22px;display:grid;place-items:center;background:white;overflow:hidden}.logo img{max-width:108%;max-height:108%;object-fit:contain}.logo b{font-size:34px;color:var(--blue)}.company-head small{font-weight:900;color:var(--blue)}.field{font-weight:800;color:#334155;margin:0}.desc{font-size:14px;margin:8px 0}.chips{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.chips span{background:#e0f2fe;color:#075985;border:1px solid #bae6fd;border-radius:999px;padding:4px 9px;font-size:12px;font-weight:800}.logo-work{border:1px dashed #94a3b8;border-radius:14px;padding:8px;background:#fff;margin:8px 0;font-size:13px}.question{border-top:1px solid #e2e8f0;padding-top:8px;margin-top:8px}.question h4{margin:0 0 4px;font-size:15px}.options{display:grid;grid-template-columns:1fr 1fr;gap:6px}.options label{display:grid;grid-template-columns:26px 1fr;gap:6px;align-items:start;border:1px solid #e2e8f0;border-radius:12px;padding:6px;background:#fff}.options small{grid-column:2;font-size:11px}.circle{width:24px;height:24px;border:2px solid #60a5fa;border-radius:50%;display:grid;place-items:center;font-weight:900}.answer-line{margin-top:8px;font-weight:800}.score-box{display:grid;grid-template-columns:1fr 60px 1fr 60px;gap:8px;align-items:center;margin-top:10px}.score-box b,.sign{border:1px dashed #64748b;border-radius:8px;min-height:32px;background:white}table{width:100%;border-collapse:collapse;margin:12px 0}td,th{border:1px solid var(--line);padding:9px;vertical-align:top}th{background:#eaf3ff;color:#123d66}.sign{min-width:80px}.puzzle{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.puzzle div{height:70px;border:2px dashed #94a3b8;border-radius:16px;display:grid;place-items:center;font-size:26px;font-weight:900;color:#94a3b8;background:#f8fafc}.lines{min-height:150px;border:1px dashed #94a3b8;border-radius:16px;background:repeating-linear-gradient(#fff,#fff 29px,#e2e8f0 30px);margin:10px 0}.free-lines{height:90px;border:1px dashed #94a3b8;border-radius:14px;background:white}.footer{position:absolute;bottom:8mm;left:16mm;right:16mm;font-size:11px;color:#64748b;display:flex;justify-content:space-between}.page-break{break-before:page;page-break-before:always}.print-hint{position:fixed;left:12px;bottom:12px;background:#0f172a;color:white;padding:10px 14px;border-radius:999px;box-shadow:0 8px 18px #0004;font-size:14px}@media print{body{background:white}.sheet{margin:0;box-shadow:none;width:210mm;min-height:297mm;page-break-after:always}.print-hint{display:none}a{color:inherit}}@page{size:A4;margin:0}
</style>
</head>
<body>
<div class="print-hint">להדפסה: Ctrl/Cmd+P → Save as PDF או הדפסה דו־צדדית</div>
<section class="sheet cover"><div><span class="badge">AI Quest · גב־ים נגב</span><h1>חוברת עבודה לצוות</h1><h2>בונים מודל AI חכם, בטוח ואחראי</h2><p class="ar">كراسة عمل للفريق — نبني نموذج ذكاء اصطناعي ذكيًا وآمنًا ومسؤولًا</p></div><div class="team-box"><div>שם הצוות: ____________________________</div><div>שמות המשתתפים: ______________________</div><div>זמן פעילות: 60 / 90 / 135 דקות</div><div>מדריך/ה: _____________________________</div></div><p>חוברת אחת לכל צוות · אין צורך בטלפון · עובדים, חוקרים, מסמנים ומקבלים אישור מדריך.</p></section>
<section class="sheet"><h2>1. סיפור המשימה</h2><p class="story">${esc(content.openingStory?.he || '')}</p><div class="big-note">המטרה: לאסוף יכולות מחברות שונות כדי לשפר מודל AI שעוזר לתלמידים לבחור תחום טכנולוגי עתידי.</div><h2>איך עובדים בלי טלפון?</h2><div class="grid2"><div class="card"><h3>בכל חברת משימה</h3><ol><li>מצאו את החברה/הלוגו בפארק.</li><li>כתבו מה החברה עושה.</li><li>ענו על השאלות.</li><li>קבלו אישור מדריך אם צריך.</li></ol></div><div class="card"><h3>ניקוד ואיסוף יכולות</h3><p>כל חברה נותנת לצוות יכולת טכנולוגית. סמנו בטבלת תיק המודל אילו יכולות אספתם.</p><p class="ar">كل شركة تمنح الفريق قدرة تكنولوجية تساعد النموذج.</p></div></div><div class="footer"><span>AI Quest</span><span>עמוד הנחיות</span></div></section>
<section class="sheet"><h2>2. מילון קצר</h2><div class="grid2">${glossary}</div><h2>3. תכנון מסלול</h2><table><tr><th>זמן פעילות</th><th>יעד מומלץ</th><th>הערה</th></tr><tr><td>60 דקות</td><td>כ־24 חברות</td><td>מסלול קצר, התמקדו בחברות מוכרות ובתחומים מגוונים.</td></tr><tr><td>90 דקות</td><td>כ־40 חברות</td><td>מסלול מלא רגיל.</td></tr><tr><td>135 דקות</td><td>עד כל החברות</td><td>מסלול עומק.</td></tr></table><div class="lines"></div><div class="footer"><span>AI Quest</span><span>מילון ותכנון</span></div></section>
<section class="sheet"><h2>4. צ׳קפוינטים ופאזל</h2><p>בנקודות עצירה חוזרים למדריך. הצוות מציג התקדמות, והמדריך מאשר ונותן חלק פאזל.</p><table><tr><th>#</th><th>מתי עוצרים?</th><th>מה מציגים?</th><th>חתימת מדריך</th></tr><tr><td>אוכל</td><td>אחרי 2 חברות</td><td>עצירת טעינה: מצאו לוגו מסעדה/קפה בפארק ותארו אותו.</td><td class="sign"></td></tr>${checkpoints}</table><h3>פאזל הצוות</h3><p>סמנו כל חלק שקיבלתם מהמדריך.</p><div class="puzzle">${puzzle}</div><div class="footer"><span>AI Quest</span><span>צ׳קפוינטים</span></div></section>
<section class="sheet"><h2>5. תיק המודל</h2><p>כדי שהמודל הסופי יהיה מוכן, נסו לאסוף לפחות 3 חברות בכל תחום מרכזי.</p><table><tr><th>תחום יכולת</th><th>חברה 1</th><th>חברה 2</th><th>חברה 3</th><th>אישור</th></tr>${domains}</table><h3>מה המודל שלנו כבר יודע?</h3><div class="lines"></div><h3>מה עדיין חסר למודל?</h3><div class="lines"></div><div class="footer"><span>AI Quest</span><span>תיק מודל</span></div></section>
<section class="sheet"><h2>6. משימה סופית</h2><div class="card"><h3>${esc(problem.titleHe)}</h3><p>${esc(problem.descriptionHe)}</p></div><h3>בנו רעיון למודל AI משופר</h3><ol><li>איזו בעיה המודל פותר?</li><li>איזה דאטה הוא צריך?</li><li>איך שומרים על פרטיות ואבטחה?</li><li>איך מסבירים לתלמידים את ההמלצה?</li><li>איפה חייבת להיות בקרה אנושית?</li></ol><div class="lines"></div><h3>הפרומפט הסופי שלנו</h3><div class="lines"></div><div class="footer"><span>AI Quest</span><span>משימה סופית</span></div></section>
<section class="sheet"><h2>7. בנק משימות חברות</h2><p>בחרו חברות לפי המסלול שלכם. כל כרטיס שווה חקירה, שאלות ואיסוף יכולת.</p><p class="muted">טיפ למדריך: אפשר להדפיס את החוברת דו־צדדית. אם רוצים לקצר — להדפיס רק את עמודי ההנחיות + חלק מכרטיסי החברות.</p><div class="footer"><span>AI Quest</span><span>תחילת בנק חברות</span></div></section>
<section class="sheet company-bank">${cards}<div class="footer"><span>AI Quest</span><span>בנק חברות</span></div></section>
</body></html>`;

await mkdir(join(root, 'workbook'), { recursive: true });
await writeFile(join(root, 'workbook', 'ai-quest-team-workbook.html'), html, 'utf8');
await writeFile(join(root, 'ai-quest-team-workbook.html'), html, 'utf8');
console.log('Wrote workbook/ai-quest-team-workbook.html and ai-quest-team-workbook.html');
