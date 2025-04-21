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

router.get("/get-level", verifyToken, async (req, res) => {
    const { userID } = req.query;

    try {
        const result = await pool.query(
            `SELECT xp, level FROM studentLevel WHERE "userid" = $1`,
            [userID]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({ message: "Level data not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching level:", err);
        res.status(500).json({ message: "Error fetching level" });
    }
});


    
router.get("/get-streak", verifyToken, async (req, res) => {
    const { studentId } = req.query;

    if (!studentId) {
        console.warn("⚠️ Student ID is missing in request.");
        return res.status(400).json({ message: "Student ID is required" });
    }

    try {
        const result = await pool.query(
            "SELECT currentstreak, beststreak FROM streaks WHERE userid = $1",
            [studentId]
        );

        console.log("Query Result:", result.rows);

        if (result.rows.length === 0) {
            console.warn("No streak record found for studentId:", studentId);
            return res.status(200).json({ current: 0, best: 0 });
        }

        console.log("Streak data retrieved:", {
            current: result.rows[0].currentstreak,
            best: result.rows[0].beststreak
        });

        res.status(200).json({
            current: result.rows[0].currentstreak,
            best: result.rows[0].beststreak
        });

    } catch (error) {
        console.error("Error fetching streak:", error);
        res.status(500).json({ message: "Error fetching streak", error: error.message });
    }
});
    


router.post("/update-streak", verifyToken, async (req, res) => {
    const { studentId } = req.body;
    console.log('Entered update-streak for body: ', req.body);
    console.log('Entered update-streak for variable: ', studentId);
    if (!studentId) {
        return res.status(400).json({ message: "User ID is required" });
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    try {
        const result = await pool.query(
            "SELECT currentstreak, beststreak, lastactive FROM streaks WHERE userid = $1",
            [studentId]
        );

        if (result.rows.length === 0) {
            // First-time entry for this user
            await pool.query(
                "INSERT INTO streaks (userid, currentstreak, beststreak, lastactive) VALUES ($1, 1, 1, $2)",
                [studentId, today]
            );
            return res.status(200).json({ message: "Streak started!", currentStreak: 1, bestStreak: 1 });
        }

        const { currentstreak, beststreak, lastactive } = result.rows[0];
        const lastActiveDate = new Date(lastactive).toISOString().split("T")[0];

        let newStreak = 1;
        if (lastActiveDate === today) {
            return res.status(200).json({ message: " Already played today!", currentStreak: currentstreak, bestStreak: beststreak });
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split("T")[0];
        
        if (lastActiveDate === yesterdayString) {
            newStreak = currentstreak + 1;
        }

        const newBestStreak = Math.max(newStreak, beststreak);

        await pool.query(
            "UPDATE streaks SET currentstreak = $1, beststreak = $2, lastactive = $3 WHERE userid = $4",
            [newStreak, newBestStreak, today, studentId]
        );

        res.status(200).json({ message: "Streak updated!", currentStreak: newStreak, bestStreak: newBestStreak });

    } catch (error) {
        console.error("Error updating streak:", error);
        res.status(500).json({ message: "Error updating streak" });
    }
});

    return router;
}
