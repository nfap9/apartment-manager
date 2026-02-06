import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FeePricing, FeeItem } from '../../../lib/api/types';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { apartmentsApi, feesApi } from '../../../lib/api/index';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useOrgId } from '../../../hooks/useOrgId';
import { moneyInputFormItemProps, BillingTimingSelect, FeeSpecSelect } from '../../../components/forms';
import { BILLING_MODE_OPTIONS, FEE_TYPE_NAMES, BILLING_TIMING } from '../../../constants/feeTypes';
import { formatMoney } from '../../../utils/format';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

// 费用项表单项组件（用于在 Form.List 中使用 hooks）
function FeeItemFormItem({ field, form, onRemove }: { field: any; form: any; onRemove: () => void }) {
  const mode = Form.useWatch([field.name, 'mode'], form) || 'FIXED';
  const hasSpecs = Form.useWatch([field.name, 'hasSpecs'], form) || false;
  const specs = Form.useWatch([field.name, 'specs'], form) || [];
  const selectedSpecId = Form.useWatch([field.name, 'selectedSpecId'], form);
  const selectedSpec = specs.find((s: any) => s.id === selectedSpecId);

  return (
    <Card
      key={field.key}
      size="small"
      title={
        <Space>
          <Typography.Text strong>
            {FEE_TYPE_NAMES[form.getFieldValue([field.name, 'feeType'])] || '费用项目'}
          </Typography.Text>
        </Space>
      }
      extra={
        <Button danger size="small" icon={<DeleteOutlined />} onClick={onRemove}>
          删除
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Space wrap align="baseline">
          <Form.Item
            {...field}
            label="计费方式"
            name={[field.name, 'mode']}
            style={{ marginBottom: 0 }}
          >
            <Select options={BILLING_MODE_OPTIONS} style={{ width: 150 }} disabled />
          </Form.Item>
          <Form.Item
            {...field}
            label="结算时机"
            name={[field.name, 'billingTiming']}
            style={{ marginBottom: 0 }}
          >
            <BillingTimingSelect style={{ width: 150 }} />
          </Form.Item>
          {hasSpecs && specs.length > 0 && (
            <Form.Item
              {...field}
              label="选择规格"
              name={[field.name, 'selectedSpecId']}
              style={{ marginBottom: 0 }}
            >
              <FeeSpecSelect
                specs={specs}
                style={{ width: 200 }}
                onSpecChange={(spec) => {
                  if (spec) {
                    if (mode === 'FIXED' && spec.fixedAmountCents != null) {
                      form.setFieldValue([field.name, 'fixedAmountCents'], spec.fixedAmountCents);
                    } else if (mode === 'METERED' && spec.unitPriceCents != null) {
                      form.setFieldValue([field.name, 'unitPriceCents'], spec.unitPriceCents);
                      form.setFieldValue([field.name, 'unitName'], spec.unitName || '');
                    }
                  }
                }}
              />
            </Form.Item>
          )}
        </Space>

        {!hasSpecs && (
          <Space wrap align="baseline">
            {mode === 'FIXED' ? (
              <Form.Item
                {...field}
                label="固定金额(元)"
                name={[field.name, 'fixedAmountCents']}
                rules={[{ required: !hasSpecs, message: '请输入固定金额' }]}
                style={{ marginBottom: 0 }}
                {...moneyInputFormItemProps}
              >
                <InputNumber min={0} precision={2} step={0.01} style={{ width: 200 }} />
              </Form.Item>
            ) : (
              <>
                <Form.Item
                  {...field}
                  label="单价(元)"
                  name={[field.name, 'unitPriceCents']}
                  rules={[{ required: !hasSpecs, message: '请输入单价' }]}
                  style={{ marginBottom: 0 }}
                  {...moneyInputFormItemProps}
                >
                  <InputNumber min={0} precision={2} step={0.01} style={{ width: 200 }} />
                </Form.Item>
                <Form.Item
                  {...field}
                  label="单位"
                  name={[field.name, 'unitName']}
                  style={{ marginBottom: 0, width: 120 }}
                >
                  <Input placeholder="如：度" />
                </Form.Item>
              </>
            )}
          </Space>
        )}

        {hasSpecs && selectedSpec && (
          <Space wrap align="baseline">
            {mode === 'FIXED' ? (
              <Form.Item
                {...field}
                label="固定金额(元)"
                name={[field.name, 'fixedAmountCents']}
                rules={[{ required: true, message: '请输入固定金额' }]}
                style={{ marginBottom: 0 }}
                {...moneyInputFormItemProps}
              >
                <InputNumber min={0} precision={2} step={0.01} style={{ width: 200 }} />
              </Form.Item>
            ) : (
              <>
                <Form.Item
                  {...field}
                  label="单价(元)"
                  name={[field.name, 'unitPriceCents']}
                  rules={[{ required: true, message: '请输入单价' }]}
                  style={{ marginBottom: 0 }}
                  {...moneyInputFormItemProps}
                >
                  <InputNumber min={0} precision={2} step={0.01} style={{ width: 200 }} />
                </Form.Item>
                <Form.Item
                  {...field}
                  label="单位"
                  name={[field.name, 'unitName']}
                  style={{ marginBottom: 0, width: 120 }}
                >
                  <Input placeholder="如：度" />
                </Form.Item>
              </>
            )}
          </Space>
        )}

        <Form.Item
          {...field}
          label="备注"
          name={[field.name, 'notes']}
          style={{ marginBottom: 0 }}
        >
          <Input.TextArea rows={2} placeholder="选填" />
        </Form.Item>
      </Space>
    </Card>
  );
}

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
  const [form] = Form.useForm<{ items: Array<Partial<FeePricing & { feeItemId?: string; selectedSpecId?: string }>> }>();
  const [selectingFeeItem, setSelectingFeeItem] = useState(false);

  // 加载费用项目列表
  const { data: feeItemsData, isLoading: feeItemsLoading, error: feeItemsError } = useQuery({
    queryKey: ['feeItems', orgId],
    enabled: !!orgId && open,
    queryFn: async () => {
      if (!orgId) throw new Error('No orgId');
      return feesApi.getFeeItems(orgId);
    },
  });

  const feeItems = feeItemsData?.feeItems?.filter((item) => item.isActive) ?? [];
  const existingFeeTypes = feePricings.map((fp) => fp.feeType);

  // 过滤掉已经添加的费用类型
  const availableFeeItems = feeItems.filter((item) => !existingFeeTypes.includes(item.feeType));

  useEffect(() => {
    if (open) {
      const items = feePricings.map((fp) => ({
        ...fp,
        specs: fp.specs || [],
      }));
      form.setFieldsValue({ items });
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
    const items = (values.items ?? []).map((item: any) => {
      const { feeItemId, selectedSpecId, specs, ...rest } = item;
      const processedSpecs = specs?.map((spec: any) => {
        const { id, ...specData } = spec;
        return id ? { id, ...specData } : specData;
      });
      return {
        ...rest,
        specs: processedSpecs,
      };
    });
    updateMutation.mutate(items);
  };

  const handleAddFromFeeItem = (feeItem: FeeItem) => {
    const currentItems = form.getFieldValue('items') || [];
    const newItem: any = {
      feeType: feeItem.feeType,
      mode: feeItem.mode,
      fixedAmountCents: feeItem.defaultFixedAmountCents,
      unitPriceCents: feeItem.defaultUnitPriceCents,
      unitName: feeItem.defaultUnitName,
      billingTiming: feeItem.defaultBillingTiming,
      hasSpecs: feeItem.hasSpecs,
      notes: feeItem.notes,
      specs: feeItem.specs?.map((spec) => ({
        ...spec,
        id: undefined, // 新建时不需要 id
      })) || [],
    };
    form.setFieldsValue({
      items: [...currentItems, newItem],
    });
    setSelectingFeeItem(false);
    message.success(`已添加费用项目"${feeItem.name}"`);
  };

  return (
    <Modal
      open={open}
      title="费用定价管理"
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={updateMutation.isLoading}
      destroyOnClose
      width={1000}
    >
        {selectingFeeItem ? (
        <div>
          <Typography.Paragraph>请选择要添加的费用项目：</Typography.Paragraph>
          {feeItemsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Typography.Text type="secondary">加载中...</Typography.Text>
            </div>
          ) : availableFeeItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Typography.Text type="secondary">
                {feeItems.length === 0
                  ? '暂无费用项目，请先在"费用管理"页面创建费用项目'
                  : '所有费用项目已添加，或没有可用的费用项目'}
              </Typography.Text>
            </div>
          ) : (
            <Table
              rowKey="id"
              dataSource={availableFeeItems}
              pagination={false}
              columns={[
              {
                title: '费用类型',
                dataIndex: 'feeType',
                render: (feeType: string) => FEE_TYPE_NAMES[feeType as keyof typeof FEE_TYPE_NAMES] || feeType,
              },
              { title: '名称', dataIndex: 'name' },
              {
                title: '计费方式',
                dataIndex: 'mode',
                render: (mode: string) => (mode === 'FIXED' ? '固定计费' : '按用量计费'),
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
                title: '操作',
                key: 'action',
                render: (_: any, record: FeeItem) => (
                  <Button type="primary" size="small" onClick={() => handleAddFromFeeItem(record)}>
                    选择
                  </Button>
                ),
              },
            ]}
            />
          )}
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button onClick={() => setSelectingFeeItem(false)}>取消</Button>
          </div>
        </div>
      ) : (
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setSelectingFeeItem(true)}
              disabled={availableFeeItems.length === 0}
            >
              添加费用项目
            </Button>
          </div>
          <Form.List name="items">
            {(fields, { remove }) => (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {fields.map((f) => (
                  <FeeItemFormItem key={f.key} field={f} form={form} onRemove={() => remove(f.name)} />
                ))}
                {fields.length === 0 && (
                  <Typography.Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: 40 }}>
                    暂无费用项目，请点击"添加费用项目"按钮添加
                  </Typography.Text>
                )}
              </Space>
            )}
          </Form.List>
        </Form>
      )}
    </Modal>
  );
}
