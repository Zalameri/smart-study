<?php
/**
 * Small, dependency-free helpers shared by the backend scripts.
 * Kept free of side effects so they can be tested with `php tests/run.php`.
 */

/** Parse KEY=value lines (like env.local). Ignores blank lines and # comments. */
function parse_env_lines(array $lines): array
{
    $values = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
            continue;
        }
        [$key, $val] = explode('=', $line, 2);
        $values[trim($key)] = trim(trim($val), "\"'");
    }
    return $values;
}

/** Load env.local from the project root (if present). */
function load_env_file(string $path): array
{
    if (!is_readable($path)) {
        return [];
    }
    return parse_env_lines(file($path, FILE_IGNORE_NEW_LINES) ?: []);
}

/**
 * Read a setting: real environment variable first, then env.local, then default.
 * The defaults match the previous hard-coded XAMPP/MAMP values, so existing
 * local setups keep working without any change.
 */
function setting(string $key, array $fileValues, string $default = ''): string
{
    $fromEnv = getenv($key);
    if ($fromEnv !== false && $fromEnv !== '') {
        return $fromEnv;
    }
    return $fileValues[$key] ?? $default;
}

/** Returns an error message, or null when the password is acceptable. */
function validate_password(string $password): ?string
{
    if (mb_strlen($password) < 8) {
        return 'Password must be at least 8 characters';
    }
    return null;
}

/** Log the real error on the server; give the browser a generic message. */
function log_server_error(Throwable $e): void
{
    error_log('[SmartStudy] ' . $e->getMessage());
}

/**
 * Convert a database row to the field names the browser code uses.
 * The tables use snake_case (course_id, start_time, end_time) but the JavaScript
 * reads courseId / start / end. Without this, saved chapters and schedule items
 * lose their course after a reload, so the quiz finds no chapters.
 */
function row_to_client(string $table, array $row): array
{
    if ($table === 'chapters' || $table === 'schedule') {
        if (array_key_exists('course_id', $row)) {
            $row['courseId'] = $row['course_id'];
        }
    }
    if ($table === 'schedule') {
        if (array_key_exists('start_time', $row)) {
            $row['start'] = $row['start_time'];
        }
        if (array_key_exists('end_time', $row)) {
            $row['end'] = $row['end_time'];
        }
    }
    return $row;
}
