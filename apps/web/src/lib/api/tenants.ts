import { api } from '../api';
import type { TenantsResponse } from './types';

/**
 * 租客相关 API
 */
export const tenantsApi = {
  /**
   * 获取租客列表
   */
  getList: async (orgId: string, query?: string): Promise<TenantsResponse> => {
    const url = `/api/orgs/${orgId}/tenants${query ? `?q=${encodeURIComponent(query)}` : ''}`;
    const r = await api.get(url);
    return r.data;
  },

  /**
   * 创建租客
   */
  create: async (
    orgId: string,
    data: { name: string; phone: string; idNumber?: string | null },
  ): Promise<void> => {
    await api.post(`/api/orgs/${orgId}/tenants`, data);
  },

  /**
   * 更新租客
   */
  update: async (
    orgId: string,
    tenantId: string,
    data: { name: string; phone: string; idNumber?: string | null },
  ): Promise<void> => {
    await api.put(`/api/orgs/${orgId}/tenants/${tenantId}`, data);
  },
};
