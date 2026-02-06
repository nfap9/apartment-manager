import { Button, Card, Descriptions, Divider, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth';
import type { AvailableRoom, PricingPlan } from '../types';

interface RoomSelectionStepProps {
  selectedRoom: AvailableRoom | null;
  onRoomSelect: (room: AvailableRoom) => void;
  onApplyPricingPlan: (room: AvailableRoom, plan: PricingPlan) => void;
  onLoadFeeTemplate: (apartmentId: string) => void;
}

export function RoomSelectionStep({
  selectedRoom,
  onRoomSelect,
  onApplyPricingPlan,
  onLoadFeeTemplate,
}: RoomSelectionStepProps) {
  const orgId = useAuthStore((s) => s.activeOrgId);

  const roomsQuery = useQuery({
    queryKey: ['signing-available-rooms', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/signing/available-rooms`);
      return r.data as { rooms: AvailableRoom[] };
    },
  });

  const availableRooms = roomsQuery.data?.rooms ?? [];

  const roomColumns: ColumnsType<AvailableRoom> = useMemo(
    () => [
      {
        title: '公寓',
        dataIndex: ['apartment', 'name'],
        width: 150,
      },
      {
        title: '房间',
        dataIndex: 'name',
        width: 100,
      },
      {
        title: '户型',
        dataIndex: 'layout',
        width: 100,
        render: (v: string | null) => v ?? '-',
      },
      {
        title: '面积',
        dataIndex: 'area',
        width: 80,
        render: (v: number | null) => (v ? `${v}㎡` : '-'),
      },
      {
        title: '价格方案',
        key: 'pricing',
        render: (_: unknown, room) => (
          <Space wrap size={4}>
            {room.pricingPlans.length === 0 ? (
              <Typography.Text type="secondary">无</Typography.Text>
            ) : (
              room.pricingPlans.map((p) => (
                <Tag key={p.id} color="blue">
                  {p.durationMonths}月 ¥{(p.rentCents / 100).toFixed(2)}/月
                </Tag>
              ))
            )}
          </Space>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 100,
        render: (_: unknown, room) => (
          <Button
            type={selectedRoom?.id === room.id ? 'primary' : 'default'}
            size="small"
            onClick={() => {
              onRoomSelect(room);
              if (room.pricingPlans.length > 0) {
                onApplyPricingPlan(room, room.pricingPlans[0]);
              } else {
                onLoadFeeTemplate(room.apartment.id);
              }
            }}
          >
            {selectedRoom?.id === room.id ? '已选择' : '选择'}
          </Button>
        ),
      },
    ],
    [selectedRoom, onRoomSelect, onApplyPricingPlan, onLoadFeeTemplate],
  );

  return (
    <div>
      <Typography.Paragraph type="secondary">
        以下是当前可租的房间（未租出且已激活）
      </Typography.Paragraph>
      <Table<AvailableRoom>
        rowKey="id"
        dataSource={availableRooms}
        loading={roomsQuery.isLoading}
        columns={roomColumns}
        pagination={{ pageSize: 8 }}
        size="small"
      />
      {selectedRoom && (
        <Card size="small" style={{ marginTop: 16 }} title="已选房间详情">
          <Descriptions size="small" column={3}>
            <Descriptions.Item label="公寓">{selectedRoom.apartment.name}</Descriptions.Item>
            <Descriptions.Item label="房间">{selectedRoom.name}</Descriptions.Item>
            <Descriptions.Item label="户型">{selectedRoom.layout ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="面积">
              {selectedRoom.area ? `${selectedRoom.area}㎡` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="地址" span={2}>
              {selectedRoom.apartment.address}
            </Descriptions.Item>
          </Descriptions>
          {selectedRoom.facilities.length > 0 && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Typography.Text strong>房间设施：</Typography.Text>
              <Space wrap style={{ marginTop: 8 }}>
                {selectedRoom.facilities.map((f) => (
                  <Tag key={f.id}>
                    {f.name} x{f.quantity}
                  </Tag>
                ))}
              </Space>
            </>
          )}
          {selectedRoom.pricingPlans.length > 0 && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Typography.Text strong>快速选择价格方案：</Typography.Text>
              <Space wrap style={{ marginTop: 8 }}>
                {selectedRoom.pricingPlans.map((p) => (
                  <Button
                    key={p.id}
                    size="small"
                    onClick={() => onApplyPricingPlan(selectedRoom, p)}
                  >
                    {p.durationMonths}个月 - ¥{(p.rentCents / 100).toFixed(2)}/月 押金¥
                    {(p.depositCents / 100).toFixed(2)}
                  </Button>
                ))}
              </Space>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
