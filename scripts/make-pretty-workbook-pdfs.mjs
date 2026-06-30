import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import PDFDocument from 'pdfkit';
import bidiFactory from 'bidi-js';
import reshaperPkg from 'arabic-persian-reshaper';
const { ArabicShaper } = reshaperPkg;

const bidi = bidiFactory();
const root = process.cwd();
const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const fontBold = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const brandHai = path.join(root, 'assets/brand/hai-tech-logo.jpg');
const brandPark = path.join(root, 'assets/brand/gav-yam-negev.png');

function extractStations(file) {
  const s = fs.readFileSync(path.join(root, file), 'utf8');
  const marker = s.includes('const stations =') ? 'const stations =' : 'const stations=';
  const start = s.indexOf(marker) + marker.length;
  let i = start, depth = 0, end = -1, inStr = false, quote = '', esc = false;
  for (; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { if (esc) esc=false; else if (ch==='\\') esc=true; else if (ch===quote) inStr=false; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr=true; quote=ch; continue; }
    if (ch === '[') depth++;
    if (ch === ']') { depth--; if (depth===0) { end=i+1; break; } }
  }
  return vm.runInNewContext(s.slice(start, end));
}

const heStations = extractStations('scripts/generate-60min-print-workbooks.mjs');
const arStations = extractStations('scripts/generate-60min-arabic-workbooks.mjs');

function rtl(text, lang='he') {
  text = String(text ?? '');
  const shaped = lang === 'ar' ? ArabicShaper.convertArabic(text) : text;
  try {
    const levels = bidi.getEmbeddingLevels(shaped, lang === 'ar' ? 'rtl' : 'rtl');
    return bidi.getReorderedString(shaped, levels);
  } catch { return shaped.split('').reverse().join(''); }
}

