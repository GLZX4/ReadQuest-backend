const express = require('express');
require('dotenv').config();

module.exports = (pool) => {
    const router = express.Router();

    // Select a round by difficulty and return roundID and qBankID
    router.get('/select-by-difficulty', async (req, res) => {
        const { difficulty } = req.query;

        if (typeof difficulty !== 'string') {
            return res.status(400).json({ message: 'Invalid difficulty parameter type' });
        }

        try {
            const rounds = await pool.query(
                'SELECT roundID, QBankID FROM Rounds WHERE DifficultyLevel = $1',
                [difficulty]
            );

            if (rounds.rows.length === 0) {
                return res.status(404).json({ message: 'No rounds found for this difficulty level' });
            }

            const selectedRound = rounds.rows[Math.floor(Math.random() * rounds.rows.length)];
            res.json(selectedRound);
        } catch (error) {
            console.error('Error fetching round:', error);
            res.status(500).json({ message: 'Error fetching round' });
        }
    });

    // Retrieve question bank by QBankID
    router.get('/retrieve-qBank', async (req, res) => {
        const { QBankID } = req.query;

        if (!QBankID) {
            return res.status(400).json({ message: 'QBankID is required' });
        }

        try {
            const questionBank = await pool.query('SELECT * FROM QuestionBank WHERE QBankID = $1', [QBankID]);

            if (questionBank.rows.length === 0) {
                return res.status(404).json({ message: 'No question bank found for this round' });
            }

            res.json(questionBank.rows); // Return all questions in the response
        } catch (error) {
            console.error('Error fetching question bank:', error);
            res.status(500).json({ message: 'Error fetching question bank' });
        }
    });

    // Get a specific question by QBankID and questionIndex
    router.get('/get-question', async (req, res) => {
        const { qBankID, questionIndex } = req.query;

        if (!qBankID || questionIndex === undefined) {
            return res.status(400).json({ message: 'qBankID and questionIndex are required' });
        }

        try {
            const questionIdx = parseInt(questionIndex, 10);

            const result = await pool.query(
                `SELECT * 
                 FROM QuestionBank 
                 WHERE QBankID = $1
                 ORDER BY QuestionID
                 OFFSET $2 LIMIT 1`,
                [qBankID, questionIdx]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Question not found' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error fetching question:', error);
            res.status(500).json({ message: 'Error fetching question' });
        }
    });

    // Route to validate an answer
    router.post('/validate-answer', async (req, res) => {
        const { questionID, selectedAnswer } = req.body;

        if (!questionID || !selectedAnswer) {
            return res.status(400).json({ message: 'questionID and selectedAnswer are required' });
        }

        try {
            const result = await pool.query(
                'SELECT CorrectAnswer FROM QuestionBank WHERE QuestionID = $1',
                [questionID]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Question not found' });
            }

            const correctAnswer = result.rows[0].correctanswer;
            const isCorrect = selectedAnswer === correctAnswer;

            res.json({
                isCorrect,
                correctAnswer, // Optionally include this if you want the frontend to display it
            });
        } catch (error) {
            console.error('Error validating answer:', error);
            res.status(500).json({ message: 'Error validating answer' });
        }
    });

    return router;
};
