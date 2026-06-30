import React, { useEffect, useMemo, useState } from 'react';
import { StudentApp } from '../student/StudentApp.js';
import { CalculateModelQuality, CompleteCompany, CreateTeamSession, GenerateBase44Prompt, RepairModel, RequestCheckpoint, RequestFoodBreak, checkpointPlan, finalMissionOpen, finalMissionReadiness, nextCheckpoint, nextFoodBreak, puzzlePieces, selectCompaniesForDuration } from '../../domain/use-cases/useCases.js';
import { t } from '../../infrastructure/i18n/translations.js';

const fallbackTeams = [
  { id: 'red', name: 'צוות אדום' },
  { id: 'white', name: 'צוות לבן' },
  { id: 'blue', name: 'צוות כחול' },
  { id: 'green', name: 'צוות ירוק' },
  { id: 'yellow', name: 'צוות צהוב' },
  { id: 'purple', name: 'צוות סגול' }
];

async function teamsForEvent(repo, event) {
  if (!event) return fallbackTeams;
  try {
    const teams = repo.listEventTeams ? await repo.listEventTeams(event.id) : (event.teamAccess || []);
    return teams?.length ? teams : fallbackTeams;
  } catch {
    return event.teamAccess?.length ? event.teamAccess : fallbackTeams;
  }
}

function LegacyStudentScreen({ repo, lang, teamIdVersion, initialCompanyId = null }) {
  const ref = React.useRef(null);

  useEffect(() => {
    if (!ref.current) return undefined;
    ref.current.innerHTML = '';
    const app = new StudentApp(repo, ref.current, lang);
    if (initialCompanyId) app.activeCompanyId = initialCompanyId;
    app.render();
    return () => {
      try { app.closeLiveStream?.(); } catch {}
      if (ref.current) ref.current.innerHTML = '';
    };
  }, [repo, lang, teamIdVersion, initialCompanyId]);

  return <div ref={ref} />;
}

export function StudentReactApp({ repo, lang, onLanguageChange }) {
  const [teamIdVersion, setTeamIdVersion] = useState(0);
  const [mode, setMode] = useState(sessionStorage.getItem('aiQuest.studentMode') || 'home');
  const currentTeamId = localStorage.getItem('aiQuest.currentTeam');

  if (currentTeamId && (mode === 'play' || mode.startsWith('legacy-task:'))) {
    sessionStorage.setItem('aiQuest.studentMode', 'companies');
    setMode('companies');
    return <section className="card react-loading-card"><div className="react-loader" aria-hidden="true" /><h1>{t(lang, 'companies')}</h1><p>מעבירים למסך החברות החדש...</p></section>;
  }

  if (currentTeamId && mode.startsWith('task:')) {
    return (
      <StudentCompanyTaskScreen
        repo={repo}
        lang={lang}
        teamId={currentTeamId}
        companyId={mode.slice(5)}
        onBackCompanies={() => { sessionStorage.setItem('aiQuest.studentMode', 'companies'); setMode('companies'); }}
      />
    );
  }

  if (currentTeamId && mode === 'companies') {
    return (
      <StudentCompaniesScreen
        repo={repo}
        lang={lang}
        teamId={currentTeamId}
        onBackHome={() => { sessionStorage.setItem('aiQuest.studentMode', 'home'); setMode('home'); }}
        onOpenCompany={(companyId) => { sessionStorage.setItem('aiQuest.studentMode', `task:${companyId}`); setMode(`task:${companyId}`); }}
      />
    );
  }

  if (currentTeamId) {
    return (
      <StudentHomeScreen
        repo={repo}
        lang={lang}
        teamId={currentTeamId}
        onLanguageChange={onLanguageChange}
        onPlay={() => { sessionStorage.setItem('aiQuest.studentMode', 'companies'); setMode('companies'); }}
        onSwitchTeam={() => { sessionStorage.removeItem('aiQuest.studentMode'); setMode('home'); setTeamIdVersion((v) => v + 1); }}
      />
    );
  }

  return <StudentJoinScreen repo={repo} lang={lang} onLanguageChange={onLanguageChange} onJoined={() => { sessionStorage.setItem('aiQuest.studentMode', 'home'); setMode('home'); setTeamIdVersion((v) => v + 1); }} />;
}

