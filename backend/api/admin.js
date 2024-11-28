const express = require('express');
require('dotenv').config();

module.exports = (pool) => {
    const router = express.Router();

    // Mock admin data
    const AdminData = {
        totalUsers: 0,
        activeUsers: 0,
        systemStatus: '',
    };

    // Get admin data
    router.get('/fetchAdminData', async (req, res) => {
        try {
            // Fetch active users count
            const activeUsersResult = await pool.query('SELECT COUNT(*) AS activeUsersCount FROM Users WHERE loggedIn = TRUE');
            AdminData.activeUsers = activeUsersResult.rows[0].activeuserscount;

            // Fetch total users count
            const totalUsersResult = await pool.query('SELECT COUNT(*) AS totalUsersCount FROM Users');
            AdminData.totalUsers = totalUsersResult.rows[0].totaluserscount;

            // Check system status
            AdminData.systemStatus = 'All systems operational'; // Assuming connection is working if this route is hit

            console.log('AdminData:', AdminData); // Debugging log
            res.json(AdminData);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            res.status(500).json({ message: 'Error fetching admin data' });
        }
    });

    // Tutor account code generation submission
    router.post('/tutorAccountCode', async (req, res) => {
        const { verificationCode, schoolID, expirationAt, used = false, createdAt = new Date() } = req.body;

        try {
            // Check the last generated time for the school
            const lastGenResult = await pool.query(
                'SELECT MAX(createdAt) AS lastGeneratedAt FROM VerificationCode WHERE schoolID = $1',
                [schoolID]
            );
            const lastGenDate = lastGenResult.rows[0].lastgeneratedat;

            if (lastGenDate) {
                const currentTime = new Date();
                const diffMinutes = (currentTime - new Date(lastGenDate)) / (1000 * 60);

                if (diffMinutes < 30) {
                    return res.status(429).json({ message: 'You can only generate a new code every 30 minutes.' });
                }
            }

            // Insert new verification code
            await pool.query(
                `INSERT INTO VerificationCode (code, schoolID, expirationAt, used, createdAt) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [verificationCode, schoolID, expirationAt, used, createdAt]
            );
            res.status(201).json({ message: 'Verification Code submitted successfully.' });
        } catch (error) {
            console.error('Error during code generation:', error);
            res.status(500).json({ message: 'Error generating code' });
        }
    });

    // Fetch schools endpoint
    router.get('/schoolsFetch', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM Schools');
            console.log('Fetched Schools:', result.rows); // Debugging log
            res.status(200).json(result.rows);
        } catch (error) {
            console.error('Error fetching schools:', error);
            res.status(500).json({ message: 'Error fetching schools' });
        }
    });

    // Add a school endpoint
    router.post('/addSchool', async (req, res) => {
        const { schoolName, schoolCode, address, contactEmail, contactPhone } = req.body;

        if (!schoolName || !schoolCode || !address || !contactEmail || !contactPhone) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        try {
            await pool.query(
                `INSERT INTO Schools (schoolName, schoolCode, address, contactEmail, contactPhone)
                 VALUES ($1, $2, $3, $4, $5)`,
                [schoolName, schoolCode, address, contactEmail, contactPhone]
            );
            res.status(201).json({ message: 'School added successfully.' });
        } catch (error) {
            console.error('Error during school addition:', error);
            res.status(500).json({ message: 'Error adding school' });
        }
    });

    return router;
};
