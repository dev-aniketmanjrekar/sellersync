const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Generate financial report
router.get('/financial', verifyToken, async (req, res) => {
    try {
        const { from_date, to_date, seller_id } = req.query;

        // Build date filter
        let dateFilter = '';
        const params = [];
        
        if (from_date) {
            dateFilter += ' AND p.payment_date >= ?';
            params.push(from_date);
        }
        if (to_date) {
            dateFilter += ' AND p.payment_date <= ?';
            params.push(to_date);
        }

        // Get seller-wise summary
        let sellerFilter = '';
        if (seller_id) {
            sellerFilter = ' AND s.id = ?';
            params.push(seller_id);
        }

        const [sellerSummary] = await pool.query(`
            SELECT 
                s.id,
                s.name,
                s.location,
                s.initial_balance,
                COALESCE(SUM(p.amount), 0) AS total_payments,
                (s.initial_balance - COALESCE(SUM(p.amount), 0)) AS balance_remaining,
                COALESCE((SELECT SUM(pa.amount) FROM pending_amounts pa WHERE pa.seller_id = s.id AND pa.status != 'paid'), 0) AS pending_amount
            FROM sellers s
            LEFT JOIN payments p ON s.id = p.seller_id ${dateFilter.replace(/p\./g, 'p.')}
            WHERE 1=1 ${sellerFilter}
            GROUP BY s.id, s.name, s.location, s.initial_balance
            ORDER BY s.name
        `, params);

        // Get overall totals
        const [totals] = await pool.query(`
            SELECT 
                COALESCE(SUM(amount), 0) AS total_payments
            FROM payments p
            WHERE 1=1 ${dateFilter}
        `, params.slice(0, dateFilter ? (to_date ? 2 : 1) : 0));

        const [balanceTotal] = await pool.query('SELECT COALESCE(SUM(initial_balance), 0) AS total FROM sellers');
        const [pendingTotal] = await pool.query('SELECT COALESCE(SUM(amount), 0) AS total FROM pending_amounts WHERE status != "paid"');

        // Get payment breakdown by type
        const [paymentTypes] = await pool.query(`
            SELECT 
                payment_type,
                COUNT(*) AS count,
                COALESCE(SUM(amount), 0) AS total
            FROM payments p
            WHERE 1=1 ${dateFilter}
            GROUP BY payment_type
        `, params.slice(0, dateFilter ? (to_date ? 2 : 1) : 0));

        res.json({
            report_date: new Date().toISOString(),
            date_range: {
                from: from_date || 'All time',
                to: to_date || 'Present'
            },
            summary: {
                total_initial_balance: balanceTotal[0].total,
                total_payments: totals[0].total_payments,
                cash_in_hand: balanceTotal[0].total - totals[0].total_payments,
                total_pending: pendingTotal[0].total
            },
            by_seller: sellerSummary,
            by_payment_type: paymentTypes
        });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Server error generating report.' });
    }
});

// Export data as JSON backup
router.get('/export/json', verifyToken, async (req, res) => {
    try {
        // Get all data
        const [sellers] = await pool.query('SELECT * FROM sellers');
        const [payments] = await pool.query('SELECT * FROM payments ORDER BY payment_date DESC');
        const [pending] = await pool.query('SELECT * FROM pending_amounts');
        const [users] = await pool.query('SELECT id, username, full_name, email, role, created_at FROM users');

        const exportData = {
            export_date: new Date().toISOString(),
            version: '1.0',
            data: {
                sellers,
                payments,
                pending_amounts: pending,
                users
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=sellersync_backup_${new Date().toISOString().split('T')[0]}.json`);
        res.json(exportData);
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ error: 'Server error exporting data.' });
    }
});

// Generate printable HTML report
router.get('/printable', verifyToken, async (req, res) => {
    try {
        const { from_date, to_date } = req.query;

        // Get summary data
        const [sellers] = await pool.query(`
            SELECT 
                s.name,
                s.location,
                s.initial_balance,
                COALESCE(SUM(p.amount), 0) AS total_payments,
                (s.initial_balance - COALESCE(SUM(p.amount), 0)) AS balance_remaining,
                COALESCE((SELECT SUM(pa.amount) FROM pending_amounts pa WHERE pa.seller_id = s.id AND pa.status != 'paid'), 0) AS pending_amount
            FROM sellers s
            LEFT JOIN payments p ON s.id = p.seller_id
            GROUP BY s.id, s.name, s.location, s.initial_balance
        `);

        const [totals] = await pool.query('SELECT COALESCE(SUM(amount), 0) AS total FROM payments');
        const [balanceTotal] = await pool.query('SELECT COALESCE(SUM(initial_balance), 0) AS total FROM sellers');
        const [pendingTotal] = await pool.query('SELECT COALESCE(SUM(amount), 0) AS total FROM pending_amounts WHERE status != "paid"');

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SellerSync Financial Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; }
        .header h1 { color: #4F46E5; margin-bottom: 5px; }
        .header p { color: #666; }
        .summary-cards { display: flex; justify-content: space-around; margin-bottom: 30px; gap: 15px; flex-wrap: wrap; }
        .card { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 20px; border-radius: 10px; text-align: center; min-width: 150px; }
        .card h3 { font-size: 14px; opacity: 0.9; margin-bottom: 5px; }
        .card p { font-size: 24px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #4F46E5; color: white; }
        tr:nth-child(even) { background: #f8f9fa; }
        .amount { text-align: right; font-family: monospace; }
        .pending { color: #DC2626; }
        .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        @media print { body { padding: 0; } .card { break-inside: avoid; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>SellerSync Financial Report</h1>
        <p>Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
    </div>

    <div class="summary-cards">
        <div class="card">
            <h3>Total Payments</h3>
            <p>₹${Number(totals[0].total).toLocaleString('en-IN')}</p>
        </div>
        <div class="card" style="background: linear-gradient(135deg, #059669, #10B981);">
            <h3>Cash in Hand</h3>
            <p>₹${Number(balanceTotal[0].total - totals[0].total).toLocaleString('en-IN')}</p>
        </div>
        <div class="card" style="background: linear-gradient(135deg, #DC2626, #EF4444);">
            <h3>Total Pending</h3>
            <p>₹${Number(pendingTotal[0].total).toLocaleString('en-IN')}</p>
        </div>
    </div>

    <h2>Seller-wise Summary</h2>
    <table>
        <thead>
            <tr>
                <th>Seller</th>
                <th>Location</th>
                <th class="amount">Initial Balance</th>
                <th class="amount">Total Payments</th>
                <th class="amount">Balance</th>
                <th class="amount">Pending</th>
            </tr>
        </thead>
        <tbody>
            ${sellers.map(s => `
            <tr>
                <td>${s.name}</td>
                <td>${s.location || '-'}</td>
                <td class="amount">₹${Number(s.initial_balance).toLocaleString('en-IN')}</td>
                <td class="amount">₹${Number(s.total_payments).toLocaleString('en-IN')}</td>
                <td class="amount">₹${Number(s.balance_remaining).toLocaleString('en-IN')}</td>
                <td class="amount pending">₹${Number(s.pending_amount).toLocaleString('en-IN')}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="footer">
        <p>SellerSync - Seller Payments and Cash Flow Management</p>
    </div>
</body>
</html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('Error generating printable report:', error);
        res.status(500).json({ error: 'Server error generating printable report.' });
    }
});

module.exports = router;
