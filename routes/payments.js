const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, managerAccess } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Get all payments with filters
router.get('/', verifyToken, async (req, res) => {
    try {
        const { seller_id, from_date, to_date, payment_type } = req.query;
        let query = `
            SELECT p.id, p.seller_id, p.amount, 
                   DATE_FORMAT(p.payment_date, '%Y-%m-%d') as payment_date,
                   p.payment_type, p.reference_number, p.notes, p.image_path,
                   p.recorded_by, p.created_at, p.updated_at,
                   s.name AS seller_name 
            FROM payments p 
            JOIN sellers s ON p.seller_id = s.id 
            WHERE 1=1
        `;
        const params = [];

        if (seller_id) {
            query += ' AND p.seller_id = ?';
            params.push(seller_id);
        }
        if (from_date) {
            query += ' AND p.payment_date >= ?';
            params.push(from_date);
        }
        if (to_date) {
            query += ' AND p.payment_date <= ?';
            params.push(to_date);
        }
        if (payment_type) {
            query += ' AND p.payment_type = ?';
            params.push(payment_type);
        }

        query += ' ORDER BY p.payment_date DESC, p.created_at DESC';

        const [payments] = await pool.query(query, params);
        res.json(payments);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Server error fetching payments.' });
    }
});

// Get payment summary
router.get('/summary', verifyToken, async (req, res) => {
    try {
        // Total payments
        const [totalPayments] = await pool.query('SELECT COALESCE(SUM(amount), 0) AS total FROM payments');
        
        // Total initial balance (cash in hand base)
        const [totalBalance] = await pool.query('SELECT COALESCE(SUM(initial_balance), 0) AS total FROM sellers');
        
        // Total pending amounts
        const [totalPending] = await pool.query(
            'SELECT COALESCE(SUM(amount), 0) AS total FROM pending_amounts WHERE status != "paid"'
        );

        // Payments by seller
        const [bySellerData] = await pool.query(`
            SELECT s.id, s.name, 
                   COALESCE(SUM(p.amount), 0) AS total_payments,
                   s.initial_balance,
                   COALESCE((SELECT SUM(pa.amount) FROM pending_amounts pa WHERE pa.seller_id = s.id AND pa.status != 'paid'), 0) AS pending_amount
            FROM sellers s
            LEFT JOIN payments p ON s.id = p.seller_id
            GROUP BY s.id, s.name, s.initial_balance
        `);

        // Monthly trend (last 6 months)
        const [monthlyTrend] = await pool.query(`
            SELECT 
                DATE_FORMAT(payment_date, '%Y-%m') AS month,
                SUM(amount) AS total
            FROM payments
            WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
            ORDER BY month
        `);

        const cashInHand = totalBalance[0].total - totalPayments[0].total;

        res.json({
            total_payments: totalPayments[0].total,
            total_initial_balance: totalBalance[0].total,
            cash_in_hand: cashInHand,
            total_pending: totalPending[0].total,
            by_seller: bySellerData,
            monthly_trend: monthlyTrend
        });
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ error: 'Server error fetching summary.' });
    }
});

// Record new payment (with optional image)
router.post('/', verifyToken, managerAccess, upload.single('image'), async (req, res) => {
    try {
        console.log('--- Payment POST Request ---');
        console.log('Body:', req.body);
        console.log('File:', req.file);
        
        const { seller_id, amount, payment_date, payment_type, reference_number, notes } = req.body;

        if (!seller_id || !amount || !payment_date) {
            return res.status(400).json({ error: 'Seller ID, amount, and payment date are required.' });
        }

        // Verify seller exists
        const [sellers] = await pool.query('SELECT id FROM sellers WHERE id = ?', [seller_id]);
        if (sellers.length === 0) {
            return res.status(404).json({ error: 'Seller not found.' });
        }

        // Get image path if uploaded
        const imagePath = req.file ? '/uploads/' + req.file.filename : null;
        console.log('Image path to save:', imagePath);

        const [result] = await pool.query(
            'INSERT INTO payments (seller_id, amount, payment_date, payment_type, reference_number, notes, image_path, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [seller_id, amount, payment_date, payment_type || 'cash', reference_number || null, notes || null, imagePath, req.user.id]
        );

        console.log('Payment created with ID:', result.insertId);

        res.status(201).json({
            message: 'Payment recorded successfully.',
            paymentId: result.insertId,
            imagePath: imagePath
        });
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ error: 'Server error recording payment.' });
    }
});

