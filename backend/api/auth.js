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

        try {
            // Fetch school
            const schoolResult = await pool.query(
                'SELECT schoolid FROM Schools WHERE schoolcode = $1',
                [schoolCode]
            );
            if (schoolResult.rows.length === 0) {
                return res.status(400).json({ message: 'Invalid school code.' });
            }
            const schoolID = schoolResult.rows[0].schoolid;

            // Fetch or insert role
            const roleResult = await pool.query(
                'SELECT roleID FROM Roles WHERE Role = $1',
                [role]
            );
            const roleID = roleResult.rows.length
                ? roleResult.rows[0].roleid
                : (await pool.query(
                    'INSERT INTO Roles (Role) VALUES ($1) RETURNING roleID',
                    [role]
                )).rows[0].roleid;

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user
            await pool.query(
                `INSERT INTO Users (Name, Email, UserPassword, roleID, schoolID) 
                VALUES ($1, $2, $3, $4, $5)`,
                [name, email, hashedPassword, roleID, schoolID]
            );

            res.status(201).json({ message: 'User registered successfully.' });
        } catch (error) {
            console.error('Error during registration:', error);
            res.status(500).json({ message: 'Internal server error.' });
        }
    });


    // Login a user
    router.post('/login', async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        try {
            // Fetch user details and role name using JOIN
            const result = await pool.query(
                `SELECT u.*, r.role AS role_name 
                FROM users u
                JOIN roles r ON u.roleid = r.roleid
                WHERE u.email = $1`,
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }

            const user = result.rows[0];

            // Verify password
            const passwordMatch = await bcrypt.compare(password, user.userpassword);
            if (!passwordMatch) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }

            // Generate JWT token with userId and role
            const token = jwt.sign(
                { userId: user.userid, role: user.role_name },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // Update the user's loggedIn status
            await pool.query('UPDATE users SET loggedin = TRUE WHERE email = $1', [email]);

            // Respond with the token and user details
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
        const role = 'admin'; // The role for this user is always "admin"

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        try {
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Check if the admin role exists
            let roleResult = await pool.query('SELECT roleID FROM Roles WHERE Role = $1', [role]);
            let roleID;

            if (roleResult.rows.length > 0) {
                roleID = roleResult.rows[0].roleid;
            } else {
                // If the admin role doesn't exist, create it
                const newRole = await pool.query('INSERT INTO Roles (Role) VALUES ($1) RETURNING roleID', [role]);
                roleID = newRole.rows[0].roleid;
            }

            // Check if the email already exists
            const emailCheck = await pool.query('SELECT * FROM Users WHERE Email = $1', [email]);
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({ message: 'Email already exists.' });
            }

            // Insert the admin user into the database
            await pool.query(
                `INSERT INTO Users (Name, Email, UserPassword, roleID) 
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
            // Check if the verification code exists and is valid
            const codeResult = await pool.query(
                `SELECT * FROM VerificationCode WHERE code = $1 AND expirationAt > NOW() AND used = FALSE`,
                [verificationCode]
            );

            if (codeResult.rows.length === 0) {
                return res.status(400).json({ message: 'Invalid or expired verification code.' });
            }

            const { schoolID } = codeResult.rows[0]; // Retrieve associated school ID

            // Check if the tutor role exists
            let roleResult = await pool.query('SELECT roleID FROM Roles WHERE Role = $1', ['tutor']);
            let roleID;

            if (roleResult.rows.length > 0) {
                roleID = roleResult.rows[0].roleid;
            } else {
                // If the tutor role doesn't exist, create it
                const newRole = await pool.query('INSERT INTO Roles (Role) VALUES ($1) RETURNING roleID', ['tutor']);
                roleID = newRole.rows[0].roleid;
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert the new tutor into the Users table
            await pool.query(
                `INSERT INTO Users (Name, Email, UserPassword, roleID, schoolID) 
                VALUES ($1, $2, $3, $4, $5)`,
                [name, email, hashedPassword, roleID, schoolID]
            );

            // Mark the verification code as used
            await pool.query(`UPDATE VerificationCode SET used = TRUE WHERE code = $1`, [verificationCode]);

            res.status(201).json({ message: 'Tutor registered successfully.' });
        } catch (error) {
            console.error('Error during tutor registration:', error);
            res.status(500).json({ message: 'Internal server error.' });
        }
    });

    return router;
};
