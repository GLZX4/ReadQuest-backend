const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const {
    listAvailableTutorRoutes,
    fetchTutorData,
    fetchStudentsList,
    addQuestionSet
} = require('../services/tutorService');
require('dotenv').config();

module.exports = (pool) => {
    const router = express.Router();

    router.get('/', (req, res) => listAvailableTutorRoutes(router));
    router.get('/fetch-Tutor-Data', verifyToken, (req, res) => fetchTutorData(pool, req, res));
    router.get('/studentsList', verifyToken, (req, res) => fetchStudentsList(pool, req, res));
    router.post('/add-Question-Set', verifyToken, (req, res) => addQuestionSet(pool, req, res));

    return router;
};
