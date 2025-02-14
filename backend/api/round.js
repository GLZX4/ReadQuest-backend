const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
require('dotenv').config();

module.exports = (pool) => {
    const router = express.Router();

    // Select a round by difficulty and return roundID and qBankID
    router.get('/select-by-difficulty', verifyToken, async (req, res) => {
        const difficultyLevel = req.query.difficulty;
        console.log('recevied request for selecting round by difficulty:', difficultyLevel);
    
        if (!difficultyLevel) {
            return res.status(400).json({ message: 'difficultyLevel is required' });
        }
    
        try {
            const rounds = await pool.query(
                `SELECT roundID, qBankID, difficultyLevel, status
                 FROM Rounds
                 WHERE difficultyLevel = $1
                 AND status = 'incomplete'
                 LIMIT 1`,
                [difficultyLevel]
            );
    
            if (rounds.rows.length === 0) {
                return res.status(404).json({ message: 'No rounds found' });
            }
    
            res.json(rounds.rows[0]);
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
    
        if (!qBankID || questionIndex === undefined) {
            return res.status(400).json({ message: 'qBankID and questionIndex are required' });
        }
    
        try {
            const result = await pool.query(
                `SELECT questionID, questionText, questionType, answerOptions, correctAnswer, additionalData
                 FROM Questions
                 WHERE qBankID = $1
                 ORDER BY questionID
                 OFFSET $2 LIMIT 1`,
                [qBankID, questionIndex]
            );
            console.log('Question to return:', result.rows);
    
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
