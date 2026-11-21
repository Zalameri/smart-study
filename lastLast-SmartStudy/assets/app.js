// Core namespace
const SP = (() => {
  // In-memory state
  const state = {
    sp_settings: {},
    sp_courses: [],
    sp_schedule: [],
    sp_chapters: []
  };

  const uid = () => crypto.randomUUID();

  // API helpers
  function isAuthPage() {
    const path = window.location.pathname;
    return path.endsWith('login.html') || path.endsWith('register.html');
  }


  async function apiCall(method, params = {}, body = null) {
    const url = new URL('backend/api.php', window.location.href);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const opts = { method };
    if (body) {
      opts.body = JSON.stringify(body);
      opts.headers = { 'Content-Type': 'application/json' };
    }

    const res = await fetch(url, opts);
    if (res.status === 401) {
      if (!isAuthPage()) {
        window.location.href = 'login.html';
      }
      throw new Error('Unauthorized');
    }
    return res.json();
  }

  async function checkAuth() {
    if (isAuthPage()) return { authenticated: false };

    try {
      const res = await fetch('backend/auth.php?action=check');
      const data = await res.json();
      if (!data.authenticated) {
        if (!isAuthPage()) {
          window.location.href = 'login.html';
        }
      }
      return data;
    } catch (e) {
      console.error(e);
      // If network error, maybe let it slide or show error?
      // For now assume if check fails we might need login
      // But if it's just network, we don't want to redirect loop.
    }
  }

  async function loadData() {
    await checkAuth();
    // Load all keys
    const keys = ['sp_settings', 'sp_courses', 'sp_schedule', 'sp_chapters'];
    await Promise.all(keys.map(async k => {
      try {
        const data = await apiCall('GET', { m: 'get', key: k });
        state[k] = data || (k === 'sp_settings' ? {} : []);
      } catch (e) {
        console.error(`Failed to load ${k} `, e);
        state[k] = k === 'sp_settings' ? {} : [];
      }
    }));
  }

  const read = async (k, d) => {
    if (isAuthPage()) {
      return JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
    }
    if (state[k] !== undefined && state[k] !== null && (Array.isArray(state[k]) ? state[k].length > 0 : Object.keys(state[k]).length > 0)) {
      return state[k];
    }
    try {
      const res = await apiCall('GET', { m: 'get', key: k });
      state[k] = res || (k === 'sp_settings' ? {} : []);
      return state[k];
    } catch (e) {
      console.error(`Failed to read ${k} from API`, e);
      return d;
    }
  };

  const write = async (k, v) => {
    state[k] = v;
    if (isAuthPage()) {
      localStorage.setItem(k, JSON.stringify(v));
      return;
    }
    await apiCall('POST', { m: 'set', key: k }, v).catch(e => console.error(`Failed to save ${k} `, e));
  };

  // Settings & theme
  const settings = () => state.sp_settings || {};

  function setTheme(mode) {
    const root = document.documentElement;
    if (mode === 'light') root.classList.add('light');
    else root.classList.remove('light');
    const s = settings();
    s.theme = mode;
    write('sp_settings', s);
  }

  async function initThemeToggle() {
    if (!isAuthPage() && (!state.sp_settings || Object.keys(state.sp_settings).length === 0)) {
      // Try to load if empty
      try {
        await loadData();
      } catch (e) { }
    }
    // On auth page, load from local storage
    if (isAuthPage()) {
      const local = JSON.parse(localStorage.getItem('sp_settings') || '{}');
      state.sp_settings = local;
    }

    const s = settings();
    setTheme(s.theme || 'dark');
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.textContent = s.theme === 'light' ? '🌙' : '☀️';
      btn.onclick = () => {
        const root = document.documentElement;
        const newMode = root.classList.contains('light') ? 'dark' : 'light';
        setTheme(newMode);
        btn.textContent = newMode === 'light' ? '🌙' : '☀️';
      };
    }
    // Also init logout button here if not auth page
    if (!isAuthPage()) initLogoutButton();
  }

  async function logout() {
    await fetch('backend/auth.php?action=logout');
    window.location.href = 'login.html';
  }

  function initLogoutButton() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    if (document.getElementById('logoutBtn')) return; // already added

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'iconbtn logout-btn';
    logoutBtn.textContent = 'Log out';
    logoutBtn.title = 'Log out';
    logoutBtn.id = 'logoutBtn';
    logoutBtn.onclick = logout;
    topbar.appendChild(logoutBtn);
  }

  async function init() {
    await loadData();
    initThemeToggle();
    initLogoutButton();
  }

  // Courses
  function courses() {
    return state.sp_courses || [];
  }
  function addCourse({ name, code, color }) {
    const arr = courses();
    arr.push({ id: uid(), name, code, color });
    write('sp_courses', arr);
  }
  function deleteCourse(id) {
    write(
      'sp_courses',
      courses().filter(c => c.id !== id)
    );
    // cascade delete schedule & chapters
    write(
      'sp_schedule',
      schedule().filter(s => s.courseId !== id)
    );
    write(
      'sp_chapters',
      chapters().filter(ch => ch.courseId !== id)
    );
  }
  function courseById(id) {
    return courses().find(c => c.id === id);
  }

  // Schedule
  function schedule() {
    return state.sp_schedule || [];
  }
  function addSlot(slot) {
    const arr = schedule();
    arr.push({ id: uid(), ...slot });
    write('sp_schedule', arr);
  }
  function deleteSlot(id) {
    write(
      'sp_schedule',
      schedule().filter(x => x.id !== id)
    );
  }
  function entriesForDay(day) {
    return schedule()
      .filter(x => x.day === day)
      .sort((a, b) => a.start.localeCompare(b.start));
  }
  function todayEntries() {
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ];
    const day = dayNames[new Date().getDay()];
    return entriesForDay(day);
  }

  // Chapters
  function chapters() {
    return state.sp_chapters || [];
  }
  function addChapter(ch) {
    const arr = chapters();
    arr.push({ id: uid(), ...ch });
    write('sp_chapters', arr);
  }
  function deleteChapter(id) {
    write(
      'sp_chapters',
      chapters().filter(c => c.id !== id)
    );
  }

  // 🔥 Quiz helpers - SMART extract
  function extractFacts(text) {
    if (!text) return [];
    // Clean up whitespace
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];

    const lines = text
      .split(/\n+/)
      .map(s => s.trim())
      .filter(Boolean);

    // 1) bullets if they exist
    const bullets = lines
      .filter(l => /^(-|\*|\d+\.|•)/.test(l))
      .map(l => l.replace(/^(-|\*|\d+\.|•)\s*/, ''));

    // 2) sentences as fallback
    let sentences = cleaned
      .split(/(?<=[\.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 25 && s.length < 220); // skip too short or too long

    // if no sentences (weird text), fallback to lines
    if (!sentences.length) {
      sentences = lines;
    }

    const base = bullets.length ? bullets : sentences;
    // Limit to 25 max to keep quiz reasonable
    return base.slice(0, 25);
  }

  return {
    init,
    loadData,
    logout,
    ui: { initThemeToggle, setTheme },
    data: {
      courses,
      addCourse,
      deleteCourse,
      courseById,
      schedule,
      addSlot,
      deleteSlot,
      entriesForDay,
      todayEntries,
      chapters,
      addChapter,
      deleteChapter
    },
    quiz: { extractFacts }
  };
})();

// Shortcuts
window.addEventListener('keydown', e => {
  if (e.key === '?') {
    alert('Shortcuts:\nN = New\nCtrl/Cmd+S = Save');
  }
});
