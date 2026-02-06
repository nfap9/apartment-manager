import { Button, Form, Input, InputNumber, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { FeePricingSpec } from '../../lib/api/types';
import { moneyInputFormItemProps } from './MoneyInput';

export interface FeeSpecFieldsProps {
  form: any;
  fieldName: string | number;
  mode: 'FIXED' | 'METERED';
  onRemove?: () => void;
}

/**
 * 费用规格编辑字段组（用于费用定价模态框）
 */
export function FeeSpecFields({ form, fieldName, mode, onRemove }: FeeSpecFieldsProps) {
  return (
    <div
      style={{
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        padding: '16px',
        backgroundColor: '#fafafa',
        marginBottom: '12px',
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Space wrap align="baseline" style={{ width: '100%' }}>
          <Form.Item
            name={[fieldName, 'name']}
            label="规格名称"
            rules={[{ required: true, message: '请输入规格名称' }]}
            style={{ marginBottom: 0, width: 150 }}
          >
            <Input placeholder="如：100M" />
          </Form.Item>
          <Form.Item
            name={[fieldName, 'description']}
            label="描述"
            style={{ marginBottom: 0, width: 200 }}
          >
            <Input placeholder="选填" />
          </Form.Item>
          {mode === 'FIXED' ? (
            <Form.Item
              name={[fieldName, 'fixedAmountCents']}
              label="固定金额(元)"
              rules={[{ required: true, message: '请输入固定金额' }]}
              style={{ marginBottom: 0 }}
              {...moneyInputFormItemProps}
            >
              <InputNumber min={0} precision={2} step={0.01} style={{ width: 150 }} />
            </Form.Item>
          ) : (
            <>
              <Form.Item
                name={[fieldName, 'unitPriceCents']}
                label="单价(元)"
                rules={[{ required: true, message: '请输入单价' }]}
                style={{ marginBottom: 0 }}
                {...moneyInputFormItemProps}
              >
                <InputNumber min={0} precision={2} step={0.01} style={{ width: 150 }} />
              </Form.Item>
              <Form.Item
                name={[fieldName, 'unitName']}
                label="单位"
                style={{ marginBottom: 0, width: 100 }}
              >
                <Input placeholder="如：度" />
              </Form.Item>
            </>
          )}
          <Form.Item
            name={[fieldName, 'sortOrder']}
            label="排序"
            style={{ marginBottom: 0, width: 100 }}
          >
            <InputNumber min={0} style={{ width: 80 }} />
          </Form.Item>
          {onRemove && (
            <Button danger icon={<DeleteOutlined />} onClick={onRemove}>
              删除
            </Button>
          )}
        </Space>
      </Space>
    </div>
  );
}
