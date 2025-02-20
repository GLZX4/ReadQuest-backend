// backend/api/student.js
const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
require('dotenv').config();

const router = express.Router();

module.exports = (pool) => {

    // Get all student rounds completed
    router.get('/completed-rounds', verifyToken, async (req, res) => {
        const { userID } = req.query;
    
        if (!userID) {
            console.log('userID is required for completed rounds');
            return res.status(400).json({ message: 'userID is required' });
        }
    
        try {
            const result = await pool.query(
                `SELECT 
                    associationid,
                    roundid, 
                    completedat, 
                    status, 
                    score 
                 FROM roundassociation
                 WHERE userid = $1 AND status = 'completed'
                 ORDER BY completedat DESC`,
                [userID]
            );
    
            res.status(200).json(result.rows);
        } catch (error) {
            console.error('Error fetching completed rounds:', error);
            res.status(500).json({ message: 'Error fetching completed rounds' });
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
}
