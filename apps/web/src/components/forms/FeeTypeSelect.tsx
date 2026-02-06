import { Select, type SelectProps } from 'antd';
import { FEE_TYPE_OPTIONS, type FeeType } from '../../constants/feeTypes';

export interface FeeTypeSelectProps extends Omit<SelectProps, 'options'> {
  value?: FeeType;
  onChange?: (value: FeeType) => void;
}

/**
 * 费用类型选择器
 */
export function FeeTypeSelect({ value, onChange, ...props }: FeeTypeSelectProps) {
  return <Select {...props} value={value} onChange={onChange} options={FEE_TYPE_OPTIONS} />;
}
