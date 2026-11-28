// Review mode: shows chapter points that are due today and reschedules them with SM-2 (assets/sm2.js).
// Progress is stored on this device in localStorage ("sp_review"); no database change.
(function () {
  const box = document.getElementById('reviewBox');
  if (!box) return;
  const KEY = 'sp_review';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
  }
  function today() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function render() {
    const day = today();
    const due = dueItems(SP.data.chapters(), load(), day);
    if (!due.length) {
      const total = SP.data.chapters().reduce((n, c) => n + (c.points || []).length, 0);
      box.innerHTML = total
        ? '<p>✅ Nothing due today. Come back tomorrow!</p>'
        : '<p class="muted">Save a chapter with points first, then review it here.</p>';
      return;
    }
    const item = due[0];
    box.innerHTML = `
      <p class="muted">${due.length} point${due.length === 1 ? '' : 's'} due today</p>
      <p><small>${escapeHtml(item.title)}</small></p>
      <div class="summary-box" id="reviewPoint">${escapeHtml(item.point)}</div>
      <div class="row wrap" style="margin-top:8px;">
        <button class="ghost" data-grade="0">Forgot</button>
        <button class="ghost" data-grade="3">Hard</button>
        <button class="primary" data-grade="4">Good</button>
        <button class="ghost" data-grade="5">Easy</button>
      </div>`;
    box.querySelectorAll('button[data-grade]').forEach((btn) => {
      btn.onclick = () => {
        const state = load();
        const card = state[item.key] || newCard(day);
        state[item.key] = review(card, Number(btn.dataset.grade), day);
        save(state);
        render();
      };
    });
  }

  SP.init().then(render);
})();
