import { DatePicker, Divider, Form, Input, InputNumber, Select, Space } from 'antd';
import { BillingCycleSelect } from '../../../components/forms/BillingCycleSelect';
import { RentIncreaseFields } from '../../../components/forms/RentIncreaseFields';
import { WaterFeeFields } from '../../../components/forms/WaterFeeFields';
import { ElectricityFeeFields } from '../../../components/forms/ElectricityFeeFields';
import { moneyInputFormItemProps } from '../../../components/forms/MoneyInput';
import { OtherChargesFields } from './OtherChargesFields';
import type { LeaseFormData } from '../types';

interface LeaseConfigurationStepProps {
  form: ReturnType<typeof Form.useForm<LeaseFormData & { charges?: Array<{ name: string; feeType?: string | null; fixedAmountCents?: number | null }> }>>[0];
}

export function LeaseConfigurationStep({ form }: LeaseConfigurationStepProps) {
  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          billingCycleMonths: 1,
          rentIncreaseType: 'NONE',
          rentIncreaseValue: 0,
          rentIncreaseIntervalMonths: 12,
        }}
        style={{ marginTop: 8 }}
      >
        <Space wrap style={{ width: '100%', marginBottom: 16 }} size="middle">
          <Form.Item
            label="租期"
            name="period"
            rules={[{ required: true, message: '请选择租期' }]}
            style={{ marginBottom: 0 }}
          >
            <DatePicker.RangePicker style={{ width: 280 }} />
          </Form.Item>
          <Form.Item
            label="租赁方式"
            name="billingCycleMonths"
            rules={[{ required: true, message: '请选择租赁方式' }]}
            initialValue={1}
            style={{ marginBottom: 0 }}
          >
            <BillingCycleSelect style={{ width: 150 }} placeholder="选择租赁方式" />
          </Form.Item>
          <Form.Item
            label="押金（元）"
            name="depositCents"
            style={{ marginBottom: 0 }}
            {...moneyInputFormItemProps}
          >
            <InputNumber min={0} precision={2} step={100} style={{ width: 150 }} placeholder="0" />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.billingCycleMonths !== curr.billingCycleMonths}
          >
            {({ getFieldValue }) => {
              const billingCycle = getFieldValue('billingCycleMonths') ?? 1;
              const label =
                billingCycle === 1
                  ? '月租金（元）'
                  : billingCycle === 12
                    ? '年租金（元）'
                    : `租金（元/${billingCycle}个月）`;
              return (
                <Form.Item
                  label={label}
                  name="baseRentCents"
                  rules={[{ required: true, message: '请输入租金' }]}
                  style={{ marginBottom: 0 }}
                  {...moneyInputFormItemProps}
                >
                  <InputNumber min={0} precision={2} step={100} style={{ width: 150 }} placeholder="0" />
                </Form.Item>
              );
            }}
          </Form.Item>
        </Space>

        <Divider style={{ margin: '16px 0' }}>租金递增设置</Divider>
        <RentIncreaseFields />

        <Divider style={{ margin: '16px 0' }}>水费设置</Divider>
        <WaterFeeFields />

        <Divider style={{ margin: '16px 0' }}>电费设置</Divider>
        <ElectricityFeeFields />

        <Divider style={{ margin: '16px 0' }}>其他费用</Divider>
        <OtherChargesFields />

        <Divider style={{ margin: '16px 0' }}>备注</Divider>
        <Form.Item name="notes" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={3} placeholder="选填备注信息" />
        </Form.Item>
      </Form>
    </div>
  );
}
