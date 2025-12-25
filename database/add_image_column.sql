-- Run this script in phpMyAdmin to add the image_path column to payments table
-- Go to phpMyAdmin > sellersync database > SQL tab > paste this and click Go

ALTER TABLE payments ADD COLUMN image_path VARCHAR(255) AFTER notes;

-- Verify the column was added
DESCRIBE payments;
