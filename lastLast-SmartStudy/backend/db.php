<?php
$host = '127.0.0.1';   // Use IP to force TCP connection
$port = 8889;          // Default MySQL port
$user = 'root';         // Default XAMPP/MAMP user
$pass = 'root';             // Default password (empty)
$dbname = 'studysplan'; // اسم قاعدة البيانات اللي عندك

try {
    // 1. Connect to MySQL server (without selecting DB yet)
    $dsn = "mysql:host=$host;port=$port;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 2. Create DB if not exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");

    // 3. Select DB
    $pdo->exec("USE `$dbname`");

    // 4. Create USERS table
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // 5. Create COURSES table
    $pdo->exec("CREATE TABLE IF NOT EXISTS courses (
        id VARCHAR(50) PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50),
        color VARCHAR(20),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    // 6. Create SCHEDULE table
    $pdo->exec("CREATE TABLE IF NOT EXISTS schedule (
        id VARCHAR(50) PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(20),
        course_id VARCHAR(50),
        title VARCHAR(100),
        day VARCHAR(20),
        start_time VARCHAR(20),
        end_time VARCHAR(20),
        place VARCHAR(100),
        note TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    // 7. Create CHAPTERS table
    $pdo->exec("CREATE TABLE IF NOT EXISTS chapters (
        id VARCHAR(50) PRIMARY KEY,
        user_id INT NOT NULL,
        course_id VARCHAR(50),
        title VARCHAR(100),
        notes LONGTEXT,
        points LONGTEXT, 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    // 8. Create SETTINGS table
    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        user_id INT PRIMARY KEY,
        data LONGTEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

} catch (PDOException $e) {
    http_response_code(500);
    $errorMsg = "DB Connection/Setup failed: " . $e->getMessage();
    file_put_contents(__DIR__ . '/debug_log.txt', $errorMsg . PHP_EOL, FILE_APPEND);
    echo json_encode([
        "error" => $errorMsg
    ]);
    exit;
}
