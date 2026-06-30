import http from 'node:http';
import { readFile, mkdir, writeFile, stat, unlink } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize, basename } from 'node:path';
import { JsonStore } from './server/storage/JsonStore.mjs';
import { readJson, readMultipart } from './server/storage/multipart.mjs';

const root = process.cwd();
const store = new JsonStore(join(root, 'server/data'));
const uploadDir = join(root, 'server/uploads/logos');
const puzzleUploadDir = join(root, 'server/uploads/puzzles');
const uid = p => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.jsx':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.pdf':'application/pdf', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml; charset=utf-8' };

await store.ensure();
await mkdir(uploadDir, { recursive: true });
await mkdir(puzzleUploadDir, { recursive: true });

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'content-type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', ...headers });
  res.end(payload);
}
function notFound(res) { send(res, 404, { error: 'not_found' }); }
function bad(res, error, status = 400) { send(res, status, { error }); }
async function exists(file) { try { await stat(file); return true; } catch { return false; } }

const rateBuckets = new Map();
const apiRateLimit = { name: 'api', limit: Number(process.env.AI_QUEST_API_RATE_LIMIT || 600), windowMs: Number(process.env.AI_QUEST_API_RATE_WINDOW_MS || 60_000) };
const uploadRateLimit = { name: 'upload', limit: Number(process.env.AI_QUEST_UPLOAD_RATE_LIMIT || 150), windowMs: Number(process.env.AI_QUEST_UPLOAD_RATE_WINDOW_MS || 10 * 60_000) };
const teamStreams = new Map();
const eventStreams = new Map();
function notifyEvent(eventId, reason = 'updated') {
  const clients = eventStreams.get(eventId);
  if (!clients) return;
  const payload = `event: event-update\ndata: ${JSON.stringify({ eventId, reason, at: new Date().toISOString() })}\n\n`;
  for (const res of [...clients]) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}
function addEventStream(eventId, req, res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'connection': 'keep-alive',
    'x-accel-buffering': 'no'
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ eventId, at: new Date().toISOString() })}\n\n`);
  const set = eventStreams.get(eventId) || new Set();
  set.add(res);
  eventStreams.set(eventId, set);
  const heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 30000);
  req.on('close', () => { clearInterval(heartbeat); set.delete(res); if (!set.size) eventStreams.delete(eventId); });
}
function notifyTeam(teamId, reason = 'updated') {
  const clients = teamStreams.get(teamId);
  if (!clients) return;
  const payload = `event: team-update\ndata: ${JSON.stringify({ teamId, reason, at: new Date().toISOString() })}\n\n`;
  for (const res of [...clients]) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}
function addTeamStream(teamId, req, res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'connection': 'keep-alive',
    'x-accel-buffering': 'no'
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ teamId, at: new Date().toISOString() })}\n\n`);
  const set = teamStreams.get(teamId) || new Set();
  set.add(res);
  teamStreams.set(teamId, set);
  const heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 30000);
  req.on('close', () => { clearInterval(heartbeat); set.delete(res); if (!set.size) teamStreams.delete(teamId); });
}
function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown');
}
function checkRateLimit(req, res, options) {
  const limit = Number(options.limit || 0);
  const windowMs = Number(options.windowMs || 0);
  if (!limit || !windowMs) return true;
  const now = Date.now();
  const key = `${options.name}:${clientIp(req)}`;
  const current = rateBuckets.get(key);
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) if (v.resetAt <= now) rateBuckets.delete(k);
  }
  const remaining = Math.max(0, limit - bucket.count);
  res.setHeader('x-ratelimit-limit', String(limit));
  res.setHeader('x-ratelimit-remaining', String(remaining));
  res.setHeader('x-ratelimit-reset', String(Math.ceil(bucket.resetAt / 1000)));
  if (bucket.count <= limit) return true;
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  send(res, 429, { error: 'rate_limited', scope: options.name, retryAfterSeconds: retryAfter }, { 'retry-after': String(retryAfter) });
  return false;
}
function isUploadApiRequest(req, pathname) {
  if (req.method !== 'POST') return false;
  return pathname === '/api/submissions/logo-photo' || /^\/api\/teams\/[^/]+\/complete-company$/.test(pathname) || /^\/api\/teams\/[^/]+\/checkpoint-request$/.test(pathname) || /^\/api\/admin\/events\/[^/]+\/puzzle-image$/.test(pathname);
}
async function hasStaffAccess(req, role = 'instructor') {
  const code = String(req.headers['x-ai-quest-code'] || '').trim();
  if (!code) return false;
  const state = await store.state();
  const activeEvents = (state.events || []).filter(e => e.active);
  const instructorCodes = activeEvents.flatMap(e => [e.checkpointConfig?.code, e.checkpointConfig?.instructorCode]).filter(Boolean).map(String);
  const adminCodes = activeEvents.flatMap(e => [e.checkpointConfig?.adminCode]).filter(Boolean).map(String);
  const envInstructor = process.env.AI_QUEST_INSTRUCTOR_CODE || 'AI2026';
  const envAdmin = process.env.AI_QUEST_ADMIN_CODE || 'Admin1092';
  if (role === 'admin') return code === envAdmin || adminCodes.includes(code);
  return code === envInstructor || code === envAdmin || instructorCodes.includes(code) || adminCodes.includes(code);
}
async function requireStaff(req, res, role = 'instructor') {
  if (await hasStaffAccess(req, role)) return true;
  send(res, 401, { error: 'staff_code_required', role });
  return false;
}
function parseUrl(req) {
  const url = new URL(req.url, 'http://localhost');
  const prefixes = ['/apps/eduapp/ai-quest-react', '/apps/eduapp/ai-quest'];
  for (const prefix of prefixes) {
    if (url.pathname === prefix) url.pathname = '/';
    else if (url.pathname.startsWith(`${prefix}/`)) url.pathname = url.pathname.slice(prefix.length) || '/';
  }
  return url;
}

function normalizeAnswer(value){return String(value??'').trim().toLowerCase().replace(/\s+/g,' ')}
function isCorrectQuestion(q,value){
  if((q.type||'single')==='short'){
    const text=normalizeAnswer(value),keywords=(q.acceptedKeywords||[]).map(normalizeAnswer).filter(Boolean);
    return keywords.length?keywords.some(k=>text.includes(k)):text===normalizeAnswer(q.correctText);
  }
  return Number(value)===Number(q.correctAnswer);
}
function scoreCompanyTask(company,questions,answers,hasLogoPhoto){
  let taskPoints=5,correct=0;
  questions.forEach(q=>{if(isCorrectQuestion(q,answers[q.id])){taskPoints+=Number(q.points||0);correct++}});
  if(questions.length&&correct===questions.length)taskPoints+=5;
  const logoBonus=hasLogoPhoto?5:0;
  return { taskPoints, logoBonus, totalPoints: taskPoints + logoBonus, correct };
}

