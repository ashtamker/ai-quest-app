import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

const companies = [
  {
    id:'microsoft', name:'Microsoft', logo:'assets/company-logos/microsoft.svg', power:'ענן וכלי AI', icon:'☁️', color:'#2563eb',
    kid:'מיקרוסופט בונה כלים שהמון אנשים משתמשים בהם — Windows, Teams, Office וגם כלי AI. כדי שכל זה יעבוד למיליוני אנשים, צריך ענן: מחשבים חזקים שמחוברים דרך האינטרנט.',
    guide:'ספרו: “תדמיינו שכל הכיתה משתמשת באותו מסמך, והמחשב שלכם לא מספיק חזק לבד. הענן הוא כמו חדר ענק של מחשבים שעוזר לכולם לעבוד ביחד. AI צריך ענן כי הוא צריך הרבה כוח, דאטה ואבטחה.”',
    q:['למה AI צריך ענן ולא רק מחשב אחד קטן?','איזה כלי של Microsoft אתם מכירים?','מה צריך לבדוק לפני שנותנים ל־AI לעזור לתלמידים?'],
    listen:['כוח מחשוב / הרבה משתמשים / עבודה מכל מקום','Teams / Word / PowerPoint / Minecraft / Windows','פרטיות, אבטחה, תשובות ברורות, לא להחליף מורה/אדם']
  },
  {
    id:'nvidia', name:'NVIDIA', logo:'assets/company-logos/nvidia.png', power:'כוח חישוב ל־AI', icon:'⚡', color:'#65a30d',
    kid:'NVIDIA מפתחת שבבים חזקים במיוחד. שבבים כאלה עוזרים למחשבים לבצע המון חישובים מהר — וזה בדיוק מה שמודלים של AI צריכים.',
    guide:'ספרו: “AI לומד מהמון דוגמאות. בשביל זה הוא עושה מיליוני חישובים. NVIDIA מייצרת ‘מנועים’ חזקים שמאיצים את החישובים האלה.” אפשר להשוות למכונית מרוץ לעומת אופניים.',
    q:['מה התפקיד של שבב חזק בעולם ה־AI?','תנו דוגמה למשהו שדורש הרבה חישובים.','מה הסכנה אם AI חזק עובד בלי בדיקות?'],
    listen:['להריץ/לאמן AI מהר יותר','משחקים, וידאו, זיהוי תמונות, רובוטים','טעויות מהירות, החלטות לא אחראיות, חוסר בקרה']
  },
  {
    id:'intel', name:'Intel', logo:'assets/company-logos/intel.png', power:'שבבים וחומרה', icon:'🔲', color:'#0ea5e9',
    kid:'Intel מפתחת שבבים — חלקים קטנים וחכמים שנמצאים בתוך מחשבים ומכשירים. בלי חומרה טובה, גם התוכנה הכי חכמה לא תעבוד טוב.',
    guide:'ספרו: “אם AI הוא המוח של המערכת, השבבים הם הגוף שמריץ אותו. גוף חלש — המוח עובד לאט. חומרה טובה מאפשרת למערכות לפעול מהר, יציב ובטוח.”',
    q:['למה תוכנה חכמה צריכה חומרה טובה?','איפה בחיים שלכם יש שבבים?','מה חשוב יותר — מוח טוב או גוף חזק? נמקו.'],
    listen:['כדי לעבוד מהר ויציב','טלפון, מחשב, רכב, שעון, מזגן','שניהם; AI צריך תוכנה וחומרה יחד']
  },
  {
    id:'oracle', name:'Oracle', logo:'assets/company-logos/oracle.png', power:'דאטה מסודר', icon:'🗄️', color:'#dc2626',
    kid:'Oracle עוסקת בדאטה ובבסיסי נתונים. בסיס נתונים הוא כמו ספרייה מסודרת של מידע. AI טוב צריך מידע מסודר ואמין — אחרת הוא מתבלבל.',
    guide:'ספרו: “אם נותנים ל־AI מחברת מבולגנת, הוא יענה מבולגן. Oracle מזכירה לנו שדאטה צריך להיות מאורגן: מה נכון, מה מעודכן, למי מותר לראות אותו.”',
    q:['למה AI צריך מידע מסודר?','מה יכול לקרות אם הדאטה לא נכון?','איזה מידע על תלמידים אסור לחשוף סתם?'],
    listen:['כדי ללמוד/להמליץ נכון','המלצות שגויות, בלבול, חוסר אמון','ציונים, פרטים אישיים, מצב רפואי/רגשי, כתובת']
  },
  {
    id:'cyberark', name:'CyberArk', logo:'assets/company-logos/cyberark.svg', power:'זהויות ואבטחה', icon:'🔐', color:'#1d4ed8',
    kid:'CyberArk עוסקת בסייבר ובזהויות: מי נכנס למערכת, מה מותר לו לעשות, ואיך שומרים על מידע רגיש.',
    guide:'ספרו: “בבית ספר לא כל אחד מקבל מפתח לכל חדר. גם במחשב יש ‘מפתחות’. CyberArk עוזרת לוודא שרק מי שמורשה נכנס למידע חשוב.”',
    q:['למה לא כל משתמש צריך גישה לכל מידע?','מהי סיסמה חזקה או כניסה בטוחה?','איך שומרים על מודל AI שלא ידליף מידע?'],
    listen:['פרטיות / מניעת נזק / הרשאות','סיסמה ארוכה, אימות דו־שלבי, לא לשתף','הרשאות, בדיקות, הסתרת פרטים אישיים']
  },
  {
    id:'wix', name:'Wix', logo:'assets/company-logos/wix.png', power:'חוויית משתמש', icon:'🎨', color:'#7c3aed',
    kid:'Wix עוזרת לאנשים לבנות אתרים. היא מזכירה לנו שגם רעיון חכם חייב להיות קל, ברור ונעים לשימוש.',
    guide:'ספרו: “אם אפליקציה גאונית אבל אף אחד לא מבין איפה ללחוץ — היא לא באמת טובה. UX הוא איך המשתמש מרגיש ומצליח להשתמש במוצר.”',
    q:['מה הופך אפליקציה לקלה לשימוש?','למה AI צריך להסביר את עצמו לילדים?','עצבו כפתור אחד שהיה עוזר באפליקציה שלנו.'],
    listen:['כפתורים ברורים, שפה פשוטה, צבעים, פחות עומס','כדי להבין, לסמוך ולתקן טעויות','כל רעיון ברור ומועיל']
  },
  {
    id:'taboola', name:'Taboola', logo:'assets/company-logos/taboola.png', power:'המלצות תוכן', icon:'🎯', color:'#0891b2',
    kid:'Taboola עוסקת בהמלצות תוכן — למשל איזה כתבה או סרטון אולי יעניין אותנו. המלצה טובה צריכה להתאים לנו, אבל לא לסגור אותנו בבועה.',
    guide:'ספרו: “כשנטפליקס או יוטיוב מציעים לכם משהו — זו מערכת המלצות. זה נוח, אבל אם תמיד ממליצים לנו אותו דבר, אנחנו רואים עולם קטן מדי.”',
    q:['מהי המלצה טובה?','מהי “בועת המלצות”?','איך AI יכול להמליץ לתלמיד על תחום עתידי בצורה אחראית?'],
    listen:['מתאימה לצורך אבל מגוונת','רואים רק דברים דומים ולא נחשפים לחדש','להסביר למה, להציע כמה אפשרויות, לא להחליט במקום הילד']
  },
  {
    id:'rafael', name:'RAFAEL', logo:'assets/company-logos/rafael.svg', power:'מערכות מתקדמות ואחריות', icon:'🛡️', color:'#0f766e',
    kid:'RAFAEL מפתחת מערכות ביטחוניות וטכנולוגיות מתקדמות. במערכות כאלה אין מקום ל“בערך” — חייבים לבדוק, לאשר ולפעול באחריות.',
    guide:'ספרו: “ככל שטכנולוגיה חזקה יותר, האחריות גדולה יותר. במערכת ביטחונית חייבים בדיקות, אישור אנושי וכללים ברורים לפני שמפעילים משהו.”',
    q:['למה במערכות חשובות חייבים בדיקות רבות?','מתי AI חייב לעצור ולבקש אישור מאדם?','איזה כלל בטיחות הייתם מוסיפים למודל שלנו?'],
    listen:['כי טעות יכולה לפגוע','כשיש סיכון, מידע רגיש, החלטה חשובה','בקרה אנושית, הסבר, לא להחליט לבד']
  },
  {
    id:'soroka', name:'Soroka', logo:'assets/company-logos/soroka.png', power:'בריאות ודאטה רגיש', icon:'🏥', color:'#db2777',
    kid:'סורוקה הוא בית חולים. בעולם הבריאות, דאטה יכול לעזור להבין מצב רפואי — אבל הוא מאוד רגיש וחייב להישמר בפרטיות.',
    guide:'ספרו: “AI יכול לעזור לרופא לראות דפוסים, אבל הוא לא מחליף רופא. מידע רפואי הוא פרטי מאוד. לכן צריך גם דאטה טוב וגם אחריות.”',
    q:['למה מידע רפואי הוא רגיש?','איך AI יכול לעזור לרופאים בלי להחליף אותם?','איזו הבטחה צריך לתת למשתמש בתחום הבריאות?'],
    listen:['זה אישי ויכול לפגוע בפרטיות','לזהות דפוסים, לסכם מידע, לעזור בהחלטה','פרטיות, רופא בודק, לא החלטה אוטומטית']
  },
  {
    id:'lightricks', name:'Lightricks', logo:'assets/company-logos/lightricks.png', power:'יצירה דיגיטלית', icon:'✨', color:'#9333ea',
    kid:'Lightricks מפתחת כלים ליצירה ועריכת תמונות/וידאו. AI יכול לעזור ליצור, אבל עדיין צריך אדם שיבחר מסר, סגנון ואחריות.',
    guide:'ספרו: “AI יכול ליצור תמונה מגניבה בשנייה, אבל הוא לא יודע לבד מה נכון, מה מכבד ומה אמיתי. היוצר האנושי עדיין חשוב.”',
    q:['מה AI יכול לעזור ליצור?','למה לא כל תמונה שנוצרה ב־AI היא “אמת”?','איך משתמשים ב־AI יצירתי בצורה מכבדת?'],
    listen:['תמונה, סרטון, טקסט, מוזיקה','אפשר לזייף/לדמיין דברים שלא קרו','לא לפגוע, לציין שימוש ב־AI, לבדוק זכויות ואמת']
  }
];

