import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../db';
import { HttpError } from '../../http/httpError';
import { getParam } from '../../http/params';
import { requireAuth } from '../../middleware/requireAuth';
import { requireOrgMember } from '../../middleware/requireOrgMember';
import { requirePermission } from '../../middleware/requirePermission';

export const notificationRouter = Router();

notificationRouter.use('/:orgId', requireAuth, requireOrgMember, requirePermission('notification.read'));

notificationRouter.get('/:orgId/notifications', async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const userId = req.auth!.userId;

  const query = z
    .object({
      unreadOnly: z.boolean().optional(),
      limit: z.number().int().positive().max(200).optional(),
    })
    .parse({
      unreadOnly: req.query.unreadOnly === 'true' ? true : undefined,
      limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
    });

  const notifications = await prisma.notification.findMany({
    where: {
      organizationId: orgId,
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
  });

  return res.json({ notifications });
});

notificationRouter.post('/:orgId/notifications/:notificationId/read', async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const notificationId = getParam(req, 'notificationId');
  const userId = req.auth!.userId;

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, organizationId: orgId, userId },
  });
  if (!notification) throw new HttpError(404, 'NOTIFICATION_NOT_FOUND', '通知不存在');

  if (notification.readAt) return res.json({ ok: true });

  await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });

  return res.json({ ok: true });
});

