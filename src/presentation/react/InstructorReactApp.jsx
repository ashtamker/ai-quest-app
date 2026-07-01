import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ApproveCheckpoint, puzzlePieces } from '../../domain/use-cases/useCases.js';

const AUTO_REFRESH_MS = 15000;

const I18N = {
  he: { title: 'דשבורד מדריך', subtitle: 'חדר בקרה שטח: רענון חי, תור טיפול, צ׳קפוינטים, תמונות והודעות לצוותים.', updated: 'עודכן', refresh: 'רענון עכשיו', action: 'דורש פעולה', waiting: 'ממתינים לצ׳קפוינט', photos: 'תמונות לבדיקה', allTeams: 'כל הצוותים', checkpoints: 'צ׳קפוינטים', stuck: 'תקועים', photosShort: 'תמונות', invalid: 'לא תקין', searchTeam: 'חיפוש צוות', searchPlaceholder: 'שם צוות / שפה / סטטוס', messageVisible: 'הודעה לצוותים המוצגים', messageAll: 'הודעה לכל הצוותים', resetAll: 'איפוס כל נתוני הפעילות', emptyTitle: 'אין כרגע פריטים לטיפול', emptyHint: 'נסו לשנות סינון/חיפוש או להמתין לרענון הבא.', statusCheckpoint: 'ממתין לצ׳קפוינט', statusPhoto: 'תמונה לבדיקה', statusStuck: 'נראה תקוע', statusDone: 'סיים יעד', statusActive: 'פעיל', hebrew: 'עברית', arabic: 'ערבית', minutes: 'דקות', stage: 'שלב', companies: 'חברות', score: 'ניקוד', abilities: 'יכולות', puzzlePieces: 'חלקי פאזל', activity: 'פעילות', approve: 'אשר ותן חלק פאזל', reject: 'דחה עם הערה', bonus: 'בונוס', message: 'הודעה', resetTeam: 'איפוס צוות', noCompanies: 'אין חברות עדיין', logoPhoto: 'צילום לוגו', team: 'צוות', taskScore: 'ניקוד משימה', markValid: 'סמן תקין', markInvalid: 'סמן לא תקין', deletePhoto: 'מחק תמונה', noPhotos: 'אין תמונות בקטגוריה הזו', controlRoom: 'חדר בקרה שטח', queueTitle: 'תור טיפול עכשיו', queueHint: 'סדר עדיפויות: צ׳קפוינט → תמונה לבדיקה → תקוע → פעיל.', waitingTime: 'זמן המתנה', recentCompanies: 'חברות אחרונות', recentMessages: 'הודעות אחרונות', participantsList: 'משתתפים בצוות', quickMessage: 'הודעה מהירה', checkGuide: 'בדיקת מדריך: הצוות הגיע פיזית, יודע להסביר מה למד, ומוכן להמשיך.', finishActivity: 'סיים פעילות ופתח משימה סופית', finalized: 'הפעילות הסתיימה — המשימה הסופית פתוחה', leaderboard: 'טבלת ניקוד', rank: 'מקום', teamPasswords: 'צוותים וסיסמאות', event: 'אירוע', pause: 'עצור משחק זמנית', resume: 'פתח משחק מחדש' },
  ar: { title: 'لوحة المرشد', subtitle: 'غرفة متابعة ميدانية: تحديث حي، قائمة علاج، نقاط تحقق، صور ورسائل للفرق.', updated: 'تم التحديث', refresh: 'تحديث الآن', action: 'يتطلب إجراء', waiting: 'بانتظار نقطة تحقق', photos: 'صور للمراجعة', allTeams: 'كل الفرق', checkpoints: 'نقاط تحقق', stuck: 'فرق متوقفة', photosShort: 'صور', invalid: 'غير صالح', searchTeam: 'بحث عن فريق', searchPlaceholder: 'اسم الفريق / اللغة / الحالة', messageVisible: 'رسالة للفرق المعروضة', messageAll: 'رسالة لكل الفرق', resetAll: 'إعادة ضبط كل بيانات النشاط', emptyTitle: 'لا توجد عناصر للعلاج الآن', emptyHint: 'جرّبوا تغيير التصفية/البحث أو انتظروا التحديث التالي.', statusCheckpoint: 'بانتظار نقطة تحقق', statusPhoto: 'صورة للمراجعة', statusStuck: 'يبدو متوقفًا', statusDone: 'أنهى الهدف', statusActive: 'نشط', hebrew: 'العبرية', arabic: 'العربية', minutes: 'دقائق', stage: 'مرحلة', companies: 'شركات', score: 'نقاط', abilities: 'قدرات', puzzlePieces: 'قطع أحجية', activity: 'نشاط', approve: 'وافق وأعطِ قطعة أحجية', reject: 'ارفض مع ملاحظة', bonus: 'مكافأة', message: 'رسالة', resetTeam: 'إعادة ضبط الفريق', noCompanies: 'لا توجد شركات بعد', logoPhoto: 'صورة شعار', team: 'فريق', taskScore: 'نقاط المهمة', markValid: 'صالح', markInvalid: 'غير صالح', deletePhoto: 'حذف الصورة', noPhotos: 'لا توجد صور في هذه الفئة', controlRoom: 'غرفة متابعة ميدانية', queueTitle: 'قائمة العلاج الآن', queueHint: 'الأولوية: نقطة تحقق ← صورة للمراجعة ← فريق متوقف ← نشط.', waitingTime: 'وقت الانتظار', recentCompanies: 'آخر الشركات', recentMessages: 'آخر الرسائل', participantsList: 'أعضاء الفريق', quickMessage: 'رسالة سريعة', checkGuide: 'فحص المرشد: الفريق وصل فعليًا، يعرف شرح ما تعلّمه، وجاهز للمتابعة.', finishActivity: 'إنهاء النشاط وفتح المهمة النهائية', finalized: 'انتهى النشاط — المهمة النهائية مفتوحة', leaderboard: 'جدول النقاط', rank: 'المركز', teamPasswords: 'الفرق وكلمات المرور', event: 'الحدث', pause: 'إيقاف اللعبة مؤقتًا', resume: 'إعادة فتح اللعبة' }
};

