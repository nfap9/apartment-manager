import { Card, Table, Tag } from 'antd';
import type { VacantRoomsResponse } from '../types';

interface VacantRoomsTableProps {
  data?: VacantRoomsResponse;
  loading?: boolean;
}

const columns = [
  { title: '公寓', dataIndex: ['apartment', 'name'], ellipsis: true },
  { title: '房间', dataIndex: 'name', width: 100 },
  { title: '地址', dataIndex: ['apartment', 'address'], ellipsis: true },
];

export function VacantRoomsTable({ data, loading }: VacantRoomsTableProps) {
  const rooms = data?.rooms ?? [];

  return (
    <Card
      title={
        <span className="font-medium">
          空房列表
          {rooms.length > 0 && (
            <Tag color="blue" className="ml-2">
              {rooms.length}
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
        dataSource={rooms}
        columns={columns}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
}
