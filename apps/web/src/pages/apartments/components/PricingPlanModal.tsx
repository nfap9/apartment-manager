import { Button, Form, InputNumber, Modal, Space } from 'antd';
import { useEffect, useMemo } from 'react';
import type { Room, PricingPlan } from '../../../lib/api/types';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { roomsApi } from '../../../lib/api/index';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useOrgId } from '../../../hooks/useOrgId';
import { useRoomPricingPlans } from '../hooks/useApartmentDetail';
import { moneyInputFormItemProps } from '../../../components/forms';

interface PricingPlanModalProps {
  open: boolean;
  room: Room | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PricingPlanModal({ open, room, onClose, onSuccess }: PricingPlanModalProps) {
  const orgId = useOrgId();
  const [form] = Form.useForm<{ plans: PricingPlan[] }>();
  const pricingPlansQuery = useRoomPricingPlans(room?.id ?? null, open);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ plans: pricingPlansQuery.data?.pricingPlans ?? [] });
    }
  }, [form, open, pricingPlansQuery.data?.pricingPlans]);

  const mutationFn = useMemo(() => {
    return (plans: PricingPlan[]) => {
      if (!room?.id) {
        throw new Error('Room is not loaded');
      }
      return roomsApi.updatePricingPlans(orgId!, room.id, plans);
    };
  }, [room, orgId]);

  const invalidateQueries = useMemo(() => {
    const queries: Array<readonly unknown[]> = [];
    if (room?.id && orgId) {
      queries.push(queryKeys.rooms.pricingPlans(orgId, room.id));
    }
    return queries;
  }, [room, orgId]);

  const updateMutation = useApiMutation({
    mutationFn,
    invalidateQueries,
    successMessage: '已保存',
    errorMessage: '保存失败',
    onSuccess: () => {
      onClose();
      onSuccess?.();
    },
  });

  const handleSave = async () => {
    const values = await form.validateFields();
    updateMutation.mutate(values.plans ?? []);
  };

  return (
    <Modal
      open={open}
      title={room ? `价格方案 - ${room.name}` : '价格方案'}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={updateMutation.isLoading}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ plans: pricingPlansQuery.data?.pricingPlans ?? [] }}
      >
        <Form.List name="plans">
          {(fields, { add, remove }) => (
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {fields.map((f) => (
                <Space key={f.key} align="baseline" wrap style={{ width: '100%' }}>
                  <Form.Item
                    {...f}
                    label="周期(月)"
                    name={[f.name, 'durationMonths']}
                    rules={[{ required: true, message: '必填' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber min={1} style={{ width: 100 }} placeholder="1" />
                  </Form.Item>
                  <Form.Item
                    {...f}
                    label="租金(元/月)"
                    name={[f.name, 'rentCents']}
                    rules={[{ required: true, message: '必填' }]}
                    style={{ marginBottom: 0 }}
                    {...moneyInputFormItemProps}
                  >
                    <InputNumber min={0} precision={2} step={100} style={{ width: 150 }} placeholder="0" />
                  </Form.Item>
                  <Form.Item
                    {...f}
                    label="押金(元)"
                    name={[f.name, 'depositCents']}
                    style={{ marginBottom: 0 }}
                    {...moneyInputFormItemProps}
                  >
                    <InputNumber min={0} precision={2} step={100} style={{ width: 150 }} placeholder="0" />
                  </Form.Item>
                  <Button danger size="small" onClick={() => remove(f.name)}>
                    删除
                  </Button>
                </Space>
              ))}
              <Button onClick={() => add()} type="dashed" style={{ width: '100%' }}>
                添加方案
              </Button>
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
