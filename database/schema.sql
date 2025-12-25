-- SellerSync Database Schema
-- Run this file to create the database structure

CREATE DATABASE IF NOT EXISTS sellersync;
USE sellersync;

-- Users table for authentication and RBAC
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(100),
    role ENUM('admin', 'manager', 'viewer') DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sellers table (Akriti, Bhagalpuri, Gauri)
CREATE TABLE IF NOT EXISTS sellers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    initial_balance DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Payments table for tracking transactions
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    seller_id INT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_type ENUM('cash', 'bank_transfer', 'cheque', 'upi') DEFAULT 'cash',
    reference_number VARCHAR(50),
    notes TEXT,
    image_path VARCHAR(255),
    recorded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Pending amounts table
CREATE TABLE IF NOT EXISTS pending_amounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    seller_id INT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    due_date DATE,
    description TEXT,
    status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
    notification_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
);

-- Cash flow summary view
CREATE OR REPLACE VIEW cash_flow_summary AS
SELECT 
    s.id AS seller_id,
    s.name AS seller_name,
    s.initial_balance,
    COALESCE(SUM(p.amount), 0) AS total_payments,
    COALESCE((SELECT SUM(pa.amount) FROM pending_amounts pa WHERE pa.seller_id = s.id AND pa.status != 'paid'), 0) AS pending_amount,
    (s.initial_balance - COALESCE(SUM(p.amount), 0)) AS cash_in_hand
FROM sellers s
LEFT JOIN payments p ON s.id = p.seller_id
GROUP BY s.id, s.name, s.initial_balance;

-- Index for faster queries
CREATE INDEX idx_payments_seller ON payments(seller_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_pending_seller ON pending_amounts(seller_id);
CREATE INDEX idx_pending_status ON pending_amounts(status);
