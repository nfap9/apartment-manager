import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Col, Row } from 'antd';
import { StatCard } from './StatCard';
import { RentStatusCard } from './RentStatusCard';
import { VacantRoomsTable } from './VacantRoomsTable';
import { LeaseExpiringTable } from './LeaseExpiringTable';
import { SoonDueRentTable } from './SoonDueRentTable';
import type { KpisResponse, VacantRoomsResponse, LeaseExpiringResponse, RentStatusData } from '../types';

interface ApartmentStatusTabProps {
  kpis?: KpisResponse['kpis'];
  kpisLoading: boolean;
  vacantData?: VacantRoomsResponse;
  vacantLoading: boolean;
  expiringData?: LeaseExpiringResponse;
  expiringLoading: boolean;
  rentData?: RentStatusData;
  rentLoading: boolean;
}

export function ApartmentStatusTab({
  kpis,
  kpisLoading,
  vacantData,
  vacantLoading,
  expiringData,
  expiringLoading,
  rentData,
  rentLoading,
}: ApartmentStatusTabProps) {
  const occupancyRate = Math.round(((kpis?.occupancyRate ?? 0) * 10000)) / 100;
  const vacantCount = Math.max(0, (kpis?.totalRoomCount ?? 0) - (kpis?.occupiedRoomCount ?? 0));

  return (
    <Row gutter={[24, 24]} className="m-0">
      {/* 房间统计 */}
      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="总房间数"
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
          title="空房"
          value={vacantCount}
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

      {/* 房租状态 */}
      <Col xs={24} lg={12}>
        <RentStatusCard
          rentData={rentData}
          kpis={kpis}
          loading={rentLoading}
        />
      </Col>

      {/* 空房列表 */}
      <Col xs={24} lg={12}>
        <VacantRoomsTable
          data={vacantData}
          loading={vacantLoading}
        />
      </Col>

      {/* 即将到期 */}
      <Col xs={24} lg={12}>
        <LeaseExpiringTable
          data={expiringData}
          loading={expiringLoading}
        />
      </Col>

      {/* 即将到期的房租 */}
      <Col xs={24} lg={12}>
        <SoonDueRentTable
          data={rentData?.soonDueList}
          loading={rentLoading}
        />
      </Col>
    </Row>
  );
}
