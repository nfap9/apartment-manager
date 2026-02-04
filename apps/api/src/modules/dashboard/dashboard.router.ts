import dayjs from 'dayjs';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../db';
import { getParam } from '../../http/params';
import { requireAuth } from '../../middleware/requireAuth';
import { requireOrgMember } from '../../middleware/requireOrgMember';
import { requirePermission } from '../../middleware/requirePermission';

export const dashboardRouter = Router();

dashboardRouter.use('/:orgId', requireAuth, requireOrgMember, requirePermission('dashboard.read'));

dashboardRouter.get('/:orgId/dashboard/vacant-rooms', async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const now = new Date();

  const activeLeases = await prisma.lease.findMany({
    where: {
      organizationId: orgId,
      status: 'ACTIVE',
      startDate: { lte: now },
      endDate: { gt: now },
    },
    select: { roomId: true },
  });

  const occupiedRoomIds = [...new Set(activeLeases.map((l) => l.roomId))];

  const rooms = await prisma.room.findMany({
    where: {
      isActive: true,
      apartment: { organizationId: orgId },
      id: { notIn: occupiedRoomIds },
    },
    include: { apartment: { select: { id: true, name: true, address: true } } },
    orderBy: [{ apartmentId: 'asc' }, { name: 'asc' }],
  });

  return res.json({ rooms, asOf: now.toISOString() });
});

dashboardRouter.get('/:orgId/dashboard/lease-expiring', async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const now = new Date();

  const query = z
    .object({
      days: z.number().int().positive().max(365).optional(),
    })
    .parse({
      days: typeof req.query.days === 'string' ? Number(req.query.days) : undefined,
    });

  const until = dayjs(now).add(query.days ?? 30, 'day').toDate();

  const leases = await prisma.lease.findMany({
    where: {
      organizationId: orgId,
      status: 'ACTIVE',
      endDate: { lte: until, gt: now },
    },
    include: {
      room: { select: { id: true, name: true, apartment: { select: { id: true, name: true } } } },
      tenant: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { endDate: 'asc' },
    take: 200,
  });

  return res.json({ leases, now: now.toISOString(), until: until.toISOString() });
});

dashboardRouter.get('/:orgId/dashboard/kpis', async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const now = new Date();

  const [apartmentCount, totalRoomCount] = await Promise.all([
    prisma.apartment.count({ where: { organizationId: orgId } }),
    prisma.room.count({ where: { apartment: { organizationId: orgId }, isActive: true } }),
  ]);

  const activeLeases = await prisma.lease.findMany({
    where: {
      organizationId: orgId,
      status: 'ACTIVE',
      startDate: { lte: now },
      endDate: { gt: now },
    },
    select: { roomId: true },
  });

  const occupiedRooms = new Set(activeLeases.map((l) => l.roomId));
  const occupiedRoomCount = occupiedRooms.size;

  const occupancyRate = totalRoomCount > 0 ? occupiedRoomCount / totalRoomCount : 0;

  const [issuedAgg, overdueAgg, issuedCount, overdueCount] = await Promise.all([
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: 'ISSUED' },
      _sum: { totalAmountCents: true },
    }),
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: 'ISSUED', dueDate: { lt: now } },
      _sum: { totalAmountCents: true },
    }),
    prisma.invoice.count({ where: { organizationId: orgId, status: 'ISSUED' } }),
    prisma.invoice.count({ where: { organizationId: orgId, status: 'ISSUED', dueDate: { lt: now } } }),
  ]);

  return res.json({
    asOf: now.toISOString(),
    kpis: {
      apartmentCount,
      totalRoomCount,
      occupiedRoomCount,
      occupancyRate,
      invoiceIssuedCount: issuedCount,
      invoiceIssuedTotalCents: issuedAgg._sum.totalAmountCents ?? 0,
      invoiceOverdueCount: overdueCount,
      invoiceOverdueTotalCents: overdueAgg._sum.totalAmountCents ?? 0,
    },
  });
});

