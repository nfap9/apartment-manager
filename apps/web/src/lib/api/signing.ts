import { api } from '../api';
import type { AvailableRoomsResponse, FeeTemplateResponse } from './types';

/**
 * 签约相关 API
 */
export const signingApi = {
  /**
   * 获取可租房间列表
   */
  getAvailableRooms: async (orgId: string): Promise<AvailableRoomsResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/signing/available-rooms`);
    return r.data;
  },

  /**
   * 获取费用模板
   */
  getFeeTemplate: async (
    orgId: string,
    apartmentId: string,
  ): Promise<FeeTemplateResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/signing/fee-templates/${apartmentId}`);
    return r.data;
  },

  /**
   * 创建签约（一站式签约）
   */
  create: async (
    orgId: string,
    data: {
      roomId: string;
      tenantId?: string;
      newTenant?: { name: string; phone: string; idNumber?: string | null };
      startDate: Date;
      endDate: Date;
      depositCents: number;
      baseRentCents: number;
      billingCycleMonths: number;
      rentIncreaseType: 'NONE' | 'FIXED' | 'PERCENT';
      rentIncreaseValue: number;
      rentIncreaseIntervalMonths: number;
      notes?: string | null;
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
    },
  ): Promise<void> => {
    await api.post(`/api/orgs/${orgId}/signing`, data);
  },
};