function T(doc, text, x, y, w, opts={}) {
  const lang = opts.lang || 'he';
  const size = opts.size || 12;
  doc.font(opts.bold ? 'Bold' : 'Regular').fontSize(size).fillColor(opts.color || '#10243f');
  doc.text(rtl(text, lang), x, y, { width: w, align: opts.align || 'right', lineGap: opts.lineGap ?? 3 });
  return doc.y;
}
function TLTR(doc, text, x, y, w, opts={}) {
  doc.font(opts.bold ? 'Bold' : 'Regular').fontSize(opts.size || 12).fillColor(opts.color || '#10243f');
  doc.text(String(text ?? ''), x, y, { width: w, align: opts.align || 'left', lineGap: opts.lineGap ?? 3 });
  return doc.y;
}
function box(doc, x, y, w, h, fill='#f5f8ff', stroke='#d7e3f5', r=14) {
  doc.roundedRect(x,y,w,h,r).fillAndStroke(fill, stroke);
}
function brand(doc, dark=false) {
  const y=24;
  try { doc.image(brandHai, 54, y, { fit:[95,34] }); } catch {}
  try { doc.image(brandPark, 154, y+4, { fit:[160,28] }); } catch {}
  doc.font('Regular').fontSize(8).fillColor(dark?'#dbeafe':'#64748b').text('AI Quest', 480, 32, { width:60, align:'right' });
}
function footer(doc, pageLabel, lang) {
  const y=804;
  doc.moveTo(54,y-10).lineTo(541,y-10).strokeColor('#d7e3f5').stroke();
  try { doc.image(brandHai, 54, y, { fit:[54,18] }); } catch {}
  try { doc.image(brandPark, 114, y+2, { fit:[92,16] }); } catch {}
  T(doc, pageLabel, 360, y+2, 180, { lang, size:8, color:'#64748b' });
}
function newDoc(out) {
  const doc = new PDFDocument({ size:'A4', margin:0, info:{Title:'AI Quest Workbook'} });
  doc.registerFont('Regular', font); doc.registerFont('Bold', fontBold);
  doc.pipe(fs.createWriteStream(path.join(root,out)));
  return doc;
}
function cover(doc, cfg) {
  doc.rect(0,0,595,842).fill('#071d38');
  doc.circle(90,80,160).fillOpacity(.35).fill('#56d6ff').fillOpacity(1);
  doc.polygon([0,842],[595,520],[595,842]).fill('#5628a8');
  brand(doc, true);
  T(doc, cfg.pill, 54, 120, 480, { lang:cfg.lang, size:16, bold:true, color:'#b8eeff' });
  T(doc, cfg.title, 54, 170, 480, { lang:cfg.lang, size:38, bold:true, color:'#ffffff', lineGap:4 });
  T(doc, cfg.subtitle, 54, 265, 480, { lang:cfg.lang, size:20, bold:true, color:'#b8eeff' });
  T(doc, cfg.desc, 54, 320, 480, { lang:cfg.lang, size:14, color:'#ffffff' });
  box(doc, 54, 620, 487, 128, '#ffffff22', '#ffffff66', 22);
  T(doc, cfg.fields.join('\n'), 80, 645, 430, { lang:cfg.lang, size:16, color:'#fff', lineGap:12 });
}
function addStudent(stations, lang, out) {
  const isAr = lang==='ar';
  const L = isAr ? {
    pill:'AI Quest · كراسة الطالب', title:'مهمة وكلاء الذكاء الاصطناعي', subtitle:'نشاط موجه 60 دقيقة — بدون هواتف', desc:'نستمع للمرشد، نجيب، نجمع قوى ونخطط نظامًا مبنيًا على AI ومسؤولًا.', fields:['اسم الفريق: ____________________________','أعضاء الفريق: __________________________','اسم المرشد/ة: __________________________'], how:'كيف نعمل؟', lead:'أنتم فريق وكلاء AI. في كل محطة يشرح المرشد عن شركة حقيقية. تجيبون على أسئلة اختيارية، تجمعون “قوة AI”، وفي النهاية تبنون فكرة لنظام مبني على AI، مثل تطبيق أو أداة رقمية، يساعد الأطفال على اختيار مجال تكنولوجي مستقبلي.', flow:['5 د׳ افتتاح','40 د׳ 10 محطات','5 د׳ نقطة فحص','8 د׳ عمل كتابي','2 د׳ تلخيص'], stations:'محطات النشاط', station:'محطة', power:'القوة التي نجمعها', open:'بكلماتكم: كيف تساعد هذه القوة نظامًا مبنيًا على AI للتلاميذ؟', done:'تم جمع القوة ✅   النقاط: ____   توقيع المرشد: ____', final:'العمل الكتابي: نظام AI الخاص بنا', finalLead:'ابنوا فكرة لنظام مبني على AI، مثل تطبيق أو أداة رقمية، يساعد أطفالًا في عمركم على اختيار مجال تكنولوجي مستقبلي — بطريقة ذكية، آمنة وعادلة.', finalQs:['1. اسم النظام','2. ما أهم 3 قوى للنظام؟ ولماذا؟','3. ما الأسئلة التي سيسألها النظام للطالب؟','4. كيف سيحافظ النظام على الخصوصية ولن يقرر وحده؟','5. جملة دعائية للنظام']
  } : {
    pill:'AI Quest · חוברת תלמיד', title:'משימת סוכני ה־AI', subtitle:'פעילות מודרכת של 60 דקות — בלי טלפונים', desc:'מקשיבים למדריך, עונים, אוספים כוחות ומתכננים מערכת מבוססת AI אחראית.', fields:['שם הצוות: ____________________________','חברי הצוות: ___________________________','שם המדריך/ה: _________________________'], how:'איך עובדים?', lead:'אתם צוות סוכני AI. בכל תחנה המדריך מספר על חברה אמיתית. אתם עונים על שאלות אמריקאיות, אוספים “כוח AI”, ובסוף בונים רעיון למערכת מבוססת AI — למשל אפליקציה או כלי דיגיטלי — שעוזרת לילדים לבחור תחום טכנולוגי עתידי.', flow:['5 דק׳ פתיחה','40 דק׳ 10 תחנות','5 דק׳ צ׳קפוינט','8 דק׳ עבודה כתובה','2 דק׳ סיכום'], stations:'תחנות הפעילות', station:'תחנה', power:'כוח שמקבלים', open:'במשפט שלכם: איך הכוח הזה עוזר למערכת מבוססת AI לתלמידים?', done:'כוח נאסף ✅   ניקוד: ____   חתימת מדריך: ____', final:'העבודה הכתובה: מערכת ה־AI שלנו', finalLead:'בנו רעיון למערכת מבוססת AI, כמו אפליקציה או כלי דיגיטלי, שעוזרת לילדים בגילכם לבחור תחום טכנולוגי עתידי — בצורה חכמה, בטוחה והוגנת.', finalQs:['1. שם המערכת שלנו','2. אילו 3 כוחות הכי חשובים למערכת? למה?','3. איזה שאלות המערכת תשאל תלמיד?','4. איך המערכת תשמור על פרטיות ולא תחליט לבד?','5. משפט פרסומת למערכת שלנו']
  };
  const doc = newDoc(out); cover(doc,{...L, lang});
  doc.addPage(); brand(doc); T(doc,L.how,54,85,487,{lang,size:26,bold:true,color:'#123d66'}); box(doc,54,130,487,98,'#fff7ed','#fed7aa',18); T(doc,L.lead,75,150,445,{lang,size:13,bold:true,color:'#10243f'});
  let x=54; for (const f of L.flow) { box(doc,x,260,90,58,'#e0f2fe','#bfdbfe',14); T(doc,f,x+8,276,74,{lang,size:11,bold:true}); x+=99; }
  footer(doc,L.how,lang);
  doc.addPage(); brand(doc); T(doc,L.stations,54,82,487,{lang,size:25,bold:true,color:'#123d66'}); let y=122;
  stations.forEach((s,i)=>{
    if (y>665) { footer(doc,L.stations,lang); doc.addPage(); brand(doc); y=82; }
    box(doc,54,y,487,160,'#fbfdff','#d7e3f5',16);
    doc.fillColor(s.color).roundedRect(54,y,8,160,4).fill();
    try { doc.image(path.join(root,'workbook',s.logo), 72, y+16, { fit:[54,54] }); } catch {}
    T(doc,`${L.station} ${i+1} · ${s.timing}`,140,y+14,370,{lang,size:10,bold:true,color:s.color});
    TLTR(doc,`${s.icon} ${s.name}`,140,y+31,170,{size:16,bold:true,color:'#10243f'});
    T(doc,`${L.power}: ${s.power}`,140,y+55,370,{lang,size:11,bold:true,color:s.color});
    T(doc,s.explain[0],72,y+80,438,{lang,size:9.5});
    let qy=y+108;
    s.mc.forEach((m,mi)=>{ T(doc,`${mi+1}. ${m.q}`,72,qy,438,{lang,size:8.8,bold:true}); qy+=14; T(doc,m.a.map((a,ai)=>`${['א','ב','ג','ד'][ai] || ['أ','ب','ج','د'][ai]}. ${a}`).join('   '),72,qy,438,{lang,size:8}); qy+=15; });
    y+=174;
  });
  footer(doc,L.stations,lang);
  doc.addPage(); brand(doc); T(doc,L.final,54,82,487,{lang,size:25,bold:true,color:'#123d66'}); box(doc,54,128,487,76,'#fff7ed','#fed7aa',18); T(doc,L.finalLead,75,150,445,{lang,size:13,bold:true}); let y2=230; L.finalQs.forEach(q=>{ T(doc,q,54,y2,487,{lang,size:15,bold:true,color:'#123d66'}); doc.roundedRect(54,y2+28,487,86,12).strokeColor('#94a3b8').dash(4,{space:3}).stroke().undash(); y2+=126; }); footer(doc,L.final,lang); doc.end();
}
function addGuide(stations, lang, out) {
  const isAr=lang==='ar'; const L=isAr?{pill:'AI Quest · للمرشد',title:'نص إرشاد',subtitle:'نشاط 60 دقيقة بدون هواتف',desc:'ما نشرحه عن كل شركة، ماذا نسأل، وما هي الإجابة الجيدة.',fields:['اسم المرشد/ة: _________________________','المجموعة/الصف: ________________________','التاريخ: _______________________________'],structure:'مبنى 60 دقيقة',scripts:'نصوص المحطات',say:'ما نقوله بالضبط:',analogy:'تشبيه للأطفال:',emph:'نقاط للتأكيد:',answers:'إجابات الأسئلة الاختيارية:',rubric:'تقييم العمل الكتابي',accept:'السؤال المفتوح — نقبل إجابة تربط القوة بنظام مبني على AI للتلاميذ.'}:{pill:'AI Quest · למדריך',title:'תסריט מדריך',subtitle:'פעילות 60 דקות בלי טלפונים',desc:'מה להסביר על כל חברה, מה לשאול, ומה נחשב תשובה טובה.',fields:['שם המדריך/ה: _________________________','קבוצה/כיתה: __________________________','תאריך: _______________________________'],structure:'מבנה 60 דקות',scripts:'תסריטי התחנות',say:'מה להגיד בדיוק:',analogy:'דימוי לילדים:',emph:'להדגיש:',answers:'תשובות לשאלות האמריקאיות:',rubric:'מחוון לעבודה הכתובה',accept:'שאלה פתוחה — לקבל תשובה שמחברת את הכוח למערכת מבוססת AI לתלמידים.'};
  const doc=newDoc(out); cover(doc,{...L,lang});
  doc.addPage(); brand(doc); T(doc,L.structure,54,82,487,{lang,size:25,bold:true,color:'#123d66'}); const rows=isAr?['0–5 افتتاح — لا هواتف، نجمع قوى AI','5–45 10 محطات × 4 دقائق — شرح قصير، إجابة، فحص','45–50 نقطة فحص — كل فريق يختار 3 قوى مهمة','50–58 عمل كتابي — تخطيط نظام مبني على AI','58–60 تلخيص — مشاركة قصيرة']:['0–5 פתיחה — אין טלפונים, אוספים כוחות AI','5–45 10 תחנות × 4 דקות — הסבר קצר, מענה, בדיקה','45–50 צ׳קפוינט — כל צוות בוחר 3 כוחות חשובים','50–58 עבודה כתובה — תכנון מערכת מבוססת AI','58–60 סיכום — שיתוף קצר']; let y=132; rows.forEach(r=>{box(doc,70,y,455,50,'#eef6ff','#c7ddff',14); T(doc,r,86,y+16,420,{lang,size:13,bold:true}); y+=62;}); box(doc,54,500,487,90,'#fff7ed','#fed7aa',18); T(doc,isAr?'لا حاجة لفحص عميق لكل كراسة أثناء النشاط. مرّوا بين الفرق، تأكدوا أنهم يتقدمون ويفهمون الفكرة، وركّزوا التقييم في النهاية على العمل الكتابي.':'אין צורך לבדוק לעומק כל חוברת בזמן הפעילות. עוברים בין הצוותים, מוודאים שהם מתקדמים ומבינים, ואת הבדיקה המרכזית עושים בסוף לפי העבודה הכתובה.',75,525,445,{lang,size:13,bold:true}); footer(doc,L.structure,lang);
  doc.addPage(); brand(doc); T(doc,L.scripts,54,82,487,{lang,size:25,bold:true,color:'#123d66'}); y=125;
  stations.forEach((s,i)=>{ if(y>610){footer(doc,L.scripts,lang); doc.addPage(); brand(doc); y=82;} box(doc,54,y,487,205,'#ffffff','#d7e3f5',16); doc.fillColor(s.color).roundedRect(54,y,8,205,4).fill(); TLTR(doc,`${i+1}. ${s.icon} ${s.name}`,74,y+14,220,{size:15,bold:true,color:s.color}); T(doc,`${s.power} · ${s.timing}`,300,y+17,220,{lang,size:10,bold:true,color:s.color}); T(doc,L.say,74,y+42,430,{lang,size:10,bold:true}); T(doc,s.explain.join(' '),74,y+60,430,{lang,size:8.8}); T(doc,`${L.analogy} ${s.analogy}`,74,y+104,430,{lang,size:8.8,bold:true,color:'#334155'}); T(doc,`${L.emph} ${s.emphasize.join(' · ')}`,74,y+134,430,{lang,size:8.3}); T(doc,`${L.answers} ${s.mc.map((m,mi)=>`${mi+1}. ${m.a[m.correct]}`).join(' · ')}. ${L.accept}`,74,y+163,430,{lang,size:8.1,color:'#0f172a'}); y+=219; });
  footer(doc,L.scripts,lang);
  doc.addPage(); brand(doc); T(doc,L.rubric,54,82,487,{lang,size:25,bold:true,color:'#123d66'}); const rub=isAr?['فكرة واضحة — لمن يساعد النظام وماذا يفعل — 5 نقاط','استخدام القوى — 3 قوى على الأقل من المحطات — 5 نقاط','مسؤولية وخصوصية — أمان، خصوصية أو رقابة إنسانية — 5 نقاط','لغة للأطفال — شرح يفهمه أطفال 12–13 — 5 نقاط']:['רעיון ברור — למי המערכת עוזרת ומה היא עושה — 5 נקודות','שימוש בכוחות — לפחות 3 כוחות מהתחנות — 5 נקודות','אחריות ופרטיות — אבטחה, פרטיות או בקרה אנושית — 5 נקודות','שפה לילדים — הסבר שילדים בני 12–13 מבינים — 5 נקודות']; y=140; rub.forEach(r=>{box(doc,70,y,455,62,'#f5f8ff','#d7e3f5',14); T(doc,r,90,y+20,415,{lang,size:13,bold:true}); y+=78;}); footer(doc,L.rubric,lang); doc.end();
}

fs.copyFileSync(path.join(root,'assets/brand/hai-tech-logo.webp'), path.join(root,'assets/brand/hai-tech-logo-source.webp'));
// Ensure a JPEG exists for PDFKit.
if (!fs.existsSync(brandHai)) {
  // fallback: already fetched earlier from hai.tech/logo.jpg by caller if available
}
addStudent(heStations,'he','workbook/ai-quest-student-60min-he.pdf');
addGuide(heStations,'he','workbook/ai-quest-instructor-60min-he.pdf');
addStudent(arStations,'ar','workbook/ai-quest-student-60min-ar.pdf');
addGuide(arStations,'ar','workbook/ai-quest-instructor-60min-ar.pdf');
console.log('PDF generation started');
