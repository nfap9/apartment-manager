import { Card, Table, Tag } from 'antd';

interface SoonDueRentTableProps {
  data?: any[];
  loading?: boolean;
}

export function SoonDueRentTable({ data, loading }: SoonDueRentTableProps) {
  const soonDueList = data ?? [];

  const columns = [
    {
      title: '租客',
      dataIndex: ['lease', 'tenant', 'name'],
      width: 100,
      ellipsis: true,
    },
    {
      title: '房间',
      dataIndex: ['lease', 'room', 'name'],
      width: 100,
      ellipsis: true,
    },
    {
      title: '到期日',
      dataIndex: 'dueDate',
      width: 120,
      render: (v: string) => {
        if (!v) return '-';
        const date = new Date(v);
        const now = new Date();
        const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <span>
            {date.toLocaleDateString()}
            <Tag color={daysLeft <= 3 ? 'red' : 'orange'} className="ml-1">
              {daysLeft}天
            </Tag>
          </span>
        );
      },
    },
    {
      title: '金额',
      dataIndex: 'totalAmountCents',
      width: 100,
      render: (v: number) => `¥${((v || 0) / 100).toFixed(2)}`,
    },
  ];

  return (
    <Card
      title={
        <span className="font-medium">
          7天内到期房租
          {soonDueList.length > 0 && (
            <Tag color="orange" className="ml-2">
              {soonDueList.length}
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
        dataSource={soonDueList}
        columns={columns}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
}
