import { Card, Col, Row, Statistic, Table, Typography, Tag, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
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
    return (
      <Typography.Text type="secondary">请先选择组织</Typography.Text>
    );
  }

  const k = kpisQuery.data?.kpis;
  const occupancyRate = Math.round(((k?.occupancyRate ?? 0) * 10000)) / 100;

  return (
    <div>
      <Row gutter={[24, 24]}>
        {/* KPI 统计 */}
        <Col xs={24} sm={12} lg={6}>
          <Spin spinning={kpisQuery.isLoading}>
            <Statistic
              title={<span style={{ fontSize: 14, color: 'rgba(0, 0, 0, 0.65)' }}>公寓数</span>}
              value={k?.apartmentCount ?? 0}
              valueStyle={{
                fontSize: 32,
                fontWeight: 600,
                color: '#1890ff',
              }}
            />
          </Spin>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Spin spinning={kpisQuery.isLoading}>
            <Statistic
              title={<span style={{ fontSize: 14, color: 'rgba(0, 0, 0, 0.65)' }}>房间数</span>}
              value={k?.totalRoomCount ?? 0}
              valueStyle={{
                fontSize: 32,
                fontWeight: 600,
                color: '#1890ff',
              }}
            />
          </Spin>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Spin spinning={kpisQuery.isLoading}>
            <Statistic
              title={<span style={{ fontSize: 14, color: 'rgba(0, 0, 0, 0.65)' }}>已出租</span>}
              value={k?.occupiedRoomCount ?? 0}
              valueStyle={{
                fontSize: 32,
                fontWeight: 600,
                color: '#52c41a',
              }}
            />
          </Spin>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Spin spinning={kpisQuery.isLoading}>
            <Statistic
              title={<span style={{ fontSize: 14, color: 'rgba(0, 0, 0, 0.65)' }}>入住率</span>}
              value={occupancyRate}
              suffix="%"
              valueStyle={{
                fontSize: 32,
                fontWeight: 600,
                color: occupancyRate >= 80 ? '#52c41a' : occupancyRate >= 60 ? '#faad14' : '#ff4d4f',
              }}
              prefix={occupancyRate >= 80 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            />
          </Spin>
        </Col>

        {/* 图表和账单概览 */}
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontWeight: 500 }}>入住情况</span>}
            loading={kpisQuery.isLoading}
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              height: '100%',
            }}
          >
            {chartOption ? (
              <ReactECharts
                option={chartOption}
                style={{ height: 280 }}
                opts={{ renderer: 'svg' }}
              />
            ) : null}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontWeight: 500 }}>账单概览</span>}
            loading={kpisQuery.isLoading}
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              height: '100%',
            }}
          >
            <Row gutter={[24, 24]}>
              <Col xs={12} sm={12}>
                <Statistic
                  title={<span style={{ fontSize: 13, color: 'rgba(0, 0, 0, 0.65)' }}>未结账单数</span>}
                  value={k?.invoiceIssuedCount ?? 0}
                  valueStyle={{ fontSize: 24, fontWeight: 600 }}
                />
              </Col>
              <Col xs={12} sm={12}>
                <Statistic
                  title={<span style={{ fontSize: 13, color: 'rgba(0, 0, 0, 0.65)' }}>未结金额</span>}
                  value={(k?.invoiceIssuedTotalCents ?? 0) / 100}
                  prefix="¥"
                  precision={2}
                  valueStyle={{ fontSize: 24, fontWeight: 600, color: '#1890ff' }}
                />
              </Col>
              <Col xs={12} sm={12}>
                <Statistic
                  title={<span style={{ fontSize: 13, color: 'rgba(0, 0, 0, 0.65)' }}>逾期账单数</span>}
                  value={k?.invoiceOverdueCount ?? 0}
                  valueStyle={{ fontSize: 24, fontWeight: 600, color: '#ff4d4f' }}
                />
              </Col>
              <Col xs={12} sm={12}>
                <Statistic
                  title={<span style={{ fontSize: 13, color: 'rgba(0, 0, 0, 0.65)' }}>逾期金额</span>}
                  value={(k?.invoiceOverdueTotalCents ?? 0) / 100}
                  prefix="¥"
                  precision={2}
                  valueStyle={{ fontSize: 24, fontWeight: 600, color: '#ff4d4f' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 空房列表和到期提醒 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <span style={{ fontWeight: 500 }}>
                空房列表
                {vacantQuery.data?.rooms && vacantQuery.data.rooms.length > 0 && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {vacantQuery.data.rooms.length}
                  </Tag>
                )}
              </span>
            }
            loading={vacantQuery.isLoading}
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              height: '100%',
            }}
          >
            <Table
              size="small"
              pagination={{ pageSize: 5, size: 'small' }}
              rowKey="id"
              dataSource={vacantQuery.data?.rooms ?? []}
              columns={[
                { title: '公寓', dataIndex: ['apartment', 'name'], ellipsis: true },
                { title: '房间', dataIndex: 'name', width: 100 },
                { title: '地址', dataIndex: ['apartment', 'address'], ellipsis: true },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <span style={{ fontWeight: 500 }}>
                30天到期提醒
                {expiringQuery.data?.leases && expiringQuery.data.leases.length > 0 && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    {expiringQuery.data.leases.length}
                  </Tag>
                )}
              </span>
            }
            loading={expiringQuery.isLoading}
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              height: '100%',
            }}
          >
            <Table
              size="small"
              pagination={{ pageSize: 5, size: 'small' }}
              rowKey="id"
              dataSource={expiringQuery.data?.leases ?? []}
              columns={[
                { title: '公寓', dataIndex: ['room', 'apartment', 'name'], ellipsis: true },
                { title: '房间', dataIndex: ['room', 'name'], width: 100 },
                { title: '租客', dataIndex: ['tenant', 'name'], width: 100, ellipsis: true },
                {
                  title: '到期日',
                  dataIndex: 'endDate',
                  width: 120,
                  render: (v: string) => {
                    if (!v) return '-';
                    const date = new Date(v);
                    const now = new Date();
                    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <span>
                        {date.toLocaleDateString()}
                        {daysLeft >= 0 && daysLeft <= 30 && (
                          <Tag color={daysLeft <= 7 ? 'red' : 'orange'} style={{ marginLeft: 4 }}>
                            {daysLeft}天
                          </Tag>
                        )}
                      </span>
                    );
                  },
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

