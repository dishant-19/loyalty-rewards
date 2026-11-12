<?php
declare(strict_types=1);

session_start();

define('APP_NAME', 'BoxBonus');
define('POINTS_PER_BOX', 10);
define('REWARD_REQUEST_POINTS', 100);
define('REWARD_REQUEST_NAME', '₹50 shopping voucher');

/*
 * MySQL connection settings.
 * Set these environment variables on your hosting server, or edit the
 * fallback values below for a local XAMPP/WAMP installation.
 */
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'boxbonus');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

function e(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

/** Read a POST value as a trimmed string. Arrays/missing values become '' (no PHP warnings). */
function post_string(string $key): string {
    $value = $_POST[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}

function csrf_token(): string {
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function verify_csrf(): void {
    $token = $_POST['csrf'] ?? '';
    if (!is_string($token) || !hash_equals(csrf_token(), $token)) {
        http_response_code(419);
        exit('Your session expired. Please go back and try again.');
    }
}

function flash(string $message, string $type = 'success'): void {
    $_SESSION['flash'] = ['message' => $message, 'type' => $type];
}

function take_flash(): ?array {
    $message = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $message;
}

function current_user(): ?array {
    if (empty($_SESSION['user_id'])) return null;
    $stmt = db()->prepare('SELECT id, name, email, role, points, reward_progress FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch() ?: null;
}

function require_login(): array {
    $user = current_user();
    if (!$user) {
        header('Location: login.php');
        exit;
    }
    return $user;
}

function require_admin(): array {
    $user = require_login();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        exit('Access denied.');
    }
    return $user;
}

function redirect(string $path): never {
    header('Location: ' . $path);
    exit;
}

function create_notification(PDO $pdo, string $role, ?int $userId, ?int $redemptionId, string $type, string $title, string $message): void {
    if (!in_array($role, ['customer', 'admin'], true)) {
        throw new InvalidArgumentException('Invalid notification recipient role.');
    }
    $stmt = $pdo->prepare('INSERT INTO notifications(recipient_role,recipient_user_id,redemption_id,notification_type,title,message) VALUES(?,?,?,?,?,?)');
    $stmt->execute([$role, $userId, $redemptionId, $type, $title, $message]);
}

function notification_unread_count(array $user): int {
    $stmt = db()->prepare('SELECT COUNT(*) FROM notifications WHERE recipient_role=? AND recipient_user_id ' . ($user['role'] === 'admin' ? 'IS NULL' : '= ?') . ' AND read_at IS NULL');
    $params = $user['role'] === 'admin' ? ['admin'] : ['customer', (int)$user['id']];
    $stmt->execute($params);
    return (int)$stmt->fetchColumn();
}

function user_notifications(array $user, int $limit = 20): array {
    $limit = max(1, min(100, $limit));
    $sql = 'SELECT id,notification_type,title,message,read_at,created_at FROM notifications WHERE recipient_role=? AND recipient_user_id ' . ($user['role'] === 'admin' ? 'IS NULL' : '= ?') . ' ORDER BY id DESC LIMIT ' . $limit;
    $stmt = db()->prepare($sql);
    $params = $user['role'] === 'admin' ? ['admin'] : ['customer', (int)$user['id']];
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function mark_user_notifications_read(array $user): void {
    $sql = 'UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE recipient_role=? AND recipient_user_id ' . ($user['role'] === 'admin' ? 'IS NULL' : '= ?') . ' AND read_at IS NULL';
    $stmt = db()->prepare($sql);
    $params = $user['role'] === 'admin' ? ['admin'] : ['customer', (int)$user['id']];
    $stmt->execute($params);
}

/**
 * Create the application tables if they do not already exist.
 * Run schema.sql manually first if your database user cannot create tables.
 */
function init_db(): void {
    $pdo = db();
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        email VARCHAR(190) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
        points INT UNSIGNED NOT NULL DEFAULT 0,
        reward_progress INT UNSIGNED NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS box_codes (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code_hash CHAR(64) NOT NULL UNIQUE,
        status ENUM('unused','redeemed') NOT NULL DEFAULT 'unused',
        points INT UNSIGNED NOT NULL DEFAULT 10,
        redeemed_by BIGINT UNSIGNED NULL,
        redeemed_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_box_codes_user FOREIGN KEY (redeemed_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS redemptions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        reward_name VARCHAR(190) NOT NULL,
        points_cost INT UNSIGNED NOT NULL,
        reward_progress_before INT UNSIGNED NOT NULL DEFAULT 0,
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_redemptions_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Backward-compatible migration for databases created before the 100-point reward cycle.
    $hasRewardProgress = $pdo->query("SHOW COLUMNS FROM users LIKE 'reward_progress'")->fetch();
    if (!$hasRewardProgress) {
        $pdo->exec('ALTER TABLE users ADD reward_progress INT UNSIGNED NOT NULL DEFAULT 0');
        // Existing points count toward the customer's first reward request.
        $pdo->exec('UPDATE users SET reward_progress=points');
    }
    $hasProgressSnapshot = $pdo->query("SHOW COLUMNS FROM redemptions LIKE 'reward_progress_before'")->fetch();
    if (!$hasProgressSnapshot) {
        $pdo->exec('ALTER TABLE redemptions ADD reward_progress_before INT UNSIGNED NOT NULL DEFAULT 0');
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS activity_log (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NULL,
        action VARCHAR(100) NOT NULL,
        detail TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // In-app notifications for customers and the admin team.
    $pdo->exec("CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        recipient_role ENUM('customer','admin') NOT NULL,
        recipient_user_id BIGINT UNSIGNED NULL,
        redemption_id BIGINT UNSIGNED NULL,
        notification_type VARCHAR(60) NOT NULL,
        title VARCHAR(190) NOT NULL,
        message TEXT NOT NULL,
        read_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notifications_customer (recipient_role, recipient_user_id, id),
        INDEX idx_notifications_unread (recipient_role, recipient_user_id, read_at),
        CONSTRAINT fk_notifications_user FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_notifications_redemption FOREIGN KEY (redemption_id) REFERENCES redemptions(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $count = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='admin'")->fetchColumn();
    if ($count === 0) {
        $stmt = $pdo->prepare("INSERT INTO users(name,email,password,role) VALUES(?,?,?,'admin')");
        $stmt->execute(['Factory Admin', 'admin@example.com', password_hash('Admin@12345', PASSWORD_DEFAULT)]);
    }
}

init_db();
