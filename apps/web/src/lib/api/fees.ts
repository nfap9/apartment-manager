import { api } from '../api';
import type { FeeItem, FeeItemSpec } from './types';

export type FeeItemResponse = {
  feeItems: FeeItem[];
};

export type FeeItemCreateRequest = {
  feeType: 'WATER' | 'ELECTRICITY' | 'MANAGEMENT' | 'INTERNET' | 'GAS' | 'OTHER';
  name: string;
  mode: 'FIXED' | 'METERED';
  defaultFixedAmountCents?: number | null;
  defaultUnitPriceCents?: number | null;
  defaultUnitName?: string | null;
  defaultBillingTiming?: 'PREPAID' | 'POSTPAID' | null;
  hasSpecs?: boolean;
  notes?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  specs?: Array<{
    name: string;
    description?: string | null;
    fixedAmountCents?: number | null;
    unitPriceCents?: number | null;
    unitName?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  }>;
};

export type FeeItemUpdateRequest = Partial<FeeItemCreateRequest> & {
  specs?: Array<{
    id?: string;
    name: string;
    description?: string | null;
    fixedAmountCents?: number | null;
    unitPriceCents?: number | null;
    unitName?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  }>;
};

/**
 * 费用管理相关 API
 */
export const feesApi = {
  /**
   * 获取费用项目列表
   */
  getFeeItems: async (orgId: string): Promise<FeeItemResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/fee-items`);
    return r.data;
  },

  /**
   * 创建费用项目
   */
  createFeeItem: async (orgId: string, data: FeeItemCreateRequest): Promise<{ feeItem: FeeItem }> => {
    const r = await api.post(`/api/orgs/${orgId}/fee-items`, data);
    return r.data;
  },

  /**
   * 更新费用项目
   */
  updateFeeItem: async (orgId: string, feeItemId: string, data: FeeItemUpdateRequest): Promise<{ feeItem: FeeItem }> => {
    const r = await api.put(`/api/orgs/${orgId}/fee-items/${feeItemId}`, data);
    return r.data;
  },

  /**
   * 删除费用项目
   */
  deleteFeeItem: async (orgId: string, feeItemId: string): Promise<void> => {
    await api.delete(`/api/orgs/${orgId}/fee-items/${feeItemId}`);
  },
};
