import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Space, Table, Upload } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import type { Room } from '../../../lib/api/types';
import { StatusTag } from '../../../components/StatusTag';

interface RoomTableProps {
  rooms: Room[];
  canEdit: boolean;
  canPricingManage: boolean;
  onEdit: (room: Room) => void;
  onFacility: (room: Room) => void;
  onPricing: (room: Room) => void;
  onDownloadTemplate: () => void;
  onImport: (file: File) => void | Promise<boolean>;
  importUploading?: boolean;
}

export function RoomTable({
  rooms,
  canEdit,
  canPricingManage,
  onEdit,
  onFacility,
  onPricing,
  onDownloadTemplate,
  onImport,
  importUploading = false,
}: RoomTableProps) {
  const columns: ColumnsType<Room> = useMemo(
    () => [
      { title: '房间', dataIndex: 'name', width: 100 },
      { title: '户型', dataIndex: 'layout', width: 100 },
      { title: '面积', dataIndex: 'area', width: 80 },
      {
        title: '状态',
        dataIndex: 'isActive',
        width: 80,
        render: (v: boolean) => <StatusTag status={v} type="boolean" />,
      },
      {
        title: '出租',
        dataIndex: 'isRented',
        width: 80,
        render: (v: boolean) => (
          <StatusTag status={v ? 'rented' : 'vacant'} type="room" />
        ),
      },
      {
        title: '设施',
        key: 'facilitiesCount',
        width: 80,
        render: (_: unknown, row) => (row.facilities?.length ?? 0) + '项',
      },
      {
        title: '备注',
        dataIndex: 'notes',
        width: 150,
        ellipsis: true,
        render: (v: string | null | undefined) => v || '-',
      },
      {
        title: '操作',
        key: 'actions',
        width: 280,
        render: (_: unknown, row) => (
          <Space>
            {canEdit ? (
              <>
                <Button size="small" onClick={() => onEdit(row)}>
                  编辑
                </Button>
                <Button size="small" onClick={() => onFacility(row)}>
                  设施
                </Button>
              </>
            ) : null}
            {canPricingManage ? (
              <Button size="small" onClick={() => onPricing(row)}>
                价格方案
              </Button>
            ) : null}
          </Space>
        ),
      },
    ],
    [canEdit, canPricingManage, onEdit, onFacility, onPricing],
  );

  return (
    <Card
      extra={
        canEdit ? (
          <Space>
            <Button icon={<DownloadOutlined />} onClick={onDownloadTemplate}>
              下载模板
            </Button>
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={onImport}
              disabled={importUploading}
            >
              <Button icon={<UploadOutlined />} loading={importUploading}>
                批量导入
              </Button>
            </Upload>
          </Space>
        ) : null
      }
    >
      <Table<Room>
        rowKey="id"
        dataSource={rooms}
        columns={columns}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 900 }}
      />
    </Card>
  );
}
