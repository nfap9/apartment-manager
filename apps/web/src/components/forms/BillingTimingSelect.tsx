import { Select, type SelectProps } from 'antd';
import { BILLING_TIMING_OPTIONS, type BillingTiming } from '../../constants/feeTypes';

export interface BillingTimingSelectProps extends Omit<SelectProps, 'options'> {
  value?: BillingTiming | null;
  onChange?: (value: BillingTiming | null) => void;
}

/**
 * 结算时机选择器
 */
export function BillingTimingSelect({ value, onChange, ...props }: BillingTimingSelectProps) {
  return (
    <Select
      {...props}
      value={value}
      onChange={onChange}
      options={BILLING_TIMING_OPTIONS}
      allowClear
      placeholder="选择结算时机"
    />
  );
}
