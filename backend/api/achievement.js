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
    



    return router;
};