function StudentHomeScreen({ repo, lang, teamId, onLanguageChange, onPlay, onSwitchTeam }) {
  const [state, setState] = useState({ loading: true, team: null, cfg: null, quality: null, error: '' });
  const [refreshing, setRefreshing] = useState(false);

  async function load({ silent = false } = {}) {
    if (silent) setRefreshing(true); else setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      let team = await repo.getTeam(teamId);
      if (lang && team.language !== lang) {
        team = { ...team, language: lang };
        await repo.saveTeam(team);
      }
      const cfg = await repo.getEventConfig(team.eventId);
      const quality = await new CalculateModelQuality(repo).execute(team.id);
      setState({ loading: false, team, cfg, quality, error: '' });
    } catch (err) {
      setState({ loading: false, team: null, cfg: null, quality: null, error: String(err?.message || err || 'load_failed') });
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [repo, teamId, lang]);

  useEffect(() => {
    const onFocus = () => load({ silent: true });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [repo, teamId, lang]);

  if (state.loading) {
    return <section className="card react-loading-card"><div className="react-loader" aria-hidden="true" /><h1>AI Quest</h1><p>טוען את הצוות...</p></section>;
  }

  if (state.error || !state.team || !state.cfg) {
    return (
      <section className="card connection-error react-student-home-error">
        <h1>לא הצלחנו לטעון את הצוות</h1>
        <p className="error">{state.error}</p>
        <button className="primary" onClick={() => load()}>נסו שוב</button>
        <button className="ghost" onClick={() => { localStorage.removeItem('aiQuest.currentTeam'); onSwitchTeam(); }}>בחירת צוות מחדש</button>
      </section>
    );
  }

  const { team, cfg, quality } = state;
  const l = team.language || lang || 'he';
  const completed = team.completedCompanies?.length || 0;
  const abilities = team.collectedAbilities?.length || 0;
  const problem = cfg.modelProblem || {};
  const content = cfg.content || {};
  const story = content.openingStory?.[l] || content.openingStory?.he || '';
  const collectedAbilities = (cfg.abilities || []).filter((ability) => team.collectedAbilities?.includes(ability.id));
  const requiredTypes = problem.requiredAbilityTypes || [];
  const collectedTypes = new Set(collectedAbilities.map((ability) => ability.type));
  const messages = (team.messages || []).slice(-2).reverse();
  const pieces = puzzlePieces(team);
  const plan = checkpointPlan(team.activityDuration, l, { config: cfg });

  return (
    <div className="react-student-home">
      <header className="topbar student-topbar react-student-topbar">
        <div className="student-title">
          <b>{t(l, 'app')}</b>
          <span>{team.name} · {team.activityDuration} {t(l, 'minutes')} · Live</span>
        </div>
        <div className="student-stats">
          <span><b>{team.score || 0}</b>{t(l, 'points')}</span>
          <span><b>{completed}</b>{t(l, 'completedCompanies')}</span>
          <span><b>{abilities}</b>{t(l, 'abilities')}</span>
        </div>
        <button className="ghost" onClick={() => load({ silent: true })} disabled={refreshing}>{refreshing ? 'מרענן...' : 'רענון נתונים'}</button>
        <button className="ghost" onClick={() => { if (confirm('לצאת מהצוות במכשיר הזה? ההתקדמות של הצוות תישמר בשרת.')) { localStorage.removeItem('aiQuest.currentTeam'); onSwitchTeam(); } }}>החלפת צוות</button>
      </header>

      <div className="student-team-banner react-team-banner"><span>משחקים בתור</span><strong>{team.name}</strong></div>

      <main className="grid-main react-student-home-grid">
        <section>
          <section className="card react-mission-card">
            <div className="section-head">
              <div>
                <span className="level">מסע צוות</span>
                <h2>{t(l, 'start')}</h2>
                <p>{t(l, 'mission')}</p>
              </div>
            </div>
            {story ? <details className="story-card"><summary>{t(l, 'story')}</summary>{story.split(/\n{2,}/).map((paragraph, idx) => <p key={idx}>{paragraph}</p>)}</details> : null}
            <div className="problem"><b>{l === 'ar' ? problem.titleAr : problem.titleHe}</b><p>{l === 'ar' ? problem.descriptionAr : problem.descriptionHe}</p></div>
          </section>

          {messages.length ? (
            <section className="card status-card react-updates-card">
              <h2>{t(l, 'latestUpdates')}</h2>
              <div className="team-updates">{messages.map((message, idx) => <p key={idx} className="notice">{message.text}</p>)}</div>
            </section>
          ) : null}

          <section className="card react-play-card">
            <h2>המשך למשחק</h2>
            <p>עברו לבחירת חברה, מצאו לוגו בשטח, ענו על המשימה ואספו יכולות למודל שלכם.</p>
            <button className="primary" onClick={onPlay}>פתחו משימות חברות</button>
          </section>
        </section>

        <aside>
          <section className="card react-model-bag">
            <h2>{t(l, 'modelBag')}</h2>
            <div className="model-summary">
              <div><b>{completed}</b><span>{t(l, 'completedCompanies')}</span></div>
              <div><b>{collectedAbilities.length}</b><span>{t(l, 'abilities')}</span></div>
              <div><b>{team.score || 0}</b><span>{t(l, 'points')}</span></div>
            </div>
            <p>{t(l, 'modelProgressByAbility')}</p>
            <div className="ability-bars">
              {requiredTypes.map((type) => <div key={type} className={`ability-bar ${collectedTypes.has(type) ? 'on' : ''}`}><span>{t(l, type) || type}</span><b>{collectedTypes.has(type) ? '✓' : '+'}</b></div>)}
            </div>
            <div className="quality-pill"><span>{t(l, 'quality')}</span><b>{quality?.quality ?? 0}</b></div>
            {cfg.event?.puzzleConfig?.enabled ? <div className="react-puzzle-summary"><h3>{t(l, 'digitalPuzzle')}</h3><p>{pieces.length}/{Math.max(plan.length, Number(cfg.event?.puzzleConfig?.pieceCount || plan.length || 1))} {t(l, 'digitalPuzzlePieces')}</p></div> : null}
            <div className="chips">{collectedAbilities.length ? collectedAbilities.map((ability) => <span key={ability.id}>{l === 'ar' ? ability.nameAr : ability.nameHe}</span>) : <small>{t(l, 'noAbilitiesYet')}</small>}</div>
          </section>
        </aside>
      </main>
    </div>
  );
}

function StudentCompaniesScreen({ repo, lang, teamId, onBackHome, onOpenCompany }) {
  const [state, setState] = useState({ loading: true, team: null, cfg: null, error: '' });
  const [query, setQuery] = useState(sessionStorage.getItem('aiQuest.reactCompanySearch') || '');
  const [view, setView] = useState(sessionStorage.getItem('aiQuest.reactCompanyView') || 'open');
  const [checkpointBusy, setCheckpointBusy] = useState(false);
  const [foodPhoto, setFoodPhoto] = useState(null);
  const [foodPreview, setFoodPreview] = useState('');

  async function load() {
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const team = await repo.getTeam(teamId);
      const cfg = await repo.getEventConfig(team.eventId);
      setState({ loading: false, team, cfg, error: '' });
    } catch (err) {
      setState({ loading: false, team: null, cfg: null, error: String(err?.message || err || 'load_failed') });
    }
  }

  useEffect(() => { load(); }, [repo, teamId, lang]);

  useEffect(() => { sessionStorage.setItem('aiQuest.reactCompanySearch', query); }, [query]);
  useEffect(() => { sessionStorage.setItem('aiQuest.reactCompanyView', view); }, [view]);
  useEffect(() => () => { if (foodPreview) URL.revokeObjectURL(foodPreview); }, [foodPreview]);

  if (state.loading) return <section className="card react-loading-card"><div className="react-loader" aria-hidden="true" /><h1>{t(lang, 'companies')}</h1><p>טוען חברות...</p></section>;
  if (state.error || !state.team || !state.cfg) return <section className="card connection-error"><h1>לא הצלחנו לטעון חברות</h1><p className="error">{state.error}</p><button className="primary" onClick={load}>נסו שוב</button><button className="ghost" onClick={onBackHome}>חזרה לבית</button></section>;

  const { team, cfg } = state;
  const l = team.language || lang || 'he';
  if (finalMissionOpen(team, cfg)) {
    return <StudentFinalScreen repo={repo} team={team} cfg={cfg} lang={l} onBackHome={onBackHome} />;
  }
  const blockingCheckpoint = nextCheckpoint(team, cfg);
  const foodBreak = nextFoodBreak(team, cfg);
  const companies = selectCompaniesForDuration(cfg, team);
  const fixList = (team.needsPhotoFixCompanies || []).filter((id) => companies.some((company) => company.id === id));
  const completedVisible = (team.completedCompanies || []).filter((id) => companies.some((company) => company.id === id));
  const counts = {
    open: companies.filter((company) => !team.completedCompanies?.includes(company.id) && !fixList.includes(company.id)).length,
    completed: completedVisible.length,
    fix: fixList.length,
    all: companies.length
  };
  const cleanQuery = query.trim().toLowerCase();
  const filtered = companies.filter((company) => {
    const done = team.completedCompanies?.includes(company.id);
    const needsFix = fixList.includes(company.id);
    const name = (l === 'ar' ? company.nameAr : company.nameHe) || company.nameHe || company.nameEn || '';
    const byView = view === 'completed' ? done : view === 'fix' ? needsFix : view === 'all' ? true : (!done && !needsFix);
    const bySearch = !cleanQuery || name.toLowerCase().includes(cleanQuery) || (company.nameEn || '').toLowerCase().includes(cleanQuery);
    return byView && bySearch;
  });
  const hiddenCount = Math.max(0, (cfg.companies?.length || 0) - companies.length);

  function randomCompany() {
    const pool = companies.filter((company) => !team.completedCompanies?.includes(company.id) || fixList.includes(company.id));
    if (!pool.length) return;
    onOpenCompany(pool[Math.floor(Math.random() * pool.length)].id);
  }

  async function requestInstructorCheckpoint() {
    setCheckpointBusy(true);
    try {
      await new RequestCheckpoint(repo).execute(team.id);
      await load();
    } catch (err) {
      alert(String(err?.message || err || 'checkpoint_error'));
    } finally {
      setCheckpointBusy(false);
    }
  }

  async function submitFoodBreak(e) {
    e.preventDefault();
    if (!foodPhoto) return;
    setCheckpointBusy(true);
    try {
      await new RequestFoodBreak(repo).execute(team.id, { photoFile: foodPhoto, photoName: foodPhoto.name || 'checkpoint-photo' });
      setFoodPhoto(null);
      if (foodPreview) URL.revokeObjectURL(foodPreview);
      setFoodPreview('');
      await load();
    } catch (err) {
      alert(String(err?.message || err || 'food_break_error'));
    } finally {
      setCheckpointBusy(false);
    }
  }

  function chooseFoodPhoto(file) {
    setFoodPhoto(file || null);
    if (foodPreview) URL.revokeObjectURL(foodPreview);
    setFoodPreview(file ? URL.createObjectURL(file) : '');
  }

  return (
    <div className="react-companies-screen">
      <header className="topbar react-companies-topbar">
        <div>
          <b>{t(l, 'companies')}</b>
          <span>{team.name} · {companies.length} חברות זמינות</span>
        </div>
        <button className="ghost" onClick={onBackHome}>חזרה לבית</button>
      </header>

      {blockingCheckpoint ? (
        <section className="card checkpoint-lock-card react-checkpoint-card">
          <div className="checkpoint-gate">
            <h2>{blockingCheckpoint.title || t(l, 'checkpoint')}</h2>
            <p>{blockingCheckpoint.description || t(l, 'returnToInstructor')}</p>
            <div className="checkpoint-progress"><b>{team.completedCompanies?.length || 0}</b><span>{t(l, 'companiesCompleted')} · {t(l, 'required')} {blockingCheckpoint.threshold}</span></div>
            <p className="notice strong">{t(l, 'checkpointBlocksCompanies')}</p>
            <button className="primary" disabled={checkpointBusy || blockingCheckpoint.isPending || blockingCheckpoint.status === 'requested'} onClick={requestInstructorCheckpoint}>{blockingCheckpoint.isPending || blockingCheckpoint.status === 'requested' ? t(l, 'waitingInstructor') : t(l, 'requestCheckpoint')}</button>
            {cfg.event?.puzzleConfig?.enabled ? <p>{t(l, 'puzzlePieceAfterApproval')} <b>{blockingCheckpoint.piece || 'המשך'}</b></p> : null}
            {blockingCheckpoint.isPending || blockingCheckpoint.status === 'requested' ? <p className="notice">{t(l, 'checkpointSent')}</p> : null}
          </div>
        </section>
      ) : null}

      {!blockingCheckpoint && foodBreak ? (
        <section className="card food-break-card react-food-break-card">
          <h2>{foodBreak.title}</h2>
          <p>{foodBreak.description}</p>
          <div className="checkpoint-progress"><b>{team.completedCompanies?.length || 0}</b><span>{t(l, 'companiesCompleted')} · {t(l, 'required')} {foodBreak.threshold}</span></div>
          <form className="form-grid" onSubmit={submitFoodBreak}>
            <label className="upload-box react-upload-box">
              <input name="photo" type="file" accept="image/*" required onChange={(event) => chooseFoodPhoto(event.target.files?.[0])} />
              <span>{foodBreak.type === 'funding_photo' ? (l === 'ar' ? 'ارفعوا أو صوّروا شعار بنك لئومي' : 'צלמו או העלו לוגו של בנק לאומי') : t(l, 'foodPhotoPrompt')}</span>
              {foodPreview ? <img src={foodPreview} alt="תצוגה מקדימה" /> : null}
            </label>
            <button className="primary" disabled={checkpointBusy || !foodPhoto}>{checkpointBusy ? 'שולח...' : t(l, 'uploadAndContinue')}</button>
          </form>
        </section>
      ) : null}

      {!blockingCheckpoint ? <ReactGeneralAiHelper repo={repo} team={team} cfg={cfg} lang={l} /> : null}
      {!blockingCheckpoint ? <ReactRepairModel repo={repo} team={team} cfg={cfg} lang={l} onUpdated={load} /> : null}

      {!blockingCheckpoint ? <section className="card react-companies-card">
        <div className="section-head">
          <div>
            <span className="level">בחירת חברה</span>
            <h2>{t(l, 'companies')}</h2>
            <p>{t(l, 'companyPickerHint')}</p>
            {hiddenCount ? <small className="duration-note">{t(l, 'durationSelectionNote')} ({companies.length}/{cfg.companies.length})</small> : null}
          </div>
          <div className="progress-ring"><b>{completedVisible.length}</b><span>{t(l, 'completed')}</span></div>
        </div>

        <div className="company-picker react-company-picker">
          <label className="company-search">
            <span>{t(l, 'searchCompany')}</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t(l, 'searchCompanyPlaceholder')} />
          </label>
          <div className="company-view-tabs">
            {[['open', t(l, 'openCompanies'), counts.open], ['completed', t(l, 'completed'), counts.completed], ['fix', t(l, 'needsFix'), counts.fix], ['all', t(l, 'all'), counts.all]].map(([id, label, count]) => (
              <button key={id} type="button" className={view === id ? 'active' : ''} onClick={() => setView(id)}>{label} ({count})</button>
            ))}
            <button type="button" onClick={randomCompany}>{t(l, 'randomCompany')}</button>
          </div>
        </div>

        <div className="company-grid react-company-grid">
          {filtered.length ? filtered.map((company) => {
            const done = team.completedCompanies?.includes(company.id);
            const needsFix = fixList.includes(company.id);
            const stateClass = needsFix ? 'needs-fix' : done ? 'done' : 'open';
            const status = needsFix ? t(l, 'needsFixStatus') : done ? t(l, 'completedStatus') : t(l, 'openStatus');
            const displayName = l === 'ar' ? (company.nameAr || company.nameHe) : company.nameHe;
            return (
              <article key={company.id} className={`company-card react-company-card ${stateClass}`} onClick={() => { if (!done || needsFix) onOpenCompany(company.id); }}>
                <div className="company-card-top"><span className={`company-state-dot ${stateClass}`} /><span className="status">{status}</span></div>
                <CompanyLogo company={company} lang={l} />
                <h3>{displayName}</h3>
                <p className="no-spoiler">{t(l, 'noSpoiler')}</p>
                <button type="button" disabled={done && !needsFix} onClick={(event) => { event.stopPropagation(); onOpenCompany(company.id); }}>{needsFix ? t(l, 'retakePhoto') : done ? t(l, 'completedStatus') : t(l, 'openCompanyTask')}</button>
              </article>
            );
          }) : <div className="empty-state"><h3>{t(l, 'noCompanies')}</h3><p>{t(l, 'noCompaniesHint')}</p></div>}
        </div>
      </section> : null}
    </div>
  );
}

