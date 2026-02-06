import { z } from 'zod';
import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { requireOrgMember } from '../../middleware/requireOrgMember';
import { requirePermission, requireAnyPermission } from '../../middleware/requirePermission';
import { getParam } from '../../http/params';
import { HttpError } from '../../http/httpError';
import { prisma } from '../../db';

export const feeRouter = Router();

feeRouter.use('/:orgId', requireAuth, requireOrgMember);

// 获取费用项目列表
// 允许有 fee.manage 或 apartment.write 权限的用户访问（用于在公寓费用定价中选择费用项目）
feeRouter.get('/:orgId/fee-items', requireAnyPermission(['fee.manage', 'apartment.write']), async (req, res) => {
  const orgId = getParam(req, 'orgId');

  const feeItems = await prisma.feeItem.findMany({
    where: { organizationId: orgId },
    include: {
      specs: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return res.json({ feeItems });
});

// 创建费用项目
feeRouter.post('/:orgId/fee-items', requirePermission('fee.manage'), async (req, res) => {
  const orgId = getParam(req, 'orgId');

  const specSchema = z.object({
    name: z.string().trim().min(1).max(50),
    description: z.string().trim().max(200).optional().nullable(),
    fixedAmountCents: z.number().int().nonnegative().optional().nullable(),
    unitPriceCents: z.number().int().nonnegative().optional().nullable(),
    unitName: z.string().trim().max(20).optional().nullable(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  });

  const body = z
    .object({
      feeType: z.enum(['WATER', 'ELECTRICITY', 'MANAGEMENT', 'INTERNET', 'GAS', 'OTHER']),
      name: z.string().trim().min(1).max(100),
      mode: z.enum(['FIXED', 'METERED']),
      defaultFixedAmountCents: z.number().int().nonnegative().optional().nullable(),
      defaultUnitPriceCents: z.number().int().nonnegative().optional().nullable(),
      defaultUnitName: z.string().trim().max(20).optional().nullable(),
      defaultBillingTiming: z.enum(['PREPAID', 'POSTPAID']).optional().nullable(),
      hasSpecs: z.boolean().optional(),
      notes: z.string().trim().max(500).optional().nullable(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().nonnegative().optional(),
      specs: z.array(specSchema).optional(),
    })
    .parse(req.body);

  // 验证
  if (body.hasSpecs) {
    if (!body.specs || body.specs.length === 0) {
      throw new HttpError(400, 'INVALID_FEE_ITEM', '启用多规格时必须提供至少一个规格');
    }
    for (const spec of body.specs) {
      if (body.mode === 'FIXED' && (spec.fixedAmountCents == null || spec.fixedAmountCents < 0)) {
        throw new HttpError(400, 'INVALID_FEE_ITEM', `规格 "${spec.name}" 的固定金额无效`);
      }
      if (body.mode === 'METERED' && (spec.unitPriceCents == null || spec.unitPriceCents < 0)) {
        throw new HttpError(400, 'INVALID_FEE_ITEM', `规格 "${spec.name}" 的单价无效`);
      }
    }
  } else {
    if (body.mode === 'FIXED' && (body.defaultFixedAmountCents == null || body.defaultFixedAmountCents < 0)) {
      throw new HttpError(400, 'INVALID_FEE_ITEM', '固定计费必须提供默认固定金额');
    }
    if (body.mode === 'METERED' && (body.defaultUnitPriceCents == null || body.defaultUnitPriceCents < 0)) {
      throw new HttpError(400, 'INVALID_FEE_ITEM', '按用量计费必须提供默认单价');
    }
  }

  const feeItem = await prisma.$transaction(async (tx) => {
    const item = await tx.feeItem.create({
      data: {
        organizationId: orgId,
        feeType: body.feeType,
        name: body.name,
        mode: body.mode,
        defaultFixedAmountCents: body.defaultFixedAmountCents ?? null,
        defaultUnitPriceCents: body.defaultUnitPriceCents ?? null,
        defaultUnitName: body.defaultUnitName ?? null,
        defaultBillingTiming: body.defaultBillingTiming ?? null,
        hasSpecs: body.hasSpecs ?? false,
        notes: body.notes ?? null,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    if (body.hasSpecs && body.specs && body.specs.length > 0) {
      await tx.feeItemSpec.createMany({
        data: body.specs.map((spec, index) => ({
          feeItemId: item.id,
          name: spec.name,
          description: spec.description ?? null,
          fixedAmountCents: spec.fixedAmountCents ?? null,
          unitPriceCents: spec.unitPriceCents ?? null,
          unitName: spec.unitName ?? null,
          isActive: spec.isActive ?? true,
          sortOrder: spec.sortOrder ?? index,
        })),
      });
    }

    return tx.feeItem.findUnique({
      where: { id: item.id },
      include: { specs: { orderBy: { sortOrder: 'asc' } } },
    });
  });

  return res.status(201).json({ feeItem });
});

// 更新费用项目
feeRouter.put('/:orgId/fee-items/:feeItemId', requirePermission('fee.manage'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const feeItemId = getParam(req, 'feeItemId');

  const feeItem = await prisma.feeItem.findFirst({
    where: { id: feeItemId, organizationId: orgId },
  });

  if (!feeItem) {
    throw new HttpError(404, 'FEE_ITEM_NOT_FOUND', '费用项目不存在');
  }

  const specSchema = z.object({
    id: z.string().optional(),
    name: z.string().trim().min(1).max(50),
    description: z.string().trim().max(200).optional().nullable(),
    fixedAmountCents: z.number().int().nonnegative().optional().nullable(),
    unitPriceCents: z.number().int().nonnegative().optional().nullable(),
    unitName: z.string().trim().max(20).optional().nullable(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  });

  const body = z
    .object({
      feeType: z.enum(['WATER', 'ELECTRICITY', 'MANAGEMENT', 'INTERNET', 'GAS', 'OTHER']).optional(),
      name: z.string().trim().min(1).max(100).optional(),
      mode: z.enum(['FIXED', 'METERED']).optional(),
      defaultFixedAmountCents: z.number().int().nonnegative().optional().nullable(),
      defaultUnitPriceCents: z.number().int().nonnegative().optional().nullable(),
      defaultUnitName: z.string().trim().max(20).optional().nullable(),
      defaultBillingTiming: z.enum(['PREPAID', 'POSTPAID']).optional().nullable(),
      hasSpecs: z.boolean().optional(),
      notes: z.string().trim().max(500).optional().nullable(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().nonnegative().optional(),
      specs: z.array(specSchema).optional(),
    })
    .parse(req.body);

  const updated = await prisma.$transaction(async (tx) => {
    // 更新费用项目
    const item = await tx.feeItem.update({
      where: { id: feeItemId },
      data: {
        ...(body.feeType && { feeType: body.feeType }),
        ...(body.name && { name: body.name }),
        ...(body.mode && { mode: body.mode }),
        ...(body.defaultFixedAmountCents !== undefined && { defaultFixedAmountCents: body.defaultFixedAmountCents }),
        ...(body.defaultUnitPriceCents !== undefined && { defaultUnitPriceCents: body.defaultUnitPriceCents }),
        ...(body.defaultUnitName !== undefined && { defaultUnitName: body.defaultUnitName }),
        ...(body.defaultBillingTiming !== undefined && { defaultBillingTiming: body.defaultBillingTiming }),
        ...(body.hasSpecs !== undefined && { hasSpecs: body.hasSpecs }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    // 更新规格
    if (body.specs !== undefined) {
      const existingSpecs = await tx.feeItemSpec.findMany({
        where: { feeItemId },
        select: { id: true },
      });
      const existingSpecIds = existingSpecs.map((s) => s.id);
      const newSpecIds = body.specs.filter((s) => s.id).map((s) => s.id!);

      // 删除不存在的规格
      const toDelete = existingSpecIds.filter((id) => !newSpecIds.includes(id));
      if (toDelete.length > 0) {
        await tx.feeItemSpec.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      // 创建或更新规格
      for (const spec of body.specs) {
        if (spec.id) {
          await tx.feeItemSpec.update({
            where: { id: spec.id },
            data: {
              name: spec.name,
              description: spec.description ?? null,
              fixedAmountCents: spec.fixedAmountCents ?? null,
              unitPriceCents: spec.unitPriceCents ?? null,
              unitName: spec.unitName ?? null,
              isActive: spec.isActive ?? true,
              sortOrder: spec.sortOrder ?? 0,
            },
          });
        } else {
          await tx.feeItemSpec.create({
            data: {
              feeItemId,
              name: spec.name,
              description: spec.description ?? null,
              fixedAmountCents: spec.fixedAmountCents ?? null,
              unitPriceCents: spec.unitPriceCents ?? null,
              unitName: spec.unitName ?? null,
              isActive: spec.isActive ?? true,
              sortOrder: spec.sortOrder ?? 0,
            },
          });
        }
      }
    }

    return tx.feeItem.findUnique({
      where: { id: feeItemId },
      include: { specs: { orderBy: { sortOrder: 'asc' } } },
    });
  });

  return res.json({ feeItem: updated });
});

// 删除费用项目
feeRouter.delete('/:orgId/fee-items/:feeItemId', requirePermission('fee.manage'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const feeItemId = getParam(req, 'feeItemId');

  const feeItem = await prisma.feeItem.findFirst({
    where: { id: feeItemId, organizationId: orgId },
  });

  if (!feeItem) {
    throw new HttpError(404, 'FEE_ITEM_NOT_FOUND', '费用项目不存在');
  }

  await prisma.feeItem.delete({
    where: { id: feeItemId },
  });

  return res.json({ message: '已删除' });
});
