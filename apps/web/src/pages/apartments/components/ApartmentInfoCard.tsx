import { Button, Card, Descriptions, Form, Input, InputNumber, Modal } from 'antd';
import { useMemo, useState } from 'react';
import type { Apartment } from '../../../lib/api/types';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { apartmentsApi } from '../../../lib/api/index';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useOrgId } from '../../../hooks/useOrgId';

interface ApartmentInfoCardProps {
  apartment: Apartment | null;
  loading: boolean;
  canEdit: boolean;
  onUpdate?: () => void;
}

export function ApartmentInfoCard({ apartment, loading, canEdit, onUpdate }: ApartmentInfoCardProps) {
  const orgId = useOrgId();
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm<{ name: string; address: string; totalArea?: number; floor?: number }>();

  const mutationFn = useMemo(() => {
    return (data: { name: string; address: string; totalArea?: number; floor?: number }) => {
      if (!apartment?.id) {
        throw new Error('Apartment is not loaded');
      }
      return apartmentsApi.update(orgId!, apartment.id, data);
    };
  }, [apartment, orgId]);
  
  const invalidateQueries = useMemo(() => {
    const queries: Array<readonly unknown[]> = [queryKeys.apartments.all(orgId!)];
    if (apartment?.id) {
      queries.push(queryKeys.apartments.detail(orgId!, apartment.id));
    }
    return queries;
  }, [apartment, orgId]);

  const updateMutation = useApiMutation({
    mutationFn,
    invalidateQueries,
    successMessage: '已保存',
    errorMessage: '保存失败',
    onSuccess: () => {
      setEditOpen(false);
      onUpdate?.();
    },
  });

  const handleEdit = () => {
    if (!apartment) return;
    form.setFieldsValue({
      name: apartment.name,
      address: apartment.address,
      totalArea: apartment.totalArea ?? undefined,
      floor: apartment.floor ?? undefined,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!apartment) return;
    const values = await form.validateFields();
    updateMutation.mutate(values);
  };

  return (
    <>
      <Card
        title={apartment ? `${apartment.name}（详情）` : '公寓详情'}
        loading={loading}
        extra={
          canEdit && apartment ? (
            <Button onClick={handleEdit}>编辑</Button>
          ) : null
        }
      >
        {apartment ? (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="地址">{apartment.address}</Descriptions.Item>
            <Descriptions.Item label="总面积">{apartment.totalArea ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="楼层">{apartment.floor ?? '-'}</Descriptions.Item>
          </Descriptions>
        ) : (
          <span>未找到公寓</span>
        )}
      </Card>

      <Modal
        open={editOpen}
        title="编辑公寓"
        onCancel={() => setEditOpen(false)}
        onOk={handleSave}
        confirmLoading={updateMutation.isLoading}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="地址" name="address" rules={[{ required: true, message: '请输入地址' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="总面积" name="totalArea">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="楼层" name="floor">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
