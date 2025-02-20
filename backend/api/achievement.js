const express = require('express');
require('dotenv').config();
const verifyToken = require('../middleware/authMiddleware');


module.exports = (pool) => {
    const router = express.Router();

    // Update progress for a student's achievements
    router.post('/update-progress', verifyToken, async (req, res) => {
        const { studentId, achievementType, progressUpdate } = req.body;

        if (!studentId || !achievementType || !progressUpdate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
    
        try {
            const achievementQuery = `SELECT achievementid FROM achievements WHERE achievementtype = $1`;
            const achievementResult = await pool.query(achievementQuery, [achievementType]);
    
            if (achievementResult.rows.length === 0) {
                return res.status(404).json({ message: 'Achievement type not found' });
            }
    
            const achievementId = achievementResult.rows[0].achievementid;
    
            const checkQuery = `SELECT * FROM student_achievements WHERE userid = $1 AND achievementid = $2`;
            const checkResult = await pool.query(checkQuery, [studentId, achievementId]);
    
            let isUnlocked = false;
            let progressData = checkResult.rows.length > 0 ? checkResult.rows[0].progress || {} : {};
    
            Object.keys(progressUpdate).forEach((key) => {
                progressData[key] = (progressData[key] || 0) + progressUpdate[key];
            });
    
            const progressPercentage = calculateProgress(progressData, achievementType);
            if (progressPercentage >= 100) {
                isUnlocked = true;
            }
    
            if (checkResult.rows.length > 0) {
                const updateQuery = `
                    UPDATE student_achievements 
                    SET progress = $1, isunlocked = $2, unlockedat = CASE WHEN $2 THEN NOW() ELSE NULL END
                    WHERE userid = $3 AND achievementid = $4
                    RETURNING *;
                `;
                const updated = await pool.query(updateQuery, [progressData, isUnlocked, studentId, achievementId]);
                res.status(200).json({ message: '✅ Achievement updated', data: updated.rows[0] });
            } else {
                const insertQuery = `
                    INSERT INTO student_achievements (userid, achievementid, progress, isunlocked, unlockedat)
                    VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN NOW() ELSE NULL END)
                    RETURNING *;
                `;
                const inserted = await pool.query(insertQuery, [studentId, achievementId, progressData, isUnlocked]);
                res.status(200).json({ message: '✅ Achievement added', data: inserted.rows[0] });
            }
        } catch (error) {
            console.error('❌ Error updating achievement progress:', error);
            res.status(500).json({ message: 'Error updating achievement progress' });
        }
    });

    
    // Fetch achievements for a specific student
    router.get('/fetch-achievements', async (req, res) => {
        const { studentId } = req.query;

        if (!studentId) {
            return res.status(400).json({ message: 'Student ID is required' });
        }

        try {
            const query = `
                SELECT 
                    a.achievementid, 
                    a.achievementtype, 
                    a.description,
                    COALESCE(sa.progress, '{}'::jsonb) AS progress, 
                    COALESCE(sa.isunlocked, false) AS isunlocked,
                    sa.unlockedat
                FROM achievements a
                LEFT JOIN student_achievements sa 
                ON a.achievementid = sa.achievementid AND sa.userid = $1
            `;

            const result = await pool.query(query, [studentId]);

            // Calculate progress percentage for each achievement
            const combinedAchievements = result.rows.map(achievement => ({
                achievementId: achievement.achievementid,
                type: achievement.achievementtype,
                description: achievement.description,
                progress: achievement.progress,
                isUnlocked: achievement.isunlocked,
                unlockedAt: achievement.unlockedat,
                progressPercentage: calculateProgress(achievement.progress, achievement.achievementtype),
            }));

            res.status(200).json(combinedAchievements);
        } catch (error) {
            console.error('❌ Error fetching achievements:', error);
            res.status(500).json({ message: 'Error fetching achievements' });
        }
    });

    /**
     * Calculates progress percentage for an achievement
     */
    function calculateProgress(progressData, achievementType) {
        let progressValue = 0;
        let unlockConditionValue = 1; // Default to avoid division by 0

        switch (achievementType) {
            case 'First Round Completed':
                progressValue = progressData.roundsCompleted || 0;
                unlockConditionValue = 1;
                break;
            case 'Perfect Score':
                progressValue = progressData.perfectRounds || 0;
                unlockConditionValue = 1;
                break;
            case 'Consistency Champ':
                progressValue = progressData.consecutiveDays || 0;
                unlockConditionValue = progressData.targetDays || 5;
                break;
            case 'Fast Learner':
                progressValue = progressData.fastRounds || 0;
                unlockConditionValue = 1;
                break;
            case 'Reading Streak':
                progressValue = progressData.consecutiveDays || 0;
                unlockConditionValue = progressData.targetDays || 7;
                break;
            case 'All Rounds Perfect':
                progressValue = progressData.perfectRounds || 0;
                unlockConditionValue = progressData.targetRounds || 10;
                break;
            case 'Play 10 Rounds':
                progressValue = progressData.roundsPlayed || 0;
                unlockConditionValue = 10;
                break;
            case 'Play 50 Rounds':
                progressValue = progressData.roundsPlayed || 0;
                unlockConditionValue = 50;
                break;
            case 'Play 100 Rounds':
                progressValue = progressData.roundsPlayed || 0;
                unlockConditionValue = 100;
                break;
            case 'Master Reader':
                progressValue = progressData.accuracyRate || 0;
                unlockConditionValue = 95; // 95% accuracy required
                break;
            default:
                break;
        }

        return Math.round((progressValue / unlockConditionValue) * 100);
    }
    



    return router;
};