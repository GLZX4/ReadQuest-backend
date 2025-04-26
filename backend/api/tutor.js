// routes/tutor.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');
require('dotenv').config();

const router = express.Router();

module.exports = (pool) => {
    const mockTutorData = {
        classes: ['Class 1A', 'Class 2B'],
        students: [
            { id: 1, name: 'Student A', progress: 80 },
            { id: 2, name: 'Student B', progress: 90 },
        ],
    };

    router.get('/', (req, res) => {
        const availableRoutes = router.stack
            .filter(r => r.route) 
            .map(r => ({
                method: Object.keys(r.route.methods)[0].toUpperCase(),
                path: `/api/tutor${r.route.path}`
            }));
    
        res.json({
            message: "Available Tutor API Endpoints",
            endpoints: availableRoutes
        });
    });
    
    router.get('/fetch-Tutor-Data', verifyToken, async (req, res) => {
        const { userid } = req.query;
    
        if (!userid) {
            return res.status(400).json({ message: 'Tutor ID is required' });
        }
    
        try {
            const tutorData = await pool.query(
                `SELECT s.schoolCode 
                 FROM Users u 
                 JOIN Schools s ON u.schoolID = s.schoolID 
                 WHERE u.userID = $1`,
                [userid]
            );
    
            console.log('TutorData:', tutorData.rows);
    
            if (tutorData.rows.length === 0) {
                return res.status(404).json({ message: 'Tutor not found or school not assigned' });
            }
    
            res.json({ schoolCode: tutorData.rows[0].schoolcode }); // Send schoolCode in response
        } catch (error) {
            console.error('Error fetching tutor school code:', error);
            res.status(500).json({ message: 'Error fetching tutor school code' });
        }
    });
    

    router.get('/studentsList', verifyToken, async (req, res) => {
        const { tutorID } = req.query;

        console.log('Received request for studentsList:', tutorID);

        if (!tutorID) {
            return res.status(400).json({ message: 'Tutor ID is required' });
        }

        try {
            const students = await pool.query(
                `SELECT 
                    Users.UserID,
                    Users.Name, 
                    COUNT(DISTINCT RoundAssociation.RoundID) AS TotalRounds,
                    AVG(RoundAssociation.Score) AS AverageScore,
                    PerformanceMetrics.accuracyRate AS AccuracyRate,
                    PerformanceMetrics.completionRate AS CompletionRate,
                    MAX(RoundAssociation.completedAt) AS LastActive,
                    studentLevel.level AS Level,
                    studentLevel.xp AS XP
                    FROM Users
                    LEFT JOIN RoundAssociation ON Users.UserID = RoundAssociation.UserID
                    LEFT JOIN PerformanceMetrics ON Users.UserID = PerformanceMetrics.userID
                    LEFT JOIN studentLevel ON Users.UserID = studentLevel.userID
                    WHERE Users.SchoolID = (
                    SELECT SchoolID FROM Users WHERE Users.UserID = $1
                    )
                    AND Users.roleID != 2
                    GROUP BY 
                    Users.UserID, 
                    Users.Name, 
                    PerformanceMetrics.accuracyRate, 
                    PerformanceMetrics.completionRate,
                    studentLevel.level,
                    studentLevel.xp
                    ORDER BY TotalRounds DESC;
                `,
                [tutorID]
            );

            console.log('Query executed. Students result:', students.rows);

            if (students.rows.length === 0) {
                return res.status(404).json({ message: 'No students found for this tutor' });
            }

            res.json(students.rows);
        } catch (error) {
            console.error('Error fetching students:', error);
            res.status(500).json({ message: 'Error fetching students' });
        }
    });

  // Add a new question set
router.post('/add-Question-Set', verifyToken, async (req, res) => {
    console.log('Received request at /add-Question-Set');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { questions, questionType, tutorID, difficulty } = req.body;

    if (!questions || questions.length === 0) {
        return res.status(400).json({ message: 'No questions provided' });
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) { 
        return res.status(400).json({ message: 'Invalid difficulty level' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log("🔹 Transaction started");

        // Insert into questionbank
        const questionBankRes = await client.query(
            `INSERT INTO questionbank (name, createdat) VALUES ($1, NOW()) RETURNING qbankid`,
            [`${questionType} Set`]
        );
        const qbankid = questionBankRes.rows[0].qbankid;
        console.log(`Inserted question bank: ${qbankid}`);

        // Insert questions
        const questionInsertPromises = questions.map(async (q) => {
            return client.query(
                `INSERT INTO questions (qbankid, questiontext, questiontype, answeroptions, correctanswer, additionaldata) 
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING questionid`,
                [qbankid, q.questionText, q.questionType, JSON.stringify(q.answerOptions), JSON.stringify({ correct: q.correctAnswer }), JSON.stringify(q.additionalData || {})]

            );
        });

        const insertedQuestions = await Promise.all(questionInsertPromises);

        const roundRes = await client.query(
            `INSERT INTO rounds (userid, qbankid, status, difficultyLevel, createdat) 
            VALUES ($1, $2, 'incomplete', $3, NOW()) RETURNING roundid`, 
            [tutorID, qbankid, difficulty]
        );
        const roundid = roundRes.rows[0].roundid;
        console.log(`Inserted round: ${roundid}`);

        const roundAssociationPromises = insertedQuestions.map((qRes) => {
            return client.query(
                `INSERT INTO roundassociation (userid, roundid, status, completedat) 
                 VALUES ($1, $2, 'incomplete', NULL)`, 
                [tutorID, roundid]
            );
        });

        await Promise.all(roundAssociationPromises);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Question set and round added successfully', qbankid, roundid });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding question set:', error);
        res.status(500).json({ message: 'Error adding question set' });
    } finally {
        client.release();
        console.log("🔹 Connection released");
    }
});
    return router;
};
