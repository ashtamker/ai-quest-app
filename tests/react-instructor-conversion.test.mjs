import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function text(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('React instructor route owns the instructor dashboard', async () => {
  const main = await text('src/app/main.jsx');
  const instructor = await text('src/presentation/react/InstructorReactApp.jsx');

  assert.match(main, /import \{ InstructorReactApp \} from '\.\.\/presentation\/react\/InstructorReactApp\.jsx'/);
  assert.match(main, /route === 'instructor'[\s\S]*<InstructorReactApp repo=\{repo\} lang=\{lang\} \/>/);
  assert.match(instructor, /export function InstructorReactApp/);
  assert.match(instructor, /repo\.listActiveEvents/);
  assert.match(instructor, /repo\.listTeams/);
  assert.match(instructor, /repo\.listAllSubmissions/);
  assert.match(instructor, /new ApproveCheckpoint\(repo\)\.execute/);
  assert.match(instructor, /repo\.reviewSubmission/);
  assert.match(instructor, /repo\.sendGroupMessage/);
  assert.match(instructor, /repo\.pauseEvent/);
  assert.match(instructor, /repo\.finalizeEvent/);
  assert.match(instructor, /repo\.resetTeam/);
});

test('React instructor photo board keeps approved photos hidden', async () => {
  const instructor = await text('src/presentation/react/InstructorReactApp.jsx');
  assert.match(instructor, /const pendingPhotos = submissions\.filter\(\(submission\) => submission\.instructorReviewStatus === 'pending'\)/);
  assert.match(instructor, /filter === 'photos' \? <PhotoBoard submissions=\{pendingPhotos\}/);
  assert.doesNotMatch(instructor, /pendingPhotos\.length \? pendingPhotos : submissions/);
  assert.doesNotMatch(instructor, /instructorReviewStatus === 'valid'[\s\S]*PhotoBoard/);
});
