// SP.ui.initThemeToggle(); handled by SP.init()

const courseSel = document.getElementById('qCourse');
const countEl = document.getElementById('qCount');
const typeEl = document.getElementById('qType');
const area = document.getElementById('quizArea');
const scoreEl = document.getElementById('score');
const chapterFilter = document.getElementById('chapterFilter');

const examModeEl = document.getElementById('examMode');
const examMinutesEl = document.getElementById('examMinutes');
const examTimerEl = document.getElementById('examTimer');

let currentQuiz = [];
let examTimerId = null;
let examTimeLeft = 0;
let examActive = false;

// ---------- Render course options ----------
function renderCourseOptions() {
  courseSel.innerHTML =
    '<option value="">Course…</option>' +
    SP.data.courses()
      .map(c => `<option value="${c.id}">${c.color} ${c.name}</option>`)
      .join('');
}

// ---------- Render chapter list for selected course ----------
function renderChapterFilter() {
  const courseId = courseSel.value;
  chapterFilter.innerHTML = '';

  if (!courseId) {
    chapterFilter.innerHTML =
      '<p class="muted">Choose a course to select which chapters to use.</p>';
    return;
  }

  const chapters = SP.data.chapters().filter(ch => ch.courseId === courseId);

  if (!chapters.length) {
    chapterFilter.innerHTML =
      '<p class="muted">No chapters saved for this course yet.</p>';
    return;
  }

  const title = document.createElement('p');
  title.innerHTML = '<strong>Chapters to include:</strong>';
  chapterFilter.appendChild(title);

  const list = document.createElement('div');
  list.className = 'chapter-options';

  chapters.forEach(ch => {
    const row = document.createElement('label');
    row.className = 'chapter-option';
    row.innerHTML = `
      <input type="checkbox" value="${ch.id}" checked />
      <span>${ch.title}</span>
    `;
    list.appendChild(row);
  });

  chapterFilter.appendChild(list);

  const hint = document.createElement('p');
  hint.className = 'muted';
  hint.style.marginTop = '6px';
  hint.textContent = 'Uncheck chapters you do NOT want in this quiz.';
  chapterFilter.appendChild(hint);
}

// change course → update chapters list
courseSel.onchange = renderChapterFilter;

// ---------- Exam timer ----------
function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function stopExamTimer() {
  if (examTimerId) clearInterval(examTimerId);
  examTimerId = null;
  examActive = false;
}

function startExamTimer() {
  const minutes = Math.max(5, Math.min(parseInt(examMinutesEl.value, 10) || 30, 180));
  examTimeLeft = minutes * 60;
  examTimerEl.textContent = formatTime(examTimeLeft);
  examActive = true;

  if (examTimerId) clearInterval(examTimerId);
  examTimerId = setInterval(() => {
    examTimeLeft -= 1;
    if (examTimeLeft <= 0) {
      examTimerEl.textContent = '00:00';
      stopExamTimer();
      // auto-submit
      gradeQuiz(true);
      return;
    }
    examTimerEl.textContent = formatTime(examTimeLeft);
  }, 1000);
}

// ---------- Generate Quiz ----------
document.getElementById('makeQuiz').onclick = () => {
  const courseId = courseSel.value;
  if (!courseId) return alert('Choose a course');

  const checkedIds = Array.from(
    chapterFilter.querySelectorAll('input[type=checkbox]:checked')
  ).map(el => el.value);

  let chapters = SP.data.chapters().filter(ch => ch.courseId === courseId);
  if (checkedIds.length) {
    chapters = chapters.filter(ch => checkedIds.includes(ch.id));
  }

  if (!chapters.length) {
    return alert('No chapters selected for this course.');
  }

  const facts = chapters.flatMap(ch => ch.points || []);

  if (facts.length < 3) {
    return alert('Not enough facts found. Make sure your chapter summaries have clear sentences or bullet points.');
  }

  const count = Math.max(3, Math.min(parseInt(countEl.value, 10) || 10, 50));
  const mode = typeEl.value;

  currentQuiz = generateQuiz(facts, count, mode);
  if (!currentQuiz.length) {
    return alert('Could not build questions from these notes. Try adding longer sentences.');
  }
  renderQuiz(currentQuiz);
  scoreEl.textContent = '';

  stopExamTimer();
  if (examModeEl.checked) {
    startExamTimer();
  } else {
    examTimerEl.textContent = '--:--';
  }
};

