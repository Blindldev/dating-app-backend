const request = require('supertest');
const { app } = require('../server');

describe('Server Tests', () => {
  let server;

  beforeAll((done) => {
    server = app.listen(3003, () => {
      console.log('Test server started on port 3003');
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
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });

  test('Sign in with valid credentials', async () => {
    const response = await request(app)
      .post('/api/signin')
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email');
  });

  test('Sign in with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/signin')
      .send({ email: '', password: '' });
    
    expect(response.status).toBe(400);
  });

  test('Create new profile', async () => {
    const profile = {
      name: 'Test User',
      age: 25,
      gender: 'Male',
      location: 'New York',
      bio: 'Test bio',
      lookingFor: 'Female'
    };

    const response = await request(app)
      .post('/api/profiles')
      .send(profile);
    
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject(profile);
  });

  test('Get all profiles', async () => {
    const response = await request(app).get('/api/profiles');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
}); 