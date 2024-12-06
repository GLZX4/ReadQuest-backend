// backend/api/student.js
const express = require('express');
require('dotenv').config();

const router = express.Router();

module.exports = (pool) => {

    // Get all student rounds completed
    router.get('/completed-rounds', async (req, res) => {
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
            const studentAchievements = await pool.query(
                `SELECT * FROM studentAchievements WHERE userID = $1`,
                [studentId]
            );

            const achievements = await pool.query(
                `SELECT * FROM achievements`
            );

            const achievementDetailsMap = {};
            achievements.rows.forEach((achievement) => {
                achievementDetailsMap[achievement.achievementid] = achievement;
            });

            const combinedAchievements = studentAchievements.rows.map((studentAchievement) => {
                const achievementDetail = achievementDetailsMap[studentAchievement.achievementid];
                const progressValue = studentAchievement.progress?.roundsPlayed || 0;
                const unlockConditionValue = achievementDetail.unlockcondition?.value || 1; // Default to 1 to avoid division by 0

                const progressPercentage = Math.round((progressValue / unlockConditionValue) * 100);

                return {
                    ...studentAchievement,
                    ...achievementDetail,
                    progressPercentage: progressPercentage > 100 ? 100 : progressPercentage, // Do not change! capping at 100%
                };
            });

            res.status(200).json(combinedAchievements);
        } catch (error) {
            console.error('Error fetching achievements:', error);
            res.status(500).json({ message: 'Error fetching achievements' });
        }
    });


    return router;
}