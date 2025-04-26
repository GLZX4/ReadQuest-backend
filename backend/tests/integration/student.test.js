const request = require('supertest');
const app = require('../../server');
require('dotenv').config();

describe('Student API Integration Tests', () => {

    it('should fetch student XP and level', async () => {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzQ1Njc5ODQ4LCJleHAiOjE3NDU2ODM0NDh9.NYlaCVxKzx8vFaTVq1TJROHVgfrijg8lCecwrbNJOK4';
        const response = await request(app)
          .get('/api/student/get-level')
          .set('Authorization', `Bearer ${token}`)
          .query({ userID: 3 }); 
      
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('xp');
        expect(response.body).toHaveProperty('level');
      });
      
      it('should fetch student streak progress', async () => {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzQ1Njc5ODQ4LCJleHAiOjE3NDU2ODM0NDh9.NYlaCVxKzx8vFaTVq1TJROHVgfrijg8lCecwrbNJOK4';
        const response = await request(app)
          .get('/api/student/get-streak')
          .set('Authorization', `Bearer ${token}`)
          .query({ studentId: 3 });
      
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('current');
        expect(response.body).toHaveProperty('best');
      });

      it('should update student streak progress', async () => {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzQ1Njc5ODQ4LCJleHAiOjE3NDU2ODM0NDh9.NYlaCVxKzx8vFaTVq1TJROHVgfrijg8lCecwrbNJOK4';
        const response = await request(app)
          .post('/api/student/update-streak')
          .set('Authorization', `Bearer ${token}`)
          .send({ studentId: 3 });
      
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('message');
      });
      
      it('should process metrics and grant XP', async () => {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzQ1Njc5ODQ4LCJleHAiOjE3NDU2ODM0NDh9.NYlaCVxKzx8vFaTVq1TJROHVgfrijg8lCecwrbNJOK4';
        const response = await request(app)
          .post('/api/metric/process-metrics')
          .set('Authorization', `Bearer ${token}`)
          .send({
            correctAnswersCount: 5,
            totalQuestions: 6,
            totalAnswerTime: 20,
            totalAttempts: 6,
            roundsPlayed: 1,
            totalRoundsAvailable: 10,
            userID: 3
          });
      
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('message');
      });
});