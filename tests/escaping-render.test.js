// Guards against XSS regressions: user-written names/titles/notes must be escaped
// before they are placed into innerHTML templates. Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

// User-controlled placeholders that must never appear raw inside a template string.
const RAW_FIELDS = [
  '${c.name}', '${c.color}', '${c.code}', 'value="${c.id}"',
  '${ch.title}', '${ch.id}', '${course?.name', '${course?.color',
  '${e.note}', '${e.start}', '${e.end}', '${e.id}',
  "' + e.place", '${label}', '${badge}', '${p}',
];

for (const file of ['assets/quiz.js', 'assets/chapters.js', 'assets/schedule.js']) {
  test(`${file} does not insert raw user fields into HTML templates`, () => {
    const src = read(file);
    for (const field of RAW_FIELDS) {
      assert.ok(!src.includes(field), `${file} contains unescaped ${field}`);
    }
  });
}

for (const page of ['chapters.html', 'schedule.html', 'quiz.html']) {
  test(`${page} loads quiz-utils.js (escapeHtml) before its page script`, () => {
    const html = read(page);
    const utils = html.indexOf('assets/quiz-utils.js');
    assert.ok(utils !== -1, `${page} must load assets/quiz-utils.js`);
    const pageScript = html.search(/assets\/(quiz|chapters|schedule)\.js/);
    assert.ok(utils < pageScript, `${page}: quiz-utils.js must come first`);
  });
}

test('escapeHtml neutralises a course name used in an option tag', () => {
  const { escapeHtml } = require('../assets/quiz-utils.js');
  const html = `<option value="${escapeHtml('x" onmouseover="alert(1)')}">${escapeHtml('<script>alert(1)</script>')}</option>`;
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('" onmouseover'));
});
