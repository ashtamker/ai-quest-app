import assert from 'node:assert/strict';
import test from 'node:test';
import { seed } from '../src/data/data-sources/local/seed.js';
import { ApproveCheckpoint, CalculateModelQuality, CompleteCompany, CreateTeamSession, GenerateBase44Prompt, nextCheckpoint, nextFoodBreak, puzzlePieces, RepairModel, RequestCheckpoint, RequestFoodBreak, selectCompaniesForDuration, finalMissionReadiness } from '../src/domain/use-cases/useCases.js';

class Repo {
  constructor(team = {}) {
    this.team = {
      id: 't1',
      eventId: 'event-gav-yam',
      language: 'he',
      activityDuration: 90,
      completedCompanies: ['nvidia', 'cyberark', 'wix'],
      collectedAbilities: ['compute', 'security', 'ux', 'recommendation'],
      score: 50,
      checkpoints: [],
      puzzlePieces: [],
      repairs: [],
      needsPhotoFixCompanies: [],
      ...team,
    };
    this.submissions = [];
  }
  async getTeam() { return this.team; }
  async saveTeam(t) { this.team = t; return t; }
  async saveSubmission(sub) { this.submissions.push(sub); return { id: `sub-${this.submissions.length}`, ...sub }; }
  async getEventConfig() { return { event: seed.events[0], modelProblem: seed.modelProblems[0], companies: seed.companies, questions: seed.questions, abilities: seed.abilities }; }
}


test('team session creation forwards fixed-team password data to repository', async () => {
  let payload;
  const repo = {
    async getEventByCode(code) { return { id: 'event-gav-yam', code }; },
    async createTeam(data) { payload = data; return { id: 'event-gav-yam-red', ...data }; }
  };
  const team = await new CreateTeamSession(repo).execute({ eventCode: ' GAVYAM ', teamAccessId: 'red', password: 'R4821', participantName: 'נועה', language: 'he', activityDuration: 90, participantsCount: 5 });
  assert.equal(payload.eventCode, 'GAVYAM');
  assert.equal(payload.teamAccessId, 'red');
  assert.equal(payload.password, 'R4821');
  assert.equal(payload.participantName, 'נועה');
  assert.equal(team.id, 'event-gav-yam-red');
});

test('model quality and Base44 prompt are generated from collected abilities', async () => {
  const repo = new Repo();
  const quality = await new CalculateModelQuality(repo).execute('t1');
  assert.ok(quality.quality >= 50);
  assert.ok(quality.abilities.length >= 3);
  const prompt = await new GenerateBase44Prompt(repo).execute('t1');
  assert.match(prompt, /אפליקציה/);
  assert.match(prompt, /יכולות שנאספו/);
});

test('admin-managed stops use food at 4 and instructor checkpoints afterward', async () => {
  const repo = new Repo({ completedCompanies: Array.from({ length: 10 }, (_, i) => `c${i}`) });
  assert.equal(nextFoodBreak(new Repo({ completedCompanies: ['a','b','c'] }).team), null);
  assert.equal(nextFoodBreak(new Repo({ completedCompanies: ['a','b','c','d'] }).team)?.id, 'cp-food-break');
  let cp = nextCheckpoint(repo.team);
  assert.equal(cp?.id, 'cp-instructor-1');
  assert.equal(cp.type, 'instructor_approval');
  assert.equal(cp.threshold, 10);

  await new RequestCheckpoint(repo).execute('t1');
  assert.equal(repo.team.checkpointStatus, 'requested');
  assert.equal(nextCheckpoint(repo.team)?.isPending, true);
  await new ApproveCheckpoint(repo).execute('t1', true, 'ok');
  assert.ok(puzzlePieces(repo.team).includes('חלק 1'));

  repo.team.completedCompanies = Array.from({ length: 17 }, (_, i) => `c${i}`);
  cp = nextCheckpoint(repo.team);
  assert.equal(cp?.id, 'cp-instructor-2');
  assert.equal(cp.threshold, 17);
  await new RequestCheckpoint(repo).execute('t1');
  await new ApproveCheckpoint(repo).execute('t1', true, 'ok');
  assert.ok(puzzlePieces(repo.team).includes('חלק 2'));

  repo.team.completedCompanies = Array.from({ length: 24 }, (_, i) => `d${i}`);
  cp = nextCheckpoint(repo.team);
  assert.equal(cp?.id, 'cp-instructor-3');
  assert.equal(cp.threshold, 24);
});

test('all activity durations expose food at 4 and first instructor checkpoint at 10 companies', () => {
  assert.equal(nextFoodBreak(new Repo({ activityDuration: 60, completedCompanies: ['a', 'b', 'c'] }).team), null);
  assert.equal(nextFoodBreak(new Repo({ activityDuration: 60, completedCompanies: ['a', 'b', 'c', 'd'] }).team)?.id, 'cp-food-break');
  assert.equal(nextCheckpoint(new Repo({ activityDuration: 60, completedCompanies: Array.from({length:9},(_,i)=>`c${i}`) }).team), null);
  assert.equal(nextCheckpoint(new Repo({ activityDuration: 90, completedCompanies: Array.from({length:10},(_,i)=>`c${i}`) }).team)?.id, 'cp-instructor-1');
  assert.equal(nextCheckpoint(new Repo({ activityDuration: 135, completedCompanies: Array.from({length:10},(_,i)=>`c${i}`) }).team)?.id, 'cp-instructor-1');
});

