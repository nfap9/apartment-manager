import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAuthStore } from '../../stores/auth';
import { usePermissions } from '../../hooks/usePermissions';
import { feesApi } from '../../lib/api/fees';
import type { FeeItem } from '../../lib/api/types';
import { FeeTypeSelect, BillingTimingSelect, FeeSpecFields } from '../../components/forms';
import { BILLING_MODE_OPTIONS, FEE_TYPE_NAMES, BILLING_TIMING } from '../../constants/feeTypes';
import { moneyInputFormItemProps } from '../../components/forms/MoneyInput';
import { formatMoney } from '../../utils/format';
import type { ApiErrorResponse } from '../../lib/apiTypes';

export function FeesPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const { hasPermission } = usePermissions();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FeeItem | null>(null);
  const [form] = Form.useForm();

  const canManage = hasPermission('fee.manage');

  const { data, isLoading } = useQuery({
    queryKey: ['feeItems', orgId],
    enabled: !!orgId && canManage,
    queryFn: async () => {
      if (!orgId) throw new Error('No orgId');
      return feesApi.getFeeItems(orgId);
    },
  });

  const feeItems = data?.feeItems ?? [];

  useEffect(() => {
    if (modalOpen && editingItem) {
      form.setFieldsValue({
        ...editingItem,
        specs: editingItem.specs || [],
      });
    } else if (modalOpen && !editingItem) {
      form.resetFields();
    }
  }, [modalOpen, editingItem, form]);

  const handleAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item: FeeItem) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDelete = async (item: FeeItem) => {
    if (!orgId) return;
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除费用项目"${item.name}"吗？`,
      onOk: async () => {
        try {
          await feesApi.deleteFeeItem(orgId, item.id);
          message.success('已删除');
          await qc.invalidateQueries({ queryKey: ['feeItems', orgId] });
        } catch (err) {
          const e = err as AxiosError<ApiErrorResponse>;
          message.error(e.response?.data?.error?.message ?? '删除失败');
        }
      },
    });
  };

  const handleSave = async () => {
    if (!orgId) return;
    try {
      const values = await form.validateFields();
      const { specs, ...rest } = values;
      const processedSpecs = specs?.map((spec: any) => {
        const { id, ...specData } = spec;
        return id ? { id, ...specData } : specData;
      });

      if (editingItem) {
        await feesApi.updateFeeItem(orgId, editingItem.id, {
          ...rest,
          specs: processedSpecs,
        });
        message.success('已更新');
      } else {
        await feesApi.createFeeItem(orgId, {
          ...rest,
          specs: processedSpecs,
        });
        message.success('已创建');
      }
      setModalOpen(false);
      setEditingItem(null);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ['feeItems', orgId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '保存失败');
    }
  };

  if (!orgId) {
    return <Typography.Text type="secondary">请先选择组织</Typography.Text>;
  }

  if (!canManage) {
    return <Typography.Text type="secondary">您没有权限访问此页面</Typography.Text>;
  }

  const columns = [
    {
      title: '费用类型',
      dataIndex: 'feeType',
      render: (feeType: string) => FEE_TYPE_NAMES[feeType as keyof typeof FEE_TYPE_NAMES] || feeType,
    },
    {
      title: '名称',
      dataIndex: 'name',
    },
    {
      title: '计费方式',
      dataIndex: 'mode',
      render: (mode: string) => (mode === 'FIXED' ? '固定计费' : '按用量计费'),
    },
    {
      title: '默认结算时机',
      dataIndex: 'defaultBillingTiming',
      render: (timing: string | null | undefined) => {
        if (!timing) return '-';
        return timing === BILLING_TIMING.PREPAID ? (
          <Tag color="blue">周期前</Tag>
        ) : (
          <Tag color="orange">周期后</Tag>
        );
      },
    },
    {
      title: '默认价格',
      key: 'price',
      render: (_: any, record: FeeItem) => {
        if (record.hasSpecs && record.specs && record.specs.length > 0) {
          return <Tag color="purple">{record.specs.length} 个规格</Tag>;
        }
        if (record.mode === 'FIXED') {
          return record.defaultFixedAmountCents != null ? formatMoney(record.defaultFixedAmountCents) : '-';
        }
        return record.defaultUnitPriceCents != null
          ? `${formatMoney(record.defaultUnitPriceCents)}/${record.defaultUnitName || '单位'}`
          : '-';
      },
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      render: (active: boolean) => (active ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: FeeItem) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const mode = Form.useWatch('mode', form) || 'FIXED';
  const hasSpecs = Form.useWatch('hasSpecs', form) || false;
  const feeType = Form.useWatch('feeType', form);

  return (
    <>
      <div className="page-wrapper">
        <Card
          title="费用项目管理"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加费用项目
            </Button>
          }
        >
          <Table
            rowKey="id"
            dataSource={feeItems}
            loading={isLoading}
            columns={columns}
            pagination={false}
            expandable={{
              expandedRowRender: (record: FeeItem) => {
                if (!record.hasSpecs || !record.specs || record.specs.length === 0) {
                  return null;
                }
                return (
                  <Table
                    size="small"
                    dataSource={record.specs}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      { title: '规格名称', dataIndex: 'name' },
                      { title: '描述', dataIndex: 'description', render: (v) => v || '-' },
                      {
                        title: '价格',
                        key: 'price',
                        render: (_: any, spec: any) => {
                          if (record.mode === 'FIXED') {
                            return spec.fixedAmountCents != null ? formatMoney(spec.fixedAmountCents) : '-';
                          }
                          return spec.unitPriceCents != null
                            ? `${formatMoney(spec.unitPriceCents)}/${spec.unitName || '单位'}`
                            : '-';
                        },
                      },
                    ]}
                  />
                );
              },
              rowExpandable: (record) => record.hasSpecs && (record.specs?.length ?? 0) > 0,
            }}
          />
        </Card>
      </div>

      <Modal
        open={modalOpen}
        title={editingItem ? '编辑费用项目' : '添加费用项目'}
        onCancel={() => {
          setModalOpen(false);
          setEditingItem(null);
          form.resetFields();
        }}
        onOk={handleSave}
        destroyOnClose
        width={900}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Space wrap align="baseline">
            <Form.Item
              label="费用类型"
              name="feeType"
              rules={[{ required: true, message: '请选择费用类型' }]}
            >
              <FeeTypeSelect style={{ width: 150 }} />
            </Form.Item>
            <Form.Item
              label="名称"
              name="name"
              rules={[{ required: true, message: '请输入名称' }]}
            >
              <Input style={{ width: 200 }} placeholder="如：网费、管理费" />
            </Form.Item>
            <Form.Item
              label="计费方式"
              name="mode"
              rules={[{ required: true }]}
            >
              <Select options={BILLING_MODE_OPTIONS} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item
              label="默认结算时机"
              name="defaultBillingTiming"
            >
              <BillingTimingSelect style={{ width: 150 }} />
            </Form.Item>
            <Form.Item
              label="支持多规格"
              name="hasSpecs"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Space>

          {!hasSpecs && (
            <Space wrap align="baseline" style={{ marginTop: 16 }}>
              {mode === 'FIXED' ? (
                <Form.Item
                  label="默认固定金额(元)"
                  name="defaultFixedAmountCents"
                  rules={[{ required: !hasSpecs, message: '请输入默认固定金额' }]}
                  {...moneyInputFormItemProps}
                >
                  <InputNumber min={0} precision={2} step={0.01} style={{ width: 200 }} />
                </Form.Item>
              ) : (
                <>
                  <Form.Item
                    label="默认单价(元)"
                    name="defaultUnitPriceCents"
                    rules={[{ required: !hasSpecs, message: '请输入默认单价' }]}
                    {...moneyInputFormItemProps}
                  >
                    <InputNumber min={0} precision={2} step={0.01} style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item
                    label="默认单位"
                    name="defaultUnitName"
                  >
                    <Input style={{ width: 120 }} placeholder="如：度" />
                  </Form.Item>
                </>
              )}
            </Space>
          )}

          {hasSpecs && (
            <div style={{ marginTop: 16 }}>
              <Typography.Text strong>规格管理</Typography.Text>
              <Form.List name="specs">
                {(fields, { add, remove }) => (
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    {fields.map((f) => (
                      <FeeSpecFields
                        key={f.key}
                        form={form}
                        fieldName={f.name}
                        mode={mode}
                        onRemove={() => remove(f.name)}
                      />
                    ))}
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => add()}
                      style={{ width: '100%' }}
                    >
                      添加规格
                    </Button>
                  </Space>
                )}
              </Form.List>
            </div>
          )}

          <Form.Item label="备注" name="notes" style={{ marginTop: 16 }}>
            <Input.TextArea rows={2} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
