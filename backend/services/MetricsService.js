/**
 * Calculates performance metrics for a student based on their activity during a round.
 * @param {Object} stats - The raw data from the round.
 * @param {number} stats.correctAnswersCount - The number of correct answers.
 * @param {number} stats.totalQuestions - The total number of questions.
 * @param {number} stats.totalAnswerTime - The total time spent answering questions.
 * @param {number} stats.totalAttempts - The total number of attempts made by the student.
 * @param {number} stats.roundsPlayed - The total number of rounds played.
 * @param {number} stats.totalRoundsAvailable - The total number of rounds available.
 * @returns {Object} - The calculated metrics.
 */
function calculateMetrics(stats) {
    const {
        correctAnswersCount,
        totalQuestions,
        totalAnswerTime,
        totalAttempts,
        roundsPlayed,
        totalRoundsAvailable,
    } = stats;

    const accuracyRate = Math.max(0, stats.totalQuestions > 0 ? (stats.correctAnswersCount / stats.totalQuestions) * 100 : 0);
    const averageAnswerTime = Math.max(0, stats.totalQuestions > 0 ? stats.totalAnswerTime / stats.totalQuestions : 0);
    const attemptsPerQuestion = Math.max(0, stats.totalQuestions > 0 ? stats.totalAttempts / stats.totalQuestions : 0);
    const completionRate = Math.max(0, stats.totalRoundsAvailable > 0 ? (stats.roundsPlayed / stats.totalRoundsAvailable) * 100 : 0);
    
    return {
        accuracyRate: parseFloat(accuracyRate.toFixed(2)),
        averageAnswerTime: parseFloat(averageAnswerTime.toFixed(2)),
        attemptsPerQuestion: parseFloat(attemptsPerQuestion.toFixed(2)),
        completionRate: parseFloat(completionRate.toFixed(2)),
    };
}

module.exports = { calculateMetrics };

/**
 * Calculates the recommended difficulty level based on performance metrics.
 * @param {Object} metrics - The performance metrics calculated by `calculateMetrics`.
 * @returns {string} - The recommended difficulty level ('easy', 'medium', 'hard').
 */
function calculateDifficultyLevel(metrics) {
    const {
        accuracyRate,
        averageAnswerTime,
        attemptsPerQuestion,
        completionRate,
    } = metrics;

    console.log("✅ Converted Metrics:", metrics);

    const weights = {
        accuracyRate: 0.5,  // Increase influence of accuracy
        averageAnswerTime: 0.2,  // Reduce penalty from time
        attemptsPerQuestion: 0.2,  // Slightly higher weight
        completionRate: 0.1,  // Keep lower, but still contributing
    };

    const normalizedMetrics = {
        accuracyRate: Math.max(accuracyRate / 100, 0.3),  // Ensure minimum contribution
        averageAnswerTime: Math.max(1 - (averageAnswerTime / 30), 0.2),  // More forgiving
        attemptsPerQuestion: Math.max(1 - (attemptsPerQuestion / 3), 0.3),  // More impact from lower attempts
        completionRate: completionRate / 100,
    };

    console.log("Normalized Metrics:", normalizedMetrics);

    const performanceScore =
        (normalizedMetrics.accuracyRate * weights.accuracyRate) +
        (normalizedMetrics.averageAnswerTime * weights.averageAnswerTime) +
        (normalizedMetrics.attemptsPerQuestion * weights.attemptsPerQuestion) +
        (normalizedMetrics.completionRate * weights.completionRate);

    console.log(`Performance Score: ${performanceScore.toFixed(2)}`);

    let recommendedDifficulty;
    if (performanceScore >= 0.78) {
        recommendedDifficulty = 'easy';
    } else if (performanceScore >= 0.6) {
        recommendedDifficulty = 'medium';
    } else {
        recommendedDifficulty = 'hard';
    }

    console.log(`Recommended Difficulty: ${recommendedDifficulty}`);
    
    return recommendedDifficulty;
}

module.exports = { calculateMetrics, calculateDifficultyLevel };

/*
* Adds default performance metrics for a new user.
* @param {Pool} pool - The PostgreSQL database client.
* @param {number} userID - The user ID.
*/
const addDefaultMetrics = async (pool, userID) => {
    const client = await pool.connect();

    try {
        const checkQuery = `SELECT COUNT(*) FROM PerformanceMetrics WHERE userID = $1`;
        const checkResult = await client.query(checkQuery, [userID]);
        if (parseInt(checkResult.rows[0].count) > 0) {
            console.log(`Default metrics already exist for userID: ${userID}`);
            return;
        }

        const defaultMetrics = {
            totalRoundsPlayed: 0,
            averageAnswerTime: 0.0,
            accuracyRate: 0.0,
            attemptsPerQuestion: 0.0,
            difficultyLevel: 'medium', // Default difficulty
            completionRate: 0.0,
        };
    
        await pool.query(
            `INSERT INTO PerformanceMetrics (
                userID, 
                totalRoundsPlayed, 
                averageAnswerTime, 
                accuracyRate, 
                attemptsPerQuestion, 
                difficultyLevel, 
                completionRate, 
                lastUpdated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
                userID,
                defaultMetrics.totalRoundsPlayed,
                defaultMetrics.averageAnswerTime,
                defaultMetrics.accuracyRate,
                defaultMetrics.attemptsPerQuestion,
                defaultMetrics.difficultyLevel,
                defaultMetrics.completionRate,
            ]
        );
        console.log(`Default metrics created for userID: ${userID}`);
    } catch (error) {
        console.error('Error creating default metrics:', error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = { calculateMetrics, calculateDifficultyLevel, addDefaultMetrics };
