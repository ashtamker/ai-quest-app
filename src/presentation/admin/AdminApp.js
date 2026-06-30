import { field, card } from '../shared/dom.js';

const questionTypes = [
  { value: 'single', label: 'אמריקאית' },
  { value: 'true_false', label: 'נכון / לא נכון' },
  { value: 'short', label: 'פתוחה קצרה' },
];
const tabs = [
  { id: 'events', label: 'אירועים' },
  { id: 'results', label: 'ניקוד' },
  { id: 'puzzle', label: 'פאזל' },
  { id: 'questions', label: 'שאלות' },
  { id: 'companies', label: 'חברות' },
  { id: 'problem', label: 'בעיית מודל' },
  { id: 'tools', label: 'כלים' },
];

function esc(value = '') { return String(value ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
function option(value, label, selected) { return `<option value="${esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${esc(label)}</option>`; }

function defaultCheckpointStops(){return [
  {id:'cp-food-break',type:'food_photo',threshold:4,title:'עצירת אוכל / טעינה'},
  {id:'cp-leumi-funding',type:'funding_photo',threshold:7,title:'מימון מבנק לאומי'},
  {id:'cp-instructor-1',type:'instructor_approval',threshold:10,title:'צ׳קפוינט מדריך 1'},
  {id:'cp-instructor-2',type:'instructor_approval',threshold:17,title:'צ׳קפוינט מדריך 2'},
  {id:'cp-instructor-3',type:'instructor_approval',threshold:24,title:'צ׳קפוינט מדריך 3'}
];}
function checkpointStops(event){const raw=event?.checkpointConfig?.stops;const base=defaultCheckpointStops();return (Array.isArray(raw)&&raw.length?raw:base).slice(0,5).map((x,i)=>({...base[i],...x,id:x.id||base[i].id,threshold:Number(x.threshold||base[i].threshold||4),type:['food_photo','funding_photo'].includes(x.type)?x.type:'instructor_approval'}));}
function checkpointStopsForm(e){const stops=checkpointStops(e);return `<h3>עצירות וצ׳קפוינטים — סך הכול 5 עצירות</h3><p class="notice">עצירת אוכל היא לא חסימה: התלמידים מעלים צילום וממשיכים. צ׳קפוינט מדריך חוסם עד אישור מדריך.</p><div class="admin-form-grid">${stops.map((cp,i)=>`<fieldset class="checkpoint-admin-stop"><legend>עצירה ${i+1}</legend><label><span>סוג</span><select name="stopType:${i}"><option value="food_photo" ${cp.type==='food_photo'?'selected':''}>עצירת אוכל / צילום</option><option value="funding_photo" ${cp.type==='funding_photo'?'selected':''}>מימון בנק לאומי / צילום</option><option value="instructor_approval" ${!['food_photo','funding_photo'].includes(cp.type)?'selected':''}>צ׳קפוינט מדריך</option></select></label><label><span>אחרי כמה חברות</span><input name="stopThreshold:${i}" type="number" min="1" max="65" value="${esc(cp.threshold)}"></label><label><span>כותרת</span><input name="stopTitle:${i}" value="${esc(cp.title||'')}"></label></fieldset>`).join('')}</div>`;}

function defaultTeamAccess(){return [{id:'red',name:'צוות אדום',password:'R4821'},{id:'white',name:'צוות לבן',password:'W7394'},{id:'blue',name:'צוות כחול',password:'B5168'},{id:'green',name:'צוות ירוק',password:'G2947'},{id:'yellow',name:'צוות צהוב',password:'Y8635'},{id:'purple',name:'צוות סגול',password:'P1476'}];}
function countBy(items, fn) { return items.reduce((acc, item) => { const k = fn(item); acc[k] = (acc[k] || 0) + 1; return acc; }, {}); }
function questionLabel(q, companies) { const c = companies.find(x => x.id === q.companyId); return `${c?.nameHe || q.companyId || 'ללא חברה'} · ${questionTypes.find(x => x.value === (q.type || 'single'))?.label || q.type}`; }
function questionForm(q, companies) {
  const isNew = q.id === '__new__';
  return `<form class="admin-editor question-edit" data-id="${esc(q.id)}">
    <div class="admin-editor-head"><div><h2>${isNew ? 'שאלה חדשה' : 'עריכת שאלה'}</h2><p>${isNew ? 'הוספת שאלה לבנק הפעילות' : esc(questionLabel(q, companies))}</p></div><span class="status-badge ${q.active === false ? 'warn' : ''}">${q.active === false ? 'כבויה' : 'פעילה'}</span></div>
    <div class="admin-form-grid">
      <label><span>חברה</span><select name="companyId">${companies.map((c) => option(c.id, `${c.nameHe} · רמה ${c.level}`, q.companyId)).join('')}</select></label>
      <label><span>סוג שאלה</span><select name="type">${questionTypes.map((x) => option(x.value, x.label, q.type || 'single')).join('')}</select></label>
      ${field('נקודות', 'points', q.points || 10, 'number')}
      <label class="inline-check"><input type="checkbox" name="active" ${q.active === false ? '' : 'checked'}> פעילה</label>
    </div>
    <label><span>שאלה בעברית</span><textarea name="textHe">${esc(q.textHe)}</textarea></label>
    <label><span>שאלה בערבית</span><textarea name="textAr">${esc(q.textAr)}</textarea></label>
    <div class="admin-form-grid">
      <label><span>אפשרויות בעברית — שורה לכל אפשרות</span><textarea name="optionsHe">${esc((q.optionsHe || []).join('\n'))}</textarea></label>
      <label><span>אפשרויות בערבית — שורה לכל אפשרות</span><textarea name="optionsAr">${esc((q.optionsAr || []).join('\n'))}</textarea></label>
    </div>
    ${field('מספר תשובה נכונה / טקסט לתשובה פתוחה', 'correctAnswer', q.type === 'short' ? (q.correctText || '') : String(q.correctAnswer ?? 0))}
    <label><span>מילות מפתח לתשובה פתוחה — מופרדות בפסיק</span><input name="acceptedKeywords" value="${esc((q.acceptedKeywords || []).join(', '))}"></label>
    <div class="admin-form-grid"><label><span>הסבר בעברית</span><textarea name="explanationHe">${esc(q.explanationHe)}</textarea></label><label><span>הסבר בערבית</span><textarea name="explanationAr">${esc(q.explanationAr)}</textarea></label></div>
    <button class="primary">שמירת שאלה</button>
  </form>`;
}
function questionCard(q, companies) {
  const company = companies.find(c => c.id === q.companyId);
  const missing = !q.textAr || ((q.optionsHe || []).length && !(q.optionsAr || []).length) || !q.explanationAr;
  return `<article class="admin-row ${q.active === false ? 'muted-row' : ''}" data-question-card="${esc(q.id)}"><div><b>${esc(company?.nameHe || q.companyId)}</b><p>${esc(q.textHe || 'שאלה ללא טקסט')}</p><small>${questionTypes.find(x => x.value === (q.type || 'single'))?.label || q.type} · ${q.points || 0} נק׳ ${missing ? '· חסר תרגום/הסבר' : ''}</small></div><button data-edit-question="${esc(q.id)}">עריכה</button></article>`;
}

function stationTypeLabel(type){return (type||'model')==='knowledge'?'ידע + ניקוד':'מחזק מודל + ניקוד';}
function leaderboardRows(teams=[]){return [...teams].sort((a,b)=>(b.score||0)-(a.score||0)||String(a.name||'').localeCompare(String(b.name||'')));}
function leaderboardTable(teams=[]){const rows=leaderboardRows(teams);return `<section class="leaderboard-panel admin-editor"><div class="admin-editor-head"><div><h2>טבלת ניקוד</h2><p>דירוג צוותים לפי ניקוד, חברות, יכולות ומשתתפים.</p></div><span class="status-badge">${rows.length} צוותים</span></div><div class="leaderboard-table-wrap"><table class="leaderboard-table"><thead><tr><th>#</th><th>צוות</th><th>ניקוד</th><th>חברות</th><th>יכולות מודל</th><th>משתתפים</th></tr></thead><tbody>${rows.map((t,i)=>`<tr><td>${i+1}</td><td>${esc(t.name||t.id)}</td><td><b>${t.score||0}</b></td><td>${(t.completedCompanies||[]).length}</td><td>${(t.collectedAbilities||[]).length}</td><td>${(t.participants||[]).map(p=>esc(p.name)).join(', ')||'-'}</td></tr>`).join('')||`<tr><td colspan="6">אין עדיין צוותים</td></tr>`}</tbody></table></div></section>`;}
function companyForm(c) {
  return `<form class="admin-editor company-edit" data-id="${esc(c.id)}"><div class="admin-editor-head"><div><h2>${esc(c.nameHe)}</h2><p>${esc(c.id)} · רמה ${c.level}</p></div><span class="status-badge ${(!c.nameAr || !c.descriptionAr) ? 'warn' : ''}">${(!c.nameAr || !c.descriptionAr) ? 'חסר תרגום' : 'תקין'}</span></div><div class="admin-form-grid">${field('שם בעברית', 'nameHe', c.nameHe)}${field('שם בערבית', 'nameAr', c.nameAr)}${field('תחום', 'field', c.field)}${field('רמה', 'level', c.level, 'number')}<label><span>סוג תחנה</span><select name="stationType"><option value="model" ${(c.stationType||'model')==='knowledge'?'':'selected'}>מחזק מודל + ניקוד</option><option value="knowledge" ${(c.stationType||'model')==='knowledge'?'selected':''}>ידע + ניקוד</option></select></label>${field('URL ללוגו רשמי / תמונת עזר', 'logoUrl', c.logoUrl || '', 'url')}${field('סימון קצר אם אין לוגו', 'logoMark', c.logoMark || '')}</div><label><span>תיאור עברית</span><textarea name="descriptionHe">${esc(c.descriptionHe || '')}</textarea></label><label><span>תיאור ערבית</span><textarea name="descriptionAr">${esc(c.descriptionAr || '')}</textarea></label><small>סוג התחנה קובע מה יופיע אחרי השלמת חברה: תחנת מודל מוסיפה יכולת למודל; תחנת ידע נותנת ניקוד וידע בלבד. הלוגו באפליקציה הוא לזיהוי בלבד.</small><button class="primary">שמירת חברה</button></form>`;
}


function teamAccessEditor(teamAccess=[]){
  const teams = teamAccess.length ? teamAccess : defaultTeamAccess();
  return `<h3>צוותים וסיסמאות</h3><p class="notice">אפשר לנהל כאן כמה צוותים יהיו באירוע. מזהה צוות באנגלית/מספרים משמש לכניסת תלמידים מאחורי הקלעים; שם וסיסמה מוצגים למדריך.</p><div class="team-access-editor">${teams.map((tm,i)=>`<fieldset class="team-access-row"><legend>צוות ${i+1}</legend><label><span>מזהה</span><input name="teamId:${i}" value="${esc(tm.id)}" required pattern="[A-Za-z0-9_-]+"></label><label><span>שם צוות</span><input name="teamName:${i}" value="${esc(tm.name)}" required></label><label><span>סיסמה</span><input name="teamPassword:${i}" value="${esc(tm.password || '')}" required></label><label class="inline-check"><input type="checkbox" name="teamDelete:${i}"> מחק צוות</label></fieldset>`).join('')}</div><label><span>הוסף מספר צוותים חדשים בשמירה</span><input name="addTeamCount" type="number" min="0" max="20" value="0"></label>`;
}
function parseTeamAccessForm(fd, old){
  const source = old.teamAccess && old.teamAccess.length ? old.teamAccess : defaultTeamAccess();
  const rows = [];
  source.forEach((tm,i)=>{
    if (fd.get(`teamDelete:${i}`) === 'on') return;
    rows.push({ id: String(fd.get(`teamId:${i}`)||tm.id||'').trim(), name: String(fd.get(`teamName:${i}`)||tm.name||'').trim(), password: String(fd.get(`teamPassword:${i}`)||tm.password||'').trim() });
  });
  const add = Math.max(0, Math.min(20, Number(fd.get('addTeamCount') || 0)));
  const used = new Set(rows.map(t=>t.id));
  for(let i=0;i<add;i++){
    let n = rows.length + 1, id = `team${n}`;
    while(used.has(id)){ n++; id = `team${n}`; }
    used.add(id);
    rows.push({ id, name: `צוות ${n}`, password: `T${String(n).padStart(2,'0')}123!` });
  }
  return rows.length ? rows : defaultTeamAccess();
}

function eventForm(event, companies) {
  const e = event || { id: '__new__', name: 'AI Quest חדש', code: '', active: true, availableLanguages: ['he', 'ar'], availableDurations: [60, 90, 135], selectedModelProblemId: 'future-field', activeCompanyIds: companies.map(c => c.id), checkpointConfig: { instructorCode: 'AI2026', adminCode: 'Admin1092', stops: defaultCheckpointStops() }, puzzleConfig: { enabled: false, pieceCount: 12, imageUrl: '' }, teamAccess: defaultTeamAccess() };
  const activeIds = new Set(e.activeCompanyIds || []), teamAccess = e.teamAccess || defaultTeamAccess();
  const finalStatus=e.finalizedAt?`<p class="notice strong ok">הפעילות הסתיימה: המשימה הסופית פתוחה (${esc(new Date(e.finalizedAt).toLocaleString('he-IL'))})</p>`:'';
  return `<form class="admin-editor event-edit" data-id="${esc(e.id)}"><div class="admin-editor-head"><div><h2>${e.id === '__new__' ? 'אירוע חדש' : esc(e.name)}</h2><p>${esc(e.id)} · ${esc(e.code || 'ללא קוד')}</p></div><span class="status-badge ${e.active ? '' : 'warn'}">${e.active ? 'פעיל' : 'כבוי'}</span></div>${finalStatus}<div class="admin-form-grid">${field('שם אירוע', 'name', e.name)}${field('קוד אירוע לתלמידים', 'code', e.code || '')}${field('קוד מדריך', 'instructorCode', e.checkpointConfig?.instructorCode || e.checkpointConfig?.code || 'AI2026')}${field('קוד אדמין', 'adminCode', e.checkpointConfig?.adminCode || 'Admin1092')}<label><span>משכי פעילות — מופרדים בפסיק</span><input name="availableDurations" value="${esc((e.availableDurations || [60,90,135]).join(', '))}"></label><label class="inline-check"><input type="checkbox" name="active" ${e.active === false ? '' : 'checked'}> אירוע פעיל</label><label class="inline-check"><input type="checkbox" name="paused" ${e.gameStatus === 'paused' || e.pausedAt ? 'checked' : ''}> עצירת משחק זמנית — תלמידים לא יכולים להשלים משימות</label></div>${checkpointStopsForm(e)}${teamAccessEditor(teamAccess)}<h3>חברות פעילות באירוע (${activeIds.size}/${companies.length})</h3><div class="company-pick-grid">${companies.map(c => `<label class="company-pick"><input type="checkbox" name="activeCompanyIds" value="${esc(c.id)}" ${activeIds.has(c.id) ? 'checked' : ''}><span>${esc(c.nameHe || c.nameEn || c.id)}</span><small>${esc(c.field || '')}</small></label>`).join('')}</div><div class="admin-tool-grid"><button class="primary">שמירת אירוע</button>${e.id !== '__new__' ? `<button type="button" data-finalize-event="${esc(e.id)}" ${e.finalizedAt?'disabled':''}>${e.finalizedAt?'המשימה הסופית כבר פתוחה':'סיים פעילות ופתח משימה סופית'}</button><button type="button" data-duplicate-event="${esc(e.id)}">שכפול אירוע</button><button type="button" class="danger" data-delete-event="${esc(e.id)}" ${e.active?'disabled title="אי אפשר למחוק אירוע פעיל"':''}>מחק אירוע</button><button type="button" data-export-json="${esc(e.id)}">ייצוא תוצאות JSON</button><button type="button" data-export-csv="${esc(e.id)}">ייצוא תוצאות CSV</button>` : ''}</div></form>`;
}

function puzzleForm(event) {
  const e = event || { id: '__new__', name: 'בחרו אירוע', puzzleConfig: { pieceCount: 12, imageUrl: '' } };
  const cfg = e.puzzleConfig || {}, hasImage = !!cfg.imageUrl, enabled = !!cfg.enabled;
  return `<form class="admin-editor puzzle-edit" data-id="${esc(e.id)}"><div class="admin-editor-head"><div><h2>ניהול פאזל</h2><p>${esc(e.name || '')} · מספר חלקים ותמונת רקע לתלמידים</p></div><span class="status-badge ${enabled ? '' : 'warn'}">${enabled ? 'פעיל' : 'כבוי'}</span></div><div class="admin-form-grid"><label class="inline-check"><input type="checkbox" name="enabled" ${enabled?'checked':''}> פאזל פעיל לתלמידים</label><label><span>מספר חלקים בפאזל</span><input name="pieceCount" type="number" min="1" max="48" value="${esc(cfg.pieceCount || 12)}"></label><label><span>העלאת תמונת פאזל</span><input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></label></div>${hasImage ? `<div class="puzzle-admin-preview"><img src="${esc(cfg.imageUrl)}" alt="תמונת הפאזל הנוכחית"><small>${esc(cfg.imageName || cfg.imageUrl)}</small></div>` : `<p class="notice">אפשר לשמור מספר חלקים גם בלי תמונה. עד שתועלה תמונה, התלמידים יראו חלקים דיגיטליים רגילים.</p>`}<button class="primary">שמירת פאזל</button></form>`;
}

export class AdminApp {
  constructor(repo, root) {
    this.repo = repo; this.root = root;
    this.tab = sessionStorage.getItem('aiQuest.admin.tab') || 'questions';
    this.search = sessionStorage.getItem('aiQuest.admin.search') || '';
    this.companyId = sessionStorage.getItem('aiQuest.admin.companyId') || 'all';
    this.type = sessionStorage.getItem('aiQuest.admin.type') || 'all';
    this.selectedQuestionId = sessionStorage.getItem('aiQuest.admin.selectedQuestionId') || '__new__';
    this.selectedEventId = sessionStorage.getItem('aiQuest.admin.selectedEventId') || 'first';
  }

  async render() {
    const s = await this.repo.state();
    const statsByCompany = countBy(s.questions, q => q.companyId || 'unknown');
    const missingTranslations = s.questions.filter(q => !q.textAr || !q.explanationAr || ((q.optionsHe || []).length && !(q.optionsAr || []).length)).length;
    const summary = `<div class="admin-kpis"><span><b>${s.companies.length}</b> חברות</span><span><b>${s.questions.length}</b> שאלות</span><span><b>${s.abilities.length}</b> יכולות</span><span class="${missingTranslations ? 'warn-text' : ''}"><b>${missingTranslations}</b> חסרי תרגום/הסבר</span></div>`;
    this.root.innerHTML = `<section class="admin-shell"><div class="admin-hero"><div><h1>מערכת אדמין</h1><p>ניהול תוכן הפעילות בלי להציף את המסך: חיפוש, סינון ועריכה ממוקדת.</p></div></div>${summary}<div class="admin-tabs">${tabs.map(x => `<button data-admin-tab="${x.id}" class="${this.tab === x.id ? 'active' : ''}">${x.label}</button>`).join('')}</div>${this.content(s, statsByCompany)}</section>`;
    this.bind(s);
  }

  content(s, statsByCompany) {
    if (this.tab === 'events') return this.events(s);
    if (this.tab === 'puzzle') return this.puzzle(s);
    if (this.tab === 'results') return this.results(s);
    if (this.tab === 'companies') return this.companies(s, statsByCompany);
    if (this.tab === 'problem') return this.problems(s);
    if (this.tab === 'tools') return this.tools(s);
    return this.questions(s);
  }

  currentEvent(s) {
    return this.selectedEventId === 'first' ? (s.events.find(e => e.active) || s.events[0]) : s.events.find(e => e.id === this.selectedEventId) || s.events.find(e => e.active) || s.events[0];
  }

  newEventTemplate(s) {
    const source = this.currentEvent(s) || {};
    const { finalizedAt, pausedAt, gameStatus, createdAt, updatedAt, ...settings } = source;
    return { ...settings, id: '__new__', name: `${source.name || 'AI Quest'} — חדש`, code: '', active: false, gameStatus: 'running', checkpointConfig: source.checkpointConfig || { instructorCode: 'AI2026', adminCode: 'Admin1092', stops: defaultCheckpointStops() }, puzzleConfig: source.puzzleConfig || { enabled:false, pieceCount:12, imageUrl:'' }, teamAccess: source.teamAccess || defaultTeamAccess(), activeCompanyIds: source.activeCompanyIds || s.companies.map(c => c.id), availableDurations: source.availableDurations || [60,90,135], selectedModelProblemId: source.selectedModelProblemId || s.modelProblems[0]?.id, availableLanguages: source.availableLanguages || ['he','ar'] };
  }

  results(s) {
    const active = s.events.find(e => e.active) || s.events[0];
    const teams = s.teams.filter(t => !active || t.eventId === active.id);
    return `${leaderboardTable(teams)}<p class="notice">אפשר גם לייצא תוצאות JSON/CSV מתוך לשונית אירועים.</p>`;
  }

  events(s) {
    const selected = this.selectedEventId === '__new__' ? this.newEventTemplate(s) : this.currentEvent(s);
    return `<div class="admin-split events-admin"><section class="admin-list"><div class="admin-list-head"><h2>אירועים (${s.events.length})</h2><button id="newEvent" class="primary">+ אירוע חדש</button></div>${s.events.map(e => `<article class="admin-row ${e.active === false ? 'muted-row' : ''}"><div><b>${esc(e.name)}</b><p>קוד תלמידים: ${esc(e.code)} · חברות פעילות: ${(e.activeCompanyIds || []).length}</p><small>מדריך: ${esc(e.checkpointConfig?.instructorCode || e.checkpointConfig?.code || '—')} · אדמין: ${esc(e.checkpointConfig?.adminCode || '—')}</small></div><button data-edit-event="${esc(e.id)}">עריכה</button></article>`).join('')}</section><section>${eventForm(selected, s.companies)}</section></div>`;
  }

  puzzle(s) {
    const selected = this.selectedEventId === 'first' ? (s.events.find(e => e.active) || s.events[0]) : s.events.find(e => e.id === this.selectedEventId) || s.events[0];
    return `<div class="admin-split puzzle-admin"><section class="admin-list"><div class="admin-list-head"><h2>פאזלים לפי אירוע</h2></div>${s.events.map(e => `<article class="admin-row ${e.active === false ? 'muted-row' : ''}"><div><b>${esc(e.name)}</b><p>${esc(e.puzzleConfig?.imageUrl ? 'יש תמונת פאזל' : 'אין תמונה')} · ${(e.puzzleConfig?.pieceCount || 12)} חלקים</p><small>קוד אירוע: ${esc(e.code)}</small></div><button data-edit-event="${esc(e.id)}">ניהול פאזל</button></article>`).join('')}</section><section>${puzzleForm(selected)}</section></div>`;
  }

  questions(s) {
    const qText = this.search.trim().toLowerCase();
    const filtered = s.questions.filter(q => {
      const company = s.companies.find(c => c.id === q.companyId);
      const haystack = [q.textHe, q.textAr, q.id, company?.nameHe, company?.nameAr].join(' ').toLowerCase();
      return (!qText || haystack.includes(qText)) && (this.companyId === 'all' || q.companyId === this.companyId) && (this.type === 'all' || (q.type || 'single') === this.type);
    });
    const selected = this.selectedQuestionId === '__new__' ? null : s.questions.find(q => q.id === this.selectedQuestionId);
    const newQuestion = { id: '__new__', companyId: this.companyId === 'all' ? s.companies[0]?.id : this.companyId, type: 'single', textHe: '', textAr: '', optionsHe: ['', '', '', ''], optionsAr: ['', '', '', ''], correctAnswer: 0, explanationHe: '', explanationAr: '', points: 10, active: true };
    return `<div class="admin-toolbar"><label><span>חיפוש</span><input id="adminSearch" value="${esc(this.search)}" placeholder="חברה / טקסט שאלה / מזהה"></label><label><span>חברה</span><select id="adminCompanyFilter"><option value="all">כל החברות</option>${s.companies.map(c => option(c.id, c.nameHe, this.companyId)).join('')}</select></label><label><span>סוג</span><select id="adminTypeFilter"><option value="all">כל הסוגים</option>${questionTypes.map(x => option(x.value, x.label, this.type)).join('')}</select></label><button id="newQuestion" class="primary">+ שאלה חדשה</button></div><div class="admin-split"><section class="admin-list"><h2>שאלות (${filtered.length})</h2>${filtered.map(q => questionCard(q, s.companies)).join('') || card('<h2>לא נמצאו שאלות</h2>', 'empty-state')}</section><section>${questionForm(selected || newQuestion, s.companies)}</section></div>`;
  }

  companies(s, statsByCompany) {
    const q = this.search.trim().toLowerCase();
    const companies = s.companies.filter(c => !q || [c.nameHe, c.nameAr, c.id, c.field].join(' ').toLowerCase().includes(q));
    return `<div class="admin-toolbar"><label><span>חיפוש חברה</span><input id="adminSearch" value="${esc(this.search)}" placeholder="שם / תחום / מזהה"></label></div><div class="admin-split"><section class="admin-list"><h2>חברות (${companies.length})</h2>${companies.map(c => `<article class="admin-row"><div><b>${esc(c.nameHe)}</b><p>${esc(c.field || '')}</p><small>${stationTypeLabel(c.stationType)} · ${statsByCompany[c.id] || 0} שאלות · רמה ${c.level}</small></div><button data-edit-company="${esc(c.id)}">עריכה</button></article>`).join('')}</section><section>${companyForm(companies[0] || s.companies[0])}</section></div>`;
  }

  problems(s) {
    return `<div class="admin-grid">${s.modelProblems.map(p => `<form class="admin-editor problem-edit" data-id="${esc(p.id)}"><div class="admin-editor-head"><div><h2>${esc(p.titleHe)}</h2><p>${esc(p.id)}</p></div></div>${field('כותרת עברית', 'titleHe', p.titleHe)}${field('כותרת ערבית', 'titleAr', p.titleAr)}<label><span>תיאור עברית</span><textarea name="descriptionHe">${esc(p.descriptionHe)}</textarea></label><label><span>תיאור ערבית</span><textarea name="descriptionAr">${esc(p.descriptionAr)}</textarea></label><button class="primary">שמירת בעיית מודל</button></form>`).join('')}</div>`;
  }

  tools(s) {
    return `<section class="admin-editor"><h2>כלי ניהול</h2><p>פעולות רגישות לפעילות בזמן אמת.</p><div class="admin-tool-grid"><button id="resetDemo" class="danger">איפוס כל נתוני הפעילות</button><button id="downloadState">הורדת snapshot JSON</button></div><p class="notice">איפוס מוחק צוותים, הגשות וצ׳קפוינטים — לא את בנק השאלות.</p></section>`;
  }

  bind(s) {
    this.root.querySelectorAll('[data-admin-tab]').forEach(b => b.onclick = () => { this.tab = b.dataset.adminTab; sessionStorage.setItem('aiQuest.admin.tab', this.tab); this.render(); });
    const search = this.root.querySelector('#adminSearch'); if (search) search.oninput = () => { this.search = search.value; sessionStorage.setItem('aiQuest.admin.search', this.search); clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.render(), 250); };
    const companyFilter = this.root.querySelector('#adminCompanyFilter'); if (companyFilter) companyFilter.onchange = () => { this.companyId = companyFilter.value; sessionStorage.setItem('aiQuest.admin.companyId', this.companyId); this.selectedQuestionId = '__new__'; sessionStorage.setItem('aiQuest.admin.selectedQuestionId', this.selectedQuestionId); this.render(); };
    const typeFilter = this.root.querySelector('#adminTypeFilter'); if (typeFilter) typeFilter.onchange = () => { this.type = typeFilter.value; sessionStorage.setItem('aiQuest.admin.type', this.type); this.render(); };
    const newQuestion = this.root.querySelector('#newQuestion'); if (newQuestion) newQuestion.onclick = () => { this.selectedQuestionId = '__new__'; sessionStorage.setItem('aiQuest.admin.selectedQuestionId', this.selectedQuestionId); this.render(); };
    this.root.querySelectorAll('[data-edit-question]').forEach(b => b.onclick = () => { this.selectedQuestionId = b.dataset.editQuestion; sessionStorage.setItem('aiQuest.admin.selectedQuestionId', this.selectedQuestionId); this.render(); });
    this.root.querySelectorAll('[data-edit-company]').forEach(b => b.onclick = () => { const c = s.companies.find(x => x.id === b.dataset.editCompany); if (!c) return; const holder = this.root.querySelector('.admin-split section:last-child'); holder.innerHTML = companyForm(c); this.bindCompanyForms(s); });
    const newEvent = this.root.querySelector('#newEvent'); if (newEvent) newEvent.onclick = () => { this.selectedEventId = '__new__'; sessionStorage.setItem('aiQuest.admin.selectedEventId', this.selectedEventId); this.render(); };
    this.root.querySelectorAll('[data-edit-event]').forEach(b => b.onclick = () => { this.selectedEventId = b.dataset.editEvent; sessionStorage.setItem('aiQuest.admin.selectedEventId', this.selectedEventId); this.render(); });
    this.bindEventForms(s);
    this.bindPuzzleForms(s);
    this.bindCompanyForms(s);
    this.root.querySelectorAll('.problem-edit').forEach(f => f.onsubmit = async e => { e.preventDefault(); const old = s.modelProblems.find(p => p.id === f.dataset.id); await this.repo.saveProblem({ ...old, ...Object.fromEntries(new FormData(f)) }); this.render(); });
    this.root.querySelectorAll('.question-edit').forEach(f => f.onsubmit = async e => { e.preventDefault(); await this.saveQuestion(f, s); });
    const reset = this.root.querySelector('#resetDemo'); if (reset) reset.onclick = async () => { if (confirm('לאפס את כל הצוותים, התמונות והצ׳קפוינטים בפעילות?')) { await this.repo.reset(); localStorage.removeItem('aiQuest.currentTeam'); this.render(); } };
    const download = this.root.querySelector('#downloadState'); if (download) download.onclick = () => this.download(`ai-quest-state-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(s, null, 2), 'application/json');
  }

  bindEventForms(s) {
    this.root.querySelectorAll('.event-edit').forEach(f => f.onsubmit = async e => { e.preventDefault(); const fd = new FormData(f), old = f.dataset.id === '__new__' ? this.newEventTemplate(s) : (s.events.find(ev => ev.id === f.dataset.id) || {}); const teamAccess=parseTeamAccessForm(fd,old); const stops=defaultCheckpointStops().map((base,i)=>{const rawType=String(fd.get(`stopType:${i}`)||base.type);const type=['food_photo','funding_photo'].includes(rawType)?rawType:'instructor_approval';return {...base,id:base.id,type,threshold:Math.max(1,Number(fd.get(`stopThreshold:${i}`)||base.threshold)),title:String(fd.get(`stopTitle:${i}`)||base.title||'').trim(),autoApprove:type!=='instructor_approval',piece:type!=='instructor_approval'?'':(base.piece||`חלק ${i}`)}}).sort((a,b)=>a.threshold-b.threshold); const event = { ...old, finalizedAt: undefined, createdAt: f.dataset.id === '__new__' ? undefined : old.createdAt, id: f.dataset.id === '__new__' ? undefined : f.dataset.id, name: fd.get('name'), code: fd.get('code'), active: fd.get('active') === 'on', availableLanguages: old.availableLanguages || ['he', 'ar'], availableDurations: String(fd.get('availableDurations') || '').split(',').map(x => Number(x.trim())).filter(Boolean), selectedModelProblemId: old.selectedModelProblemId || s.modelProblems[0]?.id, activeCompanyIds: fd.getAll('activeCompanyIds'), teamAccess, checkpointConfig: { ...(old.checkpointConfig || {}), code: fd.get('instructorCode'), instructorCode: fd.get('instructorCode'), adminCode: fd.get('adminCode'), stops }, puzzleConfig: old.puzzleConfig || { enabled:false, pieceCount:12, imageUrl:'' }, gameStatus: fd.get('paused') === 'on' ? 'paused' : 'running', pausedAt: fd.get('paused') === 'on' ? (old.pausedAt || new Date().toISOString()) : undefined }; const saved = await this.repo.saveEvent(event); this.selectedEventId = saved.id; sessionStorage.setItem('aiQuest.admin.selectedEventId', this.selectedEventId); this.render(); });
    this.root.querySelectorAll('[data-finalize-event]').forEach(b => b.onclick = async () => { if (b.disabled) return; if (!confirm('לסיים את שלב החקר ולפתוח את המשימה הסופית לכל הצוותים?')) return; await this.repo.finalizeEvent(b.dataset.finalizeEvent); this.render(); });
    this.root.querySelectorAll('[data-duplicate-event]').forEach(b => b.onclick = async () => { const code = prompt('קוד לאירוע המשוכפל:', 'GAVYAM2'); if (!code) return; const copy = await this.repo.duplicateEvent(b.dataset.duplicateEvent, { code, active: false }); this.selectedEventId = copy.id; sessionStorage.setItem('aiQuest.admin.selectedEventId', this.selectedEventId); this.render(); });
    this.root.querySelectorAll('[data-delete-event]').forEach(b => b.onclick = async () => {
      if (b.disabled) return;
      const ev = s.events.find(e => e.id === b.dataset.deleteEvent);
      if (!ev) return;
      if (!confirm(`למחוק את האירוע "${ev.name}"?
הפעולה תמחק גם צוותים, ניקוד, תמונות וצ׳קפוינטים של האירוע הזה.`)) return;
      const typed = prompt('כדי לאשר מחיקה סופית כתוב: מחיקה');
      if (typed !== 'מחיקה') return;
      await this.repo.deleteEvent(b.dataset.deleteEvent);
      if (this.selectedEventId === b.dataset.deleteEvent) this.selectedEventId = 'first';
      sessionStorage.setItem('aiQuest.admin.selectedEventId', this.selectedEventId);
      this.render();
    });
    this.root.querySelectorAll('[data-export-json]').forEach(b => b.onclick = async () => { const data = await this.repo.eventResults(b.dataset.exportJson, 'json'); this.download(`ai-quest-results-${b.dataset.exportJson}.json`, JSON.stringify(data, null, 2), 'application/json'); });
    this.root.querySelectorAll('[data-export-csv]').forEach(b => b.onclick = async () => { const csv = await this.repo.eventResults(b.dataset.exportCsv, 'csv'); this.download(`ai-quest-results-${b.dataset.exportCsv}.csv`, csv, 'text/csv'); });
  }

  download(filename, content, type = 'text/plain') { const blob = new Blob([content], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href); }

  bindPuzzleForms(s) {
    this.root.querySelectorAll('.puzzle-edit').forEach(f => f.onsubmit = async e => {
      e.preventDefault();
      const old = s.events.find(ev => ev.id === f.dataset.id); if (!old) return;
      const fd = new FormData(f), pieceCount = Math.max(1, Math.min(48, Number(fd.get('pieceCount') || 12))), file = fd.get('image');
      const event = { ...old, puzzleConfig: { ...(old.puzzleConfig || {}), enabled: fd.get('enabled') === 'on', pieceCount } };
      const saved = await this.repo.saveEvent(event);
      if (file && file.size) await this.repo.uploadPuzzleImage(saved.id, file, pieceCount);
      this.selectedEventId = saved.id;
      sessionStorage.setItem('aiQuest.admin.selectedEventId', this.selectedEventId);
      this.render();
    });
  }

  bindCompanyForms(s) {
    this.root.querySelectorAll('.company-edit').forEach(f => f.onsubmit = async e => { e.preventDefault(); const old = s.companies.find(c => c.id === f.dataset.id), fd = new FormData(f); await this.repo.saveCompany({ ...old, ...Object.fromEntries(fd), stationType: fd.get('stationType') === 'knowledge' ? 'knowledge' : 'model', level: Number(fd.get('level')) }); this.render(); });
  }

  async saveQuestion(f, s) {
    const fd = new FormData(f), old = s.questions.find(q => q.id === f.dataset.id) || {};
    const type = fd.get('type');
    const optionsHe = String(fd.get('optionsHe') || '').split('\n').map(x => x.trim()).filter(Boolean);
    const optionsAr = String(fd.get('optionsAr') || '').split('\n').map(x => x.trim()).filter(Boolean);
    const correctRaw = String(fd.get('correctAnswer') || '').trim();
    const question = { ...old, id: f.dataset.id === '__new__' ? undefined : f.dataset.id, companyId: fd.get('companyId'), type, textHe: fd.get('textHe'), textAr: fd.get('textAr'), optionsHe, optionsAr, correctAnswer: type === 'short' ? 0 : Number(correctRaw || 0), correctText: type === 'short' ? correctRaw : undefined, acceptedKeywords: String(fd.get('acceptedKeywords') || '').split(',').map(x => x.trim()).filter(Boolean), explanationHe: fd.get('explanationHe'), explanationAr: fd.get('explanationAr'), points: Number(fd.get('points') || 10), active: fd.get('active') === 'on' };
    const saved = await this.repo.saveQuestion(question);
    this.selectedQuestionId = saved.id;
    sessionStorage.setItem('aiQuest.admin.selectedQuestionId', this.selectedQuestionId);
    this.render();
  }
}
