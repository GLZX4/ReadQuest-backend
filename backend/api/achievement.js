const express = require('express');
require('dotenv').config();
const verifyToken = require('../middleware/authMiddleware');
const { updateAchievementProgress, fetchStudentAchievements } = require('../services/achievementService');

module.exports = (pool) => {
    const router = express.Router();

    // Update student achievement progress
    router.post('/update-progress', verifyToken, async (req, res) => {
        try {
            const result = await updateAchievementProgress(pool, req.body);
            res.status(200).json(result);
        } catch (error) {
            console.error('Error updating achievement progress:', error);
            res.status(error.statusCode || 500).json({ message: error.message || 'Internal server error' });
        }
    });

    // Fetch achievements for a student
    router.get('/fetch-achievements', verifyToken, async (req, res) => {
        try {
            const { studentId } = req.query;
            const result = await fetchStudentAchievements(pool, studentId);
            res.status(200).json(result);
        } catch (error) {
            console.error('Error fetching achievements:', error);
            res.status(error.statusCode || 500).json({ message: error.message || 'Internal server error' });
        }
    });

    return router;
};
