const express = require('express');
const { calculateMetrics, calculateDifficultyLevel } = require('../services/MetricsService');

const router = express.Router();

module.exports = (pool) => {

    // Process metrics
    router.post('/process-metrics', async (req, res) => {
        console.log('📊 Processing metrics:', req.body);

        try {
            // Step 1: Calculate Metrics
            const metrics = calculateMetrics(req.body);
            const newUserDifficulty = calculateDifficultyLevel(metrics);

            // Step 2: Store updated metrics in DB
            const query = `
                INSERT INTO performancemetrics (userid, totalroundsplayed, averageanswertime, accuracyrate, attemptsperquestion, completionrate, difficultylevel, lastupdated)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (userid) 
                DO UPDATE SET 
                    totalroundsplayed = EXCLUDED.totalroundsplayed,
                    averageanswertime = EXCLUDED.averageanswertime,
                    accuracyrate = EXCLUDED.accuracyrate,
                    attemptsperquestion = EXCLUDED.attemptsperquestion,
                    completionrate = EXCLUDED.completionrate,
                    difficultylevel = EXCLUDED.difficultylevel,
                    lastupdated = NOW();
            `;

            await pool.query(query, [
                req.body.userID,
                metrics.totalRoundsPlayed || 0,
                metrics.averageAnswerTime || 0,
                metrics.accuracyRate || 0,
                metrics.attemptsPerQuestion || 0,
                metrics.completionRate || 0,
                newUserDifficulty || "medium", // Default difficulty if none is assigned
            ]);

            res.status(200).json({ message: '✅ Metrics processed successfully', metrics, newUserDifficulty });

        } catch (error) {
            console.error('❌ Error processing metrics:', error);
            res.status(500).json({ message: 'Error processing metrics' });
        }
    });

    return router;
};