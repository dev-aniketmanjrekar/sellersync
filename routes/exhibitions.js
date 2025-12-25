const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, managerAccess } = require('../middleware/auth');

// Get all exhibitions
router.get('/', verifyToken, async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT e.*, 
                   COUNT(s.id) as sales_count,
                   COALESCE(SUM(s.selling_price), 0) as total_sales,
                   COALESCE(SUM(s.selling_price - si.cost_price), 0) as total_profit
            FROM exhibitions e
            LEFT JOIN sales s ON e.id = s.exhibition_id
            LEFT JOIN stock_items si ON s.stock_item_id = si.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND e.status = ?';
            params.push(status);
        }

        query += ' GROUP BY e.id ORDER BY e.start_date DESC';

        const [exhibitions] = await pool.query(query, params);
        res.json(exhibitions);
    } catch (error) {
        console.error('Error fetching exhibitions:', error);
        res.status(500).json({ error: 'Server error fetching exhibitions.' });
    }
});

// Get exhibition summary
router.get('/summary', verifyToken, async (req, res) => {
    try {
        const [total] = await pool.query('SELECT COUNT(*) as count FROM exhibitions');
        const [active] = await pool.query("SELECT COUNT(*) as count FROM exhibitions WHERE status = 'active'");
        const [upcoming] = await pool.query("SELECT COUNT(*) as count FROM exhibitions WHERE status = 'upcoming'");
        const [salesData] = await pool.query(`
            SELECT 
                COALESCE(SUM(s.selling_price), 0) as total_sales,
                COALESCE(SUM(s.selling_price - si.cost_price), 0) as total_profit
            FROM sales s
            JOIN stock_items si ON s.stock_item_id = si.id
            WHERE s.exhibition_id IS NOT NULL
        `);

        res.json({
            totalExhibitions: total[0].count,
            activeExhibitions: active[0].count,
            upcomingExhibitions: upcoming[0].count,
            totalSales: salesData[0].total_sales,
            totalProfit: salesData[0].total_profit
        });
    } catch (error) {
        console.error('Error fetching exhibition summary:', error);
        res.status(500).json({ error: 'Server error fetching summary.' });
    }
});

// Get single exhibition with sales
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const [exhibitions] = await pool.query('SELECT * FROM exhibitions WHERE id = ?', [req.params.id]);
        if (exhibitions.length === 0) {
            return res.status(404).json({ error: 'Exhibition not found.' });
        }

        const [sales] = await pool.query(`
            SELECT s.*, si.item_name, si.cost_price, sel.name as seller_name
            FROM sales s
            JOIN stock_items si ON s.stock_item_id = si.id
            JOIN sellers sel ON si.seller_id = sel.id
            WHERE s.exhibition_id = ?
            ORDER BY s.sale_date DESC
        `, [req.params.id]);

        res.json({
            ...exhibitions[0],
            sales: sales
        });
    } catch (error) {
        console.error('Error fetching exhibition:', error);
        res.status(500).json({ error: 'Server error fetching exhibition.' });
    }
});

// Add new exhibition
router.post('/', verifyToken, managerAccess, async (req, res) => {
    try {
        const { name, location, start_date, end_date, notes, status } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Exhibition name is required.' });
        }

        const [result] = await pool.query(
            'INSERT INTO exhibitions (name, location, start_date, end_date, notes, status) VALUES (?, ?, ?, ?, ?, ?)',
            [name, location || null, start_date || null, end_date || null, notes || null, status || 'upcoming']
        );

        res.status(201).json({
            message: 'Exhibition added successfully.',
            exhibitionId: result.insertId
        });
    } catch (error) {
        console.error('Error adding exhibition:', error);
        res.status(500).json({ error: 'Server error adding exhibition.' });
    }
});

// Update exhibition
router.put('/:id', verifyToken, managerAccess, async (req, res) => {
    try {
        const { name, location, start_date, end_date, notes, status } = req.body;

        const [result] = await pool.query(
            `UPDATE exhibitions SET 
                name = COALESCE(?, name),
                location = COALESCE(?, location),
                start_date = COALESCE(?, start_date),
                end_date = COALESCE(?, end_date),
                notes = COALESCE(?, notes),
                status = COALESCE(?, status)
            WHERE id = ?`,
            [name, location, start_date, end_date, notes, status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Exhibition not found.' });
        }

        res.json({ message: 'Exhibition updated successfully.' });
    } catch (error) {
        console.error('Error updating exhibition:', error);
        res.status(500).json({ error: 'Server error updating exhibition.' });
    }
});

// Delete exhibition
router.delete('/:id', verifyToken, managerAccess, async (req, res) => {
    try {
        // First unlink sales from this exhibition
        await pool.query('UPDATE sales SET exhibition_id = NULL WHERE exhibition_id = ?', [req.params.id]);
        
        const [result] = await pool.query('DELETE FROM exhibitions WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Exhibition not found.' });
        }

        res.json({ message: 'Exhibition deleted successfully.' });
    } catch (error) {
        console.error('Error deleting exhibition:', error);
        res.status(500).json({ error: 'Server error deleting exhibition.' });
    }
});

module.exports = router;
