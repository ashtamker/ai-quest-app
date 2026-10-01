import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const homepage = readFileSync(join(root, 'index.html'), 'utf8');
const courseHome = readFileSync(join(root, 'ort-courses.html'), 'utf8');

function assertIncludes(source, needle, message = `Missing: ${needle}`) {
  assert.ok(source.includes(needle), message);
}

assertIncludes(homepage, 'href="ort-courses.html"', 'homepage should link to the ORT course hub');
assertIncludes(homepage, 'assets/course-covers/ort-ai-agents.svg', 'homepage ORT card should include cover media');
assertIncludes(homepage, '<h3>קורסי אורט</h3>', 'homepage should show an ORT catalog card');

assertIncludes(courseHome, '<title>קורסי אורט · דרך ההייטק</title>');
assertIncludes(courseHome, 'סייבר לרשת אורט');
assertIncludes(courseHome, 'Python בסיסי לרשת אורט');
assertIncludes(courseHome, 'VibeCoding + AI');
assertIncludes(courseHome, 'בניית סוכני AI אישיים');

for (let lesson = 1; lesson <= 8; lesson += 1) {
  const vibeLessonFile = `ort-vibecoding-lesson-${lesson}.html`;
  const vibeSlidesFile = `ort-vibecoding-slides-${lesson}.html`;
  assert.ok(existsSync(join(root, vibeLessonFile)), `${vibeLessonFile} should exist`);
  assert.ok(existsSync(join(root, vibeSlidesFile)), `${vibeSlidesFile} should exist`);
  assertIncludes(courseHome, `href="${vibeLessonFile}"`, `ORT hub should link to ${vibeLessonFile}`);
  const vibeLessonHtml = readFileSync(join(root, vibeLessonFile), 'utf8');
  assertIncludes(vibeLessonHtml, 'href="ort-courses.html"', `${vibeLessonFile} should link back to the ORT hub`);
  assertIncludes(vibeLessonHtml, `href="${vibeSlidesFile}"`, `${vibeLessonFile} should link to its instructor slides`);
  assertIncludes(vibeLessonHtml, '/js/feedback-widget.js', `${vibeLessonFile} should load the shared feedback widget`);
  const vibeSlidesHtml = readFileSync(join(root, vibeSlidesFile), 'utf8');
  assertIncludes(vibeSlidesHtml, 'href="ort-courses.html"', `${vibeSlidesFile} should link back to the ORT hub`);
  assertIncludes(vibeSlidesHtml, `href="${vibeLessonFile}"`, `${vibeSlidesFile} should link to its student lesson`);
  assertIncludes(vibeSlidesHtml, '/js/feedback-widget.js', `${vibeSlidesFile} should load the shared feedback widget`);
}

for (let lesson = 1; lesson <= 8; lesson += 1) {
  const pythonLessonFile = `ort-python-lesson-${lesson}.html`;
  const pythonSlidesFile = `ort-python-slides-${lesson}.html`;
  assert.ok(existsSync(join(root, pythonLessonFile)), `${pythonLessonFile} should exist`);
  assert.ok(existsSync(join(root, pythonSlidesFile)), `${pythonSlidesFile} should exist`);
  assertIncludes(courseHome, `href="${pythonLessonFile}"`, `ORT hub should link to ${pythonLessonFile}`);
  const pythonLessonHtml = readFileSync(join(root, pythonLessonFile), 'utf8');
  assertIncludes(pythonLessonHtml, 'href="ort-courses.html"', `${pythonLessonFile} should link back to the ORT hub`);
  assertIncludes(pythonLessonHtml, `href="${pythonSlidesFile}"`, `${pythonLessonFile} should link to its instructor slides`);
  assertIncludes(pythonLessonHtml, '/js/feedback-widget.js', `${pythonLessonFile} should load the shared feedback widget`);
  const pythonSlidesHtml = readFileSync(join(root, pythonSlidesFile), 'utf8');
  assertIncludes(pythonSlidesHtml, 'href="ort-courses.html"', `${pythonSlidesFile} should link back to the ORT hub`);
  assertIncludes(pythonSlidesHtml, `href="${pythonLessonFile}"`, `${pythonSlidesFile} should link to its student lesson`);
  assertIncludes(pythonSlidesHtml, '/js/feedback-widget.js', `${pythonSlidesFile} should load the shared feedback widget`);
}

for (let lesson = 1; lesson <= 8; lesson += 1) {
  const lessonFile = `ort-ai-agents-lesson-${lesson}.html`;
  const slidesFile = `ort-ai-agents-slides-${lesson}.html`;

  assert.ok(existsSync(join(root, lessonFile)), `${lessonFile} should exist`);
  assert.ok(existsSync(join(root, slidesFile)), `${slidesFile} should exist`);

  assertIncludes(courseHome, `href="${lessonFile}"`, `ORT hub should link to ${lessonFile}`);

  const lessonHtml = readFileSync(join(root, lessonFile), 'utf8');
  assertIncludes(lessonHtml, 'href="ort-courses.html"', `${lessonFile} should link back to the ORT hub`);
  assertIncludes(lessonHtml, `href="${slidesFile}"`, `${lessonFile} should link to its instructor slides`);
  assertIncludes(lessonHtml, '/js/feedback-widget.js', `${lessonFile} should load the shared feedback widget`);

  const slidesHtml = readFileSync(join(root, slidesFile), 'utf8');
  assertIncludes(slidesHtml, 'href="ort-courses.html"', `${slidesFile} should link back to the ORT hub`);
  assertIncludes(slidesHtml, `href="${lessonFile}"`, `${slidesFile} should link to its student lesson`);
  assertIncludes(slidesHtml, '/js/feedback-widget.js', `${slidesFile} should load the shared feedback widget`);
}

console.log('ort-ai-agents-course tests passed');
