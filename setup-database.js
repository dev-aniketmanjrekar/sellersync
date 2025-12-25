// Database Setup Script
// Run this to automatically create all missing tables
// Usage: node setup-database.js

require('dotenv').config();
const pool = require('./config/database');

async function setupDatabase() {
    console.log('🔄 Setting up database...\n');

    try {
        // 1. Create stock_items table
        console.log('📦 Creating stock_items table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS stock_items (
                id INT PRIMARY KEY AUTO_INCREMENT,
                seller_id INT NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                cost_price DECIMAL(12,2) NOT NULL,
                status ENUM('in_stock', 'sold') DEFAULT 'in_stock',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
            )
        `);
        console.log('   ✓ stock_items table ready');

        // 2. Create exhibitions table
        console.log('🏛️  Creating exhibitions table...');
        await pool.query(`
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
            )
        `);
        console.log('   ✓ exhibitions table ready');

        // 3. Create sales table
        console.log('💰 Creating sales table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sales (
                id INT PRIMARY KEY AUTO_INCREMENT,
                stock_item_id INT NOT NULL,
                selling_price DECIMAL(12,2) NOT NULL,
                payment_method ENUM('cash', 'online') DEFAULT 'cash',
                sale_date DATE NOT NULL,
                notes TEXT,
                exhibition_id INT DEFAULT NULL,
                recorded_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (stock_item_id) REFERENCES stock_items(id) ON DELETE CASCADE,
                FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE SET NULL
            )
        `);
        console.log('   ✓ sales table ready');

        // 4. Create indexes (ignore if already exist)
        console.log('📑 Creating indexes...');
        try {
            await pool.query('CREATE INDEX idx_stock_seller ON stock_items(seller_id)');
        } catch (e) { /* Index may already exist */ }
        try {
            await pool.query('CREATE INDEX idx_stock_status ON stock_items(status)');
        } catch (e) { /* Index may already exist */ }
        try {
            await pool.query('CREATE INDEX idx_sales_date ON sales(sale_date)');
        } catch (e) { /* Index may already exist */ }
        try {
            await pool.query('CREATE INDEX idx_exhibition_status ON exhibitions(status)');
        } catch (e) { /* Index may already exist */ }
        console.log('   ✓ indexes ready');

        console.log('\n✅ Database setup complete!\n');
        console.log('You can now start the server with: node server.js\n');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error setting up database:', error.message);
        console.error('\nMake sure:');
        console.error('  1. MySQL is running');
        console.error('  2. The "sellers" table exists (run schema.sql first)');
        console.error('  3. Your .env database credentials are correct\n');
        process.exit(1);
    }
}

setupDatabase();
