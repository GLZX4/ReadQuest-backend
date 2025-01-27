// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Authorization Header:', authHeader);
    console.log('Extracted Token:', token);
    console.log('JWT_SECRET:', JWT_SECRET);

    if (!token) {
        console.error('No token provided');
        return res.status(403).json({ message: 'No token provided, access denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Decoded Token:', decoded);
        req.user = decoded; // Attach decoded user information to the request
        next(); // Pass control to the next middleware/route handler
    } catch (error) {
        console.error('Token verification error:', error.message);
        res.status(401).json({ 
            message: 'Invalid or expired token', 
            error: error.message 
        });
    }
};

module.exports = verifyToken;
