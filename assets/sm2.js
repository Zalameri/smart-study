// SM-2 spaced repetition (the algorithm behind many flashcard apps), kept free of the DOM so it can be unit tested.
// A "card" is { ef, reps, interval, due }: ease factor, successful reviews in a row, days until next review, due day.
// Days are plain 'YYYY-MM-DD' strings so tests never depend on the clock.
const SM2_MIN_EF = 1.3;

function addDays(day, n) {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function newCard(today) {
  return { ef: 2.5, reps: 0, interval: 0, due: today };
}

// grade: 0 = forgot, 3 = hard, 4 = good, 5 = easy (grades below 3 restart the card)
function review(card, grade, today) {
  if (![0, 3, 4, 5].includes(grade)) throw new Error('grade must be 0, 3, 4 or 5');
  let { ef, reps, interval } = card;
  if (grade < 3) {
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(interval * ef);
  }
  ef = Math.max(SM2_MIN_EF, ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  return { ef: Number(ef.toFixed(2)), reps, interval, due: addDays(today, interval) };
}

function isDue(card, today) {
  return !card || card.due <= today;
}

// Cards for every chapter point. State maps "chapterId|point text" to a card; unseen points count as due today.
function cardKey(chapterId, point) {
  return chapterId + '|' + point;
}

function dueItems(chapters, state, today) {
  const items = [];
  for (const ch of chapters || []) {
    for (const point of ch.points || []) {
      const card = (state || {})[cardKey(ch.id, point)];
      if (isDue(card, today)) items.push({ key: cardKey(ch.id, point), chapterId: ch.id, title: ch.title, point });
    }
  }
  return items;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { addDays, newCard, review, isDue, cardKey, dueItems };
}
