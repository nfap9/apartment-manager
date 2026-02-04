import dayjs from 'dayjs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../app';

describe('billing', () => {
  it('run billing -> create invoice -> confirm metered reading', async () => {
    const app = createApp();
    const agent = request.agent(app);

    const reg = await agent.post('/auth/register').send({ phone: '13900000004', password: 'password123' });
    expect(reg.status).toBe(200);
    const accessToken = reg.body.accessToken as string;

    const orgRes = await agent.post('/orgs').set('Authorization', `Bearer ${accessToken}`).send({ name: '账单组织' });
    expect(orgRes.status).toBe(201);
    const orgId = orgRes.body.organization.id as string;

    // Create apartment + room
    const apartmentRes = await agent
      .post(`/orgs/${orgId}/apartments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'A1', address: 'ADDR' });
    expect(apartmentRes.status).toBe(201);
    const apartmentId = apartmentRes.body.apartment.id as string;

    const roomRes = await agent
      .post(`/orgs/${orgId}/apartments/${apartmentId}/rooms`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '101', isActive: true });
    expect(roomRes.status).toBe(201);
    const roomId = roomRes.body.room.id as string;

    // Create tenant
    const tenantRes = await agent
      .post(`/orgs/${orgId}/tenants`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '李四', phone: '13911112222', idNumber: 'ID123456' });
    expect(tenantRes.status).toBe(201);
    const tenantId = tenantRes.body.tenant.id as string;

    // Create lease (start in past)
    const startDate = dayjs().subtract(1, 'month').startOf('day').toDate();
    const endDate = dayjs().add(2, 'month').startOf('day').toDate();

    const leaseRes = await agent
      .post(`/orgs/${orgId}/leases`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        roomId,
        tenantId,
        startDate,
        endDate,
        baseRentCents: 500_00,
        depositCents: 1000_00,
        charges: [
          { name: '网费', mode: 'FIXED', fixedAmountCents: 50_00, billingCycleMonths: 1 },
          { name: '水费', mode: 'METERED', unitPriceCents: 2_00, unitName: '度', billingCycleMonths: 1 },
        ],
      });
    expect(leaseRes.status).toBe(201);

    // Run billing
    const runRes = await agent.post(`/orgs/${orgId}/billing/run`).set('Authorization', `Bearer ${accessToken}`).send({});
    if (runRes.status !== 200) {
      throw new Error(`billing/run failed: ${JSON.stringify(runRes.body, null, 2)}`);
    }
    expect(runRes.body.createdCount).toBeGreaterThan(0);

    const invoicesRes = await agent.get(`/orgs/${orgId}/invoices`).set('Authorization', `Bearer ${accessToken}`);
    expect(invoicesRes.status).toBe(200);
    expect(invoicesRes.body.invoices.length).toBeGreaterThan(0);

    const invoiceId = invoicesRes.body.invoices[0].id as string;
    const detailRes = await agent.get(`/orgs/${orgId}/invoices/${invoiceId}`).set('Authorization', `Bearer ${accessToken}`);
    expect(detailRes.status).toBe(200);
    const invoice = detailRes.body.invoice;
    expect(invoice.items.length).toBeGreaterThan(0);

    const items = invoice.items as Array<{ id: string; status: string }>;
    const pending = items.find((it) => it.status === 'PENDING_READING');
    expect(pending).toBeTruthy();
    const pendingId = pending!.id;

    const confirmRes = await agent
      .post(`/orgs/${orgId}/invoices/${invoiceId}/items/${pendingId}/confirm-reading`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ meterStart: 0, meterEnd: 10 });
    expect(confirmRes.status).toBe(200);

    const detailRes2 = await agent.get(`/orgs/${orgId}/invoices/${invoiceId}`).set('Authorization', `Bearer ${accessToken}`);
    expect(detailRes2.status).toBe(200);
    const after = detailRes2.body.invoice;
    const afterItems = after.items as Array<{ status: string }>;
    const allConfirmed = afterItems.every((it) => it.status === 'CONFIRMED');
    expect(allConfirmed).toBe(true);
  });
});

