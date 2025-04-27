async function fetchAdminData(pool) {
    const AdminData = {
        totalUsers: 0,
        activeUsers: 0,
        systemStatus: '',
    };

    const activeUsersResult = await pool.query('SELECT COUNT(*) AS activeUsersCount FROM Users WHERE loggedIn = TRUE');
    AdminData.activeUsers = activeUsersResult.rows[0].activeuserscount;

    const totalUsersResult = await pool.query('SELECT COUNT(*) AS totalUsersCount FROM Users');
    AdminData.totalUsers = totalUsersResult.rows[0].totaluserscount;

    AdminData.systemStatus = 'All systems operational';

    return AdminData;
}

async function createTutorVerificationCode(pool, body) {
    const { verificationCode, schoolID, expirationAt, used = false, createdAt = new Date() } = body;

    if (!verificationCode || !schoolID || !expirationAt) {
        const error = new Error('Missing required fields for verification code.');
        error.statusCode = 400;
        throw error;
    }

    await pool.query(
        `INSERT INTO VerificationCode (code, schoolID, expirationAt, used, createdAt) 
         VALUES ($1, $2, $3, $4, $5)`,
        [verificationCode, schoolID, expirationAt, used, createdAt]
    );
}

async function fetchSchools(pool) {
    const result = await pool.query('SELECT * FROM schools');
    return result.rows;
}

async function addSchool(pool, body) {
    const { schoolName, schoolCode, address, contactEmail, contactPhone } = body;

    if (!schoolName || !schoolCode || !address || !contactEmail || !contactPhone) {
        const error = new Error('All fields are required.');
        error.statusCode = 400;
        throw error;
    }

    await pool.query(
        `INSERT INTO Schools (schoolName, schoolCode, address, contactEmail, contactPhone)
         VALUES ($1, $2, $3, $4, $5)`,
        [schoolName, schoolCode, address, contactEmail, contactPhone]
    );
}

module.exports = {
    fetchAdminData,
    createTutorVerificationCode,
    fetchSchools,
    addSchool,
};
