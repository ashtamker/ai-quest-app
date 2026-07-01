import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');
async function text(file) {
  return readFile(path.join(ROOT, file), 'utf8');
}

test('shadcn-style UI foundation dependencies are installed for React branch', async () => {
  const pkg = JSON.parse(await text('package.json'));
  for (const dep of [
    '@radix-ui/react-dialog',
    '@radix-ui/react-tabs',
    '@radix-ui/react-select',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
    'lucide-react'
  ]) {
    assert.ok(pkg.dependencies[dep], `${dep} should be a runtime dependency`);
  }
});

test('base UI components exist and use AI Quest Tailwind tokens', async () => {
  const files = await readdir(path.join(ROOT, 'src/presentation/react/ui'));
  for (const file of ['Button.jsx', 'Card.jsx', 'Badge.jsx', 'Input.jsx', 'Tabs.jsx', 'Dialog.jsx', 'Select.jsx', 'cn.js', 'index.js']) {
    assert.ok(files.includes(file), `${file} should exist`);
  }

  const button = await text('src/presentation/react/ui/Button.jsx');
  const card = await text('src/presentation/react/ui/Card.jsx');
  const dialog = await text('src/presentation/react/ui/Dialog.jsx');
  const tabs = await text('src/presentation/react/ui/Tabs.jsx');
  const select = await text('src/presentation/react/ui/Select.jsx');
  const barrel = await text('src/presentation/react/ui/index.js');

  assert.match(button, /class-variance-authority/);
  assert.match(button, /bg-quest-primary/);
  assert.match(button, /rounded-quest-md/);
  assert.match(card, /shadow-quest-card/);
  assert.match(card, /bg-quest-deep/);
  assert.match(dialog, /@radix-ui\/react-dialog/);
  assert.match(dialog, /shadow-quest-glow/);
  assert.match(tabs, /@radix-ui\/react-tabs/);
  assert.match(tabs, /data-\[state=active\]:bg-quest-primary/);
  assert.match(select, /@radix-ui\/react-select/);
  assert.match(select, /focus:ring-quest-sky\/30/);
  assert.match(barrel, /export \{ Button/);
  assert.match(barrel, /export \{ Dialog/);
  assert.match(barrel, /export \{ Select/);
});

test('UI foundation is now used by Student while Instructor/Admin remain on existing markup', async () => {
  const main = await text('src/app/main.jsx');
  const student = await text('src/presentation/react/StudentReactApp.jsx');
  const instructor = await text('src/presentation/react/InstructorReactApp.jsx');
  const admin = await text('src/presentation/react/AdminReactApp.jsx');

  assert.doesNotMatch(main, /presentation\/react\/ui/);
  assert.match(student, /import \{ Badge, Button, Card, CardContent, CardHeader, CardTitle \} from '\.\/ui\/index\.js'/);
  assert.match(student, /react-game-company-card/);
  assert.match(student, /react-game-task-block/);
  assert.doesNotMatch(instructor, /presentation\/react\/ui|\.\/ui\//);
  assert.doesNotMatch(admin, /presentation\/react\/ui|\.\/ui\//);
});
