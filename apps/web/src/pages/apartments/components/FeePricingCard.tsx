import { Badge, Button, Card, Collapse, Table, Tag, Typography } from 'antd';
import type { FeePricing } from '../../../lib/api/types';
import { formatMoney } from '../../../utils/format';
import { FEE_TYPE_NAMES, BILLING_TIMING } from '../../../constants/feeTypes';

interface FeePricingCardProps {
  feePricings: FeePricing[];
  loading: boolean;
  canEdit: boolean;
  onEdit: () => void;
}

export function FeePricingCard({ feePricings, loading, canEdit, onEdit }: FeePricingCardProps) {
  const columns = [
    {
      title: '费用类型',
      dataIndex: 'feeType',
      render: (feeType: string) => FEE_TYPE_NAMES[feeType as keyof typeof FEE_TYPE_NAMES] || feeType,
    },
    {
      title: '计费方式',
      dataIndex: 'mode',
      render: (mode: string) => (mode === 'FIXED' ? '固定计费' : '按用量计费'),
    },
    {
      title: '结算时机',
      dataIndex: 'billingTiming',
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
      title: '价格',
      key: 'price',
      render: (_: any, record: FeePricing) => {
        if (record.hasSpecs && record.specs && record.specs.length > 0) {
          return (
            <Badge count={record.specs.length} showZero={false}>
              <Tag color="purple">多规格</Tag>
            </Badge>
          );
        }
        if (record.mode === 'FIXED') {
          return record.fixedAmountCents != null ? formatMoney(record.fixedAmountCents) : '-';
        }
        return record.unitPriceCents != null
          ? `${formatMoney(record.unitPriceCents)}/${record.unitName || '单位'}`
          : '-';
      },
    },
    {
      title: '备注',
      dataIndex: 'notes',
      render: (notes: string | null | undefined) => notes || '-',
      ellipsis: true,
    },
  ];

  const expandedRowRender = (record: FeePricing) => {
    if (!record.hasSpecs || !record.specs || record.specs.length === 0) {
      return null;
    }

    const specColumns = [
      {
        title: '规格名称',
        dataIndex: 'name',
      },
      {
        title: '描述',
        dataIndex: 'description',
        render: (desc: string | null | undefined) => desc || '-',
      },
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
      {
        title: '状态',
        dataIndex: 'isActive',
        render: (active: boolean) => (active ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>),
      },
    ];

    return (
      <Table
        columns={specColumns}
        dataSource={record.specs}
        rowKey="id"
        pagination={false}
        size="small"
      />
    );
  };

  return (
    <Card
      loading={loading}
      title="费用定价"
      extra={
        canEdit ? (
          <Button type="primary" onClick={onEdit}>
            添加费用项目
          </Button>
        ) : null
      }
    >
      <Table<FeePricing>
        rowKey="id"
        dataSource={feePricings}
        pagination={false}
        columns={columns}
        expandable={{
          expandedRowRender,
          rowExpandable: (record) => record.hasSpecs && (record.specs?.length ?? 0) > 0,
        }}
      />
    </Card>
  );
}
