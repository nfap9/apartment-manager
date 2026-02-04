import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { prisma } from '../../db';
import { HttpError } from '../../http/httpError';
import { getParam } from '../../http/params';
import { requireAuth } from '../../middleware/requireAuth';
import { requireOrgMember } from '../../middleware/requireOrgMember';
import { requirePermission } from '../../middleware/requirePermission';
import { PERMISSION_KEYS } from '../../rbac/permissionKeys';

export const orgRouter = Router();

async function ensurePermissions() {
  await Promise.all(
    PERMISSION_KEYS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key },
      }),
    ),
  );
}

orgRouter.get('/', requireAuth, async (req, res) => {
  const userId = req.auth!.userId;

  const memberships = await prisma.membership.findMany({
    where: { userId, status: 'ACTIVE' },
    include: { organization: true },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({
    organizations: memberships.map((m) => ({
      membershipId: m.id,
      organizationId: m.organization.id,
      organizationName: m.organization.name,
    })),
  });
});

orgRouter.get('/:orgId/me', requireAuth, requireOrgMember, async (req, res) => {
  const orgId = getParam(req, 'orgId');

  return res.json({
    organizationId: orgId,
    membershipId: req.org!.membershipId,
    permissionKeys: req.org!.permissionKeys,
  });
});

orgRouter.post('/', requireAuth, async (req, res) => {
  const body = z.object({ name: z.string().trim().min(1).max(100) }).parse(req.body);
  const userId = req.auth!.userId;

  await ensurePermissions();

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: body.name } });

    const membership = await tx.membership.create({
      data: { userId, organizationId: org.id, status: 'ACTIVE' },
    });

    const adminRole = await tx.role.create({
      data: { organizationId: org.id, name: 'Admin', isSystem: true },
    });

    const permissions = await tx.permission.findMany({
      where: { key: { in: [...PERMISSION_KEYS] } },
    });

    await tx.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
      skipDuplicates: true,
    });

    await tx.membershipRole.createMany({
      data: [{ membershipId: membership.id, roleId: adminRole.id }],
      skipDuplicates: true,
    });

    return { org, membershipId: membership.id };
  });

  return res.status(201).json({
    organization: { id: result.org.id, name: result.org.name },
    membershipId: result.membershipId,
  });
});

orgRouter.post('/:orgId/invites', requireAuth, requireOrgMember, requirePermission('org.invite'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const userId = req.auth!.userId;

  const body = z
    .object({
      maxUses: z.number().int().positive().optional(),
      expiresInDays: z.number().int().positive().max(365).optional(),
    })
    .parse(req.body ?? {});

  const expiresAt = body.expiresInDays
    ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const invite = await prisma.orgInvite.create({
    data: {
      organizationId: orgId,
      createdByUserId: userId,
      code: nanoid(10),
      maxUses: body.maxUses ?? null,
      expiresAt,
    },
    select: { code: true, expiresAt: true, maxUses: true, usedCount: true, createdAt: true },
  });

  return res.status(201).json({ invite });
});

orgRouter.post('/:orgId/invites/accept', requireAuth, async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const userId = req.auth!.userId;

  const body = z.object({ code: z.string().trim().min(1).max(50) }).parse(req.body);

  const invite = await prisma.orgInvite.findFirst({
    where: { organizationId: orgId, code: body.code },
  });
  if (!invite) {
    throw new HttpError(404, 'INVITE_NOT_FOUND', '邀请码不存在');
  }
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    throw new HttpError(400, 'INVITE_EXPIRED', '邀请码已过期');
  }
  if (invite.maxUses != null && invite.usedCount >= invite.maxUses) {
    throw new HttpError(400, 'INVITE_MAX_USES', '邀请码已被用完');
  }

  const membership = await prisma.$transaction(async (tx) => {
    const m = await tx.membership.upsert({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      update: { status: 'ACTIVE' },
      create: { userId, organizationId: orgId, status: 'ACTIVE' },
    });

    const created = await tx.orgInviteUse.createMany({
      data: [{ inviteId: invite.id, userId }],
      skipDuplicates: true,
    });

    if (created.count === 1) {
      await tx.orgInvite.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    return m;
  });

  return res.json({
    membershipId: membership.id,
    organizationId: orgId,
  });
});

