import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function text(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('React student conversion owns join, home, company list, and company task without student-facing legacy copy', async () => {
  const reactStudent = await text('src/presentation/react/StudentReactApp.jsx');
  assert.match(reactStudent, /function StudentJoinScreen/);
  assert.match(reactStudent, /function StudentHomeScreen/);
  assert.match(reactStudent, /function StudentCompaniesScreen/);
  assert.match(reactStudent, /function StudentCompanyTaskScreen/);
  assert.match(reactStudent, /function ReactGeneralAiHelper/);
  assert.match(reactStudent, /function ReactRepairModel/);
  assert.match(reactStudent, /function StudentFinalScreen/);
  assert.match(reactStudent, /new CompleteCompany\(repo\)\.execute/);
  assert.match(reactStudent, /new RequestCheckpoint\(repo\)\.execute/);
  assert.match(reactStudent, /new RequestFoodBreak\(repo\)\.execute/);
  assert.match(reactStudent, /new RepairModel\(repo\)\.execute/);
  assert.match(reactStudent, /new GenerateBase44Prompt\(repo\)\.execute/);
  assert.match(reactStudent, /repo\.askAiHelper/);
  assert.doesNotMatch(reactStudent, /פתחו במסך הישן/);
  assert.doesNotMatch(reactStudent, /מסך ישן/);
});

test('React student mobile CSS covers active home, company list, task screens, and responsive staff entry', async () => {
  const css = await text('src/presentation/react/mobile-polish.css');
  const main = await text('src/app/main.jsx');
  assert.match(css, /React Student conversion — active team home/);
  assert.match(css, /React Student conversion — company list/);
  assert.match(css, /React Student conversion — company task/);
  assert.match(css, /Full responsive polish pass — student shell\/header/);
  assert.match(css, /staff-entry-panel/);
  assert.match(css, /@media\(max-width:32\.5rem\)/);
  assert.match(css, /@media\(max-width:23\.75rem\)/);
  assert.match(css, /z-index:80/);
  assert.match(css, /overflow:visible/);
  assert.match(css, /display:grid!important/);
  assert.doesNotMatch(css, /(?<!1)px/);
  assert.match(main, /staff-entry-panel/);
  assert.doesNotMatch(main, /<details className="staff-entry"/);
  assert.match(css, /react-task-screen/);
  assert.match(css, /react-company-card/);
});

test('React app CSS uses responsive units and reserves px for hairlines', async () => {
  const css = await text('styles.css');
  const nonHairlinePx = css.match(/(?<!1)px/g) || [];
  assert.deepEqual(nonHairlinePx, []);
  assert.match(css, /@media\(max-width:43\.75rem\)/);
  assert.match(css, /font-size:1rem/);
});
