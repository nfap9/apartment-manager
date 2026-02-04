import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

import { PERMISSION_KEYS } from '../src/rbac/permissionKeys';

import { PrismaClient } from './generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPhone = process.env.SEED_ADMIN_PHONE ?? '13800000000';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin123456';
  const orgName = process.env.SEED_ORG_NAME ?? '示例组织';

  await Promise.all(
    PERMISSION_KEYS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key },
      }),
    ),
  );

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      passwordHash,
      displayName: '管理员',
    },
    create: {
      phone: adminPhone,
      passwordHash,
      displayName: '管理员',
    },
  });

  const org =
    (await prisma.organization.findFirst({ where: { name: orgName } })) ??
    (await prisma.organization.create({ data: { name: orgName } }));

  const membership = await prisma.membership.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
    update: { status: 'ACTIVE' },
    create: { userId: admin.id, organizationId: org.id, status: 'ACTIVE' },
  });

  const adminRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Admin' } },
    update: { isSystem: true },
    create: { organizationId: org.id, name: 'Admin', isSystem: true },
  });

  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...PERMISSION_KEYS] } },
  });

  await prisma.rolePermission.createMany({
    data: permissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  await prisma.membershipRole.createMany({
    data: [{ membershipId: membership.id, roleId: adminRole.id }],
    skipDuplicates: true,
  });

  console.log('[seed] ok', {
    adminPhone,
    adminPassword,
    organizationId: org.id,
    organizationName: org.name,
  });
}

main()
  .catch((err) => {
    console.error('[seed] failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

