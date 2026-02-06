import { Button, Card, Form, Input, InputNumber, Select, Space, Tag } from 'antd';
import { moneyInputFormItemProps } from '../../../components/forms/MoneyInput';
import { FeeSpecSelect } from '../../../components/forms/FeeSpecSelect';
import { getBillingCycleLabel } from '../../../components/forms/BillingCycleSelect';
import { BILLING_MODE_OPTIONS, FEE_TYPE_NAMES } from '../../../constants/feeTypes';
import type { ChargeItemSpec } from '../types';

export function OtherChargesFields() {
  return (
    <Form.Item label="其他费用" style={{ marginBottom: 16 }}>
      <Form.List name="charges">
        {(fields, { add, remove }) => (
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {fields.map((f) => {
              const form = Form.useFormInstance();
              const hasSpecs = Form.useWatch([f.name, 'hasSpecs'], form) || false;
              const mode = Form.useWatch([f.name, 'mode'], form) || 'FIXED';
              const specs = Form.useWatch([f.name, 'specs'], form) || [];
              const selectedSpecId = Form.useWatch([f.name, 'selectedSpecId'], form);
              const selectedSpec = specs.find((s: ChargeItemSpec) => s.id === selectedSpecId);

              return (
                <Card key={f.key} size="small" style={{ marginBottom: 8 }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
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
                        {...f}
                        label="计费方式"
                        name={[f.name, 'mode']}
                        style={{ marginBottom: 0 }}
                      >
                        <Select options={BILLING_MODE_OPTIONS} style={{ width: 120 }} />
                      </Form.Item>
                      {hasSpecs && specs.length > 0 && (
                        <Form.Item
                          {...f}
                          label="选择规格"
                          name={[f.name, 'selectedSpecId']}
                          style={{ marginBottom: 0 }}
                        >
                          <FeeSpecSelect
                            specs={specs}
                            style={{ width: 150 }}
                            onSpecChange={(spec) => {
                              if (spec) {
                                // 选择规格后，自动填充价格
                                if (mode === 'FIXED' && spec.fixedAmountCents != null) {
                                  form.setFieldValue([f.name, 'fixedAmountCents'], spec.fixedAmountCents);
                                } else if (mode === 'METERED' && spec.unitPriceCents != null) {
                                  form.setFieldValue([f.name, 'unitPriceCents'], spec.unitPriceCents);
                                  form.setFieldValue([f.name, 'unitName'], spec.unitName || '');
                                }
                              }
                            }}
                          />
                        </Form.Item>
                      )}
                      {selectedSpec && (
                        <Tag color="blue">已选: {selectedSpec.name}</Tag>
                      )}
                    </Space>
                    <Space wrap align="baseline">
                      <Form.Item
                        noStyle
                        shouldUpdate={(prev, curr) => prev.billingCycleMonths !== curr.billingCycleMonths}
                      >
                        {({ getFieldValue }) => {
                          const billingCycle = getFieldValue('billingCycleMonths') ?? 1;
                          const cycleLabel = getBillingCycleLabel(billingCycle);
                          
                          if (mode === 'FIXED') {
                            return (
                              <Form.Item
                                {...f}
                                label={`固定金额(元/${cycleLabel})`}
                                name={[f.name, 'fixedAmountCents']}
                                rules={[{ required: !hasSpecs, message: '必填' }]}
                                style={{ marginBottom: 0 }}
                                {...moneyInputFormItemProps}
                              >
                                <InputNumber
                                  min={0}
                                  precision={2}
                                  step={0.01}
                                  style={{ width: 180 }}
                                  placeholder="0"
                                  disabled={hasSpecs && !selectedSpecId}
                                />
                              </Form.Item>
                            );
                          }
                          return (
                            <>
                              <Form.Item
                                {...f}
                                label={`单价(元)`}
                                name={[f.name, 'unitPriceCents']}
                                rules={[{ required: !hasSpecs, message: '必填' }]}
                                style={{ marginBottom: 0 }}
                                {...moneyInputFormItemProps}
                              >
                                <InputNumber
                                  min={0}
                                  precision={2}
                                  step={0.01}
                                  style={{ width: 150 }}
                                  placeholder="0"
                                  disabled={hasSpecs && !selectedSpecId}
                                />
                              </Form.Item>
                              <Form.Item
                                {...f}
                                label="单位"
                                name={[f.name, 'unitName']}
                                style={{ marginBottom: 0, width: 100 }}
                              >
                                <Input placeholder="如：度" disabled={hasSpecs && !selectedSpecId} />
                              </Form.Item>
                            </>
                          );
                        }}
                      </Form.Item>
                      <Form.Item label=" " colon={false} style={{ marginBottom: 0 }}>
                        <Button danger size="small" onClick={() => remove(f.name)}>
                          删除
                        </Button>
                      </Form.Item>
                    </Space>
                  </Space>
                </Card>
              );
            })}
            <Button type="dashed" onClick={() => add()} style={{ width: '100%' }}>
              添加其他费用
            </Button>
          </Space>
        )}
      </Form.List>
    </Form.Item>
  );
}
