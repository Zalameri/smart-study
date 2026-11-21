<?php
// Minimal dependency-free tests for backend/helpers.php.   Run: php tests/run.php
require_once __DIR__ . '/../backend/helpers.php';

$failures = 0;
function check(string $name, bool $ok): void
{
    global $failures;
    echo ($ok ? "PASS " : "FAIL ") . $name . PHP_EOL;
    if (!$ok) {
        $failures++;
    }
}

$parsed = parse_env_lines(['# comment', '', 'DB_HOST=db.local', 'GEMINI_API_KEY="abc123"', "DB_PASS = 'p w'", 'broken line']);
check('parses plain values', $parsed['DB_HOST'] === 'db.local');
check('strips quotes', $parsed['GEMINI_API_KEY'] === 'abc123');
check('trims spaces around = and quotes', $parsed['DB_PASS'] === 'p w');
check('ignores comments and malformed lines', count($parsed) === 3);

check('falls back to default', setting('SMARTSTUDY_UNSET_KEY', [], 'fallback') === 'fallback');
check('uses env.local value', setting('SMARTSTUDY_UNSET_KEY', ['SMARTSTUDY_UNSET_KEY' => 'file'], 'x') === 'file');
putenv('SMARTSTUDY_TEST_KEY=fromenv');
check('real environment wins over env.local', setting('SMARTSTUDY_TEST_KEY', ['SMARTSTUDY_TEST_KEY' => 'file'], 'x') === 'fromenv');
check('missing env file gives empty settings', load_env_file('/nonexistent/env.local') === []);

check('rejects short password', validate_password('short') !== null);
check('accepts 8+ characters', validate_password('longenough') === null);
check('counts Arabic characters correctly', validate_password('كلمةمرور') === null);

exit($failures ? 1 : 0);
