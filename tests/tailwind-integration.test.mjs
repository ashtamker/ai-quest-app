import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');
async function text(file) {
  return readFile(path.join(ROOT, file), 'utf8');
}

test('Tailwind is wired into the React branch without preflight visual reset', async () => {
  const pkg = JSON.parse(await text('package.json'));
  const vite = await text('vite.config.js');
  const main = await text('src/app/main.jsx');
  const css = await text('src/presentation/react/tailwind.css');

  assert.ok(pkg.devDependencies.tailwindcss);
  assert.ok(pkg.devDependencies['@tailwindcss/vite']);
  assert.match(vite, /import tailwindcss from '@tailwindcss\/vite'/);
  assert.match(vite, /plugins: \[react\(\), tailwindcss\(\)\]/);
  assert.match(main, /import '\.\.\/presentation\/react\/tailwind\.css'/);
  assert.match(css, /@import "tailwindcss\/theme" layer\(theme\)/);
  assert.match(css, /@import "tailwindcss\/utilities" layer\(utilities\)/);
  assert.doesNotMatch(css, /tailwindcss\/preflight/);
});

test('Tailwind theme exposes the approved AI Quest color palette and game tokens', async () => {
  const css = await text('src/presentation/react/tailwind.css');

  assert.match(css, /--color-quest-deep: #022b3a/);
  assert.match(css, /--color-quest-teal: #1f7a8c/);
  assert.match(css, /--color-quest-sky: #bfdbf7/);
  assert.match(css, /--color-quest-mist: #e1e5f2/);
  assert.match(css, /--color-quest-white: #ffffff/);
  assert.match(css, /--color-quest-bg: #022b3a/);
  assert.match(css, /--color-quest-primary: #1f7a8c/);
  assert.match(css, /--radius-quest-lg: 1.5rem/);
  assert.match(css, /--shadow-quest-card:/);
  assert.match(css, /--shadow-quest-glow:/);
});
