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
            // Fetch achievements for the student
            const studentAchievements = await pool.query(
                `SELECT * FROM achievements WHERE userID = $1`,
                [studentId]
            );
    
            // Combine and calculate progress
            const combinedAchievements = studentAchievements.rows.map((achievement) => {
                const progressData = achievement.progress || {}; // Progress stored as JSONB
                const isUnlocked = achievement.isunlocked;
                const unlockedAt = achievement.unlockedat;
                const progressPercentage = calculateProgress(progressData, achievement.achievementtype);
    
                return {
                    achievementId: achievement.achievementid,
                    type: achievement.achievementtype,
                    progress: progressData,
                    isUnlocked,
                    unlockedAt,
                    progressPercentage,
                };
            });
    
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
