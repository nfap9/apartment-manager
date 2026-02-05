import { Form, InputNumber, Select, Space } from 'antd';

export interface RentIncreaseFieldsProps {
  /**
   * 租金递增类型
   */
  increaseType?: 'NONE' | 'FIXED' | 'PERCENT';
  /**
   * 是否显示标签
   */
  showLabel?: boolean;
}

/**
 * 租金递增字段组件
 */
export function RentIncreaseFields({
  increaseType = 'NONE',
  showLabel = true,
}: RentIncreaseFieldsProps) {
  return (
    <Space wrap>
      <Form.Item
        label={showLabel ? '租金递增类型' : undefined}
        name="rentIncreaseType"
        initialValue="NONE"
        style={{ marginBottom: 0 }}
      >
        <Select
          style={{ width: 220 }}
          options={[
            { value: 'NONE', label: '不递增' },
            { value: 'FIXED', label: '固定递增(元)' },
            { value: 'PERCENT', label: '百分比递增(%)' },
          ]}
        />
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prev, curr) => prev.rentIncreaseType !== curr.rentIncreaseType}
      >
        {({ getFieldValue }) => {
          const type = getFieldValue('rentIncreaseType') ?? increaseType;
          const isPercent = type === 'PERCENT';

          return (
            <Form.Item
              label={showLabel ? '递增值' : undefined}
              name="rentIncreaseValue"
              style={{ marginBottom: 0 }}
              getValueProps={(value: number | null | undefined) => {
                if (isPercent) {
                  return { value: value == null ? value : value };
                }
                return { value: value == null ? value : value / 100 };
              }}
              normalize={(value: number | null) => {
                if (isPercent) {
                  return value == null ? value : value;
                }
                return value == null ? value : Math.round(value * 100);
              }}
            >
              <InputNumber
                min={0}
                precision={isPercent ? 0 : 2}
                style={{ width: 120 }}
                placeholder="0"
              />
            </Form.Item>
          );
        }}
      </Form.Item>

      <Form.Item
        label={showLabel ? '递增周期(月)' : undefined}
        name="rentIncreaseIntervalMonths"
        initialValue={12}
        style={{ marginBottom: 0 }}
      >
        <InputNumber min={1} style={{ width: 120 }} />
      </Form.Item>
    </Space>
  );
}
