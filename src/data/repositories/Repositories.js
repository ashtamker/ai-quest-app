import { LocalStore } from '../data-sources/local/LocalStore.js';
const uid = p => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const defaultCheckpointStops = () => [
  { id: 'cp-food-break', type: 'food_photo', threshold: 4, title: 'עצירת אוכל / טעינה', autoApprove: true, piece: '' },
  { id: 'cp-leumi-funding', type: 'funding_photo', threshold: 7, title: 'מימון מבנק לאומי', autoApprove: true, piece: '', description: 'קיבלתם מימון לחברה שלכם מבנק לאומי. צלמו או העלו לוגו של בנק לאומי כדי להמשיך.' },
  { id: 'cp-instructor-1', type: 'instructor_approval', threshold: 10, title: 'צ׳קפוינט מדריך 1', piece: 'חלק 1' },
  { id: 'cp-instructor-2', type: 'instructor_approval', threshold: 17, title: 'צ׳קפוינט מדריך 2', piece: 'חלק 2' },
  { id: 'cp-instructor-3', type: 'instructor_approval', threshold: 24, title: 'צ׳קפוינט מדריך 3', piece: 'חלק 3' }
];
const sanitizeCheckpointStops = stops => {
  const base = defaultCheckpointStops(), source = Array.isArray(stops) && stops.length ? stops : base;
  return source.slice(0,5).map((stop,i)=>{const fallback=base[i]||base[base.length-1],type=['food_photo','funding_photo'].includes(stop.type)?stop.type:'instructor_approval';return {...fallback,...stop,id:stop.id||fallback.id,type,threshold:Math.max(1,Math.min(65,Number(stop.threshold||fallback.threshold||4))),autoApprove:type!=='instructor_approval',piece:type!=='instructor_approval'?'':String(stop.piece||fallback.piece||`חלק ${i}`).trim()};}).sort((a,b)=>a.threshold-b.threshold);
};

const participantName = input => String(input.participantName || input.playerName || input.nickname || '').trim().slice(0,40);
const upsertParticipant = (team,name) => { const clean=String(name||'').trim().slice(0,40); if(!clean)return team; const now=new Date().toISOString(), norm=clean.toLowerCase(), list=Array.isArray(team.participants)?[...team.participants]:[], i=list.findIndex(p=>String(p.name||'').trim().toLowerCase()===norm); if(i>=0)list[i]={...list[i],name:clean,lastSeenAt:now}; else list.push({id:uid('participant'),name:clean,joinedAt:now,lastSeenAt:now}); return {...team,participants:list,participantsCount:Math.max(Number(team.participantsCount||0),list.length)}; };
const defaultTeamAccess = () => [
  { id: 'red', name: 'צוות אדום', password: 'R4821' },
  { id: 'white', name: 'צוות לבן', password: 'W7394' },
  { id: 'blue', name: 'צוות כחול', password: 'B5168' },
  { id: 'green', name: 'צוות ירוק', password: 'G2947' },
  { id: 'yellow', name: 'צוות צהוב', password: 'Y8635' },
  { id: 'purple', name: 'צוות סגול', password: 'P1476' }
];

