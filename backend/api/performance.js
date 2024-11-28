const express = require('express');
require('dotenv').config();

const { calculateDifficultyLevel } = require('../services/MetricsService');

module.exports = (pool) => {
    const router = express.Router();

    // Get performance metrics for round selection
    router.get('/students/get-difficulty', async (req, res) => {
        const { userID } = req.query;

        try {
            const result = await pool.query('SELECT * FROM PerformanceMetrics WHERE userID = $1', [userID]);
            const metrics = result.rows[0];

            if (!metrics) {
                return res.status(404).json({ message: 'Metrics not found for the specified user' });
            }

            const difficulty = calculateDifficultyLevel(metrics);
            res.json({ difficulty: String(difficulty) });
        } catch (error) {
            console.error('Error getting difficulty level:', error);
            res.status(500).json({ message: 'Error getting difficulty level' });
        }
    });

    // Get current performance metrics for a specific student
    router.get('/tutor/current-specific-metric/:userID', async (req, res) => {
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

    // Update performance metrics
    router.post('/students/update-metrics', async (req, res) => {
        console.log('Entered update metrics');
        const { accuracyRate, averageAnswerTime, attemptsPerQuestion, consistency, completionRate, userID } = req.body;

        if (
            accuracyRate < 0 || accuracyRate > 100 ||
            averageAnswerTime < 0 ||
            attemptsPerQuestion < 0 ||
            completionRate < 0 || completionRate > 100
        ) {
            return res.status(400).json({ message: 'Invalid performance metrics' });
        }

        try {
            // Calculate the new difficulty level
            const difficultyLevel = calculateDifficultyLevel({
                accuracyRate,
                averageAnswerTime,
                attemptsPerQuestion,
                consistency,
                completionRate,
            });

            // Update or insert performance metrics in the database
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
                    averageAnswerTime,
                    accuracyRate,
                    attemptsPerQuestion,
                    difficultyLevel,
                    consistency,
                    completionRate,
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
