const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

async function registerUser(pool, body) {
    const { name, email, password, role, schoolCode } = body;

    if (!name || !email || !password || !role || !schoolCode) {
        const error = new Error('All fields are required.');
        error.statusCode = 400;
        throw error;
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const schoolResult = await client.query('SELECT schoolid FROM Schools WHERE schoolcode = $1', [schoolCode]);
        if (schoolResult.rows.length === 0) {
            await client.query('ROLLBACK');
            const error = new Error('Invalid school code.');
            error.statusCode = 400;
            throw error;
        }

        const schoolID = schoolResult.rows[0].schoolid;

        const roleResult = await client.query('SELECT roleID FROM role WHERE Role = $1', [role]);
        const roleID = roleResult.rows.length
            ? roleResult.rows[0].roleid
            : (await client.query('INSERT INTO role (Role) VALUES ($1) RETURNING roleID', [role])).rows[0].roleid;

        const hashedPassword = await bcrypt.hash(password, 10);

        const userInsert = await client.query(
            `INSERT INTO Users (Name, Email, password, roleID, schoolID) 
             VALUES ($1, $2, $3, $4, $5) RETURNING userID`,
            [name, email, hashedPassword, roleID, schoolID]
        );

        const newUserID = userInsert.rows[0].userid;

        await client.query(`INSERT INTO student_level (userID, xp, level) VALUES ($1, $2, $3)`, [newUserID, 0, 1]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function loginUser(pool, body) {
    const { email, password } = body;

    if (!email || !password) {
        const error = new Error('Email and password are required.');
        error.statusCode = 400;
        throw error;
    }

    const result = await pool.query(
        `SELECT u.*, r.role AS role_name
         FROM users u
         JOIN role r ON u.roleid = r.roleid
         WHERE u.email = $1`,
        [email]
    );

    if (result.rows.length === 0) {
        const error = new Error('Invalid email or password.');
        error.statusCode = 401;
        throw error;
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
        const error = new Error('Invalid email or password.');
        error.statusCode = 401;
        throw error;
    }

    const token = jwt.sign({ userId: user.userid, role: user.role_name }, JWT_SECRET, { expiresIn: '1h' });

    await pool.query('UPDATE users SET loggedin = TRUE WHERE email = $1', [email]);

    return {
        token,
        name: user.name,
        role: user.role_name,
    };
}

async function logoutUser(pool, email) {
    if (!email) {
        const error = new Error('Email is required.');
        error.statusCode = 400;
        throw error;
    }

    await pool.query('UPDATE users SET loggedin = FALSE WHERE email = $1', [email]);
}

async function registerAdmin(pool, body) {
    const { name, email, password } = body;
    const role = 'admin';

    if (!name || !email || !password) {
        const error = new Error('All fields are required.');
        error.statusCode = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let roleResult = await pool.query('SELECT roleID FROM role WHERE Role = $1', [role]);
    let roleID = roleResult.rows.length > 0
        ? roleResult.rows[0].roleid
        : (await pool.query('INSERT INTO role (Role) VALUES ($1) RETURNING roleID', [role])).rows[0].roleid;

    const emailCheck = await pool.query('SELECT * FROM Users WHERE Email = $1', [email]);
    if (emailCheck.rows.length > 0) {
        const error = new Error('Email already exists.');
        error.statusCode = 409;
        throw error;
    }

    await pool.query(
        `INSERT INTO Users (name, email, password, roleid)
         VALUES ($1, $2, $3, $4)`,
        [name, email, hashedPassword, roleID]
    );
}

async function registerTutor(pool, body) {
    const { name, email, password, verificationCode } = body;

    if (!name || !email || !password || !verificationCode) {
        const error = new Error('All fields are required.');
        error.statusCode = 400;
        throw error;
    }

    const codeResult = await pool.query(
        `SELECT * FROM VerificationCode WHERE code = $1 AND expirationAt > NOW() AND used = FALSE`,
        [verificationCode]
    );

    if (codeResult.rows.length === 0) {
        const error = new Error('Invalid or expired verification code.');
        error.statusCode = 400;
        throw error;
    }

    const schoolID = codeResult.rows[0].schoolid;

    let roleResult = await pool.query('SELECT roleID FROM role WHERE Role = $1', ['tutor']);
    let roleID = roleResult.rows.length > 0
        ? roleResult.rows[0].roleid
        : (await pool.query('INSERT INTO role (Role) VALUES ($1) RETURNING roleID', ['tutor'])).rows[0].roleid;

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
        `INSERT INTO Users (Name, Email, password, roleID, schoolID)
         VALUES ($1, $2, $3, $4, $5)`,
        [name, email, hashedPassword, roleID, schoolID]
    );

    await pool.query(`UPDATE VerificationCode SET used = TRUE WHERE code = $1`, [verificationCode]);
}

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    registerAdmin,
    registerTutor,
};
