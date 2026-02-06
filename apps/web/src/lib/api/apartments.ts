import { api } from '../api';
import type {
  ApartmentResponse,
  ApartmentsResponse,
  Upstream,
  UpstreamResponse,
  FeePricingResponse,
  RoomsResponse,
  PricingPlansResponse,
  FacilitiesResponse,
} from './types';

/**
 * 公寓相关 API
 */
export const apartmentsApi = {
  /**
   * 获取公寓列表
   */
  getList: async (orgId: string): Promise<ApartmentsResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/apartments`);
    return r.data;
  },

  /**
   * 获取公寓详情
   */
  getDetail: async (orgId: string, apartmentId: string): Promise<ApartmentResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/apartments/${apartmentId}`);
    return r.data;
  },

  /**
   * 创建公寓
   */
  create: async (
    orgId: string,
    data: { name: string; address: string; totalArea?: number; floor?: number },
  ): Promise<void> => {
    await api.post(`/api/orgs/${orgId}/apartments`, data);
  },

  /**
   * 更新公寓
   */
  update: async (
    orgId: string,
    apartmentId: string,
    data: { name: string; address: string; totalArea?: number; floor?: number },
  ): Promise<void> => {
    await api.put(`/api/orgs/${orgId}/apartments/${apartmentId}`, data);
  },

  /**
   * 获取上游信息
   */
  getUpstream: async (orgId: string, apartmentId: string): Promise<UpstreamResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/apartments/${apartmentId}/upstream`);
    return r.data;
  },

  /**
   * 更新上游信息
   */
  updateUpstream: async (
    orgId: string,
    apartmentId: string,
    data: Partial<Upstream>,
  ): Promise<void> => {
    await api.put(`/api/orgs/${orgId}/apartments/${apartmentId}/upstream`, data);
  },

  /**
   * 获取费用定价
   */
  getFeePricings: async (
    orgId: string,
    apartmentId: string,
  ): Promise<FeePricingResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/apartments/${apartmentId}/fee-pricings`);
    return r.data;
  },

  /**
   * 更新费用定价
   */
  updateFeePricings: async (
    orgId: string,
    apartmentId: string,
    data: Array<Partial<FeePricingResponse['feePricings'][0]>>,
  ): Promise<void> => {
    await api.put(`/api/orgs/${orgId}/apartments/${apartmentId}/fee-pricings`, data);
  },

  /**
   * 获取房间列表
   */
  getRooms: async (orgId: string, apartmentId: string): Promise<RoomsResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/apartments/${apartmentId}/rooms`);
    return r.data;
  },

  /**
   * 创建房间
   */
  createRoom: async (
    orgId: string,
    apartmentId: string,
    data: {
      name: string;
      layout?: string | null;
      area?: number | null;
      notes?: string | null;
      isActive?: boolean;
      isRented?: boolean;
    },
  ): Promise<void> => {
    await api.post(`/api/orgs/${orgId}/apartments/${apartmentId}/rooms`, data);
  },

  /**
   * 下载房间导入模板
   */
  downloadImportTemplate: async (orgId: string, apartmentId: string): Promise<Blob> => {
    const response = await api.get(
      `/api/orgs/${orgId}/apartments/${apartmentId}/rooms/import-template`,
      {
        responseType: 'blob',
        validateStatus: (status) => status === 200,
      },
    );
    return response.data as Blob;
  },

  /**
   * 导入房间
   */
  importRooms: async (
    orgId: string,
    apartmentId: string,
    file: File,
    duplicateStrategy?: 'skip' | 'overwrite' | 'cancel',
  ): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const url = `/api/orgs/${orgId}/apartments/${apartmentId}/rooms/import${
      duplicateStrategy ? `?duplicateStrategy=${duplicateStrategy}` : ''
    }`;
    const response = await api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

/**
 * 房间相关 API
 */
export const roomsApi = {
  /**
   * 更新房间
   */
  update: async (
    orgId: string,
    roomId: string,
    data: {
      name: string;
      layout?: string | null;
      area?: number | null;
      notes?: string | null;
      isActive?: boolean;
      isRented?: boolean;
    },
  ): Promise<void> => {
    await api.put(`/api/orgs/${orgId}/rooms/${roomId}`, data);
  },

  /**
   * 获取价格方案
   */
  getPricingPlans: async (
    orgId: string,
    roomId: string,
  ): Promise<PricingPlansResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/rooms/${roomId}/pricing-plans`);
    return r.data;
  },

  /**
   * 更新价格方案
   */
  updatePricingPlans: async (
    orgId: string,
    roomId: string,
    data: PricingPlansResponse['pricingPlans'],
  ): Promise<void> => {
    await api.put(`/api/orgs/${orgId}/rooms/${roomId}/pricing-plans`, data);
  },

  /**
   * 获取房间设施
   */
  getFacilities: async (orgId: string, roomId: string): Promise<FacilitiesResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/rooms/${roomId}/facilities`);
    return r.data;
  },

  /**
   * 更新房间设施
   */
  updateFacilities: async (
    orgId: string,
    roomId: string,
    data: Array<{
      type: string;
      name: string;
      quantity: number;
      originalPriceCents: number;
      yearsInUse: number;
      notes?: string | null;
    }>,
  ): Promise<void> => {
    await api.put(`/api/orgs/${orgId}/rooms/${roomId}/facilities`, data);
  },
};
