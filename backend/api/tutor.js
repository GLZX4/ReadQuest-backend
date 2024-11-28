// routes/tutor.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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
    return router;
}
