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
        console.log('🏆 Fetching achievements for student:', studentId);

        if (!studentId) {
            return res.status(400).json({ message: 'Student ID is required' });
        }

        try {
            // Fetch all achievements, along with student-specific progress
            const query = `
                SELECT 
                    a.achievementid, 
                    a.achievementtype, 
                    a.description, 
                    sa.progress, 
                    COALESCE(sa.isunlocked, FALSE) AS isunlocked, 
                    sa.unlockedat
                FROM achievements a
                LEFT JOIN student_achievements sa 
                    ON a.achievementid = sa.achievementid AND sa.userid = $1
            `;

            const { rows } = await pool.query(query, [studentId]);

            // Process data
            const combinedAchievements = rows.map(achievement => {
                const progressData = achievement.progress || {}; // Handle NULL progress
                const progressPercentage = calculateProgress(progressData, achievement.achievementtype);

                return {
                    achievementId: achievement.achievementid,
                    type: achievement.achievementtype,
                    description: achievement.description,
                    progress: progressData,
                    isUnlocked: achievement.isunlocked,
                    unlockedAt: achievement.unlockedat,
                    progressPercentage,
                };
            });

            console.log('🏆 Fetched achievements:', combinedAchievements);

            res.status(200).json(combinedAchievements);
        } catch (error) {
            console.error('Error fetching achievements:', error);
            res.status(500).json({ message: 'Error fetching achievements' });
        }
    });


    
    /**
     * Helper function to calculate progress percentage
     * @param {Object} progressData - JSONB progress data from the database
     * @param {String} achievementType - Achievement type to determine unlock conditions
     * @returns {Number} Progress percentage (0-100)
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
                unlockConditionValue = progressData.targetDays || 5; // Defined in progress JSON
                break;
            case 'Fast Learner':
                progressValue = progressData.fastRounds || 0;
                unlockConditionValue = 1;
                break;
            case 'Reading Streak':
                progressValue = progressData.consecutiveDays || 0;
                unlockConditionValue = progressData.targetDays || 7; // Defined in progress JSON
                break;
            case 'All Rounds Perfect':
                progressValue = progressData.perfectRounds || 0;
                unlockConditionValue = progressData.targetRounds || 10; // Defined in progress JSON
                break;
            default:
                break;
        }
    
        // Calculate percentage and cap at 100%
        return Math.round((progressValue / unlockConditionValue) * 100);
    }
    


    return router;
}
