import { Repositories as LocalRepositories } from './Repositories.js';

export class ApiRepositories {
  constructor(baseUrl = '') { this.baseUrl = baseUrl.replace(/\/$/, ''); }
  url(path) { return `${this.baseUrl}${path}`; }
  staffHeaders() {
    const storage = typeof sessionStorage === 'undefined' ? null : sessionStorage;
    const code = storage?.getItem('aiQuest.staffCode') || '';
    const role = storage?.getItem('aiQuest.staffRole') || '';
    return code ? { 'x-ai-quest-code': code, 'x-ai-quest-role': role } : {};
  }
  async json(path, options = {}) {
    const res = await fetch(this.url(path), { cache: 'no-store', headers: { 'content-type': 'application/json', ...this.staffHeaders(), ...(options.headers || {}) }, ...options });
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || `api_error_${res.status}`); }
    return res.json();
  }
  async listActiveEvents() { return this.json('/api/events/active'); }
  async getEventByCode(code) { return this.json(`/api/events/by-code/${encodeURIComponent(String(code || '').replace(/\s+/g, '').trim())}`); }
  async getEventConfig(eventId) { return this.json(`/api/events/${encodeURIComponent(eventId)}/config`); }
  async listEventTeams(eventId) { return this.json(`/api/events/${encodeURIComponent(eventId)}/team-access`); }
  async listEventTeamsForStaff(eventId) { return this.json(`/api/staff/events/${encodeURIComponent(eventId)}/team-access`); }
  async createTeam(data) { return this.json('/api/teams/session', { method: 'POST', body: JSON.stringify(data) }); }
  async getTeam(id) { return this.json(`/api/teams/${encodeURIComponent(id)}`); }
  teamStreamUrl(id) { return this.url(`/api/teams/${encodeURIComponent(id)}/stream`); }
  async saveTeam(team) { return this.json(`/api/teams/${encodeURIComponent(team.id)}`, { method: 'PATCH', body: JSON.stringify(team) }); }
  async listTeams(eventId) { return this.json(`/api/events/${encodeURIComponent(eventId)}/teams`); }
  eventStreamUrl(eventId) { return this.url(`/api/events/${encodeURIComponent(eventId)}/stream`); }
  async completeCompany(teamId, sub) {
    if (sub.photoFile && sub.photoFile.size) {
      const fd = new FormData();
      fd.append('payload', JSON.stringify({ companyId: sub.companyId, answers: sub.answers || {} }));
      fd.append('photo', sub.photoFile);
      const res = await fetch(this.url(`/api/teams/${encodeURIComponent(teamId)}/complete-company`), { method: 'POST', body: fd, headers: this.staffHeaders() });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || `api_error_${res.status}`); }
      return res.json();
    }
    return this.json(`/api/teams/${encodeURIComponent(teamId)}/complete-company`, { method: 'POST', body: JSON.stringify({ companyId: sub.companyId, answers: sub.answers || {} }) });
  }
  async saveSubmission(sub) {
    if (sub.photoFile) {
      const fd = new FormData();
      fd.append('teamId', sub.teamId);
      fd.append('companyId', sub.companyId);
      fd.append('answers', JSON.stringify(sub.answers || {}));
      fd.append('awardedPoints', String(sub.awardedPoints || 0));
      fd.append('status', sub.status || 'completed');
      fd.append('photo', sub.photoFile);
      const res = await fetch(this.url('/api/submissions/logo-photo'), { method: 'POST', body: fd, headers: this.staffHeaders() });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || `api_error_${res.status}`); }
      return res.json();
    }
    return this.json('/api/submissions', { method: 'POST', body: JSON.stringify(sub) });
  }
  async listAllSubmissions() { return this.json('/api/submissions'); }
  async reviewSubmission(id, status) { return this.json(`/api/submissions/${encodeURIComponent(id)}/review`, { method: 'PATCH', body: JSON.stringify({ status }) }); }
  async deleteSubmission(id) { return this.json(`/api/submissions/${encodeURIComponent(id)}/delete`, { method: 'POST', body: '{}' }); }
  async askAiHelper(teamId, question, companyId = '') { return this.json(`/api/teams/${encodeURIComponent(teamId)}/ai-helper`, { method: 'POST', body: JSON.stringify({ question, companyId }) }); }
  async requestCheckpoint(teamId, input = {}) {
    if (input.photoFile) {
      const fd = new FormData();
      fd.append('checkpoint', JSON.stringify({ ...(input.checkpoint || {}), autoApprove: !!input.autoApprove }));
      fd.append('photoName', input.photoName || input.photoFile.name || 'checkpoint-photo');
      fd.append('photo', input.photoFile);
      const res = await fetch(this.url(`/api/teams/${encodeURIComponent(teamId)}/checkpoint-request`), { method: 'POST', body: fd, headers: this.staffHeaders() });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || `api_error_${res.status}`); }
      return res.json();
    }
    return this.json(`/api/teams/${encodeURIComponent(teamId)}/checkpoint-request`, { method: 'POST', body: JSON.stringify({ checkpoint: { ...(input.checkpoint || input), autoApprove: !!input.autoApprove } }) });
  }
  async reviewCheckpoint(teamId, approved, note = '') { return this.json(`/api/teams/${encodeURIComponent(teamId)}/checkpoint-review`, { method: 'POST', body: JSON.stringify({ approved, note }) }); }
  async addBonus(teamId, points = 5, note = 'המדריך הוסיף בונוס.') { return this.json(`/api/teams/${encodeURIComponent(teamId)}/bonus`, { method: 'POST', body: JSON.stringify({ points, note }) }); }
  async sendMessage(teamId, text) { return this.json(`/api/teams/${encodeURIComponent(teamId)}/message`, { method: 'POST', body: JSON.stringify({ text }) }); }
  async sendGroupMessage(eventId, text, teamIds = null) { return this.json(`/api/events/${encodeURIComponent(eventId)}/message`, { method: 'POST', body: JSON.stringify({ text, teamIds }) }); }
  async pauseEvent(eventId, paused = true) { return this.json(`/api/events/${encodeURIComponent(eventId)}/pause`, { method: 'POST', body: JSON.stringify({ paused }) }); }
  async finalizeEvent(eventId) { return this.json(`/api/events/${encodeURIComponent(eventId)}/finalize`, { method: 'POST', body: '{}' }); }
  async resetTeam(teamId) { return this.json(`/api/teams/${encodeURIComponent(teamId)}/reset`, { method: 'POST', body: '{}' }); }
  async saveCompany(company) { return this.json('/api/admin/companies', { method: 'POST', body: JSON.stringify(company) }); }
  async saveQuestion(question) { return this.json('/api/admin/questions', { method: 'POST', body: JSON.stringify(question) }); }
  async saveProblem(problem) { return this.json('/api/admin/model-problems', { method: 'POST', body: JSON.stringify(problem) }); }
  async saveEvent(event) { return this.json('/api/admin/events', { method: 'POST', body: JSON.stringify(event) }); }
  async uploadPuzzleImage(eventId, file, pieceCount = 12) { const fd = new FormData(); fd.append('pieceCount', String(pieceCount)); fd.append('image', file); const res = await fetch(this.url(`/api/admin/events/${encodeURIComponent(eventId)}/puzzle-image`), { method: 'POST', body: fd, headers: this.staffHeaders() }); if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || `api_error_${res.status}`); } return res.json(); }
  async duplicateEvent(eventId, data = {}) { return this.json(`/api/admin/events/${encodeURIComponent(eventId)}/duplicate`, { method: 'POST', body: JSON.stringify(data) }); }
  async deleteEvent(eventId) { return this.json(`/api/admin/events/${encodeURIComponent(eventId)}/delete`, { method: 'POST', body: '{}' }); }
  async eventResults(eventId, format = 'json') { return format === 'csv' ? fetch(this.url(`/api/admin/events/${encodeURIComponent(eventId)}/results?format=csv`), { headers: this.staffHeaders() }).then(async r => { if (!r.ok) throw new Error(`api_error_${r.status}`); return r.text(); }) : this.json(`/api/admin/events/${encodeURIComponent(eventId)}/results`); }
  async state() { return this.json('/api/state'); }
  async reset() { return this.json('/api/admin/reset-runtime', { method: 'POST', body: '{}' }); }
}

export async function createRepository() {
  const params = new URLSearchParams(window.location.search);
  const allowDemoFallback = params.get('demo') === '1' || params.get('local') === '1';
  const appBase = new URL('.', window.location.href).pathname.replace(/\/$/, '');
  const candidates = [appBase ? `${appBase}/api` : '/api', '/api'];
  for (const apiBase of candidates) {
    try {
      const res = await fetch(`${apiBase}/health`, { cache: 'no-store' });
      if (res.ok) return new ApiRepositories(apiBase.replace(/\/api$/, ''));
    } catch {}
  }
  if (allowDemoFallback) {
    console.warn('AI Quest API unavailable; using explicit localStorage demo mode.');
    return new LocalRepositories();
  }
  throw new Error('api_unavailable');
}
