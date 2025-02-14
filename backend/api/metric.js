// backend/api/metric.js
const express = require('express');
const { calculateMetrics, calculateDifficultyLevel } = require('../services/MetricsService');

const router = express.Router();

module.exports = (pool) => {

    // backend/api/metric.js
    router.post('/calculate-metrics', (req, res) => {
        console.log('Calculating metrics for:', req.query);
        try {
            const metrics = calculateMetrics(req.query);
            const newUserDifficulty = calculateDifficultyLevel(metrics);
            res.json({ metrics, newUserDifficulty });
        } catch (error) {
            console.error('Error calculating metrics:', error);
            res.status(500).json({ message: 'Error calculating metrics' });
        }
    });
    return router;
}
