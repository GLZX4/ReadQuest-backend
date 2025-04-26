const request = require('supertest');
const app = require('../../server');
require('dotenv').config();

describe('Auth API Integration Tests', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'student@student.com', password: 'student123' });
  
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('token');
    });
  
    it('should fail login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'student@student.com', password: 'wrongpassword' });
  
      expect(response.statusCode).toBe(401);
    });
  });
  