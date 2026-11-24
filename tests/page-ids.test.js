// Every element a page script looks up by id must exist on that page.
// Guards against the Chapters course dropdown staying empty because the
// script looked for an id the HTML never had. Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const PAGES = { 'chapters.html': 'assets/chapters.js', 'quiz.html': 'assets/quiz.js', 'schedule.html': 'assets/schedule.js' };

for (const [html, js] of Object.entries(PAGES)) {
  test(`${js} only looks up ids that exist in ${html}`, () => {
    const ids = new Set([...read(html).matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
    const wanted = [...read(js).matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
    const missing = [...new Set(wanted)].filter((id) => !ids.has(id));
    assert.deepStrictEqual(missing, [], `missing ids in ${html}: ${missing.join(', ')}`);
  });
}
