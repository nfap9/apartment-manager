import { useQuery } from '@tanstack/react-query';
import { useOrgId } from '../../../hooks/useOrgId';
import { usePermissions } from '../../../hooks/usePermissions';
import { apartmentsApi, roomsApi } from '../../../lib/api/index';
import { queryKeys } from '../../../lib/api/queryKeys';

/**
 * 公寓详情页面的数据获取 Hook
 */
export function useApartmentDetail(apartmentId: string | undefined) {
  const orgId = useOrgId();
  const { hasPermission } = usePermissions();

  const canUpstreamRead = hasPermission('apartment.upstream.read');
  const canUpstreamWrite = hasPermission('apartment.upstream.write');
  const canApartmentWrite = hasPermission('apartment.write');
  const canRoomWrite = hasPermission('room.write');
  const canPricingManage = hasPermission('room.pricing.manage');

  const apartmentQuery = useQuery({
    queryKey: queryKeys.apartments.detail(orgId!, apartmentId!),
    enabled: !!orgId && !!apartmentId,
    queryFn: () => apartmentsApi.getDetail(orgId!, apartmentId!),
  });

  const upstreamQuery = useQuery({
    queryKey: queryKeys.apartments.upstream(orgId!, apartmentId!),
    enabled: !!orgId && !!apartmentId && canUpstreamRead,
    queryFn: () => apartmentsApi.getUpstream(orgId!, apartmentId!),
  });

  const feeQuery = useQuery({
    queryKey: queryKeys.apartments.feePricings(orgId!, apartmentId!),
    enabled: !!orgId && !!apartmentId,
    queryFn: () => apartmentsApi.getFeePricings(orgId!, apartmentId!),
  });

  return {
    orgId,
    apartment: apartmentQuery.data?.apartment ?? null,
    upstream: upstreamQuery.data?.upstream ?? null,
    feePricings: feeQuery.data?.feePricings ?? [],
    isLoading: apartmentQuery.isLoading,
    upstreamLoading: upstreamQuery.isLoading,
    feeLoading: feeQuery.isLoading,
    canUpstreamRead,
    canUpstreamWrite,
    canApartmentWrite,
    canRoomWrite,
    canPricingManage,
  };
}

/**
 * 房间价格方案数据获取 Hook
 */
export function useRoomPricingPlans(roomId: string | null, enabled: boolean) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: queryKeys.rooms.pricingPlans(orgId!, roomId!),
    enabled: !!orgId && !!roomId && enabled,
    queryFn: () => roomsApi.getPricingPlans(orgId!, roomId!),
  });
}

/**
 * 房间设施数据获取 Hook
 */
export function useRoomFacilities(roomId: string | null, enabled: boolean) {
  const orgId = useOrgId();

  return useQuery({
    queryKey: queryKeys.rooms.facilities(orgId!, roomId!),
    enabled: !!orgId && !!roomId && enabled,
    queryFn: () => roomsApi.getFacilities(orgId!, roomId!),
  });
}
