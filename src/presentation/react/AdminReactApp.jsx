import React, { useEffect, useMemo, useState } from 'react';

const questionTypes = [
  { value: 'single', label: 'אמריקאית' },
  { value: 'true_false', label: 'נכון / לא נכון' },
  { value: 'short', label: 'פתוחה קצרה' }
];
const tabs = [
  { id: 'events', label: 'אירועים' },
  { id: 'results', label: 'ניקוד' },
  { id: 'puzzle', label: 'פאזל' },
  { id: 'questions', label: 'שאלות' },
  { id: 'companies', label: 'חברות' },
  { id: 'problem', label: 'בעיית מודל' },
  { id: 'tools', label: 'כלים' }
];

function defaultCheckpointStops() {
  return [
    { id: 'cp-food-break', type: 'food_photo', threshold: 4, title: 'עצירת אוכל / טעינה' },
    { id: 'cp-leumi-funding', type: 'funding_photo', threshold: 7, title: 'מימון מבנק לאומי' },
    { id: 'cp-instructor-1', type: 'instructor_approval', threshold: 10, title: 'צ׳קפוינט מדריך 1' },
    { id: 'cp-instructor-2', type: 'instructor_approval', threshold: 17, title: 'צ׳קפוינט מדריך 2' },
    { id: 'cp-instructor-3', type: 'instructor_approval', threshold: 24, title: 'צ׳קפוינט מדריך 3' }
  ];
}
function defaultTeamAccess() {
  return [
    { id: 'red', name: 'צוות אדום', password: 'R4821' },
    { id: 'white', name: 'צוות לבן', password: 'W7394' },
    { id: 'blue', name: 'צוות כחול', password: 'B5168' },
    { id: 'green', name: 'צוות ירוק', password: 'G2947' },
    { id: 'yellow', name: 'צוות צהוב', password: 'Y8635' },
    { id: 'purple', name: 'צוות סגול', password: 'P1476' }
  ];
}
function checkpointStops(event) {
  const base = defaultCheckpointStops();
  const raw = Array.isArray(event?.checkpointConfig?.stops) && event.checkpointConfig.stops.length ? event.checkpointConfig.stops : base;
  return raw.slice(0, 5).map((item, index) => ({ ...base[index], ...item, id: item.id || base[index].id, threshold: Number(item.threshold || base[index].threshold || 4), type: ['food_photo', 'funding_photo'].includes(item.type) ? item.type : 'instructor_approval' }));
}
function countBy(items, fn) { return items.reduce((acc, item) => { const key = fn(item); acc[key] = (acc[key] || 0) + 1; return acc; }, {}); }
function stationTypeLabel(type) { return (type || 'model') === 'knowledge' ? 'ידע + ניקוד' : 'מחזק מודל + ניקוד'; }
function missingArabicQuestion(q) { return !q.textAr || !q.explanationAr || ((q.optionsHe || []).length && !(q.optionsAr || []).length); }
function emptyQuestion(companyId) { return { id: '__new__', companyId, type: 'single', textHe: '', textAr: '', optionsHe: ['', '', '', ''], optionsAr: ['', '', '', ''], correctAnswer: 0, explanationHe: '', explanationAr: '', points: 10, active: true }; }
function download(filename, content, type = 'text/plain') { const blob = new Blob([content], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href); }

