const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const {
    selectRoundByDifficulty,
    retrieveQuestionBank,
    getQuestionByIndex,
    validateAnswer
} = require('../services/roundService');

require('dotenv').config();

module.exports = (pool) => {
    const router = express.Router();

    router.get('/select-by-difficulty', verifyToken, (req, res) => selectRoundByDifficulty(pool, req, res));
    router.get('/retrieve-qBank', verifyToken, (req, res) => retrieveQuestionBank(pool, req, res));
    router.get('/get-question', verifyToken, (req, res) => getQuestionByIndex(pool, req, res));
    router.post('/validate-answer', verifyToken, (req, res) => validateAnswer(pool, req, res));

    return router;
};
