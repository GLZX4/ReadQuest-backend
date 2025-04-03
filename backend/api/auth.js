const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');
require('dotenv').config();

module.exports = (pool) => {
    const router = express.Router();

    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

    // Register a new user
    router.post('/register', async (req, res) => {
        const { name, email, password, role, schoolCode } = req.body;
    
        if (!name || !email || !password || !role || !schoolCode) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
    
        const client = await pool.connect();
    
        try {
            await client.query('BEGIN');
    
            const schoolResult = await client.query(
                'SELECT schoolid FROM Schools WHERE schoolcode = $1',
                [schoolCode]
            );
    
            if (schoolResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Invalid school code.' });
            }
    
            const schoolID = schoolResult.rows[0].schoolid;
    
            const roleResult = await client.query(
                'SELECT roleID FROM role WHERE Role = $1',
                [role]
            );
    
            const roleID = roleResult.rows.length
                ? roleResult.rows[0].roleid
                : (await client.query(
                    'INSERT INTO role (Role) VALUES ($1) RETURNING roleID',
                    [role]
                  )).rows[0].roleid;
    
            const hashedPassword = await bcrypt.hash(password, 10);
    
            const userInsertResult = await client.query(
                `INSERT INTO Users (Name, Email, password, roleID, schoolID) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING userID`,
                [name, email, hashedPassword, roleID, schoolID]
            );
    
            const newUserID = userInsertResult.rows[0].userid;
    
            await client.query(
                `INSERT INTO student_level (userID, xp, level)
                 VALUES ($1, $2, $3)`,
                [newUserID, 0, 1]
            );
    
            await client.query('COMMIT');
            res.status(201).json({ message: 'User registered and level initialized successfully.' });
    
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error during registration:', error);
            res.status(500).json({ message: 'Internal server error.' });
        } finally {
            client.release();
        }
    });
    

    // Login a user
    router.post('/login', async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        try {
            const result = await pool.query(
                `SELECT u.*, r.role AS role_name 
                FROM users u
                JOIN role r ON u.roleid = r.roleid
                WHERE u.email = $1`,
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }

            const user = result.rows[0];

            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }

            const token = jwt.sign(
                { userId: user.userid, role: user.role_name },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            await pool.query('UPDATE users SET loggedin = TRUE WHERE email = $1', [email]);

            res.json({
                token,
                name: user.name,
                role: user.role_name,
            });
        } catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({ message: 'Error logging in user.' });
        }
    });
   

    // Logout a user
    router.post('/logout', async (req, res) => {
        const { email } = req.body;

        console.log('Logging out user:', email);

        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        try {
            await pool.query('UPDATE Users SET loggedIn = FALSE WHERE Email = $1', [email]);
            res.json({ message: 'User logged out successfully.' });
        } catch (error) {
            console.error('Error during logout:', error);
            res.status(500).json({ message: 'Error logging out user.' });
        }
    });


        // Register an admin user
    router.post('/register-admin', async (req, res) => {
        const { name, email, password } = req.body;
        const role = 'admin'; 

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            let roleResult = await pool.query('SELECT roleid FROM role WHERE role = $1', [role]);
            let roleID;

            if (roleResult.rows.length > 0) {
                roleID = roleResult.rows[0].roleid;
            } else {
                const newRole = await pool.query('INSERT INTO role (Role) VALUES ($1) RETURNING roleID', [role]);
                roleID = newRole.rows[0].roleid;
            }

            const emailCheck = await pool.query('SELECT * FROM Users WHERE Email = $1', [email]);
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({ message: 'Email already exists.' });
            }

            await pool.query(
                `INSERT INTO Users (name, email, password, roleid) 
                VALUES ($1, $2, $3, $4)`,
                [name, email, hashedPassword, roleID]
            );

            res.status(201).json({ message: 'Admin registered successfully.' });
        } catch (error) {
            console.error('Error during admin registration:', error);
            res.status(500).json({ message: 'Internal server error.' });
        }
    });


        // Register a tutor
    router.post('/register-tutor', async (req, res) => {
        const { name, email, password, verificationCode } = req.body;

        if (!name || !email || !password || !verificationCode) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        try {
            const codeResult = await pool.query(
                `SELECT * FROM VerificationCode WHERE code = $1 AND expirationAt > NOW() AND used = FALSE`,
                [verificationCode]
            );
            console.log('Code Result:', codeResult.rows);

            if (codeResult.rows.length === 0) {
                return res.status(400).json({ message: 'Invalid or expired verification code.' });
            }

            console.log('retreived result:', codeResult);

            const schoolID = codeResult.rows[0].schoolid;

            console.log('School ID:', schoolID);
            let roleResult = await pool.query('SELECT roleID FROM role WHERE Role = $1', ['tutor']);
            let roleID;

            if (roleResult.rows.length > 0) {
                roleID = roleResult.rows[0].roleid;
            } else {
                const newRole = await pool.query('INSERT INTO role (Role) VALUES ($1) RETURNING roleID', ['tutor']);
                roleID = newRole.rows[0].roleid;
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            await pool.query(
                `INSERT INTO Users (Name, Email, password, roleID, schoolID) 
                VALUES ($1, $2, $3, $4, $5)`,
                [name, email, hashedPassword, roleID, schoolID]
            );

            await pool.query(`UPDATE VerificationCode SET used = TRUE WHERE code = $1`, [verificationCode]);

            res.status(201).json({ message: 'Tutor registered successfully.' });
        } catch (error) {
            console.error('Error during tutor registration:', error);
            res.status(500).json({ message: 'Internal server error.' });
        }
    });

    return router;
};
