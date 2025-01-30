// server.js
const express = require('express');
const cors = require('cors');
const bodyparser = require('body-parser');
const pool = require('./middleware/dbConfig.js');
const authRoutes = require('./api/auth');
const studentRoutes = require('./api/student');
const tutorRoutes = require('./api/tutor');
const adminRoutes = require('./api/admin');
const performanceRoutes = require('./api/performance');
const roundRoutes = require('./api/round');
const metricRoutes = require('./api/metric');
const achievementRoutes = require('./api/achievement.js');

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(bodyparser.json());
app.use(express.json());

// Routes
app.use('/api/student', studentRoutes(pool));
app.use('/api/tutor', tutorRoutes(pool));
app.use('/api/admin', adminRoutes(pool));
app.use('/api/auth', authRoutes(pool));
app.use('/api/performance', performanceRoutes(pool));
app.use('/api/round', roundRoutes(pool));
app.use('/api/metric', metricRoutes(pool));
app.use('/api/achievement', achievementRoutes(pool));


// Fallback route for 404 errors
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found.' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error.' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
