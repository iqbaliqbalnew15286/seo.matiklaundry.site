<?php
/**
 * Deployment Extractor - Called by GitHub Actions
 * Extracts uploaded deploy.zip and cleans up after itself.
 */

// Increase limits for large archives
@ini_set('max_execution_time', 300);
@ini_set('memory_limit', '512M');

header('Content-Type: application/json');

// Only POST allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed']));
}

// Determine project root (one level up from public/)
$projectRoot = realpath(__DIR__ . '/..');
if (!$projectRoot) {
    $projectRoot = dirname(__DIR__);
}

// Verify deploy token
$tokenFile = $projectRoot . '/.deploy_token';
if (!file_exists($tokenFile)) {
    http_response_code(403);
    exit(json_encode(['error' => 'Token file not found']));
}

$expectedToken = trim(file_get_contents($tokenFile));
$providedToken = $_POST['token'] ?? '';

if (empty($providedToken) || !hash_equals($expectedToken, $providedToken)) {
    http_response_code(403);
    exit(json_encode(['error' => 'Invalid token']));
}

// Locate archive
$archivePath = $projectRoot . '/deploy.zip';
if (!file_exists($archivePath)) {
    http_response_code(404);
    exit(json_encode(['error' => 'Archive not found']));
}

// Extract archive
$zip = new ZipArchive();
$result = $zip->open($archivePath);
if ($result !== true) {
    http_response_code(500);
    exit(json_encode(['error' => 'Cannot open archive', 'code' => $result]));
}

$fileCount = $zip->numFiles;
$zip->extractTo($projectRoot);
$zip->close();

// Cleanup
@unlink($archivePath);
@unlink($tokenFile);

echo json_encode([
    'status' => 'success',
    'files_extracted' => $fileCount,
    'timestamp' => date('Y-m-d H:i:s'),
]);
