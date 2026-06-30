import { ApproveCheckpoint, puzzlePieces } from '../../domain/use-cases/useCases.js';
import { card } from '../shared/dom.js';

const AUTO_REFRESH_MS = 15000;

const I18N={
  he:{title:'דשבורד מדריך',subtitle:'מסך פעולה לשטח: רענון אוטומטי, חיפוש, סינון, הודעות ואיפוס צוותים.',updated:'עודכן',autoRefresh:'רענון אוטומטי כל',seconds:'שניות',refresh:'רענון עכשיו',action:'דורש פעולה',waiting:'ממתינים לצ׳קפוינט',photos:'תמונות לבדיקה',allTeams:'כל הצוותים',checkpoints:'צ׳קפוינטים',stuck:'תקועים',photosShort:'תמונות',invalid:'לא תקין',searchTeam:'חיפוש צוות',searchPlaceholder:'שם צוות / שפה / סטטוס',messageVisible:'הודעה לצוותים המוצגים',messageAll:'הודעה לכל הצוותים',resetAll:'איפוס כל נתוני הפעילות',emptyTitle:'אין כרגע פריטים לטיפול',emptyHint:'נסו לשנות סינון/חיפוש או להמתין לרענון הבא.',statusCheckpoint:'ממתין לצ׳קפוינט',statusPhoto:'תמונה לבדיקה',statusStuck:'נראה תקוע',statusDone:'סיים יעד',statusActive:'פעיל',hebrew:'עברית',arabic:'ערבית',minutes:'דקות',stage:'שלב',companies:'חברות',score:'ניקוד',abilities:'יכולות',puzzlePieces:'חלקי פאזל',activity:'פעילות',approve:'אשר ותן חלק פאזל',reject:'דחה עם הערה',bonus:'בונוס',message:'הודעה',resetTeam:'איפוס צוות',noCompanies:'אין חברות עדיין',logoPhoto:'צילום לוגו',team:'צוות',taskScore:'ניקוד משימה',markValid:'סמן תקין',markInvalid:'סמן לא תקין',noPhotos:'אין תמונות בקטגוריה הזו',now:'עכשיו',controlRoom:'חדר בקרה שטח',queueTitle:'תור טיפול עכשיו',queueHint:'סדר עדיפויות: צ׳קפוינט → תמונה לבדיקה → תקוע → פעיל.',waitingTime:'זמן המתנה',currentCheckpoint:'צ׳קפוינט נוכחי',recentCompanies:'חברות אחרונות',recentMessages:'הודעות אחרונות',participantsList:'משתתפים בצוות',quickMessage:'הודעה מהירה',checkGuide:'בדיקת מדריך: הצוות הגיע פיזית, יודע להסביר מה למד, ומוכן להמשיך.',priority:'עדיפות',finishActivity:'סיים פעילות ופתח משימה סופית',finalized:'הפעילות הסתיימה — המשימה הסופית פתוחה',leaderboard:'טבלת ניקוד',rank:'מקום',teamPasswords:'צוותים וסיסמאות',password:'סיסמה'},
  ar:{title:'لوحة المرشد',subtitle:'لوحة عمل ميدانية: تحديث تلقائي، بحث، تصفية، رسائل وإعادة ضبط الفرق.',updated:'تم التحديث',autoRefresh:'تحديث تلقائي كل',seconds:'ثوانٍ',refresh:'تحديث الآن',action:'يتطلب إجراء',waiting:'بانتظار نقطة تحقق',photos:'صور للمراجعة',allTeams:'كل الفرق',checkpoints:'نقاط تحقق',stuck:'فرق متوقفة',photosShort:'صور',invalid:'غير صالح',searchTeam:'بحث عن فريق',searchPlaceholder:'اسم الفريق / اللغة / الحالة',messageVisible:'رسالة للفرق المعروضة',messageAll:'رسالة لكل الفرق',resetAll:'إعادة ضبط كل بيانات النشاط',emptyTitle:'لا توجد عناصر للعلاج الآن',emptyHint:'جرّبوا تغيير التصفية/البحث أو انتظروا التحديث التالي.',statusCheckpoint:'بانتظار نقطة تحقق',statusPhoto:'صورة للمراجعة',statusStuck:'يبدو متوقفًا',statusDone:'أنهى الهدف',statusActive:'نشط',hebrew:'العبرية',arabic:'العربية',minutes:'دقائق',stage:'مرحلة',companies:'شركات',score:'نقاط',abilities:'قدرات',puzzlePieces:'قطع أحجية',activity:'نشاط',approve:'وافق وأعطِ قطعة أحجية',reject:'ارفض مع ملاحظة',bonus:'مكافأة',message:'رسالة',resetTeam:'إعادة ضبط الفريق',noCompanies:'لا توجد شركات بعد',logoPhoto:'صورة شعار',team:'فريق',taskScore:'نقاط المهمة',markValid:'صالح',markInvalid:'غير صالح',noPhotos:'لا توجد صور في هذه الفئة',now:'الآن',controlRoom:'غرفة متابعة ميدانية',queueTitle:'قائمة العلاج الآن',queueHint:'الأولوية: نقطة تحقق ← صورة للمراجعة ← فريق متوقف ← نشط.',waitingTime:'وقت الانتظار',currentCheckpoint:'نقطة التحقق الحالية',recentCompanies:'آخر الشركات',recentMessages:'آخر الرسائل',participantsList:'أعضاء الفريق',quickMessage:'رسالة سريعة',checkGuide:'فحص المرشد: الفريق وصل فعليًا، يعرف شرح ما تعلّمه، وجاهز للمتابعة.',priority:'أولوية',finishActivity:'إنهاء النشاط وفتح المهمة النهائية',finalized:'انتهى النشاط — المهمة النهائية مفتوحة',leaderboard:'جدول النقاط',rank:'المركز',teamPasswords:'الفرق وكلمات المرور',password:'كلمة المرور'}
};

