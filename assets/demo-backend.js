// Static demo mode: lets the front end run without PHP or MySQL (for example on GitHub Pages).
// It is OFF by default. Open any page with ?demo=1 to switch it on for the current browser tab
// (?demo=0 switches it off). In demo mode every request to backend/*.php is answered here, and the
// data lives only in sessionStorage, so nothing is sent anywhere and it disappears with the tab.
(function (root) {
  const DATA_KEY = 'sp_demo_data';
  const FLAG_KEY = 'sp_demo';
  const KEYS = ['sp_settings', 'sp_courses', 'sp_schedule', 'sp_chapters'];

  function seedData() {
    return {
      sp_settings: { theme: 'dark' },
      sp_courses: [
        { id: 'demo-c1', name: 'Data Structures', code: 'CS201', color: '#6c8cff' },
        { id: 'demo-c2', name: 'Linear Algebra', code: 'MATH210', color: '#ff8c6c' },
      ],
      sp_schedule: [
        { id: 'demo-s1', type: 'class', courseId: 'demo-c1', title: null, day: 'Sunday', start: '09:00', end: '10:30', place: 'Room 204', note: '' },
        { id: 'demo-s2', type: 'class', courseId: 'demo-c2', title: null, day: 'Monday', start: '11:00', end: '12:30', place: 'Room 118', note: '' },
        { id: 'demo-s3', type: 'study', courseId: 'demo-c1', title: 'Review trees', day: 'Tuesday', start: '16:00', end: '17:00', place: 'Library', note: 'Practice traversals' },
      ],
      sp_chapters: [
        {
          id: 'demo-ch1', courseId: 'demo-c1', title: 'Binary trees',
          notes: '- A binary tree node has at most two children\n- In-order traversal of a binary search tree visits keys in sorted order\n- A balanced tree keeps its height close to log n',
          points: [
            'A binary tree node has at most two children',
            'In-order traversal of a binary search tree visits keys in sorted order',
            'A balanced tree keeps its height close to log n',
          ],
        },
      ],
    };
  }

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  // `store` only needs getItem/setItem, so tests can pass a plain object.
  function createDemoBackend(store) {
    function load() {
      try {
        const raw = store.getItem(DATA_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (e) { /* fall through to the seed data */ }
      return seedData();
    }
    function save(data) { store.setItem(DATA_KEY, JSON.stringify(data)); }

    // Returns { status, body } for a request, mirroring backend/api.php and backend/auth.php.
    function handle(urlString, opts) {
      const url = new URL(urlString, 'http://demo.local/');
      const method = ((opts && opts.method) || 'GET').toUpperCase();
      const path = url.pathname;

      if (path.endsWith('/auth.php')) {
        const action = url.searchParams.get('action');
        if (action === 'check') return { status: 200, body: { authenticated: true, user_id: 0 } };
        if (action === 'logout') return { status: 200, body: { ok: true } };
        if (action === 'login' || action === 'register') {
          return { status: 200, body: { ok: true, user_id: 0 } };
        }
        return { status: 400, body: { error: 'Invalid action' } };
      }

      if (path.endsWith('/api.php')) {
        const key = url.searchParams.get('key') || '';
        if (!KEYS.includes(key)) return { status: 400, body: { error: 'Invalid key' } };
        const data = load();
        const mode = url.searchParams.get('m') || 'get';
        if (mode === 'get') return { status: 200, body: clone(data[key]) };
        if (mode === 'set' && method === 'POST') {
          let payload;
          try { payload = JSON.parse((opts && opts.body) || 'null'); } catch (e) { payload = null; }
          if (key !== 'sp_settings' && !Array.isArray(payload)) {
            return { status: 400, body: { error: 'Payload must be an array' } };
          }
          data[key] = payload === null ? {} : payload;
          save(data);
          return { status: 200, body: { ok: true } };
        }
        return { status: 400, body: { error: 'Invalid method' } };
      }

      if (path.endsWith('/summarize.php')) {
        return { status: 503, body: { error: 'AI summaries are disabled in the demo (no API key).' } };
      }
      return { status: 404, body: { error: 'Not found' } };
    }

    return { handle, seedData };
  }

  function isDemoEnabled(search, store) {
    const param = new URLSearchParams(search || '').get('demo');
    try {
      if (param === '1') store.setItem(FLAG_KEY, '1');
      if (param === '0') store.removeItem(FLAG_KEY);
      return store.getItem(FLAG_KEY) === '1';
    } catch (e) {
      return param === '1';
    }
  }

  function install(win) {
    let store;
    try { store = win.sessionStorage; } catch (e) { return false; }
    if (!store || !isDemoEnabled(win.location.search, store)) return false;

    const backend = createDemoBackend(store);
    const realFetch = win.fetch.bind(win);
    win.fetch = function (input, opts) {
      const target = typeof input === 'string' ? input : (input && input.href) || (input && input.url) || '';
      if (!/backend\/[a-z]+\.php/.test(target)) return realFetch(input, opts);
      const { status, body } = backend.handle(target, opts);
      return Promise.resolve(new win.Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }));
    };

    win.document.addEventListener('DOMContentLoaded', function () {
      const bar = win.document.createElement('div');
      bar.setAttribute('role', 'status');
      bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;padding:6px 12px;' +
        'background:#1d2540;color:#fff;font:13px sans-serif;text-align:center';
      bar.textContent = 'Demo mode: sample data stored only in this browser tab. No server, no account.';
      win.document.body.appendChild(bar);
    });
    return true;
  }

  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') install(window);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createDemoBackend, isDemoEnabled, install, seedData };
  }
})(typeof window !== 'undefined' ? window : globalThis);
