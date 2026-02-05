import { Checkbox, Form, Input, InputNumber, Modal, Space } from 'antd';
import { useEffect } from 'react';
import type { Room } from '../../../lib/api/types';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { apartmentsApi, roomsApi } from '../../../lib/api/index';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useOrgId } from '../../../hooks/useOrgId';

interface RoomEditModalProps {
  open: boolean;
  room: Room | null;
  apartmentId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RoomEditModal({ open, room, apartmentId, onClose, onSuccess }: RoomEditModalProps) {
  const orgId = useOrgId();
  const [form] = Form.useForm<{
    name: string;
    layout?: string | null;
    area?: number | null;
    notes?: string | null;
    isActive?: boolean;
    isRented?: boolean;
  }>();

  useEffect(() => {
    if (open && room) {
      form.setFieldsValue({
        name: room.name,
        layout: room.layout ?? null,
        area: room.area ?? null,
        notes: room.notes ?? null,
        isActive: room.isActive,
        isRented: room.isRented,
      });
    } else if (open && !room) {
      form.resetFields();
      form.setFieldsValue({ isActive: true, isRented: false });
    }
  }, [open, room, form]);

  const updateMutation = useApiMutation({
    mutationFn: (data: {
      name: string;
      layout?: string | null;
      area?: number | null;
      notes?: string | null;
      isActive?: boolean;
      isRented?: boolean;
    }) => {
      if (room) {
        return roomsApi.update(orgId!, room.id, data);
      } else {
        return apartmentsApi.createRoom(orgId!, apartmentId, data);
      }
    },
    invalidateQueries: [queryKeys.apartments.detail(orgId!, apartmentId)],
    successMessage: '已保存',
    errorMessage: '保存失败',
    onSuccess: () => {
      onClose();
      onSuccess?.();
    },
  });

  const handleSave = async () => {
    const values = await form.validateFields();
    updateMutation.mutate(values);
  };

  return (
    <Modal
      open={open}
      title={room ? '编辑房间' : '新增房间'}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={updateMutation.isLoading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="户型" name="layout">
          <Input placeholder="例如：一室一厅" />
        </Form.Item>
        <Form.Item label="面积(㎡)" name="area">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="备注" name="notes">
          <Input.TextArea rows={3} placeholder="房间相关备注信息" />
        </Form.Item>
        <Space>
          <Form.Item label="启用" name="isActive" valuePropName="checked">
            <Checkbox />
          </Form.Item>
          <Form.Item label="已租出" name="isRented" valuePropName="checked">
            <Checkbox />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
}
