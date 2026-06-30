import{t}from'../../infrastructure/i18n/translations.js';
import{$,$$,card,field,select}from'../shared/dom.js';
import{CreateTeamSession,CompleteCompany,RequestCheckpoint,RequestFoodBreak,RepairModel,GenerateBase44Prompt,CalculateModelQuality,nextCheckpoint,nextFoodBreak,checkpointPlan,puzzlePieces,selectCompaniesForDuration,finalMissionReadiness,finalMissionOpen}from'../../domain/use-cases/useCases.js';

export class StudentApp{
  constructor(repo,root,appLanguage='he'){
    this.repo=repo;
    this.root=root;
    this.appLanguage=appLanguage;
    this.teamId=localStorage.getItem('aiQuest.currentTeam');
    this.activeCompanyId=null;
    this.successCompanyId=null;
    this.repairFeedback=null;
    this.companySearch=sessionStorage.getItem('aiQuest.companySearch')||'';
    this.companyView=sessionStorage.getItem('aiQuest.companyView')||'open';
    this.aiAnswer=sessionStorage.getItem('aiQuest.aiAnswer')||'';
    if(!window.aiQuestStudentFocusRefresh){
      window.aiQuestStudentFocusRefresh=true;
      window.addEventListener('focus',()=>{if(location.hash.replace('#','')!=='instructor'&&location.hash.replace('#','')!=='admin')window.dispatchEvent(new CustomEvent('aiQuestStudentRefresh'));});
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)window.dispatchEvent(new CustomEvent('aiQuestStudentRefresh'));});
    }
    this.boundRefresh=()=>this.refreshFromServer('signal');
    window.removeEventListener('aiQuestStudentRefresh',window.aiQuestStudentRefreshHandler||(()=>{}));
    window.aiQuestStudentRefreshHandler=this.boundRefresh;
    window.addEventListener('aiQuestStudentRefresh',this.boundRefresh);
  }

  async render(){
    let team=null;
    if(this.teamId){
      try{ team=await this.repo.getTeam(this.teamId); }
      catch{
        localStorage.removeItem('aiQuest.currentTeam');
        this.teamId=null;
        team=null;
      }
    }
    if(!team){this.closeLiveStream();return this.join();}
    this.ensureLiveStream(team.id);
    if(this.appLanguage&&team.language!==this.appLanguage){
      team={...team,language:this.appLanguage};
      await this.repo.saveTeam(team);
    }
    document.documentElement.lang=team.language;
    document.documentElement.dir='rtl';
    const cfg=await this.repo.getEventConfig(team.eventId);
    const q=await new CalculateModelQuality(this.repo).execute(team.id);
    const prompt=team.completedCompanies?.length?await new GenerateBase44Prompt(this.repo).execute(team.id):'';
    if(isGamePaused(cfg)){
      this.activeCompanyId=null;this.successCompanyId=null;
      this.scheduleLiveRefresh();
      this.root.innerHTML=this.shell(team,q,`<main class="grid-main"><section>${this.mission(team,cfg)}${this.teamUpdates(team)}${this.gamePaused(cfg,team)}</section><aside>${this.bag(team,cfg,q)}</aside></main>`);
      this.bindShellControls();
      return;
    }

    if(this.successCompanyId){
      this.scheduleLiveRefresh();
      this.root.innerHTML=this.shell(team,q,this.successScreen(team,cfg,this.successCompanyId));
      this.bindShellControls();
      $('#backToCompanies').onclick=()=>{this.successCompanyId=null;this.render()};
      return;
    }

    if(this.activeCompanyId){
      this.stopLiveRefresh();
      this.root.innerHTML=this.shell(team,q,this.companyTask(team,cfg,this.activeCompanyId));
      this.bindShellControls();
      this.bindCompanyTask(team,cfg,this.activeCompanyId);
      return;
    }

    const blockingCheckpoint=nextCheckpoint(team,cfg),finalOpen=finalMissionOpen(team,cfg);
    this.scheduleLiveRefresh();
    this.root.innerHTML=this.shell(team,q,`<main class="grid-main"><section>${this.mission(team,cfg)}${this.teamUpdates(team)}${finalOpen?this.finish(team,cfg,q,prompt):blockingCheckpoint?this.checkpoint(team,cfg):`${this.foodBreak(team,cfg)}${this.aiHelper(team,cfg)}${this.companies(team,cfg)}${this.repair(team,cfg)}`}</section><aside>${this.bag(team,cfg,q)}</aside></main>`);
    this.bindShellControls();
    this.bind(team,cfg);
  }



  async refreshFromServer(reason='manual',force=false){
    if(this.activeCompanyId&&!force)return;
    if(force){this.activeCompanyId=null;this.successCompanyId=null;}
    try{ await this.render(); }
    catch(err){ console.warn('student refresh failed',reason,err); alert('לא הצלחנו לרענן כרגע. בדקו חיבור ונסו שוב.'); }
  }

  ensureLiveStream(teamId){
    if(!this.repo.teamStreamUrl||typeof EventSource==='undefined')return;
    if(this.liveStreamTeamId===teamId&&this.liveStream)return;
    this.closeLiveStream();
    this.liveStreamTeamId=teamId;
    const stream=new EventSource(this.repo.teamStreamUrl(teamId));
    stream.addEventListener('team-update',()=>this.refreshFromServer('sse'));
    stream.onerror=()=>{};
    this.liveStream=stream;
  }

  closeLiveStream(){
    if(this.liveStream){this.liveStream.close();this.liveStream=null;this.liveStreamTeamId=null;}
  }

  scheduleLiveRefresh(){
    clearTimeout(window.aiQuestStudentTimer);
    window.aiQuestStudentTimer=setTimeout(()=>{
      const route=location.hash.replace('#','')||'student';
      if(route==='student'&&!this.activeCompanyId&&!document.hidden)this.refreshFromServer('fallback-60s');
    },60000);
  }

  stopLiveRefresh(){
    clearTimeout(window.aiQuestStudentTimer);
  }


  bindShellControls(){
    const refreshTeam=$('#refreshTeam');
    if(refreshTeam)refreshTeam.onclick=()=>this.refreshFromServer('manual',true);
    const switchTeam=$('#switchTeam');
    if(switchTeam)switchTeam.onclick=()=>{if(confirm('לצאת מהצוות במכשיר הזה? ההתקדמות של הצוות תישמר בשרת.')){this.closeLiveStream();localStorage.removeItem('aiQuest.currentTeam');this.teamId=null;this.activeCompanyId=null;this.successCompanyId=null;this.render();}};
  }

  shell(team,q,body){
    const completed=team.completedCompanies?.length||0;
    const abilities=team.collectedAbilities?.length||0;
    return `<header class="topbar student-topbar"><div class="student-title"><b>${t(team.language,'app')}</b><span>${team.name} · ${team.activityDuration} ${t(team.language,'minutes')} · Live</span></div><div class="student-stats"><span><b>${team.score||0}</b>${t(team.language,'points')}</span><span><b>${completed}</b>${t(team.language,'completedCompanies')}</span><span><b>${abilities}</b>${t(team.language,'abilities')}</span></div><button id="refreshTeam" class="ghost">רענון נתונים</button><button id="switchTeam" class="ghost">החלפת צוות</button></header><div class="student-team-banner"><span>משחקים בתור</span><strong>${escapeHtml(team.name)}</strong></div>${body}`;
  }

  async join(){
    const l=this.appLanguage||localStorage.getItem('aiQuest.language')||'he';
    const fallbackTeams=[{id:'red',name:'צוות אדום'},{id:'white',name:'צוות לבן'},{id:'blue',name:'צוות כחול'},{id:'green',name:'צוות ירוק'},{id:'yellow',name:'צוות צהוב'},{id:'purple',name:'צוות סגול'}];
    let activeEvents=[],selectedEventCode=sessionStorage.getItem('aiQuest.selectedEventCode')||'GAVYAM',teams=[];
    try{activeEvents=this.repo.listActiveEvents?await this.repo.listActiveEvents():[];}catch{}
    if(activeEvents.length){
      const saved=activeEvents.find(e=>String(e.code)===String(selectedEventCode));
      selectedEventCode=(saved||activeEvents[0]).code;
      teams=await teamsForEvent(this.repo,saved||activeEvents[0],fallbackTeams);
    }else{
      try{const event=await this.repo.getEventByCode(selectedEventCode);activeEvents=[event];teams=await teamsForEvent(this.repo,event,fallbackTeams);}catch{}
    }
    if(!teams.length)teams=fallbackTeams;
    const eventControl=activeEvents.length>1
      ? `<label><span>בחרו אירוע</span><select name="eventCode" id="eventCodeSelect">${activeEvents.map(ev=>`<option value="${escapeHtml(ev.code)}" ${String(ev.code)===String(selectedEventCode)?'selected':''}>${escapeHtml(ev.name||ev.code)} · ${escapeHtml(ev.code)}</option>`).join('')}</select></label><p class="muted">בחרו קודם אירוע, ואז תופיע רשימת הצוותים של אותו אירוע.</p>`
      : `<input type="hidden" name="eventCode" value="${escapeHtml(selectedEventCode)}"><p class="muted">אירוע: <b>${escapeHtml(activeEvents[0]?.name||selectedEventCode)}</b></p>`;
    this.root.innerHTML=card(`<h1>AI Quest</h1><p>${t(l,'intro')}</p><form id="join" class="form-grid">${select(t(l,'language'),'language',[{value:'he',label:t(l,'hebrew')},{value:'ar',label:t(l,'arabic')}],l)}${eventControl}<label><span>שם / כינוי אישי</span><input name="participantName" required maxlength="40" autocomplete="name" placeholder="לדוגמה: נועה"></label><label><span>בחרו צוות</span><select name="teamAccessId" id="teamAccessSelect">${teams.map(tm=>`<option value="${escapeHtml(tm.id)}">${escapeHtml(tm.name)}</option>`).join('')}</select></label><label><span>סיסמת צוות</span><input name="password" type="password" required autocomplete="current-password" placeholder="A1234"></label>${select(t(l,'duration'),'activityDuration',[60,90,135].map(x=>({value:x,label:x+' '+t(l,'minutes')})),90)}${field(t(l,'participants'),'participantsCount','5','number')}<button class="primary">${t(l,'startButton')}</button><p id="joinError" class="error"></p></form>`,'hero');
    const eventSelect=$('#eventCodeSelect'),teamSelect=$('#teamAccessSelect');
    if(eventSelect)eventSelect.onchange=async()=>{
      const event=activeEvents.find(ev=>String(ev.code)===String(eventSelect.value));
      sessionStorage.setItem('aiQuest.selectedEventCode',eventSelect.value);
      const list=await teamsForEvent(this.repo,event,fallbackTeams);
      teamSelect.innerHTML=list.map(tm=>`<option value="${escapeHtml(tm.id)}">${escapeHtml(tm.name)}</option>`).join('');
      $('#joinError').textContent='';
    };
    $('#join').onsubmit=async e=>{
      e.preventDefault();
      const data=Object.fromEntries(new FormData(e.target));
      sessionStorage.setItem('aiQuest.selectedEventCode',data.eventCode||selectedEventCode);
      localStorage.setItem('aiQuest.language',data.language||l);
      this.appLanguage=data.language||l;
      try{
        const team=await new CreateTeamSession(this.repo).execute(data);
        localStorage.setItem('aiQuest.currentTeam',team.id);
        this.teamId=team.id;
        this.render();
      }catch(err){$('#joinError').textContent=String(err.message||err).includes('401')||String(err.message||err).includes('password')? 'סיסמת צוות לא נכונה.' : String(err.message||err).includes('participant') ? 'צריך להזין שם או כינוי אישי.' : 'קוד פעילות או צוות לא נמצאו.'}
    };
  }

  mission(team,cfg){
    const l=team.language,p=cfg.modelProblem,content=cfg.content||{},story=content.openingStory?.[l]||content.openingStory?.he||'',glossary=(content.glossary||[]).slice(0,6);
    return card(`<h2>${t(l,'start')}</h2><p>${t(l,'mission')}</p>${story?`<details class="story-card"><summary>${t(l,'story')}</summary><div>${textToHtml(story)}</div></details>`:''}<div class="problem"><b>${l==='ar'?p.titleAr:p.titleHe}</b><p>${l==='ar'?p.descriptionAr:p.descriptionHe}</p></div>${glossary.length?`<details class="glossary-card"><summary>${t(l,'glossary')}</summary><div class="glossary-grid">${glossary.map(g=>`<article><b>${l==='ar'?(g.termAr||g.termHe):g.termHe}</b><p>${l==='ar'?(g.explanationAr||g.explanationHe):g.explanationHe}</p></article>`).join('')}</div><small>${t(l,'glossaryHint')}</small></details>`:''}`);
  }


  gamePaused(cfg,team){
    const l=team.language,msg=l==='ar'?(cfg.event?.pauseMessageAr||'تم إيقاف اللعبة مؤقتًا من قبل المرشد. انتظروا تعليمات المتابعة.'):(cfg.event?.pauseMessageHe||'המשחק נעצר זמנית על ידי המדריך. המתינו להנחיות להמשך.');
    return card(`<h2>המשחק נעצר זמנית</h2><p class="notice strong">${escapeHtml(msg)}</p><p>בזמן עצירה אי אפשר לפתוח או להשלים משימות חברה. כשהמדריך יפתח את המשחק מחדש, החברות יחזרו להופיע.</p><button class="primary" onclick="location.reload()">בדקו אם המשחק נפתח</button>`,'checkpoint-lock-card');
  }

  aiHelper(team,cfg){
    const l=team.language,companies=selectCompaniesForDuration(cfg,team).slice(0,60);
    return card(`<h2>עוזר AI למשחק</h2><p>שאלו על חברה בפארק, על המשימה, או מה לעשות אם נתקעתם. שימוש ראשון בעוזר נותן 3 נק׳ בונוס.</p><form id="aiHelperForm" class="form-grid"><label><span>שאלה לעוזר</span><input name="question" placeholder="לדוגמה: איך Microsoft קשורה ל-AI?" required></label><label><span>חברה אופציונלית</span><select name="companyId"><option value="">ללא חברה מסוימת</option>${companies.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(l==='ar'?(c.nameAr||c.nameHe):c.nameHe)}</option>`).join('')}</select></label><button class="primary">שאלו את העוזר</button></form>${this.aiAnswer?`<div class="notice ok"><b>תשובת העוזר</b><p>${escapeHtml(this.aiAnswer)}</p></div>`:''}`,'ai-helper-card');
  }

  companies(team,cfg){
    const l=team.language;
    const visibleCompanies=selectCompaniesForDuration(cfg,team);
    const hiddenCount=Math.max(0,(cfg.companies?.length||0)-visibleCompanies.length);
    const completed=team.completedCompanies?.filter(id=>visibleCompanies.some(c=>c.id===id)).length||0,fixList=(team.needsPhotoFixCompanies||[]).filter(id=>visibleCompanies.some(c=>c.id===id)),query=this.companySearch.trim().toLowerCase();
    const counts={open:visibleCompanies.filter(c=>!team.completedCompanies?.includes(c.id)&&!fixList.includes(c.id)).length,completed,fix:fixList.length,all:visibleCompanies.length};
    const filtered=visibleCompanies.filter(c=>{
      const done=team.completedCompanies?.includes(c.id),needsFix=fixList.includes(c.id),name=(l==='ar'?c.nameAr:c.nameHe)||c.nameHe;
      const byView=this.companyView==='completed'?done:this.companyView==='fix'?needsFix:this.companyView==='all'?true:(!done&&!needsFix);
      const bySearch=!query||name.toLowerCase().includes(query)||(c.nameEn||'').toLowerCase().includes(query);
      return byView&&bySearch;
    });
    return card(`<div class="section-head"><div><h2>${t(l,'companies')}</h2><p>${t(l,'companyPickerHint')}</p>${hiddenCount?`<small class="duration-note">${t(l,'durationSelectionNote')} (${visibleCompanies.length}/${cfg.companies.length})</small>`:''}</div><div class="progress-ring"><b>${completed}</b><span>${t(l,'completed')}</span></div></div><div class="company-picker"><label class="company-search"><span>${t(l,'searchCompany')}</span><input id="companySearch" value="${escapeHtml(this.companySearch)}" placeholder="${t(l,'searchCompanyPlaceholder')}"></label><div class="company-view-tabs"><button data-company-view="open" class="${this.companyView==='open'?'active':''}">${t(l,'openCompanies')} (${counts.open})</button><button data-company-view="completed" class="${this.companyView==='completed'?'active':''}">${t(l,'completed')} (${counts.completed})</button><button data-company-view="fix" class="${this.companyView==='fix'?'active':''}">${t(l,'needsFix')} (${counts.fix})</button><button data-company-view="all" class="${this.companyView==='all'?'active':''}">${t(l,'all')} (${counts.all})</button><button id="randomCompany" type="button">${t(l,'randomCompany')}</button></div></div><div class="company-grid">${filtered.map(c=>{
      const done=team.completedCompanies?.includes(c.id),needsFix=fixList.includes(c.id);
      const status=needsFix?t(l,'needsFixStatus'):done?t(l,'completedStatus'):t(l,'openStatus');
      const cardState=needsFix?'needs-fix':done?'done':'open';
      return `<article class="company-card ${cardState}" data-company-card="${c.id}"><div class="company-card-top"><span class="company-state-dot ${cardState}"></span><span class="status">${status}</span></div>${companyLogo(c,l,'card')}<h3>${l==='ar'?c.nameAr:c.nameHe}</h3><p class="no-spoiler">${t(l,'noSpoiler')}</p><button data-company="${c.id}" ${done&&!needsFix?'disabled':''}>${needsFix?t(l,'retakePhoto'):done?t(l,'completedStatus'):t(l,'openCompanyTask')}</button></article>`;
    }).join('')||`<div class="empty-state"><h3>${t(l,'noCompanies')}</h3><p>${t(l,'noCompaniesHint')}</p></div>`}</div>`);
  }

  companyTask(team,cfg,id){
    const l=team.language,c=cfg.companies.find(x=>x.id===id),qs=cfg.questions.filter(q=>q.companyId===id),abilities=(c.abilityIds||[]).map(aid=>cfg.abilities.find(a=>a.id===aid)).filter(Boolean),companyName=l==='ar'?(c.nameAr||c.nameHe):c.nameHe;
    const helperPrompt=l==='ar'?`اسألوا المساعد عن ${companyName}`:`שאלו את העוזר על ${companyName}`;
    const abilityBlock=`<section class="task-block ability-preview"><h2>3. ${l==='ar'?'أنهوا المهمة':'סיום המשימה'}</h2><p>${l==='ar'?'بعد الإجابة وإرسال المهمة ستظهر لكم نتيجة المحطة وما أضافته للفريق.':'אחרי שתענו ותשלחו את המשימה תראו מה התחנה הוסיפה לצוות.'}</p></section>`;
    const companyAiAnswer=sessionStorage.getItem(`aiQuest.companyAiAnswer.${id}`)||'';
    const helper=`<section class="task-block company-ai-helper"><h2>עוזר AI לחברה הזו</h2><p>נתקעתם? שאלו שאלה קצרה על החברה או על הקשר שלה ל-AI. העוזר מכוון לחשיבה ולא מחליף את עבודת הצוות.</p><form id="companyAiHelperForm" class="form-grid"><input type="hidden" name="companyId" value="${escapeHtml(id)}"><label><span>שאלה לעוזר</span><input name="question" placeholder="${escapeHtml(helperPrompt)}" required></label><button type="submit" class="primary">שאלו על החברה הזו</button></form>${companyAiAnswer?`<div class="notice ok"><b>תשובת העוזר</b><p>${escapeHtml(companyAiAnswer)}</p></div>`:''}</section>`;
    return `<main class="task-screen"><button id="backCompanies" class="ghost">${t(l,'backToCompanies')}</button><section class="task-hero"><div><span class="level">${t(l,'companyMission')} · ${t(l,'level')} ${c.level}</span><h1>${companyName}</h1><p>${c.field}</p><p>${l==='ar'?c.descriptionAr:c.descriptionHe}</p></div><div class="task-logo-panel">${companyLogo(c,l,'hero')}<small>${t(l,'referenceLogoOnly')}</small></div></section>${helper}<form id="companyForm" class="task-form"><section class="task-block"><h2>1. ${t(l,'photographLogo')}</h2><p>${t(l,'photoInstructorHint')}</p><p class="notice">${t(l,'realLogoRequired')}</p><label class="upload-box"><input id="photoInput" name="photo" type="file" accept="image/*"><span>${t(l,'choosePhoto')}</span><img id="photoPreview" alt="תצוגה מקדימה" hidden></label><small>לא חובה להעלות לוגו כדי לסיים חברה; מי שמעלה צילום תקין מקבל בונוס.</small></section><section class="task-block"><h2>2. ${t(l,'answerQuestions')}</h2>${qs.map((q,idx)=>renderQuestion(q,idx,l)).join('')}</section>${abilityBlock}<div class="sticky-actions"><button type="button" id="cancelTask">${t(l,'cancel')}</button><button class="primary">${t(l,'finishedCompany')}</button></div></form></main>`;
  }

  successScreen(team,cfg,id){
    const l=team.language,c=cfg.companies.find(x=>x.id===id),abilities=isKnowledgeStation(c)?[]:(c.abilityIds||[]).map(aid=>cfg.abilities.find(a=>a.id===aid)).filter(Boolean),knowledge=isKnowledgeStation(c);
    return `<main class="success-screen">${card(`<div class="success-mark">✓</div><h1>${t(l,'companyCompleted')}</h1><p>${l==='ar'?c.nameAr:c.nameHe} ${t(l,'addedToJourney')}</p><h2>${knowledge?(l==='ar'?'أضفتم معرفة ونقاطًا':'הוספתם ידע וניקוד'):t(l,'modelBagStrengthened')}</h2>${knowledge?`<p class="station-kind knowledge">${l==='ar'?'هذه المحطة لا تضيف قدرة مباشرة للنموذج، لكنها تقوي فهم الفريق وتمنح نقاطًا.':'התחנה הזו לא מוסיפה יכולת ישירה למודל, אבל היא מוסיפה ידע לצוות וניקוד.'}</p>`:`<div class="chips big">${abilities.map(a=>`<span>${l==='ar'?a.nameAr:a.nameHe}</span>`).join('')}</div>`}<button id="backToCompanies" class="primary">${t(l,'backToCompanies')}</button>`,'success-card')}</main>`;
  }

  bindCompanyTask(team,cfg,id){
    $('#backCompanies').onclick=()=>{this.activeCompanyId=null;this.render()};
    $('#cancelTask').onclick=()=>{this.activeCompanyId=null;this.render()};
    const input=$('#photoInput'),preview=$('#photoPreview');
    input.onchange=()=>{
      const file=input.files?.[0];
      if(!file)return;
      preview.src=URL.createObjectURL(file);
      preview.hidden=false;
    };
    const companyAi=$('#companyAiHelperForm');
    if(companyAi)companyAi.onsubmit=async e=>{e.preventDefault();const fd=new FormData(companyAi);try{const res=await this.repo.askAiHelper(team.id,fd.get('question'),fd.get('companyId')||id);const answer=res.answer+(res.awarded?`

