import { Form, Input, InputNumber, Select, Space } from 'antd';
import { moneyInputFormItemProps } from './MoneyInput';
import { getBillingCycleLabel } from './BillingCycleSelect';

export interface WaterFeeFieldsProps {
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
 * 水费表单字段组件
 * 支持固定计费和按用量计费两种模式
 */
export function WaterFeeFields({
  mode = 'FIXED',
  billingCycleMonths = 1,
  showLabel = true,
}: WaterFeeFieldsProps) {
  return (
    <Space wrap>
      <Form.Item
        label={showLabel ? '计费模式' : undefined}
        name="waterMode"
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
          prev.waterMode !== curr.waterMode || prev.billingCycleMonths !== curr.billingCycleMonths
        }
      >
        {({ getFieldValue }) => {
          const currentMode = getFieldValue('waterMode') ?? mode;
          const cycle = getFieldValue('billingCycleMonths') ?? billingCycleMonths;
          const cycleLabel = getBillingCycleLabel(cycle);

          if (currentMode === 'FIXED') {
            return (
              <Form.Item
                label={showLabel ? `固定金额(元/${cycleLabel})` : undefined}
                name="waterFixedAmountCents"
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
                label={showLabel ? '单价(元/吨)' : undefined}
                name="waterUnitPriceCents"
                style={{ marginBottom: 0 }}
                {...moneyInputFormItemProps}
              >
                <InputNumber min={0} precision={2} step={0.01} style={{ width: 150 }} placeholder="0" />
              </Form.Item>
              <Form.Item
                label={showLabel ? '单位' : undefined}
                name="waterUnitName"
                initialValue="吨"
                style={{ marginBottom: 0 }}
              >
                <Input style={{ width: 100 }} placeholder="吨" disabled />
              </Form.Item>
            </>
          );
        }}
      </Form.Item>
    </Space>
  );
}