export function AdminReactApp({ repo }) {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState(() => sessionStorage.getItem('aiQuest.admin.tab') || 'questions');
  const [search, setSearch] = useState(() => sessionStorage.getItem('aiQuest.admin.search') || '');
  const [companyId, setCompanyId] = useState(() => sessionStorage.getItem('aiQuest.admin.companyId') || 'all');
  const [type, setType] = useState(() => sessionStorage.getItem('aiQuest.admin.type') || 'all');
  const [selectedQuestionId, setSelectedQuestionId] = useState(() => sessionStorage.getItem('aiQuest.admin.selectedQuestionId') || '__new__');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(() => sessionStorage.getItem('aiQuest.admin.selectedEventId') || 'first');
  const [error, setError] = useState('');

  async function load() {
    setError('');
    const next = await repo.state();
    setState(next);
    if (!selectedCompanyId && next.companies?.[0]) setSelectedCompanyId(next.companies[0].id);
  }
  useEffect(() => { load().catch((err) => setError(String(err?.message || err))); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setAdminTab(next) { setTab(next); sessionStorage.setItem('aiQuest.admin.tab', next); }
  function remember(key, value, setter) { setter(value); sessionStorage.setItem(key, value); }
  async function run(action) { try { await action(); await load(); } catch (err) { alert(`לא הצלחנו לשמור: ${String(err?.message || err)}`); } }

  if (error) return <section className="card connection-error"><h1>מערכת אדמין</h1><p className="error">{error}</p><button className="primary" onClick={() => load().catch((err) => setError(String(err?.message || err)))}>נסה שוב</button></section>;
  if (!state) return <section className="card react-admin-loading"><h1>מערכת אדמין</h1><p>טוען נתונים...</p></section>;

  const statsByCompany = countBy(state.questions || [], (q) => q.companyId || 'unknown');
  const missingTranslations = (state.questions || []).filter(missingArabicQuestion).length;
  return <section className="admin-shell react-admin-shell">
    <div className="admin-hero"><div><span className="level">React Admin</span><h1>מערכת אדמין</h1><p>ניהול אירועים, תוכן, חברות, שאלות, פאזל וכלי הפעלה.</p></div><button onClick={() => load().catch((err) => setError(String(err?.message || err)))}>רענון</button></div>
    <div className="admin-kpis"><span><b>{state.companies.length}</b> חברות</span><span><b>{state.questions.length}</b> שאלות</span><span><b>{state.abilities.length}</b> יכולות</span><span className={missingTranslations ? 'warn-text' : ''}><b>{missingTranslations}</b> חסרי תרגום/הסבר</span></div>
    <div className="admin-tabs">{tabs.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setAdminTab(item.id)}>{item.label}</button>)}</div>
    {tab === 'events' ? <EventsTab state={state} selectedEventId={selectedEventId} setSelectedEventId={(value) => remember('aiQuest.admin.selectedEventId', value, setSelectedEventId)} repo={repo} run={run} /> : null}
    {tab === 'results' ? <ResultsTab state={state} /> : null}
    {tab === 'puzzle' ? <PuzzleTab state={state} selectedEventId={selectedEventId} setSelectedEventId={(value) => remember('aiQuest.admin.selectedEventId', value, setSelectedEventId)} repo={repo} run={run} /> : null}
    {tab === 'questions' ? <QuestionsTab state={state} search={search} setSearch={(value) => remember('aiQuest.admin.search', value, setSearch)} companyId={companyId} setCompanyId={(value) => remember('aiQuest.admin.companyId', value, setCompanyId)} type={type} setType={(value) => remember('aiQuest.admin.type', value, setType)} selectedQuestionId={selectedQuestionId} setSelectedQuestionId={(value) => remember('aiQuest.admin.selectedQuestionId', value, setSelectedQuestionId)} repo={repo} run={run} /> : null}
    {tab === 'companies' ? <CompaniesTab state={state} statsByCompany={statsByCompany} search={search} setSearch={(value) => remember('aiQuest.admin.search', value, setSearch)} selectedCompanyId={selectedCompanyId} setSelectedCompanyId={setSelectedCompanyId} repo={repo} run={run} /> : null}
    {tab === 'problem' ? <ProblemsTab state={state} repo={repo} run={run} /> : null}
    {tab === 'tools' ? <ToolsTab state={state} repo={repo} run={run} /> : null}
  </section>;
}