export class Repositories {
  constructor(store = new LocalStore()) { this.store = store; }
  async listActiveEvents() { return this.store.read().events.filter(e => e.active).map(({ teamAccess, ...event }) => ({ ...event, teamAccess: (teamAccess || defaultTeamAccess()).map(({ id, name }) => ({ id, name })) })); }
  async getEventByCode(code) { const clean=String(code||'').replace(/\s+/g,'').trim().toLowerCase(); return this.store.read().events.find(e => String(e.code||'').replace(/\s+/g,'').trim().toLowerCase() === clean && e.active); }
  async getEventConfig(eventId) { const s = this.store.read(), event = s.events.find(e => e.id === eventId); return { event, modelProblem: s.modelProblems.find(p => p.id === event?.selectedModelProblemId), companies: s.companies.filter(c => event?.activeCompanyIds.includes(c.id) && c.active), questions: s.questions, abilities: s.abilities, content: s.content || { openingStory: {}, glossary: [] } }; }
  async listEventTeams(eventId) { const event = this.store.read().events.find(e => e.id === eventId); return (event?.teamAccess || defaultTeamAccess()).map(({ id, name }) => ({ id, name })); }
  async createTeam(data) { const s = this.store.read(), event=s.events.find(e=>e.id===data.eventId), access=(event?.teamAccess||defaultTeamAccess()), selected=access.find(t=>t.id===data.teamAccessId||t.name===data.name); if((event?.teamAccess||[]).length&&!selected) throw Error('team_required'); if(selected&&String(data.password||'')!==String(selected.password||'')) throw Error('invalid_team_password'); const player=participantName(data); if(selected&&!player) throw Error('participant_name_required'); const stableId=selected?`${event.id}-${selected.id}`:uid('team'), existing=s.teams.find(t=>t.id===stableId); if(existing){const updated=upsertParticipant({...existing,name:selected?.name||data.name,teamAccessId:selected?.id,language:data.language||existing.language,activityDuration:Number(data.activityDuration||existing.activityDuration||90),participantsCount:Number(data.participantsCount||existing.participantsCount||1),lastActivityAt:new Date().toISOString()},player); Object.assign(existing,updated); this.store.write(s); return existing;} let team = { id: stableId, currentStage: 1, score: 0, modelQuality: 0, collectedAbilities: [], completedCompanies: [], foundCompanies: [], checkpointStatus: 'none', checkpoints: [], puzzlePieces: [], repairs: [], messages: [], needsPhotoFixCompanies: [], participants: [], lastActivityAt: new Date().toISOString(), createdAt: new Date().toISOString(), ...data, name:selected?.name||data.name, teamAccessId:selected?.id||data.teamAccessId }; team=upsertParticipant(team,player); s.teams.push(team); this.store.write(s); return team; }
  async saveTeam(team) { const s = this.store.read(), i = s.teams.findIndex(t => t.id === team.id); team.lastActivityAt = new Date().toISOString(); i >= 0 ? s.teams[i] = team : s.teams.push(team); this.store.write(s); return team; }
  async getTeam(id) { return this.store.read().teams.find(t => t.id === id); }
  async listTeams(eventId) { const s=this.store.read(), event=s.events.find(e=>e.id===eventId), valid=new Set((event?.teamAccess||defaultTeamAccess()).map(t=>t.id)); return s.teams.filter(t => t.eventId === eventId && (!(event?.teamAccess||[]).length || valid.has(t.teamAccessId))); }
  async completeCompany(teamId, sub) { const s=this.store.read(), team=s.teams.find(t=>t.id===teamId), company=s.companies.find(c=>c.id===sub.companyId), event=s.events.find(e=>e.id===team?.eventId); if(event?.gameStatus==='paused'||event?.pausedAt)throw Error('game_paused'); if(!team||!company)return null; if((team.completedCompanies||[]).includes(company.id)&&!(team.needsPhotoFixCompanies||[]).includes(company.id))return {team,alreadyCompleted:true}; const qs=s.questions.filter(q=>q.companyId===company.id&&q.active); let points=5,correct=0; const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' '); qs.forEach(q=>{const ok=(q.type||'single')==='short'?((q.acceptedKeywords||[]).map(norm).filter(Boolean).some(k=>norm(sub.answers?.[q.id]).includes(k))||norm(sub.answers?.[q.id])===norm(q.correctText)):Number(sub.answers?.[q.id])===Number(q.correctAnswer); if(ok){points+=Number(q.points||0);correct++;}}); if(qs.length&&correct===qs.length)points+=5; const logoBonus=sub.photoFile?5:0; team.collectedAbilities=[...new Set([...(team.collectedAbilities||[]),...(company.abilityIds||[])])]; team.completedCompanies=[...new Set([...(team.completedCompanies||[]),company.id])]; team.needsPhotoFixCompanies=(team.needsPhotoFixCompanies||[]).filter(id=>id!==company.id); team.score=(team.score||0)+points+logoBonus; team.lastActivityAt=new Date().toISOString(); const r={id:uid('sub'),createdAt:new Date().toISOString(),instructorReviewStatus:sub.photoFile?'pending':'no_photo',...sub,awardedPoints:points+logoBonus,taskPoints:points,logoBonus}; s.submissions.push(r); this.store.write(s); return {team,submission:r,alreadyCompleted:false}; }
  async saveSubmission(sub) { const s = this.store.read(), r = { id: uid('sub'), createdAt: new Date().toISOString(), instructorReviewStatus: 'pending', ...sub }; s.submissions.push(r); this.store.write(s); return r; }
  async listAllSubmissions() { return this.store.read().submissions; }
  async reviewSubmission(id, status) {
    const s = this.store.read(), sub = s.submissions.find(x => x.id === id);
    if (sub) {
      sub.instructorReviewStatus = status;
      if (status === 'invalid') this.applyInvalidPhotoReview(s, sub);
    }
    this.store.write(s);
    return sub;
  }
  applyInvalidPhotoReview(s, sub) {
    const team = s.teams.find(t => t.id === sub.teamId), company = s.companies.find(c => c.id === sub.companyId);
    if (!team || !company) return;
    team.completedCompanies = [...new Set([...(team.completedCompanies || []), company.id])];
    team.needsPhotoFixCompanies = [...new Set([...(team.needsPhotoFixCompanies || []), company.id])];
    team.collectedAbilities = [...new Set([...(team.collectedAbilities || []), ...(company.abilityIds || [])])];
    team.score = Math.max(0, (team.score || 0) - 5);
    team.messages = [...(team.messages || []), { text: `צילום הלוגו של ${company.nameHe || company.id} סומן כלא תקין. החברה נשארת מושלמת, אך בונוס הלוגו ירד.`, at: new Date().toISOString() }];
  }
  async deleteSubmission(id) { const s=this.store.read(), before=s.submissions.length; s.submissions=s.submissions.filter(x=>x.id!==id); this.store.write(s); return {ok:s.submissions.length<before,removedId:id}; }
  async askAiHelper(teamId, question, companyId='') { const s=this.store.read(), team=s.teams.find(t=>t.id===teamId), event=s.events.find(e=>e.id===team?.eventId); if(event?.gameStatus==='paused'||event?.pausedAt)throw Error('game_paused'); const companies=s.companies.filter(c=>event?.activeCompanyIds?.includes(c.id)); const q=String(question||'').trim().toLowerCase(), selected=companies.find(c=>c.id===companyId)||companies.find(c=>[c.nameHe,c.nameAr,c.nameEn,...(c.aliases||[])].join(' ').toLowerCase().split(/\s+/).some(w=>q.includes(w)&&w.length>1)); const answer=selected?`${selected.nameHe||selected.nameEn}: ${selected.field||''}. ${team?.language==='ar'?(selected.descriptionAr||selected.descriptionHe||''):(selected.descriptionHe||selected.descriptionAr||'')} טיפ: שאלו מה החברה עושה ואיך זה קשור ל-AI.`:'אני יכול לעזור להבין חברות, להסביר את האפליקציה או להציע שאלה למדריך. נסו לשאול על חברה ספציפית.'; const awarded=team&&!team.aiHelperBonusAwarded?3:0; if(team){team.aiHelperUses=(team.aiHelperUses||0)+1; team.aiHelperBonusAwarded=true; team.score=(team.score||0)+awarded; team.lastActivityAt=new Date().toISOString(); if(awarded)team.messages=[...(team.messages||[]),{text:'קיבלתם 3 נק׳ בונוס על שימוש בעוזר AI בצורה לימודית.',at:new Date().toISOString(),scope:'ai-helper'}]; this.store.write(s);} return {answer,awarded,team}; }
  async saveCompany(company) { const s = this.store.read(); if (!company.id) company.id = uid('company'); const i = s.companies.findIndex(c => c.id === company.id); i >= 0 ? s.companies[i] = company : (s.companies.push(company), s.events[0].activeCompanyIds.push(company.id)); this.store.write(s); return company; }
  async saveQuestion(question) { const s = this.store.read(); if (!question.id) question.id = uid('question'); const i = s.questions.findIndex(q => q.id === question.id); i >= 0 ? s.questions[i] = question : s.questions.push(question); this.store.write(s); return question; }
  async saveProblem(problem) { const s = this.store.read(); const i = s.modelProblems.findIndex(p => p.id === problem.id); if (i >= 0) s.modelProblems[i] = problem; this.store.write(s); return problem; }
  async saveEvent(event) { const s = this.store.read(); if (!event.id) event.id = uid('event'); event.code = String(event.code || '').replace(/\s+/g, '').trim().toUpperCase(); event.checkpointConfig={...(event.checkpointConfig||{}),stops:sanitizeCheckpointStops(event.checkpointConfig?.stops)}; const i = s.events.findIndex(e => e.id === event.id); i >= 0 ? s.events[i] = event : s.events.push(event); this.store.write(s); return event; }
  async uploadPuzzleImage(eventId, file, pieceCount = 12) { const s = this.store.read(), event = s.events.find(e => e.id === eventId); if (!event) return null; event.puzzleConfig = { ...(event.puzzleConfig || {}), imageUrl: '', imageName: file?.name || 'local-demo-puzzle', pieceCount: Math.max(1, Math.min(48, Number(pieceCount || 12))) }; this.store.write(s); return event; }
  async duplicateEvent(eventId, data = {}) { const s = this.store.read(), source = s.events.find(e => e.id === eventId); if (!source) return null; const { finalizedAt, pausedAt, pauseMessageHe, pauseMessageAr, ...settings } = source; const copy = { ...settings, id: uid('event'), name: data.name || `${source.name} — עותק`, code: String(data.code || `${source.code || 'EVENT'}COPY`).replace(/\s+/g, '').trim().toUpperCase(), active: data.active ?? false, gameStatus: 'running', createdAt: new Date().toISOString() }; s.events.push(copy); this.store.write(s); return copy; }
  async deleteEvent(eventId) { const s=this.store.read(), event=s.events.find(e=>e.id===eventId); if(!event)return null; if(s.events.length<=1)throw Error('cannot_delete_last_event'); if(event.active)throw Error('cannot_delete_active_event'); const teamIds=new Set(s.teams.filter(t=>t.eventId===eventId).map(t=>t.id)); const result={ok:true,eventId,deletedTeams:teamIds.size,deletedSubmissions:s.submissions.filter(x=>teamIds.has(x.teamId)).length,deletedCheckpointRequests:(s['checkpoint-requests']||[]).filter(x=>teamIds.has(x.teamId)).length,deletedFiles:0}; s.events=s.events.filter(e=>e.id!==eventId); s.teams=s.teams.filter(t=>t.eventId!==eventId); s.submissions=s.submissions.filter(x=>!teamIds.has(x.teamId)); s['checkpoint-requests']=(s['checkpoint-requests']||[]).filter(x=>!teamIds.has(x.teamId)); s.instructorMessages=(s.instructorMessages||[]).filter(m=>m.eventId!==eventId); this.store.write(s); return result; }
  async eventResults(eventId, format = 'json') { const s = this.store.read(), event = s.events.find(e => e.id === eventId), rows = s.teams.filter(t => t.eventId === eventId).map(t => ({ teamId: t.id, teamName: t.name, language: t.language, duration: t.activityDuration, participants: t.participantsCount, score: t.score || 0, completedCompanies: (t.completedCompanies || []).length, abilities: (t.collectedAbilities || []).length, puzzlePieces: (t.puzzlePieces || []).length, checkpointsApproved: (t.checkpoints || []).filter(c => c.status === 'approved' && c.type !== 'food_photo').length, checkpointsRejected: (t.checkpoints || []).filter(c => c.status === 'rejected').length, photoRetakes: (t.needsPhotoFixCompanies || []).length })); if (format === 'csv') { const headers = Object.keys(rows[0] || { teamId: '', teamName: '', score: '', completedCompanies: '' }); const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`; return [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n'); } return { event, teams: rows, totals: { teams: rows.length, students: rows.reduce((sum, r) => sum + Number(r.participants || 0), 0) } }; }
  async requestCheckpoint(teamId, input = {}) {
    const s = this.store.read(), team = s.teams.find(t => t.id === teamId), cp = input.checkpoint || {};
    if (!team) return null;
    const autoApprove=!!(input.autoApprove||cp.autoApprove);
    const record = { id: uid('checkpoint'), planId: cp.id, type: cp.type || 'instructor_approval', title: cp.title || 'צ׳קפוינט', description: cp.description || '', threshold: cp.threshold || 0, piece: cp.piece || '', status: autoApprove?'approved':'requested', photoName: input.photoName || '', photoUrl: '', createdAt: new Date().toISOString(), ...(autoApprove?{reviewedAt:new Date().toISOString(),autoApproved:true}:{}) };
    team.checkpoints = [...(team.checkpoints || []), record];
    if(autoApprove){team.messages=[...(team.messages||[]),{text:team.language==='ar'?'تم تسجيل استراحة الطعام. يمكنكم المتابعة.':'עצירת האוכל נקלטה. אפשר להמשיך.',at:new Date().toISOString()}]}else{team.checkpointStatus = 'requested';s.checkpointRequests = [...(s.checkpointRequests || []), { ...record, teamId }];}
    this.store.write(s);
    return team;
  }
  async reviewCheckpoint(teamId, approved = true, note = '') {
    const s = this.store.read(), team = s.teams.find(t => t.id === teamId);
    if (!team) return null;
    const pending = (team.checkpoints || []).find(c => c.status === 'requested');
    team.checkpoints = (team.checkpoints || []).map(c => c.id === pending?.id ? { ...c, status: approved ? 'approved' : 'rejected', reviewedAt: new Date().toISOString(), note } : c);
    team.checkpointStatus = approved ? 'approved' : 'rejected';
    if (approved) {
      team.currentStage = (team.currentStage || 1) + 1;
      if (pending?.piece) team.puzzlePieces = [...new Set([...(team.puzzlePieces || []), pending.piece])];
    }
    team.messages = [...(team.messages || []), { text: note || (approved ? `הצ׳קפוינט אושר. קיבלתם חלק פאזל: ${pending?.piece || 'המשך'}` : 'הצ׳קפוינט נדחה. חזרו למשימה ונסו שוב.'), at: new Date().toISOString() }];
    s.checkpointRequests = (s.checkpointRequests || []).map(r => r.id === pending?.id ? { ...r, status: approved ? 'approved' : 'rejected', note, reviewedAt: new Date().toISOString() } : r);
    this.store.write(s);
    return team;
  }
  async sendMessage(teamId, text) {
    const s = this.store.read(), team = s.teams.find(t => t.id === teamId);
    if (!team) return null;
    team.messages = [...(team.messages || []), { text, at: new Date().toISOString() }];
    this.store.write(s);
    return team;
  }
  async addBonus(teamId, points = 5, note = 'המדריך הוסיף בונוס.') {
    const s = this.store.read(), team = s.teams.find(t => t.id === teamId);
    if (!team) return null;
    team.score = (team.score || 0) + Number(points);
    team.messages = [...(team.messages || []), { text: note, at: new Date().toISOString() }];
    this.store.write(s);
    return team;
  }
  async sendGroupMessage(eventId, text, teamIds = null) {
    const s = this.store.read(), ids = Array.isArray(teamIds) ? new Set(teamIds) : null, at = new Date().toISOString();
    let count = 0;
    s.teams.forEach(t => { if (t.eventId === eventId && (!ids || ids.has(t.id))) { count++; t.messages = [...(t.messages || []), { text, at, scope: 'group' }]; } });
    s.instructorMessages = [...(s.instructorMessages || []), { id: uid('message'), eventId, teamIds: ids ? [...ids] : 'all', text, at }];
    this.store.write(s);
    return { ok: true, count };
  }
  async pauseEvent(eventId, paused=true) { const s=this.store.read(), event=s.events.find(e=>e.id===eventId), at=new Date().toISOString(); if(!event)return null; event.gameStatus=paused?'paused':'running'; if(paused)event.pausedAt=at; else delete event.pausedAt; s.teams.forEach(t=>{if(t.eventId===eventId)t.messages=[...(t.messages||[]),{text:paused?'המשחק נעצר זמנית על ידי המדריך. המתינו להנחיות להמשך.':'המשחק נפתח מחדש. אפשר להמשיך.',at,scope:paused?'pause':'resume'}]}); this.store.write(s); return {ok:true,event,paused}; }
  async finalizeEvent(eventId) {
    const s = this.store.read(), event = s.events.find(e => e.id === eventId), at = new Date().toISOString();
    if (!event) return null;
    event.finalizedAt = at;
    s.teams.forEach(t => { if (t.eventId === eventId) t.messages = [...(t.messages || []), { text: t.language === 'ar' ? 'انتهت مرحلة البحث. انتقلوا إلى المهمة النهائية لبناء النموذج المحسّن.' : 'שלב החקר הסתיים. עברו למשימה הסופית לבניית המודל המשופר.', at, scope: 'final' }]; });
    this.store.write(s);
    return { ok: true, event, finalizedAt: at };
  }
  async resetTeam(teamId) {
    const s = this.store.read(), team = s.teams.find(t => t.id === teamId);
    if (!team) return null;
    Object.assign(team, { currentStage: 1, score: 0, modelQuality: 0, collectedAbilities: [], completedCompanies: [], foundCompanies: [], checkpointStatus: 'none', repairs: [], checkpoints: [], puzzlePieces: [], needsPhotoFixCompanies: [], aiHelperUses: 0, aiHelperBonusAwarded: false, messages: [{ text: 'המדריך איפס את ההתקדמות שלכם. התחילו שוב מהחברה הראשונה.', at: new Date().toISOString() }], lastActivityAt: new Date().toISOString() });
    s.submissions = s.submissions.filter(x => x.teamId !== teamId);
    s.checkpointRequests = (s.checkpointRequests || []).filter(x => x.teamId !== teamId);
    this.store.write(s);
    return team;
  }
  async state() { return this.store.read(); }
  reset() { this.store.reset(); }
}
