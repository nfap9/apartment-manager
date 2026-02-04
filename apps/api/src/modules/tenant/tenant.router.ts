import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../db';
import { HttpError } from '../../http/httpError';
import { getParam } from '../../http/params';
import { requireAuth } from '../../middleware/requireAuth';
import { requireOrgMember } from '../../middleware/requireOrgMember';
import { requirePermission } from '../../middleware/requirePermission';

export const tenantRouter = Router();

tenantRouter.use('/:orgId', requireAuth, requireOrgMember);

const tenantSchema = z.object({
  name: z.string().trim().min(1).max(50),
  phone: z.string().trim().min(6).max(20).regex(/^[0-9]+$/, '手机号格式不正确'),
  idNumber: z.string().trim().min(6).max(30).optional().nullable(),
});

tenantRouter.get('/:orgId/tenants', requirePermission('tenant.read'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const tenants = await prisma.tenant.findMany({
    where: {
      organizationId: orgId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ tenants });
});

tenantRouter.post('/:orgId/tenants', requirePermission('tenant.write'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const body = tenantSchema.parse(req.body);

  try {
    const tenant = await prisma.tenant.create({
      data: {
        organizationId: orgId,
        name: body.name,
        phone: body.phone,
        idNumber: body.idNumber ?? null,
      },
    });
    return res.status(201).json({ tenant });
  } catch (err) {
    throw new HttpError(409, 'TENANT_CREATE_FAILED', '创建租客失败（可能手机号重复）', err);
  }
});

tenantRouter.get('/:orgId/tenants/:tenantId', requirePermission('tenant.read'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const tenantId = getParam(req, 'tenantId');

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, organizationId: orgId },
  });
  if (!tenant) {
    throw new HttpError(404, 'TENANT_NOT_FOUND', '租客不存在');
  }

  return res.json({ tenant });
});

tenantRouter.put('/:orgId/tenants/:tenantId', requirePermission('tenant.write'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const tenantId = getParam(req, 'tenantId');
  const body = tenantSchema.partial().parse(req.body);

  const exists = await prisma.tenant.findFirst({ where: { id: tenantId, organizationId: orgId } });
  if (!exists) {
    throw new HttpError(404, 'TENANT_NOT_FOUND', '租客不存在');
  }

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: body.name,
      phone: body.phone,
      idNumber: body.idNumber,
    },
  });

  return res.json({ tenant });
});

