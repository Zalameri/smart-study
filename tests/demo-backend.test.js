// Tests for the static demo mode (assets/demo-backend.js). Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { createDemoBackend, isDemoEnabled } = require('../assets/demo-backend.js');

function memoryStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

test('demo mode is off unless ?demo=1 is used, and ?demo=0 turns it off again', () => {
  const store = memoryStore();
  assert.strictEqual(isDemoEnabled('', store), false);
  assert.strictEqual(isDemoEnabled('?demo=1', store), true);
  assert.strictEqual(isDemoEnabled('', store), true, 'flag survives navigation within the tab');
  assert.strictEqual(isDemoEnabled('?demo=0', store), false);
  assert.strictEqual(isDemoEnabled('', store), false);
});

test('auth check reports an authenticated demo user', () => {
  const api = createDemoBackend(memoryStore());
  const res = api.handle('backend/auth.php?action=check');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.authenticated, true);
});

test('seed data has courses, schedule and chapters with the field names the UI reads', () => {
  const api = createDemoBackend(memoryStore());
  const courses = api.handle('backend/api.php?m=get&key=sp_courses').body;
  const schedule = api.handle('backend/api.php?m=get&key=sp_schedule').body;
  const chapters = api.handle('backend/api.php?m=get&key=sp_chapters').body;
  assert.ok(courses.length > 0 && schedule.length > 0 && chapters.length > 0);
  const ids = new Set(courses.map((c) => c.id));
  for (const s of schedule) {
    assert.ok(ids.has(s.courseId), 'schedule item points at a seeded course');
    assert.ok(s.start && s.end && s.day);
  }
  for (const ch of chapters) {
    assert.ok(ids.has(ch.courseId));
    assert.ok(Array.isArray(ch.points) && ch.points.length > 0);
  }
});

test('data written with m=set is read back, and stays separate per store', () => {
  const store = memoryStore();
  const api = createDemoBackend(store);
  const newCourses = [{ id: 'x1', name: 'AI', code: 'CS300', color: '#fff' }];
  const set = api.handle('backend/api.php?m=set&key=sp_courses', { method: 'POST', body: JSON.stringify(newCourses) });
  assert.deepStrictEqual(set.body, { ok: true });
  // a new backend on the same store sees the data (page navigation)
  assert.deepStrictEqual(createDemoBackend(store).handle('backend/api.php?m=get&key=sp_courses').body, newCourses);
  // a different store (another tab) still gets the seed data
  assert.notDeepStrictEqual(createDemoBackend(memoryStore()).handle('backend/api.php?m=get&key=sp_courses').body, newCourses);
});

test('invalid keys, non-array payloads and AI summaries are rejected like the real backend', () => {
  const api = createDemoBackend(memoryStore());
  assert.strictEqual(api.handle('backend/api.php?m=get&key=users').status, 400);
  const bad = api.handle('backend/api.php?m=set&key=sp_courses', { method: 'POST', body: '{"a":1}' });
  assert.strictEqual(bad.status, 400);
  assert.strictEqual(api.handle('backend/summarize.php', { method: 'POST', body: '{}' }).status, 503);
});

test('corrupted stored data falls back to the seed data instead of crashing', () => {
  const store = memoryStore();
  store.setItem('sp_demo_data', '{not json');
  const res = createDemoBackend(store).handle('backend/api.php?m=get&key=sp_courses');
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.length > 0);
});

test('every page loads demo-backend.js before app.js', () => {
  const root = path.join(__dirname, '..');
  for (const page of ['index', 'login', 'register', 'schedule', 'chapters', 'quiz']) {
    const html = fs.readFileSync(path.join(root, `${page}.html`), 'utf8');
    const demo = html.indexOf('assets/demo-backend.js');
    const app = html.indexOf('assets/app.js');
    assert.ok(demo !== -1 && demo < app, `${page}.html must load demo-backend.js before app.js`);
  }
});
