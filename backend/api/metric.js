const express = require('express');
const { calculateMetrics, calculateDifficultyLevel } = require('../services/MetricsService');

const router = express.Router();

module.exports = (pool) => {

    // Process metrics
    router.post('/process-metrics', async (req, res) => {
        console.log('Processing metrics:', req.body);

        try {
            // Step 1: Calculate Metrics
            const metrics = calculateMetrics(req.body);
            const newUserDifficulty = calculateDifficultyLevel(metrics);

            // Step 2: Store updated metrics in DB
            await pool.query(
                `UPDATE performanceMetrics 
                 SET accuracyrate = $1, averageanswertime = $2, totalattempts = $3, completionrate = $4, lastupdated = NOW()
                 WHERE userID = $5`,
                [metrics.accuracyRate, metrics.totalAnswerTime, metrics.totalAttempts, metrics.completionRate, req.body.userID]
            );

            res.status(200).json({ message: '✅ Metrics processed successfully', metrics, newUserDifficulty });

        } catch (error) {
            console.error('❌ Error processing metrics:', error);
            res.status(500).json({ message: 'Error processing metrics' });
        }
    });

    return router;
};