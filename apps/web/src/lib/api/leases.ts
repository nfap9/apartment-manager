import { api } from '../api';
import type { LeasesResponse, Lease } from './types';

/**
 * 租约相关 API
 */
export const leasesApi = {
  /**
   * 获取租约列表
   */
  getList: async (orgId: string): Promise<LeasesResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/leases`);
    return r.data;
  },

  /**
   * 创建租约
   */
  create: async (
    orgId: string,
    data: {
      roomId: string;
      tenantId?: string;
      newTenant?: { name: string; phone: string; idNumber?: string | null };
      startDate: Date;
      endDate: Date;
      billingCycleMonths: number;
      depositCents: number;
      baseRentCents: number;
      rentIncreaseType: 'NONE' | 'FIXED' | 'PERCENT';
      rentIncreaseValue: number;
      rentIncreaseIntervalMonths: number;
      charges: Array<{
        name: string;
        feeType: string;
        mode: 'FIXED' | 'METERED';
        fixedAmountCents?: number | null;
        unitPriceCents?: number | null;
        unitName?: string | null;
        billingCycleMonths: number;
        isActive: boolean;
      }>;
      notes?: string | null;
    },
  ): Promise<void> => {
    await api.post(`/api/orgs/${orgId}/leases`, data);
  },

  /**
   * 更新租约状态
   */
  updateStatus: async (
    orgId: string,
    leaseId: string,
    status: Lease['status'],
  ): Promise<void> => {
    await api.put(`/api/orgs/${orgId}/leases/${leaseId}`, { status });
  },
};
