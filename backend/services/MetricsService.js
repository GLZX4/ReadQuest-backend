// Services/MetricsService.js

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
    const consistency = "stable"; // Placeholder; implement actual logic if needed

    return {
        accuracyRate: parseFloat(accuracyRate.toFixed(2)),
        averageAnswerTime: parseFloat(averageAnswerTime.toFixed(2)),
        attemptsPerQuestion: parseFloat(attemptsPerQuestion.toFixed(2)),
        consistency,
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
        consistency,
        completionRate,
    } = metrics;

    const weights = {
        accuracyRate: 0.4,
        averageAnswerTime: 0.3,
        attemptsPerQuestion: 0.15,
        consistency: 0.05,
        completionRate: 0.05,
    };

    const normalizedMetrics = {
        accuracyRate: accuracyRate / 100,
        averageAnswerTime: Math.max(1 - averageAnswerTime / 20, 0),
        attemptsPerQuestion: Math.max(1 - attemptsPerQuestion / 5, 0),
        consistency: consistency === 'improving' ? 1 : consistency === 'stable' ? 0.5 : 0,
        completionRate: completionRate / 100,
    };

    const performanceScore =
        normalizedMetrics.accuracyRate * weights.accuracyRate +
        normalizedMetrics.averageAnswerTime * weights.averageAnswerTime +
        normalizedMetrics.attemptsPerQuestion * weights.attemptsPerQuestion +
        normalizedMetrics.consistency * weights.consistency +
        normalizedMetrics.completionRate * weights.completionRate;

    let recommendedDifficulty;
    if (performanceScore >= 0.85) {
        recommendedDifficulty = 'easy';
    } else if (performanceScore >= 0.6) {
        recommendedDifficulty = 'medium';
    } else {
        recommendedDifficulty = 'hard';
    }

    return recommendedDifficulty;
}

module.exports = { calculateMetrics, calculateDifficultyLevel };
