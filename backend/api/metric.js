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
        console.log('variable type:', typeof userID);

        // Queries
        const checkQuery = `SELECT metricid FROM performancemetrics WHERE userid = $1::int`;
        const updateQuery = `
            UPDATE performancemetrics
            SET 
                totalroundsplayed = $2::int,
                averageanswertime = $3::numeric,
                accuracyrate = $4::numeric,
                attemptsperquestion = $5::numeric,
                completionrate = $6::numeric,
                difficultylevel = $7::varchar,
                lastupdated = NOW()
            WHERE metricid = $8::int
            RETURNING *;
        `;
        const insertQuery = `
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
                lastupdated = NOW()
            RETURNING *;
        `;

        try {
            const existing = await pool.query(checkQuery, [userID]);
 
            if (existing.rows.length > 0) {
                const updated = await pool.query(updateQuery, [
                    userID,
                    parseInt(metrics.totalRoundsPlayed || 0, 10),
                    parseFloat(metrics.averageAnswerTime || 0),
                    parseFloat(metrics.accuracyRate || 0),
                    parseFloat(metrics.attemptsPerQuestion || 0),
                    parseFloat(metrics.completionRate || 0),
                    newUserDifficulty || "medium",
                    existing.rows[0].metricid, // Use the existing metricid for update
                ]);
                res.status(200).json({ message: "✅ Metrics updated successfully", data: updated.rows[0] });
            } else {
                // Step 3: If not exists, insert a new row
                const inserted = await pool.query(insertQuery, [
                    userID,
                    parseInt(metrics.totalRoundsPlayed || 0, 10),
                    parseFloat(metrics.averageAnswerTime || 0),
                    parseFloat(metrics.accuracyRate || 0),
                    parseFloat(metrics.attemptsPerQuestion || 0),
                    parseFloat(metrics.completionRate || 0),
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