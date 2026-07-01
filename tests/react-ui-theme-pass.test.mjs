import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');
async function text(file) {
  return readFile(path.join(ROOT, file), 'utf8');
}

test('React UI theme bridge targets student, instructor, and admin screens', async () => {
  const css = await text('src/presentation/react/tailwind.css');
  const main = await text('src/app/main.jsx');
  const student = await text('src/presentation/react/StudentReactApp.jsx');
  const instructor = await text('src/presentation/react/InstructorReactApp.jsx');
  const admin = await text('src/presentation/react/AdminReactApp.jsx');

  assert.match(main, /import '\.\.\/\.\.\/styles\.css'/);
  assert.match(main, /import '\.\.\/presentation\/react\/tailwind\.css'/);
  assert.match(main, /import '\.\.\/presentation\/react\/mobile-polish\.css'/);

  for (const marker of ['react-student-home', 'react-companies-screen', 'react-task-screen', 'react-student-join']) {
    assert.match(student, new RegExp(marker));
    assert.match(css, new RegExp(`\\.${marker}`));
  }
  assert.match(instructor, /react-instructor-shell/);
  assert.match(admin, /react-admin-shell/);
  assert.match(css, /\.react-instructor-shell/);
  assert.match(css, /\.react-admin-shell/);
});

test('React UI theme bridge uses approved Quest palette tokens without preflight', async () => {
  const css = await text('src/presentation/react/tailwind.css');

  assert.match(css, /Stage 3 visual bridge/);
  assert.match(css, /var\(--color-quest-teal\)/);
  assert.match(css, /var\(--color-quest-sky\)/);
  assert.match(css, /var\(--color-quest-deep\)/);
  assert.match(css, /var\(--shadow-quest-card\)/);
  assert.match(css, /var\(--shadow-quest-glow\)/);
  assert.match(css, /\.react-companies-screen \.company-card\.done/);
  assert.match(css, /\.react-instructor-shell button\.danger/);
  assert.match(css, /\.react-admin-shell \.admin-tabs button\.active/);
  assert.doesNotMatch(css, /tailwindcss\/preflight/);
});