const companyCards = companies.map((c,i)=>`<section class="mission-card" style="--c:${c.color}">
  <div class="mission-head"><div class="logo"><img src="${c.logo}" alt="${esc(c.name)}"></div><div><span class="num">תחנה ${i+1}</span><h3>${esc(c.name)}</h3><p><b>${c.icon} כוח שמקבלים:</b> ${esc(c.power)}</p></div></div>
  <p class="kid">${esc(c.kid)}</p>
  <div class="answer"><b>1. במשפט אחד: מה החברה עוזרת לעשות?</b><div></div></div>
  <div class="answer"><b>2. מה הכוח הזה מוסיף למודל ה־AI שלנו?</b><div></div></div>
  <div class="answer"><b>3. שאלת אחריות:</b> ${esc(c.q[2])}<div></div></div>
  <div class="mini"><span>הכוח נאסף ✅</span><span>ניקוד: ____</span><span>חתימת מדריך: ______</span></div>
</section>`).join('\n');

const guideCards = companies.map((c,i)=>`<section class="guide-card" style="--c:${c.color}">
  <div class="guide-title"><span>${i+1}</span><h3>${esc(c.name)} — ${esc(c.power)}</h3></div>
  <p><b>מה לספר לילדים ב־60–90 שניות:</b><br>${esc(c.guide)}</p>
  <p><b>שאלות לשאול בעל־פה:</b></p>
  <ol>${c.q.map(q=>`<li>${esc(q)}</li>`).join('')}</ol>
  <p><b>מה לחפש בתשובות:</b></p>
  <ul>${c.listen.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
</section>`).join('\n');

