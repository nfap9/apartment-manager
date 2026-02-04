import type { PrismaClient } from '../../prisma/generated/prisma/client';

export async function resetDb(prisma: PrismaClient) {
  // Child -> parent, to satisfy FK constraints
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();

  await prisma.notification.deleteMany();

  await prisma.leaseCharge.deleteMany();
  await prisma.lease.deleteMany();

  await prisma.roomPricingPlan.deleteMany();
  await prisma.room.deleteMany();

  await prisma.apartmentFeePricing.deleteMany();
  await prisma.apartmentUpstream.deleteMany();
  await prisma.apartment.deleteMany();

  await prisma.tenant.deleteMany();

  await prisma.orgInviteUse.deleteMany();
  await prisma.orgInvite.deleteMany();

  await prisma.membershipRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();

  await prisma.membership.deleteMany();
  await prisma.organization.deleteMany();

  await prisma.auditLog.deleteMany();

  await prisma.user.deleteMany();
  await prisma.permission.deleteMany();
}

