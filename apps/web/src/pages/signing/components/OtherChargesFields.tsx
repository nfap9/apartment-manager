import { Button, Card, Form, Input, InputNumber, Select, Space } from 'antd';
import { moneyInputFormItemProps } from '../../../components/forms/MoneyInput';
import { getBillingCycleLabel } from '../../../components/forms/BillingCycleSelect';

export function OtherChargesFields() {
  return (
    <Form.Item label="其他费用" style={{ marginBottom: 16 }}>
      <Form.List name="charges">
        {(fields, { add, remove }) => (
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {fields.map((f) => (
              <Card key={f.key} size="small" style={{ marginBottom: 8 }}>
                <Space wrap align="baseline">
                  <Form.Item
                    {...f}
                    label="名称"
                    name={[f.name, 'name']}
                    rules={[{ required: true, message: '必填' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input style={{ width: 160 }} placeholder="费用名称" />
                  </Form.Item>
                  <Form.Item
                    {...f}
                    label="费用类型"
                    name={[f.name, 'feeType']}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      style={{ width: 140 }}
                      allowClear
                      placeholder="选择类型"
                      options={[
                        { value: 'MANAGEMENT', label: '物业费' },
                        { value: 'INTERNET', label: '网费' },
                        { value: 'GAS', label: '燃气费' },
                        { value: 'OTHER', label: '其他费用' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) => prev.billingCycleMonths !== curr.billingCycleMonths}
                  >
                    {({ getFieldValue }) => {
                      const billingCycle = getFieldValue('billingCycleMonths') ?? 1;
                      const cycleLabel = getBillingCycleLabel(billingCycle);
                      return (
                        <Form.Item
                          {...f}
                          label={`固定金额(元/${cycleLabel})`}
                          name={[f.name, 'fixedAmountCents']}
                          rules={[{ required: true, message: '必填' }]}
                          style={{ marginBottom: 0 }}
                          {...moneyInputFormItemProps}
                        >
                          <InputNumber min={0} precision={2} step={0.01} style={{ width: 180 }} placeholder="0" />
                        </Form.Item>
                      );
                    }}
                  </Form.Item>
                  <Form.Item label=" " colon={false} style={{ marginBottom: 0 }}>
                    <Button danger size="small" onClick={() => remove(f.name)}>
                      删除
                    </Button>
                  </Form.Item>
                </Space>
              </Card>
            ))}
            <Button type="dashed" onClick={() => add()} style={{ width: '100%' }}>
              添加其他费用
            </Button>
          </Space>
        )}
      </Form.List>
    </Form.Item>
  );
}
