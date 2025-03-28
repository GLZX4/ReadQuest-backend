//server.js

const app = require('./index'); 
const PORT = process.env.PORT || 5000;


app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found.' });
});


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error.' });
});



if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

module.exports = app;