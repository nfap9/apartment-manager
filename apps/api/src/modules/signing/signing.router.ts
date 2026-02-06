import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../db';
import { HttpError } from '../../http/httpError';
import { getParam } from '../../http/params';
import { requireAuth } from '../../middleware/requireAuth';
import { requireOrgMember } from '../../middleware/requireOrgMember';
import { requirePermission } from '../../middleware/requirePermission';

export const signingRouter = Router();

signingRouter.use('/:orgId', requireAuth, requireOrgMember);

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

const tenantSchema = z.object({
  name: z.string().trim().min(1).max(50),
  phone: z.string().trim().min(6).max(20).regex(/^[0-9]+$/, '手机号格式不正确'),
  idNumber: z.string().trim().min(6).max(30).optional().nullable(),
});

const signingSchema = z
  .object({
    // 租客信息 - 可以选择已有租客或创建新租客
    tenantId: z.string().min(1).optional(),
    newTenant: tenantSchema.optional(),

    // 房间信息
    roomId: z.string().min(1),

    // 租赁信息
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
  })
  .refine((x) => x.tenantId || x.newTenant, {
    message: '请选择已有租客或填写新租客信息',
    path: ['tenantId'],
  });

function validateCharges(charges: z.infer<typeof chargeSchema>[]) {
  for (const it of charges) {
    if (it.mode === 'FIXED' && (it.fixedAmountCents == null || it.fixedAmountCents < 0)) {
      throw new HttpError(400, 'INVALID_CHARGE', `费用 ${it.name} 固定计费必须提供 fixedAmountCents`);
    }
    if (it.mode === 'METERED' && (it.unitPriceCents == null || it.unitPriceCents < 0)) {
      throw new HttpError(400, 'INVALID_CHARGE', `费用 ${it.name} 按用量计费必须提供 unitPriceCents`);
    }
  }
}

// 获取可租房间列表（未租出且激活的房间）
signingRouter.get('/:orgId/signing/available-rooms', requirePermission('lease.write'), async (req, res) => {
  const orgId = getParam(req, 'orgId');

  const rooms = await prisma.room.findMany({
    where: {
      apartment: { organizationId: orgId },
      isActive: true,
      isRented: false,
    },
    include: {
      apartment: { select: { id: true, name: true, address: true } },
      pricingPlans: { where: { isActive: true }, orderBy: { durationMonths: 'asc' } },
      facilities: true,
    },
    orderBy: [{ apartment: { name: 'asc' } }, { name: 'asc' }],
  });

  return res.json({ rooms });
});

// 获取公寓的费用配置模板
signingRouter.get('/:orgId/signing/fee-templates/:apartmentId', requirePermission('lease.write'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const apartmentId = getParam(req, 'apartmentId');

  const apartment = await prisma.apartment.findFirst({
    where: { id: apartmentId, organizationId: orgId },
  });
  if (!apartment) {
    throw new HttpError(404, 'APARTMENT_NOT_FOUND', '公寓不存在');
  }

  const feePricings = await prisma.apartmentFeePricing.findMany({
    where: { apartmentId },
    orderBy: { feeType: 'asc' },
    include: {
      specs: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  // 转换为签约费用格式
  const charges = feePricings.map((fp) => ({
    name: getFeeTypeName(fp.feeType),
    feeType: fp.feeType,
    mode: fp.mode,
    fixedAmountCents: fp.fixedAmountCents,
    unitPriceCents: fp.unitPriceCents,
    unitName: fp.unitName,
    notes: fp.notes,
    billingTiming: fp.billingTiming,
    hasSpecs: fp.hasSpecs,
    specs: fp.hasSpecs
      ? fp.specs.map((spec) => ({
          id: spec.id,
          name: spec.name,
          description: spec.description,
          fixedAmountCents: spec.fixedAmountCents,
          unitPriceCents: spec.unitPriceCents,
          unitName: spec.unitName,
        }))
      : undefined,
    billingCycleMonths: 1,
    isActive: true,
  }));

  return res.json({ charges });
});

function getFeeTypeName(feeType: string): string {
  const map: Record<string, string> = {
    WATER: '水费',
    ELECTRICITY: '电费',
    MANAGEMENT: '物业费',
    INTERNET: '网费',
    GAS: '燃气费',
    OTHER: '其他',
  };
  return map[feeType] ?? feeType;
}

// 一站式签约接口
signingRouter.post('/:orgId/signing', requirePermission('lease.write'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const body = signingSchema.parse(req.body);
  const charges = body.charges ?? [];
  validateCharges(charges);

  // 验证房间
  const room = await prisma.room.findFirst({
    where: { id: body.roomId, apartment: { organizationId: orgId } },
    include: { apartment: true },
  });
  if (!room) {
    throw new HttpError(404, 'ROOM_NOT_FOUND', '房间不存在');
  }
  if (!room.isActive) {
    throw new HttpError(400, 'ROOM_INACTIVE', '该房间已停用');
  }
  if (room.isRented) {
    throw new HttpError(400, 'ROOM_ALREADY_RENTED', '该房间已租出');
  }

  // 检查租期冲突
  // 只有未终止的租约(TERMINATED)才会阻止创建新租约
  const overlapping = await prisma.lease.findFirst({
    where: {
      organizationId: orgId,
      roomId: body.roomId,
      status: { not: 'TERMINATED' }, // 排除已终止的租约
      startDate: { lt: body.endDate },
      endDate: { gt: body.startDate },
    },
    select: { id: true, startDate: true, endDate: true, status: true },
  });
  if (overlapping) {
    throw new HttpError(409, 'LEASE_OVERLAP', '该房间在租期内已存在未终止的租约', overlapping);
  }

  // 执行事务：创建租客（可选）、创建租约、更新房间状态
  const result = await prisma.$transaction(async (tx) => {
    let tenantId = body.tenantId;

    // 如果需要创建新租客
    if (body.newTenant && !body.tenantId) {
      const newTenant = await tx.tenant.create({
        data: {
          organizationId: orgId,
          name: body.newTenant.name,
          phone: body.newTenant.phone,
          idNumber: body.newTenant.idNumber ?? null,
        },
      });
      tenantId = newTenant.id;
    }

    // 验证租客存在
    if (!tenantId) {
      throw new HttpError(400, 'TENANT_REQUIRED', '请选择或创建租客');
    }
    const tenant = await tx.tenant.findFirst({
      where: { id: tenantId, organizationId: orgId },
    });
    if (!tenant) {
      throw new HttpError(404, 'TENANT_NOT_FOUND', '租客不存在');
    }

    // 创建租约
    const lease = await tx.lease.create({
      data: {
        organizationId: orgId,
        roomId: body.roomId,
        tenantId: tenantId,
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

    // 创建费用项
    if (charges.length) {
      await tx.leaseCharge.createMany({
        data: charges.map((c) => ({
          leaseId: lease.id,
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

    // 更新房间为已租出状态
    await tx.room.update({
      where: { id: body.roomId },
      data: { isRented: true },
    });

    return { lease, tenant };
  });

  // 获取完整的租约信息返回
  const leaseWithRelations = await prisma.lease.findFirst({
    where: { id: result.lease.id },
    include: {
      room: { include: { apartment: true } },
      tenant: true,
      charges: true,
    },
  });

  return res.status(201).json({
    message: '签约成功',
    lease: leaseWithRelations,
    tenant: result.tenant,
  });
});
