// backend/api/student.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

module.exports = (pool) => {
    // Mock student data
    const mockStudentData = {
        progress: 75,
        tasks: [
            { id: 1, task: 'Complete Reading Task 1', status: 'completed' },
            { id: 2, task: 'Complete Reading Task 2', status: 'pending' },
        ],
    };

    // Get student data
    router.get('/', (req, res) => {
        res.json({ message: 'Student dashboard data' });
    });
    return router;
}

