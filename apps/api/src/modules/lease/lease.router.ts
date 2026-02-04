import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../db';
import { HttpError } from '../../http/httpError';
import { getParam } from '../../http/params';
import { requireAuth } from '../../middleware/requireAuth';
import { requireOrgMember } from '../../middleware/requireOrgMember';
import { requirePermission } from '../../middleware/requirePermission';

export const leaseRouter = Router();

leaseRouter.use('/:orgId', requireAuth, requireOrgMember);

const chargeSchema = z.object({
  name: z.string().trim().min(1).max(50),
  feeType: z.enum(['WATER', 'ELECTRICITY', 'MANAGEMENT', 'INTERNET', 'GAS', 'OTHER']).optional().nullable(),
  mode: z.enum(['FIXED', 'METERED']),
  fixedAmountCents: z.number().int().nonnegative().optional().nullable(),
  unitPriceCents: z.number().int().nonnegative().optional().nullable(),
  unitName: z.string().trim().max(20).optional().nullable(),
  billingCycleMonths: z.number().int().positive().max(24).optional(),
  isActive: z.boolean().optional(),
});

const createLeaseSchema = z
  .object({
    roomId: z.string().min(1),
    tenantId: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    billingCycleMonths: z.number().int().positive().max(24).optional(),
    depositCents: z.number().int().nonnegative().optional(),
    baseRentCents: z.number().int().nonnegative(),
    rentIncreaseType: z.enum(['NONE', 'FIXED', 'PERCENT']).optional(),
    rentIncreaseValue: z.number().int().nonnegative().optional(),
    rentIncreaseIntervalMonths: z.number().int().positive().max(120).optional(),
    notes: z.string().max(2000).optional().nullable(),
    charges: z.array(chargeSchema).max(50).optional(),
  })
  .refine((x) => x.startDate.getTime() < x.endDate.getTime(), {
    message: 'startDate 必须小于 endDate',
    path: ['startDate'],
  });

function validateCharges(charges: z.infer<typeof chargeSchema>[]) {
  for (const it of charges) {
    if (it.mode === 'FIXED' && (it.fixedAmountCents == null || it.fixedAmountCents < 0)) {
      throw new HttpError(400, 'INVALID_CHARGE', `杂费 ${it.name} 固定收费必须提供 fixedAmountCents`);
    }
    if (it.mode === 'METERED' && (it.unitPriceCents == null || it.unitPriceCents < 0)) {
      throw new HttpError(400, 'INVALID_CHARGE', `杂费 ${it.name} 抄表计费必须提供 unitPriceCents`);
    }
  }
}

async function assertRoomBelongsToOrg(orgId: string, roomId: string) {
  const room = await prisma.room.findFirst({
    where: { id: roomId, apartment: { organizationId: orgId } },
    select: { id: true, name: true },
  });
  if (!room) throw new HttpError(404, 'ROOM_NOT_FOUND', '房间不存在');
  return room;
}

async function assertTenantBelongsToOrg(orgId: string, tenantId: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, organizationId: orgId },
    select: { id: true, name: true },
  });
  if (!tenant) throw new HttpError(404, 'TENANT_NOT_FOUND', '租客不存在');
  return tenant;
}

