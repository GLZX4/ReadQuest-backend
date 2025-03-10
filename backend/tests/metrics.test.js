const { calculateMetrics } = require("../services/MetricsService");

describe("Metrics Calculation", () => {
    test("should correctly calculate metrics", () => {
        const stats = {
            correctAnswersCount: 8,
            totalQuestions: 10,
            totalAnswerTime: 120,
            totalAttempts: 15,
            roundsPlayed: 5,
            totalRoundsAvailable: 10,
        };

        const expected = {
            accuracyRate: 80.0,
            averageAnswerTime: 12.0,
            attemptsPerQuestion: 1.5,
            completionRate: 50.0
        };

        expect(calculateMetrics(stats)).toEqual(expected);
    });

    test("should return zero values when no questions are attempted", () => {
        const stats = {
            correctAnswersCount: 0,
            totalQuestions: 0,
            totalAnswerTime: 0,
            totalAttempts: 0,
            roundsPlayed: 0,
            totalRoundsAvailable: 10,
        };

        const expected = {
            accuracyRate: 0,
            averageAnswerTime: 0,
            attemptsPerQuestion: 0,
            completionRate: 0
        };

        expect(calculateMetrics(stats)).toEqual(expected);
    });

    test("should handle edge cases correctly", () => {
        const stats = {
            correctAnswersCount: -5,
            totalQuestions: 10,
            totalAnswerTime: 9999,
            totalAttempts: 0,
            roundsPlayed: 2,
            totalRoundsAvailable: 10,
        };
    
        const expected = {
            accuracyRate: 0, 
            averageAnswerTime: 999.9, 
            attemptsPerQuestion: 0, 
            completionRate: 20.0
        };
    
        expect(calculateMetrics(stats)).toEqual(expected);
    });
});