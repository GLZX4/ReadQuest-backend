// routes/tutor.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');
require('dotenv').config();

const router = express.Router();

module.exports = (pool) => {
    // Mock tutor data
    const mockTutorData = {
        classes: ['Class 1A', 'Class 2B'],
        students: [
            { id: 1, name: 'Student A', progress: 80 },
            { id: 2, name: 'Student B', progress: 90 },
        ],
    };

    // Get tutor data
    router.get('/', (req, res) => {
        // In a real app, fetch this data from the database using the tutor's ID
        res.json(mockTutorData);
    });

    // fetch tutor Data(just schoolid for now)
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
    

    // Get student list for a tutor
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
                    COUNT(DISTINCT RoundAssociation.RoundID) AS TotalRounds, -- Total rounds completed by the student
                    AVG(RoundAssociation.Score) AS AverageScore, -- Average score from the completed rounds
                    PerformanceMetrics.accuracyRate AS AccuracyRate, -- Performance metric for accuracy
                    PerformanceMetrics.completionRate AS CompletionRate -- Performance metric for completion
                FROM Users
                LEFT JOIN RoundAssociation ON Users.UserID = RoundAssociation.UserID -- Link users with their completed rounds
                LEFT JOIN PerformanceMetrics ON Users.UserID = PerformanceMetrics.userID -- Link users with their performance metrics
                WHERE Users.SchoolID = (
                    SELECT SchoolID FROM Users WHERE Users.UserID = $1 -- Fetch schoolID based on tutorID
                )
                AND Users.roleID != 2 -- Exclude tutors
                GROUP BY 
                    Users.UserID, 
                    Users.Name, 
                    PerformanceMetrics.accuracyRate, 
                    PerformanceMetrics.completionRate
                ORDER BY TotalRounds DESC; -- Rank by rounds completed
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
    router.post('/add-Question-Set', async (req, res) => {
        console.log('Received request at /add-Question-Set');
        console.log('Request body:', req.body);
      
        try {
          const { questions, questionType } = req.body;
      
          if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ message: "Invalid question data" });
          }
      
          // Example: Saving questions (Assuming your DB schema uses `questionbank` for storing sets)
          const questionBankInsert = await pool.query(
            `INSERT INTO questionbank (name, createdat) VALUES ($1, NOW()) RETURNING qbankid`,
            [`${questionType} Set`]
          );
          const qbankid = questionBankInsert.rows[0].qbankid;
      
          // Insert each question
          for (const question of questions) {
            await pool.query(
              `INSERT INTO questions (qbankid, questiontext, questiontype, answeroptions, correctanswer) 
               VALUES ($1, $2, $3, $4, $5)`,
              [qbankid, question.questionText, question.questionType, JSON.stringify(question.answerOptions), question.correctAnswer]
            );
          }
      
          res.status(201).json({ message: "Question Set Published Successfully!" });
        } catch (error) {
          console.error("Error adding question set:", error);
          res.status(500).json({ message: "Internal server error" });
        }
      });
      

    return router;
};
