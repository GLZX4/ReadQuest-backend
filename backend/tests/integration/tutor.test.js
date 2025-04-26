// backend/tests/integration/tutor.test.js

const request = require('supertest');
const app = require('../../server');
require('dotenv').config();

describe('Tutor API Integration Tests', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzQ1Njc5ODQ4LCJleHAiOjE3NDU2ODM0NDh9.NYlaCVxKzx8vFaTVq1TJROHVgfrijg8lCecwrbNJOK4';
    const testTutorID = 6; 
  let createdRoundID = null;

  it('should fetch available tutor endpoints', async () => {
    const response = await request(app)
      .get('/api/tutor')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('endpoints');
    expect(Array.isArray(response.body.endpoints)).toBe(true);
  });

  it('should fetch tutor school code', async () => {
    const response = await request(app)
      .get('/api/tutor/fetch-Tutor-Data')
      .set('Authorization', `Bearer ${token}`)
      .query({ userid: testTutorID });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('schoolCode');
  });

  it('should fetch student list for tutor', async () => {
    const response = await request(app)
      .get('/api/tutor/studentsList')
      .set('Authorization', `Bearer ${token}`)
      .query({ tutorID: testTutorID });

    expect([200, 404]).toContain(response.statusCode); 
    // 404 is fine if there are genuinely no students linked yet
  });

  it('should fail to fetch students if no tutor ID given', async () => {
    const response = await request(app)
      .get('/api/tutor/studentsList')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Tutor ID is required/i);
  });

  it('should add a new question set', async () => {
    const payload = {
      tutorID: testTutorID,
      difficulty: 'easy',
      questionType: 'multipleChoice',
      questions: [
        {
          questionText: 'What color is the sky?',
          questionType: 'multipleChoice',
          answerOptions: [
            { id: 'A', option: 'Blue' },
            { id: 'B', option: 'Green' },
            { id: 'C', option: 'Red' }
          ],
          correctAnswer: 'A',
          additionalData: {}
        }
      ]
    };

    const response = await request(app)
      .post('/api/tutor/add-Question-Set')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    console.log('Add Question Set Response:', response.body);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('qbankid');
    expect(response.body).toHaveProperty('roundid');

    createdRoundID = response.body.roundid;
  });

  it('should fail to add question set if missing questions', async () => {
    const payload = {
      tutorID: testTutorID,
      difficulty: 'easy',
      questionType: 'multipleChoice',
      questions: []
    };

    const response = await request(app)
      .post('/api/tutor/add-Question-Set')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/No questions provided/i);
  });

  it('should fail to add question set if invalid difficulty', async () => {
    const payload = {
      tutorID: testTutorID,
      difficulty: 'extreme', // invalid difficulty
      questionType: 'multipleChoice',
      questions: [
        {
          questionText: 'What is 2+2?',
          questionType: 'multipleChoice',
          answerOptions: [
            { id: 'A', option: '4' },
            { id: 'B', option: '5' },
            { id: 'C', option: '6' }
          ],
          correctAnswer: 'A',
          additionalData: {}
        }
      ]
    };

    const response = await request(app)
      .post('/api/tutor/add-Question-Set')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Invalid difficulty level/i);
  });

});