function publicBasePath(req) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const prefixes = ['/apps/eduapp/ai-quest'];
  return prefixes.find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) || '';
}
const defaultTeamAccess = () => [
  { id: 'red', name: 'צוות אדום', password: 'R4821' },
  { id: 'white', name: 'צוות לבן', password: 'W7394' },
  { id: 'blue', name: 'צוות כחול', password: 'B5168' },
  { id: 'green', name: 'צוות ירוק', password: 'G2947' },
  { id: 'yellow', name: 'צוות צהוב', password: 'Y8635' },
  { id: 'purple', name: 'צוות סגול', password: 'P1476' }
];

function defaultCheckpointStops() {
  return [
    { id: 'cp-food-break', type: 'food_photo', threshold: 4, title: 'עצירת אוכל / טעינה', autoApprove: true, piece: '' },
    { id: 'cp-leumi-funding', type: 'funding_photo', threshold: 7, title: 'מימון מבנק לאומי', autoApprove: true, piece: '', description: 'קיבלתם מימון לחברה שלכם מבנק לאומי. צלמו או העלו לוגו של בנק לאומי כדי להמשיך.' },
    { id: 'cp-instructor-1', type: 'instructor_approval', threshold: 10, title: 'צ׳קפוינט מדריך 1', piece: 'חלק 1' },
    { id: 'cp-instructor-2', type: 'instructor_approval', threshold: 17, title: 'צ׳קפוינט מדריך 2', piece: 'חלק 2' },
    { id: 'cp-instructor-3', type: 'instructor_approval', threshold: 24, title: 'צ׳קפוינט מדריך 3', piece: 'חלק 3' }
  ];
}
function sanitizeCheckpointStops(stops = []) {
  const base = defaultCheckpointStops();
  const source = Array.isArray(stops) && stops.length ? stops : base;
  return source.slice(0, 5).map((stop, idx) => {
    const fallback = base[idx] || base[base.length - 1];
    const type = ['food_photo','funding_photo'].includes(stop.type) ? stop.type : 'instructor_approval';
    return {
      ...fallback,
      ...stop,
      id: stop.id || fallback.id,
      type,
      threshold: Math.max(1, Math.min(65, Number(stop.threshold || fallback.threshold || 4))),
      title: String(stop.title || fallback.title || '').trim(),
      autoApprove: type !== 'instructor_approval',
      piece: type !== 'instructor_approval' ? '' : String(stop.piece || fallback.piece || `חלק ${idx}`).trim()
    };
  }).sort((a, b) => a.threshold - b.threshold);
}

