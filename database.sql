-- BoxBonus MySQL database schema (MySQL 8.0+)
CREATE DATABASE IF NOT EXISTS boxbonus
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE boxbonus;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  points INT UNSIGNED NOT NULL DEFAULT 0,
  reward_progress INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS box_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code_hash CHAR(64) NOT NULL UNIQUE,
  status ENUM('unused','redeemed') NOT NULL DEFAULT 'unused',
  points INT UNSIGNED NOT NULL DEFAULT 10,
  redeemed_by BIGINT UNSIGNED NULL,
  redeemed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_box_codes_user FOREIGN KEY (redeemed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS redemptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  reward_name VARCHAR(190) NOT NULL,
  points_cost INT UNSIGNED NOT NULL,
  reward_progress_before INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_redemptions_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
