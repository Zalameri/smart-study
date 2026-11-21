// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const { escapeHtml, cleanWord, generateQuiz, mutate } = require('../assets/quiz-utils.js');

test('escapeHtml neutralises markup from notes', () => {
  assert.strictEqual(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.strictEqual(escapeHtml(`"a" & 'b'`), '&quot;a&quot; &amp; &#39;b&#39;');
});

test('cleanWord keeps Arabic and Latin letters, drops punctuation', () => {
  assert.strictEqual(cleanWord('الخوارزمية،'), 'الخوارزمية');
  assert.strictEqual(cleanWord('(Python,)'), 'Python');
  assert.strictEqual(cleanWord('---'), '');
});

test('Arabic notes produce questions instead of hanging', () => {
  const facts = [
    'الذكاء الاصطناعي يحاكي القدرات الذهنية للإنسان',
    'التعلم الآلي يعتمد على البيانات لتحسين الأداء',
    'الشبكات العصبية مستوحاة من الدماغ البشري',
  ];
  const quiz = generateQuiz(facts, 5, 'mix');
  assert.ok(quiz.length > 0);
  quiz.forEach(q => assert.ok(q.question.length > 0));
});

test('generation gives up instead of looping when nothing is usable', () => {
  const unusable = ['--- ---', '!!! !!!', '... ...'];
  assert.deepStrictEqual(generateQuiz(unusable, 5, 'mcq'), []);
});

test('multiple-choice answer is always one of the options', () => {
  const facts = ['Python is interpreted', 'Java is compiled', 'SQL queries databases', 'HTML structures pages'];
  generateQuiz(facts, 20, 'mcq').forEach(q => assert.ok(q.options.includes(q.answer)));
});

test('true/false mutation changes the statement', () => {
  assert.notStrictEqual(mutate('Stacks are always LIFO'), 'Stacks are always LIFO');
  assert.strictEqual(mutate('There are 3 layers'), 'There are 4 layers');
});
