<?php
// includes/db.php

// Simple .env parser for vanilla PHP
$envPath = __DIR__ . '/../.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || strpos($trimmed, '#') === 0) continue;
        if (strpos($trimmed, '=') !== false) {
            list($name, $value) = explode('=', $trimmed, 2);
            putenv(trim($name) . '=' . trim($value));
            $_ENV[trim($name)] = trim($value);
        }
    }
}

$host = getenv('DB_HOST') ?: '127.0.0.1';
$db   = getenv('DB_NAME') ?: 'inventory_system';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions on error
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Fetch associative arrays
    PDO::ATTR_EMULATE_PREPARES   => false,                  // True prepared statements
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // Auto-migrate schema updates if missing so user never encounters 'unknown column' errors
    try {
        // 1. Ensure products.image_path exists
        $colCheck = $pdo->query("SHOW COLUMNS FROM products LIKE 'image_path'")->fetch();
        if (!$colCheck) {
            $pdo->exec("ALTER TABLE products ADD COLUMN image_path VARCHAR(255) NULL AFTER low_stock_threshold");
        }

        // 2. Ensure users.email and users.phone exist
        $userEmailCheck = $pdo->query("SHOW COLUMNS FROM users LIKE 'email'")->fetch();
        if (!$userEmailCheck) {
            $pdo->exec("ALTER TABLE users ADD COLUMN email VARCHAR(100) NULL UNIQUE AFTER username");
            $pdo->exec("ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL AFTER email");
            $pdo->exec("UPDATE users SET email = 'admin@inventra.com', phone = '9876543210' WHERE username = 'admin'");
            $pdo->exec("UPDATE users SET email = 'staff@inventra.com', phone = '9876543211' WHERE username = 'staff'");
        }
    } catch (\Exception $migErr) {
        // Silently continue if tables do not exist yet or query already completed
    }

} catch (\PDOException $e) {
    if (php_sapi_name() !== 'cli' && (!headers_sent())) {
        header('Content-Type: application/json');
    }
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}
?>