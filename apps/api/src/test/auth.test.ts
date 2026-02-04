import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../app';

describe('auth', () => {
  it('register -> me -> refresh -> logout', async () => {
    const app = createApp();
    const agent = request.agent(app);

    const phone = '13900000001';
    const password = 'password123';

    const registerRes = await agent.post('/auth/register').send({ phone, password, displayName: '张三' });
    expect(registerRes.status).toBe(200);
    expect(registerRes.body.accessToken).toBeTypeOf('string');

    const accessToken1 = registerRes.body.accessToken as string;

    const meRes = await agent.get('/auth/me').set('Authorization', `Bearer ${accessToken1}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.phone).toBe(phone);
    expect(Array.isArray(meRes.body.organizations)).toBe(true);

    const refreshRes = await agent.post('/auth/refresh').send({});
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeTypeOf('string');

    const accessToken2 = refreshRes.body.accessToken as string;
    expect(accessToken2.length).toBeGreaterThan(10);

    const logoutRes = await agent.post('/auth/logout').set('Authorization', `Bearer ${accessToken2}`).send({});
    expect(logoutRes.status).toBe(200);

    const refreshAfterLogout = await agent.post('/auth/refresh').send({});
    expect(refreshAfterLogout.status).toBe(401);
  });
});

