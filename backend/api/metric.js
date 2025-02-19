const express = require('express');
const { calculateMetrics, calculateDifficultyLevel } = require('../services/MetricsService');

const router = express.Router();

module.exports = (pool) => {

    // Process metrics
    router.post('/process-metrics', async (req, res) => {
        console.log('📊 Processing metrics:', req.body);

        try {
            const metrics = calculateMetrics(req.body);
            const newUserDifficulty = calculateDifficultyLevel(metrics);
           
            const query = `
            WITH existing AS (
                SELECT metricid FROM performancemetrics WHERE userid = $1
            )
            UPDATE performancemetrics
            SET 
                totalroundsplayed = $2,
                averageanswertime = $3,
                accuracyrate = $4,
                attemptsperquestion = $5,
                completionrate = $6,
                difficultylevel = $7,
                lastupdated = NOW()
            WHERE metricid = (SELECT metricid FROM existing)
            RETURNING *;
        
            INSERT INTO performancemetrics (userid, totalroundsplayed, averageanswertime, accuracyrate, attemptsperquestion, completionrate, difficultylevel, lastupdated)
            SELECT $1, $2, $3, $4, $5, $6, $7, NOW()
            WHERE NOT EXISTS (SELECT 1 FROM existing);
        `;
        
        await pool.query(query, [
            req.body.userID,
            metrics.totalRoundsPlayed || 0,
            metrics.averageAnswerTime || 0,
            metrics.accuracyRate || 0,
            metrics.attemptsPerQuestion || 0,
            metrics.completionRate || 0,
            newUserDifficulty || "medium",
        ]);
        
            res.status(200).json({ message: '✅ Metrics processed successfully', metrics, newUserDifficulty });
        } catch (error) {
            console.error('❌ Error processing metrics:', error);
            res.status(500).json({ message: 'Error processing metrics' });
        }
    });

    return router;
};