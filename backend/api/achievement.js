const express = require('express');
require('dotenv').config();
const verifyToken = require('../middleware/authMiddleware');


module.exports = (pool) => {
    const router = express.Router();

    // Update progress for a student's achievements
    router.post('/update-progress', verifyToken, async (req, res) => {
        const { userID, achievementType, progressUpdate } = req.body;
    
        if (!userID || !achievementType || !progressUpdate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
    
        try {
            await pool.query(
                `UPDATE Achievements
                 SET progress = jsonb_set(progress, '{progress}', progress->>'progress'::INT + $1::INT),
                     isUnlocked = (progress->>'progress')::INT + $1 >= progress->>'target'::INT
                 WHERE userID = $2 AND achievementType = $3`,
                [progressUpdate, userID, achievementType]
            );
    
            res.status(200).json({ message: 'Progress updated successfully' });
        } catch (error) {
            console.error('Error updating progress:', error);
            res.status(500).json({ message: 'Error updating progress' });
        }
    });
    



    return router;
};