const request = require('supertest');
const app = require('../../server');
require('dotenv').config();

describe('Metrics API Integration Tests', () => {
  
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzQ1Njc5ODQ4LCJleHAiOjE3NDU2ODM0NDh9.NYlaCVxKzx8vFaTVq1TJROHVgfrijg8lCecwrbNJOK4';
    const testUserID = 3; 

  it('should process metrics and update XP/Level', async () => {
    const response = await request(app)
      .post('/api/metric/process-metrics')
      .set('Authorization', `Bearer ${token}`)
      .send({
        correctAnswersCount: 8,
        totalQuestions: 10,
        totalAnswerTime: 45,
        totalAttempts: 10,
        roundsPlayed: 1,
        totalRoundsAvailable: 5,
        userID: testUserID
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Metrics and XP updated successfully');
    expect(response.body.data).toHaveProperty('accuracyrate');
    expect(response.body).toHaveProperty('xpAwarded');
  });

  it('should fail if userID is missing', async () => {
    const response = await request(app)
      .post('/api/metric/process-metrics')
      .set('Authorization', `Bearer ${token}`)
      .send({
        correctAnswersCount: 8,
        totalQuestions: 10,
        totalAnswerTime: 45,
        totalAttempts: 10,
        roundsPlayed: 1,
        totalRoundsAvailable: 5
        // No userID
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/userID is required/i);
  });

});
