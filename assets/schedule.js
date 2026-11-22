// SP.ui.initThemeToggle(); handled by SP.init()

// ----- CLASS FORM -----
const sCourse = document.getElementById('sCourse');
const sDay = document.getElementById('sDay');
const sStart = document.getElementById('sStart');
const sEnd = document.getElementById('sEnd');
const sPlace = document.getElementById('sPlace');
const sNote = document.getElementById('sNote');
const week = document.getElementById('week');

document.getElementById('addSlot').onclick = () => {
  if (!sCourse.value) return alert('Choose a course for the class.');
  if (!sStart.value || !sEnd.value) return alert('Start/End time required.');
  SP.data.addSlot({
    type: 'class',
    courseId: sCourse.value,
    day: sDay.value,
    start: sStart.value,
    end: sEnd.value,
    place: sPlace.value,
    note: sNote.value
  });
  sPlace.value = sNote.value = '';
  renderWeek();
};

// ----- STUDY FORM -----
const stCourse = document.getElementById('stCourse');
const stTitle = document.getElementById('stTitle');
const stDay = document.getElementById('stDay');
const stStart = document.getElementById('stStart');
const stEnd = document.getElementById('stEnd');
const stPlace = document.getElementById('stPlace');
const stNote = document.getElementById('stNote');

document.getElementById('addStudy').onclick = () => {
  if (!stTitle.value.trim()) return alert('Write a study topic.');
  if (!stStart.value || !stEnd.value) return alert('Start/End time required.');
  SP.data.addSlot({
    type: 'study',
    courseId: stCourse.value || null,
    title: stTitle.value.trim(),
    day: stDay.value,
    start: stStart.value,
    end: stEnd.value,
    place: stPlace.value,
    note: stNote.value
  });
  stTitle.value = stPlace.value = stNote.value = '';
  renderWeek();
};

// ----- COURSES IN SELECTS -----
function renderCourseOptions() {
  const options = ['<option value="">Course… (optional)</option>']
    .concat(SP.data.courses().map(
      c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.color)} ${escapeHtml(c.name)}</option>`
    ))
    .join('');

  // classes select
  sCourse.innerHTML = '<option value="">Course…</option>' +
    SP.data.courses().map(
      c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.color)} ${escapeHtml(c.name)}</option>`
    ).join('');

  // study select (optional course)
  stCourse.innerHTML = options;
}

// ----- WEEK RENDER -----
function renderWeek() {
  week.innerHTML = '';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  days.forEach(d => {
    const col = document.createElement('div');
    col.className = 'day';

    const head = document.createElement('div');
    head.className = 'muted';
    head.textContent = d;
    col.appendChild(head);

    SP.data.entriesForDay(d).forEach(e => {
      const c = e.courseId ? SP.data.courseById(e.courseId) : null;
      const isStudy = e.type === 'study';

      const slot = document.createElement('div');
      slot.className = 'slot ' + (isStudy ? 'slot-study' : 'slot-class');

      const label = isStudy
        ? (e.title || 'Study session')
        : (c?.name || 'Class');

      const badge = isStudy ? '📖 Study' : (c?.color || '📘') + ' Class';

      slot.innerHTML = `
        <div class="slot-header">
          <span class="slot-badge">${escapeHtml(badge)}</span>
        </div>
        <strong>${escapeHtml(label)}</strong><br>
        <small>${escapeHtml(e.start)}–${escapeHtml(e.end)}${e.place ? ' • ' + escapeHtml(e.place) : ''}</small>
        ${e.note ? `<br><small>${escapeHtml(e.note)}</small>` : ''}
        <div style="text-align:right;margin-top:6px">
          <button data-id="${escapeHtml(e.id)}" class="ghost slot-del">Delete</button>
        </div>
      `;

      slot.querySelector('.slot-del').onclick = () => {
        SP.data.deleteSlot(e.id);
        renderWeek();
      };

      col.appendChild(slot);
    });

    week.appendChild(col);
  });
}

// ----- INIT -----
function render() {
  renderCourseOptions();
  renderWeek();
}

SP.init().then(render);