קיבלתם ${res.awarded} נק׳ בונוס.`:'');sessionStorage.setItem(`aiQuest.companyAiAnswer.${id}`,answer);this.render();}catch(err){alert(String(err.message||err).includes('paused')?'המשחק נעצר כרגע. העוזר יחזור לפעול כשהמשחק ייפתח.':'לא הצלחנו להפעיל את העוזר כרגע.')}};
    $('#companyForm').onsubmit=async e=>{
      e.preventDefault();
      const fd=new FormData(e.target),qs=cfg.questions.filter(q=>q.companyId===id),answers={};
      qs.forEach(q=>answers[q.id]=fd.get(q.id));
      const photo=fd.get('photo');
      const hasPhoto=photo&&photo.size>0;
      try{await new CompleteCompany(this.repo).execute({teamId:team.id,companyId:id,answers,photoName:hasPhoto?photo.name:'',photoFile:hasPhoto?photo:null});}
      catch(err){alert(String(err.message||err).includes('paused')?'המשחק נעצר כרגע על ידי המדריך. אי אפשר להשלים משימה עד פתיחה מחדש.':'לא הצלחנו לשמור את המשימה. נסו שוב.');this.activeCompanyId=null;this.render();return;}
      this.activeCompanyId=null;
      this.successCompanyId=id;
      this.render();
    };
  }

  foodBreak(team,cfg){
    const cp=nextFoodBreak(team,cfg);
    if(!cp)return'';
    const prompt=cp.type==='funding_photo'?(team.language==='ar'?'ارفعوا أو صوّروا شعار بنك لئومي':'צלמו או העלו לוגו של בנק לאומי'):t(team.language,'foodPhotoPrompt');
    return card(`<h2>${cp.title}</h2><p>${cp.description}</p><div class="checkpoint-progress"><b>${team.completedCompanies?.length||0}</b><span>${t(team.language,'companiesCompleted')} · ${t(team.language,'required')} ${cp.threshold}</span></div><form id="checkpointFoodForm" class="form-grid"><label class="upload-box"><input id="checkpointPhoto" name="photo" type="file" accept="image/*" required><span>${prompt}</span><img id="checkpointPreview" alt="תצוגה מקדימה" hidden></label><button class="primary">${t(team.language,'uploadAndContinue')}</button></form>`,'food-break-card');
  }

  checkpoint(team,cfg){
    const cp=nextCheckpoint(team,cfg),plan=checkpointPlan(team.activityDuration,team.language,{config:cfg}),pieces=puzzlePieces(team);
    if(!cp&&pieces.length)return card(`<h2>${t(team.language,'progressPuzzle')}</h2><p>${t(team.language,'collectedPuzzlePieces')} ${pieces.length}/${plan.length} ${t(team.language,'digitalPuzzlePieces')}</p><div class="puzzle-board">${plan.map(p=>`<span class="puzzle-piece ${pieces.includes(p.piece)?'on':''}">${p.piece}</span>`).join('')}</div>`);
    if(!cp)return'';
    const pending=cp.isPending||cp.status==='requested';
    return card(`<div class="checkpoint-gate"><h2>${cp.title||t(team.language,'checkpoint')}</h2><p>${cp.description||t(team.language,'returnToInstructor')}</p><div class="checkpoint-progress"><b>${team.completedCompanies?.length||0}</b><span>${t(team.language,'companiesCompleted')} · ${t(team.language,'required')} ${cp.threshold}</span></div><p class="notice strong">${t(team.language,'checkpointBlocksCompanies')}</p><button id="checkpointBtn" class="primary" ${pending?'disabled':''}>${pending?t(team.language,'waitingInstructor'):t(team.language,'requestCheckpoint')}</button>${isPuzzleEnabled(cfg)?`<p>${t(team.language,'puzzlePieceAfterApproval')} <b>${cp.piece||'המשך'}</b></p>`:''}${pending?`<p class="notice">${t(team.language,'checkpointSent')}</p>`:''}</div>`,'checkpoint-lock-card');
  }

  repair(team,cfg){
    const abs=cfg.abilities.filter(a=>team.collectedAbilities?.includes(a.id)),l=team.language;
    if(!abs.length)return'';
    const repaired=[...new Set((team.repairs||[]).filter(r=>r.success).flatMap(r=>r.selectedTypes||[]))];
    const feedback=this.repairFeedback?`<div class="repair-feedback ${this.repairFeedback.success?'ok':'bad'}"><b>${this.repairFeedback.title}</b><p>${this.repairFeedback.text}</p><button id="closeRepairFeedback" type="button">${t(l,'understood')}</button></div>`:'';
    return card(`<div class="section-head"><div><h2>${t(l,'repair')}</h2><p>${t(l,'repairHint')}</p></div></div><div class="repair-grid">${abs.map(a=>`<label class="repair-card"><input type="checkbox" name="repair" value="${a.type}"><span>${l==='ar'?a.nameAr:a.nameHe}</span><small>${abilityTypeLabel(a.type,l)}</small></label>`).join('')}</div><div class="repaired-list"><b>${t(l,'repairedSoFar')}</b> ${repaired.length?repaired.map(type=>abilityTypeLabel(type,l)).join(' · '):t(l,'noWeaknessesRepaired')}</div><button id="repairBtn" class="primary">${t(l,'repairModelButton')}</button>${feedback}`);
  }

  teamUpdates(team){
    const messages=(team.messages||[]).slice(-2).reverse();
    if(!messages.length)return'';
    return card(`<h2>${t(team.language,'latestUpdates')}</h2><div class="team-updates">${messages.map(m=>`<p class="notice ${String(m.text||'').includes('אושר')||String(m.text||'').includes('وافق')?'ok':''}">${escapeHtml(m.text||'')}</p>`).join('')}</div>`,'status-card');
  }

  finish(team,cfg,q,prompt){
    const pieces=puzzlePieces(team),plan=checkpointPlan(team.activityDuration,team.language,{config:cfg}),l=team.language,ready=finalMissionReadiness(team,cfg);
    const completedCompanies=(team.completedCompanies||[]).map(id=>cfg.companies.find(c=>c.id===id)).filter(Boolean).slice(-8);
    const progress=Object.values(ready.progress).map(p=>`<div class="ability-bar ${p.ready?'on':'warn'}"><span>${abilityTypeLabel(p.type,l)}</span><b>${p.count}/3</b></div>`).join('');
    const finalBox=ready.ready?`<p class="notice strong ok">${t(l,'finalMissionReady')}</p><label><span>${t(l,'prompt')}</span><textarea readonly>${prompt}</textarea></label>`:`<p class="notice strong">${t(l,'finalMissionLocked')}</p>`;
    return card(`<div class="final-hero"><div class="success-mark">${ready.ready?'✓':'!'}</div><div><h2>${t(l,'finalTitle')}</h2><p>${t(l,'finalSubtitle')}</p></div></div><div class="final-score-grid"><div class="result"><b>${team.score||0}</b><span>${t(l,'gamePoints')}</span></div><div><b>${team.completedCompanies?.length||0}</b><span>${t(l,'companiesCompleted')}</span></div><div><b>${team.collectedAbilities?.length||0}</b><span>${t(l,'collectedAbilities')}</span></div><div><b>${ready.readyDomains}/${ready.totalDomains}</b><span>${t(l,'finalDomainsReady')}</span></div></div><div class="final-section"><h3>${t(l,'finalMission')}</h3><p>${t(l,'finalMissionText')}</p><p class="notice strong">${t(l,'finalTrainingText')}</p><div class="ability-bars">${progress}</div></div><div class="final-section"><h3>${t(l,'strengths')}</h3><div class="chips big">${q.strengths.map(type=>`<span>${abilityTypeLabel(type,l)}</span>`).join('')||'<small>-</small>'}</div></div><div class="final-section"><h3>${t(l,'weaknesses')}</h3><div class="chips">${q.weaknesses.map(type=>`<span>${abilityTypeLabel(type,l)}</span>`).join('')||'<small>-</small>'}</div></div><div class="final-section"><h3>${t(l,'companiesCompleted')}</h3><div class="chips">${completedCompanies.map(c=>`<span>${escapeHtml(l==='ar'?(c.nameAr||c.nameHe):c.nameHe)}</span>`).join('')}</div></div>${isPuzzleEnabled(cfg)?`<div class="final-section"><h3>${t(l,'progressPuzzle')}</h3>${renderPuzzle(team,cfg,false)}</div>`:''}${finalBox}`,'final-card');
  }

  bag(team,cfg,q){
    const l=team.language,abs=cfg.abilities.filter(a=>team.collectedAbilities?.includes(a.id)),req=cfg.modelProblem.requiredAbilityTypes||[],types=[...new Set(abs.map(a=>a.type))];
    const pieces=puzzlePieces(team),plan=checkpointPlan(team.activityDuration,team.language);
    return card(`<h2>${t(l,'modelBag')}</h2><div class="model-summary"><div><b>${team.completedCompanies?.length||0}</b><span>${t(l,'completedCompanies')}</span></div><div><b>${abs.length}</b><span>${t(l,'abilities')}</span></div><div><b>${team.score||0}</b><span>${t(l,'points')}</span></div></div><p>${t(l,'modelProgressByAbility')}</p><div class="ability-bars">${req.map(type=>`<div class="ability-bar ${types.includes(type)?'on':''}"><span>${abilityTypeLabel(type,l)}</span><b>${types.includes(type)?'✓':'+'}</b></div>`).join('')}</div>${isPuzzleEnabled(cfg)?`<h3>${t(l,'digitalPuzzle')}</h3>${renderPuzzle(team,cfg,true)}`:''}<div class="chips">${abs.map(a=>`<span>${l==='ar'?a.nameAr:a.nameHe}</span>`).join('')||`<small>${t(l,'noAbilitiesYet')}</small>`}</div>${(team.messages||[]).map(m=>`<p class="notice">${m.text}</p>`).join('')}`);
  }

  bind(team,cfg){
    $$('[data-company]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(b.disabled)return;this.activeCompanyId=b.dataset.company;this.render()});
    $$('[data-company-card]').forEach(card=>card.onclick=()=>{const id=card.dataset.companyCard;if(team.completedCompanies?.includes(id)&&!team.needsPhotoFixCompanies?.includes(id))return;this.activeCompanyId=id;this.render()});
    const cs=$('#companySearch');
    if(cs)cs.oninput=()=>{this.companySearch=cs.value;sessionStorage.setItem('aiQuest.companySearch',this.companySearch);clearTimeout(this.companySearchTimer);this.companySearchTimer=setTimeout(()=>this.render(),180)};
    $$('[data-company-view]').forEach(b=>b.onclick=()=>{this.companyView=b.dataset.companyView;sessionStorage.setItem('aiQuest.companyView',this.companyView);this.render()});
    const random=$('#randomCompany');
    if(random)random.onclick=()=>{const visibleCompanies=selectCompaniesForDuration(cfg,team);const pool=visibleCompanies.filter(c=>!team.completedCompanies?.includes(c.id)||team.needsPhotoFixCompanies?.includes(c.id));if(!pool.length)return;this.activeCompanyId=pool[Math.floor(Math.random()*pool.length)].id;this.render()};
    const cp=$('#checkpointBtn');
    if(cp)cp.onclick=async()=>{await new RequestCheckpoint(this.repo).execute(team.id);this.render()};
    const cpf=$('#checkpointFoodForm');
    if(cpf){
      const input=$('#checkpointPhoto'),preview=$('#checkpointPreview');
      input.onchange=()=>{const file=input.files?.[0];if(!file)return;preview.src=URL.createObjectURL(file);preview.hidden=false};
      cpf.onsubmit=async e=>{e.preventDefault();const file=new FormData(cpf).get('photo');await new RequestFoodBreak(this.repo).execute(team.id,{photoFile:file,photoName:file?.name||'food-logo'});this.render()};
    }
    const ai=$('#aiHelperForm');
    if(ai)ai.onsubmit=async e=>{e.preventDefault();const fd=new FormData(ai);try{const res=await this.repo.askAiHelper(team.id,fd.get('question'),fd.get('companyId'));this.aiAnswer=res.answer+(res.awarded?`\n\nקיבלתם ${res.awarded} נק׳ בונוס.`:'');sessionStorage.setItem('aiQuest.aiAnswer',this.aiAnswer);this.render();}catch(err){alert(String(err.message||err).includes('paused')?'המשחק נעצר כרגע. העוזר יחזור לפעול כשהמשחק ייפתח.':'לא הצלחנו להפעיל את העוזר כרגע.')}};
    const rb=$('#repairBtn');
    if(rb)rb.onclick=async()=>{
      const selected=[...new Set($$('input[name=repair]:checked').map(x=>x.value))];
      if(!selected.length){
        this.repairFeedback={success:false,title:t(team.language,'chooseAtLeastOne'),text:t(team.language,'chooseAtLeastOneText')};
        this.render();
        return;
      }
      const res=await new RepairModel(this.repo).execute(team.id,selected);
      this.repairFeedback=res.success
        ?{success:true,title:t(team.language,'modelStrengthened'),text:`${selected.map(x=>abilityTypeLabel(x,team.language)).join(' · ')}. ${t(team.language,'abilityChoiceGood')}`}
        :{success:false,title:t(team.language,'choiceNotGood'),text:t(team.language,'choiceNotGoodText')};
      this.render();
    };
    const close=$('#closeRepairFeedback');
    if(close)close.onclick=()=>{this.repairFeedback=null;this.render()};
  }
}

async function teamsForEvent(repo,event,fallbackTeams=[]){
  if(!event)return fallbackTeams;
  try{const teams=repo.listEventTeams?await repo.listEventTeams(event.id):(event.teamAccess||[]);return teams?.length?teams:fallbackTeams;}catch{return event.teamAccess?.length?event.teamAccess:fallbackTeams;}
}
function isKnowledgeStation(c){return (c?.stationType||'model')==='knowledge'}
function escapeHtml(value=''){return String(value).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]))}
function companyLogo(c,l='he',size='card'){
  const name=l==='ar'?(c.nameAr||c.nameHe):(c.nameHe||c.nameEn||c.id),alt=l==='ar'?(c.logoAltAr||name):(c.logoAltHe||name),mark=escapeHtml(c.logoMark||String(name).slice(0,2));
  if(c.logoUrl)return `<div class="company-logo ${size}"><img src="${escapeHtml(c.logoUrl)}" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.closest('.company-logo').classList.add('fallback');this.remove()"><span>${mark}</span></div>`;
  return `<div class="company-logo ${size} fallback" aria-label="${escapeHtml(alt)}"><span>${mark}</span></div>`;
}
function isGamePaused(cfg){return cfg.event?.gameStatus==='paused'||!!cfg.event?.pausedAt}
function isPuzzleEnabled(cfg){return !!cfg.event?.puzzleConfig?.enabled}
function renderPuzzle(team,cfg,small=false){
  if(!isPuzzleEnabled(cfg))return'';
  const pieces=puzzlePieces(team),plan=checkpointPlan(team.activityDuration,team.language,{config:cfg}),puzzle=cfg.event?.puzzleConfig||{},count=Math.max(1,Math.min(48,Number(puzzle.pieceCount||plan.length||1))),revealed=Math.min(count,pieces.length),cols=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/cols);
  if(!puzzle.imageUrl)return `<div class="puzzle-board ${small?'small':''}">${plan.map(p=>`<span class="puzzle-piece ${pieces.includes(p.piece)?'on':''}">${p.piece}</span>`).join('')}</div>`;
  return `<div class="image-puzzle ${small?'small':''}" style="--cols:${cols};--rows:${rows}">${Array.from({length:count},(_,i)=>{const col=i%cols,row=Math.floor(i/cols),on=i<revealed;return `<span class="image-puzzle-piece ${on?'on':'locked'}" style="background-image:url('${escapeHtml(puzzle.imageUrl)}');background-size:${cols*100}% ${rows*100}%;background-position:${cols===1?0:(col/(cols-1))*100}% ${rows===1?0:(row/(rows-1))*100}%">${on?'':i+1}</span>`}).join('')}</div><small>${revealed}/${count} חלקי פאזל נחשפו</small>`;
}
function textToHtml(text){return String(text||'').split(/\n{2,}/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('')}
function renderQuestion(q,idx,l){
  const title=l==='ar'?q.textAr:q.textHe,explanation=l==='ar'?q.explanationAr:q.explanationHe,type=q.type||'single';
  if(type==='short')return `<fieldset class="question-card"><legend>${idx+1}. ${title}</legend><label class="option"><span>${t(l,'shortAnswer')}</span><textarea name="${q.id}" required></textarea></label><small>${explanation}</small></fieldset>`;
  const options=type==='true_false'&&!q.optionsHe?.length
    ?[t(l,'trueText'),t(l,'falseText')]
    :(l==='ar'?q.optionsAr:q.optionsHe);
  return `<fieldset class="question-card"><legend>${idx+1}. ${title}</legend>${(options||[]).map((op,i)=>`<label class="option"><input type="radio" name="${q.id}" value="${i}" required> ${op}</label>`).join('')}<small>${explanation}</small></fieldset>`;
}
function abilityTypeLabel(type,l='he'){
  return t(l,type)||type;
}
