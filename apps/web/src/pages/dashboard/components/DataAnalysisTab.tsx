import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Card, Col, Row, Spin, Statistic } from 'antd';
import { OccupancyChart } from './OccupancyChart';
import { BillOverviewCard } from './BillOverviewCard';
import type { KpisResponse } from '../types';

interface DataAnalysisTabProps {
  kpis?: KpisResponse['kpis'];
  kpisLoading: boolean;
}

function StatCard({
  title,
  value,
  suffix,
  prefix,
  loading = false,
}: {
  title: string;
  value: number;
  suffix?: string;
  prefix?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card className="rounded-xl shadow-md">
      <Spin spinning={loading}>
        <Statistic
          title={<span className="text-sm text-text-secondary">{title}</span>}
          value={value}
          suffix={suffix}
          prefix={prefix}
        />
      </Spin>
    </Card>
  );
}

export function DataAnalysisTab({ kpis, kpisLoading }: DataAnalysisTabProps) {
  const occupancyRate = Math.round(((kpis?.occupancyRate ?? 0) * 10000)) / 100;

  return (
    <Row gutter={[24, 24]} className="m-0">
      {/* KPI 统计 */}
      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="公寓数"
          value={kpis?.apartmentCount ?? 0}
          loading={kpisLoading}
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="房间数"
          value={kpis?.totalRoomCount ?? 0}
          loading={kpisLoading}
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="已出租"
          value={kpis?.occupiedRoomCount ?? 0}
          loading={kpisLoading}
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="入住率"
          value={occupancyRate}
          suffix="%"
          prefix={occupancyRate >= 80 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          loading={kpisLoading}
        />
      </Col>

      {/* 图表和账单概览 */}
      <Col xs={24} lg={12}>
        <Card
          title={<span className="font-medium">入住情况</span>}
          loading={kpisLoading}
          className="rounded-xl shadow-md h-full"
        >
          <OccupancyChart data={kpis} />
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <BillOverviewCard kpis={kpis} loading={kpisLoading} />
      </Col>
    </Row>
  );
}
