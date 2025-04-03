const express = require('express');
require('dotenv').config();
const verifyToken = require('../middleware/authMiddleware');

const { calculateDifficultyLevel, addDefaultMetrics } = require('../services/MetricsService');

module.exports = (pool) => {
    const router = express.Router();

    function xpForNextLevel(level) {
        return Math.floor(100 + level * 20); 
    }

    // Get performance metrics for round selection
    router.get('/students/get-difficulty', verifyToken, async (req, res) => {
        const { userID } = req.query;
        console.log('userID:', userID);
    
        try {
            const result = await pool.query('SELECT * FROM PerformanceMetrics WHERE userID = $1', [userID]);
            let metrics = result.rows[0];
    
            if (!metrics) {
                const defaultDifficulty = 'medium';
                await addDefaultMetrics(pool, userID);
                return res.status(200).json({ difficulty: defaultDifficulty });
            }
    
            console.log('Calculating difficulty for current metrics: ', metrics);
    
            const sanitizedMetrics = {
                accuracyRate: Number(metrics.accuracyrate) || 0,
                averageAnswerTime: Number(metrics.averageanswertime) || 0,
                attemptsPerQuestion: Number(metrics.attemptsperquestion) || 0,
                completionRate: Number(metrics.completionrate) || 0,
            };
    
            console.log('Sanitized Metrics:', sanitizedMetrics);
    
            const difficulty = calculateDifficultyLevel(sanitizedMetrics);
            console.log('Difficulty level calculated:', difficulty);
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


    router.post('/update-metrics', verifyToken, async (req, res) => {
        const { userID, averageAnswerTime, accuracyRate, completionRate } = req.body;

        if (!userID) {
            return res.status(400).json({ message: 'userID is required' });
        }

        try {
            await pool.query(
                `INSERT INTO PerformanceMetrics (userID, totalRoundsPlayed, averageAnswerTime, accuracyRate, completionRate, lastUpdated)
                VALUES ($1, 1, $2, $3, $4, CURRENT_TIMESTAMP)
                ON CONFLICT (userID)
                DO UPDATE SET
                    totalRoundsPlayed = PerformanceMetrics.totalRoundsPlayed + 1,
                    averageAnswerTime = $2,
                    accuracyRate = $3,
                    completionRate = $4,
                    lastUpdated = CURRENT_TIMESTAMP`,
                [userID, averageAnswerTime, accuracyRate, completionRate]
            );

            const xpEarned = Math.round((accuracyRate / 100) * 40 + completionRate * 0.1);

            const levelData = await pool.query('SELECT xp, level FROM studentLevel WHERE userID = $1', [userID]);

            if (levelData.rows.length === 0) {
                console.warn("No level data found for user:", userID);
                return res.status(400).json({ message: "No level data found." });
            }

            let { xp, level } = levelData.rows[0];
            xp += xpEarned;

            while (xp >= xpForNextLevel(level)) {
                xp -= xpForNextLevel(level);
                level++;
            }

            await pool.query(
                `UPDATE studentLevel SET xp = $1, level = $2, lastUpdated = NOW() WHERE userID = $3`,
                [xp, level, userID]
            );

            res.status(200).json({
                message: 'Metrics and level updated successfully',
                newXP: xp,
                newLevel: level
            });
                    } catch (error) {
            console.error('Error updating metrics:', error);
            res.status(500).json({ message: 'Error updating metrics' });
        }
    });

    
    
    return router;
};
