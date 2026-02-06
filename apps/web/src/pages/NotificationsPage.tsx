import type { ColumnsType } from 'antd/es/table';
import { Button, Space, Switch, Table, Tag, Typography, message, Spin } from 'antd';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { api } from '../lib/api';
import type { ApiErrorResponse } from '../lib/apiTypes';
import { useAuthStore } from '../stores/auth';

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
  readAt?: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  notifications: NotificationRow[];
};

export function NotificationsPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const qc = useQueryClient();

  const [unreadOnly, setUnreadOnly] = useState(false);

  const query = useQuery({
    queryKey: ['notifications', orgId, unreadOnly],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(
        `/api/orgs/${orgId}/notifications?limit=100${unreadOnly ? '&unreadOnly=true' : ''}`,
      );
      return r.data as NotificationsResponse;
    },
  });

  const dataSource = query.data?.notifications ?? [];

  const columns: ColumnsType<NotificationRow> = useMemo(
    () => [
      {
        title: '状态',
        dataIndex: 'readAt',
        width: 90,
        render: (v: string | null | undefined) => (v ? <Tag>已读</Tag> : <Tag color="blue">未读</Tag>),
      },
      { title: '标题', dataIndex: 'title' },
      { title: '内容', dataIndex: 'body' },
      {
        title: '时间',
        dataIndex: 'createdAt',
        width: 140,
        render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        render: (_: unknown, row: NotificationRow) => (
          <Button
            size="small"
            disabled={!!row.readAt}
            onClick={async () => {
              if (!orgId) return;
              try {
                await api.post(`/api/orgs/${orgId}/notifications/${row.id}/read`);
                await qc.invalidateQueries({ queryKey: ['notifications', orgId] });
              } catch (err) {
                const e = err as AxiosError<ApiErrorResponse>;
                message.error(e.response?.data?.error?.message ?? '操作失败');
              }
            }}
          >
            标记已读
          </Button>
        ),
      },
    ],
    [orgId, qc],
  );

  if (!orgId) {
    return (
      <Typography.Text type="secondary">请先选择组织</Typography.Text>
    );
  }

  return (
    <>
      <div className="page-wrapper">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Space>
            <span style={{ color: 'rgba(0, 0, 0, 0.65)' }}>只看未读</span>
            <Switch checked={unreadOnly} onChange={setUnreadOnly} />
          </Space>
        </div>
        <Spin spinning={query.isLoading}>
          <Table<NotificationRow>
            rowKey="id"
            dataSource={dataSource}
            columns={columns}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            scroll={{ x: 'max-content' }}
          />
        </Spin>
      </div>
    </>
  );
}

