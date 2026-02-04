import { Router } from 'express';
import { z } from 'zod';

import { Prisma } from '../../../prisma/generated/prisma/client';
import { prisma } from '../../db';
import { HttpError } from '../../http/httpError';
import { getParam } from '../../http/params';
import { requireAuth } from '../../middleware/requireAuth';
import { requireOrgMember } from '../../middleware/requireOrgMember';
import { requirePermission } from '../../middleware/requirePermission';

export const apartmentRouter = Router();

apartmentRouter.use('/:orgId', requireAuth, requireOrgMember);

function toNullableJsonInput<T extends Record<string, unknown>>(value: T | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return value;
}

const apartmentBaseSchema = z.object({
  name: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(200),
  totalArea: z.number().positive().optional(),
  floor: z.number().int().optional(),
});

apartmentRouter.get('/:orgId/apartments', requirePermission('apartment.read'), async (req, res) => {
  const orgId = getParam(req, 'orgId');

  const apartments = await prisma.apartment.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ apartments });
});

apartmentRouter.post('/:orgId/apartments', requirePermission('apartment.write'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const body = apartmentBaseSchema.parse(req.body);

  const apartment = await prisma.apartment.create({
    data: { organizationId: orgId, ...body },
  });

  return res.status(201).json({ apartment });
});

apartmentRouter.get(
  '/:orgId/apartments/:apartmentId',
  requirePermission('apartment.read'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({
      where: { id: apartmentId, organizationId: orgId },
      include: { rooms: true },
    });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    return res.json({ apartment });
  },
);

apartmentRouter.put(
  '/:orgId/apartments/:apartmentId',
  requirePermission('apartment.write'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');
    const body = apartmentBaseSchema.partial().parse(req.body);

    const exists = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!exists) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const apartment = await prisma.apartment.update({
      where: { id: apartmentId },
      data: body,
    });

    return res.json({ apartment });
  },
);

apartmentRouter.get(
  '/:orgId/apartments/:apartmentId/upstream',
  requirePermission('apartment.upstream.read'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const upstream = await prisma.apartmentUpstream.findUnique({ where: { apartmentId } });
    return res.json({ upstream });
  },
);

apartmentRouter.put(
  '/:orgId/apartments/:apartmentId/upstream',
  requirePermission('apartment.upstream.write'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const body = z
      .object({
        transferFeeCents: z.number().int().nonnegative().optional(),
        renovationFeeCents: z.number().int().nonnegative().optional(),
        renovationDepositCents: z.number().int().nonnegative().optional(),
        upfrontOtherCents: z.number().int().nonnegative().optional(),
        upstreamDepositCents: z.number().int().nonnegative().optional(),
        upstreamRentBaseCents: z.number().int().nonnegative().optional(),
        upstreamRentIncreaseType: z.enum(['NONE', 'FIXED', 'PERCENT']).optional(),
        upstreamRentIncreaseValue: z.number().int().nonnegative().optional(),
        upstreamRentIncreaseIntervalMonths: z.number().int().positive().optional(),
        notes: z.string().max(2000).optional().nullable(),
      })
      .parse(req.body);

    const upstream = await prisma.apartmentUpstream.upsert({
      where: { apartmentId },
      update: body,
      create: { apartmentId, ...body },
    });

    return res.json({ upstream });
  },
);

apartmentRouter.get(
  '/:orgId/apartments/:apartmentId/fee-pricings',
  requirePermission('apartment.read'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const feePricings = await prisma.apartmentFeePricing.findMany({
      where: { apartmentId },
      orderBy: { feeType: 'asc' },
    });
    return res.json({ feePricings });
  },
);

apartmentRouter.put(
  '/:orgId/apartments/:apartmentId/fee-pricings',
  requirePermission('apartment.write'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const items = z
      .array(
        z.object({
          feeType: z.enum(['WATER', 'ELECTRICITY', 'MANAGEMENT', 'INTERNET', 'GAS', 'OTHER']),
          mode: z.enum(['FIXED', 'METERED']),
          fixedAmountCents: z.number().int().nonnegative().optional().nullable(),
          unitPriceCents: z.number().int().nonnegative().optional().nullable(),
          unitName: z.string().trim().max(20).optional().nullable(),
        }),
      )
      .max(50)
      .parse(req.body);

    for (const it of items) {
      if (it.mode === 'FIXED' && (it.fixedAmountCents == null || it.fixedAmountCents < 0)) {
        throw new HttpError(400, 'INVALID_FEE_PRICING', '固定收费必须提供 fixedAmountCents');
      }
      if (it.mode === 'METERED' && (it.unitPriceCents == null || it.unitPriceCents < 0)) {
        throw new HttpError(400, 'INVALID_FEE_PRICING', '抄表计费必须提供 unitPriceCents');
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.apartmentFeePricing.deleteMany({ where: { apartmentId } });
      if (items.length) {
        await tx.apartmentFeePricing.createMany({
          data: items.map((it) => ({
            apartmentId,
            feeType: it.feeType,
            mode: it.mode,
            fixedAmountCents: it.fixedAmountCents ?? null,
            unitPriceCents: it.unitPriceCents ?? null,
            unitName: it.unitName ?? null,
          })),
        });
      }
    });

    const feePricings = await prisma.apartmentFeePricing.findMany({
      where: { apartmentId },
      orderBy: { feeType: 'asc' },
    });

    return res.json({ feePricings });
  },
);

