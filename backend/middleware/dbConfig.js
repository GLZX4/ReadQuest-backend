const { Pool } = require('pg');
require('dotenv').config({ path: '../readquestDB.env' }); // Load environment variables

// Set up the PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }, // Necessary for Supabase
});

// Test the database connection
pool.connect((err) => {
    if (err) {
        console.error('Failed to connect to the database:', err.message);
        console.log('DB_HOST:', process.env.DB_HOST);
        console.log('DB_PORT:', process.env.DB_PORT);
        console.log('DB_NAME:', process.env.DB_NAME);
        console.log('DB_USER:', process.env.DB_USER);
        console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
    } else {
        console.log('Connected to the PostgreSQL database.');
    }
});

module.exports = pool;