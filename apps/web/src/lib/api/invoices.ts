import { api } from '../api';
import type { InvoicesResponse, InvoiceDetailResponse } from './types';

/**
 * 账单相关 API
 */
export const invoicesApi = {
  /**
   * 获取账单列表
   */
  getList: async (orgId: string): Promise<InvoicesResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/invoices`);
    return r.data;
  },

  /**
   * 获取账单详情
   */
  getDetail: async (orgId: string, invoiceId: string): Promise<InvoiceDetailResponse> => {
    const r = await api.get(`/api/orgs/${orgId}/invoices/${invoiceId}`);
    return r.data;
  },

  /**
   * 确认读数
   */
  confirmReading: async (
    orgId: string,
    invoiceId: string,
    itemId: string,
    data: { meterStart?: number; meterEnd: number },
  ): Promise<void> => {
    await api.post(
      `/api/orgs/${orgId}/invoices/${invoiceId}/items/${itemId}/confirm-reading`,
      data,
    );
  },

  /**
   * 运行出账
   */
  runBilling: async (orgId: string): Promise<void> => {
    await api.post(`/api/orgs/${orgId}/billing/run`);
  },
};