function selectedEvent(state, selectedEventId) { return selectedEventId === '__new__' ? newEventTemplate(state) : selectedEventId === 'first' ? (state.events.find((e) => e.active) || state.events[0]) : state.events.find((e) => e.id === selectedEventId) || state.events.find((e) => e.active) || state.events[0]; }
function newEventTemplate(state) {
  const source = state.events.find((e) => e.active) || state.events[0] || {};
  return { ...source, id: '__new__', name: `${source.name || 'AI Quest'} — חדש`, code: '', active: false, gameStatus: 'running', finalizedAt: undefined, checkpointConfig: source.checkpointConfig || { instructorCode: 'AI2026', adminCode: 'Admin1092', stops: defaultCheckpointStops() }, puzzleConfig: source.puzzleConfig || { enabled: false, pieceCount: 12, imageUrl: '' }, teamAccess: source.teamAccess || defaultTeamAccess(), activeCompanyIds: source.activeCompanyIds || state.companies.map((c) => c.id), availableDurations: source.availableDurations || [60, 90, 135], selectedModelProblemId: source.selectedModelProblemId || state.modelProblems[0]?.id, availableLanguages: source.availableLanguages || ['he', 'ar'] };
}
function parseList(value) { return String(value || '').split(',').map((x) => x.trim()).filter(Boolean); }
function TeamAccessEditor({ value, onChange }) {
  const rows = value?.length ? value : defaultTeamAccess();
  function patch(index, key, next) { onChange(rows.map((row, i) => i === index ? { ...row, [key]: next } : row)); }
  return <section><h3>צוותים וסיסמאות</h3><p className="notice">מזהה צוות באנגלית/מספרים, שם וסיסמה למסירה למדריך.</p><div className="team-access-editor">{rows.map((team, index) => <fieldset className="team-access-row" key={`${team.id}-${index}`}><legend>צוות {index + 1}</legend><label><span>מזהה</span><input value={team.id || ''} onChange={(e) => patch(index, 'id', e.target.value)} /></label><label><span>שם צוות</span><input value={team.name || ''} onChange={(e) => patch(index, 'name', e.target.value)} /></label><label><span>סיסמה</span><input value={team.password || ''} onChange={(e) => patch(index, 'password', e.target.value)} /></label><button type="button" className="danger" onClick={() => onChange(rows.filter((_, i) => i !== index))}>מחק צוות</button></fieldset>)}</div><button type="button" onClick={() => onChange([...rows, { id: `team${rows.length + 1}`, name: `צוות ${rows.length + 1}`, password: `T${String(rows.length + 1).padStart(2, '0')}123!` }])}>+ הוסף צוות</button></section>;
}
function CheckpointStopsEditor({ value, onChange }) {
  const rows = value?.length ? value : defaultCheckpointStops();
  function patch(index, key, next) { onChange(rows.map((row, i) => i === index ? { ...row, [key]: key === 'threshold' ? Number(next || 1) : next, autoApprove: key === 'type' ? next !== 'instructor_approval' : row.autoApprove } : row)); }
  return <section><h3>עצירות וצ׳קפוינטים — סך הכול 5 עצירות</h3><p className="notice">עצירת אוכל/מימון לא חוסמת. צ׳קפוינט מדריך חוסם עד אישור.</p><div className="admin-form-grid">{rows.slice(0, 5).map((stop, index) => <fieldset className="checkpoint-admin-stop" key={stop.id || index}><legend>עצירה {index + 1}</legend><label><span>סוג</span><select value={stop.type} onChange={(e) => patch(index, 'type', e.target.value)}><option value="food_photo">עצירת אוכל / צילום</option><option value="funding_photo">מימון בנק לאומי / צילום</option><option value="instructor_approval">צ׳קפוינט מדריך</option></select></label><label><span>אחרי כמה חברות</span><input type="number" min="1" max="65" value={stop.threshold || 1} onChange={(e) => patch(index, 'threshold', e.target.value)} /></label><label><span>כותרת</span><input value={stop.title || ''} onChange={(e) => patch(index, 'title', e.target.value)} /></label></fieldset>)}</div></section>;
}
function EventsTab({ state, selectedEventId, setSelectedEventId, repo, run }) {
  const initial = selectedEvent(state, selectedEventId);
  const [draft, setDraft] = useState(initial);
  useEffect(() => setDraft(initial), [initial?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeIds = new Set(draft.activeCompanyIds || []);
  function patch(key, value) { setDraft((old) => ({ ...old, [key]: value })); }
  function patchCheckpoint(key, value) { setDraft((old) => ({ ...old, checkpointConfig: { ...(old.checkpointConfig || {}), [key]: value } })); }
  async function save(e) { e.preventDefault(); await run(async () => { const { finalizedAt, ...clean } = draft; const saved = await repo.saveEvent({ ...clean, id: draft.id === '__new__' ? undefined : draft.id, code: String(draft.code || '').trim(), gameStatus: draft.gameStatus === 'paused' ? 'paused' : 'running', pausedAt: draft.gameStatus === 'paused' ? (draft.pausedAt || new Date().toISOString()) : undefined }); setSelectedEventId(saved.id); }); }
  return <div className="admin-split events-admin react-admin-events"><section className="admin-list"><div className="admin-list-head"><h2>אירועים ({state.events.length})</h2><button className="primary" onClick={() => setSelectedEventId('__new__')}>+ אירוע חדש</button></div>{state.events.map((event) => <article className={`admin-row ${event.active === false ? 'muted-row' : ''}`} key={event.id}><div><b>{event.name}</b><p>קוד תלמידים: {event.code} · חברות פעילות: {(event.activeCompanyIds || []).length}</p><small>מדריך: {event.checkpointConfig?.instructorCode || event.checkpointConfig?.code || '—'} · אדמין: {event.checkpointConfig?.adminCode || '—'}</small></div><button onClick={() => setSelectedEventId(event.id)}>עריכה</button></article>)}</section><section><form className="admin-editor event-edit" onSubmit={save}><div className="admin-editor-head"><div><h2>{draft.id === '__new__' ? 'אירוע חדש' : draft.name}</h2><p>{draft.id} · {draft.code || 'ללא קוד'}</p></div><span className={`status-badge ${draft.active ? '' : 'warn'}`}>{draft.active ? 'פעיל' : 'כבוי'}</span></div><div className="admin-form-grid"><label><span>שם אירוע</span><input value={draft.name || ''} onChange={(e) => patch('name', e.target.value)} /></label><label><span>קוד אירוע לתלמידים</span><input value={draft.code || ''} onChange={(e) => patch('code', e.target.value)} /></label><label><span>קוד מדריך</span><input value={draft.checkpointConfig?.instructorCode || draft.checkpointConfig?.code || ''} onChange={(e) => patchCheckpoint('instructorCode', e.target.value)} /></label><label><span>קוד אדמין</span><input value={draft.checkpointConfig?.adminCode || ''} onChange={(e) => patchCheckpoint('adminCode', e.target.value)} /></label><label><span>משכי פעילות</span><input value={(draft.availableDurations || []).join(', ')} onChange={(e) => patch('availableDurations', parseList(e.target.value).map(Number).filter(Boolean))} /></label><label className="inline-check"><input type="checkbox" checked={draft.active !== false} onChange={(e) => patch('active', e.target.checked)} /> אירוע פעיל</label><label className="inline-check"><input type="checkbox" checked={draft.gameStatus === 'paused' || !!draft.pausedAt} onChange={(e) => patch('gameStatus', e.target.checked ? 'paused' : 'running')} /> עצירת משחק זמנית</label></div><CheckpointStopsEditor value={checkpointStops(draft)} onChange={(stops) => patchCheckpoint('stops', stops)} /><TeamAccessEditor value={draft.teamAccess || defaultTeamAccess()} onChange={(rows) => patch('teamAccess', rows)} /><h3>חברות פעילות באירוע ({activeIds.size}/{state.companies.length})</h3><div className="company-pick-grid">{state.companies.map((company) => <label className="company-pick" key={company.id}><input type="checkbox" checked={activeIds.has(company.id)} onChange={(e) => patch('activeCompanyIds', e.target.checked ? [...activeIds, company.id] : [...activeIds].filter((id) => id !== company.id))} /><span>{company.nameHe || company.nameEn || company.id}</span><small>{company.field || ''}</small></label>)}</div><div className="admin-tool-grid"><button className="primary">שמירת אירוע</button>{draft.id !== '__new__' ? <><button type="button" disabled={!!draft.finalizedAt} onClick={() => run(async () => { if (confirm('לסיים פעילות ולפתוח משימה סופית?')) await repo.finalizeEvent(draft.id); })}>{draft.finalizedAt ? 'המשימה הסופית כבר פתוחה' : 'סיים פעילות ופתח משימה סופית'}</button><button type="button" onClick={() => { const code = prompt('קוד לאירוע המשוכפל:', 'GAVYAM2'); if (code) run(async () => { const copy = await repo.duplicateEvent(draft.id, { code, active: false }); setSelectedEventId(copy.id); }); }}>שכפול אירוע</button><button type="button" className="danger" disabled={draft.active} onClick={() => { if (!confirm(`למחוק את האירוע "${draft.name}"?`)) return; if (prompt('כדי לאשר מחיקה סופית כתוב: מחיקה') === 'מחיקה') run(async () => { await repo.deleteEvent(draft.id); setSelectedEventId('first'); }); }}>מחק אירוע</button><button type="button" onClick={() => run(async () => download(`ai-quest-results-${draft.id}.json`, JSON.stringify(await repo.eventResults(draft.id, 'json'), null, 2), 'application/json'))}>ייצוא JSON</button><button type="button" onClick={() => run(async () => download(`ai-quest-results-${draft.id}.csv`, await repo.eventResults(draft.id, 'csv'), 'text/csv'))}>ייצוא CSV</button></> : null}</div></form></section></div>;
}
function ResultsTab({ state }) {
  const active = state.events.find((e) => e.active) || state.events[0];
  const rows = state.teams.filter((team) => !active || team.eventId === active.id).sort((a, b) => (b.score || 0) - (a.score || 0));
  return <section className="leaderboard-panel admin-editor react-admin-results"><div className="admin-editor-head"><div><h2>טבלת ניקוד</h2><p>דירוג צוותים לפי ניקוד, חברות, יכולות ומשתתפים.</p></div><span className="status-badge">{rows.length} צוותים</span></div><div className="leaderboard-table-wrap"><table className="leaderboard-table"><thead><tr><th>#</th><th>צוות</th><th>ניקוד</th><th>חברות</th><th>יכולות</th><th>משתתפים</th></tr></thead><tbody>{rows.length ? rows.map((team, index) => <tr key={team.id}><td>{index + 1}</td><td>{team.name || team.id}</td><td><b>{team.score || 0}</b></td><td>{(team.completedCompanies || []).length}</td><td>{(team.collectedAbilities || []).length}</td><td>{(team.participants || []).map((p) => p.name).filter(Boolean).join(', ') || '-'}</td></tr>) : <tr><td colSpan="6">אין עדיין צוותים</td></tr>}</tbody></table></div></section>;
}
function PuzzleTab({ state, selectedEventId, setSelectedEventId, repo, run }) {
  const event = selectedEvent(state, selectedEventId) || state.events[0];
  const [enabled, setEnabled] = useState(!!event?.puzzleConfig?.enabled);
  const [pieceCount, setPieceCount] = useState(event?.puzzleConfig?.pieceCount || 12);
  const [file, setFile] = useState(null);
  useEffect(() => { setEnabled(!!event?.puzzleConfig?.enabled); setPieceCount(event?.puzzleConfig?.pieceCount || 12); setFile(null); }, [event?.id]);
  return <div className="admin-split puzzle-admin react-admin-puzzle"><section className="admin-list"><div className="admin-list-head"><h2>פאזלים לפי אירוע</h2></div>{state.events.map((item) => <article className={`admin-row ${item.active === false ? 'muted-row' : ''}`} key={item.id}><div><b>{item.name}</b><p>{item.puzzleConfig?.imageUrl ? 'יש תמונת פאזל' : 'אין תמונה'} · {item.puzzleConfig?.pieceCount || 12} חלקים</p><small>קוד אירוע: {item.code}</small></div><button onClick={() => setSelectedEventId(item.id)}>ניהול פאזל</button></article>)}</section><section><form className="admin-editor puzzle-edit" onSubmit={(e) => { e.preventDefault(); run(async () => { const saved = await repo.saveEvent({ ...event, puzzleConfig: { ...(event.puzzleConfig || {}), enabled, pieceCount: Number(pieceCount || 12) } }); if (file?.size) await repo.uploadPuzzleImage(saved.id, file, pieceCount); }); }}><div className="admin-editor-head"><div><h2>ניהול פאזל</h2><p>{event?.name || ''} · מספר חלקים ותמונת רקע לתלמידים</p></div><span className={`status-badge ${enabled ? '' : 'warn'}`}>{enabled ? 'פעיל' : 'כבוי'}</span></div><div className="admin-form-grid"><label className="inline-check"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> פאזל פעיל לתלמידים</label><label><span>מספר חלקים בפאזל</span><input type="number" min="1" max="48" value={pieceCount} onChange={(e) => setPieceCount(e.target.value)} /></label><label><span>העלאת תמונת פאזל</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label></div>{event?.puzzleConfig?.imageUrl ? <div className="puzzle-admin-preview"><img src={event.puzzleConfig.imageUrl} alt="תמונת הפאזל הנוכחית" /><small>{event.puzzleConfig.imageName || event.puzzleConfig.imageUrl}</small></div> : <p className="notice">אפשר לשמור מספר חלקים גם בלי תמונה.</p>}<button className="primary">שמירת פאזל</button></form></section></div>;
}
function QuestionsTab({ state, search, setSearch, companyId, setCompanyId, type, setType, selectedQuestionId, setSelectedQuestionId, repo, run }) {
  const qText = search.trim().toLowerCase();
  const filtered = state.questions.filter((q) => { const company = state.companies.find((c) => c.id === q.companyId); const haystack = [q.textHe, q.textAr, q.id, company?.nameHe, company?.nameAr].join(' ').toLowerCase(); return (!qText || haystack.includes(qText)) && (companyId === 'all' || q.companyId === companyId) && (type === 'all' || (q.type || 'single') === type); });
  const selected = selectedQuestionId === '__new__' ? emptyQuestion(companyId === 'all' ? state.companies[0]?.id : companyId) : state.questions.find((q) => q.id === selectedQuestionId) || emptyQuestion(state.companies[0]?.id);
  return <div className="react-admin-questions"><div className="admin-toolbar"><label><span>חיפוש</span><input value={search} placeholder="חברה / טקסט שאלה / מזהה" onChange={(e) => setSearch(e.target.value)} /></label><label><span>חברה</span><select value={companyId} onChange={(e) => { setCompanyId(e.target.value); setSelectedQuestionId('__new__'); }}><option value="all">כל החברות</option>{state.companies.map((company) => <option key={company.id} value={company.id}>{company.nameHe}</option>)}</select></label><label><span>סוג</span><select value={type} onChange={(e) => setType(e.target.value)}><option value="all">כל הסוגים</option>{questionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button className="primary" onClick={() => setSelectedQuestionId('__new__')}>+ שאלה חדשה</button></div><div className="admin-split"><section className="admin-list"><h2>שאלות ({filtered.length})</h2>{filtered.map((q) => { const company = state.companies.find((c) => c.id === q.companyId); return <article className={`admin-row ${q.active === false ? 'muted-row' : ''}`} key={q.id}><div><b>{company?.nameHe || q.companyId}</b><p>{q.textHe || 'שאלה ללא טקסט'}</p><small>{questionTypes.find((item) => item.value === (q.type || 'single'))?.label || q.type} · {q.points || 0} נק׳ {missingArabicQuestion(q) ? '· חסר תרגום/הסבר' : ''}</small></div><button onClick={() => setSelectedQuestionId(q.id)}>עריכה</button></article>; })}</section><section><QuestionForm key={selected.id} question={selected} companies={state.companies} repo={repo} run={run} onSaved={(saved) => setSelectedQuestionId(saved.id)} /></section></div></div>;
}
function QuestionForm({ question, companies, repo, run, onSaved }) {
  const [draft, setDraft] = useState(question);
  function patch(key, value) { setDraft((old) => ({ ...old, [key]: value })); }
  async function save(e) { e.preventDefault(); await run(async () => { const type = draft.type || 'single'; const correctRaw = String(type === 'short' ? (draft.correctText || '') : (draft.correctAnswer ?? 0)).trim(); const saved = await repo.saveQuestion({ ...draft, id: draft.id === '__new__' ? undefined : draft.id, correctAnswer: type === 'short' ? 0 : Number(correctRaw || 0), correctText: type === 'short' ? correctRaw : undefined, points: Number(draft.points || 10), active: draft.active !== false }); onSaved(saved); }); }
  return <form className="admin-editor question-edit" onSubmit={save}><div className="admin-editor-head"><div><h2>{draft.id === '__new__' ? 'שאלה חדשה' : 'עריכת שאלה'}</h2><p>{draft.companyId}</p></div><span className={`status-badge ${draft.active === false ? 'warn' : ''}`}>{draft.active === false ? 'כבויה' : 'פעילה'}</span></div><div className="admin-form-grid"><label><span>חברה</span><select value={draft.companyId || ''} onChange={(e) => patch('companyId', e.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.nameHe} · רמה {company.level}</option>)}</select></label><label><span>סוג שאלה</span><select value={draft.type || 'single'} onChange={(e) => patch('type', e.target.value)}>{questionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label><span>נקודות</span><input type="number" value={draft.points || 10} onChange={(e) => patch('points', e.target.value)} /></label><label className="inline-check"><input type="checkbox" checked={draft.active !== false} onChange={(e) => patch('active', e.target.checked)} /> פעילה</label></div><label><span>שאלה בעברית</span><textarea value={draft.textHe || ''} onChange={(e) => patch('textHe', e.target.value)} /></label><label><span>שאלה בערבית</span><textarea value={draft.textAr || ''} onChange={(e) => patch('textAr', e.target.value)} /></label><div className="admin-form-grid"><label><span>אפשרויות בעברית — שורה לכל אפשרות</span><textarea value={(draft.optionsHe || []).join('\n')} onChange={(e) => patch('optionsHe', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></label><label><span>אפשרויות בערבית — שורה לכל אפשרות</span><textarea value={(draft.optionsAr || []).join('\n')} onChange={(e) => patch('optionsAr', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></label></div><label><span>מספר תשובה נכונה / טקסט לתשובה פתוחה</span><input value={draft.type === 'short' ? (draft.correctText || '') : String(draft.correctAnswer ?? 0)} onChange={(e) => draft.type === 'short' ? patch('correctText', e.target.value) : patch('correctAnswer', e.target.value)} /></label><label><span>מילות מפתח לתשובה פתוחה — מופרדות בפסיק</span><input value={(draft.acceptedKeywords || []).join(', ')} onChange={(e) => patch('acceptedKeywords', parseList(e.target.value))} /></label><div className="admin-form-grid"><label><span>הסבר בעברית</span><textarea value={draft.explanationHe || ''} onChange={(e) => patch('explanationHe', e.target.value)} /></label><label><span>הסבר בערבית</span><textarea value={draft.explanationAr || ''} onChange={(e) => patch('explanationAr', e.target.value)} /></label></div><button className="primary">שמירת שאלה</button></form>;
}
function CompaniesTab({ state, statsByCompany, search, setSearch, selectedCompanyId, setSelectedCompanyId, repo, run }) {
  const q = search.trim().toLowerCase();
  const companies = state.companies.filter((company) => !q || [company.nameHe, company.nameAr, company.id, company.field].join(' ').toLowerCase().includes(q));
  const selected = state.companies.find((company) => company.id === selectedCompanyId) || companies[0] || state.companies[0];
  return <div><div className="admin-toolbar"><label><span>חיפוש חברה</span><input value={search} placeholder="שם / תחום / מזהה" onChange={(e) => setSearch(e.target.value)} /></label></div><div className="admin-split"><section className="admin-list"><h2>חברות ({companies.length})</h2>{companies.map((company) => <article className="admin-row" key={company.id}><div><b>{company.nameHe}</b><p>{company.field || ''}</p><small>{stationTypeLabel(company.stationType)} · {statsByCompany[company.id] || 0} שאלות · רמה {company.level}</small></div><button onClick={() => setSelectedCompanyId(company.id)}>עריכה</button></article>)}</section><section>{selected ? <CompanyForm key={selected.id} company={selected} repo={repo} run={run} /> : null}</section></div></div>;
}
function CompanyForm({ company, repo, run }) {
  const [draft, setDraft] = useState(company);
  function patch(key, value) { setDraft((old) => ({ ...old, [key]: value })); }
  return <form className="admin-editor company-edit" onSubmit={(e) => { e.preventDefault(); run(() => repo.saveCompany({ ...draft, level: Number(draft.level || 1), stationType: draft.stationType === 'knowledge' ? 'knowledge' : 'model' })); }}><div className="admin-editor-head"><div><h2>{draft.nameHe}</h2><p>{draft.id} · רמה {draft.level}</p></div><span className={`status-badge ${(!draft.nameAr || !draft.descriptionAr) ? 'warn' : ''}`}>{(!draft.nameAr || !draft.descriptionAr) ? 'חסר תרגום' : 'תקין'}</span></div><div className="admin-form-grid"><label><span>שם בעברית</span><input value={draft.nameHe || ''} onChange={(e) => patch('nameHe', e.target.value)} /></label><label><span>שם בערבית</span><input value={draft.nameAr || ''} onChange={(e) => patch('nameAr', e.target.value)} /></label><label><span>תחום</span><input value={draft.field || ''} onChange={(e) => patch('field', e.target.value)} /></label><label><span>רמה</span><input type="number" value={draft.level || 1} onChange={(e) => patch('level', e.target.value)} /></label><label><span>סוג תחנה</span><select value={draft.stationType || 'model'} onChange={(e) => patch('stationType', e.target.value)}><option value="model">מחזק מודל + ניקוד</option><option value="knowledge">ידע + ניקוד</option></select></label><label><span>URL ללוגו</span><input value={draft.logoUrl || ''} onChange={(e) => patch('logoUrl', e.target.value)} /></label><label><span>סימון קצר</span><input value={draft.logoMark || ''} onChange={(e) => patch('logoMark', e.target.value)} /></label></div><label><span>תיאור עברית</span><textarea value={draft.descriptionHe || ''} onChange={(e) => patch('descriptionHe', e.target.value)} /></label><label><span>תיאור ערבית</span><textarea value={draft.descriptionAr || ''} onChange={(e) => patch('descriptionAr', e.target.value)} /></label><button className="primary">שמירת חברה</button></form>;
}
function ProblemsTab({ state, repo, run }) {
  return <div className="admin-grid react-admin-problems">{state.modelProblems.map((problem) => <ProblemForm key={problem.id} problem={problem} repo={repo} run={run} />)}</div>;
}
function ProblemForm({ problem, repo, run }) {
  const [draft, setDraft] = useState(problem);
  function patch(key, value) { setDraft((old) => ({ ...old, [key]: value })); }
  return <form className="admin-editor problem-edit" onSubmit={(e) => { e.preventDefault(); run(() => repo.saveProblem(draft)); }}><div className="admin-editor-head"><div><h2>{draft.titleHe}</h2><p>{draft.id}</p></div></div><label><span>כותרת עברית</span><input value={draft.titleHe || ''} onChange={(e) => patch('titleHe', e.target.value)} /></label><label><span>כותרת ערבית</span><input value={draft.titleAr || ''} onChange={(e) => patch('titleAr', e.target.value)} /></label><label><span>תיאור עברית</span><textarea value={draft.descriptionHe || ''} onChange={(e) => patch('descriptionHe', e.target.value)} /></label><label><span>תיאור ערבית</span><textarea value={draft.descriptionAr || ''} onChange={(e) => patch('descriptionAr', e.target.value)} /></label><button className="primary">שמירת בעיית מודל</button></form>;
}
function ToolsTab({ state, repo, run }) {
  return <section className="admin-editor react-admin-tools"><h2>כלי ניהול</h2><p>פעולות רגישות לפעילות בזמן אמת.</p><div className="admin-tool-grid"><button className="danger" onClick={() => { if (confirm('לאפס את כל הצוותים, התמונות והצ׳קפוינטים בפעילות?')) run(async () => { await repo.reset(); localStorage.removeItem('aiQuest.currentTeam'); }); }}>איפוס כל נתוני הפעילות</button><button onClick={() => download(`ai-quest-state-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), 'application/json')}>הורדת snapshot JSON</button></div><p className="notice">איפוס מוחק צוותים, הגשות וצ׳קפוינטים — לא את בנק השאלות.</p></section>;
}
