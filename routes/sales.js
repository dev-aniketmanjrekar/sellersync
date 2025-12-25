const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, managerAccess } = require('../middleware/auth');

// Get all sales with filters
router.get('/', verifyToken, async (req, res) => {
    try {
        const { seller_id, from_date, to_date, payment_method } = req.query;
        let query = `
            SELECT 
                sa.*, 
                si.item_name, si.cost_price, si.seller_id,
                s.name AS seller_name
            FROM sales sa
            JOIN stock_items si ON sa.stock_item_id = si.id
            JOIN sellers s ON si.seller_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (seller_id) {
            query += ' AND si.seller_id = ?';
            params.push(seller_id);
        }
        if (from_date) {
            query += ' AND sa.sale_date >= ?';
            params.push(from_date);
        }
        if (to_date) {
            query += ' AND sa.sale_date <= ?';
            params.push(to_date);
        }
        if (payment_method) {
            query += ' AND sa.payment_method = ?';
            params.push(payment_method);
        }

        query += ' ORDER BY sa.sale_date DESC, sa.created_at DESC';

        const [sales] = await pool.query(query, params);
        res.json(sales);
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ error: 'Server error fetching sales.' });
    }
});

// Get sales summary (for dashboard)
router.get('/summary', verifyToken, async (req, res) => {
    try {
        // Total sales
        const [totalSales] = await pool.query(
            'SELECT COALESCE(SUM(selling_price), 0) AS total FROM sales'
        );

        // Total cost of sold items
        const [totalCost] = await pool.query(`
            SELECT COALESCE(SUM(si.cost_price), 0) AS total 
            FROM sales sa 
            JOIN stock_items si ON sa.stock_item_id = si.id
        `);

        // Total payments made
        const [totalPayments] = await pool.query(
            'SELECT COALESCE(SUM(amount), 0) AS total FROM payments'
        );

        // Sales by payment method
        const [salesByMethod] = await pool.query(`
            SELECT payment_method, SUM(selling_price) as total 
            FROM sales GROUP BY payment_method
        `);

        // Rolling cash = Total Sales - Total Payments
        const rollingCash = parseFloat(totalSales[0].total) - parseFloat(totalPayments[0].total);
        const profit = parseFloat(totalSales[0].total) - parseFloat(totalCost[0].total);

        res.json({
            totalSales: totalSales[0].total,
            totalCost: totalCost[0].total,
            totalPayments: totalPayments[0].total,
            rollingCash: rollingCash,
            profit: profit,
            salesByMethod: salesByMethod
        });
    } catch (error) {
        console.error('Error fetching sales summary:', error);
        res.status(500).json({ error: 'Server error fetching summary.' });
    }
});

// Record new sale
router.post('/', verifyToken, managerAccess, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { stock_item_id, selling_price, payment_method, sale_date, notes } = req.body;

        if (!stock_item_id || !selling_price || !sale_date) {
            return res.status(400).json({ error: 'Stock item, selling price, and sale date are required.' });
        }

        // Check if item exists and is in_stock
        const [items] = await connection.query(
            'SELECT * FROM stock_items WHERE id = ? AND status = "in_stock"',
            [stock_item_id]
        );

        if (items.length === 0) {
            return res.status(404).json({ error: 'Stock item not found or already sold.' });
        }

        // Record the sale
        const [saleResult] = await connection.query(
            'INSERT INTO sales (stock_item_id, selling_price, payment_method, sale_date, notes, recorded_by) VALUES (?, ?, ?, ?, ?, ?)',
            [stock_item_id, selling_price, payment_method || 'cash', sale_date, notes || null, req.user.id]
        );

        // Update stock item status to sold
        await connection.query(
            'UPDATE stock_items SET status = "sold" WHERE id = ?',
            [stock_item_id]
        );

        await connection.commit();

        res.status(201).json({
            message: 'Sale recorded successfully.',
            saleId: saleResult.insertId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error recording sale:', error);
        res.status(500).json({ error: 'Server error recording sale.' });
    } finally {
        connection.release();
    }
});

// Delete sale (also restores stock item to in_stock)
router.delete('/:id', verifyToken, managerAccess, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Get the sale to find stock_item_id
        const [sales] = await connection.query('SELECT * FROM sales WHERE id = ?', [req.params.id]);
        if (sales.length === 0) {
            return res.status(404).json({ error: 'Sale not found.' });
        }

        const stockItemId = sales[0].stock_item_id;

        // Delete the sale
        await connection.query('DELETE FROM sales WHERE id = ?', [req.params.id]);

        // Restore stock item to in_stock
        await connection.query('UPDATE stock_items SET status = "in_stock" WHERE id = ?', [stockItemId]);

        await connection.commit();

        res.json({ message: 'Sale deleted and item restored to stock.' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting sale:', error);
        res.status(500).json({ error: 'Server error deleting sale.' });
    } finally {
        connection.release();
    }
});

module.exports = router;
