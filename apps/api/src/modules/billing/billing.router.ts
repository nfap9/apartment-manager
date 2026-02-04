import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../db';
import { HttpError } from '../../http/httpError';
import { getParam } from '../../http/params';
import { requireAuth } from '../../middleware/requireAuth';
import { requireOrgMember } from '../../middleware/requireOrgMember';
import { requirePermission } from '../../middleware/requirePermission';

import { confirmInvoiceItemReading, generateDueInvoices } from './billing.service';

export const billingRouter = Router();

billingRouter.use('/:orgId', requireAuth, requireOrgMember);

billingRouter.post('/:orgId/billing/run', requirePermission('billing.manage'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const result = await generateDueInvoices({ organizationId: orgId, now: new Date() });
  return res.json(result);
});

billingRouter.get('/:orgId/invoices', requirePermission('billing.read'), async (req, res) => {
  const orgId = getParam(req, 'orgId');

  const query = z
    .object({
      status: z.enum(['DRAFT', 'ISSUED', 'PAID', 'VOID', 'OVERDUE']).optional(),
      leaseId: z.string().min(1).optional(),
    })
    .parse({
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      leaseId: typeof req.query.leaseId === 'string' ? req.query.leaseId : undefined,
    });

  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.leaseId ? { leaseId: query.leaseId } : {}),
    },
    include: {
      lease: {
        include: {
          room: { select: { id: true, name: true, apartment: { select: { id: true, name: true } } } },
          tenant: { select: { id: true, name: true, phone: true } },
        },
      },
      items: true,
    },
    orderBy: { issuedAt: 'desc' },
  });

  return res.json({ invoices });
});

billingRouter.get('/:orgId/invoices/:invoiceId', requirePermission('billing.read'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const invoiceId = getParam(req, 'invoiceId');

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
    include: {
      lease: { include: { room: { include: { apartment: true } }, tenant: true, charges: true } },
      items: true,
    },
  });
  if (!invoice) throw new HttpError(404, 'INVOICE_NOT_FOUND', '账单不存在');

  return res.json({ invoice });
});

billingRouter.post(
  '/:orgId/invoices/:invoiceId/items/:itemId/confirm-reading',
  requirePermission('billing.manage'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const invoiceId = getParam(req, 'invoiceId');
    const itemId = getParam(req, 'itemId');

    const body = z
      .object({
        meterStart: z.number().nonnegative().optional(),
        meterEnd: z.number().nonnegative(),
      })
      .parse(req.body);

    const result = await confirmInvoiceItemReading({
      organizationId: orgId,
      invoiceId,
      itemId,
      meterStart: body.meterStart,
      meterEnd: body.meterEnd,
    });

    return res.json(result);
  },
);

