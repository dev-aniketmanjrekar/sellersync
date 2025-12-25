-- SellerSync Stock & Sales System Migration
-- Run this in phpMyAdmin on Hostinger

-- 1. Create stock_items table
CREATE TABLE IF NOT EXISTS stock_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    seller_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    cost_price DECIMAL(12,2) NOT NULL,
    status ENUM('in_stock', 'sold') DEFAULT 'in_stock',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
);

-- 2. Create sales table
CREATE TABLE IF NOT EXISTS sales (
    id INT PRIMARY KEY AUTO_INCREMENT,
    stock_item_id INT NOT NULL,
    selling_price DECIMAL(12,2) NOT NULL,
    payment_method ENUM('cash', 'online') DEFAULT 'cash',
    sale_date DATE NOT NULL,
    notes TEXT,
    recorded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_item_id) REFERENCES stock_items(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- 3. Add index for faster queries
CREATE INDEX idx_stock_seller ON stock_items(seller_id);
CREATE INDEX idx_stock_status ON stock_items(status);
CREATE INDEX idx_sales_date ON sales(sale_date);
