import { Button, Form, Input, InputNumber, Modal, Select, Space, Row, Col } from 'antd';
import { useEffect, useMemo } from 'react';
import TextArea from 'antd/es/input/TextArea';
import type { Room } from '../../../lib/api/types';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { roomsApi } from '../../../lib/api/index';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useOrgId } from '../../../hooks/useOrgId';
import { useRoomFacilities } from '../hooks/useApartmentDetail';
import { moneyInputFormItemProps } from '../../../components/forms';
import { FACILITY_TYPE_GROUPS, type FacilityType } from '../../../constants/facilityTypes';

const { Option, OptGroup } = Select;

interface RoomFacilityModalProps {
  open: boolean;
  room: Room | null;
  apartmentId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FacilityFormItem {
  type: FacilityType;
  name: string;
  quantity: number;
  originalPriceCents: number;
  yearsInUse: number;
  notes?: string;
}

export function RoomFacilityModal({
  open,
  room,
  apartmentId,
  onClose,
  onSuccess,
}: RoomFacilityModalProps) {
  const orgId = useOrgId();
  const [form] = Form.useForm<{ facilities: FacilityFormItem[] }>();
  const facilitiesQuery = useRoomFacilities(room?.id ?? null, open);

  useEffect(() => {
    if (open) {
      const facilities = facilitiesQuery.data?.facilities ?? [];
      form.setFieldsValue({
        facilities: facilities.map((f) => ({
          type: f.type || '其他',
          name: f.name || '',
          quantity: f.quantity || 1,
          originalPriceCents: f.originalPriceCents ?? 0,
          yearsInUse: f.yearsInUse ?? 0,
          notes: f.notes || '',
        })),
      });
    }
  }, [form, open, facilitiesQuery.data?.facilities]);

  const mutationFn = useMemo(() => {
    return (facilities: FacilityFormItem[]) => {
      if (!room?.id) {
        throw new Error('Room is not loaded');
      }
      return roomsApi.updateFacilities(
        orgId!,
        room.id,
        facilities.map((f) => ({
          type: f.type,
          name: f.name,
          quantity: f.quantity,
          originalPriceCents: f.originalPriceCents,
          yearsInUse: f.yearsInUse,
          notes: f.notes || null,
        })),
      );
    };
  }, [room, orgId]);

  const invalidateQueries = useMemo(() => {
    const queries: Array<readonly unknown[]> = [queryKeys.apartments.detail(orgId!, apartmentId)];
    if (room?.id && orgId) {
      queries.push(queryKeys.rooms.facilities(orgId, room.id));
    }
    return queries;
  }, [room, orgId, apartmentId]);

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
    updateMutation.mutate(values.facilities ?? []);
  };

  // 处理类型选择变化，自动填充名称
  const handleTypeChange = (fieldName: number, type: FacilityType) => {
    const currentName = form.getFieldValue(['facilities', fieldName, 'name']);
    // 如果名称为空或与旧类型相同，则自动填充为新类型
    const currentType = form.getFieldValue(['facilities', fieldName, 'type']);
    if (!currentName || currentName === currentType) {
      form.setFieldValue(['facilities', fieldName, 'name'], type);
    }
    form.setFieldValue(['facilities', fieldName, 'type'], type);
  };

  return (
    <Modal
      open={open}
      title={room ? `房间设施 - ${room.name}` : '房间设施'}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={updateMutation.isLoading}
      destroyOnClose
      width={900}
      style={{ top: 20 }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.List name="facilities">
          {(fields, { add, remove }) => (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {fields.map((f) => (
                <div
                  key={f.key}
                  style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    padding: '16px',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <Row gutter={[12, 12]}>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item
                        {...f}
                        label="设施类型"
                        name={[f.name, 'type']}
                        rules={[{ required: true, message: '请选择类型' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          placeholder="选择类型"
                          onChange={(value) => handleTypeChange(f.name, value)}
                          style={{ width: '100%' }}
                        >
                          {FACILITY_TYPE_GROUPS.map((group) => (
                            <OptGroup key={group.label} label={group.label}>
                              {group.types.map((type) => (
                                <Option key={type} value={type}>
                                  {type}
                                </Option>
                              ))}
                            </OptGroup>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item
                        {...f}
                        label="设施名称"
                        name={[f.name, 'name']}
                        rules={[{ required: true, message: '请输入名称' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="设施名称" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item
                        {...f}
                        label="数量"
                        name={[f.name, 'quantity']}
                        rules={[{ required: true, message: '必填' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item
                        {...f}
                        label="原价(元)"
                        name={[f.name, 'originalPriceCents']}
                        rules={[{ required: true, message: '必填' }]}
                        style={{ marginBottom: 0 }}
                        {...moneyInputFormItemProps}
                      >
                        <InputNumber
                          min={0}
                          precision={2}
                          style={{ width: '100%' }}
                          placeholder="0"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item
                        {...f}
                        label="已使用年限"
                        name={[f.name, 'yearsInUse']}
                        rules={[
                          { required: true, message: '必填' },
                          { type: 'number', min: 0, max: 50, message: '年限应在0-50年之间' },
                        ]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          min={0}
                          max={50}
                          step={0.5}
                          precision={1}
                          style={{ width: '100%' }}
                          placeholder="0"
                          addonAfter="年"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={24} md={8}>
                      <Form.Item
                        {...f}
                        label="备注"
                        name={[f.name, 'notes']}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="选填" maxLength={500} showCount />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Button
                        danger
                        size="small"
                        onClick={() => remove(f.name)}
                        style={{ marginTop: 8 }}
                      >
                        删除
                      </Button>
                    </Col>
                  </Row>
                </div>
              ))}
              <Button
                onClick={() =>
                  add({
                    type: '其他',
                    name: '其他',
                    quantity: 1,
                    originalPriceCents: 0,
                    yearsInUse: 0,
                    notes: '',
                  })
                }
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