apartmentRouter.get(
  '/:orgId/apartments/:apartmentId/rooms',
  requirePermission('room.read'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const rooms = await prisma.room.findMany({
      where: { apartmentId },
      include: { pricingPlans: true },
      orderBy: { name: 'asc' },
    });
    return res.json({ rooms });
  },
);

apartmentRouter.post(
  '/:orgId/apartments/:apartmentId/rooms',
  requirePermission('room.write'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const apartmentId = getParam(req, 'apartmentId');

    const apartment = await prisma.apartment.findFirst({ where: { id: apartmentId, organizationId: orgId } });
    if (!apartment) {
      throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
    }

    const body = z
      .object({
        name: z.string().trim().min(1).max(50),
        layout: z.string().trim().max(50).optional().nullable(),
        area: z.number().positive().optional().nullable(),
        facilities: z.record(z.string(), z.boolean()).optional().nullable(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    const room = await prisma.room.create({
      data: {
        apartmentId,
        name: body.name,
        layout: body.layout ?? null,
        area: body.area ?? null,
        facilities: toNullableJsonInput(body.facilities),
        isActive: body.isActive ?? true,
      },
    });

    return res.status(201).json({ room });
  },
);

apartmentRouter.get('/:orgId/rooms/:roomId', requirePermission('room.read'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const roomId = getParam(req, 'roomId');

  const room = await prisma.room.findFirst({
    where: { id: roomId, apartment: { organizationId: orgId } },
    include: { pricingPlans: true },
  });
  if (!room) {
    throw new HttpError(404, 'ROOM_NOT_FOUND', '房间不存在');
  }
  return res.json({ room });
});

apartmentRouter.put('/:orgId/rooms/:roomId', requirePermission('room.write'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const roomId = getParam(req, 'roomId');

  const exists = await prisma.room.findFirst({ where: { id: roomId, apartment: { organizationId: orgId } } });
  if (!exists) {
    throw new HttpError(404, 'ROOM_NOT_FOUND', '房间不存在');
  }

  const body = z
    .object({
      name: z.string().trim().min(1).max(50).optional(),
      layout: z.string().trim().max(50).optional().nullable(),
      area: z.number().positive().optional().nullable(),
      facilities: z.record(z.string(), z.boolean()).optional().nullable(),
      isActive: z.boolean().optional(),
    })
    .parse(req.body);

  const room = await prisma.room.update({
    where: { id: roomId },
    data: {
      name: body.name,
      layout: body.layout,
      area: body.area,
      facilities: toNullableJsonInput(body.facilities),
      isActive: body.isActive,
    },
  });
  return res.json({ room });
});

apartmentRouter.get('/:orgId/rooms/:roomId/pricing-plans', requirePermission('room.read'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const roomId = getParam(req, 'roomId');

  const room = await prisma.room.findFirst({ where: { id: roomId, apartment: { organizationId: orgId } } });
  if (!room) {
    throw new HttpError(404, 'ROOM_NOT_FOUND', '房间不存在');
  }

  const pricingPlans = await prisma.roomPricingPlan.findMany({
    where: { roomId, isActive: true },
    orderBy: { durationMonths: 'asc' },
  });

  return res.json({ pricingPlans });
});

apartmentRouter.put(
  '/:orgId/rooms/:roomId/pricing-plans',
  requirePermission('room.pricing.manage'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const roomId = getParam(req, 'roomId');

    const room = await prisma.room.findFirst({ where: { id: roomId, apartment: { organizationId: orgId } } });
    if (!room) {
      throw new HttpError(404, 'ROOM_NOT_FOUND', '房间不存在');
    }

    const plans = z
      .array(
        z.object({
          durationMonths: z.number().int().positive().max(120),
          rentCents: z.number().int().nonnegative(),
          depositCents: z.number().int().nonnegative().optional(),
        }),
      )
      .max(50)
      .parse(req.body);

    await prisma.$transaction(async (tx) => {
      await tx.roomPricingPlan.deleteMany({ where: { roomId } });
      if (plans.length) {
        await tx.roomPricingPlan.createMany({
          data: plans.map((p) => ({
            roomId,
            durationMonths: p.durationMonths,
            rentCents: p.rentCents,
            depositCents: p.depositCents ?? 0,
            isActive: true,
          })),
        });
      }
    });

    const pricingPlans = await prisma.roomPricingPlan.findMany({
      where: { roomId, isActive: true },
      orderBy: { durationMonths: 'asc' },
    });

    return res.json({ pricingPlans });
  },
);

