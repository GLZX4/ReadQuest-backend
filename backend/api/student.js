// backend/api/student.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

module.exports = (pool) => {

    // Get all student rounds completed
    router.get('/completed-rounds', async (req, res) => {
        const { userID } = req.query;
    
        if (!userID) {
            console.log('userID is required for completed rounds');
            return res.status(400).json({ message: 'userID is required' });
        }
    
        try {
            const result = await pool.query(
                `SELECT 
                    associationid,
                    roundid, 
                    completedat, 
                    status, 
                    score 
                 FROM roundassociation
                 WHERE userid = $1 AND status = 'completed'
                 ORDER BY completedat DESC`,
                [userID]
            );
    
            res.status(200).json(result.rows);
        } catch (error) {
            console.error('Error fetching completed rounds:', error);
            res.status(500).json({ message: 'Error fetching completed rounds' });
        }
    });
    

    return router;
}