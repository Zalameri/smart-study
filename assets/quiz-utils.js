// Pure quiz helpers (no DOM access) so they can be unit-tested with Node.
// Loaded in the browser by quiz.html before quiz.js.

/** Escape text before inserting it into innerHTML (notes are user-written). */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Keep letters and digits from ANY language (Arabic included).
 * The old /[^a-z0-9]/gi regex removed every Arabic letter, which produced
 * empty answers and made quiz generation retry forever.
 */
function cleanWord(word) {
  return String(word || '').replace(/[^\p{L}\p{N}]/gu, '');
}

function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mutate(s) {
  if (/\d+/.test(s)) return s.replace(/\d+/, m => String(Number(m) + 1));
  return s.replace(
    /(always|never|increases|decreases|maximum|minim(?:um)|true|false)/i,
    m =>
      ({
        always: 'sometimes',
        never: 'often',
        increases: 'decreases',
        decreases: 'increases',
        maximum: 'minimum',
        minimum: 'maximum',
        true: 'false',
        false: 'true'
      }[m.toLowerCase()] || 'not')
  );
}

/**
 * Build up to `count` questions from a list of fact sentences.
 * Gives up after a bounded number of attempts instead of looping forever
 * when a fact cannot produce a usable blank.
 */
function generateQuiz(facts, count, mode) {
  const items = [];
  const maxAttempts = count * 20;
  let attempts = 0;

  while (items.length < count && attempts++ < maxAttempts) {
    const fact = facts[Math.floor(Math.random() * facts.length)];
    const kind =
      mode === 'mix' ? ['mcq', 'tf', 'fitb'][Math.floor(Math.random() * 3)] : mode;

    if (kind === 'mcq') {
      const tokens = fact.split(' ');
      const idx = Math.max(0, Math.floor(tokens.length / 3));
      const answer = cleanWord(tokens[idx]);
      if (!answer) continue;
      const question = `Fill the missing word: ${tokens
        .map((t, j) => (j === idx ? '____' : t))
        .join(' ')}`;

      const distract = shuffle(facts.filter(f => f !== fact))
        .slice(0, 8)
        .map(s => {
          const w = cleanWord(s.split(' ')[0] || '');
          return w && w.toLowerCase() !== answer.toLowerCase() ? w : null;
        })
        .filter(Boolean);

      const options = shuffle([answer, ...distract.slice(0, 3)]);
      items.push({ kind: 'mcq', question, options, answer });
    } else if (kind === 'tf') {
      const isTrue = Math.random() > 0.5;
      const qText = isTrue ? fact : mutate(fact);
      items.push({ kind: 'tf', question: `True or False: ${qText}`, answer: isTrue });
    } else if (kind === 'fitb') {
      const words = fact.split(' ');
      const idx = Math.min(words.length - 1, Math.max(1, Math.floor(words.length * 0.6)));
      const answer = cleanWord(words[idx]);
      if (!answer) continue;
      const question = `Fill in the blank: ${words
        .map((w, i) => (i === idx ? '____' : w))
        .join(' ')}`;
      items.push({ kind: 'fitb', question, answer });
    }
  }
  return items;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeHtml, cleanWord, shuffle, mutate, generateQuiz };
}
