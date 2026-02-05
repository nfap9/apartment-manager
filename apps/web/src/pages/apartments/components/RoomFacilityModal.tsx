import { Button, Form, Input, InputNumber, Modal, Space } from 'antd';
import { useEffect } from 'react';
import type { Room } from '../../../lib/api/types';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { roomsApi } from '../../../lib/api/index';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useOrgId } from '../../../hooks/useOrgId';
import { useRoomFacilities } from '../hooks/useApartmentDetail';
import { moneyInputFormItemProps } from '../../../components/forms';

interface RoomFacilityModalProps {
  open: boolean;
  room: Room | null;
  apartmentId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RoomFacilityModal({
  open,
  room,
  apartmentId,
  onClose,
  onSuccess,
}: RoomFacilityModalProps) {
  const orgId = useOrgId();
  const [form] = Form.useForm<{ facilities: Array<{ name: string; quantity: number; valueCents: number }> }>();
  const facilitiesQuery = useRoomFacilities(room?.id ?? null, open);

  useEffect(() => {
    if (open) {
      const facilities = facilitiesQuery.data?.facilities ?? [];
      form.setFieldsValue({
        facilities: facilities.map((f: { name: string; quantity: number; valueCents: number }) => ({
          name: f.name,
          quantity: f.quantity,
          valueCents: f.valueCents,
        })),
      });
    }
  }, [form, open, facilitiesQuery.data?.facilities]);

  const updateMutation = useApiMutation({
    mutationFn: (facilities: Array<{ name: string; quantity: number; valueCents: number }>) =>
      roomsApi.updateFacilities(orgId!, room!.id, facilities),
    invalidateQueries: [
      queryKeys.rooms.facilities(orgId!, room!.id),
      queryKeys.apartments.detail(orgId!, apartmentId),
    ],
    successMessage: '已保存',
    errorMessage: '保存失败',
    onSuccess: () => {
      onClose();
      onSuccess?.();
    },
  });

  const handleSave = async () => {
    const values = await form.validateFields();
    updateMutation.mutate(values.facilities ?? []);
  };

  return (
    <Modal
      open={open}
      title={room ? `房间设施 - ${room.name}` : '房间设施'}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={updateMutation.isLoading}
      destroyOnClose
      width={600}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.List name="facilities">
          {(fields, { add, remove }) => (
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {fields.map((f) => (
                <Space key={f.key} align="baseline" wrap style={{ width: '100%' }}>
                  <Form.Item
                    {...f}
                    label="设施名称"
                    name={[f.name, 'name']}
                    rules={[{ required: true, message: '请输入名称' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="空调/洗衣机/冰箱" style={{ width: 140 }} />
                  </Form.Item>
                  <Form.Item
                    {...f}
                    label="数量"
                    name={[f.name, 'quantity']}
                    rules={[{ required: true, message: '必填' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber min={1} style={{ width: 80 }} placeholder="1" />
                  </Form.Item>
                  <Form.Item
                    {...f}
                    label="价值(元)"
                    name={[f.name, 'valueCents']}
                    style={{ marginBottom: 0 }}
                    {...moneyInputFormItemProps}
                  >
                    <InputNumber min={0} precision={2} style={{ width: 120 }} placeholder="0" />
                  </Form.Item>
                  <Button danger size="small" onClick={() => remove(f.name)}>
                    删除
                  </Button>
                </Space>
              ))}
              <Button
                onClick={() => add({ name: '', quantity: 1, valueCents: 0 })}
                type="dashed"
                style={{ width: '100%' }}
              >
                添加设施
              </Button>
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
