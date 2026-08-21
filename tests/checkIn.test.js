const request = require('supertest');
const app = require('../src/server');

describe('Kiosk Asynchronous Check-In Flow', () => {
  test('Attendee 1: Standard Scan transitions to PENDING', async () => {
    const res = await request(app)
      .post('/api/v1/check-in')
      .send({ attendeeId: 'att_40219' });
    
    expect(res.statusCode).toBe(202);
    expect(res.body.status).toBe('CHECKING_IN_PENDING');
  });

  test('Attendee 3: Rapid Duplicate Scan returns 409 Conflict', async () => {
    // First scan locks row
    await request(app).post('/api/v1/check-in').send({ attendeeId: 'att_99011' });

    // Second immediate scan fails
    const duplicateRes = await request(app)
      .post('/api/v1/check-in')
      .send({ attendeeId: 'att_99011' });

    expect(duplicateRes.statusCode).toBe(409);
    expect(duplicateRes.body.error).toBe('Duplicate scan or already checked in.');
  });
});