function esc(value = '') {
  return String(value).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

export class InstructorApp {
  constructor(repo, root, appLanguage = 'he') {
    this.repo = repo;
    this.root = root;
    this.appLanguage = appLanguage;
    this.filter = sessionStorage.getItem('aiQuest.instructor.filter') || 'action';
    this.search = sessionStorage.getItem('aiQuest.instructor.search') || '';
    this.lastUpdated = null;
    this.liveStream = null;
    this.liveStreamEventId = null;
  }

  async render() {
    const l=this.appLanguage||localStorage.getItem('aiQuest.language')||'he', tr=I18N[l]||I18N.he;
    const activeEvents = this.repo.listActiveEvents ? await this.repo.listActiveEvents() : [];
    const savedEventId = sessionStorage.getItem('aiQuest.instructor.eventId');
    const event = activeEvents.find(e => e.id === savedEventId) || activeEvents[0] || await this.repo.getEventByCode('GAVYAM');
    sessionStorage.setItem('aiQuest.instructor.eventId', event.id);
    this.ensureLiveStream(event.id);
    const teams = await this.repo.listTeams(event.id);
    const teamAccess = this.repo.listEventTeamsForStaff ? await this.repo.listEventTeamsForStaff(event.id) : (event.teamAccess || []);
    const cfg = await this.repo.getEventConfig(event.id);
    const subs = await this.repo.listAllSubmissions();
    const now = Date.now();
    const pendingPhotos = subs.filter(s => s.instructorReviewStatus === 'pending');
    const invalidPhotos = subs.filter(s => s.instructorReviewStatus === 'invalid');
    const enriched = teams.map(t => ({ ...t, statusKey: this.statusKey(t, now, subs), pendingPhotoCount: pendingPhotos.filter(s => s.teamId === t.id).length }));
    const waiting = enriched.filter(t => t.checkpointStatus === 'requested');
    const stuck = enriched.filter(t => now - new Date(t.lastActivityAt || t.createdAt).getTime() > 1000 * 60 * 12);
    const actionTeams = [...new Map([...waiting, ...enriched.filter(t => t.statusKey === 'photo'), ...stuck].map(t => [t.id, t])).values()].sort((a,b)=>this.priorityScore(b,now)-this.priorityScore(a,now));
    const visible = this.filteredTeams({ teams: enriched, waiting, stuck, actionTeams });
    this.lastUpdated = new Date();

    this.root.innerHTML = `<section class="instructor-shell">
      <div class="instructor-hero control-room-hero"><div><span class="level">${tr.controlRoom}</span><h1>${tr.title}</h1><p>${tr.subtitle}</p><small>${tr.updated}: ${this.lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · ${tr.autoRefresh} ${AUTO_REFRESH_MS / 1000} ${tr.seconds}</small>${activeEvents.length>1?`<label class="event-switch"><span>אירוע</span><select id="instructorEventSelect">${activeEvents.map(e=>`<option value="${esc(e.id)}" ${e.id===event.id?'selected':''}>${esc(e.name||e.code)} · ${esc(e.code)}</option>`).join('')}</select></label>`:`<p class="muted">אירוע: <b>${esc(event.name||event.code)}</b></p>`}</div><button id="refreshDash">${tr.refresh}</button></div>
      <div class="kpi-grid"><button class="kpi" data-filter="action"><b>${actionTeams.length}</b><span>${tr.action}</span></button><button class="kpi" data-filter="waiting"><b>${waiting.length}</b><span>${tr.waiting}</span></button><button class="kpi" data-filter="photos"><b>${pendingPhotos.length}</b><span>${tr.photos}</span></button><button class="kpi" data-filter="all"><b>${teams.length}</b><span>${tr.allTeams}</span></button></div>
      <div class="dash-toolbar">
        <div class="dash-tabs"><button data-filter="action" class="${this.filter === 'action' ? 'active' : ''}">${tr.action}</button><button data-filter="waiting" class="${this.filter === 'waiting' ? 'active' : ''}">${tr.checkpoints}</button><button data-filter="stuck" class="${this.filter === 'stuck' ? 'active' : ''}">${tr.stuck}</button><button data-filter="photos" class="${this.filter === 'photos' ? 'active' : ''}">${tr.photosShort}</button><button data-filter="invalid" class="${this.filter === 'invalid' ? 'active' : ''}">${tr.invalid}</button><button data-filter="all" class="${this.filter === 'all' ? 'active' : ''}">${tr.allTeams}</button></div>
        <label class="dash-search"><span>${tr.searchTeam}</span><input id="teamSearch" value="${esc(this.search)}" placeholder="${tr.searchPlaceholder}"></label>
      </div>
      <div class="bulk-panel"><button id="groupVisible">${tr.messageVisible} (${visible.length})</button><button id="groupAll">${tr.messageAll} (${teams.length})</button><button id="pauseEvent" class="${event.gameStatus==='paused'?'primary':'danger'}">${event.gameStatus==='paused'?'פתח משחק מחדש':'עצור משחק זמנית'}</button><button id="finalizeEvent" class="primary" ${event.finalizedAt?'disabled':''}>${event.finalizedAt?tr.finalized:tr.finishActivity}</button><button id="resetRuntime" class="danger">${tr.resetAll}</button></div>
      ${this.teamPasswordsPanel(teamAccess, tr)}
      ${this.leaderboard(enriched, tr)}
      ${this.treatmentQueue(actionTeams.slice(0,6), cfg, tr, now)}
      ${this.content({ teams: enriched, visible, subs, pendingPhotos, invalidPhotos, cfg, now }, tr)}
    </section>`;
    this.bind(event, visible, teams, tr);
    this.scheduleAutoRefresh();
  }


  async refreshFromServer(reason='manual') {
    try { await this.render(); }
    catch (err) { console.warn('instructor refresh failed', reason, err); alert('לא הצלחנו לרענן את דשבורד המדריך כרגע.'); }
  }

  ensureLiveStream(eventId) {
    if (!this.repo.eventStreamUrl || typeof EventSource === 'undefined') return;
    if (this.liveStreamEventId === eventId && this.liveStream) return;
    this.closeLiveStream();
    this.liveStreamEventId = eventId;
    const stream = new EventSource(this.repo.eventStreamUrl(eventId));
    stream.addEventListener('event-update', () => this.refreshFromServer('sse'));
    stream.onerror = () => {};
    this.liveStream = stream;
  }

  closeLiveStream() {
    if (this.liveStream) { this.liveStream.close(); this.liveStream = null; this.liveStreamEventId = null; }
  }

  scheduleAutoRefresh() {
    clearTimeout(window.aiQuestInstructorTimer);
    window.aiQuestInstructorTimer = setTimeout(() => {
      if (location.hash.replace('#', '') === 'instructor') this.refreshFromServer('fallback');
    }, AUTO_REFRESH_MS);
  }

  priorityScore(t, now) {
    let score = 0;
    if (t.checkpointStatus === 'requested') score += 4000;
    if ((t.pendingPhotoCount || 0) > 0) score += 2500;
    if (t.statusKey === 'stuck') score += 1200;
    const pending = (t.checkpoints || []).find(c => c.status === 'requested');
    if (pending) score += Math.min(900, Math.floor((now - new Date(pending.createdAt || t.lastActivityAt || t.createdAt).getTime()) / 60000) * 20);
    return score;
  }

  statusKey(t, now, subs) {
    if (t.checkpointStatus === 'requested') return 'checkpoint';
    if (subs.some(s => s.teamId === t.id && s.instructorReviewStatus === 'pending')) return 'photo';
    if (now - new Date(t.lastActivityAt || t.createdAt).getTime() > 1000 * 60 * 12) return 'stuck';
    if ((t.completedCompanies || []).length >= (t.activityDuration === 60 ? 4 : t.activityDuration === 90 ? 6 : 10)) return 'done';
    return 'active';
  }

  filteredTeams(data) {
    const base = this.filter === 'waiting' ? data.waiting : this.filter === 'stuck' ? data.stuck : this.filter === 'all' ? data.teams : data.actionTeams;
    const q = this.search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(t => [t.name, t.language, t.checkpointStatus, t.statusKey, String(t.score || 0)].some(x => String(x || '').toLowerCase().includes(q)));
  }

  content(data, tr) {
    if (this.filter === 'photos') return this.photos(data.pendingPhotos.length ? data.pendingPhotos : data.subs, data, tr);
    if (this.filter === 'invalid') return this.photos(data.invalidPhotos, data, tr);
    return `<section class="team-board">${data.visible.map(t => this.teamCard(t, data.cfg, tr, data.now || Date.now())).join('') || card(`<h2>${tr.emptyTitle}</h2><p>${tr.emptyHint}</p>`, 'empty-state')}</section>`;
  }



  teamPasswordsPanel(teamAccess, tr) {
    return `<section class="team-password-panel card"><div class="queue-head"><div><h2>${tr.teamPasswords}</h2><p>מיועד למדריך בלבד — למסירה לתלמידים לפי צוות.</p></div><span>${teamAccess.length}</span></div><div class="team-password-grid">${teamAccess.map(t=>`<div class="team-password-item"><b>${esc(t.name)}</b><code>${esc(t.password || '')}</code><small>${esc(t.id)}</small></div>`).join('')}</div></section>`;
  }

  leaderboard(teams, tr) {
    const rows = [...teams].sort((a,b)=>(b.score||0)-(a.score||0)||String(a.name||'').localeCompare(String(b.name||''))).slice(0,12);
    return `<section class="leaderboard-panel card"><div class="queue-head"><div><h2>${tr.leaderboard}</h2><p>${tr.score} · ${tr.companies} · ${tr.abilities}</p></div><span>${rows.length}</span></div><div class="leaderboard-table-wrap"><table class="leaderboard-table"><thead><tr><th>${tr.rank}</th><th>${tr.team}</th><th>${tr.score}</th><th>${tr.companies}</th><th>${tr.abilities}</th><th>${tr.participantsList}</th></tr></thead><tbody>${rows.map((t,i)=>`<tr><td>${i+1}</td><td>${esc(t.name||t.id)}</td><td><b>${t.score||0}</b></td><td>${(t.completedCompanies||[]).length}</td><td>${(t.collectedAbilities||[]).length}</td><td>${(t.participants||[]).map(p=>esc(p.name)).join(', ')||'-'}</td></tr>`).join('')||`<tr><td colspan="6">${tr.emptyTitle}</td></tr>`}</tbody></table></div></section>`;
  }

  treatmentQueue(teams, cfg, tr, now) {
    if (!teams.length) return card(`<h2>${tr.emptyTitle}</h2><p>${tr.emptyHint}</p>`, 'queue-panel empty-state');
    return `<section class="queue-panel card"><div class="queue-head"><div><h2>${tr.queueTitle}</h2><p>${tr.queueHint}</p></div><span>${teams.length}</span></div><div class="queue-list">${teams.map((t,idx)=>{const pending=(t.checkpoints||[]).find(c=>c.status==='requested'),status=({checkpoint:tr.statusCheckpoint,photo:tr.statusPhoto,stuck:tr.statusStuck,done:tr.statusDone,active:tr.statusActive})[t.statusKey]||t.statusKey,wait=pending?this.timeAgo(pending.createdAt):this.timeAgo(t.lastActivityAt||t.createdAt);return `<button class="queue-item ${t.statusKey}" data-focus-team="${esc(t.id)}"><b>${idx+1}. ${esc(t.name)}</b><span>${status}</span><small>${tr.waitingTime}: ${wait} · ${tr.companies}: ${(t.completedCompanies||[]).length}</small></button>`}).join('')}</div></section>`;
  }

  teamCard(t, cfg, tr, now = Date.now()) {
    const companies = t.completedCompanies?.length || 0;
    const needsAction = t.checkpointStatus === 'requested';
    const last = this.timeAgo(t.lastActivityAt || t.createdAt);
    const status = ({ checkpoint: tr.statusCheckpoint, photo: tr.statusPhoto, stuck: tr.statusStuck, done: tr.statusDone, active: tr.statusActive })[t.statusKey] || t.checkpointStatus;
    const companyNames = (t.completedCompanies || []).slice(-4).map(id => cfg.companies.find(c => c.id === id)?.nameHe || id);
    const pending = (t.checkpoints || []).find(c => c.status === 'requested');
    const pieces = puzzlePieces(t);
    const wait = pending ? this.timeAgo(pending.createdAt) : last;
    const messages = (t.messages || []).slice(-2).reverse();
    const participants = (t.participants || []).map(p => p.name).filter(Boolean);
    const checkpointHtml = pending ? `<div class="checkpoint-review-box"><div class="checkpoint-review-head"><b>${esc(pending.title || 'צ׳קפוינט')}</b><span>${tr.waitingTime}: ${wait}</span></div><p>${esc(pending.description || '')}</p><small>${tr.checkGuide}</small><small>סוג: ${pending.type === 'food_photo' ? 'צילום אוכל / הפסקת טעינה' : 'אישור מדריך'} · חלק פאזל: ${esc(pending.piece || '—')}</small>${pending.photoUrl ? `<img class="photo-thumb checkpoint-photo" src="${esc(pending.photoUrl)}" alt="צילום צ׳קפוינט">` : ''}</div>` : '';
    return `<article class="team-card ${needsAction ? 'urgent' : ''}" id="team-${esc(t.id)}"><div class="team-card-head"><div><h2>${esc(t.name)}</h2><p>${t.language === 'ar' ? tr.arabic : tr.hebrew} · ${t.activityDuration} ${tr.minutes} · ${tr.stage} ${t.currentStage}</p></div><span class="status-badge ${needsAction ? 'warn' : ''}">${status}</span></div><div class="team-stats"><span><b>${companies}</b> ${tr.companies}</span><span><b>${t.score || 0}</b> ${tr.score}</span><span><b>${t.collectedAbilities?.length || 0}</b> ${tr.abilities}</span><span><b>${pieces.length}</b> ${tr.puzzlePieces}</span><span><b>${wait}</b> ${needsAction ? tr.waitingTime : tr.activity}</span></div>${checkpointHtml}<div class="team-detail-grid"><section><h3>${tr.recentCompanies}</h3><div class="chips compact">${companyNames.map(a => `<span>${esc(a)}</span>`).join('') || `<small>${tr.noCompanies}</small>`}</div></section><section><h3>${tr.participantsList}</h3><div class="chips compact">${participants.map(name=>`<span>${esc(name)}</span>`).join('')||`<small>-</small>`}</div></section><section><h3>${tr.recentMessages}</h3>${messages.map(m=>`<p class="mini-note">${esc(m.text||'')}</p>`).join('')||`<small>-</small>`}</section></div><div class="team-actions"><button class="primary" data-approve="${t.id}" ${!needsAction ? 'disabled' : ''}>${tr.approve}</button><button data-reject="${t.id}" ${!needsAction ? 'disabled' : ''}>${tr.reject}</button><button data-quick-message="${t.id}">${tr.quickMessage}</button><button data-bonus="${t.id}">+5 ${tr.bonus}</button><button data-message="${t.id}">${tr.message}</button><button class="danger" data-reset-team="${t.id}">${tr.resetTeam}</button></div></article>`;
  }

  photos(subs, data, tr) {
    return `<section class="photo-board">${subs.map(s => {
      const team = data.teams.find(t => t.id === s.teamId), company = data.cfg.companies.find(c => c.id === s.companyId);
      return `<article class="photo-review"><div><h2>${esc(company?.nameHe || s.companyId || tr.logoPhoto)}</h2><p>${tr.team}: ${esc(team?.name || s.teamId)} · ${tr.taskScore}: ${s.awardedPoints || 0}</p><span class="status-badge">${s.instructorReviewStatus}</span></div>${s.photoUrl ? `<img class="photo-thumb" src="${esc(s.photoUrl)}" alt="${tr.logoPhoto}">` : '<div class="photo-placeholder">LOGO</div>'}<div class="team-actions"><button class="primary" data-ok="${s.id}">${tr.markValid}</button><button data-bad="${s.id}">${tr.markInvalid}</button><button class="danger" data-delete-photo="${s.id}">מחק תמונה</button></div></article>`;
    }).join('') || card(`<h2>${tr.noPhotos}</h2>`, 'empty-state')}</section>`;
  }

  async sendGroup(event, teamIds) {
    const msg = prompt('הודעה קבוצתית:', 'עוד 10 דקות נפגשים לצ׳קפוינט אצל המדריך.');
    if (!msg) return;
    if (this.repo.sendGroupMessage) await this.repo.sendGroupMessage(event.id, msg, teamIds);
    else await Promise.all(teamIds.map(id => this.repo.sendMessage(id, msg)));
    this.render();
  }

  bind(event, visible, allTeams, tr) {
    const eventSelect=this.root.querySelector('#instructorEventSelect');
    if(eventSelect)eventSelect.onchange=()=>{sessionStorage.setItem('aiQuest.instructor.eventId',eventSelect.value);this.closeLiveStream();this.render();};
    this.root.querySelector('#refreshDash').onclick = () => this.refreshFromServer('manual');
    this.root.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { this.filter = b.dataset.filter; sessionStorage.setItem('aiQuest.instructor.filter', this.filter); this.render(); });
    const search = this.root.querySelector('#teamSearch');
    search.oninput = () => { this.search = search.value; sessionStorage.setItem('aiQuest.instructor.search', this.search); clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.render(), 250); };
    this.root.querySelector('#groupVisible').onclick = () => this.sendGroup(event, visible.map(t => t.id));
    this.root.querySelector('#groupAll').onclick = () => this.sendGroup(event, null);
    const pause=this.root.querySelector('#pauseEvent'); if(pause)pause.onclick=async()=>{const paused=event.gameStatus!=='paused';if(confirm(paused?'לעצור זמנית את המשחק? תלמידים לא יוכלו להשלים משימות עד פתיחה מחדש.':'לפתוח את המשחק מחדש לתלמידים?')){await this.repo.pauseEvent(event.id,paused);this.render();}};
    const finalize=this.root.querySelector('#finalizeEvent'); if(finalize&&!finalize.disabled)finalize.onclick=async()=>{if(confirm('לסיים את שלב החקר ולפתוח לכל הצוותים את המשימה הסופית?')){await this.repo.finalizeEvent(event.id);this.render();}};
    this.root.querySelector('#resetRuntime').onclick = async () => { if (confirm(`לאפס את ${tr.allTeams}, ה${tr.photosShort} וה${tr.checkpoints} הפעילים?`)) { await this.repo.reset(); this.render(); } };
    this.root.querySelectorAll('[data-approve]').forEach(b => b.onclick = async () => { await new ApproveCheckpoint(this.repo).execute(b.dataset.approve, true, `הצ׳קפוינט אושר. קיבלתם חלק פאזל דיגיטלי והמשכתם ל${tr.stage} הבא.`); this.render(); });
    this.root.querySelectorAll('[data-reject]').forEach(b => b.onclick = async () => { const note = prompt(`הערה ל${tr.team}:`, 'נסו להשלים עוד חברה או להגיע שוב למדריך.'); if (note === null) return; await new ApproveCheckpoint(this.repo).execute(b.dataset.reject, false, note); this.render(); });
    this.root.querySelectorAll('[data-bonus]').forEach(b => b.onclick = async () => { await this.repo.addBonus?.(b.dataset.bonus, 5, `המדריך הוסיף לכם ${tr.bonus} על עבודת צוות.`); this.render(); });
    this.root.querySelectorAll('[data-quick-message]').forEach(b => b.onclick = async () => { await this.repo.sendMessage(b.dataset.quickMessage, 'גשו למדריך עכשיו לצ׳קפוינט. המשך המשחק ייפתח אחרי אישור.'); this.render(); });
    this.root.querySelectorAll('[data-message]').forEach(b => b.onclick = async () => { const msg = prompt(`${tr.message} ל${tr.team}:`, 'חזרו למדריך כשאתם מסיימים את החברה הנוכחית.'); if (!msg) return; await this.repo.sendMessage(b.dataset.message, msg); this.render(); });
    this.root.querySelectorAll('[data-focus-team]').forEach(b => b.onclick = () => { const el = this.root.querySelector(`#team-${CSS.escape(b.dataset.focusTeam)}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    this.root.querySelectorAll('[data-reset-team]').forEach(b => b.onclick = async () => { const team = allTeams.find(t => t.id === b.dataset.resetTeam); if (confirm(`לאפס את ההתקדמות של ${team?.name || 'הצוות'}?`)) { await this.repo.resetTeam(b.dataset.resetTeam); this.render(); } });
    this.root.querySelectorAll('[data-ok]').forEach(b => b.onclick = async () => { try{await this.repo.reviewSubmission(b.dataset.ok, 'valid'); this.render();}catch(err){alert('לא הצלחנו לעדכן את סטטוס התמונה. נסו לרענן ולהתחבר מחדש כמדריך.');} });
    this.root.querySelectorAll('[data-bad]').forEach(b => b.onclick = async () => { if (confirm(`לסמן צילום כ${tr.invalid} ולהחזיר את החברה לתיקון אצל הצוות?`)) { try{await this.repo.reviewSubmission(b.dataset.bad, 'invalid'); this.render();}catch(err){alert('לא הצלחנו לסמן את התמונה כלא תקינה. נסו לרענן ולהתחבר מחדש כמדריך.');} } });
    this.root.querySelectorAll('[data-delete-photo]').forEach(b => b.onclick = async () => { if (confirm('למחוק את התמונה מהדשבורד? הפעולה לא מוחקת את השלמת החברה.')) { try{await this.repo.deleteSubmission(b.dataset.deletePhoto); this.render();}catch(err){alert('לא הצלחנו למחוק את התמונה. ייתכן שצריך להתחבר מחדש כמדריך או שהשרת עדיין לא עודכן.');} } });
  }

  timeAgo(date) {
    const mins = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
    if (mins < 1) return 'עכשיו';
    if (mins < 60) return `${mins} דק׳`;
    return `${Math.round(mins / 60)} ש׳`;
  }
}
