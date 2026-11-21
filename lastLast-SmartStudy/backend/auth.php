<?php
session_start();
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // CORS preflight
    exit(0);
}

$action = $_GET['action'] ?? '';

// دالة ترجع الداتا سواء جت JSON أو POST عادي
function get_input_data() {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (stripos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (is_array($data)) {
            return $data;
        }
    }
    return $_POST;
}

try {

    // ========= REGISTER =========
    if ($action === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = get_input_data();
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if ($username === '' || $password === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Username and password required']);
            exit;
        }

        // تأكد إن المستخدم غير موجود
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'User already exists']);
            exit;
        }

        // تشفير كلمة المرور
        $hash = password_hash($password, PASSWORD_DEFAULT);

        // إدخال المستخدم
        $stmt = $pdo->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
        $stmt->execute([$username, $hash]);

        $userId = (int)$pdo->lastInsertId();
        $_SESSION['user_id'] = $userId;

        echo json_encode([
            'ok'      => true,
            'user_id' => $userId,
            'username'=> $username
        ]);
        exit;
    }

    // ========= LOGIN =========
    if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = get_input_data();
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if ($username === '' || $password === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Username and password required']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id, username, password FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = (int)$user['id'];

            echo json_encode([
                'ok'      => true,
                'user_id' => (int)$user['id'],
                'username'=> $user['username']
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
        }
        exit;
    }

    // ========= LOGOUT =========
    if ($action === 'logout') {
        session_unset();
        session_destroy();
        echo json_encode(['ok' => true]);
        exit;
    }

    // ========= CHECK =========
    if ($action === 'check') {
        if (isset($_SESSION['user_id'])) {
            echo json_encode([
                'authenticated' => true,
                'user_id'       => (int)$_SESSION['user_id']
            ]);
        } else {
            echo json_encode(['authenticated' => false]);
        }
        exit;
    }

    // ========= أكشن غير معروف =========
    http_response_code(400);
    echo json_encode(['error' => 'Invalid action']);
    exit;

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB Error: ' . $e->getMessage()]);
    exit;
}
