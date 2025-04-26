const request = require('supertest');
const app = require('../../server');
require('dotenv').config();

describe('Round API Integration Tests', () => {


  it('should fetch a round by difficulty', async () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzQ1Njc5ODQ4LCJleHAiOjE3NDU2ODM0NDh9.NYlaCVxKzx8vFaTVq1TJROHVgfrijg8lCecwrbNJOK4';
    const response = await request(app)
      .get('/api/round/select-by-difficulty')
      .set('Authorization', `Bearer ${token}`)
      .query({ difficulty: 'easy' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('roundid');
    expect(response.body).toHaveProperty('qbankid');
  });

  it('should validate an answer (even if wrong)', async () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzQ1Njc5ODQ4LCJleHAiOjE3NDU2ODM0NDh9.NYlaCVxKzx8vFaTVq1TJROHVgfrijg8lCecwrbNJOK4';
    const response = await request(app)
      .post('/api/round/validate-answer')
      .set('Authorization', `Bearer ${token}`)
      .send({
        questionID: 2,
        selectedAnswer: "A"
      });

    expect([200, 400]).toContain(response.statusCode);
  });

  it('should fetch a specific question from a question bank', async () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzQ1Njc5ODQ4LCJleHAiOjE3NDU2ODM0NDh9.NYlaCVxKzx8vFaTVq1TJROHVgfrijg8lCecwrbNJOK4';
    const response = await request(app)
      .get('/api/round/get-question')
      .set('Authorization', `Bearer ${token}`)
      .query({
        qBankID: 15,
        questionIndex: 0
      });
  
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('questiontext');
    expect(response.body).toHaveProperty('questionid');
    expect(response.body).toHaveProperty('questiontype');
  });

  it('should return 404 for non-existent question bank', async () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzQ1Njc5ODQ4LCJleHAiOjE3NDU2ODM0NDh9.NYlaCVxKzx8vFaTVq1TJROHVgfrijg8lCecwrbNJOK4';
    const response = await request(app)
      .get('/api/round/get-question')
      .set('Authorization', `Bearer ${token}`)
      .query({
        qBankID: 999,
        questionIndex: 0
      });
  
    expect(response.statusCode).toBe(404);
  });

  it('should return 400 for invalid difficulty request', async () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzQ1Njc5ODQ4LCJleHAiOjE3NDU2ODM0NDh9.NYlaCVxKzx8vFaTVq1TJROHVgfrijg8lCecwrbNJOK4';
    const response = await request(app)
      .get('/api/round/select-by-difficulty')
      .set('Authorization', `Bearer ${token}`)
      .query({ difficulty: 'impossible' });
  
    expect(response.statusCode).toBe(400);
  });
  
  it('should return 400 if questionID is missing during answer validation', async () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzQ1Njc5ODQ4LCJleHAiOjE3NDU2ODM0NDh9.NYlaCVxKzx8vFaTVq1TJROHVgfrijg8lCecwrbNJOK4';
    const response = await request(app)
      .post('/api/round/validate-answer')
      .set('Authorization', `Bearer ${token}`)
      .send({
        selectedAnswer: "A"
      });
  
    expect(response.statusCode).toBe(400);
  });
  
  
});
