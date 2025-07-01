const request = require('supertest');
const app = require('../server');

describe('PNPtv Live server', () => {
  it('returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('serves index.html', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('PNPtv Live');
  });
});