function timeAgo(date) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `${mins} דק׳`;
  return `${Math.round(mins / 60)} ש׳`;
}

function statusKey(team, now, submissions) {
  if (team.checkpointStatus === 'requested') return 'checkpoint';
  if (submissions.some((s) => s.teamId === team.id && s.instructorReviewStatus === 'pending')) return 'photo';
  if (now - new Date(team.lastActivityAt || team.createdAt).getTime() > 1000 * 60 * 12) return 'stuck';
  if ((team.completedCompanies || []).length >= (team.activityDuration === 60 ? 4 : team.activityDuration === 90 ? 6 : 10)) return 'done';
  return 'active';
}

function priorityScore(team, now) {
  let score = 0;
  if (team.checkpointStatus === 'requested') score += 4000;
  if ((team.pendingPhotoCount || 0) > 0) score += 2500;
  if (team.statusKey === 'stuck') score += 1200;
  const pending = (team.checkpoints || []).find((checkpoint) => checkpoint.status === 'requested');
  if (pending) score += Math.min(900, Math.floor((now - new Date(pending.createdAt || team.lastActivityAt || team.createdAt).getTime()) / 60000) * 20);
  return score;
}

function statusLabel(team, tr) {
  return ({ checkpoint: tr.statusCheckpoint, photo: tr.statusPhoto, stuck: tr.statusStuck, done: tr.statusDone, active: tr.statusActive })[team.statusKey] || team.checkpointStatus;
}

