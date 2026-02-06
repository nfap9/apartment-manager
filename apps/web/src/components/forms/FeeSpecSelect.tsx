import { Select, type SelectProps } from 'antd';
import type { ChargeItemSpec } from '../../pages/signing/types';

export interface FeeSpecSelectProps extends Omit<SelectProps, 'options'> {
  specs?: ChargeItemSpec[];
  value?: string;
  onChange?: (value: string) => void;
  onSpecChange?: (spec: ChargeItemSpec | null) => void;
}

/**
 * 费用规格选择器（用于签约页面）
 */
export function FeeSpecSelect({
  specs = [],
  value,
  onChange,
  onSpecChange,
  ...props
}: FeeSpecSelectProps) {
  const options = specs.map((spec) => ({
    value: spec.id,
    label: spec.name,
    spec,
  }));

  const handleChange = (newValue: string) => {
    onChange?.(newValue);
    const selectedSpec = specs.find((s) => s.id === newValue);
    onSpecChange?.(selectedSpec || null);
  };

  return (
    <Select
      {...props}
      value={value}
      onChange={handleChange}
      options={options}
      placeholder="选择规格"
      allowClear
    />
  );
}
