/**
 * 统一管理所有 React Query 的查询键
 */

export const queryKeys = {
  // 认证相关
  auth: {
    me: ['auth', 'me'] as const,
  },

  // 组织相关
  org: {
    me: (orgId: string) => ['org', 'me', orgId] as const,
  },

  // 公寓相关
  apartments: {
    all: (orgId: string) => ['apartments', orgId] as const,
    detail: (orgId: string, apartmentId: string) =>
      ['apartment', orgId, apartmentId] as const,
    upstream: (orgId: string, apartmentId: string) =>
      ['apartment', 'upstream', orgId, apartmentId] as const,
    feePricings: (orgId: string, apartmentId: string) =>
      ['apartment', 'fee', orgId, apartmentId] as const,
  },

  // 房间相关
  rooms: {
    byApartment: (orgId: string, apartmentId: string) =>
      ['roomsByApartment', orgId, apartmentId] as const,
    pricingPlans: (orgId: string, roomId: string) =>
      ['room', 'pricingPlans', orgId, roomId] as const,
    facilities: (orgId: string, roomId: string) =>
      ['room', 'facilities', orgId, roomId] as const,
  },

  // 租客相关
  tenants: {
    all: (orgId: string, query?: string) =>
      ['tenants', orgId, query].filter(Boolean) as readonly string[],
  },

  // 租约相关
  leases: {
    all: (orgId: string) => ['leases', orgId] as const,
  },

  // 账单相关
  invoices: {
    all: (orgId: string) => ['invoices', orgId] as const,
    detail: (orgId: string, invoiceId: string) =>
      ['invoice', orgId, invoiceId] as const,
  },

  // 签约相关
  signing: {
    availableRooms: (orgId: string) =>
      ['signing-available-rooms', orgId] as const,
    feeTemplates: (orgId: string, apartmentId: string) =>
      ['signing', 'fee-templates', orgId, apartmentId] as const,
  },

  // 看板相关
  dashboard: {
    kpis: (orgId: string) => ['dashboard', 'kpis', orgId] as const,
    vacantRooms: (orgId: string) => ['dashboard', 'vacant', orgId] as const,
    leaseExpiring: (orgId: string) => ['dashboard', 'expiring', orgId] as const,
  },
} as const;
