function normalizeAnswer(value){return String(value??'').trim().toLowerCase().replace(/\s+/g,' ')}
function isCorrect(q,value){if((q.type||'single')==='short'){const text=normalizeAnswer(value),keywords=(q.acceptedKeywords||[]).map(normalizeAnswer).filter(Boolean);return keywords.length?keywords.some(k=>text.includes(k)):text===normalizeAnswer(q.correctText)}return Number(value)===Number(q.correctAnswer)}

export function defaultCheckpointStops(language='he'){
  const ar=language==='ar';
  return [
    {id:'cp-food-break',type:'food_photo',threshold:4,piece:'',autoApprove:true,title:ar?'استراحة طعام / طاقة':'עצירת אוכל / טעינה',description:ar?'עצירה قصيرة: ارفعوا صورة شعار مطعم أو مقهى في المجمع، وبعد الرفع يمكنكم المتابعة فورًا.':'עצירה קצרה: העלו תמונה של לוגו מסעדה או בית קפה בפארק, ואפשר להמשיך מיד.'},
    {id:'cp-leumi-funding',type:'funding_photo',threshold:7,piece:'',autoApprove:true,title:ar?'تمويل من بنك لئومي':'מימון מבנק לאומי',description:ar?'حصلتم على تمويل لشركتكم من بنك لئومي. ارفعوا أو صوّروا شعار بنك لئومي، وبعد الرفع يمكنكم المتابعة فورًا.':'קיבלתם מימון לחברה שלכם מבנק לאומי. צלמו או העלו לוגו של בנק לאומי, ואפשר להמשיך מיד.'},
    {id:'cp-instructor-1',type:'instructor_approval',threshold:10,piece:ar?'قطعة 1':'חלק 1',title:ar?'نقطة تحقق 1 مع المرشد':'צ׳קפוינט מדריך 1',description:ar?'توقّفوا هنا وتوجّهوا إلى المرشد. لا يمكن متابعة استكشاف الشركات حتى يوافق المرشد من لوحة التحكم.':'עצרו כאן וגשו למדריך. אי אפשר להמשיך לחקור חברות עד שהמדריך מאשר בדשבורד.'},
    {id:'cp-instructor-2',type:'instructor_approval',threshold:17,piece:ar?'قطعة 2':'חלק 2',title:ar?'نقطة تحقق 2 مع المرشد':'צ׳קפוינט מדריך 2',description:ar?'توقّفوا هنا وتوجّهوا إلى المرشد. لا يمكن متابعة استكشاف الشركات حتى يوافق المرشد من لوحة التحكم.':'עצרו כאן וגשו למדריך. אי אפשר להמשיך לחקור חברות עד שהמדריך מאשר בדשבורד.'},
    {id:'cp-instructor-3',type:'instructor_approval',threshold:24,piece:ar?'قطعة 3':'חלק 3',title:ar?'نقطة تحقق 3 مع المرشد':'צ׳קפוינט מדריך 3',description:ar?'توقّفوا هنا وتوجّهوا إلى المرشد. لا يمكن متابعة استكشاف الشركات حتى يوافق المرشد من لوحة التحكم.':'עצרו כאן וגשו למדריך. אי אפשר להמשיך לחקור חברות עד שהמדריך מאשר בדשבורד.'}
  ];
}
export function configuredCheckpointStops(eventOrConfig={},language='he'){
  const event=eventOrConfig?.event||eventOrConfig||{};
  const raw=Array.isArray(event.checkpointConfig?.stops)?event.checkpointConfig.stops:[];
  const base=defaultCheckpointStops(language);
  const stops=(raw.length?raw:base).slice(0,5).map((stop,idx)=>{
    const fallback=base[idx]||base[base.length-1];
    const type=['food_photo','funding_photo'].includes(stop.type)?stop.type:'instructor_approval';
    const n=idx+1;
    return {
      ...fallback,
      ...stop,
      id: stop.id||fallback.id||(type==='food_photo'?`cp-food-${n}`:`cp-instructor-${n}`),
      type,
      threshold: Math.max(1,Number(stop.threshold||fallback.threshold||4)),
      autoApprove: type!=='instructor_approval',
      piece: type!=='instructor_approval'?'':(stop.piece||fallback.piece||(language==='ar'?`قطعة ${n}`:`חלק ${n}`)),
      title: stop.title||(type==='food_photo'?(language==='ar'?'استراحة طعام / طاقة':'עצירת אוכל / טעינה'):(type==='funding_photo'?(language==='ar'?'تمويل من بنك لئومي':'מימון מבנק לאומי'):(language==='ar'?`نقطة تحقق ${n} مع المرشد`:`צ׳קפוינט מדריך ${n}`))),
      description: stop.description||fallback.description
    };
  });
  return stops.sort((a,b)=>a.threshold-b.threshold);
}
export function checkpointThresholds(maxCompanies=65){
  return defaultCheckpointStops('he').filter(s=>s.type==='instructor_approval'&&s.threshold<=Number(maxCompanies||65)).map(s=>s.threshold);
}
export function activityCompanyTarget(duration=90){const d=Number(duration||90);if(d>=135)return 65;if(d>=90)return 40;return 24}
export function checkpointPlan(duration=90,language='he',options={}){
  const eventOrConfig=options.event||options.config||options;
  const max=Number(options.maxCompanies||activityCompanyTarget(duration));
  return configuredCheckpointStops(eventOrConfig,language).filter(cp=>cp.type==='instructor_approval'&&cp.threshold<=max);
}
export function foodBreakPlan(language='he',eventOrConfig={}){
  return configuredCheckpointStops(eventOrConfig,language).filter(cp=>cp.type!=='instructor_approval')[0]||defaultCheckpointStops(language)[0];
}
export function teamCheckpoints(team){return Array.isArray(team.checkpoints)?team.checkpoints:[]}
export function approvedCheckpointIds(team){return new Set(teamCheckpoints(team).filter(c=>c.status==='approved').map(c=>c.planId||c.id))}
export function pendingCheckpoint(team){return teamCheckpoints(team).find(c=>c.status==='requested'&&c.type!=='food_photo')}
export function completedFoodBreak(team,cpId='cp-food-break'){return teamCheckpoints(team).some(c=>(c.planId||c.id)===cpId&&c.status==='approved')}
export function nextFoodBreak(team,eventOrConfig={}){const cps=configuredCheckpointStops(eventOrConfig,team.language).filter(cp=>cp.type!=='instructor_approval');return cps.find(cp=>!completedFoodBreak(team,cp.id)&&(team.completedCompanies?.length||0)>=cp.threshold)||null}
export function nextCheckpoint(team,eventOrConfig={}){const done=approvedCheckpointIds(team),pending=pendingCheckpoint(team);if(pending)return{...pending,isPending:true};return configuredCheckpointStops(eventOrConfig,team.language).find(cp=>cp.type==='instructor_approval'&&!done.has(cp.id)&&(team.completedCompanies?.length||0)>=cp.threshold)||null}
export function hasBlockingCheckpoint(team){return !!nextCheckpoint(team)}
export function puzzlePieces(team){return [...new Set([...(team.puzzlePieces||[]),...teamCheckpoints(team).filter(c=>c.status==='approved'&&c.piece).map(c=>c.piece)])]}

