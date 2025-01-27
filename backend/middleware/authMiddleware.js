// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        console.error('No Authorization header provided');
        return res.status(403).json({ message: 'No token provided, access denied' });
    }

    const token = authHeader.split(' ')[1]; // Extract token after 'Bearer '

    try {
        // Direct verification of the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach decoded token data to the request
        console.log('Decoded Token:', decoded);
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message, 'Token:', token);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = verifyToken;