function CompanyLogo({ company, lang }) {
  const name = lang === 'ar' ? (company.nameAr || company.nameHe) : (company.nameHe || company.nameEn || company.id);
  const alt = lang === 'ar' ? (company.logoAltAr || name) : (company.logoAltHe || name);
  const mark = company.logoMark || String(name).slice(0, 2);
  const [failed, setFailed] = useState(false);
  if (company.logoUrl && !failed) {
    return <div className="company-logo card"><img src={company.logoUrl} alt={alt} loading="lazy" onError={() => setFailed(true)} /><span>{mark}</span></div>;
  }
  return <div className="company-logo card fallback" aria-label={alt}><span>{mark}</span></div>;
}

function abilityTypeLabel(type, lang = 'he') {
  return t(lang, type) || type;
}

function ReactGeneralAiHelper({ repo, team, cfg, lang }) {
  const [question, setQuestion] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [answer, setAnswer] = useState(sessionStorage.getItem('aiQuest.aiAnswer') || '');
  const [loading, setLoading] = useState(false);
  const companies = selectCompaniesForDuration(cfg, team).slice(0, 60);

  async function submit(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await repo.askAiHelper(team.id, question, companyId);
      const nextAnswer = res.answer + (res.awarded ? `\n\nקיבלתם ${res.awarded} נק׳ בונוס.` : '');
      setAnswer(nextAnswer);
      sessionStorage.setItem('aiQuest.aiAnswer', nextAnswer);
    } catch (err) {
      alert(String(err.message || err).includes('paused') ? 'המשחק נעצר כרגע. העוזר יחזור לפעול כשהמשחק ייפתח.' : 'לא הצלחנו להפעיל את העוזר כרגע.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card ai-helper-card react-general-ai-helper">
      <h2>עוזר AI למשחק</h2>
      <p>שאלו על חברה בפארק, על המשימה, או מה לעשות אם נתקעתם. שימוש ראשון בעוזר נותן 3 נק׳ בונוס.</p>
      <form className="form-grid" onSubmit={submit}>
        <label><span>שאלה לעוזר</span><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="לדוגמה: איך Microsoft קשורה ל-AI?" required /></label>
        <label><span>חברה אופציונלית</span><select value={companyId} onChange={(event) => setCompanyId(event.target.value)}><option value="">ללא חברה מסוימת</option>{companies.map((company) => <option key={company.id} value={company.id}>{lang === 'ar' ? (company.nameAr || company.nameHe) : company.nameHe}</option>)}</select></label>
        <button className="primary" disabled={loading}>{loading ? 'שואל...' : 'שאלו את העוזר'}</button>
      </form>
      {answer ? <div className="notice ok"><b>תשובת העוזר</b><p>{answer}</p></div> : null}
    </section>
  );
}

function ReactRepairModel({ repo, team, cfg, lang, onUpdated }) {
  const [selected, setSelected] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const collected = (cfg.abilities || []).filter((ability) => team.collectedAbilities?.includes(ability.id));
  if (!collected.length) return null;
  const repaired = [...new Set((team.repairs || []).filter((repair) => repair.success).flatMap((repair) => repair.selectedTypes || []))];

  function toggle(type) {
    setSelected((prev) => prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]);
  }

  async function repair() {
    if (!selected.length) {
      setFeedback({ success: false, title: t(lang, 'chooseAtLeastOne'), text: t(lang, 'chooseAtLeastOneText') });
      return;
    }
    setLoading(true);
    try {
      const res = await new RepairModel(repo).execute(team.id, selected);
      setFeedback(res.success
        ? { success: true, title: t(lang, 'modelStrengthened'), text: `${selected.map((type) => abilityTypeLabel(type, lang)).join(' · ')}. ${t(lang, 'abilityChoiceGood')}` }
        : { success: false, title: t(lang, 'choiceNotGood'), text: t(lang, 'choiceNotGoodText') });
      await onUpdated?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card react-repair-card">
      <div className="section-head"><div><h2>{t(lang, 'repair')}</h2><p>{t(lang, 'repairHint')}</p></div></div>
      <div className="repair-grid">
        {collected.map((ability) => <label key={`${ability.id}-${ability.type}`} className="repair-card"><input type="checkbox" checked={selected.includes(ability.type)} onChange={() => toggle(ability.type)} /><span>{lang === 'ar' ? ability.nameAr : ability.nameHe}</span><small>{abilityTypeLabel(ability.type, lang)}</small></label>)}
      </div>
      <div className="repaired-list"><b>{t(lang, 'repairedSoFar')}</b> {repaired.length ? repaired.map((type) => abilityTypeLabel(type, lang)).join(' · ') : t(lang, 'noWeaknessesRepaired')}</div>
      <button className="primary" onClick={repair} disabled={loading}>{loading ? 'מתקן...' : t(lang, 'repairModelButton')}</button>
      {feedback ? <div className={`repair-feedback ${feedback.success ? 'ok' : 'bad'}`}><b>{feedback.title}</b><p>{feedback.text}</p><button type="button" onClick={() => setFeedback(null)}>{t(lang, 'understood')}</button></div> : null}
    </section>
  );
}

function StudentFinalScreen({ repo, team, cfg, lang, onBackHome }) {
  const [quality, setQuality] = useState(null);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    let alive = true;
    async function loadFinal() {
      const q = await new CalculateModelQuality(repo).execute(team.id);
      const p = team.completedCompanies?.length ? await new GenerateBase44Prompt(repo).execute(team.id) : '';
      if (alive) { setQuality(q); setPrompt(p); }
    }
    loadFinal();
    return () => { alive = false; };
  }, [repo, team.id]);

  const ready = finalMissionReadiness(team, cfg);
  const pieces = puzzlePieces(team);
  const plan = checkpointPlan(team.activityDuration, lang, { config: cfg });
  const completedCompanies = (team.completedCompanies || []).map((id) => cfg.companies.find((company) => company.id === id)).filter(Boolean).slice(-8);
  const progress = Object.values(ready.progress);

  return (
    <main className="react-final-screen">
      <section className="card final-card">
        <div className="final-hero"><div className="success-mark">{ready.ready ? '✓' : '!'}</div><div><h2>{t(lang, 'finalTitle')}</h2><p>{t(lang, 'finalSubtitle')}</p></div></div>
        <div className="final-score-grid">
          <div className="result"><b>{team.score || 0}</b><span>{t(lang, 'gamePoints')}</span></div>
          <div><b>{team.completedCompanies?.length || 0}</b><span>{t(lang, 'companiesCompleted')}</span></div>
          <div><b>{team.collectedAbilities?.length || 0}</b><span>{t(lang, 'collectedAbilities')}</span></div>
          <div><b>{ready.readyDomains}/{ready.totalDomains}</b><span>{t(lang, 'finalDomainsReady')}</span></div>
        </div>
        <div className="final-section"><h3>{t(lang, 'finalMission')}</h3><p>{t(lang, 'finalMissionText')}</p><p className="notice strong">{t(lang, 'finalTrainingText')}</p><div className="ability-bars">{progress.map((item) => <div key={item.type} className={`ability-bar ${item.ready ? 'on' : 'warn'}`}><span>{abilityTypeLabel(item.type, lang)}</span><b>{item.count}/3</b></div>)}</div></div>
        <div className="final-section"><h3>{t(lang, 'strengths')}</h3><div className="chips big">{quality?.strengths?.length ? quality.strengths.map((type) => <span key={type}>{abilityTypeLabel(type, lang)}</span>) : <small>-</small>}</div></div>
        <div className="final-section"><h3>{t(lang, 'weaknesses')}</h3><div className="chips">{quality?.weaknesses?.length ? quality.weaknesses.map((type) => <span key={type}>{abilityTypeLabel(type, lang)}</span>) : <small>-</small>}</div></div>
        <div className="final-section"><h3>{t(lang, 'companiesCompleted')}</h3><div className="chips">{completedCompanies.map((company) => <span key={company.id}>{lang === 'ar' ? (company.nameAr || company.nameHe) : company.nameHe}</span>)}</div></div>
        {cfg.event?.puzzleConfig?.enabled ? <div className="final-section"><h3>{t(lang, 'progressPuzzle')}</h3><p>{pieces.length}/{Math.max(plan.length, Number(cfg.event?.puzzleConfig?.pieceCount || plan.length || 1))} {t(lang, 'digitalPuzzlePieces')}</p></div> : null}
        {ready.ready ? <><p className="notice strong ok">{t(lang, 'finalMissionReady')}</p><label><span>{t(lang, 'prompt')}</span><textarea readOnly value={prompt} /></label></> : <p className="notice strong">{t(lang, 'finalMissionLocked')}</p>}
        <button className="ghost" onClick={onBackHome}>חזרה לבית</button>
      </section>
    </main>
  );
}

