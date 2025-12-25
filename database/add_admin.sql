-- Run this in phpMyAdmin on Hostinger to add admin user
-- Database: u528065755_sellersync

INSERT INTO users (username, password, role) VALUES 
('admin', '$2a$10$Z/DYw9nPG388JjQ7zW2IbOnrvqz4840fnWKiLMiSemMG5lS.FxFJS', 'admin')
ON DUPLICATE KEY UPDATE password = '$2a$10$Z/DYw9nPG388JjQ7zW2IbOnrvqz4840fnWKiLMiSemMG5lS.FxFJS';

-- This creates admin user with:
-- Username: admin
-- Password: Axis#654321
