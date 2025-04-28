const express = require('express');
const { calculateMetrics, calculateDifficultyLevel } = require('../services/MetricsService');

const router = express.Router();

module.exports = (pool) => {
    function xpForNextLevel(level) {
        return Math.floor(100 + level * 20);
    }

    router.post('/process-metrics', async (req, res) => {

        if (!req.body.userID) {
            console.log('userID is required');
            return res.status(400).json({ message: 'userID is required' });
        }

        const userID = Number(req.body.userID); 
        const rawStats = req.body;
        const metrics = calculateMetrics(rawStats); 
        const newUserDifficulty = String(calculateDifficultyLevel(metrics)); 

        const totalRoundsPlayed = Number(rawStats.roundsPlayed) || 0;
        const averageAnswerTime = Number(metrics.averageAnswerTime) || 0;
        const accuracyRate = Number(metrics.accuracyRate) || 0;
        const attemptsPerQuestion = Number(metrics.attemptsPerQuestion) || 0;
        const completionRate = Number(rawStats.completionRate) || 0;
        

        console.log({
            "receivedMetrics": metrics,
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

            
            let baseXP = 20;
            let timeFactor = Math.max(0, 100 - averageAnswerTime); // up to 100 points
            let accuracyFactor = accuracyRate * 0.4;                // up to 40 points
            let completionFactor = completionRate * 0.3;            // up to 30 points

            let rawXP = baseXP + timeFactor + accuracyFactor + completionFactor;
            let xpEarned = Math.floor(Math.min(rawXP, 100)); // Cap XP to prevent abuse
            console.log(`XP Breakdown: base=${baseXP}, time=${timeFactor}, accuracy=${accuracyFactor}, completion=${completionFactor}, total=${xpEarned}`);

            const levelQuery = await pool.query('SELECT xp, level FROM studentLevel WHERE userId = $1', [userID]);

            if (levelQuery.rows.length === 0) {
                console.warn("No level data found for user:", userID);
            
                await pool.query(
                    `INSERT INTO studentLevel (userId, xp, level, lastUpdated) VALUES ($1, $2, $3, NOW())`,
                    [userID, 0, 1]
                );
            
                const newLevelQuery = await pool.query('SELECT xp, level FROM studentLevel WHERE userId = $1', [userID]);
                if (newLevelQuery.rows.length === 0) {
                    console.error("Failed to create studentLevel entry for user:", userID);
                    return res.status(500).json({ message: "Failed to initialize level system." });
                }
            
                levelQuery.rows = newLevelQuery.rows;
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
