import { Card, Col, Row, Statistic, Table, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth';

type KpisResponse = {
  asOf: string;
  kpis: {
    apartmentCount: number;
    totalRoomCount: number;
    occupiedRoomCount: number;
    occupancyRate: number;
    invoiceIssuedCount: number;
    invoiceIssuedTotalCents: number;
    invoiceOverdueCount: number;
    invoiceOverdueTotalCents: number;
  };
};

type VacantRoomsResponse = {
  asOf: string;
  rooms: Array<{
    id: string;
    name: string;
    apartment: { id: string; name: string; address: string };
  }>;
};

type LeaseExpiringResponse = {
  now: string;
  until: string;
  leases: Array<{
    id: string;
    endDate: string;
    room: { id: string; name: string; apartment: { id: string; name: string } };
    tenant: { id: string; name: string; phone: string };
  }>;
};

export function DashboardPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);

  const kpisQuery = useQuery({
    queryKey: ['dashboard', 'kpis', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/dashboard/kpis`);
      return r.data as KpisResponse;
    },
  });

  const vacantQuery = useQuery({
    queryKey: ['dashboard', 'vacant', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/dashboard/vacant-rooms`);
      return r.data as VacantRoomsResponse;
    },
  });

  const expiringQuery = useQuery({
    queryKey: ['dashboard', 'expiring', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/dashboard/lease-expiring?days=30`);
      return r.data as LeaseExpiringResponse;
    },
  });

  const chartOption = useMemo(() => {
    const k = kpisQuery.data?.kpis;
    if (!k) return undefined;

    const vacant = Math.max(0, k.totalRoomCount - k.occupiedRoomCount);
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          data: [
            { value: k.occupiedRoomCount, name: '已出租' },
            { value: vacant, name: '空房' },
          ],
        },
      ],
    };
  }, [kpisQuery.data]);

  if (!orgId) {
    return <Typography.Text type="secondary">请先选择组织</Typography.Text>;
  }

  const k = kpisQuery.data?.kpis;

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          看板
        </Typography.Title>
      </Col>

      <Col xs={24} md={6}>
        <Card>
          <Statistic title="公寓数" value={k?.apartmentCount ?? 0} loading={kpisQuery.isLoading} />
        </Card>
      </Col>
      <Col xs={24} md={6}>
        <Card>
          <Statistic title="房间数" value={k?.totalRoomCount ?? 0} loading={kpisQuery.isLoading} />
        </Card>
      </Col>
      <Col xs={24} md={6}>
        <Card>
          <Statistic title="已出租" value={k?.occupiedRoomCount ?? 0} loading={kpisQuery.isLoading} />
        </Card>
      </Col>
      <Col xs={24} md={6}>
        <Card>
          <Statistic
            title="入住率"
            value={Math.round(((k?.occupancyRate ?? 0) * 10000)) / 100}
            suffix="%"
            loading={kpisQuery.isLoading}
          />
        </Card>
      </Col>

      <Col xs={24} md={12}>
        <Card title="入住情况" loading={kpisQuery.isLoading}>
          {chartOption ? <ReactECharts option={chartOption} style={{ height: 260 }} /> : null}
        </Card>
      </Col>

      <Col xs={24} md={12}>
        <Card title="账单概览" loading={kpisQuery.isLoading}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Statistic title="未结账单数" value={k?.invoiceIssuedCount ?? 0} />
            </Col>
            <Col span={12}>
              <Statistic title="未结金额" value={(k?.invoiceIssuedTotalCents ?? 0) / 100} prefix="¥" precision={2} />
            </Col>
            <Col span={12}>
              <Statistic title="逾期账单数" value={k?.invoiceOverdueCount ?? 0} />
            </Col>
            <Col span={12}>
              <Statistic title="逾期金额" value={(k?.invoiceOverdueTotalCents ?? 0) / 100} prefix="¥" precision={2} />
            </Col>
          </Row>
        </Card>
      </Col>

      <Col xs={24} md={12}>
        <Card title="空房列表" loading={vacantQuery.isLoading}>
          <Table
            size="small"
            pagination={{ pageSize: 5 }}
            rowKey="id"
            dataSource={vacantQuery.data?.rooms ?? []}
            columns={[
              { title: '公寓', dataIndex: ['apartment', 'name'] },
              { title: '房间', dataIndex: 'name' },
              { title: '地址', dataIndex: ['apartment', 'address'] },
            ]}
          />
        </Card>
      </Col>

      <Col xs={24} md={12}>
        <Card title="30天到期提醒" loading={expiringQuery.isLoading}>
          <Table
            size="small"
            pagination={{ pageSize: 5 }}
            rowKey="id"
            dataSource={expiringQuery.data?.leases ?? []}
            columns={[
              { title: '公寓', dataIndex: ['room', 'apartment', 'name'] },
              { title: '房间', dataIndex: ['room', 'name'] },
              { title: '租客', dataIndex: ['tenant', 'name'] },
              {
                title: '到期日',
                dataIndex: 'endDate',
                render: (v: string) => (v ? new Date(v).toLocaleDateString() : '-'),
              },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
}

