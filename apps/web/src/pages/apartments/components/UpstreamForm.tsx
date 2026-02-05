import { Button, Card, Form, Input, InputNumber, Space, Typography } from 'antd';
import { useEffect } from 'react';
import type { Upstream } from '../../../lib/api/types';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { apartmentsApi } from '../../../lib/api/index';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useOrgId } from '../../../hooks/useOrgId';
import { moneyInputFormItemProps } from '../../../components/forms';

interface UpstreamFormProps {
  apartmentId: string;
  upstream: Upstream | null;
  loading: boolean;
  canRead: boolean;
  canWrite: boolean;
  onSuccess?: () => void;
}

export function UpstreamForm({
  apartmentId,
  upstream,
  loading,
  canRead,
  canWrite,
  onSuccess,
}: UpstreamFormProps) {
  const orgId = useOrgId();
  const [form] = Form.useForm<Partial<Upstream>>();

  useEffect(() => {
    if (canRead) {
      if (upstream) {
        form.setFieldsValue(upstream);
      } else {
        form.resetFields();
      }
    }
  }, [canRead, form, upstream]);

  const updateMutation = useApiMutation({
    mutationFn: (data: Partial<Upstream>) =>
      apartmentsApi.updateUpstream(orgId!, apartmentId, data),
    invalidateQueries: [queryKeys.apartments.upstream(orgId!, apartmentId)],
    successMessage: '已保存',
    errorMessage: '保存失败',
    onSuccess: () => {
      onSuccess?.();
    },
  });

  const handleSave = async () => {
    const values = await form.validateFields();
    updateMutation.mutate(values);
  };

  return (
    <Card loading={loading}>
      <Form
        form={form}
        layout="vertical"
        disabled={!canWrite}
        initialValues={upstream ?? undefined}
      >
        <Space wrap>
          <Form.Item
            label="转让费(元)"
            name="transferFeeCents"
            {...moneyInputFormItemProps}
          >
            <InputNumber min={0} precision={2} step={0.01} />
          </Form.Item>
          <Form.Item
            label="装修费押金(元)"
            name="renovationDepositCents"
            {...moneyInputFormItemProps}
          >
            <InputNumber min={0} precision={2} step={0.01} />
          </Form.Item>
          <Form.Item
            label="装修费(元)"
            name="renovationFeeCents"
            {...moneyInputFormItemProps}
          >
            <InputNumber min={0} precision={2} step={0.01} />
          </Form.Item>
          <Form.Item
            label="其他前期成本(元)"
            name="upfrontOtherCents"
            {...moneyInputFormItemProps}
          >
            <InputNumber min={0} precision={2} step={0.01} />
          </Form.Item>
        </Space>

        <Space wrap>
          <Form.Item
            label="上游押金(元)"
            name="upstreamDepositCents"
            {...moneyInputFormItemProps}
          >
            <InputNumber min={0} precision={2} step={0.01} />
          </Form.Item>
          <Form.Item
            label="上游月租(元每月)"
            name="upstreamRentBaseCents"
            {...moneyInputFormItemProps}
          >
            <InputNumber min={0} precision={2} step={0.01} />
          </Form.Item>
          <Form.Item label="租金递增类型" name="upstreamRentIncreaseType">
            <Input />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.upstreamRentIncreaseType !== curr.upstreamRentIncreaseType}
          >
            {({ getFieldValue }) => {
              const increaseType = getFieldValue('upstreamRentIncreaseType');
              return (
                <Form.Item
                  label="递增值"
                  name="upstreamRentIncreaseValue"
                  getValueProps={(value: number | null | undefined) => {
                    if (increaseType === 'PERCENT') {
                      return { value: value == null ? value : value };
                    }
                    return { value: value == null ? value : value / 100 };
                  }}
                  normalize={(value: number | null) => {
                    if (increaseType === 'PERCENT') {
                      return value == null ? value : value;
                    }
                    return value == null ? value : Math.round(value * 100);
                  }}
                >
                  <InputNumber min={0} precision={increaseType === 'PERCENT' ? 0 : 2} />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item label="递增周期(月)" name="upstreamRentIncreaseIntervalMonths">
            <InputNumber min={1} />
          </Form.Item>
        </Space>

        <Form.Item label="备注" name="notes">
          <Input.TextArea rows={3} />
        </Form.Item>

        {canWrite ? (
          <Button type="primary" onClick={handleSave} loading={updateMutation.isLoading}>
            保存
          </Button>
        ) : (
          <Typography.Text type="secondary">无权限编辑</Typography.Text>
        )}
      </Form>
    </Card>
  );
}
