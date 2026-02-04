import type { NextFunction, Request, Response } from 'express';

import { prisma } from '../db';
import { HttpError } from '../http/httpError';
import { getParam } from '../http/params';

export async function requireOrgMember(req: Request, _res: Response, next: NextFunction) {
  const userId = req.auth?.userId;
  if (!userId) {
    return next(new HttpError(401, 'UNAUTHORIZED', '未登录或登录已过期'));
  }

  try {
    const orgId = getParam(req, 'orgId');
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      return next(new HttpError(403, 'FORBIDDEN', '你不是该组织成员或已被禁用'));
    }

    const permissionKeys = new Set<string>();
    for (const mr of membership.roles) {
      for (const rp of mr.role.permissions) {
        permissionKeys.add(rp.permission.key);
      }
    }

    req.org = {
      organizationId: orgId,
      membershipId: membership.id,
      permissionKeys: [...permissionKeys],
    };

    return next();
  } catch (err) {
    return next(err);
  }
}

