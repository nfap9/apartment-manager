export const PERMISSIONS = [
  // org & rbac
  'org.manage',
  'org.invite',
  'org.role.manage',
  'org.member.manage',

  // apartment
  'apartment.read',
  'apartment.write',
  'apartment.upstream.read',
  'apartment.upstream.write',

  // room
  'room.read',
  'room.write',
  'room.pricing.manage',

  // tenant & lease
  'tenant.read',
  'tenant.write',
  'lease.read',
  'lease.write',

  // billing
  'billing.read',
  'billing.manage',

  // fee
  'fee.manage',

  // notification & dashboard
  'notification.read',
  'dashboard.read',
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

