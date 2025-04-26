
const request = require('supertest');
const app = require('../../server');
require('dotenv').config();

describe('Achievement API Integration Tests', () => {
  const testUserID = 3;
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzQ1Njc5ODQ4LCJleHAiOjE3NDU2ODM0NDh9.NYlaCVxKzx8vFaTVq1TJROHVgfrijg8lCecwrbNJOK4';

  it('should update achievement progress successfully', async () => {
    const response = await request(app)
      .post('/api/achievement/update-progress')
      .set('Authorization', `Bearer ${token}`)
      .send({
        studentId: testUserID,
        metric: 'roundsPlayed',
        value: 1,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toMatch(/progress updated/i);
  });

  it('should fail to update achievement with missing fields', async () => {
    const response = await request(app)
      .post('/api/achievement/update-progress')
      .set('Authorization', `Bearer ${token}`)
      .send({}); 

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/required/i);
  });
});
