// SP.ui.initThemeToggle(); handled by SP.init()

const courseSel = document.getElementById('cCourse');
const titleEl = document.getElementById('cTitle');
const notesEl = document.getElementById('cNotes');
const list = document.getElementById('chapterList');
const search = document.getElementById('search');
const summaryEl = document.getElementById('chapterSummary');

// NEW: PDF elements
const pdfInput = document.getElementById('pdfFile');
const loadPdfBtn = document.getElementById('loadPdf');

let selectedId = null;

// ---------- SAVE CHAPTER ----------
document.getElementById('saveChapter').onclick = () => {
  if (!courseSel.value || !titleEl.value.trim()) {
    return alert('Course + title required');
  }

  const notesText = notesEl.value;
  const points = SP.quiz.extractFacts(notesText);

  SP.data.addChapter({
    courseId: courseSel.value,
    title: titleEl.value.trim(),
    points,
    notes: notesText
  });

  titleEl.value = '';
  notesEl.value = '';
  renderList();
  renderSummary();
  alert('Chapter saved. You can now generate quizzes from it.');
};

// ---------- IMPORT FROM PDF ----------
if (loadPdfBtn) {
  loadPdfBtn.onclick = async () => {
    if (!pdfInput.files || !pdfInput.files.length) {
      return alert('Choose a PDF file first.');
    }
    const file = pdfInput.files[0];

    notesEl.value = 'Loading text from PDF... please wait ⏳';

    try {
      const text = await extractTextFromPdf(file);
      notesEl.value = text;

      const points = SP.quiz.extractFacts(text);

      summaryEl.classList.remove('muted');
      summaryEl.innerHTML = `
        <h3 style="margin-top:0">Preview from PDF</h3>
        <p><strong>Text length:</strong> ${text.length} characters</p>
        <p><strong>First extracted points (used for quiz):</strong></p>
        <ul>${points.slice(0, 8).map(p => `<li>${escapeHtml(p)}</li>`).join('') || '<li class="muted">No clear points detected. Try adding bullet points manually.</li>'}</ul>
        <p class="muted">Click “Save Chapter” to store this as a chapter and use it in quizzes.</p>
      `;
    } catch (err) {
      console.error(err);
      alert('Could not read this PDF. Make sure it is a normal text PDF, not scanned image only.');
      notesEl.value = '';
    }
  };
}

// ---------- PDF TEXT EXTRACTION USING pdf.js ----------
async function extractTextFromPdf(file) {
  // pdfjsLib is added globally from the CDN script
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText += strings.join(' ') + '\n\n';
  }
  return fullText;
}

