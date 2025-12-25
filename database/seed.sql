-- SellerSync Seed Data
-- Run this after schema.sql to populate example data

USE sellersync;

-- Insert sellers (Akriti/Kolkata, Bhagalpuri, Gauri)
-- Total cash received from exhibitions: ₹1,33,500
INSERT INTO sellers (name, location, contact_person, phone, initial_balance, status) VALUES
('Akriti', 'Kolkata', 'Akriti Contact', '9876543210', 30000.00, 'active'),
('Bhagalpuri', 'Bhagalpur', 'Bhagalpuri Contact', '9876543211', 50000.00, 'active'),
('Gauri', 'Gauri', 'Gauri Contact', '9876543212', 53500.00, 'active');
-- Total initial balance: ₹1,33,500

-- Kolkata (Akriti) Payments - Total: ₹2,540
INSERT INTO payments (seller_id, amount, payment_date, payment_type, notes) VALUES
(1, 1360.00, '2025-10-07', 'cash', '7th October 2025 payment'),
(1, 1180.00, '2025-10-09', 'cash', '9th October 2025 payment');

-- Bhagalpuri Payments - Total: ₹7,800
INSERT INTO payments (seller_id, amount, payment_date, payment_type, notes) VALUES
(2, 1000.00, '2025-10-07', 'cash', '7th October 2025 payment'),
(2, 2200.00, '2025-10-09', 'cash', '9th October 2025 payment'),
(2, 4600.00, '2025-10-10', 'cash', '10th October 2025 payment');

-- Gauri Payments - Total: ₹15,200
INSERT INTO payments (seller_id, amount, payment_date, payment_type, notes) VALUES
(3, 3500.00, '2025-10-09', 'cash', '9th October 2025 payment'),
(3, 11700.00, '2025-10-10', 'cash', '10th October 2025 payment');

-- Overall Total Payments: ₹25,540
-- Cash in Hand: ₹1,07,960 (₹1,33,500 - ₹25,540)

-- Pending Amounts (excluded from cash in hand)
INSERT INTO pending_amounts (seller_id, amount, due_date, description, status) VALUES
(1, 180.00, '2025-10-13', 'Pending from Kolkata - 13th October', 'pending'),
(2, 3300.00, '2025-10-11', 'Pending from Bhagalpuri - 11th October after return', 'pending'),
(3, 1950.00, '2025-10-15', 'Pending from Gauri - 15th October', 'pending');

-- Verify the data
SELECT '=== Sellers ===' AS info;
SELECT id, name, location, initial_balance FROM sellers;

SELECT '=== Total Payments ===' AS info;
SELECT SUM(amount) AS total_payments FROM payments;

SELECT '=== Cash in Hand ===' AS info;
SELECT (SELECT SUM(initial_balance) FROM sellers) - (SELECT SUM(amount) FROM payments) AS cash_in_hand;

SELECT '=== Pending Amounts by Seller ===' AS info;
SELECT s.name, pa.amount AS pending_amount, pa.due_date
FROM pending_amounts pa 
JOIN sellers s ON pa.seller_id = s.id
ORDER BY pa.due_date;
