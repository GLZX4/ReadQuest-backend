const app = require('./index'); // Import app from index.js
const PORT = process.env.PORT || 5000;

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
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

module.exports = app;