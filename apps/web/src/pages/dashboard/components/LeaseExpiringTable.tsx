import { Card, Table, Tag } from 'antd';
import type { LeaseExpiringResponse } from '../types';

interface LeaseExpiringTableProps {
  data?: LeaseExpiringResponse;
  loading?: boolean;
}

export function LeaseExpiringTable({ data, loading }: LeaseExpiringTableProps) {
  const leases = data?.leases ?? [];

  const columns = [
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
              <Tag color={daysLeft <= 7 ? 'red' : 'orange'} className="ml-1">
                {daysLeft}天
              </Tag>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <Card
      title={
        <span className="font-medium">
          30天到期提醒
          {leases.length > 0 && (
            <Tag color="orange" className="ml-2">
              {leases.length}
            </Tag>
          )}
        </span>
      }
      loading={loading}
      className="rounded-xl shadow-md h-full"
    >
      <Table
        size="small"
        pagination={{ pageSize: 5, size: 'small' }}
        rowKey="id"
        dataSource={leases}
        columns={columns}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
}
