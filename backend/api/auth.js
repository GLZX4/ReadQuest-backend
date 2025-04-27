const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const {
    registerUser,
    loginUser,
    logoutUser,
    registerAdmin,
    registerTutor
} = require('../services/authService');

require('dotenv').config();

module.exports = (pool) => {
    const router = express.Router();

    // Register user
    router.post('/register', async (req, res) => {
        try {
            await registerUser(pool, req.body);
            res.status(201).json({ message: 'User registered and level initialized successfully.' });
        } catch (error) {
            console.error('Error registering user:', error);
            res.status(error.statusCode || 500).json({ message: error.message });
        }
    });

    // Login user
    router.post('/login', async (req, res) => {
        try {
            const loginResponse = await loginUser(pool, req.body);
            res.json(loginResponse);
        } catch (error) {
            console.error('Error logging in user:', error);
            res.status(error.statusCode || 500).json({ message: error.message });
        }
    });

    // Logout user
    router.post('/logout', async (req, res) => {
        try {
            await logoutUser(pool, req.body.email);
            res.json({ message: 'User logged out successfully.' });
        } catch (error) {
            console.error('Error logging out user:', error);
            res.status(error.statusCode || 500).json({ message: error.message });
        }
    });

    // Register Admin
    router.post('/register-admin', async (req, res) => {
        try {
            await registerAdmin(pool, req.body);
            res.status(201).json({ message: 'Admin registered successfully.' });
        } catch (error) {
            console.error('Error registering admin:', error);
            res.status(error.statusCode || 500).json({ message: error.message });
        }
    });

    // Register Tutor
    router.post('/register-tutor', async (req, res) => {
        try {
            await registerTutor(pool, req.body);
            res.status(201).json({ message: 'Tutor registered successfully.' });
        } catch (error) {
            console.error('Error registering tutor:', error);
            res.status(error.statusCode || 500).json({ message: error.message });
        }
    });

    return router;
};
