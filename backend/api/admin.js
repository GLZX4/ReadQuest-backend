const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const {
    fetchAdminData,
    createTutorVerificationCode,
    fetchSchools,
    addSchool
} = require('../services/adminService');

require('dotenv').config();

module.exports = (pool) => {
    const router = express.Router();

    // Admin Dashboard Data
    router.get('/fetchAdminData', verifyToken, async (req, res) => {
        try {
            const data = await fetchAdminData(pool);
            res.json(data);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            res.status(error.statusCode || 500).json({ message: error.message });
        }
    });

    // Submit tutor account verification code
    router.post('/tutorAccountCode', verifyToken, async (req, res) => {
        try {
            await createTutorVerificationCode(pool, req.body);
            res.status(201).json({ message: 'Verification Code submitted successfully.' });
        } catch (error) {
            console.error('Error generating tutor code:', error);
            res.status(error.statusCode || 500).json({ message: error.message });
        }
    });

    // Fetch all schools
    router.get('/schoolsFetch', verifyToken, async (req, res) => {
        try {
            const schools = await fetchSchools(pool);
            res.status(200).json(schools);
        } catch (error) {
            console.error('Error fetching schools:', error);
            res.status(error.statusCode || 500).json({ message: error.message });
        }
    });

    // Add new school
    router.post('/addSchool', verifyToken, async (req, res) => {
        try {
            await addSchool(pool, req.body);
            res.status(201).json({ message: 'School added successfully.' });
        } catch (error) {
            console.error('Error adding school:', error);
            res.status(error.statusCode || 500).json({ message: error.message });
        }
    });

    return router;
};
