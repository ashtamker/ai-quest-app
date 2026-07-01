import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');
async function text(file) {
  return readFile(path.join(ROOT, file), 'utf8');
}

test('React instructor mobile layout is hardened against horizontal overflow', async () => {
  const css = await text('src/presentation/react/mobile-polish.css');
  const instructor = await text('src/presentation/react/InstructorReactApp.jsx');

  assert.match(instructor, /react-instructor-shell/);
  assert.match(css, /Instructor mobile overflow hardening/);
  assert.match(css, /\.react-shell\.route-instructor\{[\s\S]*max-width:100vw;[\s\S]*overflow-x:hidden;/);
  assert.match(css, /\.react-shell\.route-instructor #screen\{[\s\S]*width:100%;[\s\S]*max-width:100%;[\s\S]*min-width:0;[\s\S]*overflow-x:hidden;/);
  assert.match(css, /\.react-instructor-shell,[\s\S]*\.react-instructor-shell \*,[\s\S]*max-width:100%;[\s\S]*min-width:0;/);
  assert.match(css, /\.react-instructor-shell \.leaderboard-table-wrap\{[\s\S]*overflow-x:auto;/);
  assert.match(css, /\.react-instructor-shell \.leaderboard-table\{[\s\S]*min-width:36rem;/);
});
