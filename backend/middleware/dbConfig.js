const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ 
    path: path.join(__dirname, '../../readquestDB.env') 
});

// Set up the PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }, // Necessary for Supabase
});

// connect to database under test environment
if (process.env.NODE_ENV !== "test") {
    pool.connect((err) => {
        if (err) {
            console.error("Failed to connect to the database:", err.message);
        } else {
            console.log("Connected to the PostgreSQL database.");
        }
    });
}


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

// Close the database connection
const closeDB = async () => {
    await pool.end();
};

module.exports = {pool, closeDB};