import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createRepository } from '../data/repositories/ApiRepositories.js';
import { StudentApp } from '../presentation/student/StudentApp.js';
import { InstructorApp } from '../presentation/instructor/InstructorApp.js';
import { AdminApp } from '../presentation/admin/AdminApp.js';
import { StudentReactApp } from '../presentation/react/StudentReactApp.jsx';
import { InstructorReactApp } from '../presentation/react/InstructorReactApp.jsx';
import { AdminReactApp } from '../presentation/react/AdminReactApp.jsx';
import { t } from '../infrastructure/i18n/translations.js';
import '../../styles.css';
import '../presentation/react/mobile-polish.css';

function getLang() {
  return localStorage.getItem('aiQuest.language') || 'he';
}

function setDocumentLanguage(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = 'rtl';
}

function errorMessage(err) {
  return String(err?.message || err || 'unknown_error').slice(0, 180);
}

function routeFromHash() {
  return location.hash.replace('#', '') || 'student';
}

function hasStaffAccess(role) {
  const code = sessionStorage.getItem('aiQuest.staffCode');
  const current = sessionStorage.getItem('aiQuest.staffRole');
  return !!code && (current === role || (role === 'instructor' && current === 'admin'));
}

function ConnectionError({ lang, error, onRetry }) {
  return (
    <section className="card connection-error react-connection-error">
      <h1>{t(lang, 'connectionProblem')}</h1>
      <p>{t(lang, 'serverUnavailable')}</p>
      <p className="error">פרטי תקלה: {errorMessage(error)}</p>
      <button className="primary" onClick={onRetry}>{t(lang, 'tryAgain')}</button>
      <small>{t(lang, 'demoModeHint')}</small>
    </section>
  );
}

function LoadingCard() {
  return (
    <section className="card react-loading-card">
      <div className="react-loader" aria-hidden="true" />
      <h1>AI Quest</h1>
      <p>טוען את המשחק...</p>
    </section>
  );
}

function StaffAccessGate({ role, lang, repo, onSuccess }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const title = role === 'admin' ? 'כניסת אדמין' : 'כניסת מדריך';
  const hint = role === 'admin'
    ? 'הזינו את קוד האדמין הייעודי. קוד מדריך לא פותח את מסך האדמין.'
    : 'הזינו את קוד המדריך / קוד הצ׳קפוינט של הפעילות.';

  async function submit(e) {
    e.preventDefault();
    const clean = code.trim();
    if (!clean) return;
    sessionStorage.setItem('aiQuest.staffCode', clean);
    sessionStorage.setItem('aiQuest.staffRole', role);
    try {
      if (role === 'admin') {
        await repo.state();
      } else {
        const events = repo.listActiveEvents ? await repo.listActiveEvents() : [];
        const event = events[0] || await repo.getEventByCode('GAVYAM');
        await repo.listTeams(event.id);
      }
      setError('');
      onSuccess();
    } catch {
      sessionStorage.removeItem('aiQuest.staffCode');
      sessionStorage.removeItem('aiQuest.staffRole');
      setCode('');
      setError('קוד לא תקין או שאין הרשאה למסך הזה.');
    }
  }

  return (
    <section className="access-gate card react-access-gate">
      <h1>{title}</h1>
      <p>המסך הזה מיועד לצוות בלבד. {hint}</p>
      <form className="form-grid" onSubmit={submit}>
        <label>
          <span>קוד גישה</span>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="קוד גישה"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            autoFocus
          />
        </label>
        <button className="primary">כניסה</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}

function LegacyScreen({ route, repo, lang }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !repo) return undefined;
    ref.current.innerHTML = '';
    const Screen = route === 'instructor' ? InstructorApp : route === 'admin' ? AdminApp : StudentApp;
    const instance = new Screen(repo, ref.current, lang);
    instance.render();
    return () => {
      if (ref.current) ref.current.innerHTML = '';
    };
  }, [route, repo, lang]);

  return <div id="screen" ref={ref} />;
}

function App() {
  const [lang, setLang] = useState(getLang);
  const [route, setRoute] = useState(routeFromHash);
  const [repo, setRepo] = useState(null);
  const [bootError, setBootError] = useState(null);
  const [booting, setBooting] = useState(true);
  const [accessVersion, setAccessVersion] = useState(0);

  useEffect(() => {
    setDocumentLanguage(lang);
    localStorage.setItem('aiQuest.language', lang);
  }, [lang]);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    let alive = true;
    setBooting(true);
    createRepository()
      .then((created) => { if (alive) setRepo(created); })
      .catch((err) => { if (alive) setBootError(err); })
      .finally(() => { if (alive) setBooting(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onError = (event) => setBootError(event.error || event.message);
    const onRejection = (event) => setBootError(event.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  const navItems = useMemo(() => {
    if (route === 'student') return [['student', t(lang, 'student')]];
    return [
      ['student', t(lang, 'student')],
      ['instructor', t(lang, 'instructor')],
      ['admin', t(lang, 'admin')]
    ];
  }, [lang, route]);

  function logoutStaff() {
    sessionStorage.removeItem('aiQuest.staffCode');
    sessionStorage.removeItem('aiQuest.staffRole');
    setAccessVersion((v) => v + 1);
  }

  let content;
  if (booting) content = <div id="screen"><LoadingCard /></div>;
  else if (bootError || !repo) content = <div id="screen"><ConnectionError lang={lang} error={bootError} onRetry={() => location.reload()} /></div>;
  else if (route === 'instructor' && !hasStaffAccess('instructor')) {
    content = <div id="screen"><StaffAccessGate key={`instructor-${accessVersion}`} role="instructor" lang={lang} repo={repo} onSuccess={() => setAccessVersion((v) => v + 1)} /></div>;
  } else if (route === 'admin' && !hasStaffAccess('admin')) {
    content = <div id="screen"><StaffAccessGate key={`admin-${accessVersion}`} role="admin" lang={lang} repo={repo} onSuccess={() => setAccessVersion((v) => v + 1)} /></div>;
  } else if (route === 'student') {
    content = <div id="screen"><StudentReactApp repo={repo} lang={lang} onLanguageChange={setLang} /></div>;
  } else if (route === 'instructor') {
    content = <div id="screen"><InstructorReactApp repo={repo} lang={lang} /></div>;
  } else if (route === 'admin') {
    content = <div id="screen"><AdminReactApp repo={repo} lang={lang} /></div>;
  } else {
    content = <LegacyScreen key={`${route}-${accessVersion}`} route={route} repo={repo} lang={lang} />;
  }

  return (
    <main className={`app-shell react-shell route-${route}`}>
      <nav className={`tabs app-tabs route-${route} react-tabs`}>
        {navItems.map(([id, label]) => <a key={id} href={`#${id}`} className={route === id ? 'active' : ''}>{label}</a>)}
        {route === 'student' ? (
          <div className="staff-entry-panel" aria-label="כניסת צוות">
            <span>כניסת צוות</span>
            <a href="#instructor">מדריך</a>
            <a href="#admin">אדמין</a>
          </div>
        ) : null}
        <label className="language-switch">
          <span>{t(lang, 'language')}</span>
          <select id="appLanguage" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="he">{t(lang, 'hebrew')}</option>
            <option value="ar">{t(lang, 'arabic')}</option>
          </select>
        </label>
        {(route === 'instructor' || route === 'admin') ? <button className="ghost staff-logout" onClick={logoutStaff}>יציאה מצוות</button> : null}
      </nav>
      {content}
    </main>
  );
}

createRoot(document.getElementById('app')).render(<App />);
