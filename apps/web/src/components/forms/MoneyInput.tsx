import { InputNumber, type InputNumberProps } from 'antd';
import type { FormItemProps } from 'antd/es/form';

/**
 * 金额输入组件的 props
 * 自动处理 cents（分）和元之间的转换
 */
export interface MoneyInputProps extends Omit<InputNumberProps, 'value' | 'onChange'> {
  value?: number | null; // 以分为单位的值
  onChange?: (value: number | null) => void; // 返回以分为单位的值
}

/**
 * 金额输入组件
 * 自动处理 cents（分）和元之间的转换
 * 显示时转换为元，提交时转换为分
 */
export function MoneyInput({ value, onChange, ...props }: MoneyInputProps) {
  const displayValue = value == null ? null : value / 100;

  const handleChange = (val: number | string | null) => {
    if (onChange) {
      const numVal = typeof val === 'string' ? parseFloat(val) : val;
      onChange(numVal == null || isNaN(numVal) ? null : Math.round(numVal * 100));
    }
  };

  return (
    <InputNumber
      {...props}
      value={displayValue}
      onChange={handleChange}
      precision={2}
      min={0}
    />
  );
}

/**
 * 用于 Ant Design Form.Item 的金额输入配置
 * 可以直接作为 Form.Item 的 getValueProps 和 normalize
 */
export const moneyInputFormItemProps: Pick<FormItemProps, 'getValueProps' | 'normalize'> = {
  getValueProps: (value: number | null | undefined) => ({
    value: value == null ? value : value / 100,
  }),
  normalize: (value: number | null) => (value == null ? value : Math.round(value * 100)),
};
