import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function text(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('React admin route owns the admin dashboard', async () => {
  const main = await text('src/app/main.jsx');
  const admin = await text('src/presentation/react/AdminReactApp.jsx');

  assert.match(main, /import \{ AdminReactApp \} from '\.\.\/presentation\/react\/AdminReactApp\.jsx'/);
  assert.match(main, /route === 'admin'[\s\S]*<AdminReactApp repo=\{repo\} lang=\{lang\} \/>/);
  assert.match(admin, /export function AdminReactApp/);
  assert.match(admin, /repo\.state\(\)/);
  assert.match(admin, /function EventsTab/);
  assert.match(admin, /function QuestionsTab/);
  assert.match(admin, /function CompaniesTab/);
  assert.match(admin, /function PuzzleTab/);
  assert.match(admin, /function ToolsTab/);
});

test('React admin exposes critical save and dangerous actions with confirmation', async () => {
  const admin = await text('src/presentation/react/AdminReactApp.jsx');
  assert.match(admin, /repo\.saveEvent/);
  assert.match(admin, /repo\.saveQuestion/);
  assert.match(admin, /repo\.saveCompany/);
  assert.match(admin, /repo\.saveProblem/);
  assert.match(admin, /repo\.uploadPuzzleImage/);
  assert.match(admin, /repo\.duplicateEvent/);
  assert.match(admin, /repo\.deleteEvent/);
  assert.match(admin, /repo\.eventResults/);
  assert.match(admin, /repo\.reset\(\)/);
  assert.match(admin, /confirm\('לאפס את כל הצוותים/);
  assert.match(admin, /prompt\('כדי לאשר מחיקה סופית כתוב: מחיקה'\)/);
});
