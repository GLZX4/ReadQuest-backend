const express = require('express');
require('dotenv').config();
const verifyToken = require('../middleware/authMiddleware');

const { calculateDifficultyLevel, addDefaultMetrics } = require('../services/MetricsService');

module.exports = (pool) => {
    const router = express.Router();

    // Get performance metrics for round selection
    router.get('/students/get-difficulty', verifyToken, async (req, res) => {
        const { userID } = req.query;
        console.log('userID:', userID);

        try {
            const result = await pool.query('SELECT * FROM PerformanceMetrics WHERE userID = $1', [userID]);
            const metrics = result.rows[0];

            if (!metrics) {
                // Default difficulty level if no metrics exist
                const defaultDifficulty = 'medium';
                await addDefaultMetrics(pool, userID);
                return res.status(200).json({ difficulty: defaultDifficulty });
            }

            const difficulty = calculateDifficultyLevel(metrics);
            res.json({ difficulty: String(difficulty) });
        } catch (error) {
            console.error('Error getting difficulty level:', error);
            res.status(500).json({ message: 'Error getting difficulty level' });
        }
    });




    // Get current performance metrics for a specific student
    router.get('/tutor/current-specific-metric/:userID', verifyToken, async (req, res) => {
        const { userID } = req.params;

        try {
            const result = await pool.query('SELECT * FROM PerformanceMetrics WHERE userID = $1', [userID]);
            const metrics = result.rows[0];

            if (!metrics) {
                return res.status(404).json({ message: 'Metrics not found for the specified user' });
            }

            res.json(metrics);
        } catch (error) {
            console.error('Error getting performance metrics:', error);
            res.status(500).json({ message: 'Error getting performance metrics' });
        }
    });




    router.post('/students/update-metrics', verifyToken, async (req, res) => {
        console.log('Entered update metrics');
    
        const { accuracyRate, averageAnswerTime, attemptsPerQuestion, consistency, completionRate, userID } = req.body;
    
        const sanitizedCompletionRate = Math.min(Math.max(completionRate, 0), 100); // Clamp between 0 and 100
        const sanitizedAccuracyRate = Math.min(Math.max(accuracyRate, 0), 100); // Clamp between 0 and 100
        const sanitizedAverageAnswerTime = Math.max(averageAnswerTime, 0); // Minimum value of 0
    
        // Validation
        if (
            sanitizedAccuracyRate < 0 || sanitizedAccuracyRate > 100 ||
            sanitizedAverageAnswerTime < 0 ||
            attemptsPerQuestion < 0 ||
            sanitizedCompletionRate < 0 || sanitizedCompletionRate > 100
        ) {
            console.error('Invalid metrics received:', req.body);
            return res.status(400).json({ message: 'Invalid performance metrics' });
        }
    
        // Calculate the new difficulty level
        const difficultyLevel = calculateDifficultyLevel({
            accuracyRate: sanitizedAccuracyRate,
            averageAnswerTime: sanitizedAverageAnswerTime,
            attemptsPerQuestion,
            consistency,
            completionRate: sanitizedCompletionRate,
        });

        // Attempt to update or insert the metrics
        try {
            await pool.query(
                `INSERT INTO PerformanceMetrics (
                    userID, totalRoundsPlayed, averageAnswerTime, accuracyRate, 
                    attemptsPerQuestion, difficultyLevel, consistencyScore, 
                    completionRate, lastUpdated
                ) VALUES (
                    $1, 1, $2, $3, $4, $5, $6, $7, NOW()
                )
                ON CONFLICT (userID) DO UPDATE
                SET accuracyRate = $3,
                    averageAnswerTime = $2,
                    attemptsPerQuestion = $4,
                    difficultyLevel = $5,
                    consistencyScore = $6,
                    completionRate = $7,
                    totalRoundsPlayed = PerformanceMetrics.totalRoundsPlayed + 1,
                    lastUpdated = NOW()`,
                [
                    userID,
                    sanitizedAverageAnswerTime,
                    sanitizedAccuracyRate,
                    attemptsPerQuestion,
                    difficultyLevel,
                    consistency,
                    sanitizedCompletionRate,
                ]
            );
            res.status(200).json({ message: 'Metrics updated successfully' });
        } catch (error) {
            console.error('Error updating performance metrics:', error);
            res.status(500).json({ message: 'Error updating performance metrics' });
        }
    });
    
    return router;
};
