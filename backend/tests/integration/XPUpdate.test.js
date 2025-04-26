const request = require('supertest');
const app = require('../../server'); 
require('dotenv').config();

describe('Metrics API + XP Level Update Integration', () => {
  
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzQ1Njc5ODQ4LCJleHAiOjE3NDU2ODM0NDh9.NYlaCVxKzx8vFaTVq1TJROHVgfrijg8lCecwrbNJOK4';
  const testUserID = 3; 

  let initialXP = null;
  let initialLevel = null;

  it('should fetch initial XP and level', async () => {
    const response = await request(app)
      .get('/api/student/get-level')
      .set('Authorization', `Bearer ${token}`)
      .query({ userID: testUserID });

    console.log(`Response: ${JSON.stringify(response.body)}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('xp');
    expect(response.body).toHaveProperty('level');

    initialXP = response.body.xp;
    initialLevel = response.body.level;

    console.log(`Initial XP: ${initialXP}, Level: ${initialLevel}`);
  });

  it('should process metrics and increase XP', async () => {
    const metricsResponse = await request(app)
      .post('/api/metric/process-metrics')
      .set('Authorization', `Bearer ${token}`)
      .send({
        correctAnswersCount: 9,
        totalQuestions: 10,
        totalAnswerTime: 45,
        totalAttempts: 10,
        roundsPlayed: 1,
        totalRoundsAvailable: 5,
        userID: testUserID
      });

    expect(metricsResponse.statusCode).toBe(200);
    expect(metricsResponse.body.message).toMatch(/success/i);
  });

  it('should fetch updated XP and level and verify increase', async () => {
    const updatedResponse = await request(app)
      .get('/api/student/get-level')
      .set('Authorization', `Bearer ${token}`)
      .query({ userID: testUserID });

    console.log(`Updated Response: ${JSON.stringify(updatedResponse.body)}`);

    expect(updatedResponse.statusCode).toBe(200);
    const { xp, level } = updatedResponse.body;

    console.log(`Updated XP: ${xp}, Level: ${level}`);

    const xpNumber = parseInt(xp, 10);
    const levelNumber = parseInt(level, 10);

    // XP must have increased
    expect(level).toBeGreaterThan(initialLevel);
    if (xp < initialXP) {
      expect(level).toBeGreaterThanOrEqual(initialLevel);
    }
  });

});
