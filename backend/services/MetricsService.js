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

    const accuracyRate = totalQuestions > 0 ? (correctAnswersCount / totalQuestions) * 100 : 0;
    const averageAnswerTime = totalQuestions > 0 ? totalAnswerTime / totalQuestions : 0;
    const attemptsPerQuestion = totalQuestions > 0 ? totalAttempts / totalQuestions : 0;
    const completionRate = totalRoundsAvailable > 0 ? (roundsPlayed / totalRoundsAvailable) * 100 : 0;

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

    console.log("Raw Metrics Received:", metrics);

    const weights = {
        accuracyRate: 0.4,  
        averageAnswerTime: 0.3,
        attemptsPerQuestion: 0.15,
        completionRate: 0.15,
    };

    // Ensure minimum influence instead of zeroing out
    const normalizedMetrics = {
        accuracyRate: Math.max(accuracyRate / 100, 0.2),  // Min 0.2 if accuracy is 0
        averageAnswerTime: Math.max(1 - averageAnswerTime / 20, 0.2),
        attemptsPerQuestion: Math.max(1 - attemptsPerQuestion / 5, 0.2),
        completionRate: completionRate / 100,
    };

    console.log("Normalized Metrics:", normalizedMetrics);

    const performanceScore =
        normalizedMetrics.accuracyRate * weights.accuracyRate +
        normalizedMetrics.averageAnswerTime * weights.averageAnswerTime +
        normalizedMetrics.attemptsPerQuestion * weights.attemptsPerQuestion +
        normalizedMetrics.completionRate * weights.completionRate;

    console.log(`Performance Score: ${performanceScore.toFixed(2)}`);

    let recommendedDifficulty;
    if (performanceScore >= 0.85) {
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
    const defaultMetrics = {
        totalRoundsPlayed: 0,
        averageAnswerTime: 0.0,
        accuracyRate: 0.0,
        attemptsPerQuestion: 0.0,
        difficultyLevel: 'medium', // Default difficulty
        completionRate: 0.0,
    };

    try {
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
    }
};

module.exports = { calculateMetrics, calculateDifficultyLevel, addDefaultMetrics };
