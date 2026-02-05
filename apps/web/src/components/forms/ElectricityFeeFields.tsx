import { Form, Input, InputNumber, Select, Space } from 'antd';
import { moneyInputFormItemProps } from './MoneyInput';
import { getBillingCycleLabel } from './BillingCycleSelect';

export interface ElectricityFeeFieldsProps {
  /**
   * 计费模式
   */
  mode?: 'FIXED' | 'METERED';
  /**
   * 账单周期（月）
   */
  billingCycleMonths?: number;
  /**
   * 是否显示标签
   */
  showLabel?: boolean;
}

/**
 * 电费表单字段组件
 * 支持固定计费和按用量计费两种模式
 */
export function ElectricityFeeFields({
  mode = 'FIXED',
  billingCycleMonths = 1,
  showLabel = true,
}: ElectricityFeeFieldsProps) {
  return (
    <Space wrap>
      <Form.Item
        label={showLabel ? '计费模式' : undefined}
        name="electricityMode"
        initialValue="FIXED"
        style={{ marginBottom: 0 }}
      >
        <Select
          style={{ width: 140 }}
          options={[
            { value: 'FIXED', label: '固定计费' },
            { value: 'METERED', label: '按用量计费' },
          ]}
        />
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prev, curr) =>
          prev.electricityMode !== curr.electricityMode ||
          prev.billingCycleMonths !== curr.billingCycleMonths
        }
      >
        {({ getFieldValue }) => {
          const currentMode = getFieldValue('electricityMode') ?? mode;
          const cycle = getFieldValue('billingCycleMonths') ?? billingCycleMonths;
          const cycleLabel = getBillingCycleLabel(cycle);

          if (currentMode === 'FIXED') {
            return (
              <Form.Item
                label={showLabel ? `固定金额(元/${cycleLabel})` : undefined}
                name="electricityFixedAmountCents"
                style={{ marginBottom: 0 }}
                {...moneyInputFormItemProps}
              >
                <InputNumber min={0} precision={2} step={0.01} style={{ width: 180 }} placeholder="0" />
              </Form.Item>
            );
          }

          return (
            <>
              <Form.Item
                label={showLabel ? '单价(元/度)' : undefined}
                name="electricityUnitPriceCents"
                style={{ marginBottom: 0 }}
                {...moneyInputFormItemProps}
              >
                <InputNumber min={0} precision={2} step={0.01} style={{ width: 150 }} placeholder="0" />
              </Form.Item>
              <Form.Item
                label={showLabel ? '单位' : undefined}
                name="electricityUnitName"
                initialValue="度"
                style={{ marginBottom: 0 }}
              >
                <Input style={{ width: 100 }} placeholder="度" disabled />
              </Form.Item>
            </>
          );
        }}
      </Form.Item>
    </Space>
  );
}
