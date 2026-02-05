import { Button, Card, Table } from 'antd';
import type { FeePricing } from '../../../lib/api/types';
import { formatMoney } from '../../../utils/format';

interface FeePricingCardProps {
  feePricings: FeePricing[];
  loading: boolean;
  canEdit: boolean;
  onEdit: () => void;
}

export function FeePricingCard({ feePricings, loading, canEdit, onEdit }: FeePricingCardProps) {
  return (
    <Card
      loading={loading}
      extra={
        canEdit ? (
          <Button onClick={onEdit}>编辑</Button>
        ) : null
      }
    >
      <Table<FeePricing>
        rowKey="id"
        dataSource={feePricings}
        pagination={false}
        columns={[
          { title: '类型', dataIndex: 'feeType' },
          { title: '模式', dataIndex: 'mode' },
          {
            title: '固定金额(元)',
            dataIndex: 'fixedAmountCents',
            render: (v: number | null | undefined) => (v == null ? '-' : formatMoney(v)),
          },
          {
            title: '单价(元)',
            dataIndex: 'unitPriceCents',
            render: (v: number | null | undefined) => (v == null ? '-' : formatMoney(v)),
          },
          { title: '单位', dataIndex: 'unitName' },
        ]}
      />
    </Card>
  );
}
