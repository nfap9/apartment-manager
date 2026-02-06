import { Card, Col, Row, Statistic } from 'antd';
import type { KpisResponse } from '../types';

interface BillOverviewCardProps {
  kpis?: KpisResponse['kpis'];
  loading?: boolean;
}

export function BillOverviewCard({ kpis, loading }: BillOverviewCardProps) {
  return (
    <Card
      title={<span className="font-medium">账单概览</span>}
      loading={loading}
      className="rounded-xl shadow-md h-full"
    >
      <Row gutter={[24, 24]}>
        <Col xs={12} sm={12}>
          <Statistic
            title={<span className="text-[13px] text-text-secondary">未结账单数</span>}
            value={kpis?.invoiceIssuedCount ?? 0}
          />
        </Col>
        <Col xs={12} sm={12}>
          <Statistic
            title={<span className="text-[13px] text-text-secondary">未结金额</span>}
            value={(kpis?.invoiceIssuedTotalCents ?? 0) / 100}
            prefix="¥"
            precision={2}
          />
        </Col>
        <Col xs={12} sm={12}>
          <Statistic
            title={<span className="text-[13px] text-text-secondary">逾期账单数</span>}
            value={kpis?.invoiceOverdueCount ?? 0}
          />
        </Col>
        <Col xs={12} sm={12}>
          <Statistic
            title={<span className="text-[13px] text-text-secondary">逾期金额</span>}
            value={(kpis?.invoiceOverdueTotalCents ?? 0) / 100}
            prefix="¥"
            precision={2}
          />
        </Col>
      </Row>
    </Card>
  );
}
