import { api } from '../api';
import type { KpisResponse, VacantRoomsResponse, LeaseExpiringResponse } from './types';

/**
 * 看板相关 API
 */
export const dashboardApi = {
  /**
   * 获取 KPI 数据
   */
  getKpis: async (orgId: string): Promise<KpisResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/dashboard/kpis`);
    return r.data;
  },

  /**
   * 获取空房列表
   */
  getVacantRooms: async (orgId: string): Promise<VacantRoomsResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/dashboard/vacant-rooms`);
    return r.data;
  },

  /**
   * 获取即将到期的租约
   */
  getLeaseExpiring: async (orgId: string, days: number = 30): Promise<LeaseExpiringResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/dashboard/lease-expiring?days=${days}`);
    return r.data;
  },
};