async function assertNoOverlappingLease(orgId: string, roomId: string, startDate: Date, endDate: Date, excludeLeaseId?: string) {
  const overlapping = await prisma.lease.findFirst({
    where: {
      organizationId: orgId,
      roomId,
      ...(excludeLeaseId ? { id: { not: excludeLeaseId } } : {}),
      status: { in: ['ACTIVE', 'DRAFT'] },
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
    select: { id: true, startDate: true, endDate: true, status: true },
  });

  if (overlapping) {
    throw new HttpError(409, 'LEASE_OVERLAP', '该房间在租期内已存在生效/草稿租约', overlapping);
  }
}

leaseRouter.get('/:orgId/leases', requirePermission('lease.read'), async (req, res) => {
  const orgId = getParam(req, 'orgId');

  const leases = await prisma.lease.findMany({
    where: { organizationId: orgId },
    include: {
      room: { select: { id: true, name: true, apartment: { select: { id: true, name: true } } } },
      tenant: { select: { id: true, name: true, phone: true } },
      charges: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ leases });
});

leaseRouter.get('/:orgId/leases/:leaseId', requirePermission('lease.read'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const leaseId = getParam(req, 'leaseId');

  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, organizationId: orgId },
    include: {
      room: { include: { apartment: true, pricingPlans: true } },
      tenant: true,
      charges: true,
    },
  });
  if (!lease) throw new HttpError(404, 'LEASE_NOT_FOUND', '租约不存在');

  return res.json({ lease });
});

leaseRouter.post('/:orgId/leases', requirePermission('lease.write'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const body = createLeaseSchema.parse(req.body);
  const charges = body.charges ?? [];
  validateCharges(charges);

  await assertRoomBelongsToOrg(orgId, body.roomId);
  await assertTenantBelongsToOrg(orgId, body.tenantId);
  await assertNoOverlappingLease(orgId, body.roomId, body.startDate, body.endDate);

  const lease = await prisma.$transaction(async (tx) => {
    const created = await tx.lease.create({
      data: {
        organizationId: orgId,
        roomId: body.roomId,
        tenantId: body.tenantId,
        status: 'ACTIVE',
        startDate: body.startDate,
        endDate: body.endDate,
        billingCycleMonths: body.billingCycleMonths ?? 1,
        depositCents: body.depositCents ?? 0,
        baseRentCents: body.baseRentCents,
        rentIncreaseType: body.rentIncreaseType ?? 'NONE',
        rentIncreaseValue: body.rentIncreaseValue ?? 0,
        rentIncreaseIntervalMonths: body.rentIncreaseIntervalMonths ?? 12,
        notes: body.notes ?? null,
      },
    });

    if (charges.length) {
      await tx.leaseCharge.createMany({
        data: charges.map((c) => ({
          leaseId: created.id,
          name: c.name,
          feeType: c.feeType ?? null,
          mode: c.mode,
          fixedAmountCents: c.fixedAmountCents ?? null,
          unitPriceCents: c.unitPriceCents ?? null,
          unitName: c.unitName ?? null,
          billingCycleMonths: c.billingCycleMonths ?? 1,
          isActive: c.isActive ?? true,
        })),
      });
    }

    return created;
  });

  const leaseWithRelations = await prisma.lease.findFirst({
    where: { id: lease.id },
    include: { charges: true },
  });

  return res.status(201).json({ lease: leaseWithRelations });
});

leaseRouter.put('/:orgId/leases/:leaseId', requirePermission('lease.write'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const leaseId = getParam(req, 'leaseId');

  const body = z
    .object({
      status: z.enum(['DRAFT', 'ACTIVE', 'ENDED', 'TERMINATED']).optional(),
      endDate: z.coerce.date().optional(),
      notes: z.string().max(2000).optional().nullable(),
    })
    .parse(req.body);

  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, organizationId: orgId },
    select: { id: true, roomId: true, startDate: true, endDate: true },
  });
  if (!lease) throw new HttpError(404, 'LEASE_NOT_FOUND', '租约不存在');

  const nextStart = lease.startDate;
  const nextEnd = body.endDate ?? lease.endDate;
  if (nextStart.getTime() >= nextEnd.getTime()) {
    throw new HttpError(400, 'INVALID_DATE', 'startDate 必须小于 endDate');
  }

  await assertNoOverlappingLease(orgId, lease.roomId, nextStart, nextEnd, leaseId);

  const updated = await prisma.lease.update({
    where: { id: leaseId },
    data: {
      status: body.status,
      endDate: body.endDate,
      notes: body.notes,
    },
  });

  return res.json({ lease: updated });
});

