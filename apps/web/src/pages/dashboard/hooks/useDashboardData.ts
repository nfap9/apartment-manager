import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth';
import type { KpisResponse, VacantRoomsResponse, LeaseExpiringResponse, RentStatusData } from '../types';

export function useDashboardData() {
  const orgId = useAuthStore((s) => s.activeOrgId);

  const kpisQuery = useQuery({
    queryKey: ['dashboard', 'kpis', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/dashboard/kpis`);
      return r.data as KpisResponse;
    },
  });

  const vacantQuery = useQuery({
    queryKey: ['dashboard', 'vacant', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/dashboard/vacant-rooms`);
      return r.data as VacantRoomsResponse;
    },
  });

  const expiringQuery = useQuery({
    queryKey: ['dashboard', 'expiring', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/dashboard/lease-expiring?days=30`);
      return r.data as LeaseExpiringResponse;
    },
  });

  const rentStatusQuery = useQuery<RentStatusData, Error>({
    queryKey: ['dashboard', 'rent-status', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/invoices`);
      const invoices = r.data.invoices || [];
      const now = new Date();

      // 待交房租（已发布但未支付，且未逾期）
      const pendingRent = invoices.filter(
        (inv: any) => inv.status === 'ISSUED' && new Date(inv.dueDate) >= now
      );

      // 已交房租（已支付）
      const paidRent = invoices.filter((inv: any) => inv.status === 'PAID');

      // 即将到期（7天内到期）
      const soonDue = invoices.filter((inv: any) => {
        if (inv.status !== 'ISSUED') return false;
        const dueDate = new Date(inv.dueDate);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 7;
      });

      return {
        pendingCount: pendingRent.length,
        pendingAmount: pendingRent.reduce((sum: number, inv: any) => sum + (inv.totalAmountCents || 0), 0),
        paidCount: paidRent.length,
        paidAmount: paidRent.reduce((sum: number, inv: any) => sum + (inv.totalAmountCents || 0), 0),
        soonDueCount: soonDue.length,
        soonDueAmount: soonDue.reduce((sum: number, inv: any) => sum + (inv.totalAmountCents || 0), 0),
        soonDueList: soonDue.slice(0, 10),
      };
    },
  });

  return {
    orgId,
    kpisQuery,
    vacantQuery,
    expiringQuery,
    rentStatusQuery,
  };
}
