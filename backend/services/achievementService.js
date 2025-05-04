async function updateAchievementProgress(pool, data) {
    const { studentId, achievementType, progressUpdate } = data;

    console.log(` updateAchievementProgress called with:`, data);

    if (!studentId || !achievementType || !progressUpdate) {
        console.error(' Missing required fields:', { studentId, achievementType, progressUpdate });
        throw { statusCode: 400, message: 'Missing required fields' };
    }

    const achievementQuery = `SELECT achievementid FROM achievements WHERE achievementtype = $1`;
    const achievementResult = await pool.query(achievementQuery, [achievementType]);

    console.log(` Fetched achievement ID for type "${achievementType}":`, achievementResult.rows);

    if (achievementResult.rows.length === 0) {
        console.error(' No achievement found for type:', achievementType);
        throw { statusCode: 404, message: 'Achievement type not found' };
    }

    const achievementId = achievementResult.rows[0].achievementid;

    const checkQuery = `SELECT * FROM student_achievements WHERE userid = $1 AND achievementid = $2`;
    const checkResult = await pool.query(checkQuery, [studentId, achievementId]);

    console.log(` Existing progress row found:`, checkResult.rows);

    let isUnlocked = false;
    let progressData = checkResult.rows.length > 0 ? checkResult.rows[0].progress || {} : {};

    console.log(` Starting progress data:`, progressData);

    // Apply the progress update
    Object.keys(progressUpdate).forEach((key) => {
        progressData[key] = (progressData[key] || 0) + progressUpdate[key];
    });

    console.log(` Updated progress data after applying update:`, progressData);

    const progressPercentage = calculateProgress(progressData, achievementType);
    console.log(` Progress percentage calculated: ${progressPercentage}%`);

    if (progressPercentage >= 100) {
        isUnlocked = true;
        console.log(` Achievement unlocked!`);
    }

    if (checkResult.rows.length > 0) {
        console.log(` Updating existing achievement progress...`);
        const updateQuery = `
            UPDATE student_achievements 
            SET progress = $1, isunlocked = $2, unlockedat = CASE WHEN $2 THEN NOW() ELSE NULL END
            WHERE userid = $3 AND achievementid = $4
            RETURNING *;
        `;
        const updated = await pool.query(updateQuery, [progressData, isUnlocked, studentId, achievementId]);
        console.log(` Update result:`, updated.rows[0]);
        return updated.rows[0];
    } else {
        console.log(` Inserting new achievement progress row...`);
        const insertQuery = `
            INSERT INTO student_achievements (userid, achievementid, progress, isunlocked, unlockedat)
            VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN NOW() ELSE NULL END)
            RETURNING *;
        `;
        const inserted = await pool.query(insertQuery, [studentId, achievementId, progressData, isUnlocked]);
        console.log(` Insert result:`, inserted.rows[0]);
        return inserted.rows[0];
    }
}

async function fetchStudentAchievements(pool, studentId) {
    console.log(` Fetching achievements for student ID: ${studentId}`);

    const query = `
        SELECT 
            a.achievementid, 
            a.achievementtype, 
            a.description,
            COALESCE(sa.progress, '{}'::jsonb) AS progress, 
            COALESCE(sa.isunlocked, false) AS isunlocked,
            sa.unlockedat
        FROM achievements a
        LEFT JOIN student_achievements sa 
        ON a.achievementid = sa.achievementid AND sa.userid = $1
    `;

    const result = await pool.query(query, [studentId]);

    console.log(`Achievement rows fetched:`, result.rows);

    return result.rows.map(achievement => ({
        achievementId: achievement.achievementid,
        type: achievement.achievementtype,
        description: achievement.description,
        progress: achievement.progress,
        isUnlocked: achievement.isunlocked,
        unlockedAt: achievement.unlockedat,
        progressPercentage: calculateProgress(achievement.progress, achievement.achievementtype),
    }));
}



function calculateProgress(progressData, achievementType) {
    let progressValue = 0;
    let unlockConditionValue = 1;

    switch (achievementType) {
        case 'First Round Completed':
            progressValue = progressData.roundsCompleted || 0;
            unlockConditionValue = 1;
            break;
        case 'Perfect Score':
            progressValue = progressData.perfectRounds || 0;
            unlockConditionValue = 1;
            break;
        case 'Consistency Champ':
            progressValue = progressData.consecutiveDays || 0;
            unlockConditionValue = progressData.targetDays || 5;
            break;
        case 'Fast Learner':
            progressValue = progressData.fastRounds || 0;
            unlockConditionValue = 1;
            break;
        case 'Reading Streak':
            progressValue = progressData.consecutiveDays || 0;
            unlockConditionValue = progressData.targetDays || 7;
            break;
        case 'All Rounds Perfect':
            progressValue = progressData.perfectRounds || 0;
            unlockConditionValue = progressData.targetRounds || 10;
            break;
        case 'Play 10 Rounds':
            progressValue = progressData.roundsPlayed || 0;
            unlockConditionValue = 10;
            break;
        case 'Play 50 Rounds':
            progressValue = progressData.roundsPlayed || 0;
            unlockConditionValue = 50;
            break;
        case 'Play 100 Rounds':
            progressValue = progressData.roundsPlayed || 0;
            unlockConditionValue = 100;
            break;
        case 'Master Reader':
            progressValue = progressData.accuracyRate || 0;
            unlockConditionValue = 95;
            break;
        default:
            break;
    }

    return Math.round((progressValue / unlockConditionValue) * 100);
}

module.exports = {
    updateAchievementProgress,
    fetchStudentAchievements
};