// Update payment (with optional image)
router.put('/:id', verifyToken, managerAccess, upload.single('image'), async (req, res) => {
    try {
        console.log('--- Payment PUT Request ---');
        console.log('Body:', req.body);
        console.log('File:', req.file);
        
        const { amount, payment_date, payment_type, reference_number, notes, delete_image } = req.body;

        // Get image path if uploaded
        let imagePath = undefined; // undefined = don't change
        if (req.file) {
            imagePath = '/uploads/' + req.file.filename;
            console.log('New image uploaded:', imagePath);
        } else if (delete_image === 'true') {
            imagePath = null; // Set to null to delete
            console.log('Deleting existing image');
        }

        let query = `UPDATE payments SET 
            amount = COALESCE(?, amount),
            payment_date = COALESCE(?, payment_date),
            payment_type = COALESCE(?, payment_type),
            reference_number = COALESCE(?, reference_number),
            notes = COALESCE(?, notes)`;
        
        const params = [amount, payment_date, payment_type, reference_number, notes];

        if (imagePath !== undefined) {
            query += `, image_path = ?`;
            params.push(imagePath);
        }

        query += ` WHERE id = ?`;
        params.push(req.params.id);

        const [result] = await pool.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Payment not found.' });
        }

        res.json({ message: 'Payment updated successfully.', imagePath: imagePath });
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Server error updating payment.' });
    }
});

// Delete payment
router.delete('/:id', verifyToken, managerAccess, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM payments WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Payment not found.' });
        }

        res.json({ message: 'Payment deleted successfully.' });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ error: 'Server error deleting payment.' });
    }
});

// Pending amounts routes
router.get('/pending', verifyToken, async (req, res) => {
    try {
        const [pending] = await pool.query(`
            SELECT pa.*, s.name AS seller_name 
            FROM pending_amounts pa 
            JOIN sellers s ON pa.seller_id = s.id 
            WHERE pa.status != 'paid'
            ORDER BY pa.due_date ASC
        `);
        res.json(pending);
    } catch (error) {
        console.error('Error fetching pending amounts:', error);
        res.status(500).json({ error: 'Server error fetching pending amounts.' });
    }
});

router.post('/pending', verifyToken, managerAccess, async (req, res) => {
    try {
        const { seller_id, amount, due_date, description } = req.body;

        if (!seller_id || !amount) {
            return res.status(400).json({ error: 'Seller ID and amount are required.' });
        }

        const [result] = await pool.query(
            'INSERT INTO pending_amounts (seller_id, amount, due_date, description) VALUES (?, ?, ?, ?)',
            [seller_id, amount, due_date || null, description || null]
        );

        res.status(201).json({
            message: 'Pending amount recorded successfully.',
            pendingId: result.insertId
        });
    } catch (error) {
        console.error('Error recording pending amount:', error);
        res.status(500).json({ error: 'Server error recording pending amount.' });
    }
});

router.put('/pending/:id', verifyToken, managerAccess, async (req, res) => {
    try {
        const { amount, due_date, description, status } = req.body;

        const [result] = await pool.query(
            `UPDATE pending_amounts SET 
                amount = COALESCE(?, amount),
                due_date = COALESCE(?, due_date),
                description = COALESCE(?, description),
                status = COALESCE(?, status)
            WHERE id = ?`,
            [amount, due_date, description, status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Pending amount not found.' });
        }

        res.json({ message: 'Pending amount updated successfully.' });
    } catch (error) {
        console.error('Error updating pending amount:', error);
        res.status(500).json({ error: 'Server error updating pending amount.' });
    }
});

module.exports = router;