// ---------- Grade Quiz (with improved feedback) ----------
function gradeQuiz(fromTimer = false) {
  if (!currentQuiz.length) return;

  const cards = area.querySelectorAll('.quiz-card');
  let correct = 0;

  currentQuiz.forEach((q, idx) => {
    const card = cards[idx];
    if (!card) return;

    let isCorrect = false;

    if (q.kind === 'mcq') {
      const checked = card.querySelector(`input[name=mcq${idx}]:checked`);
      if (checked && checked.value === q.answer) isCorrect = true;

      const feedback = card.querySelector('.feedback') || document.createElement('div');
      feedback.className = 'feedback';
      feedback.innerHTML = `Correct answer: <strong>${escapeHtml(q.answer)}</strong>`;
      card.appendChild(feedback);

    } else if (q.kind === 'tf') {
      const checked = card.querySelector(`input[name=tf${idx}]:checked`);
      if (checked && ((checked.value === 'T') === q.answer)) isCorrect = true;

      const feedback = card.querySelector('.feedback') || document.createElement('div');
      feedback.className = 'feedback';
      feedback.innerHTML = `Correct answer: <strong>${q.answer ? 'True' : 'False'}</strong>`;
      card.appendChild(feedback);

    } else if (q.kind === 'fitb') {
      const input = card.querySelector('input[data-idx]');
      const val = input ? cleanWord(input.value).toLowerCase() : '';
      if (val === q.answer.toLowerCase()) isCorrect = true;

      const feedback = card.querySelector('.feedback') || document.createElement('div');
      feedback.className = 'feedback';
      feedback.innerHTML = `Correct answer: <strong>${escapeHtml(q.answer)}</strong>`;
      card.appendChild(feedback);
    }

    if (isCorrect) {
      correct++;
      card.classList.remove('q-incorrect');
      card.classList.add('q-correct');
    } else {
      card.classList.remove('q-correct');
      card.classList.add('q-incorrect');
    }
  });

  scoreEl.textContent = `Score: ${correct} / ${currentQuiz.length}`;
  stopExamTimer();

  if (fromTimer) {
    alert('Time is over. Your exam has been submitted.');
  }
}

// ---------- Submit Quiz (manual) ----------
document.getElementById('submitQuiz').onclick = () => {
  gradeQuiz(false);
};

// ---------- Retry ----------
document.getElementById('retryQuiz').onclick = () => {
  scoreEl.textContent = '';
  stopExamTimer();
  examTimerEl.textContent = examModeEl.checked && currentQuiz.length ? formatTime(examTimeLeft) : '--:--';
  renderQuiz(currentQuiz);
};

// Quiz generation helpers live in assets/quiz-utils.js (shuffle, generateQuiz, mutate, escapeHtml, cleanWord)

// ---------- Render Quiz UI ----------
function renderQuiz(items) {
  area.innerHTML = '';
  items.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'card quiz-card';
    card.dataset.idx = idx;
    card.style.marginBottom = '10px';
    card.innerHTML = `<h3 style="margin-top:0">Q${idx + 1}. ${escapeHtml(q.question)}</h3>`;

    if (q.kind === 'mcq') {
      const box = document.createElement('div');
      q.options.forEach(opt => {
        const id = `mcq${idx}_${idx}_${q.options.indexOf(opt)}`;
        const row = document.createElement('div');
        row.style.margin = '6px 0';
        row.innerHTML =
          `<input type="radio" id="${id}" name="mcq${idx}" value="${escapeHtml(opt)}" data-idx="${idx}" /> ` +
          `<label for="${id}">${escapeHtml(opt)}</label>`;
        box.appendChild(row);
      });
      card.appendChild(box);
    } else if (q.kind === 'tf') {
      const row = document.createElement('div');
      row.innerHTML = `
        <input type="radio" name="tf${idx}" value="T" data-idx="${idx}" /> True
        &nbsp;&nbsp;
        <input type="radio" name="tf${idx}" value="F" data-idx="${idx}" /> False
      `;
      card.appendChild(row);
    } else if (q.kind === 'fitb') {
      const row = document.createElement('div');
      row.innerHTML = `<input data-idx="${idx}" class="fitb" placeholder="Your answer" />`;
      card.appendChild(row);
    }

    area.appendChild(card);
  });
}

// ---------- Init ----------
function init() {
  renderCourseOptions();
  renderChapterFilter();
  examTimerEl.textContent = '--:--';
}

SP.init().then(init);
