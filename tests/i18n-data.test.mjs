import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { translations } from '../src/infrastructure/i18n/translations.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'server/data');

async function load(name) {
  return JSON.parse(await readFile(path.join(DATA, `${name}.json`), 'utf8'));
}

test('Hebrew and Arabic UI dictionaries expose the same translation keys', () => {
  const he = Object.keys(translations.he).sort();
  const ar = Object.keys(translations.ar).sort();
  assert.deepEqual(ar, he);
  for (const key of he) {
    assert.ok(String(translations.he[key] || '').trim(), `missing Hebrew translation for ${key}`);
    assert.ok(String(translations.ar[key] || '').trim(), `missing Arabic translation for ${key}`);
  }
});

test('core activity data has Arabic content for student-facing fields', async () => {
  const companies = await load('companies');
  const questions = await load('questions');
  const abilities = await load('abilities');
  const problems = await load('model-problems');
  const content = await load('content');

  assert.ok(companies.length >= 10);
  for (const company of companies) {
    assert.ok(company.nameHe, `company ${company.id} missing nameHe`);
    assert.ok(company.nameAr, `company ${company.id} missing nameAr`);
    assert.ok(company.descriptionHe, `company ${company.id} missing descriptionHe`);
    assert.ok(company.descriptionAr, `company ${company.id} missing descriptionAr`);
    assert.ok(company.logoMark, `company ${company.id} missing logoMark`);
    assert.equal(typeof company.logoUrl, 'string', `company ${company.id} missing logoUrl string`);
  }

  assert.ok(questions.length >= 10);
  for (const question of questions) {
    assert.ok(question.textHe, `question ${question.id} missing textHe`);
    assert.ok(question.textAr, `question ${question.id} missing textAr`);
    assert.ok(question.explanationHe, `question ${question.id} missing explanationHe`);
    assert.ok(question.explanationAr, `question ${question.id} missing explanationAr`);
    if ((question.optionsHe || []).length) assert.equal((question.optionsAr || []).length, question.optionsHe.length, `question ${question.id} optionsAr length mismatch`);
  }

  assert.ok(abilities.length >= 10);
  for (const ability of abilities) {
    assert.ok(ability.nameHe, `ability ${ability.id} missing nameHe`);
    assert.ok(ability.nameAr, `ability ${ability.id} missing nameAr`);
    assert.ok(!/[\u0590-\u05FF]/.test(ability.nameAr), `ability ${ability.id} nameAr contains Hebrew text`);
    assert.ok(ability.type, `ability ${ability.id} missing type`);
  }

  for (const problem of problems) {
    assert.ok(problem.titleHe, `problem ${problem.id} missing titleHe`);
    assert.ok(problem.titleAr, `problem ${problem.id} missing titleAr`);
    assert.ok(problem.descriptionHe, `problem ${problem.id} missing descriptionHe`);
    assert.ok(problem.descriptionAr, `problem ${problem.id} missing descriptionAr`);
    assert.ok(problem.base44PromptTemplateHe, `problem ${problem.id} missing base44PromptTemplateHe`);
    assert.ok(problem.base44PromptTemplateAr, `problem ${problem.id} missing base44PromptTemplateAr`);
  }

  assert.ok(content.openingStory?.he, 'missing Hebrew opening story');
  assert.ok(content.openingStory?.ar, 'missing Arabic opening story');
  for (const term of content.glossary || []) {
    assert.ok(term.termHe, `glossary ${term.id} missing termHe`);
    assert.ok(term.termAr, `glossary ${term.id} missing termAr`);
    assert.ok(term.explanationHe, `glossary ${term.id} missing explanationHe`);
    assert.ok(term.explanationAr, `glossary ${term.id} missing explanationAr`);
  }
});
