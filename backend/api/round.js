const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
require('dotenv').config();

module.exports = (pool) => {
    const router = express.Router();

    // Select a round by difficulty and return roundID and qBankID
    router.get('/select-by-difficulty', verifyToken, async (req, res) => {
        const { difficulty } = req.query;
    
        console.log('Received request for difficulty:', difficulty); // Log the incoming difficulty
    
        if (typeof difficulty !== 'string') {
            console.error('Invalid difficulty parameter type:', typeof difficulty);
            return res.status(400).json({ message: 'Invalid difficulty parameter type' });
        }
    
        try {
            console.log('Executing query to fetch rounds with difficulty:', difficulty);
    
            const rounds = await pool.query(
                'SELECT roundID, QBankID FROM Rounds WHERE DifficultyLevel = $1',
                [difficulty]
            );
    
            console.log('Query executed. Rounds result:', rounds.rows);
    
            if (rounds.rows.length === 0) {
                console.warn('No rounds found for difficulty level:', difficulty);
                return res.status(404).json({ message: 'No rounds found for this difficulty level' });
            }
    
            const selectedRound = rounds.rows[Math.floor(Math.random() * rounds.rows.length)];
            console.log('Selected round:', selectedRound);
    
            res.json(selectedRound);
        } catch (error) {
            console.error('Error fetching round:', error);
            res.status(500).json({ message: 'Error fetching round' });
        }
    });
    

    // Retrieve question bank by QBankID
    router.get('/retrieve-qBank', verifyToken, async (req, res) => {
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
    router.get('/get-question', verifyToken, async (req, res) => {
        const { qBankID, questionIndex } = req.query;
    
        console.log('--- Debugging Hosted Backend: /get-question ---');
        console.log('Received qBankID:', qBankID);
        console.log('Received questionIndex:', questionIndex);
    
        if (!qBankID || questionIndex === undefined) {
            console.error('Missing required parameters: qBankID or questionIndex');
            return res.status(400).json({ message: 'qBankID and questionIndex are required' });
        }
    
        try {
            const questionIdx = parseInt(questionIndex, 10);
    
            console.log('Parsed questionIndex:', questionIdx);
            console.log('Executing SQL query with QBankID:', qBankID, 'and OFFSET:', questionIdx);
    
            const result = await pool.query(
                `SELECT * 
                 FROM QuestionBank 
                 WHERE QBankID = $1
                 ORDER BY QuestionID
                 OFFSET $2 LIMIT 1`,
                [qBankID, questionIdx]
            );
    
            console.log('SQL Query Result:', result.rows);
    
            if (result.rows.length === 0) {
                console.warn('No question found for QBankID:', qBankID, 'and questionIndex:', questionIndex);
                return res.status(404).json({ message: 'Question not found' });
            }
    
            const question = result.rows[0];
            const additionalData = question.additionaldata;
    
            console.log('Additional Data:', additionalData);
    
            res.json({
                ...question,
                additionaldata: additionalData,
            });
        } catch (error) {
            console.error('Error during SQL query execution:', error);
            res.status(500).json({ message: 'Error fetching question' });
        }
    });
    
    
    // Route to validate an answer
    router.post('/validate-answer', verifyToken, async (req, res) => {
        const { questionID, selectedAnswer } = req.body;
    
        if (!questionID || !selectedAnswer) {
            return res.status(400).json({ message: 'questionID and selectedAnswer are required' });
        }
    
        console.log('Validating answer:', selectedAnswer, 'for question:', questionID);
    
        try {
            const result = await pool.query(
                'SELECT QuestionType, CorrectAnswer FROM QuestionBank WHERE QuestionID = $1',
                [questionID]
            );
    
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Question not found' });
            }
    
            const { questiontype, correctanswer } = result.rows[0];
    
            console.log('Question Type:', questiontype);
            console.log('Correct Answer from DB:', correctanswer);
            console.log('User Selected Answer:', selectedAnswer);
    
            let isCorrect = false;
    
            switch (questiontype) {
                case 'multiple_choice':
                    isCorrect = selectedAnswer === correctanswer;
                    break;
    
                case 'drag_drop':
                    try {
                        const correctAnswerObj = JSON.parse(correctanswer);
                        const selectedAnswerObj = JSON.parse(selectedAnswer);
                        isCorrect = JSON.stringify(correctAnswerObj) === JSON.stringify(selectedAnswerObj);
                    } catch (error) {
                        console.error('Error parsing JSON for drag-drop answer:', error);
                        return res.status(400).json({ message: 'Invalid answer format for drag-drop' });
                    }
                    break;
    
                case 'sentence_reorder':
                    try {
                        const correctOrder = JSON.parse(correctanswer);
                        const selectedOrder = JSON.parse(selectedAnswer);
                        isCorrect = JSON.stringify(correctOrder) === JSON.stringify(selectedOrder);
                    } catch (error) {
                        console.error('Error parsing JSON for sentence reordering:', error);
                        return res.status(400).json({ message: 'Invalid answer format for sentence reorder' });
                    }
                    break;
    
                default:
                    return res.status(400).json({ message: 'Unsupported question type' });
            }
    
            console.log('Is Correct:', isCorrect);
            res.json({ isCorrect });
        } catch (error) {
            console.error('Error validating answer:', error);
            res.status(500).json({ message: 'Error validating answer' });
        }
    });
    

    return router;
};
