const express = require('express');
require('dotenv').config();
const verifyToken = require('../middleware/authMiddleware');


module.exports = (pool) => {
    const router = express.Router();

    // Update progress for a student's achievements
    router.post('/update-progress', verifyToken, async (req, res) => {
        const { studentId, metric, value } = req.body;

        if (!studentId || !metric || value === undefined) {
            console.error('Invalid input: Student ID, metric, and value are required');
            return res.status(400).json({ message: 'Student ID, metric, and value are required' });
        }

        try {
            console.log('Fetching achievements for student ID:', studentId);
            
            // Fetch achievements for the student that are not yet unlocked
            const achievements = await pool.query(
                `SELECT sa.studentAchievementID, sa.progress, a.unlockCriteria, a.achievementID
                FROM studentAchievements sa
                JOIN achievements a ON sa.achievementID = a.achievementID
                WHERE sa.userID = $1 AND sa.isUnlocked = false`,
                [studentId]
            );

            console.log('Achievements fetched:', achievements.rows);

            if (achievements.rows.length === 0) {
                console.log('No achievements to update for student ID:', studentId);
                return res.status(200).json({ message: 'No achievements to update' });
            }

            const updates = [];

            for (const achievement of achievements.rows) {
                const { studentAchievementID, progress, unlockcriteria } = achievement;

                console.log(`Processing achievement ID: ${achievement.achievementID}`);
                console.log('Current progress:', progress);

                // Parse the progress JSON
                let currentProgress = progress || {}; // Default to an empty object if null
                if (!currentProgress[metric]) currentProgress[metric] = 0; // Initialize metric if not present

                console.log(`Current progress for metric "${metric}":`, currentProgress[metric]);

                // Update the specific metric
                currentProgress[metric] += value;
                console.log(`Updated progress for metric "${metric}":`, currentProgress[metric]);

                // Check if the achievement is now unlocked
                const totalProgress = Object.values(currentProgress).reduce((acc, curr) => acc + curr, 0);
                console.log('Total progress:', totalProgress);
                console.log('Unlock criteria:', unlockcriteria);

                const isUnlocked = totalProgress >= unlockcriteria;
                console.log(`Achievement unlocked status: ${isUnlocked}`);

                // Prepare update queries
                updates.push(pool.query(
                    `UPDATE studentAchievements
                    SET progress = $1, isUnlocked = $2
                    WHERE studentAchievementID = $3`,
                    [JSON.stringify(currentProgress), isUnlocked, studentAchievementID]
                ));
            }

            console.log('Executing update queries...');
            // Perform all updates
            await Promise.all(updates);

            console.log('Progress updated successfully for student ID:', studentId);
            res.status(200).json({ message: 'Progress updated successfully' });
        } catch (error) {
            console.error('Error updating progress:', error);
            res.status(500).json({ message: 'Error updating progress' });
        }
    });



    return router;
};