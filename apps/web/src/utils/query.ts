import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/api/queryKeys';

/**
 * React Query 相关工具函数
 */

/**
 * 使查询失效的工具函数
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return {
    /**
     * 使公寓相关查询失效
     */
    invalidateApartments: (orgId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apartments.all(orgId) });
    },

    /**
     * 使公寓详情查询失效
     */
    invalidateApartmentDetail: (orgId: string, apartmentId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apartments.detail(orgId, apartmentId) });
    },

    /**
     * 使租客查询失效
     */
    invalidateTenants: (orgId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all(orgId) });
    },

    /**
     * 使租约查询失效
     */
    invalidateLeases: (orgId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leases.all(orgId) });
    },

    /**
     * 使账单查询失效
     */
    invalidateInvoices: (orgId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all(orgId) });
    },
  };
}