export function InstructorReactApp({ repo, lang = 'he' }) {
  const tr = I18N[lang] || I18N.he;
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(() => sessionStorage.getItem('aiQuest.instructor.eventId') || '');
  const [teams, setTeams] = useState([]);
  const [teamAccess, setTeamAccess] = useState([]);
  const [cfg, setCfg] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState(() => sessionStorage.getItem('aiQuest.instructor.filter') || 'action');
  const [search, setSearch] = useState(() => sessionStorage.getItem('aiQuest.instructor.search') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async (preferredEventId = eventId) => {
    setError('');
    const activeEvents = repo.listActiveEvents ? await repo.listActiveEvents() : [];
    const event = activeEvents.find((item) => item.id === preferredEventId) || activeEvents[0] || await repo.getEventByCode('GAVYAM');
    sessionStorage.setItem('aiQuest.instructor.eventId', event.id);
    const [nextTeams, nextTeamAccess, nextCfg, nextSubmissions] = await Promise.all([
      repo.listTeams(event.id),
      repo.listEventTeamsForStaff ? repo.listEventTeamsForStaff(event.id) : Promise.resolve(event.teamAccess || []),
      repo.getEventConfig(event.id),
      repo.listAllSubmissions()
    ]);
    setEvents(activeEvents);
    setEventId(event.id);
    setTeams(nextTeams);
    setTeamAccess(nextTeamAccess);
    setCfg(nextCfg);
    setSubmissions(nextSubmissions);
    setUpdatedAt(new Date());
    setLoading(false);
  }, [eventId, repo]);

  useEffect(() => {
    let alive = true;
    load().catch((err) => { if (alive) { setError(String(err?.message || err)); setLoading(false); } });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setInterval(() => load().catch((err) => setError(String(err?.message || err))), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!repo.eventStreamUrl || !eventId || typeof EventSource === 'undefined') return undefined;
    const stream = new EventSource(repo.eventStreamUrl(eventId));
    stream.addEventListener('event-update', () => load(eventId).catch((err) => setError(String(err?.message || err))));
    stream.onerror = () => {};
    return () => stream.close();
  }, [eventId, load, repo]);

  const currentEvent = useMemo(() => events.find((event) => event.id === eventId) || cfg?.event || null, [events, eventId, cfg]);
  const now = Date.now();
  const pendingPhotos = submissions.filter((submission) => submission.instructorReviewStatus === 'pending');
  const invalidPhotos = submissions.filter((submission) => submission.instructorReviewStatus === 'invalid');
  const enrichedTeams = useMemo(() => teams.map((team) => ({
    ...team,
    statusKey: statusKey(team, now, submissions),
    pendingPhotoCount: pendingPhotos.filter((submission) => submission.teamId === team.id).length
  })), [teams, submissions, pendingPhotos.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const waitingTeams = enrichedTeams.filter((team) => team.checkpointStatus === 'requested');
  const stuckTeams = enrichedTeams.filter((team) => team.statusKey === 'stuck');
  const actionTeams = [...new Map([...waitingTeams, ...enrichedTeams.filter((team) => team.statusKey === 'photo'), ...stuckTeams].map((team) => [team.id, team])).values()]
    .sort((a, b) => priorityScore(b, now) - priorityScore(a, now));
  const visibleTeams = useMemo(() => {
    const base = filter === 'waiting' ? waitingTeams : filter === 'stuck' ? stuckTeams : filter === 'all' ? enrichedTeams : actionTeams;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((team) => [team.name, team.language, team.checkpointStatus, team.statusKey, String(team.score || 0)].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [filter, search, waitingTeams, stuckTeams, enrichedTeams, actionTeams]);

  async function runAction(action) {
    try {
      await action();
      await load(eventId);
    } catch (err) {
      alert(`לא הצלחנו לבצע את הפעולה: ${String(err?.message || err)}`);
    }
  }

  async function sendGroup(teamIds) {
    const msg = prompt('הודעה קבוצתית:', 'עוד 10 דקות נפגשים לצ׳קפוינט אצל המדריך.');
    if (!msg || !currentEvent) return;
    await runAction(() => repo.sendGroupMessage ? repo.sendGroupMessage(currentEvent.id, msg, teamIds) : Promise.all((teamIds || teams.map((team) => team.id)).map((id) => repo.sendMessage(id, msg))));
  }

  if (loading) return <section className="card react-instructor-loading"><h1>{tr.title}</h1><p>טוען את דשבורד המדריך...</p></section>;
  if (error) return <section className="card connection-error"><h1>{tr.title}</h1><p className="error">{error}</p><button className="primary" onClick={() => load().catch((err) => setError(String(err?.message || err)))}>{tr.refresh}</button></section>;

  return (
    <section className="instructor-shell react-instructor-shell">
      <div className="instructor-hero control-room-hero">
        <div>
          <span className="level">{tr.controlRoom}</span>
          <h1>{tr.title}</h1>
          <p>{tr.subtitle}</p>
          <small>{tr.updated}: {updatedAt ? updatedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}</small>
          {events.length > 1 ? (
            <label className="event-switch">
              <span>{tr.event}</span>
              <select value={eventId} onChange={(e) => load(e.target.value).catch((err) => setError(String(err?.message || err)))}>
                {events.map((event) => <option key={event.id} value={event.id}>{event.name || event.code} · {event.code}</option>)}
              </select>
            </label>
          ) : <p className="muted">{tr.event}: <b>{currentEvent?.name || currentEvent?.code || '-'}</b></p>}
        </div>
        <button id="refreshDash" onClick={() => load().catch((err) => setError(String(err?.message || err)))}>{tr.refresh}</button>
      </div>

      <div className="kpi-grid">
        <button className="kpi" onClick={() => setFilter('action')}><b>{actionTeams.length}</b><span>{tr.action}</span></button>
        <button className="kpi" onClick={() => setFilter('waiting')}><b>{waitingTeams.length}</b><span>{tr.waiting}</span></button>
        <button className="kpi" onClick={() => setFilter('photos')}><b>{pendingPhotos.length}</b><span>{tr.photos}</span></button>
        <button className="kpi" onClick={() => setFilter('all')}><b>{teams.length}</b><span>{tr.allTeams}</span></button>
      </div>

      <div className="dash-toolbar">
        <div className="dash-tabs">
          {[['action', tr.action], ['waiting', tr.checkpoints], ['stuck', tr.stuck], ['photos', tr.photosShort], ['invalid', tr.invalid], ['all', tr.allTeams]].map(([id, label]) => (
            <button key={id} className={filter === id ? 'active' : ''} onClick={() => { setFilter(id); sessionStorage.setItem('aiQuest.instructor.filter', id); }}>{label}</button>
          ))}
        </div>
        <label className="dash-search"><span>{tr.searchTeam}</span><input value={search} placeholder={tr.searchPlaceholder} onChange={(e) => { setSearch(e.target.value); sessionStorage.setItem('aiQuest.instructor.search', e.target.value); }} /></label>
      </div>

      <div className="bulk-panel">
        <button onClick={() => sendGroup(visibleTeams.map((team) => team.id))}>{tr.messageVisible} ({visibleTeams.length})</button>
        <button onClick={() => sendGroup(null)}>{tr.messageAll} ({teams.length})</button>
        <button className={currentEvent?.gameStatus === 'paused' ? 'primary' : 'danger'} onClick={() => runAction(async () => { if (confirm(currentEvent?.gameStatus === 'paused' ? 'לפתוח את המשחק מחדש לתלמידים?' : 'לעצור זמנית את המשחק?')) await repo.pauseEvent(currentEvent.id, currentEvent.gameStatus !== 'paused'); })}>{currentEvent?.gameStatus === 'paused' ? tr.resume : tr.pause}</button>
        <button className="primary" disabled={!!currentEvent?.finalizedAt} onClick={() => runAction(async () => { if (confirm('לסיים את שלב החקר ולפתוח לכל הצוותים את המשימה הסופית?')) await repo.finalizeEvent(currentEvent.id); })}>{currentEvent?.finalizedAt ? tr.finalized : tr.finishActivity}</button>
        <button className="danger" onClick={() => runAction(async () => { if (confirm(`לאפס את ${tr.allTeams}, ה${tr.photosShort} וה${tr.checkpoints} הפעילים?`)) await repo.reset(); })}>{tr.resetAll}</button>
      </div>

      <TeamPasswordsPanel teamAccess={teamAccess} tr={tr} />
      <Leaderboard teams={enrichedTeams} tr={tr} />
      <TreatmentQueue teams={actionTeams.slice(0, 6)} tr={tr} />

      {filter === 'photos' ? <PhotoBoard submissions={pendingPhotos} teams={enrichedTeams} cfg={cfg} tr={tr} runAction={runAction} repo={repo} />
        : filter === 'invalid' ? <PhotoBoard submissions={invalidPhotos} teams={enrichedTeams} cfg={cfg} tr={tr} runAction={runAction} repo={repo} />
        : <section className="team-board">{visibleTeams.length ? visibleTeams.map((team) => <TeamCard key={team.id} team={team} cfg={cfg} tr={tr} repo={repo} runAction={runAction} allTeams={teams} />) : <div className="card empty-state"><h2>{tr.emptyTitle}</h2><p>{tr.emptyHint}</p></div>}</section>}
    </section>
  );
}

function TeamPasswordsPanel({ teamAccess, tr }) {
  return <section className="team-password-panel card"><div className="queue-head"><div><h2>{tr.teamPasswords}</h2><p>מיועד למדריך בלבד — למסירה לתלמידים לפי צוות.</p></div><span>{teamAccess.length}</span></div><div className="team-password-grid">{teamAccess.map((team) => <div className="team-password-item" key={team.id}><b>{team.name}</b><code>{team.password || ''}</code><small>{team.id}</small></div>)}</div></section>;
}

function Leaderboard({ teams, tr }) {
  const rows = [...teams].sort((a, b) => (b.score || 0) - (a.score || 0) || String(a.name || '').localeCompare(String(b.name || ''))).slice(0, 12);
  return <section className="leaderboard-panel card"><div className="queue-head"><div><h2>{tr.leaderboard}</h2><p>{tr.score} · {tr.companies} · {tr.abilities}</p></div><span>{rows.length}</span></div><div className="leaderboard-table-wrap"><table className="leaderboard-table"><thead><tr><th>{tr.rank}</th><th>{tr.team}</th><th>{tr.score}</th><th>{tr.companies}</th><th>{tr.abilities}</th><th>{tr.participantsList}</th></tr></thead><tbody>{rows.map((team, index) => <tr key={team.id}><td>{index + 1}</td><td>{team.name || team.id}</td><td><b>{team.score || 0}</b></td><td>{(team.completedCompanies || []).length}</td><td>{(team.collectedAbilities || []).length}</td><td>{(team.participants || []).map((p) => p.name).filter(Boolean).join(', ') || '-'}</td></tr>)}</tbody></table></div></section>;
}

function TreatmentQueue({ teams, tr }) {
  if (!teams.length) return <section className="queue-panel card empty-state"><h2>{tr.emptyTitle}</h2><p>{tr.emptyHint}</p></section>;
  return <section className="queue-panel card"><div className="queue-head"><div><h2>{tr.queueTitle}</h2><p>{tr.queueHint}</p></div><span>{teams.length}</span></div><div className="queue-list">{teams.map((team, index) => <button className={`queue-item ${team.statusKey}`} key={team.id} onClick={() => document.getElementById(`team-${team.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><b>{index + 1}. {team.name}</b><span>{statusLabel(team, tr)}</span><small>{tr.waitingTime}: {timeAgo((team.checkpoints || []).find((c) => c.status === 'requested')?.createdAt || team.lastActivityAt || team.createdAt)} · {tr.companies}: {(team.completedCompanies || []).length}</small></button>)}</div></section>;
}

function TeamCard({ team, cfg, tr, repo, runAction, allTeams }) {
  const pending = (team.checkpoints || []).find((checkpoint) => checkpoint.status === 'requested');
  const pieces = puzzlePieces(team);
  const companyNames = (team.completedCompanies || []).slice(-4).map((id) => cfg?.companies?.find((company) => company.id === id)?.nameHe || id);
  const messages = (team.messages || []).slice(-2).reverse();
  const participants = (team.participants || []).map((p) => p.name).filter(Boolean);
  const needsAction = team.checkpointStatus === 'requested';
  return <article className={`team-card ${needsAction ? 'urgent' : ''}`} id={`team-${team.id}`}>
    <div className="team-card-head"><div><h2>{team.name}</h2><p>{team.language === 'ar' ? tr.arabic : tr.hebrew} · {team.activityDuration} {tr.minutes} · {tr.stage} {team.currentStage}</p></div><span className={`status-badge ${needsAction ? 'warn' : ''}`}>{statusLabel(team, tr)}</span></div>
    <div className="team-stats"><span><b>{(team.completedCompanies || []).length}</b> {tr.companies}</span><span><b>{team.score || 0}</b> {tr.score}</span><span><b>{(team.collectedAbilities || []).length}</b> {tr.abilities}</span><span><b>{pieces.length}</b> {tr.puzzlePieces}</span><span><b>{timeAgo(pending?.createdAt || team.lastActivityAt || team.createdAt)}</b> {needsAction ? tr.waitingTime : tr.activity}</span></div>
    {pending ? <div className="checkpoint-review-box"><div className="checkpoint-review-head"><b>{pending.title || 'צ׳קפוינט'}</b><span>{tr.waitingTime}: {timeAgo(pending.createdAt)}</span></div><p>{pending.description || ''}</p><small>{tr.checkGuide}</small><small>סוג: {pending.type === 'food_photo' ? 'צילום אוכל / הפסקת טעינה' : 'אישור מדריך'} · חלק פאזל: {pending.piece || '—'}</small>{pending.photoUrl ? <img className="photo-thumb checkpoint-photo" src={pending.photoUrl} alt="צילום צ׳קפוינט" /> : null}</div> : null}
    <div className="team-detail-grid"><section><h3>{tr.recentCompanies}</h3><div className="chips compact">{companyNames.length ? companyNames.map((name) => <span key={name}>{name}</span>) : <small>{tr.noCompanies}</small>}</div></section><section><h3>{tr.participantsList}</h3><div className="chips compact">{participants.length ? participants.map((name) => <span key={name}>{name}</span>) : <small>-</small>}</div></section><section><h3>{tr.recentMessages}</h3>{messages.length ? messages.map((m) => <p className="mini-note" key={m.id || m.createdAt}>{m.text || ''}</p>) : <small>-</small>}</section></div>
    <div className="team-actions"><button className="primary" disabled={!needsAction} onClick={() => runAction(() => new ApproveCheckpoint(repo).execute(team.id, true, `הצ׳קפוינט אושר. קיבלתם חלק פאזל דיגיטלי והמשכתם ל${tr.stage} הבא.`))}>{tr.approve}</button><button disabled={!needsAction} onClick={() => { const note = prompt(`${tr.message} ל${tr.team}:`, 'נסו להשלים עוד חברה או להגיע שוב למדריך.'); if (note !== null) runAction(() => new ApproveCheckpoint(repo).execute(team.id, false, note)); }}>{tr.reject}</button><button onClick={() => runAction(() => repo.sendMessage(team.id, 'גשו למדריך עכשיו לצ׳קפוינט. המשך המשחק ייפתח אחרי אישור.'))}>{tr.quickMessage}</button><button onClick={() => runAction(() => repo.addBonus?.(team.id, 5, `המדריך הוסיף לכם ${tr.bonus} על עבודת צוות.`))}>+5 {tr.bonus}</button><button onClick={() => { const msg = prompt(`${tr.message} ל${tr.team}:`, 'חזרו למדריך כשאתם מסיימים את החברה הנוכחית.'); if (msg) runAction(() => repo.sendMessage(team.id, msg)); }}>{tr.message}</button><button className="danger" onClick={() => { const source = allTeams.find((item) => item.id === team.id); if (confirm(`לאפס את ההתקדמות של ${source?.name || 'הצוות'}?`)) runAction(() => repo.resetTeam(team.id)); }}>{tr.resetTeam}</button></div>
  </article>;
}

function PhotoBoard({ submissions, teams, cfg, tr, runAction, repo }) {
  if (!submissions.length) return <section className="photo-board"><div className="card empty-state"><h2>{tr.noPhotos}</h2></div></section>;
  return <section className="photo-board">{submissions.map((submission) => {
    const team = teams.find((item) => item.id === submission.teamId);
    const company = cfg?.companies?.find((item) => item.id === submission.companyId);
    return <article className="photo-review" key={submission.id}><div><h2>{company?.nameHe || submission.companyId || tr.logoPhoto}</h2><p>{tr.team}: {team?.name || submission.teamId} · {tr.taskScore}: {submission.awardedPoints || 0}</p><span className="status-badge">{submission.instructorReviewStatus}</span></div>{submission.photoUrl ? <img className="photo-thumb" src={submission.photoUrl} alt={tr.logoPhoto} /> : <div className="photo-placeholder">LOGO</div>}<div className="team-actions"><button className="primary" onClick={() => runAction(() => repo.reviewSubmission(submission.id, 'valid'))}>{tr.markValid}</button><button onClick={() => { if (confirm(`לסמן צילום כ${tr.invalid} ולהחזיר את החברה לתיקון אצל הצוות?`)) runAction(() => repo.reviewSubmission(submission.id, 'invalid')); }}>{tr.markInvalid}</button><button className="danger" onClick={() => { if (confirm('למחוק את התמונה מהדשבורד? הפעולה לא מוחקת את השלמת החברה.')) runAction(() => repo.deleteSubmission(submission.id)); }}>{tr.deletePhoto}</button></div></article>;
  })}</section>;
}
