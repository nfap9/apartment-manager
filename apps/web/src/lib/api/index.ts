/**
 * API 服务统一导出
 */
export { api } from '../api';
export { apartmentsApi, roomsApi } from './apartments';
export { tenantsApi } from './tenants';
export { leasesApi } from './leases';
export { invoicesApi } from './invoices';
export { signingApi } from './signing';
export { dashboardApi } from './dashboard';
export { orgApi } from './org';
export { feesApi } from './fees';
export { handleApiError, getApiErrorMessage } from './errorHandler';
export { queryKeys } from './queryKeys';
export * from './types';