// ---------- RENDER COURSES ----------
function renderCourseOptions() {
  const select = document.getElementById('courseSelect');
  if (!select) return;
  const courses = SP.data.courses() || [];
  // Ensure courses is an array
  const list = Array.isArray(courses) ? courses : [];

  select.innerHTML = '<option value="">Select a Course...</option>' +
    list.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)} (${escapeHtml(c.code)})</option>`).join('');
}

// ---------- RENDER CHAPTER LIST ----------
function renderList() {
  const q = (search.value || '').toLowerCase();
  list.innerHTML = '';

  SP.data.chapters()
    .filter(ch => {
      const course = SP.data.courseById(ch.courseId);
      return [ch.title, ch.notes, course?.name]
        .join(' ')
        .toLowerCase()
        .includes(q);
    })
    .forEach(ch => {
      const course = SP.data.courseById(ch.courseId);
      const count = (ch.points || []).length;

      const item = document.createElement('div');
      item.className = 'listitem';
      item.style.cursor = 'pointer';

      item.innerHTML = `
        <span>
          ${escapeHtml(course?.color || '📘')}
          <strong>${escapeHtml(ch.title)}</strong>
          <small>${escapeHtml(course?.name || '')}</small>
          <small> · ${count} point${count === 1 ? '' : 's'}</small>
        </span>
        <span class="actions">
          <button class="ghost view">View</button>
          <button class="ghost del">Delete</button>
        </span>
      `;

      item.querySelector('.view').onclick = (e) => {
        e.stopPropagation();
        selectedId = ch.id;
        renderSummary();
      };

      item.querySelector('.del').onclick = (e) => {
        e.stopPropagation();
        if (confirm('Delete this chapter and its quiz points?')) {
          SP.data.deleteChapter(ch.id);
          if (selectedId === ch.id) selectedId = null;
          renderList();
          renderSummary();
        }
      };

      item.onclick = () => {
        selectedId = ch.id;
        renderSummary();
      };

      list.appendChild(item);
    });

  if (!list.childElementCount) {
    list.innerHTML = '<p class="muted">No chapters yet. Add one above or import from PDF.</p>';
  }
}

// ---------- RENDER SELECTED SUMMARY ----------
function renderSummary() {
  if (!selectedId) {
    summaryEl.classList.add('muted');
    summaryEl.innerHTML = 'Select a chapter from the list to view its summary.';
    return;
  }

  const ch = SP.data.chapters().find(c => c.id === selectedId);
  if (!ch) {
    summaryEl.classList.add('muted');
    summaryEl.innerHTML = 'Chapter not found.';
    return;
  }

  const course = SP.data.courseById(ch.courseId);
  const notesHtml = (ch.notes || '')
    .split('\n')
    .map(line => line.trim())
    .map(line => line ? '• ' + escapeHtml(line.replace(/^(-|\*|\d+\.|•)\s*/, '')) : '')
    .join('<br>');

  const pointsList = (ch.points || []).map(p => `<li>${escapeHtml(p)}</li>`).join('');

  summaryEl.classList.remove('muted');
  summaryEl.innerHTML = `
    <h3 style="margin-top:0">${escapeHtml(course?.color || '📘')} ${escapeHtml(ch.title)}</h3>
    <p><strong>Course:</strong> ${escapeHtml(course?.name || '—')}</p>
    <p><strong>Full Summary / Notes:</strong></p>
    <div class="summary-box">${notesHtml || '<span class="muted">No notes.</span>'}</div>
    <p><strong>Extracted Points (used for Quiz):</strong></p>
    <ul>${pointsList || '<li class="muted">No points extracted. Try adding bullet points like “- ...”</li>'}</ul>
  `;
}

// ---------- Search live filter ----------
search.oninput = renderList;

// ---------- INIT ----------
function init() {
  renderCourseOptions();
  renderList();
  renderSummary();
}

SP.init().then(init);
document.getElementById("summarizeAi").onclick = async () => {
  const notes = document.getElementById("cNotes").value.trim();
  if (!notes) return alert("Please import or write chapter text first.");

  const btn = document.getElementById("summarizeAi");
  btn.innerText = "Summarizing...";
  btn.disabled = true;

  try {
    const url = new URL('backend/summarize.php', window.location.href);
    console.log('Fetching AI summary from:', url.toString());

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: notes })
    });

    let data;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      data = await res.json();
    } else {
      const text = await res.text();
      console.error("Non-JSON response:", text);
      throw new Error(`Server returned ${res.status} ${res.statusText}. See console for details.`);
    }

    if (!res.ok) {
      if (res.status === 401) {
        alert("Session expired. Please login again.");
        window.location.href = "login.html";
        return;
      }
      console.error("AI summarize error response", data);
      alert(data.error || "AI summarization failed. Open the console for details.");
    } else if (!data.choices || !data.choices[0] || !data.choices[0].message || typeof data.choices[0].message.content !== "string") {
      console.error("Unexpected AI summarize response shape", data);
      alert("Unexpected response from AI summarizer. Open the console for details.");
    } else {
      const summary = data.choices[0].message.content;

      // Put AI summary into the notes textarea so it can be saved as the chapter content
      document.getElementById("cNotes").value = summary;

      // And also show it immediately in the Chapter Summary card
      summaryEl.classList.remove('muted');
      summaryEl.innerHTML = `
        <h3 style="margin-top:0">AI Summary</h3>
        <div class="summary-box">${escapeHtml(summary).replace(/\n/g, '<br>')}</div>
        <p class="muted">Click \"Save Chapter\" to store this summary and use it in quizzes.</p>
      `;
      alert("AI summary complete!");
    }
  } catch (err) {
    console.error("AI Fetch Error:", err);
    alert("Error: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "Summarize with AI";
  }
// ------------------------ FILL COURSE DROPDOWN ------------------------

function fillChapterCourseDropdown() {
  if (!courseSel) return;

  // خيار افتراضي
  courseSel.innerHTML = '<option value="">Select course…</option>';

  let courses = [];

  // 1) لو فيه بيانات كورسات محمّلة في SP (من الصفحات الثانية)
  try {
    if (window.SP && SP.data) {
      if (Array.isArray(SP.data.courses) && SP.data.courses.length) {
        courses = SP.data.courses;
      } else if (SP.data.coursesById) {
        courses = Object.values(SP.data.coursesById);
      }
    }
  } catch (e) {
    console.warn('Could not read SP.data courses', e);
  }

  // 2) لو لقينا كورسات في SP نستخدمها
  if (courses.length) {
    courses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id ?? c.courseId ?? c.name;
      opt.textContent = c.name || c.title || `Course ${c.id}`;
      courseSel.appendChild(opt);
    });
    return;
  }

  // 3) لو ما فيه ولا كورس في SP (باك أب بسيط عشان يشتغل الديمو)
  const fallback = [
    { id: 'calculus', name: 'Calculus' },
    { id: 'programming', name: 'Programming' },
    { id: 'database', name: 'Database' }
  ];

  fallback.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    courseSel.appendChild(opt);
  });
}

// نشغّل التعبئة أول ما الصفحة تجهز
document.addEventListener('DOMContentLoaded', fillChapterCourseDropdown);

};