const essentialKnownCompanyIds=['microsoft','nvidia','intel','oracle','ibm','dell','cyberark','wix','taboola','rafael','soroka'];
const wellKnownCompanyIds=[...essentialKnownCompanyIds,'audiocodes','morphisec','mdclone','novocure','lightricks','weka','ribbon','rad','dalet','leidos','pwc-israel','drs-rada-technologies','bgn','cyber-bgu','tech7','innovation-basecamp'];
export function companyVisibilityLimit(duration=90){const d=Number(duration||90);if(d>=135)return Infinity;if(d>=90)return 40;return 24}
export function selectCompaniesForDuration(cfg,teamOrDuration=90){
  const duration=typeof teamOrDuration==='object'?teamOrDuration.activityDuration:teamOrDuration;
  const companies=[...(cfg.companies||[])];
  if(Number(duration)>=135)return companies;
  const limit=companyVisibilityLimit(duration);
  const abilities=cfg.abilities||[],required=new Set(cfg.modelProblem?.requiredAbilityTypes||[]);
  const abilityTypeById=new Map(abilities.map(a=>[a.id,a.type]));
  const isModelStation=c=>(c.stationType||'model')!=='knowledge';
  const hasRequiredAbility=c=>isModelStation(c)&&(c.abilityIds||[]).some(id=>required.has(abilityTypeById.get(id)));
  const isMissionRelevant=c=>String(c.modelRelevance||'').includes('ישיר')||essentialKnownCompanyIds.includes(c.id);
  const score=c=>{
    let s=0;
    if(isMissionRelevant(c))s+=1000;
    if(hasRequiredAbility(c))s+=260;
    const idx=wellKnownCompanyIds.indexOf(c.id);
    if(idx>=0)s+=700+(wellKnownCompanyIds.length-idx);
    if(String(c.modelRelevance||'').includes('ישיר'))s+=160;
    if(Number(c.level)===1)s+=45; else if(Number(c.level)===2)s+=25;
    if((c.nameHe||c.nameEn||'').match(/Microsoft|NVIDIA|Intel|Oracle|IBM|Dell|CyberArk|Wix|Taboola|Rafael|סורוקה|Soroka/i))s+=250;
    return s;
  };
  const hasType=(c,type)=>(c.stationType||'model')!=='knowledge'&&(c.abilityIds||[]).some(id=>abilityTypeById.get(id)===type);
  const coverageCompanies=[...required].flatMap(type=>companies.filter(c=>hasType(c,type)).sort((a,b)=>score(b)-score(a)||(a.nameHe||a.nameEn||'').localeCompare(b.nameHe||b.nameEn||'')).slice(0,5));
  const requiredCompanies=[...new Map([...companies.filter(isMissionRelevant),...coverageCompanies].map(c=>[c.id,c])).values()];
  const sorted=companies.filter(c=>!requiredCompanies.includes(c)).sort((a,b)=>score(b)-score(a)||(a.nameHe||a.nameEn||'').localeCompare(b.nameHe||b.nameEn||''));
  return [...new Map([...requiredCompanies,...sorted].slice(0,Math.max(limit,requiredCompanies.length)).map(c=>[c.id,c])).values()];
}