function StudentCompanyTaskScreen({ repo, lang, teamId, companyId, onBackCompanies }) {
  const [state, setState] = useState({ loading: true, team: null, cfg: null, error: '' });
  const [answers, setAnswers] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState(sessionStorage.getItem(`aiQuest.companyAiAnswer.${companyId}`) || '');
  const [aiLoading, setAiLoading] = useState(false);

  async function load() {
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const team = await repo.getTeam(teamId);
      const cfg = await repo.getEventConfig(team.eventId);
      setState({ loading: false, team, cfg, error: '' });
    } catch (err) {
      setState({ loading: false, team: null, cfg: null, error: String(err?.message || err || 'load_failed') });
    }
  }

  useEffect(() => { load(); }, [repo, teamId, companyId, lang]);
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  if (state.loading) return <section className="card react-loading-card"><div className="react-loader" aria-hidden="true" /><h1>{t(lang, 'companyMission')}</h1><p>טוען משימה...</p></section>;
  if (state.error || !state.team || !state.cfg) return <section className="card connection-error"><h1>לא הצלחנו לטעון משימה</h1><p className="error">{state.error}</p><button className="primary" onClick={load}>נסו שוב</button><button className="ghost" onClick={onBackCompanies}>{t(lang, 'backToCompanies')}</button></section>;

  const { team, cfg } = state;
  const l = team.language || lang || 'he';
  const company = cfg.companies.find((item) => item.id === companyId);
  if (!company) return <section className="card connection-error"><h1>חברה לא נמצאה</h1><button className="primary" onClick={onBackCompanies}>{t(l, 'backToCompanies')}</button></section>;
  const questions = (cfg.questions || []).filter((question) => question.companyId === companyId && question.active !== false);
  const companyName = l === 'ar' ? (company.nameAr || company.nameHe) : company.nameHe;
  const abilities = (company.abilityIds || []).map((id) => cfg.abilities.find((ability) => ability.id === id)).filter(Boolean);
  const isKnowledge = (company.stationType || 'model') === 'knowledge';

  function setAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function choosePhoto(file) {
    setPhotoFile(file || null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : '');
  }

  async function askAi(e) {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    try {
      const res = await repo.askAiHelper(team.id, aiQuestion, companyId);
      const answer = res.answer + (res.awarded ? `\n\nקיבלתם ${res.awarded} נק׳ בונוס.` : '');
      setAiAnswer(answer);
      sessionStorage.setItem(`aiQuest.companyAiAnswer.${companyId}`, answer);
    } catch (err) {
      alert(String(err.message || err).includes('paused') ? 'המשחק נעצר כרגע. העוזר יחזור לפעול כשהמשחק ייפתח.' : 'לא הצלחנו להפעיל את העוזר כרגע.');
    } finally {
      setAiLoading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await new CompleteCompany(repo).execute({
        teamId: team.id,
        companyId,
        answers,
        photoName: photoFile?.name || '',
        photoFile: photoFile || null
      });
      setSuccess(true);
    } catch (err) {
      alert(String(err.message || err).includes('paused') ? 'המשחק נעצר כרגע על ידי המדריך. אי אפשר להשלים משימה עד פתיחה מחדש.' : 'לא הצלחנו לשמור את המשימה. נסו שוב.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="success-screen react-success-screen">
        <section className="card success-card">
          <div className="success-mark">✓</div>
          <h1>{t(l, 'companyCompleted')}</h1>
          <p>{companyName} {t(l, 'addedToJourney')}</p>
          <h2>{isKnowledge ? (l === 'ar' ? 'أضفتم معرفة ونقاطًا' : 'הוספתם ידע וניקוד') : t(l, 'modelBagStrengthened')}</h2>
          {isKnowledge ? <p className="station-kind knowledge">{l === 'ar' ? 'هذه المحطة لا تضيف قدرة مباشرة للنموذج، لكنها تقوي فهم الفريق وتمنح نقاطًا.' : 'התחנה הזו לא מוסיפה יכולת ישירה למודל, אבל היא מוסיפה ידע לצוות וניקוד.'}</p> : <div className="chips big">{abilities.map((ability) => <span key={ability.id}>{l === 'ar' ? ability.nameAr : ability.nameHe}</span>)}</div>}
          <button className="primary" onClick={onBackCompanies}>{t(l, 'backToCompanies')}</button>
        </section>
      </main>
    );
  }

  return (
    <main className="task-screen react-task-screen">
      <div className="react-task-actions-top">
        <button className="ghost" onClick={onBackCompanies}>{t(l, 'backToCompanies')}</button>
      </div>
      <section className="task-hero react-task-hero">
        <div>
          <span className="level">{t(l, 'companyMission')} · {t(l, 'level')} {company.level}</span>
          <h1>{companyName}</h1>
          <p>{company.field}</p>
          <p>{l === 'ar' ? company.descriptionAr : company.descriptionHe}</p>
        </div>
        <div className="task-logo-panel"><CompanyLogo company={company} lang={l} /><small>{t(l, 'referenceLogoOnly')}</small></div>
      </section>

      <section className="task-block company-ai-helper react-company-ai-helper">
        <h2>עוזר AI לחברה הזו</h2>
        <p>נתקעתם? שאלו שאלה קצרה על החברה או על הקשר שלה ל-AI. העוזר מכוון לחשיבה ולא מחליף את עבודת הצוות.</p>
        <form className="form-grid" onSubmit={askAi}>
          <label><span>שאלה לעוזר</span><input value={aiQuestion} onChange={(event) => setAiQuestion(event.target.value)} placeholder={l === 'ar' ? `اسألوا المساعد عن ${companyName}` : `שאלו את העוזר על ${companyName}`} required /></label>
          <button type="submit" className="primary" disabled={aiLoading}>{aiLoading ? 'שואל...' : 'שאלו על החברה הזו'}</button>
        </form>
        {aiAnswer ? <div className="notice ok"><b>תשובת העוזר</b><p>{aiAnswer}</p></div> : null}
      </section>

      <form className="task-form" onSubmit={submit}>
        <section className="task-block">
          <h2>1. {t(l, 'photographLogo')}</h2>
          <p>{t(l, 'photoInstructorHint')}</p>
          <p className="notice">{t(l, 'realLogoRequired')}</p>
          <label className="upload-box react-upload-box">
            <input name="photo" type="file" accept="image/*" onChange={(event) => choosePhoto(event.target.files?.[0])} />
            <span>{t(l, 'choosePhoto')}</span>
            {photoPreview ? <img src={photoPreview} alt="תצוגה מקדימה" /> : null}
          </label>
          <small>לא חובה להעלות לוגו כדי לסיים חברה; מי שמעלה צילום תקין מקבל בונוס.</small>
        </section>

        <section className="task-block">
          <h2>2. {t(l, 'answerQuestions')}</h2>
          {questions.map((question, idx) => <QuestionInput key={question.id} question={question} idx={idx} lang={l} value={answers[question.id] || ''} onChange={(value) => setAnswer(question.id, value)} />)}
        </section>

        <section className="task-block ability-preview">
          <h2>3. {l === 'ar' ? 'أنهوا المهمة' : 'סיום המשימה'}</h2>
          <p>{l === 'ar' ? 'بعد الإجابة وإرسال المهمة ستظهر لكم نتيجة المحطة وما أضافته للفريق.' : 'אחרי שתענו ותשלחו את המשימה תראו מה התחנה הוסיפה לצוות.'}</p>
        </section>

        <div className="sticky-actions react-sticky-actions">
          <button type="button" onClick={onBackCompanies}>{t(l, 'cancel')}</button>
          <button className="primary" disabled={submitting}>{submitting ? 'שומר...' : t(l, 'finishedCompany')}</button>
        </div>
      </form>
    </main>
  );
}

