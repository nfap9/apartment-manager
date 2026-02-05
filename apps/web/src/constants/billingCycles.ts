/**
 * 租赁周期选项
 */
export const BILLING_CYCLES = [
  { value: 1, label: '按月租' },
  { value: 3, label: '按季度租' },
  { value: 6, label: '按半年租' },
  { value: 12, label: '按年租' },
] as const;

export type BillingCycle = (typeof BILLING_CYCLES)[number]['value'];

/**
 * 获取租赁周期的显示标签
 */
export function getBillingCycleLabel(months: number): string {
  if (months === 1) return '每月';
  if (months === 12) return '每年';
  return `每${months}个月`;
}

/**
 * 获取租赁周期的完整标签（用于表单）
 */
export function getBillingCycleFormLabel(months: number): string {
  if (months === 1) return '房租(元/月)';
  if (months === 12) return '房租(元/年)';
  return `房租(元/${months}个月)`;
}
