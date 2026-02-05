import { Button, Form, Input, InputNumber, Modal, Space } from 'antd';
import { useEffect } from 'react';
import type { FeePricing } from '../../../lib/api/types';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { apartmentsApi } from '../../../lib/api/index';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useOrgId } from '../../../hooks/useOrgId';
import { moneyInputFormItemProps } from '../../../components/forms';

interface FeePricingModalProps {
  open: boolean;
  apartmentId: string;
  feePricings: FeePricing[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function FeePricingModal({
  open,
  apartmentId,
  feePricings,
  onClose,
  onSuccess,
}: FeePricingModalProps) {
  const orgId = useOrgId();
  const [form] = Form.useForm<{ items: Array<Partial<FeePricing>> }>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ items: feePricings });
    }
  }, [form, open, feePricings]);

  const updateMutation = useApiMutation({
    mutationFn: (items: Array<Partial<FeePricing>>) =>
      apartmentsApi.updateFeePricings(orgId!, apartmentId, items),
    invalidateQueries: [queryKeys.apartments.feePricings(orgId!, apartmentId)],
    successMessage: '已保存',
    errorMessage: '保存失败',
    onSuccess: () => {
      onClose();
      onSuccess?.();
    },
  });

  const handleSave = async () => {
    const values = await form.validateFields();
    updateMutation.mutate(values.items ?? []);
  };

  return (
    <Modal
      open={open}
      title="编辑费用定价"
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={updateMutation.isLoading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {fields.map((f) => (
                <Space key={f.key} align="baseline" wrap style={{ width: '100%' }}>
                  <Form.Item
                    {...f}
                    label="类型"
                    name={[f.name, 'feeType']}
                    rules={[{ required: true }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="WATER/ELECTRICITY/..." style={{ width: 160 }} />
                  </Form.Item>
                  <Form.Item
                    {...f}
                    label="模式"
                    name={[f.name, 'mode']}
                    rules={[{ required: true }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="FIXED/METERED" style={{ width: 140 }} />
                  </Form.Item>
                  <Form.Item
                    {...f}
                    label="固定金额(元)"
                    name={[f.name, 'fixedAmountCents']}
                    style={{ marginBottom: 0 }}
                    {...moneyInputFormItemProps}
                  >
                    <InputNumber min={0} precision={2} step={0.01} style={{ width: 150 }} placeholder="0" />
                  </Form.Item>
                  <Form.Item
                    {...f}
                    label="单价(元)"
                    name={[f.name, 'unitPriceCents']}
                    style={{ marginBottom: 0 }}
                    {...moneyInputFormItemProps}
                  >
                    <InputNumber min={0} precision={2} step={0.01} style={{ width: 150 }} placeholder="0" />
                  </Form.Item>
                  <Form.Item
                    {...f}
                    label="单位"
                    name={[f.name, 'unitName']}
                    style={{ marginBottom: 0 }}
                  >
                    <Input style={{ width: 120 }} placeholder="单位名称" />
                  </Form.Item>
                  <Button danger size="small" onClick={() => remove(f.name)}>
                    删除
                  </Button>
                </Space>
              ))}
              <Button onClick={() => add()} type="dashed" style={{ width: '100%' }}>
                添加定价
              </Button>
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