const puzzle = companies.map((c,i)=>`<div><span>${i+1}</span><b>${esc(c.name)}</b></div>`).join('');

const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Quest — פעילות מודרכת בלי טלפונים</title><style>
:root{--ink:#10243f;--blue:#1558d6;--soft:#f5f8ff;--line:#d7e3f5}*{box-sizing:border-box}body{margin:0;background:#eaf1fb;color:var(--ink);font-family:Arial,'Noto Sans Hebrew',sans-serif;line-height:1.45}.sheet{width:210mm;min-height:297mm;margin:0 auto 18px;background:white;padding:15mm;box-shadow:0 12px 28px #0002;position:relative;overflow:hidden}.cover{color:white;background:radial-gradient(circle at 15% 10%,#56d6ff77,transparent 28%),linear-gradient(135deg,#071d38,#123d66 50%,#5628a8);display:flex;flex-direction:column;justify-content:space-between}.cover h1{font-size:48px;line-height:1;margin:0}.cover h2{font-size:25px;color:#b8eeff}.pill{display:inline-block;background:#ffffff18;border:1px solid #ffffff55;border-radius:999px;padding:8px 14px;font-weight:900}.team{background:#ffffff18;border:1px solid #ffffff55;border-radius:24px;padding:16px;font-size:20px}.team div{border-bottom:1px dashed #fff8;padding:9px}.print{position:fixed;bottom:12px;left:12px;background:#0f172a;color:#fff;border-radius:999px;padding:10px 14px;box-shadow:0 8px 18px #0004}h1,h2,h3{margin:0 0 10px}h2{font-size:27px;color:#123d66;border-bottom:4px solid #dbeafe;padding-bottom:8px}.lead{font-size:20px;font-weight:800;background:#fff7ed;border:2px solid #fed7aa;border-radius:20px;padding:14px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{border:1px solid var(--line);border-radius:18px;background:var(--soft);padding:14px}.flow{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:18px 0}.flow div{background:linear-gradient(135deg,#e0f2fe,#ede9fe);border:1px solid #bfdbfe;border-radius:18px;padding:12px;text-align:center;font-weight:900}.mission-card{break-inside:avoid;page-break-inside:avoid;border:2px solid color-mix(in srgb,var(--c),white 55%);border-radius:24px;padding:14px;margin:0 0 13px;background:linear-gradient(180deg,#fff,#f8fbff)}.mission-head{display:grid;grid-template-columns:92px 1fr;gap:14px;align-items:center}.logo{width:92px;height:92px;border-radius:22px;border:1px solid #dbeafe;background:white;display:grid;place-items:center;overflow:hidden}.logo img{max-width:108%;max-height:108%;object-fit:contain}.num{color:var(--c);font-weight:900}.kid{font-size:15px;background:#f8fafc;border-radius:16px;padding:10px}.answer{margin:9px 0}.answer div{height:42px;border:1px dashed #94a3b8;border-radius:12px;background:repeating-linear-gradient(#fff,#fff 20px,#e2e8f0 21px)}.mini{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.mini span{border-radius:12px;background:#eef6ff;border:1px solid #c7ddff;padding:8px;text-align:center;font-weight:800}.puzzle{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.puzzle div{height:86px;border:2px dashed #94a3b8;border-radius:18px;background:#f8fafc;display:grid;place-items:center;text-align:center}.puzzle span{font-size:24px;color:#94a3b8;font-weight:900}.lines{height:180px;border:1px dashed #94a3b8;border-radius:16px;background:repeating-linear-gradient(#fff,#fff 29px,#e2e8f0 30px)}.guide-card{break-inside:avoid;page-break-inside:avoid;border:1px solid #cbd5e1;border-right:8px solid var(--c);border-radius:18px;padding:13px;margin-bottom:12px;background:#fff}.guide-title{display:flex;gap:10px;align-items:center}.guide-title span{width:34px;height:34px;border-radius:50%;background:var(--c);color:white;display:grid;place-items:center;font-weight:900}table{width:100%;border-collapse:collapse}td,th{border:1px solid #cbd5e1;padding:10px;vertical-align:top}th{background:#eaf3ff}.footer{position:absolute;bottom:8mm;left:15mm;right:15mm;display:flex;justify-content:space-between;color:#64748b;font-size:11px}.cut{break-before:page;page-break-before:always}@media print{body{background:white}.sheet{margin:0;box-shadow:none;page-break-after:always}.print{display:none}}@page{size:A4;margin:0}
</style></head><body><div class="print">Ctrl/Cmd+P → Save as PDF / הדפסה</div>
<section class="sheet cover"><div><span class="pill">AI Quest · גרסה מודרכת בלי טלפונים</span><h1>משימת סוכני ה־AI</h1><h2>חוברת קלילה לצוותים בגיל 12–13</h2><p>המדריך מספר. הצוות חושב. יחד בונים מודל AI אחראי.</p></div><div class="team"><div>שם הצוות: ____________________________</div><div>חברי הצוות: ___________________________</div><div>שם המדריך/ה: _________________________</div></div></section>
<section class="sheet"><h2>איך משחקים?</h2><p class="lead">אין טלפונים? מעולה. היום אתם לא מחפשים בגוגל — אתם מקשיבים כמו חוקרים, שואלים כמו יזמים, ובונים מודל AI כמו צוות מוצר.</p><div class="flow"><div>1<br>שומעים סיפור חברה</div><div>2<br>עונים בחוברת</div><div>3<br>אוספים כוח AI</div><div>4<br>צ׳קפוינט מדריך</div><div>5<br>בונים מודל סופי</div></div><div class="grid2"><div class="box"><h3>חוקי צוות</h3><ul><li>כולם משתתפים.</li><li>תשובה טובה היא לא בהכרח ארוכה.</li><li>אם לא בטוחים — כותבים ניחוש חכם.</li><li>אחרי כל 3 תחנות ניגשים למדריך.</li></ul></div><div class="box"><h3>מה אוספים?</h3><p>בכל חברה מקבלים “כוח” למודל: דאטה, אבטחה, שבבים, חוויית משתמש, המלצות, בריאות, יצירה או אחריות.</p></div></div><div class="footer"><span>AI Quest</span><span>הוראות</span></div></section>
<section class="sheet"><h2>צ׳קפוינטים</h2><table><tr><th>מתי?</th><th>מה עושים?</th><th>חתימת מדריך</th></tr><tr><td>אחרי 3 תחנות</td><td>ספרו למדריך איזה כוח AI הכי חשוב עד עכשיו ולמה.</td><td>__________</td></tr><tr><td>אחרי 6 תחנות</td><td>בחרו חברה אחת שהפתיעה אתכם והסבירו מה היא מוסיפה למודל.</td><td>__________</td></tr><tr><td>אחרי 9 תחנות</td><td>אמרו מה הסיכון הכי גדול במודל AI ואיך תמנעו אותו.</td><td>__________</td></tr></table><h2>פאזל כוחות AI</h2><p>סמנו כל תחנה שסיימתם. נסו להשלים לפחות 8 מתוך 10.</p><div class="puzzle">${puzzle}</div><div class="footer"><span>AI Quest</span><span>צ׳קפוינטים ופאזל</span></div></section>
<section class="sheet"><h2>משימות הצוות</h2>${companyCards}<div class="footer"><span>AI Quest</span><span>משימות צוות</span></div></section>
<section class="sheet"><h2>המודל הסופי שלנו</h2><p class="lead">המשימה: לבנות רעיון למודל AI שעוזר לילדים בגילכם לבחור תחום טכנולוגי עתידי — אבל בצורה חכמה, בטוחה והוגנת.</p><h3>שם המודל שלנו:</h3><div class="lines"></div><h3>איזה 3 כוחות הכי חשובים למודל?</h3><div class="lines"></div><h3>מה המודל שואל את התלמיד?</h3><div class="lines"></div><h3>איך נשמור על פרטיות ואחריות?</h3><div class="lines"></div><div class="footer"><span>AI Quest</span><span>מודל סופי</span></div></section>
<section class="sheet cover"><div><span class="pill">למדריכים בלבד</span><h1>דפי מדריך</h1><h2>מה מספרים בכל תחנה</h2><p>כל הסבר קצר: 60–90 שניות. המטרה היא לא הרצאה — אלא לתת לילדים מספיק מידע כדי לענות.</p></div></section>
<section class="sheet"><h2>מבנה מומלץ למדריך</h2><ol><li>קוראים את סיפור החברה בקול.</li><li>נותנים דוגמה אחת מחיי הילדים.</li><li>שואלים שאלה אחת בעל־פה.</li><li>נותנים לצוות 3–4 דקות לענות בחוברת.</li><li>עוברים לתחנה הבאה.</li></ol><p class="lead">טון מומלץ: קליל, מהיר, בלי להפוך את זה לשיעור. הילדים צריכים להרגיש שהם במשחק חקירה.</p><div class="footer"><span>AI Quest</span><span>הנחיית מדריך</span></div></section>
<section class="sheet">${guideCards}<div class="footer"><span>AI Quest</span><span>דפי מדריך</span></div></section>
</body></html>`;

await mkdir(join(root, 'workbook'), { recursive: true });
await writeFile(join(root, 'workbook', 'ai-quest-guided-workbook.html'), html, 'utf8');
await writeFile(join(root, 'ai-quest-guided-workbook.html'), html, 'utf8');
console.log('Wrote guided workbook');
