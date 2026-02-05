import { api } from '../api';
import type { OrgMeResponse } from '../apiTypes';

/**
 * 组织相关 API
 */
export const orgApi = {
  /**
   * 获取当前用户在组织中的信息
   */
  getMe: async (orgId: string): Promise<OrgMeResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/me`);
    return r.data;
  },
};
