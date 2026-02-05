import type { ColumnsType } from 'antd/es/table';
import { Button, Space, Table, Upload } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useMemo, useRef, useEffect, useState } from 'react';
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
  showImportExport?: boolean;
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
  showImportExport = true,
}: RoomTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [scrollHeight, setScrollHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const updateScrollHeight = () => {
      if (tableContainerRef.current) {
        const height = tableContainerRef.current.clientHeight;
        // 减去表头、分页等的高度，大约120px
        setScrollHeight(Math.max(height - 120, 200));
      }
    };

    updateScrollHeight();
    window.addEventListener('resize', updateScrollHeight);
    return () => window.removeEventListener('resize', updateScrollHeight);
  }, []);

  const columns: ColumnsType<Room> = useMemo(
    () => [
      { title: '房间', dataIndex: 'name', width: 100, fixed: 'left' as const },
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
        fixed: 'right' as const,
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', padding: '16px' }}>
      {(canEdit && showImportExport) && (
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
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
        </div>
      )}
      <div 
        ref={tableContainerRef}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
      >
        <Table<Room>
          rowKey="id"
          dataSource={rooms}
          columns={columns}
          pagination={{ pageSize: 10, placement: ['bottomCenter'] }}
          scroll={{ x: 900, y: scrollHeight }}
        />
      </div>
    </div>
  );
}
