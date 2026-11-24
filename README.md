<div align="center">

# 📚 Smart Study

**A study-planning web app that keeps courses, schedules, chapter notes and self-made quizzes in one place.**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=flat-square&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)

</div>

## ✨ What it does

Smart Study helps a student organise a semester:

- 👤 **Accounts**: register and log in; every user only sees their own data (passwords are hashed with `password_hash`).
- 🗂️ **Courses**: create courses with a code and a colour.
- 🗓️ **Weekly schedule**: add classes and study sessions per day and time.
- 📖 **Chapters & notes**: write notes per chapter and keep key points.
- 🤖 **AI summary (optional)**: summarise a chapter's notes with the Gemini API when you provide your own key.
- 📝 **Quizzes from your own notes**: multiple-choice, true/false and fill-in-the-blank questions are generated from your chapter points, with an optional timed *exam mode*. Works with English and Arabic notes.
- ⚙️ **Settings** saved per user, and an animated background.

## 🧰 Built with

| Layer | Technology |
|---|---|
| Front end | HTML, CSS, vanilla JavaScript (no framework) |
| Back end | PHP 8 with PDO |
| Database | MySQL (tables are created automatically on first run) |
| Tests | Node's built-in test runner, a small PHP test script |

## 🚀 Getting started

**You need:** PHP 8+ with the `pdo_mysql` extension, and a running MySQL server (XAMPP or MAMP both work).

```bash
git clone https://github.com/Zalameri/smart-study.git
cd smart-study
cp env.example env.local      # then edit env.local if your MySQL settings differ
php -S localhost:8000         # run from the project root
```

Open <http://localhost:8000/register.html> and create an account.
The database (`studysplan` by default) and its tables are created automatically.

### Try it without PHP or MySQL (demo mode)
The front end can run on its own with sample data. Serve the folder with any static server, for example
`python3 -m http.server 8000`, and open <http://localhost:8000/index.html?demo=1>.
In demo mode (`assets/demo-backend.js`) requests to `backend/*.php` are answered in the browser, nothing is sent anywhere,
and the data lives only in that tab's `sessionStorage` (`?demo=0` switches it off). AI summaries are disabled in the demo.
It is meant for static hosting such as GitHub Pages; a hosted demo is not set up yet (the repository owner has to enable Pages).

### Configuration (`env.local`)
The defaults match a typical MAMP setup (`127.0.0.1:8889`, user `root`). Change them in `env.local`, which is git-ignored:

| Setting | Default | Purpose |
|---|---|---|
| `DB_HOST`, `DB_PORT` | `127.0.0.1`, `8889` | MySQL location (XAMPP usually uses port `3306`) |
| `DB_USER`, `DB_PASS`, `DB_NAME` | `root`, `root`, `studysplan` | MySQL login and database |
| `GEMINI_API_KEY` | *(empty)* | Enables the "summarize with AI" button |

> 🔒 Never commit `env.local` or share your API key. Use a dedicated MySQL user instead of `root` if you ever host this online.

## 🧪 Tests

```bash
node --test tests/*.test.js   # quiz logic (escaping, Arabic support, no infinite loops)
php tests/run.php             # configuration loading and password rules
```

Tests also run automatically on every pull request through GitHub Actions.

## 🗂️ Project structure

```text
smart-study/
├── index.html, login.html, register.html   pages
├── chapters.html, schedule.html, quiz.html
├── assets/
│   ├── app.js, chapters.js, schedule.js    page logic
│   ├── quiz.js, quiz-utils.js              quiz UI and testable quiz generation
│   ├── threads.js, style.css               background animation and styles
├── backend/
│   ├── auth.php, api.php, summarize.php    JSON endpoints
│   ├── db.php, helpers.php                 database setup and shared helpers
├── tests/                                  JavaScript and PHP tests
└── env.example                             configuration template
```

## 🖼️ Screenshots

Screenshots have not been added yet. *(Contributions of real screenshots from the running app are welcome.)*

## 🔭 Ideas for future improvements

- Replace the "delete everything and re-insert" saving in `api.php` with per-item updates.
- Add CSRF protection and restrict the CORS headers to the app's own origin.
- Add server-side validation for schedule times and chapter fields.
- Automated browser tests for the main flows.

## 📝 Notes on this version

Recent maintenance: the project was moved to the repository root, hard-coded database settings moved to configuration, database error details are no longer sent to the browser, sessions are regenerated on login, passwords must be at least 8 characters on registration, and quiz generation now supports Arabic text (it previously froze on it).
