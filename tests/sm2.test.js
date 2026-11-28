// Run with: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const { addDays, newCard, review, isDue, cardKey, dueItems } = require('../assets/sm2.js');

const DAY = '2026-11-28';

test('first good review is scheduled for tomorrow, second for 6 days later', () => {
  const c1 = review(newCard(DAY), 4, DAY);
  assert.strictEqual(c1.interval, 1);
  assert.strictEqual(c1.due, '2026-11-29');
  const c2 = review(c1, 4, '2026-11-29');
  assert.strictEqual(c2.interval, 6);
  assert.strictEqual(c2.due, '2026-12-05');
});

test('third review multiplies the interval by the ease factor', () => {
  let c = newCard(DAY);
  c = review(c, 5, DAY);
  c = review(c, 5, DAY);
  const before = c;
  c = review(c, 5, DAY);
  assert.strictEqual(c.interval, Math.round(before.interval * before.ef));
});

test('forgetting restarts the card and lowers the ease factor', () => {
  let c = review(review(newCard(DAY), 5, DAY), 5, DAY);
  const f = review(c, 0, DAY);
  assert.strictEqual(f.reps, 0);
  assert.strictEqual(f.interval, 1);
  assert.ok(f.ef < c.ef);
});

test('ease factor never drops below 1.3', () => {
  let c = newCard(DAY);
  for (let i = 0; i < 20; i++) c = review(c, 0, DAY);
  assert.strictEqual(c.ef, 1.3);
});

test('easy raises the ease factor, hard lowers it', () => {
  assert.ok(review(newCard(DAY), 5, DAY).ef > 2.5);
  assert.ok(review(newCard(DAY), 3, DAY).ef < 2.5);
});

test('invalid grades are rejected', () => {
  assert.throws(() => review(newCard(DAY), 2, DAY));
});

test('addDays crosses month and year boundaries', () => {
  assert.strictEqual(addDays('2026-12-30', 3), '2027-01-02');
  assert.strictEqual(addDays('2028-02-28', 1), '2028-02-29');
});

test('isDue is true on and after the due day, and for unseen cards', () => {
  const c = { ef: 2.5, reps: 1, interval: 1, due: '2026-11-29' };
  assert.strictEqual(isDue(c, '2026-11-28'), false);
  assert.strictEqual(isDue(c, '2026-11-29'), true);
  assert.strictEqual(isDue(undefined, DAY), true);
});

test('dueItems lists unseen points and skips points reviewed for the future', () => {
  const chapters = [{ id: 'a', title: 'Limits', points: ['p1', 'p2'] }, { id: 'b', title: 'Loops' }];
  const state = { [cardKey('a', 'p1')]: { ef: 2.5, reps: 1, interval: 1, due: '2026-11-30' } };
  const due = dueItems(chapters, state, DAY);
  assert.deepStrictEqual(due.map((d) => d.point), ['p2']);
  assert.strictEqual(due[0].title, 'Limits');
});
