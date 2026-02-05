import { Select, type SelectProps } from 'antd';

export interface BillingCycleSelectProps extends Omit<SelectProps, 'options'> {
  value?: number;
  onChange?: (value: number) => void;
}

/**
 * 租赁方式选择器
 */
export function BillingCycleSelect({ value, onChange, ...props }: BillingCycleSelectProps) {
  const options = [
    { value: 1, label: '按月租' },
    { value: 3, label: '按季度租' },
    { value: 6, label: '按半年租' },
    { value: 12, label: '按年租' },
  ];

  return <Select {...props} value={value} onChange={onChange} options={options} />;
}

/**
 * 获取租赁周期的显示标签
 */
export function getBillingCycleLabel(months: number): string {
  if (months === 1) return '每月';
  if (months === 12) return '每年';
  return `每${months}个月`;
}
