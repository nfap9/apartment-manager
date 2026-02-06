import { Button, Card } from 'antd';
import type { FeePricing } from '../../../lib/api/types';
import { FeePricingTable } from './FeePricingTable';

interface FeePricingCardProps {
  feePricings: FeePricing[];
  loading: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete?: (feePricing: FeePricing) => void;
}

export function FeePricingCard({
  feePricings,
  loading,
  canEdit,
  onEdit,
  onDelete,
}: FeePricingCardProps) {
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
      <FeePricingTable
        feePricings={feePricings}
        loading={loading}
        showDelete={canEdit && !!onDelete}
        onDelete={onDelete}
      />
    </Card>
  );
}
