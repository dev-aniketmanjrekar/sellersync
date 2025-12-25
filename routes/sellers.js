const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, managerAccess } = require('../middleware/auth');

// Get all sellers
router.get('/', verifyToken, async (req, res) => {
    try {
        const [sellers] = await pool.query(`
            SELECT s.*, 
                   COALESCE(SUM(p.amount), 0) AS total_payments,
                   COALESCE((SELECT SUM(pa.amount) FROM pending_amounts pa WHERE pa.seller_id = s.id AND pa.status != 'paid'), 0) AS pending_amount
            FROM sellers s
            LEFT JOIN payments p ON s.id = p.seller_id
            GROUP BY s.id
            ORDER BY s.name
        `);
        res.json(sellers);
    } catch (error) {
        console.error('Error fetching sellers:', error);
        res.status(500).json({ error: 'Server error fetching sellers.' });
    }
});

// Get single seller with details
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const [sellers] = await pool.query(`
            SELECT s.*, 
                   COALESCE(SUM(p.amount), 0) AS total_payments,
                   COALESCE((SELECT SUM(pa.amount) FROM pending_amounts pa WHERE pa.seller_id = s.id AND pa.status != 'paid'), 0) AS pending_amount
            FROM sellers s
            LEFT JOIN payments p ON s.id = p.seller_id
            WHERE s.id = ?
            GROUP BY s.id
        `, [req.params.id]);

        if (sellers.length === 0) {
            return res.status(404).json({ error: 'Seller not found.' });
        }

        // Get recent payments
        const [payments] = await pool.query(
            'SELECT * FROM payments WHERE seller_id = ? ORDER BY payment_date DESC LIMIT 10',
            [req.params.id]
        );

        // Get pending amounts
        const [pending] = await pool.query(
            'SELECT * FROM pending_amounts WHERE seller_id = ? AND status != "paid"',
            [req.params.id]
        );

        res.json({
            ...sellers[0],
            recent_payments: payments,
            pending_details: pending
        });
    } catch (error) {
        console.error('Error fetching seller:', error);
        res.status(500).json({ error: 'Server error fetching seller.' });
    }
});

// Create new seller
router.post('/', verifyToken, managerAccess, async (req, res) => {
    try {
        const { name, location, contact_person, phone, email, initial_balance, notes } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Seller name is required.' });
        }

        const [result] = await pool.query(
            'INSERT INTO sellers (name, location, contact_person, phone, email, initial_balance, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, location || null, contact_person || null, phone || null, email || null, initial_balance || 0, notes || null]
        );

        res.status(201).json({
            message: 'Seller created successfully.',
            sellerId: result.insertId
        });
    } catch (error) {
        console.error('Error creating seller:', error);
        res.status(500).json({ error: 'Server error creating seller.' });
    }
});

// Update seller
router.put('/:id', verifyToken, managerAccess, async (req, res) => {
    try {
        const { name, location, contact_person, phone, email, initial_balance, notes, status } = req.body;

        const [result] = await pool.query(
            `UPDATE sellers SET 
                name = COALESCE(?, name),
                location = COALESCE(?, location),
                contact_person = COALESCE(?, contact_person),
                phone = COALESCE(?, phone),
                email = COALESCE(?, email),
                initial_balance = COALESCE(?, initial_balance),
                notes = COALESCE(?, notes),
                status = COALESCE(?, status)
            WHERE id = ?`,
            [name, location, contact_person, phone, email, initial_balance, notes, status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Seller not found.' });
        }

        res.json({ message: 'Seller updated successfully.' });
    } catch (error) {
        console.error('Error updating seller:', error);
        res.status(500).json({ error: 'Server error updating seller.' });
    }
});

// Delete seller
router.delete('/:id', verifyToken, managerAccess, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM sellers WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Seller not found.' });
        }

        res.json({ message: 'Seller deleted successfully.' });
    } catch (error) {
        console.error('Error deleting seller:', error);
        res.status(500).json({ error: 'Server error deleting seller.' });
    }
});

module.exports = router;