test('food break is non-blocking and Arabic checkpoint labels are returned', async () => {
  const repo = new Repo({ language: 'ar', activityDuration: 60, completedCompanies: ['a', 'b', 'c', 'd'] });
  const food = nextFoodBreak(repo.team);
  assert.equal(food.id, 'cp-food-break');
  assert.equal(food.autoApprove, true);
  await new RequestFoodBreak(repo).execute('t1', { photoName: 'food.png' });
  assert.equal(repo.team.checkpointStatus, undefined);
  assert.equal(repo.team.checkpoints.at(-1).status, 'approved');

  repo.team.completedCompanies = Array.from({ length: 10 }, (_, i) => `c${i}`);
  const cp = nextCheckpoint(repo.team);
  assert.equal(cp.id, 'cp-instructor-1');
  assert.match(cp.title, /المرشد/);
  assert.equal(cp.piece, 'قطعة 1');
});

test('company completion awards points, abilities, submissions, and clears photo-fix state', async () => {
  const repo = new Repo({ completedCompanies: [], collectedAbilities: [], needsPhotoFixCompanies: ['nvidia'], score: 0 });
  const cfg = await repo.getEventConfig();
  const company = cfg.companies.find(c => c.id === 'nvidia') || cfg.companies[0];
  const questions = cfg.questions.filter(q => q.companyId === company.id && q.active);
  const answers = Object.fromEntries(questions.map(q => [q.id, q.type === 'short' ? (q.acceptedKeywords?.[0] || q.correctText || 'ok') : String(q.correctAnswer ?? 0)]));
  const team = await new CompleteCompany(repo).execute({ teamId: 't1', companyId: company.id, answers, photoName: 'logo.png' });
  assert.ok(team.completedCompanies.includes(company.id));
  assert.ok(company.abilityIds.every(id => team.collectedAbilities.includes(id)));
  assert.ok(!team.needsPhotoFixCompanies.includes(company.id));
  assert.ok(team.score > 0);
  assert.equal(repo.submissions.length, 1);
  assert.equal(repo.submissions[0].companyId, company.id);
});


test('knowledge stations award points without adding model abilities', async () => {
  const repo = new Repo({ completedCompanies: [], collectedAbilities: [], score: 0 });
  const cfg = await repo.getEventConfig();
  const company = cfg.companies.find(c => c.stationType === 'knowledge' && (c.abilityIds || []).length);
  assert.ok(company, 'expected at least one knowledge station with legacy ability ids');
  const team = await new CompleteCompany(repo).execute({ teamId: repo.team.id, companyId: company.id, answers: {}, photoName: '' });
  assert.ok(team.completedCompanies.includes(company.id));
  assert.equal(team.collectedAbilities.length, 0);
  assert.ok(team.score > 0);
});

test('final mission requires 3 completed companies in every required ability domain', async () => {
  const repo = new Repo({ completedCompanies: ['2bprecise','hyperguest','lightricks','cert','cyberark','morphisec','let','tap-mobile','wix','taboola','microsoft','altera-digital-health','ecosystem','tech7','pwc-israel'] });
  const cfg = await repo.getEventConfig();
  const ready = finalMissionReadiness(repo.team, cfg);
  assert.equal(ready.ready, true);
  for (const type of cfg.modelProblem.requiredAbilityTypes) assert.ok(ready.progress[type].count >= 3, `${type} should have 3 completed companies`);
});

test('required ability domains have at least 5 active companies in the bank', async () => {
  const repo = new Repo();
  const cfg = await repo.getEventConfig();
  const typeById = new Map(cfg.abilities.map(a => [a.id, a.type]));
  for (const type of cfg.modelProblem.requiredAbilityTypes) {
    const companies = cfg.companies.filter(c => (c.abilityIds || []).some(id => typeById.get(id) === type));
    assert.ok(companies.length >= 5, `${type} has only ${companies.length} companies`);
  }
});

test('model repair rewards only teams ready for the final mission', async () => {
  const repo = new Repo({ completedCompanies: ['2bprecise','hyperguest','lightricks','cert','cyberark','morphisec','let','tap-mobile','wix','taboola','microsoft','altera-digital-health','ecosystem','tech7','pwc-israel'], repairs: [], score: 0 });
  const cfg = await repo.getEventConfig();
  const success = await new RepairModel(repo).execute('t1', cfg.modelProblem.requiredAbilityTypes.slice(0, 3));
  assert.equal(success.success, true);
  assert.equal(repo.team.score, 25);
  const fail = await new RepairModel(repo).execute('t1', ['totally-unrelated']);
  assert.equal(fail.success, false);
  assert.equal(repo.team.repairs.length, 2);
});

test('company list is duration-aware and always includes mission-relevant companies', async () => {
  const repo = new Repo();
  const cfg = await repo.getEventConfig();
  const short60 = selectCompaniesForDuration(cfg, 60);
  const mid90 = selectCompaniesForDuration(cfg, 90);
  const all135 = selectCompaniesForDuration(cfg, 135);
  assert.equal(all135.length, cfg.companies.length);
  assert.ok(short60.length < mid90.length);
  assert.ok(mid90.length <= all135.length);
  for (const id of ['microsoft', 'nvidia', 'cyberark']) {
    assert.ok(short60.some(c => c.id === id), `expected ${id} in short activity list`);
  }
  const relevant = cfg.companies.filter(c => String(c.modelRelevance || '').includes('ישיר') || ['microsoft', 'nvidia', 'intel', 'oracle', 'ibm', 'dell', 'cyberark', 'wix'].includes(c.id));
  for (const company of relevant) {
    assert.ok(short60.some(c => c.id === company.id), `mission-relevant/known company missing: ${company.id}`);
  }
});
