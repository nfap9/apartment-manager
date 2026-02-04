import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../app';

describe('org & rbac', () => {
  it('create org, create role, invite & accept', async () => {
    const app = createApp();
    const adminAgent = request.agent(app);

    const adminPhone = '13900000002';
    const adminPassword = 'password123';

    const reg = await adminAgent.post('/auth/register').send({ phone: adminPhone, password: adminPassword });
    expect(reg.status).toBe(200);
    const adminAccessToken = reg.body.accessToken as string;

    const orgRes = await adminAgent
      .post('/orgs')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: '测试组织' });
    expect(orgRes.status).toBe(201);
    const orgId = orgRes.body.organization.id as string;
    expect(orgId).toBeTypeOf('string');

    const orgMeRes = await adminAgent.get(`/orgs/${orgId}/me`).set('Authorization', `Bearer ${adminAccessToken}`);
    expect(orgMeRes.status).toBe(200);
    expect(orgMeRes.body.permissionKeys).toContain('org.role.manage');

    const roleRes = await adminAgent
      .post(`/orgs/${orgId}/roles`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'Manager', description: '经理' });
    expect(roleRes.status).toBe(201);
    const roleId = roleRes.body.role.id as string;

    const permissionsRes = await adminAgent
      .get(`/orgs/${orgId}/permissions`)
      .set('Authorization', `Bearer ${adminAccessToken}`);
    expect(permissionsRes.status).toBe(200);
    expect(Array.isArray(permissionsRes.body.permissions)).toBe(true);

    const putPermRes = await adminAgent
      .put(`/orgs/${orgId}/roles/${roleId}/permissions`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ permissionKeys: ['dashboard.read'] });
    expect(putPermRes.status).toBe(200);

    const getPermRes = await adminAgent
      .get(`/orgs/${orgId}/roles/${roleId}/permissions`)
      .set('Authorization', `Bearer ${adminAccessToken}`);
    expect(getPermRes.status).toBe(200);
    expect(getPermRes.body.permissionKeys).toEqual(['dashboard.read']);

    const inviteRes = await adminAgent
      .post(`/orgs/${orgId}/invites`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ maxUses: 10, expiresInDays: 7 });
    expect(inviteRes.status).toBe(201);
    const code = inviteRes.body.invite.code as string;
    expect(code).toBeTypeOf('string');

    const memberAgent = request.agent(app);
    const memberPhone = '13900000003';
    const memberPassword = 'password123';
    const memberReg = await memberAgent.post('/auth/register').send({ phone: memberPhone, password: memberPassword });
    expect(memberReg.status).toBe(200);
    const memberAccessToken = memberReg.body.accessToken as string;

    const acceptRes = await memberAgent
      .post(`/orgs/${orgId}/invites/accept`)
      .set('Authorization', `Bearer ${memberAccessToken}`)
      .send({ code });
    expect(acceptRes.status).toBe(200);

    const membersRes = await adminAgent
      .get(`/orgs/${orgId}/members`)
      .set('Authorization', `Bearer ${adminAccessToken}`);
    expect(membersRes.status).toBe(200);
    expect(membersRes.body.members.length).toBe(2);
  });
});

