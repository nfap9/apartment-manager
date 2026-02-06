import { Button, Descriptions, Form, InputNumber, Modal, Space, Typography, message } from 'antd';
import type { AxiosError } from 'axios';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { ApiErrorResponse } from '../../../lib/apiTypes';
import type { InvoiceItem, InvoiceRow } from '../types';

interface MeterReadingModalProps {
  orgId: string;
  invoiceId: string;
  item: InvoiceItem;
  invoice: InvoiceRow | null;
  open: boolean;
  onClose: () => void;
}

export function MeterReadingModal({
  orgId,
  invoiceId,
  item,
  invoice,
  open,
  onClose,
}: MeterReadingModalProps) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<{ meterStart?: number; meterEnd: number }>();

  const unitName = item.unitName ?? '度';
  const isWater = item.name.includes('水');
  const isElectricity = item.name.includes('电');
  const unitPrice = item.unitPriceCents ? item.unitPriceCents / 100 : 0;

  const onSubmit = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      const payload = {
        meterStart: values.meterStart != null ? Number(values.meterStart) : undefined,
        meterEnd: Number(values.meterEnd),
      };
      await api.post(
        `/api/orgs/${orgId}/invoices/${invoiceId}/items/${item.id}/confirm-reading`,
        payload,
      );

      message.success('已确认读数');
      await qc.invalidateQueries({ queryKey: ['invoice', orgId, invoiceId] });
      await qc.invalidateQueries({ queryKey: ['invoices', orgId] });
      onClose();
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '确认失败');
    } finally {
      setLoading(false);
    }
  };

  const previousReading = item.meterStart ?? 0;

  return (
    <Modal
      open={open}
      title={`录入${item.name}读数`}
      onCancel={onClose}
      onOk={onSubmit}
      confirmLoading={loading}
      destroyOnHidden
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          meterStart: item.meterStart ?? undefined,
          meterEnd: undefined,
        }}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size={16}>
          {invoice && (
            <div style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 4 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="账期">
                  {new Date(invoice.periodStart).toLocaleDateString()} ~{' '}
                  {new Date(invoice.periodEnd).toLocaleDateString()}
                </Descriptions.Item>
                <Descriptions.Item label="单价">
                  ¥{unitPrice.toFixed(2)}/{unitName}
                </Descriptions.Item>
                {previousReading > 0 && (
                  <Descriptions.Item label="上期止度">
                    <Typography.Text strong>{previousReading.toFixed(2)} {unitName}</Typography.Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          )}

          <Form.Item
            name="meterStart"
            label={isWater ? '水表起度' : isElectricity ? '电表起度' : '起度'}
            rules={[{ required: true, message: `请输入起度(${unitName})` }]}
            tooltip={previousReading > 0 ? `上期止度：${previousReading.toFixed(2)} ${unitName}` : undefined}
          >
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                min={0}
                precision={2}
                placeholder={`起度(${unitName})`}
                style={{ width: '100%' }}
              />
              <Button disabled style={{ pointerEvents: 'none' }}>
                {unitName}
              </Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item
            name="meterEnd"
            label={isWater ? '水表止度' : isElectricity ? '电表止度' : '止度'}
            rules={[
              { required: true, message: `请输入止度(${unitName})` },
              ({ getFieldValue }) => ({
                validator: (_, value) => {
                  const start = getFieldValue('meterStart');
                  if (value != null && start != null && value < start) {
                    return Promise.reject(new Error('止度不能小于起度'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                min={0}
                precision={2}
                placeholder={`止度(${unitName})`}
                style={{ width: '100%' }}
              />
              <Button disabled style={{ pointerEvents: 'none' }}>
                {unitName}
              </Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item shouldUpdate noStyle>
            {({ getFieldsValue }) => {
              const { meterStart, meterEnd } = getFieldsValue(['meterStart', 'meterEnd']);
              const quantity =
                meterStart != null && meterEnd != null && meterEnd >= meterStart ? meterEnd - meterStart : null;
              const amount = quantity != null ? Math.round(quantity * unitPrice * 100) : null;

              if (quantity == null || amount == null) return null;

              return (
                <div style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 4, background: '#f5f5f5' }}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="用量">
                      <Typography.Text strong>{quantity.toFixed(2)} {unitName}</Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="金额">
                      <Typography.Text strong type="success">
                        ¥{(amount / 100).toFixed(2)}
                      </Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="计算方式">
                      {quantity.toFixed(2)} {unitName} × ¥{unitPrice.toFixed(2)}/{unitName} = ¥
                      {(amount / 100).toFixed(2)}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              );
            }}
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
}
