const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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
            // Check if school exists
            const schoolResult = await pool.query(
                'SELECT schoolID FROM Schools WHERE schoolCode = $1',
                [schoolCode]
            );
            if (schoolResult.rows.length === 0) {
                return res.status(400).json({ message: 'Invalid school code.' });
            }
            const schoolID = schoolResult.rows[0].schoolid;

            // Check if role exists
            let roleResult = await pool.query('SELECT roleID FROM Roles WHERE Role = $1', [role]);
            let roleID;

            if (roleResult.rows.length > 0) {
                roleID = roleResult.rows[0].roleid;
            } else {
                const newRole = await pool.query('INSERT INTO Roles (Role) VALUES ($1) RETURNING roleID', [role]);
                roleID = newRole.rows[0].roleid;
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
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
            const result = await pool.query(
                `SELECT u.*, r.Role 
                 FROM Users u
                 JOIN Roles r ON u.roleID = r.roleID
                 WHERE u.Email = $1`,
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }

            const user = result.rows[0];

            // Check password
            const passwordMatch = await bcrypt.compare(password, user.userpassword);
            if (!passwordMatch) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }

            // Generate JWT token
            const token = jwt.sign({ userId: user.userid, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ token, name: user.name });

            // Update login status
            await pool.query('UPDATE Users SET loggedIn = TRUE WHERE Email = $1', [email]);
        } catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({ message: 'Error logging in user.' });
        }
    });

    // Logout a user
    router.post('/logout', async (req, res) => {
        const { email } = req.body;

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


    return router;
};