function QuestionInput({ question, idx, lang, value, onChange }) {
  const title = lang === 'ar' ? question.textAr : question.textHe;
  const explanation = lang === 'ar' ? question.explanationAr : question.explanationHe;
  const type = question.type || 'single';
  if (type === 'short') {
    return <fieldset className="question-card"><legend>{idx + 1}. {title}</legend><label className="option"><span>{t(lang, 'shortAnswer')}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} required /></label><small>{explanation}</small></fieldset>;
  }
  const options = type === 'true_false' && !question.optionsHe?.length ? [t(lang, 'trueText'), t(lang, 'falseText')] : (lang === 'ar' ? question.optionsAr : question.optionsHe);
  return (
    <fieldset className="question-card">
      <legend>{idx + 1}. {title}</legend>
      {(options || []).map((option, optionIdx) => (
        <label key={optionIdx} className="option"><input type="radio" name={question.id} value={optionIdx} checked={String(value) === String(optionIdx)} onChange={(event) => onChange(event.target.value)} required /> {option}</label>
      ))}
      <small>{explanation}</small>
    </fieldset>
  );
}

function StudentJoinScreen({ repo, lang, onLanguageChange, onJoined }) {
  const [activeEvents, setActiveEvents] = useState([]);
  const [selectedEventCode, setSelectedEventCode] = useState(sessionStorage.getItem('aiQuest.selectedEventCode') || 'GAVYAM');
  const [teams, setTeams] = useState(fallbackTeams);
  const [language, setLanguage] = useState(lang || 'he');
  const [participantName, setParticipantName] = useState('');
  const [teamAccessId, setTeamAccessId] = useState(fallbackTeams[0].id);
  const [password, setPassword] = useState('');
  const [activityDuration, setActivityDuration] = useState('90');
  const [participantsCount, setParticipantsCount] = useState('5');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    let alive = true;
    async function loadEvents() {
      setLoadingEvents(true);
      try {
        let events = [];
        try { events = repo.listActiveEvents ? await repo.listActiveEvents() : []; } catch {}
        if (!events.length) {
          try { events = [await repo.getEventByCode(selectedEventCode)]; } catch {}
        }
        if (!alive) return;
        const cleanEvents = events.filter(Boolean);
        setActiveEvents(cleanEvents);
        const event = cleanEvents.find((ev) => String(ev.code) === String(selectedEventCode)) || cleanEvents[0];
        const nextCode = event?.code || selectedEventCode;
        setSelectedEventCode(nextCode);
        sessionStorage.setItem('aiQuest.selectedEventCode', nextCode);
        const eventTeams = await teamsForEvent(repo, event);
        if (!alive) return;
        setTeams(eventTeams);
        setTeamAccessId(eventTeams[0]?.id || fallbackTeams[0].id);
      } finally {
        if (alive) setLoadingEvents(false);
      }
    }
    loadEvents();
    return () => { alive = false; };
  }, [repo]);

  const selectedEvent = useMemo(
    () => activeEvents.find((ev) => String(ev.code) === String(selectedEventCode)) || activeEvents[0],
    [activeEvents, selectedEventCode]
  );

  async function changeEvent(code) {
    setSelectedEventCode(code);
    sessionStorage.setItem('aiQuest.selectedEventCode', code);
    const event = activeEvents.find((ev) => String(ev.code) === String(code));
    const eventTeams = await teamsForEvent(repo, event);
    setTeams(eventTeams);
    setTeamAccessId(eventTeams[0]?.id || fallbackTeams[0].id);
    setJoinError('');
  }

  function explainError(err) {
    const text = String(err?.message || err || '');
    if (text.includes('401') || text.includes('password') || text.includes('invalid_team_password')) return 'סיסמת צוות לא נכונה.';
    if (text.includes('participant')) return 'צריך להזין שם או כינוי אישי.';
    return 'קוד פעילות או צוות לא נמצאו.';
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setJoinError('');
    const eventCode = selectedEventCode || selectedEvent?.code || 'GAVYAM';
    sessionStorage.setItem('aiQuest.selectedEventCode', eventCode);
    localStorage.setItem('aiQuest.language', language);
    onLanguageChange?.(language);
    try {
      const team = await new CreateTeamSession(repo).execute({
        eventCode,
        teamAccessId,
        password,
        participantName,
        language,
        activityDuration: Number(activityDuration),
        participantsCount: Number(participantsCount || 1)
      });
      localStorage.setItem('aiQuest.currentTeam', team.id);
      onJoined();
    } catch (err) {
      setJoinError(explainError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card hero react-student-join">
      <div className="join-hero-copy">
        <span className="level">פעילות חקר</span>
        <h1>AI Quest</h1>
        <p>{t(language, 'intro')}</p>
      </div>

      <form className="form-grid" onSubmit={submit}>
        <label>
          <span>{t(language, 'language')}</span>
          <select value={language} onChange={(e) => { setLanguage(e.target.value); onLanguageChange?.(e.target.value); }}>
            <option value="he">{t(language, 'hebrew')}</option>
            <option value="ar">{t(language, 'arabic')}</option>
          </select>
        </label>

        {activeEvents.length > 1 ? (
          <label>
            <span>בחרו אירוע</span>
            <select id="eventCodeSelect" value={selectedEventCode} onChange={(e) => changeEvent(e.target.value)} disabled={loadingEvents}>
              {activeEvents.map((event) => <option key={event.id || event.code} value={event.code}>{event.name || event.code} · {event.code}</option>)}
            </select>
          </label>
        ) : (
          <p className="muted">אירוע: <b>{selectedEvent?.name || selectedEventCode}</b></p>
        )}

        <label>
          <span>שם / כינוי אישי</span>
          <input value={participantName} onChange={(e) => setParticipantName(e.target.value)} required maxLength={40} autoComplete="name" placeholder="לדוגמה: נועה" />
        </label>

        <label>
          <span>בחרו צוות</span>
          <select id="teamAccessSelect" value={teamAccessId} onChange={(e) => setTeamAccessId(e.target.value)} disabled={loadingEvents}>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>

        <label>
          <span>סיסמת צוות</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoComplete="current-password" placeholder="A1234" />
        </label>

        <label>
          <span>{t(language, 'duration')}</span>
          <select value={activityDuration} onChange={(e) => setActivityDuration(e.target.value)}>
            {[60, 90, 135].map((value) => <option key={value} value={value}>{value} {t(language, 'minutes')}</option>)}
          </select>
        </label>

        <label>
          <span>{t(language, 'participants')}</span>
          <input value={participantsCount} onChange={(e) => setParticipantsCount(e.target.value)} type="number" min="1" max="8" />
        </label>

        <button className="primary" disabled={submitting || loadingEvents}>{submitting ? 'מצטרפים...' : t(language, 'startButton')}</button>
        {joinError ? <p id="joinError" className="error">{joinError}</p> : null}
      </form>
    </section>
  );
}
