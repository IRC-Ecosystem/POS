CREATE DATABASE IF NOT EXISTS `warungpos`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `warungpos`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) DEFAULT NULL,
  `nama` VARCHAR(100) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `password` VARCHAR(255) DEFAULT NULL,
  `role` ENUM('manager', 'operator', 'kasir', 'konsumen') NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @users_add_nama = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'nama'
    ),
    'SELECT 1',
    'ALTER TABLE `users` ADD COLUMN `nama` VARCHAR(100) NULL AFTER `name`'
  )
);
PREPARE stmt FROM @users_add_nama;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `api_integrations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `provider` ENUM('smartbank', 'api-gateway', 'umkm-insight') NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `method` ENUM('GET', 'POST', 'PUT', 'DELETE') NOT NULL DEFAULT 'GET',
  `base_url` VARCHAR(255) NOT NULL,
  `path` VARCHAR(255) NOT NULL,
  `headers_json` JSON NULL,
  `query_json` JSON NULL,
  `body_json` JSON NULL,
  `expected_status` INT NOT NULL DEFAULT 200,
  `description` TEXT NULL,
  `status` ENUM('untested', 'ok', 'failed') NOT NULL DEFAULT 'untested',
  `last_checked_at` DATETIME NULL,
  `last_response_code` INT NULL,
  `last_response_body` MEDIUMTEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_api_integrations_provider` (`provider`),
  KEY `idx_api_integrations_status` (`status`),
  KEY `idx_api_integrations_active` (`provider`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @users_add_phone = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'phone'
    ),
    'SELECT 1',
    'ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(30) NULL AFTER `email`'
  )
);
PREPARE stmt FROM @users_add_phone;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `users`
SET `nama` = COALESCE(`nama`, `name`)
WHERE `nama` IS NULL OR `nama` = '';

CREATE TABLE IF NOT EXISTS `products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nama_produk` VARCHAR(150) NOT NULL,
  `harga` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `stock` INT NOT NULL DEFAULT 0,
  `kategori` VARCHAR(100) NOT NULL,
  `gambar` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `invoice` VARCHAR(50) NOT NULL,
  `user_id` INT NULL,
  `cashier_id` INT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending', 'pending_payment', 'approved', 'paid', 'rejected') NOT NULL DEFAULT 'pending',
  `payment_method` VARCHAR(50) DEFAULT NULL,
  `stock_deducted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice` (`invoice`),
  KEY `fk_transactions_user` (`user_id`),
  KEY `fk_transactions_cashier` (`cashier_id`),
  CONSTRAINT `fk_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_transactions_cashier` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `transactions`
  MODIFY COLUMN `user_id` INT NULL;

ALTER TABLE `transactions`
  MODIFY COLUMN `status` ENUM('pending', 'pending_payment', 'approved', 'paid', 'rejected') NOT NULL DEFAULT 'pending';

SET @transactions_add_stock_deducted = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'transactions'
        AND COLUMN_NAME = 'stock_deducted'
    ),
    'SELECT 1',
    'ALTER TABLE `transactions` ADD COLUMN `stock_deducted` TINYINT(1) NOT NULL DEFAULT 0 AFTER `payment_method`'
  )
);
PREPARE stmt FROM @transactions_add_stock_deducted;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `transaction_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `transaction_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `qty` INT NOT NULL DEFAULT 1,
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `fk_transaction_items_transaction` (`transaction_id`),
  KEY `fk_transaction_items_product` (`product_id`),
  CONSTRAINT `fk_transaction_items_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transaction_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `transaction_id` INT NOT NULL,
  `provider` ENUM('local', 'smartbank') NOT NULL DEFAULT 'local',
  `method` VARCHAR(50) NOT NULL,
  `status` ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_request_id` VARCHAR(100) DEFAULT NULL,
  `provider_reference` VARCHAR(150) DEFAULT NULL,
  `response_code` INT DEFAULT NULL,
  `response_body` MEDIUMTEXT NULL,
  `cashier_id` INT NULL,
  `paid_at` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payments_transaction` (`transaction_id`),
  KEY `idx_payments_status` (`status`),
  KEY `idx_payments_method` (`method`),
  KEY `idx_payments_cashier` (`cashier_id`),
  CONSTRAINT `fk_payments_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_cashier` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @transaction_items_add_price = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'transaction_items'
        AND COLUMN_NAME = 'price'
    ),
    'SELECT 1',
    'ALTER TABLE `transaction_items` ADD COLUMN `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `qty`'
  )
);
PREPARE stmt FROM @transaction_items_add_price;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @transaction_items_add_subtotal = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'transaction_items'
        AND COLUMN_NAME = 'subtotal'
    ),
    'SELECT 1',
    'ALTER TABLE `transaction_items` ADD COLUMN `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `price`'
  )
);
PREPARE stmt FROM @transaction_items_add_subtotal;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
