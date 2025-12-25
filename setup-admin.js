// Script to generate admin user password hash and insert into database
// Run this once after setting up the database: node setup-admin.js

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupAdmin() {
    const password = 'Axis#654321';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Generated password hash:', hashedPassword);
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'sellersync'
        });

        // Check if admin exists
        const [existing] = await connection.query('SELECT id FROM users WHERE username = ?', ['admin']);
        
        if (existing.length > 0) {
            // Update existing admin password
            await connection.query('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, 'admin']);
            console.log('✓ Admin password updated successfully');
        } else {
            // Insert new admin user
            await connection.query(
                'INSERT INTO users (username, password, full_name, email, role) VALUES (?, ?, ?, ?, ?)',
                ['admin', hashedPassword, 'Administrator', 'admin@sellersync.com', 'admin']
            );
            console.log('✓ Admin user created successfully');
        }

        console.log('\n📋 Admin Credentials:');
        console.log('   Username: admin');
        console.log('   Password: Axis#654321');
        
        await connection.end();
    } catch (error) {
        console.error('Error setting up admin:', error.message);
        console.log('\n⚠️  Make sure to:');
        console.log('   1. Create the database: CREATE DATABASE sellersync;');
        console.log('   2. Run schema.sql to create tables');
        console.log('   3. Run this script again');
    }
}

setupAdmin();
