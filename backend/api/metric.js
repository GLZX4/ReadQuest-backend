const express = require('express');
const { calculateMetrics, calculateDifficultyLevel } = require('../services/MetricsService');

const router = express.Router();

module.exports = (pool) => {
    function xpForNextLevel(level) {
        return Math.floor(100 + level * 20);
    }

    router.post('/process-metrics', async (req, res) => {
        const userID = Number(req.body.userID); 
        const metrics = calculateMetrics(req.body);
        const newUserDifficulty = String(calculateDifficultyLevel(metrics)); 

        const totalRoundsPlayed = Number.isInteger(metrics.totalRoundsPlayed) ? metrics.totalRoundsPlayed : 0;
        const averageAnswerTime = Number(metrics.averageAnswerTime) || 0;
        const accuracyRate = Number(metrics.accuracyRate) || 0;
        const attemptsPerQuestion = Number(metrics.attemptsPerQuestion) || 0;
        const completionRate = Number(metrics.completionRate) || 0;

        console.log({
            userID,
            totalRoundsPlayed,
            averageAnswerTime,
            accuracyRate,
            attemptsPerQuestion,
            completionRate,
            newUserDifficulty
        });

        const upsertQuery = `
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
            const result = await pool.query(upsertQuery, [
                userID,
                totalRoundsPlayed,
                averageAnswerTime,
                accuracyRate,
                attemptsPerQuestion,
                completionRate,
                newUserDifficulty,
            ]);

            const xpEarned = 30;
            const levelQuery = await pool.query('SELECT xp, level FROM studentLevel WHERE userID = $1', [userID]);

            if (levelQuery.rows.length === 0) {
                console.warn("No level data found for user:", userID);
                return res.status(400).json({ message: "No level data found." });
            }

            let { xp, level } = levelQuery.rows[0];
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
                message: "Metrics and XP updated successfully", 
                data: result.rows[0],
                xpAwarded: xpEarned,
                newXP: xp,
                newLevel: level
            });

        } catch (error) {
            console.error("Error processing metrics and XP:", error);
            res.status(500).json({ message: "Error processing metrics and XP" });
        }
    });

    return router;
};
