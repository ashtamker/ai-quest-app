import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { seed } from '../../src/data/data-sources/local/seed.js';

const seedMap = {
  events: seed.events,
  teams: [],
  companies: seed.companies,
  questions: seed.questions,
  abilities: seed.abilities,
  'model-problems': seed.modelProblems,
  content: seed.content || { openingStory: {}, glossary: [] },
  submissions: [],
  'checkpoint-requests': [],
  'instructor-messages': []
};

export class JsonStore {
  constructor(baseDir = new URL('../data', import.meta.url).pathname) {
    this.baseDir = baseDir;
    this.queue = Promise.resolve();
  }

  path(name) { return join(this.baseDir, `${name}.json`); }

  async ensure() {
    await mkdir(this.baseDir, { recursive: true });
    for (const [name, value] of Object.entries(seedMap)) {
      try { await readFile(this.path(name), 'utf8'); }
      catch { await this.write(name, value); }
    }
  }

  async read(name) {
    await this.ensure();
    await this.queue;
    const raw = await readFile(this.path(name), 'utf8');
    return JSON.parse(raw || '[]');
  }

  async write(name, value) {
    await mkdir(dirname(this.path(name)), { recursive: true });
    const target = this.path(name);
    const tmp = `${target}.tmp`;
    const body = JSON.stringify(value, null, 2);
    this.queue = this.queue.then(async () => {
      await writeFile(tmp, body, 'utf8');
      await rename(tmp, target);
    });
    await this.queue;
    return value;
  }

  async update(name, fn) {
    await this.ensure();
    const target = this.path(name);
    const tmp = `${target}.tmp`;
    let next;
    this.queue = this.queue.then(async () => {
      const raw = await readFile(target, 'utf8');
      const list = JSON.parse(raw || '[]');
      next = await fn(list);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(tmp, JSON.stringify(next, null, 2), 'utf8');
      await rename(tmp, target);
    });
    await this.queue;
    return next;
  }

  async state() {
    const [events, teams, companies, questions, abilities, modelProblems, content, submissions, checkpointRequests, instructorMessages] = await Promise.all([
      this.read('events'), this.read('teams'), this.read('companies'), this.read('questions'), this.read('abilities'), this.read('model-problems'), this.read('content'), this.read('submissions'), this.read('checkpoint-requests'), this.read('instructor-messages')
    ]);
    return { events, teams, companies, questions, abilities, modelProblems, content, submissions, checkpointRequests, instructorMessages };
  }

  async resetRuntime() {
    await this.write('teams', []);
    await this.write('submissions', []);
    await this.write('checkpoint-requests', []);
    await this.write('instructor-messages', []);
  }
}
