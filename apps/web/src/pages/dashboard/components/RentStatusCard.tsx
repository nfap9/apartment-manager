import { Card, Col, Row, Statistic } from 'antd';
import type { RentStatusData } from '../types';
import type { KpisResponse } from '../types';

interface RentStatusCardProps {
  rentData?: RentStatusData;
  kpis?: KpisResponse['kpis'];
  loading?: boolean;
}

export function RentStatusCard({ rentData, kpis, loading }: RentStatusCardProps) {
  return (
    <Card
      title={<span className="font-medium">房租状态</span>}
      loading={loading}
      className="rounded-xl shadow-md h-full"
    >
      <Row gutter={[24, 24]}>
        <Col xs={12} sm={12}>
          <Statistic
            title={<span className="text-[13px] text-text-secondary">待交房租</span>}
            value={rentData?.pendingCount ?? 0}
          />
          <div className="mt-2 text-sm text-text-tertiary">
            金额: ¥{((rentData?.pendingAmount ?? 0) / 100).toFixed(2)}
          </div>
        </Col>
        <Col xs={12} sm={12}>
          <Statistic
            title={<span className="text-[13px] text-text-secondary">已交房租</span>}
            value={rentData?.paidCount ?? 0}
          />
          <div className="mt-2 text-sm text-text-tertiary">
            金额: ¥{((rentData?.paidAmount ?? 0) / 100).toFixed(2)}
          </div>
        </Col>
        <Col xs={12} sm={12}>
          <Statistic
            title={<span className="text-[13px] text-text-secondary">即将到期</span>}
            value={rentData?.soonDueCount ?? 0}
          />
          <div className="mt-2 text-sm text-text-tertiary">
            金额: ¥{((rentData?.soonDueAmount ?? 0) / 100).toFixed(2)}
          </div>
        </Col>
        <Col xs={12} sm={12}>
          <Statistic
            title={<span className="text-[13px] text-text-secondary">逾期账单</span>}
            value={kpis?.invoiceOverdueCount ?? 0}
          />
          <div className="mt-2 text-sm text-text-tertiary">
            金额: ¥{((kpis?.invoiceOverdueTotalCents ?? 0) / 100).toFixed(2)}
          </div>
        </Col>
      </Row>
    </Card>
  );
}