export function abilityDomainProgress(team,cfg){
  const required=cfg.modelProblem?.requiredAbilityTypes||[],abilityTypeById=new Map((cfg.abilities||[]).map(a=>[a.id,a.type])),completed=new Set(team.completedCompanies||[]),progress={};
  required.forEach(type=>progress[type]={type,count:0,companies:[],ready:false});
  (cfg.companies||[]).filter(c=>completed.has(c.id)).forEach(c=>{
    const types=[...new Set((c.abilityIds||[]).map(id=>abilityTypeById.get(id)).filter(type=>progress[type]))];
    types.forEach(type=>{progress[type].count+=1;progress[type].companies.push(c.id);});
  });
  Object.values(progress).forEach(p=>p.ready=p.count>=3);
  return progress;
}
export function finalMissionReadiness(team,cfg){
  const progress=abilityDomainProgress(team,cfg),domains=Object.values(progress),ready=domains.length>0&&domains.every(p=>p.ready);
  return{ready,requiredPerDomain:3,progress,readyDomains:domains.filter(p=>p.ready).length,totalDomains:domains.length,missing:domains.filter(p=>!p.ready).map(p=>p.type)};
}
export function finalMissionOpen(team,cfg){return !!cfg.event?.finalizedAt}

export class CreateTeamSession{constructor(repo){this.repo=repo}async execute(input){const eventCode=String(input.eventCode||'').replace(/\s+/g,'').trim();const event=await this.repo.getEventByCode(eventCode);if(!event)throw Error('eventNotFound');return this.repo.createTeam({eventId:event.id,eventCode,teamAccessId:input.teamAccessId,password:input.password,participantName:String(input.participantName||input.playerName||input.nickname||'').trim(),name:String(input.name||'').trim(),language:input.language,activityDuration:Number(input.activityDuration),participantsCount:Number(input.participantsCount||1)})}}
export class CompleteCompany{constructor(repo){this.repo=repo}async execute({teamId,companyId,answers,photoName,photoFile}){if(this.repo.completeCompany){const res=await this.repo.completeCompany(teamId,{companyId,answers,photoName,photoFile});return res.team||res}const team=await this.repo.getTeam(teamId),cfg=await this.repo.getEventConfig(team.eventId),company=cfg.companies.find(c=>c.id===companyId),qs=cfg.questions.filter(q=>q.companyId===companyId&&q.active);if((team.completedCompanies||[]).includes(companyId)&&!(team.needsPhotoFixCompanies||[]).includes(companyId))return team;let points=5,correct=0;qs.forEach(q=>{if(isCorrect(q,answers[q.id])){points+=q.points;correct++}});if(qs.length&&correct===qs.length)points+=5;const logoBonus=photoFile&&photoFile.size?5:0;const gainedAbilities=(company.stationType||'model')==='knowledge'?[]:(company.abilityIds||[]);team.collectedAbilities=[...new Set([...(team.collectedAbilities||[]),...gainedAbilities])];team.completedCompanies=[...new Set([...(team.completedCompanies||[]),companyId])];team.needsPhotoFixCompanies=(team.needsPhotoFixCompanies||[]).filter(id=>id!==companyId);team.score=(team.score||0)+points+logoBonus;await this.repo.saveSubmission({teamId,companyId,photoName,photoFile,answers,awardedPoints:points+logoBonus,taskPoints:points,logoBonus,status:'completed'});return this.repo.saveTeam(team)}}
export class RequestCheckpoint{constructor(repo){this.repo=repo}async execute(teamId,input={}){const t=await this.repo.getTeam(teamId),cfg=await this.repo.getEventConfig?.(t.eventId).catch?.(()=>null)||await this.repo.getEventConfig?.(t.eventId)||{},cp=nextCheckpoint(t,cfg);if(!cp)throw Error('checkpointNotReady');if(cp.isPending)return t;if(this.repo.requestCheckpoint)return this.repo.requestCheckpoint(teamId,{...input,checkpoint:cp});const record={id:`checkpoint-${Date.now()}`,planId:cp.id,type:cp.type,title:cp.title,description:cp.description,threshold:cp.threshold,piece:cp.piece,status:'requested',photoName:input.photoName||'',photoUrl:input.photoUrl||'',createdAt:new Date().toISOString()};t.checkpoints=[...(t.checkpoints||[]),record];t.checkpointStatus='requested';return this.repo.saveTeam(t)}}
export class RequestFoodBreak{constructor(repo){this.repo=repo}async execute(teamId,input={}){const t=await this.repo.getTeam(teamId),cfg=await this.repo.getEventConfig?.(t.eventId).catch?.(()=>null)||await this.repo.getEventConfig?.(t.eventId)||{},cp=nextFoodBreak(t,cfg);if(!cp)throw Error('foodBreakNotReady');if(this.repo.requestCheckpoint)return this.repo.requestCheckpoint(teamId,{...input,checkpoint:cp,autoApprove:true});const record={id:`checkpoint-${Date.now()}`,planId:cp.id,type:cp.type,title:cp.title,description:cp.description,threshold:cp.threshold,piece:'',status:'approved',photoName:input.photoName||'',photoUrl:input.photoUrl||'',createdAt:new Date().toISOString(),reviewedAt:new Date().toISOString(),autoApproved:true};t.checkpoints=[...(t.checkpoints||[]),record];t.messages=[...(t.messages||[]),{text:cp.type==='funding_photo'?(t.language==='ar'?'تم تسجيل تمويل بنك لئومي. يمكنكم المتابعة.':'מימון בנק לאומי נקלט. אפשר להמשיך.'):(t.language==='ar'?'تم تسجيل استراحة الطعام. يمكنكم المتابعة.':'עצירת האוכל נקלטה. אפשר להמשיך.'),at:new Date().toISOString()}];return this.repo.saveTeam(t)}}
export class ApproveCheckpoint{constructor(repo){this.repo=repo}async execute(teamId,approved=true,note=''){if(this.repo.reviewCheckpoint)return this.repo.reviewCheckpoint(teamId,approved,note);const t=await this.repo.getTeam(teamId),pending=pendingCheckpoint(t);t.checkpoints=(t.checkpoints||[]).map(c=>c.id===pending?.id?{...c,status:approved?'approved':'rejected',reviewedAt:new Date().toISOString(),note}:c);t.checkpointStatus=approved?'approved':'rejected';if(approved){t.currentStage=(t.currentStage||1)+1;if(pending?.piece)t.puzzlePieces=[...new Set([...(t.puzzlePieces||[]),pending.piece])]}t.messages=[...(t.messages||[]),{text:note||(approved?`הצ׳קפוינט אושר. קיבלתם חלק פאזל: ${pending?.piece||'המשך'}`:'הצ׳קפוינט נדחה. חזרו למשימה ונסו שוב.'),at:new Date().toISOString()}];return this.repo.saveTeam(t)}}
export class CalculateModelQuality{constructor(repo){this.repo=repo}async execute(teamId){const t=await this.repo.getTeam(teamId),cfg=await this.repo.getEventConfig(t.eventId),abs=cfg.abilities.filter(a=>t.collectedAbilities?.includes(a.id)),types=[...new Set(abs.map(a=>a.type))],req=cfg.modelProblem.requiredAbilityTypes,coverage=req.filter(x=>types.includes(x)).length/req.length,diversity=Math.min(types.length/6,1),companyFactor=Math.min((t.completedCompanies?.length||0)/(t.activityDuration===60?4:t.activityDuration===90?7:10),1),quality=Math.round((coverage*.55+diversity*.25+companyFactor*.2)*100);if(t.modelQuality!==quality){t.modelQuality=quality;await this.repo.saveTeam(t)}return{quality,abilities:abs,strengths:types,weaknesses:req.filter(x=>!types.includes(x))}}}
export class RepairModel{constructor(repo){this.repo=repo}async execute(teamId,selectedTypes){const t=await this.repo.getTeam(teamId),cfg=await this.repo.getEventConfig(t.eventId),readiness=finalMissionReadiness(t,cfg),selected=[...new Set(selectedTypes||[])],match=selected.filter(x=>cfg.modelProblem.requiredAbilityTypes.includes(x)).length,success=readiness.ready&&match>=3;t.repairs=[...(t.repairs||[]),{selectedTypes:selected,success,readiness,at:new Date().toISOString()}];if(success)t.score=(t.score||0)+25;await this.repo.saveTeam(t);return{success,readiness,messageKey:success?'repairGood':'repairTryAgain'}}}
export class GenerateBase44Prompt{constructor(repo){this.repo=repo}async execute(teamId){const t=await this.repo.getTeam(teamId),cfg=await this.repo.getEventConfig(t.eventId),q=await new CalculateModelQuality(this.repo).execute(teamId),ready=finalMissionReadiness(t,cfg),base=t.language==='ar'?cfg.modelProblem.base44PromptTemplateAr:cfg.modelProblem.base44PromptTemplateHe,names=q.abilities.map(a=>t.language==='ar'?a.nameAr:a.nameHe).join(', '),missing=q.weaknesses.join(', ')||'אין חולשות בולטות',domainLines=Object.values(ready.progress).map(p=>`${p.type}: ${p.count}/3`).join(', ');return`${base}\n\nמשימה סופית: בנו מודל AI משופר שפותר את הבעיה שהוצגה בתחילת המשחק — התאמת תחום טכנולוגי עתידי לתלמידים.\nאימון המודל הוא תהליך חינוכי: הגדירו איזה מידע, הגנות, כללים ובקרה אנושית המודל צריך כדי לתת המלצה טובה ואחראית.\nיכולות שנאספו: ${names}\nחברות שהושלמו: ${t.completedCompanies?.length||0}\nעמידה בתנאי 3 חברות בכל תחום — דאטה, אבטחה, חוויית משתמש, המלצות ואתיקה: ${domainLines}\nחלקי פאזל שנאספו: ${puzzlePieces(t).join(', ')||'אין עדיין'}\nתחומים לשיפור: ${missing}\nהוסף פרטיות, בקרה אנושית, הסבר פשוט לתלמידים והבהרה שההמלצה היא כלי עזר בלבד.`}}
