<?php
session_start();
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$text = $input["text"] ?? "";

if (!$text) {
    echo json_encode(["error" => "No text provided"]);
    exit;
}

// Load API key from environment or env.local (never committed)
require_once __DIR__ . '/helpers.php';
$apiKey = setting('GEMINI_API_KEY', load_env_file(__DIR__ . '/../env.local'));

if (!$apiKey) {
    http_response_code(500);
    echo json_encode(["error" => "API Key not configured"]);
    exit;
}

// Use up-to-date Gemini text model compatible with v1beta generateContent
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

$data = [
    "contents" => [
        [
            "parts" => [
                [
                    "text" => "Summarize the following chapter clearly, highlight definitions, rules, examples:\n\n" . $text
                ]
            ]
        ]
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-goog-api-key: " . $apiKey
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode(["error" => "Request error: " . $curlError]);
    exit;
}

if ($httpCode < 200 || $httpCode >= 300) {
    error_log('[SmartStudy] Gemini API returned HTTP ' . $httpCode);
    http_response_code(502);
    echo json_encode(["error" => "The AI service returned an error (HTTP $httpCode). Try again later."]);
    exit;
}

$result = json_decode($response, true);
if (
    !isset($result["candidates"][0]["content"]["parts"]) ||
    !is_array($result["candidates"][0]["content"]["parts"])
) {
    http_response_code(500);
    echo json_encode(["error" => "Unexpected API response"]);
    exit;
}

$summaryText = "";
foreach ($result["candidates"][0]["content"]["parts"] as $part) {
    if (isset($part["text"])) {
        $summaryText .= $part["text"];
    }
}

echo json_encode([
    "choices" => [
        [
            "message" => [
                "content" => $summaryText
            ]
        ]
    ]
]);
