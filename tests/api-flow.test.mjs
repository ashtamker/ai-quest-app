import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdtemp, rm, readFile, writeFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');
const INSTRUCTOR_CODE = 'test-instructor-code';
const ADMIN_CODE = 'test-admin-code';

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 10_000;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early: ${child.exitCode}`);
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  throw lastError || new Error('server did not become ready');
}

async function startIsolatedServer(extraEnv = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ai-quest-api-test-'));
  for (const entry of ['server.mjs', 'server', 'src', 'assets', 'index.html', 'styles.css', 'package.json']) {
    await cp(path.join(ROOT, entry), path.join(dir, entry), { recursive: true });
  }
  const eventsPath = path.join(dir, 'server/data/events.json');
  const events = JSON.parse(await readFile(eventsPath, 'utf8'));
  const cleanStops = [
    { id: 'cp-food-break', type: 'food_photo', threshold: 4, title: 'עצירת אוכל / טעינה', autoApprove: true, piece: '' },
    { id: 'cp-leumi-funding', type: 'funding_photo', threshold: 7, title: 'מימון מבנק לאומי', autoApprove: true, piece: '', description: 'קיבלתם מימון לחברה שלכם מבנק לאומי. צלמו או העלו לוגו של בנק לאומי כדי להמשיך.' },
    { id: 'cp-instructor-1', type: 'instructor_approval', threshold: 10, title: 'צ׳קפוינט מדריך 1', autoApprove: false, piece: 'חלק 1' },
    { id: 'cp-instructor-2', type: 'instructor_approval', threshold: 17, title: 'צ׳קפוינט מדריך 2', autoApprove: false, piece: 'חלק 2' },
    { id: 'cp-instructor-3', type: 'instructor_approval', threshold: 24, title: 'צ׳קפוינט מדריך 3', autoApprove: false, piece: 'חלק 3' },
  ];
  const sanitizeEvent = (event, code = event.code) => {
    const { pausedAt, finalizedAt, ...clean } = event;
    return { ...clean, code, active: true, gameStatus: 'running', checkpointConfig: { ...(event.checkpointConfig || {}), code: INSTRUCTOR_CODE, instructorCode: INSTRUCTOR_CODE, adminCode: ADMIN_CODE, stops: cleanStops } };
  };
  if (events[0]) events[0] = sanitizeEvent(events[0], 'GAVYAM');
  for (let i = 1; i < events.length; i += 1) events[i] = sanitizeEvent(events[i]);
  await writeFile(eventsPath, `${JSON.stringify(events, null, 2)}\n`, 'utf8');
  for (const runtimeFile of ['teams', 'submissions', 'checkpoint-requests', 'instructor-messages']) {
    await writeFile(path.join(dir, 'server/data', `${runtimeFile}.json`), '[]\n', 'utf8');
  }
  const port = 7100 + Math.floor(Math.random() * 800);
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: dir,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      AI_QUEST_INSTRUCTOR_CODE: INSTRUCTOR_CODE,
      AI_QUEST_ADMIN_CODE: ADMIN_CODE,
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', chunk => { logs += chunk.toString(); });
  child.stderr.on('data', chunk => { logs += chunk.toString(); });
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(baseUrl, child);
  } catch (error) {
    child.kill('SIGTERM');
    throw new Error(`${error.message}\n${logs}`);
  }
  return {
    dir,
    baseUrl,
    url: path => `${baseUrl}${path}`,
    async stop() {
      child.kill('SIGTERM');
      await new Promise(resolve => child.once('exit', resolve));
      await rm(dir, { recursive: true, force: true });
    },
  };
}

async function json(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => null);
  return { res, body };
}

function tinyPngBlob() {
  const bytes = Uint8Array.from(Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082', 'hex'));
  return new Blob([bytes], { type: 'image/png' });
}

test('AI Quest public assets and prefixed Opal paths are served', async () => {
  const server = await startIsolatedServer();
  try {
    const index = await fetch(server.url('/apps/eduapp/ai-quest/'));
    assert.equal(index.status, 200);
    const html = await index.text();
    assert.match(html, /AI Quest/);

    const mainJs = await fetch(server.url('/apps/eduapp/ai-quest/src/app/main.js'));
    assert.equal(mainJs.status, 200);
    assert.match(await mainJs.text(), /language-switch/);

    const css = await fetch(server.url('/apps/eduapp/ai-quest/styles.css'));
    assert.equal(css.status, 200);
    assert.match(await css.text(), /language-switch/);

    const health = await json(server.url('/apps/eduapp/ai-quest/api/health'));
    assert.equal(health.res.status, 200);
    assert.equal(health.body.ok, true);

    const stateWithoutAdmin = await json(server.url('/apps/eduapp/ai-quest/api/state'));
    assert.equal(stateWithoutAdmin.res.status, 401);

    const state = await json(server.url('/apps/eduapp/ai-quest/api/state'), { headers: { 'x-ai-quest-code': ADMIN_CODE } });
    assert.equal(state.res.status, 200);
    assert.ok(state.body.events.length >= 1);
    assert.ok(state.body.companies.length >= 10);
    assert.ok(state.body.questions.length >= 10);
    const logoCompanies = state.body.companies.filter(c => c.logoUrl);
    assert.equal(logoCompanies.length, state.body.companies.length);
    const logoPath = logoCompanies[0].logoUrl.replace(/^\./, '');
    const logo = await fetch(server.url(`/apps/eduapp/ai-quest${logoPath}`));
    assert.equal(logo.status, 200);
    assert.match(logo.headers.get('content-type') || '', /image\//);
  } finally {
    await server.stop();
  }
});

test('student journey supports Arabic team, company completion, photo review, checkpoint approval, and reset', async () => {
  const server = await startIsolatedServer();
  try {
    const byCode = await json(server.url('/api/events/by-code/%20GAV%20YAM%20'));
    assert.equal(byCode.res.status, 200);
    assert.equal(byCode.body.code, 'GAVYAM');

    const created = await json(server.url('/api/teams/session'), {
      method: 'POST',
      body: JSON.stringify({ eventCode: ' GAV YAM ', teamAccessId: 'purple', password: 'P1476', participantName: 'لاعب اختبار', language: 'ar', activityDuration: 60, participantsCount: 3 }),
    });
    assert.equal(created.res.status, 201);
    assert.equal(created.body.language, 'ar');
    assert.equal(created.body.score, 0);
    const teamId = created.body.id;

    const cfg = await json(server.url(`/api/events/${created.body.eventId}/config`));
    assert.equal(cfg.res.status, 200);
    assert.ok(cfg.body.companies.some(c => c.nameAr));
    assert.ok(cfg.body.questions.some(q => q.textAr && Array.isArray(q.optionsAr)));
    const companies = cfg.body.companies.slice(0, 4);
    const company = companies[0];

    const teamPatch = {
      ...created.body,
      completedCompanies: [company.id],
      collectedAbilities: company.abilityIds || [],
      score: 20,
    };
    const patched = await json(server.url(`/api/teams/${teamId}`), { method: 'PATCH', body: JSON.stringify(teamPatch) });
    assert.equal(patched.res.status, 200);
    assert.deepEqual(patched.body.completedCompanies, [company.id]);

    const upload = new FormData();
    upload.append('teamId', teamId);
    upload.append('companyId', company.id);
    upload.append('answers', JSON.stringify({ smoke: 'ok' }));
    upload.append('awardedPoints', '7');
    upload.append('status', 'completed');
    upload.append('photo', tinyPngBlob(), 'logo.png');
    const submitted = await json(server.url('/api/submissions/logo-photo'), { method: 'POST', body: upload });
    assert.equal(submitted.res.status, 201);
    assert.equal(submitted.body.instructorReviewStatus, 'pending');
    assert.match(submitted.body.photoUrl, /^api\/uploads\/logos\//);

    const photo = await fetch(server.url(`/api/uploads/logos/${submitted.body.photoUrl.split('/').pop()}`));
    assert.equal(photo.status, 200);
    assert.equal(photo.headers.get('content-type'), 'image/png');

    const noStaff = await json(server.url('/api/submissions'));
    assert.equal(noStaff.res.status, 401);
    assert.equal(noStaff.body.error, 'staff_code_required');

    const submissions = await json(server.url('/api/submissions'), { headers: { 'x-ai-quest-code': INSTRUCTOR_CODE } });
    assert.equal(submissions.res.status, 200);
    assert.ok(submissions.body.some(s => s.id === submitted.body.id));

    const invalid = await json(server.url(`/api/submissions/${submitted.body.id}/review`), {
      method: 'PATCH',
      headers: { 'x-ai-quest-code': INSTRUCTOR_CODE },
      body: JSON.stringify({ status: 'invalid' }),
    });
    assert.equal(invalid.res.status, 200);
    assert.equal(invalid.body.instructorReviewStatus, 'invalid');

    const afterInvalid = await json(server.url(`/api/teams/${teamId}`));
    assert.equal(afterInvalid.res.status, 200);
    assert.ok(afterInvalid.body.needsPhotoFixCompanies.includes(company.id));
    assert.ok(afterInvalid.body.completedCompanies.includes(company.id), 'invalid logo photo should remove only the logo bonus, not block company completion');

    const checkpointReady = {
      ...afterInvalid.body,
      completedCompanies: companies.map(c => c.id),
      collectedAbilities: [...new Set(companies.flatMap(c => c.abilityIds || []))],
      score: 50,
    };
    await json(server.url(`/api/teams/${teamId}`), { method: 'PATCH', body: JSON.stringify(checkpointReady) });
    const requested = await json(server.url(`/api/teams/${teamId}/checkpoint-request`), {
      method: 'POST',
      body: JSON.stringify({ checkpoint: { id: 'cp-food', type: 'food_photo', title: 'استراحة', description: 'صورة طعام', threshold: 4, piece: 'استراحة' } }),
    });
    assert.equal(requested.res.status, 200);
    assert.equal(requested.body.checkpointStatus, 'requested');
    assert.equal(requested.body.checkpoints.at(-1).piece, 'استراحة');

    const rejectNoStaff = await json(server.url(`/api/teams/${teamId}/checkpoint-review`), { method: 'POST', body: JSON.stringify({ approved: true }) });
    assert.equal(rejectNoStaff.res.status, 401);

    const approved = await json(server.url(`/api/teams/${teamId}/checkpoint-review`), {
      method: 'POST',
      headers: { 'x-ai-quest-code': INSTRUCTOR_CODE },
      body: JSON.stringify({ approved: true, note: 'approved in test' }),
    });
    assert.equal(approved.res.status, 200);
    assert.equal(approved.body.checkpointStatus, 'approved');
    assert.ok(approved.body.puzzlePieces.includes('استراحة'));
    assert.equal(approved.body.currentStage, 2);

    const resetNoStaff = await json(server.url(`/api/teams/${teamId}/reset`), { method: 'POST', body: '{}' });
    assert.equal(resetNoStaff.res.status, 401);

    const reset = await json(server.url(`/api/teams/${teamId}/reset`), { method: 'POST', headers: { 'x-ai-quest-code': INSTRUCTOR_CODE }, body: '{}' });
    assert.equal(reset.res.status, 200);
    assert.equal(reset.body.score, 0);
    assert.deepEqual(reset.body.completedCompanies, []);
    assert.deepEqual(reset.body.puzzlePieces, []);
  } finally {
    await server.stop();
  }
});

test('admin writes require admin code and persist question changes in isolated JSON data', async () => {
  const server = await startIsolatedServer();
  try {
    const blockedState = await json(server.url('/api/state'));
    assert.equal(blockedState.res.status, 401);

    const cfg = await json(server.url('/api/state'), { headers: { 'x-ai-quest-code': ADMIN_CODE } });
    assert.equal(cfg.res.status, 200);
    const companyId = cfg.body.companies[0].id;
    const question = {
      companyId,
      type: 'short',
      textHe: 'שאלת בדיקה?',
      textAr: 'سؤال اختبار؟',
      optionsHe: [],
      optionsAr: [],
      correctText: 'בדיקה',
      acceptedKeywords: ['בדיקה', 'اختبار'],
      explanationHe: 'הסבר בדיקה',
      explanationAr: 'شرح اختبار',
      points: 11,
      active: true,
    };

    const noAdmin = await json(server.url('/api/admin/questions'), { method: 'POST', body: JSON.stringify(question) });
    assert.equal(noAdmin.res.status, 401);
    assert.equal(noAdmin.body.role, 'admin');

    const saved = await json(server.url('/api/admin/questions'), {
      method: 'POST',
      headers: { 'x-ai-quest-code': ADMIN_CODE },
      body: JSON.stringify(question),
    });
    assert.equal(saved.res.status, 200);
    assert.ok(saved.body.id);
    assert.equal(saved.body.points, 11);

    const data = JSON.parse(await readFile(path.join(server.dir, 'server/data/questions.json'), 'utf8'));
    assert.ok(data.some(q => q.id === saved.body.id && q.textAr === 'سؤال اختبار؟'));
  } finally {
    await server.stop();
  }
});


test('event join failures and missing upload validation return useful errors', async () => {
  const server = await startIsolatedServer();
  try {
    const missingEvent = await json(server.url('/api/events/by-code/NOPE'));
    assert.equal(missingEvent.res.status, 404);

    const badJoin = await json(server.url('/api/teams/session'), {
      method: 'POST',
      body: JSON.stringify({ eventCode: 'NOPE', name: 'Bad Team' }),
    });
    assert.equal(badJoin.res.status, 404);
    assert.equal(badJoin.body.error, 'event_not_found');

    const noPhoto = new FormData();
    noPhoto.append('teamId', 'missing');
    noPhoto.append('companyId', 'missing');
    const upload = await json(server.url('/api/submissions/logo-photo'), { method: 'POST', body: noPhoto });
    assert.equal(upload.res.status, 400);
    assert.equal(upload.body.error, 'missing_photo');
  } finally {
    await server.stop();
  }
});

test('fixed event teams require passwords and reuse the same shared team session', async () => {
  const server = await startIsolatedServer();
  try {
    const activeEvents = await json(server.url('/api/events/active'));
    assert.equal(activeEvents.res.status, 200);
    assert.ok(activeEvents.body.some(e => e.code === 'GAVYAM'));
    assert.ok(activeEvents.body.every(e => !e.teamAccess?.some?.(t => 'password' in t)), 'active events dropdown must not expose team passwords');
    const event = await json(server.url('/api/events/by-code/GAVYAM'));
    assert.equal(event.res.status, 200);
    assert.ok(event.body.teamAccess.some(t => t.id === 'red'));
    assert.ok(!('password' in event.body.teamAccess[0]), 'public team list must not expose passwords');
    const publicAccess = await json(server.url(`/api/events/${event.body.id}/team-access`));
    assert.ok(!('password' in publicAccess.body[0]), 'student team-access must not expose passwords');
    const staffAccess = await json(server.url(`/api/events/${event.body.id}/team-access-staff`), { headers: { 'x-ai-quest-code': INSTRUCTOR_CODE } });
    assert.equal(staffAccess.res.status, 200);
    assert.equal(staffAccess.body.find(t => t.id === 'red').password, 'R4821');

    const denied = await json(server.url('/api/teams/session'), {
      method: 'POST',
      body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'red', password: 'wrong', participantName: 'Wrong Red', language: 'he', activityDuration: 90, participantsCount: 5 }),
    });
    assert.equal(denied.res.status, 401);

    const noTeam = await json(server.url('/api/teams/session'), {
      method: 'POST',
      body: JSON.stringify({ eventCode: 'GAVYAM', name: 'Free Team Should Not Exist', participantName: 'Free Player' }),
    });
    assert.equal(noTeam.res.status, 400);
    assert.equal(noTeam.body.error, 'team_required');

    const first = await json(server.url('/api/teams/session'), {
      method: 'POST',
      body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'red', password: 'R4821', participantName: 'נועה', language: 'he', activityDuration: 90, participantsCount: 5 }),
    });
    assert.equal(first.res.status, 201);
    assert.equal(first.body.name, 'צוות אדום');

    const second = await json(server.url('/api/teams/session'), {
      method: 'POST',
      body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'red', password: 'R4821', participantName: 'אדם', language: 'he', activityDuration: 90, participantsCount: 5 }),
    });
    assert.equal(second.res.status, 200);
    assert.equal(second.body.id, first.body.id, 'same color team should share one server-side team record');
    assert.deepEqual(second.body.participants.map(p => p.name).sort(), ['אדם', 'נועה'].sort());
    const teams = await json(server.url(`/api/events/${event.body.id}/teams`), { headers: { 'x-ai-quest-code': INSTRUCTOR_CODE } });
    assert.equal(teams.body.filter(t => t.teamAccessId === 'red').length, 1);
    assert.ok(teams.body.find(t => t.teamAccessId === 'red').participants.some(p => p.name === 'נועה'));
    assert.ok(!teams.body.some(t => !t.name || !t.teamAccessId));
  } finally {
    await server.stop();
  }
});



test('admin can configure more than six fixed teams for an event', async () => {
  const server = await startIsolatedServer();
  try {
    const state = await json(server.url('/api/state'), { headers: { 'x-ai-quest-code': ADMIN_CODE } });
    const base = state.body.events[0];
    const teamAccess = Array.from({ length: 8 }, (_, i) => ({ id: `team${i + 1}`, name: `צוות ${i + 1}`, password: `P${i + 1}234!` }));
    const saved = await json(server.url('/api/admin/events'), {
      method: 'POST',
      headers: { 'x-ai-quest-code': ADMIN_CODE },
      body: JSON.stringify({ ...base, id: undefined, code: 'EIGHT', active: true, teamAccess }),
    });
    assert.equal(saved.res.status, 200);
    assert.equal(saved.body.teamAccess.length, 8);
    assert.equal(saved.body.teamAccess[7].id, 'team8');

    const publicAccess = await json(server.url(`/api/events/${saved.body.id}/team-access`));
    assert.equal(publicAccess.body.length, 8);
    assert.ok(!('password' in publicAccess.body[7]));

    const join = await json(server.url('/api/teams/session'), {
      method: 'POST',
      body: JSON.stringify({ eventCode: 'EIGHT', teamAccessId: 'team8', password: 'P8234!', participantName: 'Team Eight' }),
    });
    assert.equal(join.res.status, 201);
    assert.equal(join.body.teamAccessId, 'team8');
    assert.equal(join.body.name, 'צוות 8');
  } finally {
    await server.stop();
  }
});

test('instructor can pause a game, blocking company completion while GAVYAM still resolves', async () => {
  const server = await startIsolatedServer();
  try {
    const event = await json(server.url('/api/events/by-code/GAVYAM'));
    assert.equal(event.res.status, 200);
    const join = await json(server.url('/api/teams/session'), {
      method: 'POST',
      body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'blue', password: 'B5168', participantName: 'Blue Player', language: 'he', activityDuration: 90, participantsCount: 5 }),
    });
    assert.equal(join.res.status, 201);

    const paused = await json(server.url(`/api/events/${event.body.id}/pause`), {
      method: 'POST',
      headers: { 'x-ai-quest-code': INSTRUCTOR_CODE },
      body: JSON.stringify({ paused: true }),
    });
    assert.equal(paused.res.status, 200);
    assert.equal(paused.body.paused, true);

    const stillFound = await json(server.url('/api/events/by-code/GAVYAM'));
    assert.equal(stillFound.res.status, 200);
    assert.equal(stillFound.body.gameStatus, 'paused');

    const config = await json(server.url(`/api/events/${event.body.id}/config`));
    const company = config.body.companies[0];
    const blocked = await json(server.url(`/api/teams/${join.body.id}/complete-company`), {
      method: 'POST',
      body: JSON.stringify({ companyId: company.id, answers: {} }),
    });
    assert.equal(blocked.res.status, 423);
    assert.equal(blocked.body.error, 'game_paused');

    const resumed = await json(server.url(`/api/events/${event.body.id}/pause`), {
      method: 'POST',
      headers: { 'x-ai-quest-code': INSTRUCTOR_CODE },
      body: JSON.stringify({ paused: false }),
    });
    assert.equal(resumed.res.status, 200);
    const allowed = await json(server.url(`/api/teams/${join.body.id}/complete-company`), {
      method: 'POST',
      body: JSON.stringify({ companyId: company.id, answers: {} }),
    });
    assert.equal(allowed.res.status, 200);
  } finally {
    await server.stop();
  }
});

test('instructor can delete submitted logo photos without changing completed company progress', async () => {
  const server = await startIsolatedServer();
  try {
    const event = await json(server.url('/api/events/by-code/GAVYAM'));
    const join = await json(server.url('/api/teams/session'), { method: 'POST', body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'green', password: 'G2947', participantName: 'Green Player', language: 'he', activityDuration: 90, participantsCount: 5 }) });
    const config = await json(server.url(`/api/events/${event.body.id}/config`));
    const company = config.body.companies[0];
    const fd = new FormData();
    fd.append('payload', JSON.stringify({ companyId: company.id, answers: {} }));
    fd.append('photo', new Blob(['logo'], { type: 'image/png' }), 'logo.png');
    const completed = await json(server.url(`/api/teams/${join.body.id}/complete-company`), { method: 'POST', body: fd });
    assert.equal(completed.res.status, 200);
    const subId = completed.body.submission.id;

    const removed = await json(server.url(`/api/submissions/${subId}`), { method: 'DELETE', headers: { 'x-ai-quest-code': INSTRUCTOR_CODE } });
    assert.equal(removed.res.status, 200);
    const subs = await json(server.url('/api/submissions'), { headers: { 'x-ai-quest-code': INSTRUCTOR_CODE } });
    assert.ok(!subs.body.some(s => s.id === subId));
    const team = await json(server.url(`/api/teams/${join.body.id}`));
    assert.ok(team.body.completedCompanies.includes(company.id));
  } finally {
    await server.stop();
  }
});

test('student AI helper answers from company data and awards one-time bonus', async () => {
  const server = await startIsolatedServer();
  try {
    const join = await json(server.url('/api/teams/session'), { method: 'POST', body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'yellow', password: 'Y8635', participantName: 'Yellow Player', language: 'he', activityDuration: 90, participantsCount: 5 }) });
    const first = await json(server.url(`/api/teams/${join.body.id}/ai-helper`), { method: 'POST', body: JSON.stringify({ question: 'איך Microsoft קשורה ל AI?' }) });
    assert.equal(first.res.status, 200);
    assert.equal(first.body.awarded, 3);
    assert.match(first.body.answer, /Microsoft|AI|חברה/);
    const second = await json(server.url(`/api/teams/${join.body.id}/ai-helper`), { method: 'POST', body: JSON.stringify({ question: 'מה עושים בצקפוינט?' }) });
    assert.equal(second.res.status, 200);
    assert.equal(second.body.awarded, 0);
  } finally {
    await server.stop();
  }
});

test('instructor actions send messages, bonuses, group messages, and reset runtime with staff protection', async () => {
  const server = await startIsolatedServer();
  try {
    const event = await json(server.url('/api/events/by-code/GAVYAM'));
    const teamA = await json(server.url('/api/teams/session'), { method: 'POST', body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'red', password: 'R4821', participantName: 'Team A Player', language: 'he', activityDuration: 90, participantsCount: 4 }) });
    const teamB = await json(server.url('/api/teams/session'), { method: 'POST', body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'blue', password: 'B5168', participantName: 'Team B Player', language: 'ar', activityDuration: 90, participantsCount: 4 }) });

    const noMessage = await json(server.url(`/api/teams/${teamA.body.id}/message`), { method: 'POST', body: JSON.stringify({ text: 'hello' }) });
    assert.equal(noMessage.res.status, 401);

    const message = await json(server.url(`/api/teams/${teamA.body.id}/message`), {
      method: 'POST',
      headers: { 'x-ai-quest-code': INSTRUCTOR_CODE },
      body: JSON.stringify({ text: 'חזרו למדריך' }),
    });
    assert.equal(message.res.status, 200);
    assert.ok(message.body.messages.some(m => m.text === 'חזרו למדריך'));

    const bonus = await json(server.url(`/api/teams/${teamA.body.id}/bonus`), {
      method: 'POST',
      headers: { 'x-ai-quest-code': INSTRUCTOR_CODE },
      body: JSON.stringify({ points: 7, note: 'בונוס בדיקה' }),
    });
    assert.equal(bonus.res.status, 200);
    assert.equal(bonus.body.score, 7);

    const noGroup = await json(server.url(`/api/events/${event.body.id}/message`), { method: 'POST', body: JSON.stringify({ text: 'group' }) });
    assert.equal(noGroup.res.status, 401);

    const group = await json(server.url(`/api/events/${event.body.id}/message`), {
      method: 'POST',
      headers: { 'x-ai-quest-code': INSTRUCTOR_CODE },
      body: JSON.stringify({ text: 'הודעה לכולם' }),
    });
    assert.equal(group.res.status, 200);
    assert.ok(group.body.count >= 2);

    const afterGroupA = await json(server.url(`/api/teams/${teamA.body.id}`));
    const afterGroupB = await json(server.url(`/api/teams/${teamB.body.id}`));
    assert.ok(afterGroupA.body.messages.some(m => m.text === 'הודעה לכולם'));
    assert.ok(afterGroupB.body.messages.some(m => m.text === 'הודעה לכולם'));

    const noResetRuntime = await json(server.url('/api/admin/reset-runtime'), { method: 'POST', body: '{}' });
    assert.equal(noResetRuntime.res.status, 401);

    const resetRuntime = await json(server.url('/api/admin/reset-runtime'), { method: 'POST', headers: { 'x-ai-quest-code': ADMIN_CODE }, body: '{}' });
    assert.equal(resetRuntime.res.status, 200);
    assert.equal(resetRuntime.body.ok, true);
    const state = await json(server.url('/api/state'), { headers: { 'x-ai-quest-code': ADMIN_CODE } });
    assert.equal(state.body.teams.length, 0);
    assert.equal(state.body.submissions.length, 0);
  } finally {
    await server.stop();
  }
});

test('admin can manage events, duplicate them, and export results while instructor cannot', async () => {
  const server = await startIsolatedServer();
  try {
    const state = await json(server.url('/api/state'), { headers: { 'x-ai-quest-code': ADMIN_CODE } });
    const event = { ...state.body.events[0], code: 'PILOT50', name: 'AI Quest Pilot 50', availableDurations: [90, 135], activeCompanyIds: state.body.companies.slice(0, 12).map(c => c.id), checkpointConfig: { code: INSTRUCTOR_CODE, instructorCode: INSTRUCTOR_CODE, adminCode: ADMIN_CODE } };

    const instructorWrite = await json(server.url('/api/admin/events'), { method: 'POST', headers: { 'x-ai-quest-code': INSTRUCTOR_CODE }, body: JSON.stringify(event) });
    assert.equal(instructorWrite.res.status, 401);

    const saved = await json(server.url('/api/admin/events'), { method: 'POST', headers: { 'x-ai-quest-code': ADMIN_CODE }, body: JSON.stringify(event) });
    assert.equal(saved.res.status, 200);
    assert.equal(saved.body.code, 'PILOT50');
    assert.equal(saved.body.activeCompanyIds.length, 12);

    const puzzleNoStaffFd = new FormData();
    puzzleNoStaffFd.append('pieceCount', '9');
    puzzleNoStaffFd.append('image', new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], { type: 'image/svg+xml' }), 'puzzle.svg');
    const puzzleNoStaff = await fetch(server.url(`/api/admin/events/${event.id}/puzzle-image`), { method: 'POST', body: puzzleNoStaffFd });
    assert.equal(puzzleNoStaff.status, 401);
    const puzzleFd = new FormData();
    puzzleFd.append('pieceCount', '9');
    puzzleFd.append('image', new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20"/></svg>'], { type: 'image/svg+xml' }), 'puzzle.svg');
    const puzzleUpload = await fetch(server.url(`/api/admin/events/${event.id}/puzzle-image`), { method: 'POST', headers: { 'x-ai-quest-code': ADMIN_CODE }, body: puzzleFd });
    assert.equal(puzzleUpload.status, 200);
    const puzzleEvent = await puzzleUpload.json();
    assert.equal(puzzleEvent.puzzleConfig.pieceCount, 9);
    assert.match(puzzleEvent.puzzleConfig.imageUrl, /api\/uploads\/puzzles\//);
    const puzzleAsset = await fetch(server.url(`/${puzzleEvent.puzzleConfig.imageUrl}`));
    assert.equal(puzzleAsset.status, 200);
    assert.match(puzzleAsset.headers.get('content-type') || '', /svg/);

    const byCode = await json(server.url('/api/events/by-code/PILOT50'));
    assert.equal(byCode.res.status, 200);
    assert.equal(byCode.body.id, event.id);

    const duplicate = await json(server.url(`/api/admin/events/${event.id}/duplicate`), { method: 'POST', headers: { 'x-ai-quest-code': ADMIN_CODE }, body: JSON.stringify({ code: 'PILOT50B', active: false }) });
    assert.equal(duplicate.res.status, 201);
    assert.equal(duplicate.body.code, 'PILOT50B');
    assert.equal(duplicate.body.active, false);

    await json(server.url('/api/teams/session'), { method: 'POST', body: JSON.stringify({ eventCode: 'PILOT50', teamAccessId: 'red', password: 'R4821', participantName: 'Export Player', language: 'he', participantsCount: 6, activityDuration: 90 }) });
    const noFinalize = await json(server.url(`/api/events/${event.id}/finalize`), { method: 'POST', body: '{}' });
    assert.equal(noFinalize.res.status, 401);
    const finalized = await json(server.url(`/api/events/${event.id}/finalize`), { method: 'POST', headers: { 'x-ai-quest-code': INSTRUCTOR_CODE }, body: '{}' });
    assert.equal(finalized.res.status, 200);
    assert.equal(finalized.body.ok, true);
    const finalizedConfig = await json(server.url(`/api/events/${event.id}/config`));
    assert.ok(finalizedConfig.body.event.finalizedAt);
    const results = await json(server.url(`/api/admin/events/${event.id}/results`), { headers: { 'x-ai-quest-code': ADMIN_CODE } });
    assert.equal(results.res.status, 200);
    assert.equal(results.body.totals.teams, 1);
    assert.equal(results.body.totals.students, 6);

    const csv = await fetch(server.url(`/api/admin/events/${event.id}/results?format=csv`), { headers: { 'x-ai-quest-code': ADMIN_CODE } });
    assert.equal(csv.status, 200);
    assert.match(await csv.text(), /teamName/);
  } finally {
    await server.stop();
  }
});

test('admin can update companies and model problems while instructor code cannot', async () => {
  const server = await startIsolatedServer();
  try {
    const state = await json(server.url('/api/state'), { headers: { 'x-ai-quest-code': ADMIN_CODE } });
    const company = { ...state.body.companies[0], nameHe: 'חברת בדיקה', nameAr: 'شركة اختبار' };
    const instructorCompanyWrite = await json(server.url('/api/admin/companies'), {
      method: 'POST',
      headers: { 'x-ai-quest-code': INSTRUCTOR_CODE },
      body: JSON.stringify(company),
    });
    assert.equal(instructorCompanyWrite.res.status, 401);

    const savedCompany = await json(server.url('/api/admin/companies'), {
      method: 'POST',
      headers: { 'x-ai-quest-code': ADMIN_CODE },
      body: JSON.stringify(company),
    });
    assert.equal(savedCompany.res.status, 200);
    assert.equal(savedCompany.body.nameAr, 'شركة اختبار');

    const problem = { ...state.body.modelProblems[0], titleHe: 'בעיית בדיקה', titleAr: 'مشكلة اختبار' };
    const savedProblem = await json(server.url('/api/admin/model-problems'), {
      method: 'POST',
      headers: { 'x-ai-quest-code': ADMIN_CODE },
      body: JSON.stringify(problem),
    });
    assert.equal(savedProblem.res.status, 200);
    assert.equal(savedProblem.body.titleAr, 'مشكلة اختبار');
  } finally {
    await server.stop();
  }
});


test('checkpoint review rejects missing pending request and supports explicit rejection flow', async () => {
  const server = await startIsolatedServer();
  try {
    const created = await json(server.url('/api/teams/session'), {
      method: 'POST',
      body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'red', password: 'R4821', participantName: 'Checkpoint Edge', language: 'he' }),
    });
    const teamId = created.body.id;

    const noPending = await json(server.url(`/api/teams/${teamId}/checkpoint-review`), {
      method: 'POST',
      headers: { 'x-ai-quest-code': INSTRUCTOR_CODE },
      body: JSON.stringify({ approved: true }),
    });
    assert.equal(noPending.res.status, 400);
    assert.equal(noPending.body.error, 'checkpoint_not_requested');

    const requested = await json(server.url(`/api/teams/${teamId}/checkpoint-request`), {
      method: 'POST',
      body: JSON.stringify({ checkpoint: { id: 'cp-edge', title: 'בדיקת ביניים', piece: 'חלק בדיקה' } }),
    });
    assert.equal(requested.res.status, 200);
    assert.equal(requested.body.checkpointStatus, 'requested');

    const rejected = await json(server.url(`/api/teams/${teamId}/checkpoint-review`), {
      method: 'POST',
      headers: { 'x-ai-quest-code': INSTRUCTOR_CODE },
      body: JSON.stringify({ approved: false, note: 'צריך צילום ברור יותר' }),
    });
    assert.equal(rejected.res.status, 200);
    assert.equal(rejected.body.checkpointStatus, 'rejected');
    assert.equal(rejected.body.currentStage, 1);
    assert.deepEqual(rejected.body.puzzlePieces, []);
    assert.ok(rejected.body.messages.some(m => m.text === 'צריך צילום ברור יותר'));

    const state = await json(server.url('/api/state'), { headers: { 'x-ai-quest-code': ADMIN_CODE } });
    const request = state.body.checkpointRequests.find(r => r.teamId === teamId);
    assert.equal(request.status, 'rejected');
    assert.equal(request.note, 'צריך צילום ברור יותר');
  } finally {
    await server.stop();
  }
});

test('checkpoint multipart upload sanitizes filenames and exposes uploaded photo safely', async () => {
  const server = await startIsolatedServer();
  try {
    const created = await json(server.url('/api/teams/session'), { method: 'POST', body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'red', password: 'R4821', participantName: 'Multipart CP' }) });
    const body = new FormData();
    body.append('checkpoint', JSON.stringify({ id: 'cp-photo', type: 'food_photo', title: 'תמונה', piece: 'צילום' }));
    body.append('photo', tinyPngBlob(), '../../evil checkpoint.png');
    const requested = await json(server.url(`/api/teams/${created.body.id}/checkpoint-request`), { method: 'POST', body });
    assert.equal(requested.res.status, 200);
    const cp = requested.body.checkpoints.at(-1);
    assert.match(cp.photoUrl, /^api\/uploads\/logos\/checkpoint-/);
    assert.doesNotMatch(cp.photoUrl, /\.\./);
    assert.match(cp.photoUrl, /evil_checkpoint\.png$/);

    const photo = await fetch(server.url(`/${cp.photoUrl}`));
    assert.equal(photo.status, 200);
    assert.equal(photo.headers.get('content-type'), 'image/png');
  } finally {
    await server.stop();
  }
});

test('static file server blocks traversal and unknown upload files', async () => {
  const server = await startIsolatedServer();
  try {
    const traversalStatic = await fetch(server.url('/%2e%2e/server.mjs'));
    assert.equal(traversalStatic.status, 404);

    const traversalUpload = await fetch(server.url('/api/uploads/logos/%2e%2e/%2e%2e/data/events.json'));
    assert.equal(traversalUpload.status, 404);

    const missingUpload = await fetch(server.url('/api/uploads/logos/not-real.png'));
    assert.equal(missingUpload.status, 404);
  } finally {
    await server.stop();
  }
});

test('team reset removes only that team runtime records and keeps other teams intact', async () => {
  const server = await startIsolatedServer();
  try {
    const a = await json(server.url('/api/teams/session'), { method: 'POST', body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'red', password: 'R4821', participantName: 'Reset A' }) });
    const b = await json(server.url('/api/teams/session'), { method: 'POST', body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'blue', password: 'B5168', participantName: 'Reset B' }) });
    const cfg = await json(server.url(`/api/events/${a.body.eventId}/config`));
    const company = cfg.body.companies[0];

    for (const team of [a.body, b.body]) {
      const upload = new FormData();
      upload.append('teamId', team.id);
      upload.append('companyId', company.id);
      upload.append('photo', tinyPngBlob(), `${team.id}.png`);
      await json(server.url('/api/submissions/logo-photo'), { method: 'POST', body: upload });
      await json(server.url(`/api/teams/${team.id}/checkpoint-request`), { method: 'POST', body: JSON.stringify({ checkpoint: { id: `cp-${team.id}`, piece: team.name } }) });
    }

    const reset = await json(server.url(`/api/teams/${a.body.id}/reset`), { method: 'POST', headers: { 'x-ai-quest-code': INSTRUCTOR_CODE }, body: '{}' });
    assert.equal(reset.res.status, 200);
    assert.equal(reset.body.id, a.body.id);

    const state = await json(server.url('/api/state'), { headers: { 'x-ai-quest-code': ADMIN_CODE } });
    assert.ok(!state.body.submissions.some(s => s.teamId === a.body.id));
    assert.ok(state.body.submissions.some(s => s.teamId === b.body.id));
    assert.ok(!state.body.checkpointRequests.some(r => r.teamId === a.body.id));
    assert.ok(state.body.checkpointRequests.some(r => r.teamId === b.body.id));
  } finally {
    await server.stop();
  }
});

test('targeted instructor group messages reach only selected teams', async () => {
  const server = await startIsolatedServer();
  try {
    const event = await json(server.url('/api/events/by-code/GAVYAM'));
    const a = await json(server.url('/api/teams/session'), { method: 'POST', body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'red', password: 'R4821', participantName: 'Target A' }) });
    const b = await json(server.url('/api/teams/session'), { method: 'POST', body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'blue', password: 'B5168', participantName: 'Target B' }) });
    const c = await json(server.url('/api/teams/session'), { method: 'POST', body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'green', password: 'G2947', participantName: 'Target C' }) });

    const msg = await json(server.url(`/api/events/${event.body.id}/message`), {
      method: 'POST',
      headers: { 'x-ai-quest-code': INSTRUCTOR_CODE },
      body: JSON.stringify({ text: 'רק א וב', teamIds: [a.body.id, b.body.id] }),
    });
    assert.equal(msg.res.status, 200);
    assert.equal(msg.body.count, 2);

    const teams = await Promise.all([a, b, c].map(t => json(server.url(`/api/teams/${t.body.id}`))));
    assert.ok(teams[0].body.messages.some(m => m.text === 'רק א וב' && m.scope === 'group'));
    assert.ok(teams[1].body.messages.some(m => m.text === 'רק א וב' && m.scope === 'group'));
    assert.ok(!teams[2].body.messages.some(m => m.text === 'רק א וב'));
  } finally {
    await server.stop();
  }
});

test('server handles multiple team joins concurrently without id collisions', async () => {
  const server = await startIsolatedServer();
  try {
    const joins = await Promise.all(Array.from({ length: 12 }, (_, i) => json(server.url('/api/teams/session'), {
      method: 'POST',
      body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: ['red','white','blue','green','yellow','purple'][i%6], password: ['R4821','W7394','B5168','G2947','Y8635','P1476'][i%6], participantName: `Concurrent ${i}`, participantsCount: i + 1 }),
    })));
    assert.ok(joins.every(j => [200, 201].includes(j.res.status)));
    const ids = joins.map(j => j.body.id);
    assert.equal(new Set(ids).size, 6);
    const state = await json(server.url('/api/state'), { headers: { 'x-ai-quest-code': ADMIN_CODE } });
    assert.equal(state.body.teams.length, 6);
    assert.ok(state.body.teams.every(t => t.teamAccessId && t.name));
    assert.equal(state.body.teams.reduce((sum,t)=>sum+(t.participants||[]).length,0), 12);
  } finally {
    await server.stop();
  }
});



test('admin can delete inactive events and associated runtime data/files', async () => {
  const server = await startIsolatedServer();
  try {
    const state = await json(server.url('/api/state'), { headers: { 'x-ai-quest-code': ADMIN_CODE } });
    const activeEvent = state.body.events[0];
    const activeDelete = await json(server.url(`/api/admin/events/${activeEvent.id}/delete`), { method: 'POST', headers: { 'x-ai-quest-code': ADMIN_CODE }, body: '{}' });
    assert.equal(activeDelete.res.status, 400);
    assert.equal(activeDelete.body.error, 'cannot_delete_active_event');

    const duplicate = await json(server.url(`/api/admin/events/${activeEvent.id}/duplicate`), {
      method: 'POST',
      headers: { 'x-ai-quest-code': ADMIN_CODE },
      body: JSON.stringify({ code: 'DELETE_ME', active: true }),
    });
    assert.equal(duplicate.res.status, 201);

    const join = await json(server.url('/api/teams/session'), {
      method: 'POST',
      body: JSON.stringify({ eventCode: 'DELETE_ME', teamAccessId: 'red', password: 'R4821', participantName: 'Delete Test', language: 'he', activityDuration: 90, participantsCount: 1 }),
    });
    assert.equal(join.res.status, 201);

    const fd = new FormData();
    fd.append('payload', JSON.stringify({ companyId: 'microsoft', answers: {} }));
    fd.append('photo', new Blob(['fake-logo'], { type: 'image/png' }), 'delete-logo.png');
    const completed = await fetch(server.url(`/api/teams/${join.body.id}/complete-company`), { method: 'POST', body: fd });
    assert.equal(completed.status, 200);
    const completedBody = await completed.json();
    const photoUrl = completedBody.submission.photoUrl;
    const photoFile = path.join(server.dir, 'server', photoUrl.replace(/^api\//, ''));
    await stat(photoFile);

    const deactivated = await json(server.url('/api/admin/events'), { method: 'POST', headers: { 'x-ai-quest-code': ADMIN_CODE }, body: JSON.stringify({ ...duplicate.body, active: false }) });
    assert.equal(deactivated.res.status, 200);

    const deleted = await json(server.url(`/api/admin/events/${duplicate.body.id}/delete`), { method: 'POST', headers: { 'x-ai-quest-code': ADMIN_CODE }, body: '{}' });
    assert.equal(deleted.res.status, 200);
    assert.equal(deleted.body.ok, true);
    assert.equal(deleted.body.deletedTeams, 1);
    assert.equal(deleted.body.deletedSubmissions, 1);
    await assert.rejects(() => stat(photoFile));

    const after = await json(server.url('/api/state'), { headers: { 'x-ai-quest-code': ADMIN_CODE } });
    assert.ok(!after.body.events.some(e => e.id === duplicate.body.id));
    assert.ok(!after.body.teams.some(t => t.eventId === duplicate.body.id));
    assert.ok(!after.body.submissions.some(s => s.teamId === join.body.id));
  } finally {
    await server.stop();
  }
});

test('API rate limit returns 429 with retry metadata before request floods can build up', async () => {
  const server = await startIsolatedServer({ AI_QUEST_API_RATE_LIMIT: '3', AI_QUEST_API_RATE_WINDOW_MS: '60000' });
  try {
    const headers = { 'x-forwarded-for': '203.0.113.10' };
    const first = await json(server.url('/api/events/by-code/GAVYAM'), { headers });
    const second = await json(server.url('/api/events/by-code/GAVYAM'), { headers });
    const third = await json(server.url('/api/events/by-code/GAVYAM'), { headers });
    assert.equal(first.res.status, 200);
    assert.equal(second.res.status, 200);
    assert.equal(third.res.status, 200);
    assert.equal(third.res.headers.get('x-ratelimit-remaining'), '0');

    const blocked = await json(server.url('/api/events/by-code/GAVYAM'), { headers });
    assert.equal(blocked.res.status, 429);
    assert.equal(blocked.body.error, 'rate_limited');
    assert.equal(blocked.body.scope, 'api');
    assert.ok(Number(blocked.body.retryAfterSeconds) > 0);
    assert.ok(Number(blocked.res.headers.get('retry-after')) > 0);

    const otherIp = await json(server.url('/api/events/by-code/GAVYAM'), { headers: { 'x-forwarded-for': '203.0.113.11' } });
    assert.equal(otherIp.res.status, 200);
  } finally {
    await server.stop();
  }
});

test('photo upload rate limit blocks excessive logo and checkpoint uploads per client', async () => {
  const server = await startIsolatedServer({ AI_QUEST_API_RATE_LIMIT: '100', AI_QUEST_UPLOAD_RATE_LIMIT: '2', AI_QUEST_UPLOAD_RATE_WINDOW_MS: '60000' });
  try {
    const headers = { 'x-forwarded-for': '203.0.113.20' };
    const created = await json(server.url('/api/teams/session'), { method: 'POST', headers, body: JSON.stringify({ eventCode: 'GAVYAM', teamAccessId: 'red', password: 'R4821', participantName: 'Upload Limit' }) });
    const cfg = await json(server.url(`/api/events/${created.body.eventId}/config`), { headers });
    const company = cfg.body.companies[0];

    async function logoUpload(name) {
      const body = new FormData();
      body.append('teamId', created.body.id);
      body.append('companyId', company.id);
      body.append('photo', tinyPngBlob(), name);
      return json(server.url('/api/submissions/logo-photo'), { method: 'POST', headers, body });
    }

    const first = await logoUpload('one.png');
    const second = await logoUpload('two.png');
    assert.equal(first.res.status, 201);
    assert.equal(second.res.status, 201);
    assert.equal(second.res.headers.get('x-ratelimit-remaining'), '0');

    const third = await logoUpload('three.png');
    assert.equal(third.res.status, 429);
    assert.equal(third.body.error, 'rate_limited');
    assert.equal(third.body.scope, 'upload');

    const otherIpBody = new FormData();
    otherIpBody.append('checkpoint', JSON.stringify({ id: 'cp-ok', piece: 'ok' }));
    otherIpBody.append('photo', tinyPngBlob(), 'checkpoint.png');
    const otherIp = await json(server.url(`/api/teams/${created.body.id}/checkpoint-request`), { method: 'POST', headers: { 'x-forwarded-for': '203.0.113.21' }, body: otherIpBody });
    assert.equal(otherIp.res.status, 200);
  } finally {
    await server.stop();
  }
});
