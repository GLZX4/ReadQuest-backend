const express = require('express');
const { calculateMetrics, calculateDifficultyLevel } = require('../services/MetricsService');

const router = express.Router();

module.exports = (pool) => {

    // Process metrics
    router.post('/process-metrics', async (req, res) => {
        console.log('📊 Processing metrics:', req.body);

        const userID = parseInt(req.body.userID, 10); // Ensure userID is an integer
        const metrics = calculateMetrics(req.body);
        const newUserDifficulty = calculateDifficultyLevel(metrics);

        // Queries
        const checkQuery = `SELECT metricid FROM performancemetrics WHERE userid = $1`;
        const updateQuery = `
            UPDATE performancemetrics
            SET 
                totalroundsplayed = $2,
                averageanswertime = $3,
                accuracyrate = $4,
                attemptsperquestion = $5,
                completionrate = $6,
                difficultylevel = $7,
                lastupdated = NOW()
            WHERE metricid = $8
            RETURNING *;
        `;
        const insertQuery = `
            INSERT INTO performancemetrics (userid, totalroundsplayed, averageanswertime, accuracyrate, attemptsperquestion, completionrate, difficultylevel, lastupdated)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING *;
        `;

        try {
            // Step 1: Check if the user already has an entry
            const existing = await pool.query(checkQuery, [userID]);

            if (existing.rows.length > 0) {
                // Step 2: If exists, update the existing row
                const updated = await pool.query(updateQuery, [
                    userID,  // Now it's always an integer
                    metrics.totalRoundsPlayed || 0,
                    metrics.averageAnswerTime || 0,
                    metrics.accuracyRate || 0,
                    metrics.attemptsPerQuestion || 0,
                    metrics.completionRate || 0,
                    newUserDifficulty || "medium",
                    existing.rows[0].metricid, // Use the existing metricid for update
                ]);
                res.status(200).json({ message: "✅ Metrics updated successfully", data: updated.rows[0] });
            } else {
                // Step 3: If not exists, insert a new row
                const inserted = await pool.query(insertQuery, [
                    userID,  // Ensuring userID is an integer
                    metrics.totalRoundsPlayed || 0,
                    metrics.averageAnswerTime || 0,
                    metrics.accuracyRate || 0,
                    metrics.attemptsPerQuestion || 0,
                    metrics.completionRate || 0,
                    newUserDifficulty || "medium",
                ]);
                res.status(200).json({ message: "✅ Metrics inserted successfully", data: inserted.rows[0] });
            }
        } catch (error) {
            console.error("❌ Error processing metrics:", error);
            res.status(500).json({ message: "Error processing metrics" });
        }
    });

    return router;
};