const express = require('express');
const { calculateMetrics, calculateDifficultyLevel } = require('../services/MetricsService');

const router = express.Router();

module.exports = (pool) => {
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

    const checkQuery = `SELECT metricid FROM performancemetrics WHERE userid = $1`;
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
        res.status(200).json({ message: "Metrics processed successfully", data: result.rows[0] });
    } catch (error) {
        console.error("Error processing metrics:", error);
        res.status(500).json({ message: "Error processing metrics" });
    }
});

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

            const checkQuery = `SELECT metricid FROM performancemetrics WHERE userid = $1`;
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
                res.status(200).json({ message: "Metrics processed successfully", data: result.rows[0] });
            } catch (error) {
                console.error("Error processing metrics:", error);
                res.status(500).json({ message: "Error processing metrics" });
            }
        });



    return router;
};