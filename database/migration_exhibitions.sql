-- SellerSync Exhibitions Table
-- Run this in phpMyAdmin or MySQL client

CREATE TABLE IF NOT EXISTS exhibitions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    status ENUM('upcoming', 'active', 'completed') DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add exhibition_id to sales table to link sales to exhibitions
ALTER TABLE sales ADD COLUMN exhibition_id INT DEFAULT NULL;
ALTER TABLE sales ADD FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE SET NULL;

-- Index for faster queries
CREATE INDEX idx_exhibition_status ON exhibitions(status);
CREATE INDEX idx_sales_exhibition ON sales(exhibition_id);
