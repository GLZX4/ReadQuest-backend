const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const {
    fetchCompletedRounds,
    getStudentLevel,
    fetchStreak,
    updateStreak
} = require('../services/studentService');
require('dotenv').config();

module.exports = (pool) => {
    const router = express.Router();

    router.get('/completed-rounds', verifyToken, (req, res) => fetchCompletedRounds(pool, req, res));
    router.get('/get-level', verifyToken, (req, res) => getStudentLevel(pool, req, res));
    router.get('/get-streak', verifyToken, (req, res) => fetchStreak(pool, req, res));
    router.post('/update-streak', verifyToken, (req, res) => updateStreak(pool, req, res));

    return router;
};
