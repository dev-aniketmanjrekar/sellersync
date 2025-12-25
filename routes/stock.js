const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, managerAccess } = require('../middleware/auth');

// Get all stock items with filters
router.get('/', verifyToken, async (req, res) => {
    try {
        const { seller_id, status } = req.query;
        let query = `
            SELECT si.*, s.name AS seller_name 
            FROM stock_items si 
            JOIN sellers s ON si.seller_id = s.id 
            WHERE 1=1
        `;
        const params = [];

        if (seller_id) {
            query += ' AND si.seller_id = ?';
            params.push(seller_id);
        }
        if (status) {
            query += ' AND si.status = ?';
            params.push(status);
        }

        query += ' ORDER BY si.created_at DESC';

        const [items] = await pool.query(query, params);
        res.json(items);
    } catch (error) {
        console.error('Error fetching stock:', error);
        res.status(500).json({ error: 'Server error fetching stock.' });
    }
});

// Get stock summary
router.get('/summary', verifyToken, async (req, res) => {
    try {
        // Total stock value (in_stock items)
        const [stockValue] = await pool.query(
            'SELECT COALESCE(SUM(cost_price), 0) AS total FROM stock_items WHERE status = "in_stock"'
        );
        
        // Stock count by status
        const [stockCount] = await pool.query(
            'SELECT status, COUNT(*) as count FROM stock_items GROUP BY status'
        );

        // Per seller summary
        const [sellerSummary] = await pool.query(`
            SELECT 
                s.id, s.name,
                COUNT(CASE WHEN si.status = 'in_stock' THEN 1 END) as items_in_stock,
                COALESCE(SUM(CASE WHEN si.status = 'in_stock' THEN si.cost_price ELSE 0 END), 0) as stock_value,
                COUNT(CASE WHEN si.status = 'sold' THEN 1 END) as items_sold
            FROM sellers s
            LEFT JOIN stock_items si ON s.id = si.seller_id
            GROUP BY s.id, s.name
        `);

        res.json({
            totalStockValue: stockValue[0].total,
            stockCount: stockCount,
            sellerSummary: sellerSummary
        });
    } catch (error) {
        console.error('Error fetching stock summary:', error);
        res.status(500).json({ error: 'Server error fetching summary.' });
    }
});

// Add new stock item
router.post('/', verifyToken, managerAccess, async (req, res) => {
    try {
        const { seller_id, item_name, cost_price } = req.body;

        if (!seller_id || !item_name || !cost_price) {
            return res.status(400).json({ error: 'Seller, item name, and cost price are required.' });
        }

        const [result] = await pool.query(
            'INSERT INTO stock_items (seller_id, item_name, cost_price) VALUES (?, ?, ?)',
            [seller_id, item_name, cost_price]
        );

        res.status(201).json({
            message: 'Stock item added successfully.',
            itemId: result.insertId
        });
    } catch (error) {
        console.error('Error adding stock item:', error);
        res.status(500).json({ error: 'Server error adding stock item.' });
    }
});

// Update stock item
router.put('/:id', verifyToken, managerAccess, async (req, res) => {
    try {
        const { item_name, cost_price } = req.body;

        const [result] = await pool.query(
            'UPDATE stock_items SET item_name = COALESCE(?, item_name), cost_price = COALESCE(?, cost_price) WHERE id = ?',
            [item_name, cost_price, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Stock item not found.' });
        }

        res.json({ message: 'Stock item updated successfully.' });
    } catch (error) {
        console.error('Error updating stock item:', error);
        res.status(500).json({ error: 'Server error updating stock item.' });
    }
});

// Delete stock item
router.delete('/:id', verifyToken, managerAccess, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM stock_items WHERE id = ? AND status = "in_stock"', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Stock item not found or already sold.' });
        }

        res.json({ message: 'Stock item deleted successfully.' });
    } catch (error) {
        console.error('Error deleting stock item:', error);
        res.status(500).json({ error: 'Server error deleting stock item.' });
    }
});

module.exports = router;