function sanitizeTeamAccess(access) {
  const source = Array.isArray(access) && access.length ? access : defaultTeamAccess();
  const seen = new Set();
  const out = [];
  for (const raw of source) {
    const baseId = String(raw.id || raw.name || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || `team-${out.length + 1}`;
    let id = baseId, n = 2;
    while (seen.has(id)) id = `${baseId}-${n++}`;
    seen.add(id);
    const name = String(raw.name || `צוות ${out.length + 1}`).trim();
    const password = String(raw.password || '').trim() || `T${String(out.length + 1).padStart(2, '0')}123!`;
    out.push({ id, name, password });
  }
  return out;
}
function eventTeamAccess(event) {
  return sanitizeTeamAccess(event?.teamAccess);
}
function publicTeamAccess(event) {
  return eventTeamAccess(event).map(({ id, name }) => ({ id, name }));
}
function staffTeamAccess(event) {
  return eventTeamAccess(event).map(({ id, name, password }) => ({ id, name, password }));
}
function publicEvent(event) {
  if (!event) return event;
  return { ...event, teamAccess: publicTeamAccess(event) };
}

function uploadFilePathFromUrl(url='') {
  const clean = String(url || '').replace(/^\/?api\//, '').split('?')[0];
  if (!clean.startsWith('uploads/logos/') && !clean.startsWith('uploads/puzzles/')) return null;
  const file = normalize(join(root, 'server', clean));
  if (file.startsWith(uploadDir) || file.startsWith(puzzleUploadDir)) return file;
  return null;
}
function collectRuntimeUploadUrls({ event, teams = [], submissions = [], checkpointRequests = [] }) {
  const urls = new Set();
  if (event?.puzzleConfig?.imageUrl) urls.add(event.puzzleConfig.imageUrl);
  for (const s of submissions) if (s.photoUrl) urls.add(s.photoUrl);
  for (const r of checkpointRequests) if (r.photoUrl) urls.add(r.photoUrl);
  for (const t of teams) for (const cp of (t.checkpoints || [])) if (cp.photoUrl) urls.add(cp.photoUrl);
  return urls;
}
function collectReferencedUploadUrls(state) {
  const urls = new Set();
  for (const e of state.events || []) if (e.puzzleConfig?.imageUrl) urls.add(e.puzzleConfig.imageUrl);
  for (const s of state.submissions || []) if (s.photoUrl) urls.add(s.photoUrl);
  for (const r of state.checkpointRequests || []) if (r.photoUrl) urls.add(r.photoUrl);
  for (const t of state.teams || []) for (const cp of (t.checkpoints || [])) if (cp.photoUrl) urls.add(cp.photoUrl);
  return urls;
}
async function deleteEventRuntime(eventId) {
  const state = await store.state();
  const event = state.events.find(e => e.id === eventId);
  if (!event) return null;
  const eventTeams = state.teams.filter(t => t.eventId === eventId);
  const teamIds = new Set(eventTeams.map(t => t.id));
  const eventSubmissions = state.submissions.filter(s => teamIds.has(s.teamId));
  const eventCheckpointRequests = state.checkpointRequests.filter(r => teamIds.has(r.teamId));
  const candidateUrls = collectRuntimeUploadUrls({ event, teams: eventTeams, submissions: eventSubmissions, checkpointRequests: eventCheckpointRequests });
  await store.update('events', list => list.filter(e => e.id !== eventId));
  await store.update('teams', list => list.filter(t => t.eventId !== eventId));
  await store.update('submissions', list => list.filter(s => !teamIds.has(s.teamId)));
  await store.update('checkpoint-requests', list => list.filter(r => !teamIds.has(r.teamId)));
  await store.update('instructor-messages', list => list.filter(m => m.eventId !== eventId));
  const after = await store.state();
  const stillReferenced = collectReferencedUploadUrls(after);
  const deletedFiles = [];
  for (const url of candidateUrls) {
    if (stillReferenced.has(url)) continue;
    const file = uploadFilePathFromUrl(url);
    if (!file) continue;
    await unlink(file).then(() => deletedFiles.push(url)).catch(() => {});
  }
  eventStreams.get(eventId)?.forEach(res => res.end());
  eventStreams.delete(eventId);
  return { eventId, deletedTeams: eventTeams.length, deletedSubmissions: eventSubmissions.length, deletedCheckpointRequests: eventCheckpointRequests.length, deletedFiles: deletedFiles.length };
}
function hasFixedTeams(event) { return Array.isArray(event?.teamAccess) && event.teamAccess.length > 0; }
function participantName(input) { return String(input.participantName || input.playerName || input.nickname || '').trim().slice(0, 40); }
function upsertParticipant(team, name) {
  const clean = String(name || '').trim().slice(0, 40);
  if (!clean) return team;
  const now = new Date().toISOString();
  const norm = clean.toLowerCase();
  const list = Array.isArray(team.participants) ? [...team.participants] : [];
  const i = list.findIndex(p => String(p.name || '').trim().toLowerCase() === norm);
  if (i >= 0) list[i] = { ...list[i], name: clean, lastSeenAt: now };
  else list.push({ id: uid('participant'), name: clean, joinedAt: now, lastSeenAt: now });
  return { ...team, participants: list, participantsCount: Math.max(Number(team.participantsCount || 0), list.length) };
}
function isEventPaused(event) {
  return event?.gameStatus === 'paused' || event?.pausedAt;
}
function eventPauseMessage(event, language = 'he') {
  return language === 'ar' ? (event?.pauseMessageAr || 'تم إيقاف اللعبة مؤقتًا من قبل المرشد. انتظروا تعليمات المتابعة.') : (event?.pauseMessageHe || 'המשחק נעצר זמנית על ידי המדריך. המתינו להנחיות להמשך.');
}
async function stateConfig(eventId) {
  const s = await store.state();
  const event = s.events.find(e => e.id === eventId);
  return { event: publicEvent(event), modelProblem: s.modelProblems.find(p => p.id === event?.selectedModelProblemId), companies: s.companies.filter(c => event?.activeCompanyIds?.includes(c.id) && c.active), questions: s.questions, abilities: s.abilities, content: s.content || { openingStory: {}, glossary: [] } };
}
async function saveTeam(team) {
  team.lastActivityAt = new Date().toISOString();
  await store.update('teams', teams => {
    const i = teams.findIndex(t => t.id === team.id);
    if (i >= 0) teams[i] = team; else teams.push(team);
    return teams;
  });
  notifyTeam(team.id, 'team-saved');
  if (team.eventId) notifyEvent(team.eventId, 'team-saved');
  return team;
}
async function resetTeamRuntime(teamId) {
  let reset;
  await store.update('teams', teams => teams.map(t => {
    if (t.id !== teamId) return t;
    reset = {
      ...t,
      currentStage: 1,
      score: 0,
      modelQuality: 0,
      collectedAbilities: [],
      completedCompanies: [],
      foundCompanies: [],
      checkpointStatus: 'none',
      checkpoints: [],
      puzzlePieces: [],
      repairs: [],
      needsPhotoFixCompanies: [],
      aiHelperUses: 0,
      aiHelperBonusAwarded: false,
      messages: [{ text: 'המדריך איפס את ההתקדמות שלכם. התחילו שוב מהחברה הראשונה.', at: new Date().toISOString() }],
      lastActivityAt: new Date().toISOString()
    };
    return reset;
  }));
  if (!reset) return null;
  await store.update('submissions', subs => subs.filter(s => s.teamId !== teamId));
  await store.update('checkpoint-requests', list => list.filter(x => x.teamId !== teamId));
  notifyTeam(teamId, 'team-reset');
  if (reset.eventId) notifyEvent(reset.eventId, 'team-reset');
  return reset;
}
async function handleApi(req, res, url) {
  const path = url.pathname;
  const method = req.method;

  if (method === 'GET' && path === '/api/health') return send(res, 200, { ok: true, storage: 'json', time: new Date().toISOString() });
  if (method === 'GET' && path === '/api/state') { if (!await requireStaff(req, res, 'admin')) return; return send(res, 200, await store.state()); }
  if (method === 'POST' && path === '/api/admin/reset-runtime') { if (!await requireStaff(req, res, 'admin')) return; await store.resetRuntime(); return send(res, 200, { ok: true }); }

  if (method === 'POST' && path === '/api/admin/events') {
    if (!await requireStaff(req, res, 'admin')) return;
    const event = await readJson(req);
    if (!event.id) event.id = uid('event');
    event.code = String(event.code || '').replace(/\s+/g, '').trim().toUpperCase();
    event.availableDurations = (event.availableDurations || [60, 90, 135]).map(Number).filter(Boolean);
    event.activeCompanyIds = Array.isArray(event.activeCompanyIds) ? event.activeCompanyIds : [];
    event.checkpointConfig = { ...(event.checkpointConfig || {}), instructorCode: event.checkpointConfig?.instructorCode || 'AI2026', adminCode: event.checkpointConfig?.adminCode || 'Admin1092', stops: sanitizeCheckpointStops(event.checkpointConfig?.stops) };
    event.teamAccess = sanitizeTeamAccess(event.teamAccess);
    event.puzzleConfig = { ...(event.puzzleConfig || {}), enabled: !!event.puzzleConfig?.enabled, pieceCount: Number(event.puzzleConfig?.pieceCount || 12), imageUrl: event.puzzleConfig?.imageUrl || '', imageName: event.puzzleConfig?.imageName || '' };
    event.gameStatus = event.gameStatus === 'paused' ? 'paused' : 'running';
    if (event.gameStatus !== 'paused') delete event.pausedAt;
    await store.update('events', list => { const i = list.findIndex(e => e.id === event.id); i >= 0 ? list[i] = event : list.push(event); return list; });
    return send(res, 200, event);
  }
  if (method === 'POST' && path.match(/^\/api\/admin\/events\/[^/]+\/duplicate$/)) {
    if (!await requireStaff(req, res, 'admin')) return;
    const id = path.split('/')[4];
    const body = await readJson(req).catch(() => ({}));
    const events = await store.read('events');
    const source = events.find(e => e.id === id);
    if (!source) return notFound(res);
    const { finalizedAt, pausedAt, pauseMessageHe, pauseMessageAr, ...settings } = source;
    const copy = { ...settings, id: uid('event'), name: body.name || `${source.name} — עותק`, code: String(body.code || `${source.code || 'EVENT'}COPY`).replace(/\s+/g, '').trim().toUpperCase(), active: body.active ?? false, gameStatus: 'running', createdAt: new Date().toISOString() };
    await store.update('events', list => [...list, copy]);
    return send(res, 201, copy);
  }

  if ((method === 'DELETE' && path.match(/^\/api\/admin\/events\/[^/]+$/)) || (method === 'POST' && path.match(/^\/api\/admin\/events\/[^/]+\/delete$/))) {
    if (!await requireStaff(req, res, 'admin')) return;
    const id = path.split('/')[4];
    const events = await store.read('events');
    const event = events.find(e => e.id === id);
    if (!event) return notFound(res);
    if (event.active) return bad(res, 'cannot_delete_active_event', 400);
    if (events.length <= 1) return bad(res, 'cannot_delete_last_event', 400);
    const result = await deleteEventRuntime(id);
    return send(res, 200, { ok: true, ...result });
  }

  if (method === 'POST' && path.match(/^\/api\/admin\/events\/[^/]+\/puzzle-image$/)) {
    if (!await requireStaff(req, res, 'admin')) return;
    const id = path.split('/')[4];
    const { fields, files } = await readMultipart(req);
    const file = files.image || files.photo || files.puzzle;
    if (!file) return bad(res, 'missing_puzzle_image');
    const ext = extname(file.filename || '').toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext)) return bad(res, 'unsupported_puzzle_image');
    const safe = basename(file.filename || `puzzle${ext || '.png'}`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${uid('puzzle')}-${safe}`;
    await writeFile(join(puzzleUploadDir, filename), file.buffer);
    let event;
    const pieceCount = Math.max(1, Math.min(48, Number(fields.pieceCount || 12)));
    await store.update('events', events => events.map(e => {
      if (e.id !== id) return e;
      event = { ...e, puzzleConfig: { ...(e.puzzleConfig || {}), enabled: true, imageUrl: `api/uploads/puzzles/${filename}`, imageName: file.filename || safe, pieceCount } };
      return event;
    }));
    return event ? send(res, 200, event) : notFound(res);
  }
  if (method === 'GET' && path.match(/^\/api\/admin\/events\/[^/]+\/results$/)) {
    if (!await requireStaff(req, res, 'admin')) return;
    const id = path.split('/')[4];
    const state = await store.state();
    const event = state.events.find(e => e.id === id);
    if (!event) return notFound(res);
    const teams = state.teams.filter(t => t.eventId === id);
    const rows = teams.map(t => ({
      teamId: t.id,
      teamName: t.name,
      language: t.language,
      duration: t.activityDuration,
      participants: t.participantsCount, participantNames: (t.participants || []).map(p => p.name).join('; '),
      score: t.score || 0,
      completedCompanies: (t.completedCompanies || []).length,
      abilities: (t.collectedAbilities || []).length,
      puzzlePieces: (t.puzzlePieces || []).length,
      checkpointsApproved: (t.checkpoints || []).filter(c => c.status === 'approved' && c.type === 'instructor_approval').length,
      checkpointsRejected: (t.checkpoints || []).filter(c => c.status === 'rejected').length,
      photoRetakes: (t.needsPhotoFixCompanies || []).length,
      createdAt: t.createdAt,
      lastActivityAt: t.lastActivityAt,
    }));
    const format = url.searchParams.get('format') || 'json';
    if (format === 'csv') {
      const headers = Object.keys(rows[0] || { teamId: '', teamName: '', score: '', completedCompanies: '' });
      const escCsv = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => escCsv(r[h])).join(','))].join('\n');
      return send(res, 200, csv, { 'content-type': 'text/csv; charset=utf-8' });
    }
    return send(res, 200, { event, teams: rows, totals: { teams: rows.length, students: rows.reduce((sum, r) => sum + Number(r.participants || 0), 0) } });
  }

  if (method === 'GET' && path.match(/^\/api\/events\/[^/]+\/stream$/)) {
    const eventId = path.split('/')[3];
    return addEventStream(eventId, req, res);
  }

  if (method === 'GET' && path.match(/^\/api\/staff\/events\/[^/]+\/team-access$/)) {
    if (!await requireStaff(req, res, 'instructor')) return;
    const eventId = path.split('/')[4];
    const event = (await store.read('events')).find(e => e.id === eventId);
    return event ? send(res, 200, staffTeamAccess(event)) : notFound(res);
  }

  if (method === 'GET' && path === '/api/events/active') {
    const events = await store.read('events');
    return send(res, 200, events.filter(e => e.active).map(publicEvent));
  }

  if (method === 'GET' && path.startsWith('/api/events/by-code/')) {
    const code = decodeURIComponent(path.split('/').pop()).replace(/\s+/g, '').trim();
    const events = await store.read('events');
    const event = events.find(e => String(e.code || '').replace(/\s+/g, '').trim().toLowerCase() === code.toLowerCase() && e.active);
    return event ? send(res, 200, publicEvent(event)) : notFound(res);
  }
  if (method === 'GET' && path.match(/^\/api\/events\/[^/]+\/team-access$/)) {
    const eventId = path.split('/')[3];
    const event = (await store.read('events')).find(e => e.id === eventId && e.active);
    return event ? send(res, 200, publicTeamAccess(event)) : notFound(res);
  }
  if (method === 'GET' && path.match(/^\/api\/events\/[^/]+\/team-access-staff$/)) {
    if (!await requireStaff(req, res, 'instructor')) return;
    const eventId = path.split('/')[3];
    const event = (await store.read('events')).find(e => e.id === eventId);
    return event ? send(res, 200, staffTeamAccess(event)) : notFound(res);
  }

  if (method === 'POST' && path.match(/^\/api\/events\/[^/]+\/team-password$/)) {
    if (!await requireStaff(req, res, 'instructor')) return;
    const eventId = path.split('/')[3];
    const { teamAccessId, password } = await readJson(req);
    if (!teamAccessId || !String(password || '').trim()) return bad(res, 'missing_team_or_password');
    let event;
    await store.update('events', events => events.map(e => {
      if (e.id !== eventId) return e;
      const access = eventTeamAccess(e).map(t => t.id === teamAccessId ? { ...t, password: String(password).trim() } : t);
      event = { ...e, teamAccess: access };
      return event;
    }));
    return event ? send(res, 200, publicEvent(event)) : notFound(res);
  }
  if (method === 'GET' && path.match(/^\/api\/events\/[^/]+\/config$/)) {
    const eventId = path.split('/')[3];
    return send(res, 200, await stateConfig(eventId));
  }
  if (method === 'GET' && path.match(/^\/api\/events\/[^/]+\/teams$/)) {
    if (!await requireStaff(req, res, 'instructor')) return;
    const eventId = path.split('/')[3];
    const event = (await store.read('events')).find(e => e.id === eventId);
    const validAccess = new Set(eventTeamAccess(event).map(t => t.id));
    const teams = (await store.read('teams')).filter(t => t.eventId === eventId && (!hasFixedTeams(event) || validAccess.has(t.teamAccessId)));
    return send(res, 200, teams);
  }
  if (method === 'POST' && path.match(/^\/api\/events\/[^/]+\/message$/)) {
    if (!await requireStaff(req, res, 'instructor')) return;
    const eventId = path.split('/')[3];
    const { text, teamIds } = await readJson(req);
    const msg = String(text || '').trim();
    if (!msg) return bad(res, 'missing_text');
    const targetIds = Array.isArray(teamIds) ? new Set(teamIds) : null;
    const at = new Date().toISOString();
    let count = 0;
    await store.update('teams', teams => teams.map(t => {
      if (t.eventId !== eventId || (targetIds && !targetIds.has(t.id))) return t;
      count += 1;
      return { ...t, messages: [...(t.messages || []), { text: msg, at, scope: 'group' }], lastActivityAt: at };
    }));
    await store.update('instructor-messages', list => [...list, { id: uid('message'), eventId, teamIds: targetIds ? [...targetIds] : 'all', text: msg, at }]);
    notifyEvent(eventId, 'group-message');
    return send(res, 200, { ok: true, count });
  }
  if (method === 'POST' && path.match(/^\/api\/events\/[^/]+\/pause$/)) {
    if (!await requireStaff(req, res, 'instructor')) return;
    const eventId = path.split('/')[3];
    const body = await readJson(req).catch(() => ({}));
    const paused = body.paused !== false;
    const at = new Date().toISOString();
    let event;
    await store.update('events', events => events.map(e => {
      if (e.id !== eventId) return e;
      event = { ...e, gameStatus: paused ? 'paused' : 'running', pauseMessageHe: body.messageHe || e.pauseMessageHe || 'המשחק נעצר זמנית על ידי המדריך. המתינו להנחיות להמשך.', pauseMessageAr: body.messageAr || e.pauseMessageAr || 'تم إيقاف اللعبة مؤقتًا من قبل المرشد. انتظروا تعليمات المتابعة.' };
      if (paused) event.pausedAt = at; else delete event.pausedAt;
      return event;
    }));
    if (!event) return notFound(res);
    await store.update('teams', teams => teams.map(t => t.eventId === eventId ? { ...t, messages: [...(t.messages || []), { text: paused ? eventPauseMessage(event, t.language) : (t.language === 'ar' ? 'تم فتح اللعبة من جديد. يمكنكم المتابعة.' : 'המשחק נפתח מחדש. אפשר להמשיך.'), at, scope: paused ? 'pause' : 'resume' }], lastActivityAt: at } : t));
    notifyEvent(eventId, paused ? 'event-paused' : 'event-resumed');
    return send(res, 200, { ok: true, event: publicEvent(event), paused });
  }

  if (method === 'POST' && path.match(/^\/api\/events\/[^/]+\/finalize$/)) {
    if (!await requireStaff(req, res, 'instructor')) return;
    const eventId = path.split('/')[3], at = new Date().toISOString();
    let event;
    await store.update('events', events => events.map(e => {
      if (e.id !== eventId) return e;
      event = { ...e, finalizedAt: at };
      return event;
    }));
    if (!event) return notFound(res);
    let count = 0;
    await store.update('teams', teams => teams.map(t => {
      if (t.eventId !== eventId) return t;
      count += 1;
      const text = t.language === 'ar' ? 'انتهت مرحلة البحث. انتقلوا إلى المهمة النهائية لبناء النموذج المحسّن.' : 'שלב החקר הסתיים. עברו למשימה הסופית לבניית המודל המשופר.';
      return { ...t, messages: [...(t.messages || []), { text, at, scope: 'final' }], lastActivityAt: at };
    }));
    await store.update('instructor-messages', list => [...list, { id: uid('message'), eventId, teamIds: 'all', text: 'הפעילות הסתיימה — המשימה הסופית נפתחה.', at, scope: 'final' }]);
    notifyEvent(eventId, 'event-finalized');
    return send(res, 200, { ok: true, event, finalizedAt: at, count });
  }

  if (method === 'POST' && path === '/api/teams/session') {
    const input = await readJson(req);
    const events = await store.read('events');
    const eventCode = String(input.eventCode || '').replace(/\s+/g, '').trim();
    const event = events.find(e => String(e.code || '').replace(/\s+/g, '').trim().toLowerCase() === eventCode.toLowerCase() && e.active);
    if (!event) return bad(res, 'event_not_found', 404);
    const access = eventTeamAccess(event);
    const selected = access.find(t => t.id === input.teamAccessId || t.name === input.name);
    if (hasFixedTeams(event) && !selected) return bad(res, 'team_required', 400);
    if ((input.teamAccessId || input.password) && !selected) return bad(res, 'team_not_found', 404);
    if (selected && String(input.password || '') !== String(selected.password || '')) return bad(res, 'invalid_team_password', 401);
    const playerName = participantName(input);
    if (selected && !playerName) return bad(res, 'participant_name_required', 400);
    const stableId = selected ? `${event.id}-${selected.id}` : uid('team');
    let team, created = false;
    await store.update('teams', teams => {
      const i = selected ? teams.findIndex(t => t.id === stableId || (t.eventId === event.id && t.teamAccessId === selected.id)) : -1;
      const base = i >= 0 ? teams[i] : { id: stableId, eventId: event.id, teamAccessId: selected?.id || '', currentStage: 1, score: 0, modelQuality: 0, collectedAbilities: [], completedCompanies: [], foundCompanies: [], checkpointStatus: 'none', checkpoints: [], puzzlePieces: [], repairs: [], messages: [], needsPhotoFixCompanies: [], participants: [], createdAt: new Date().toISOString() };
      team = { ...base, id: stableId, eventId: event.id, teamAccessId: selected?.id || base.teamAccessId || '', name: selected?.name || String(input.name || '').trim(), language: input.language || base.language || 'he', activityDuration: Number(input.activityDuration || base.activityDuration || 90), participantsCount: Number(input.participantsCount || base.participantsCount || 1), lastActivityAt: new Date().toISOString() };
      team = upsertParticipant(team, playerName);
      if (i >= 0) teams[i] = team; else { teams.push(team); created = true; }
      return teams;
    });
    notifyTeam(team.id, created ? 'team-created' : 'team-joined');
    notifyEvent(team.eventId, created ? 'team-created' : 'team-joined');
    return send(res, created ? 201 : 200, team);
  }
  if (method === 'GET' && path.match(/^\/api\/teams\/[^/]+\/stream$/)) {
    const id = path.split('/')[3];
    return addTeamStream(id, req, res);
  }
  if (method === 'GET' && path.match(/^\/api\/teams\/[^/]+$/)) {
    const id = path.split('/')[3];
    const team = (await store.read('teams')).find(t => t.id === id);
    return team ? send(res, 200, team) : notFound(res);
  }
  if (method === 'PATCH' && path.match(/^\/api\/teams\/[^/]+$/)) {
    const id = path.split('/')[3];
    const patch = await readJson(req);
    const team = (await store.read('teams')).find(t => t.id === id);
    if (!team) return notFound(res);
    return send(res, 200, await saveTeam({ ...team, ...patch, id }));
  }
  if (method === 'POST' && path.match(/^\/api\/teams\/[^/]+\/reset$/)) {
    if (!await requireStaff(req, res, 'instructor')) return;
    const id = path.split('/')[3];
    const team = await resetTeamRuntime(id);
    return team ? send(res, 200, team) : notFound(res);
  }

  if (method === 'POST' && path.match(/^\/api\/teams\/[^/]+\/complete-company$/)) {
    const id = path.split('/')[3];
    const contentType = req.headers['content-type'] || '';
    let input = {}, photoFile = null, photoName = '';
    if (contentType.includes('multipart/form-data')) {
      const { fields, files } = await readMultipart(req);
      input = fields.payload ? JSON.parse(fields.payload) : fields;
      photoFile = files.photo || null;
      photoName = photoFile?.filename || fields.photoName || '';
    } else input = await readJson(req);
    const companyId = String(input.companyId || '').trim();
    const answers = typeof input.answers === 'string' ? JSON.parse(input.answers || '{}') : (input.answers || {});
    const state = await store.state();
    const existing = state.teams.find(t => t.id === id);
    if (!existing) return notFound(res);
    const event = state.events.find(e => e.id === existing.eventId);
    if (isEventPaused(event)) return bad(res, 'game_paused', 423);
    const company = state.companies.find(c => c.id === companyId && event?.activeCompanyIds?.includes(c.id));
    if (!company) return bad(res, 'company_not_found', 404);
    const alreadyDone = (existing.completedCompanies || []).includes(companyId) && !(existing.needsPhotoFixCompanies || []).includes(companyId);
    if (alreadyDone) return send(res, 200, { team: existing, alreadyCompleted: true });
    const questions = state.questions.filter(q => q.companyId === companyId && q.active);
    const points = scoreCompanyTask(company, questions, answers, !!photoFile);
    let submission = null;
    if (photoFile) {
      const safe = basename(photoFile.filename || 'logo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
      const subId = uid('sub');
      const filename = `${subId}-${safe}`;
      await writeFile(join(uploadDir, filename), photoFile.buffer);
      submission = { id: subId, teamId: id, companyId, photoName, photoUrl: `api/uploads/logos/${filename}`, answers, awardedPoints: points.totalPoints, taskPoints: points.taskPoints, logoBonus: points.logoBonus, status: 'completed', instructorReviewStatus: 'pending', createdAt: new Date().toISOString() };
    } else {
      submission = { id: uid('sub'), teamId: id, companyId, photoName: '', answers, awardedPoints: points.totalPoints, taskPoints: points.taskPoints, logoBonus: 0, status: 'completed', instructorReviewStatus: 'no_photo', createdAt: new Date().toISOString() };
    }
    let team;
    await store.update('teams', teams => teams.map(t => {
      if (t.id !== id) return t;
      if ((t.completedCompanies || []).includes(companyId) && !(t.needsPhotoFixCompanies || []).includes(companyId)) { team = t; return t; }
      const gainedAbilities = (company.stationType || 'model') === 'knowledge' ? [] : (company.abilityIds || []);
      team = { ...t, collectedAbilities: [...new Set([...(t.collectedAbilities || []), ...gainedAbilities])], completedCompanies: [...new Set([...(t.completedCompanies || []), companyId])], needsPhotoFixCompanies: (t.needsPhotoFixCompanies || []).filter(x => x !== companyId), score: (t.score || 0) + points.totalPoints, lastActivityAt: new Date().toISOString() };
      return team;
    }));
    await store.update('submissions', subs => [...subs, submission]);
    notifyTeam(id, 'company-completed');
    if (team?.eventId) notifyEvent(team.eventId, 'company-completed');
    return send(res, 200, { team, submission, alreadyCompleted: false });
  }

  if (method === 'POST' && path === '/api/submissions') {
    const sub = await readJson(req);
    const record = { id: uid('sub'), createdAt: new Date().toISOString(), instructorReviewStatus: 'pending', ...sub };
    await store.update('submissions', subs => [...subs, record]);
    const teams = await store.read('teams');
    const team = teams.find(t => t.id === record.teamId);
    if (team?.eventId) notifyEvent(team.eventId, 'submission-uploaded');
    if (team?.id) notifyTeam(team.id, 'submission-uploaded');
    return send(res, 201, record);
  }
  if (method === 'POST' && path === '/api/submissions/logo-photo') {
    const { fields, files } = await readMultipart(req);
    const file = files.photo;
    if (!file) return bad(res, 'missing_photo');
    const safe = basename(file.filename || 'logo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const id = uid('sub');
    const filename = `${id}-${safe}`;
    await writeFile(join(uploadDir, filename), file.buffer);
    const record = { id, teamId: fields.teamId, companyId: fields.companyId, photoName: file.filename, photoUrl: `api/uploads/logos/${filename}`, answers: fields.answers ? JSON.parse(fields.answers) : {}, awardedPoints: Number(fields.awardedPoints || 0), status: fields.status || 'completed', instructorReviewStatus: 'pending', createdAt: new Date().toISOString() };
    await store.update('submissions', subs => [...subs, record]);
    return send(res, 201, record);
  }
  if (method === 'GET' && path === '/api/submissions') { if (!await requireStaff(req, res, 'instructor')) return; return send(res, 200, await store.read('submissions')); }
  if (method === 'PATCH' && path.match(/^\/api\/submissions\/[^/]+\/review$/)) {
    if (!await requireStaff(req, res, 'instructor')) return;
    const id = path.split('/')[3];
    const { status } = await readJson(req);
    let found;
    await store.update('submissions', subs => subs.map(s => s.id === id ? (found = { ...s, instructorReviewStatus: status || 'pending' }) : s));
    if (found && status === 'invalid') {
      const state = await store.state();
      const team = state.teams.find(t => t.id === found.teamId);
      const company = state.companies.find(c => c.id === found.companyId);
      if (team && company) {
        const completed = new Set(team.completedCompanies || []);
        completed.delete(company.id);
        const remainingCompanies = state.companies.filter(c => completed.has(c.id));
        const remainingAbilities = new Set(remainingCompanies.flatMap(c => c.abilityIds || []));
        team.completedCompanies = [...completed, company.id];
        team.needsPhotoFixCompanies = [...new Set([...(team.needsPhotoFixCompanies || []), company.id])];
        if ((company.stationType || 'model') !== 'knowledge') team.collectedAbilities = [...new Set([...(team.collectedAbilities || []), ...(company.abilityIds || [])])];
        team.score = Math.max(0, (team.score || 0) - 5);
        team.messages = [...(team.messages || []), { text: `צילום הלוגו של ${company.nameHe || company.id} סומן כלא תקין. החברה נשארת מושלמת, אך בונוס הלוגו ירד.`, at: new Date().toISOString() }];
        await saveTeam(team);
      }
    }
    if (found) {
      const teams = await store.read('teams');
      const team = teams.find(t => t.id === found.teamId);
      if (team?.eventId) notifyEvent(team.eventId, 'submission-reviewed');
      if (team?.id) notifyTeam(team.id, 'submission-reviewed');
    }
    return found ? send(res, 200, found) : notFound(res);
  }
  if ((method === 'DELETE' && path.match(/^\/api\/submissions\/[^/]+$/)) || (method === 'POST' && path.match(/^\/api\/submissions\/[^/]+\/delete$/))) {
    if (!await requireStaff(req, res, 'instructor')) return;
    const parts = path.split('/');
    const id = parts[3];
    let removed;
    await store.update('submissions', subs => subs.filter(s => s.id === id ? (removed = s, false) : true));
    if (!removed) return notFound(res);
    if (removed.photoUrl) {
      const clean = String(removed.photoUrl).replace(/^api\//, '');
      const file = normalize(join(root, clean));
      if (file.startsWith(uploadDir)) await unlink(file).catch(() => {});
    }
    const teams = await store.read('teams');
    const team = teams.find(t => t.id === removed.teamId);
    if (team?.eventId) notifyEvent(team.eventId, 'submission-deleted');
    if (team?.id) notifyTeam(team.id, 'submission-deleted');
    return send(res, 200, { ok: true, removedId: id });
  }

  if (method === 'POST' && path.match(/^\/api\/teams\/[^/]+\/ai-helper$/)) {
    const id = path.split('/')[3];
    const { question = '', companyId = '' } = await readJson(req).catch(() => ({}));
    const state = await store.state();
    const team = state.teams.find(t => t.id === id);
    if (!team) return notFound(res);
    const event = state.events.find(e => e.id === team.eventId);
    if (isEventPaused(event)) return bad(res, 'game_paused', 423);
    const q = String(question || '').trim().slice(0, 500);
    if (!q) return bad(res, 'missing_question');
    const companies = state.companies.filter(c => event?.activeCompanyIds?.includes(c.id));
    const terms = q.toLowerCase().split(/\s+/).filter(x => x.length > 1);
    const selected = companies.find(c => c.id === companyId) || companies.find(c => terms.some(term => [c.nameHe, c.nameAr, c.nameEn, ...(c.aliases || [])].join(' ').toLowerCase().includes(term))) || null;
    const l = team.language || 'he';
    const answer = selected
      ? `${selected.nameHe || selected.nameEn}: ${selected.field || ''}. ${l === 'ar' ? (selected.descriptionAr || selected.descriptionHe || '') : (selected.descriptionHe || selected.descriptionAr || '')} טיפ: חפשו בשטח שילוט/לוגו אמיתי, שאלו מה החברה עושה, ונסו לקשר את זה ליכולת AI כמו דאטה, אבטחה, המלצות או בקרה אנושית.`
      : `אני יכול לעזור לכם להבין חברה, למצוא כיוון לשאלה למדריך, או להסביר איך להתקדם באפליקציה. נסו לשאול: “מה עושה Microsoft?”, “איך החברה קשורה ל-AI?”, או “מה צריך לעשות בצ׳קפוינט?”.`;
    let awarded = 0, updated;
    await store.update('teams', teams => teams.map(t => {
      if (t.id !== id) return t;
      const used = !!t.aiHelperBonusAwarded;
      awarded = used ? 0 : 3;
      updated = { ...t, aiHelperUses: (t.aiHelperUses || 0) + 1, aiHelperBonusAwarded: true, score: (t.score || 0) + awarded, messages: [...(t.messages || []), ...(awarded ? [{ text: 'קיבלתם 3 נק׳ בונוס על שימוש בעוזר AI בצורה לימודית.', at: new Date().toISOString(), scope: 'ai-helper' }] : [])], lastActivityAt: new Date().toISOString() };
      return updated;
    }));
    notifyTeam(id, 'ai-helper');
    if (updated?.eventId) notifyEvent(updated.eventId, 'ai-helper');
    return send(res, 200, { answer, awarded, team: updated });
  }

  if (method === 'POST' && path.match(/^\/api\/teams\/[^/]+\/checkpoint-request$/)) {
    const id = path.split('/')[3];
    const team = (await store.read('teams')).find(t => t.id === id);
    if (!team) return notFound(res);
    const event = (await store.read('events')).find(e => e.id === team.eventId);
    if (isEventPaused(event)) return bad(res, 'game_paused', 423);
    const contentType = req.headers['content-type'] || '';
    let input = {}, photoUrl = '', photoName = '';
    if (contentType.includes('multipart/form-data')) {
      const { fields, files } = await readMultipart(req);
      input = fields.checkpoint ? JSON.parse(fields.checkpoint) : {};
      const file = files.photo;
      if (file) {
        const safe = basename(file.filename || 'checkpoint.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename = `${uid('checkpoint')}-${safe}`;
        await writeFile(join(uploadDir, filename), file.buffer);
        photoUrl = `api/uploads/logos/${filename}`;
        photoName = file.filename || fields.photoName || 'checkpoint-photo';
      }
    } else {
      const body = await readJson(req).catch(() => ({}));
      input = body.checkpoint || body || {};
      photoName = body.photoName || '';
    }
    const autoApprove = !!input.autoApprove;
    const record = { id: uid('checkpoint'), planId: input.id || input.planId || 'checkpoint', type: input.type || 'instructor_approval', title: input.title || 'צ׳קפוינט', description: input.description || '', threshold: Number(input.threshold || 0), piece: input.piece || '', status: autoApprove ? 'approved' : 'requested', photoName, photoUrl, createdAt: new Date().toISOString(), ...(autoApprove ? { reviewedAt: new Date().toISOString(), autoApproved: true } : {}) };
    team.checkpoints = [...(team.checkpoints || []), record];
    if (autoApprove) {
      team.messages = [...(team.messages || []), { text: input.type === 'funding_photo' ? (team.language === 'ar' ? 'تم تسجيل تمويل بنك لئومي. يمكنكم المتابعة.' : 'מימון בנק לאומי נקלט. אפשר להמשיך.') : (team.language === 'ar' ? 'تم تسجيل استراحة الطعام. يمكنكم المتابعة.' : 'עצירת האוכל נקלטה. אפשר להמשיך.'), at: new Date().toISOString() }];
    } else {
      team.checkpointStatus = 'requested';
      await store.update('checkpoint-requests', list => [...list, { ...record, teamId: id }]);
    }
    await saveTeam(team);
    return send(res, 200, team);
  }
  if (method === 'POST' && path.match(/^\/api\/teams\/[^/]+\/checkpoint-review$/)) {
    if (!await requireStaff(req, res, 'instructor')) return;
    const id = path.split('/')[3];
    const { approved, note } = await readJson(req);
    const team = (await store.read('teams')).find(t => t.id === id);
    if (!team) return notFound(res);
    const pending = (team.checkpoints || []).find(c => c.status === 'requested');
    if (!pending) return bad(res, 'checkpoint_not_requested');
    team.checkpoints = (team.checkpoints || []).map(c => c.id === pending.id ? { ...c, status: approved ? 'approved' : 'rejected', reviewedAt: new Date().toISOString(), note } : c);
    team.checkpointStatus = approved ? 'approved' : 'rejected';
    if (approved) {
      team.currentStage = (team.currentStage || 1) + 1;
      if (pending?.piece) team.puzzlePieces = [...new Set([...(team.puzzlePieces || []), pending.piece])];
    }
    team.messages = [...(team.messages || []), { text: note || (approved ? `הצ׳קפוינט אושר. קיבלתם חלק פאזל: ${pending?.piece || 'המשך'}` : 'הצ׳קפוינט נדחה. חזרו למשימה ונסו שוב.'), at: new Date().toISOString() }];
    if (pending) await store.update('checkpoint-requests', list => list.map(r => r.id === pending.id ? { ...r, status: approved ? 'approved' : 'rejected', note, reviewedAt: new Date().toISOString() } : r));
    return send(res, 200, await saveTeam(team));
  }

  if (method === 'POST' && path.match(/^\/api\/teams\/[^/]+\/message$/)) {
    if (!await requireStaff(req, res, 'instructor')) return;
    const id = path.split('/')[3];
    const { text } = await readJson(req);
    const team = (await store.read('teams')).find(t => t.id === id);
    if (!team) return notFound(res);
    team.messages = [...(team.messages || []), { text, at: new Date().toISOString() }];
    return send(res, 200, await saveTeam(team));
  }
  if (method === 'POST' && path.match(/^\/api\/teams\/[^/]+\/bonus$/)) {
    if (!await requireStaff(req, res, 'instructor')) return;
    const id = path.split('/')[3];
    const { points = 5, note = 'המדריך הוסיף בונוס.' } = await readJson(req);
    const team = (await store.read('teams')).find(t => t.id === id);
    if (!team) return notFound(res);
    team.score = (team.score || 0) + Number(points);
    team.messages = [...(team.messages || []), { text: note, at: new Date().toISOString() }];
    return send(res, 200, await saveTeam(team));
  }

  if (method === 'POST' && path === '/api/admin/companies') {
    if (!await requireStaff(req, res, 'admin')) return;
    const company = await readJson(req);
    if (!company.id) company.id = uid('company');
    await store.update('companies', list => { const i = list.findIndex(c => c.id === company.id); i >= 0 ? list[i] = company : list.push(company); return list; });
    return send(res, 200, company);
  }
  if (method === 'POST' && path === '/api/admin/questions') {
    if (!await requireStaff(req, res, 'admin')) return;
    const question = await readJson(req);
    if (!question.id) question.id = uid('question');
    question.points = Number(question.points || 10);
    question.correctAnswer = Number(question.correctAnswer || 0);
    await store.update('questions', list => { const i = list.findIndex(q => q.id === question.id); i >= 0 ? list[i] = question : list.push(question); return list; });
    return send(res, 200, question);
  }
  if (method === 'POST' && path === '/api/admin/model-problems') {
    if (!await requireStaff(req, res, 'admin')) return;
    const problem = await readJson(req);
    await store.update('model-problems', list => { const i = list.findIndex(p => p.id === problem.id); i >= 0 ? list[i] = problem : list.push(problem); return list; });
    return send(res, 200, problem);
  }

  return notFound(res);
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.startsWith('/uploads/')) {
    const file = normalize(join(root, 'server', pathname));
    if (!file.startsWith(join(root, 'server/uploads'))) return notFound(res);
    try { await stat(file); } catch { return notFound(res); }
    res.writeHead(200, { 'content-type': types[extname(file).toLowerCase()] || 'application/octet-stream' });
    const stream = createReadStream(file);
    stream.on('error', () => { if (!res.headersSent) notFound(res); else res.destroy(); });
    return stream.pipe(res);
  }
  const file = pathname === '/' ? '/index.html' : pathname;
  const distPath = normalize(join(root, 'dist', file));
  if (distPath.startsWith(join(root, 'dist')) && await exists(distPath)) {
    const body = await readFile(distPath);
    res.writeHead(200, { 'content-type': types[extname(distPath).toLowerCase()] || 'application/octet-stream' });
    return res.end(body);
  }
  const allowedPublicAsset = file === '/index.html' || file === '/styles.css' || file === '/ai-quest-team-workbook.html' || file === '/ai-quest-guided-workbook.html' || file.startsWith('/workbook/') || file.startsWith('/src/') || file.startsWith('/build-assets/') || file.startsWith('/assets/company-logos/') || file.startsWith('/assets/brand/');
  if (!allowedPublicAsset) return notFound(res);
  const path = normalize(join(root, file));
  if (!path.startsWith(root)) return notFound(res);
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': types[extname(path).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch { notFound(res); }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = parseUrl(req);
    if (url.pathname.startsWith('/api/uploads/')) {
      url.pathname = url.pathname.replace(/^\/api/, '');
      return await serveStatic(req, res, url);
    }
    if (url.pathname.startsWith('/api/')) {
      if (!checkRateLimit(req, res, apiRateLimit)) return;
      if (isUploadApiRequest(req, url.pathname) && !checkRateLimit(req, res, uploadRateLimit)) return;
      return await handleApi(req, res, url);
    }
    return await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    send(res, 500, { error: 'server_error', detail: error.message });
  }
});

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => console.log(`AI Quest JSON server running: http://${host}:${port}`));
