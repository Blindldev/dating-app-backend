const request = require('supertest');
const { app } = require('../server');

describe('Server Tests', () => {
  let server;

  beforeAll((done) => {
    server = app.listen(3002, () => {
      console.log('Test server started on port 3002');
      done();
    });
  });

  afterAll((done) => {
    server.close(() => {
      console.log('Test server closed');
      done();
    });
  });

  test('Health endpoint returns 200', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'healthy');
  });

  test('Sign in with valid credentials', async () => {
    const response = await request(app)
      .post('/api/signin')
      .send({
        email: 'alex.thompson@example.com',
        password: 'test123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('name', 'Alex Thompson');
  });

  test('Sign in with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/signin')
      .send({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });
    
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  test('Create new profile', async () => {
    const response = await request(app)
      .post('/api/profiles')
      .send({
        name: 'Test User',
        age: 25,
        gender: 'Male',
        lookingFor: 'Women',
        location: 'Chicago',
        occupation: 'Developer',
        education: "Bachelor's Degree",
        bio: 'Test bio',
        interests: ['Coding', 'Reading'],
        hobbies: ['Gaming', 'Hiking'],
        languages: ['English'],
        relationshipGoals: 'Dating',
        smoking: 'Never',
        drinking: 'Socially',
        firstDateIdeas: ['Coffee', 'Movies']
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('name', 'Test User');
  });

  test('Get all profiles', async () => {
    const response = await request(app).get('/api/profiles');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
}); 