orgRouter.get(
  '/:orgId/permissions',
  requireAuth,
  requireOrgMember,
  requirePermission('org.role.manage'),
  async (req, res) => {
    const permissions = await prisma.permission.findMany({ orderBy: { key: 'asc' } });
    return res.json({ permissions: permissions.map((p) => ({ id: p.id, key: p.key, description: p.description })) });
  },
);

orgRouter.get('/:orgId/roles', requireAuth, requireOrgMember, requirePermission('org.role.manage'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const roles = await prisma.role.findMany({
    where: { organizationId: orgId },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });
  return res.json({ roles });
});

orgRouter.post('/:orgId/roles', requireAuth, requireOrgMember, requirePermission('org.role.manage'), async (req, res) => {
  const orgId = getParam(req, 'orgId');
  const body = z
    .object({
      name: z.string().trim().min(1).max(50),
      description: z.string().trim().max(200).optional(),
    })
    .parse(req.body);

  try {
    const role = await prisma.role.create({
      data: { organizationId: orgId, name: body.name, description: body.description },
    });
    return res.status(201).json({ role });
  } catch (err) {
    throw new HttpError(409, 'ROLE_EXISTS', '角色名称已存在', err);
  }
});

orgRouter.get(
  '/:orgId/roles/:roleId/permissions',
  requireAuth,
  requireOrgMember,
  requirePermission('org.role.manage'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const roleId = getParam(req, 'roleId');

    const role = await prisma.role.findFirst({
      where: { id: roleId, organizationId: orgId },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) {
      throw new HttpError(404, 'ROLE_NOT_FOUND', '角色不存在');
    }

    const permissionKeys = role.permissions.map((rp) => rp.permission.key);
    return res.json({ permissionKeys });
  },
);

orgRouter.put(
  '/:orgId/roles/:roleId/permissions',
  requireAuth,
  requireOrgMember,
  requirePermission('org.role.manage'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const roleId = getParam(req, 'roleId');
    const body = z
      .object({
        permissionKeys: z.array(z.string().min(1)).max(500),
      })
      .parse(req.body);

    const role = await prisma.role.findFirst({ where: { id: roleId, organizationId: orgId } });
    if (!role) {
      throw new HttpError(404, 'ROLE_NOT_FOUND', '角色不存在');
    }

    // 如果是管理员角色，强制保留组织管理和角色管理权限
    const isAdminRole = role.name === 'Admin' && role.isSystem;
    const requiredPermissions = isAdminRole ? ['org.manage', 'org.role.manage'] : [];
    
    // 确保必需权限包含在请求的权限列表中
    const finalPermissionKeys = [...new Set([...body.permissionKeys, ...requiredPermissions])];

    const permissions = await prisma.permission.findMany({ where: { key: { in: finalPermissionKeys } } });
    const permissionIds = permissions.map((p) => p.id);

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      });
    });

    return res.json({ ok: true });
  },
);

orgRouter.get(
  '/:orgId/members',
  requireAuth,
  requireOrgMember,
  requirePermission('org.member.manage'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const members = await prisma.membership.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' },
      include: {
        user: { select: { id: true, phone: true, displayName: true } },
        roles: { include: { role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({
      members: members.map((m) => ({
        membershipId: m.id,
        user: m.user,
        roles: m.roles.map((r) => ({ id: r.role.id, name: r.role.name })),
      })),
    });
  },
);

orgRouter.put(
  '/:orgId/members/:memberId/roles',
  requireAuth,
  requireOrgMember,
  requirePermission('org.member.manage'),
  async (req, res) => {
    const orgId = getParam(req, 'orgId');
    const memberId = getParam(req, 'memberId');
    const body = z.object({ roleIds: z.array(z.string().min(1)).max(50) }).parse(req.body);

    const membership = await prisma.membership.findFirst({ where: { id: memberId, organizationId: orgId } });
    if (!membership) {
      throw new HttpError(404, 'MEMBER_NOT_FOUND', '成员不存在');
    }

    const roles = await prisma.role.findMany({ where: { organizationId: orgId, id: { in: body.roleIds } } });
    if (roles.length !== body.roleIds.length) {
      throw new HttpError(400, 'INVALID_ROLE', '包含无效的角色');
    }

    await prisma.$transaction(async (tx) => {
      await tx.membershipRole.deleteMany({ where: { membershipId: membership.id } });
      await tx.membershipRole.createMany({
        data: roles.map((r) => ({ membershipId: membership.id, roleId: r.id })),
        skipDuplicates: true,
      });
    });

    return res.json({ ok: true });
  },
);

