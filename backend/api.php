<?php
session_start();
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];
$method = $_GET['m'] ?? 'get';
$key = $_GET['key'] ?? '';

// Map keys to tables
$tables = [
    'sp_courses' => 'courses',
    'sp_schedule' => 'schedule',
    'sp_chapters' => 'chapters',
    'sp_settings' => 'settings'
];

if (!array_key_exists($key, $tables)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid key']);
    exit;
}

$table = $tables[$key];

if ($method === 'get') {
    try {
        if ($table === 'settings') {
            $stmt = $pdo->prepare("SELECT data FROM settings WHERE user_id = ?");
            $stmt->execute([$userId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($row ? json_decode($row['data'], true) : (object)[]);
        } else {
            $stmt = $pdo->prepare("SELECT * FROM $table WHERE user_id = ?");
            $stmt->execute([$userId]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // For chapters, decode points
            if ($table === 'chapters') {
                foreach ($data as &$row) {
                    if (isset($row['points'])) {
                        $row['points'] = json_decode($row['points'], true) ?? [];
                    }
                }
            }
            $data = array_map(fn($row) => row_to_client($table, $row), $data);
            echo json_encode($data);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        log_server_error($e);
        echo json_encode(['error' => 'Server error. Please try again.']);
    }
    exit;
}

if ($method === 'set') {
    $payload = json_decode(file_get_contents('php://input'), true);
    
    if ($table !== 'settings' && !is_array($payload)) {
        http_response_code(400);
        echo json_encode(['error' => 'Payload must be an array']);
        exit;
    }

    try {
        $pdo->beginTransaction();
        
        if ($table === 'settings') {
            // Upsert settings
            $stmt = $pdo->prepare("INSERT INTO settings (user_id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)");
            $stmt->execute([$userId, json_encode($payload)]);
        } else {
            // Delete existing for user
            $stmt = $pdo->prepare("DELETE FROM $table WHERE user_id = ?");
            $stmt->execute([$userId]);
            
            // Insert new
            if (!empty($payload)) {
                if ($table === 'courses') {
                    $stmt = $pdo->prepare("INSERT INTO courses (id, user_id, name, code, color) VALUES (?, ?, ?, ?, ?)");
                    foreach ($payload as $row) {
                        $stmt->execute([$row['id'], $userId, $row['name'], $row['code'], $row['color']]);
                    }
                } elseif ($table === 'schedule') {
                    $stmt = $pdo->prepare("INSERT INTO schedule (id, user_id, type, course_id, title, day, start_time, end_time, place, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    foreach ($payload as $row) {
                        $stmt->execute([
                            $row['id'], 
                            $userId, 
                            $row['type'] ?? 'class', 
                            $row['courseId'] ?? null, 
                            $row['title'] ?? null, 
                            $row['day'], 
                            $row['start'], 
                            $row['end'], 
                            $row['place'] ?? '', 
                            $row['note'] ?? ''
                        ]);
                    }
                } elseif ($table === 'chapters') {
                    $stmt = $pdo->prepare("INSERT INTO chapters (id, user_id, course_id, title, notes, points) VALUES (?, ?, ?, ?, ?, ?)");
                    foreach ($payload as $row) {
                        $stmt->execute([
                            $row['id'], 
                            $userId, 
                            $row['courseId'], 
                            $row['title'], 
                            $row['notes'] ?? '', 
                            json_encode($row['points'] ?? [])
                        ]);
                    }
                }
            }
        }
        
        $pdo->commit();
        echo json_encode(['ok' => true]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        log_server_error($e);
        echo json_encode(['error' => 'Server error. Please try again.']);
    }
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Bad request']);