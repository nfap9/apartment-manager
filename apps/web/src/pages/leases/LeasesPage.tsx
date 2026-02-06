import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import { Button, Spin, Table, Tag, Typography, message } from 'antd';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusOutlined } from '@ant-design/icons';

import { api } from '../../lib/api';
import type { ApiErrorResponse } from '../../lib/apiTypes';
import { useAuthStore } from '../../stores/auth';
import { usePermissionStore } from '../../stores/permissions';
import { CreateLeaseModal } from './components/CreateLeaseModal';
import type { LeaseRow } from './types';

export function LeasesPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const permissionKeys = usePermissionStore((s) => s.permissionKeys);
  const qc = useQueryClient();

  const canWrite = permissionKeys.includes('lease.write');

  const leasesQuery = useQuery({
    queryKey: ['leases', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/leases`);
      return r.data as { leases: LeaseRow[] };
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const leases = leasesQuery.data?.leases ?? [];

  // 计算租约的实际显示状态
  const getLeaseDisplayStatus = (row: LeaseRow): { status: string; color: string } => {
    const now = new Date();
    const startDate = new Date(row.startDate);
    const endDate = new Date(row.endDate);

    // 已终止：手动终止租约
    if (row.status === 'TERMINATED') {
      return { status: '已终止', color: 'default' };
    }

    // 已到期：到约定时间范围后自动改为已到期
    if (now > endDate) {
      return { status: '已到期', color: 'orange' };
    }

    // 生效中：创建租约后且已经在约定时间范围内
    if (now >= startDate && now <= endDate) {
      return { status: '生效中', color: 'green' };
    }

    // 待生效：创建租约但还没到约定时间
    if (now < startDate) {
      return { status: '待生效', color: 'blue' };
    }

    return { status: '未知', color: 'default' };
  };

  // 处理终止租约
  const handleTerminateLease = async (leaseId: string) => {
    if (!orgId) return;
    setUpdatingStatus(leaseId);
    try {
      await api.put(`/api/orgs/${orgId}/leases/${leaseId}`, { status: 'TERMINATED' });
      message.success('租约已终止');
      await qc.invalidateQueries({ queryKey: ['leases', orgId] });
      await qc.invalidateQueries({ queryKey: ['apartment', orgId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '终止租约失败');
    } finally {
      setUpdatingStatus(null);
    }
  };

  // 处理恢复租约
  const handleRestoreLease = async (leaseId: string, startDate: string) => {
    if (!orgId) return;
    setUpdatingStatus(leaseId);
    try {
      const now = new Date();
      const start = new Date(startDate);
      
      // 根据当前时间和租约开始日期判断恢复后的状态
      // 如果当前时间 < startDate，恢复为 DRAFT（待生效）
      // 否则恢复为 ACTIVE（生效中或已到期但恢复）
      const restoreStatus = now < start ? 'DRAFT' : 'ACTIVE';
      
      await api.put(`/api/orgs/${orgId}/leases/${leaseId}`, { status: restoreStatus });
      message.success('租约已恢复');
      await qc.invalidateQueries({ queryKey: ['leases', orgId] });
      await qc.invalidateQueries({ queryKey: ['apartment', orgId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '恢复租约失败');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const columns: ColumnsType<LeaseRow> = useMemo(
    () => [
      { title: '公寓', dataIndex: ['room', 'apartment', 'name'] },
      { title: '房间', dataIndex: ['room', 'name'], width: 110 },
      { title: '租客', dataIndex: ['tenant', 'name'], width: 110 },
      {
        title: '租期',
        key: 'period',
        render: (_: unknown, row) =>
          `${new Date(row.startDate).toLocaleDateString()} ~ ${new Date(row.endDate).toLocaleDateString()}`,
      },
      {
        title: '房租(元每月)',
        dataIndex: 'baseRentCents',
        width: 140,
        render: (v: number) => (v / 100).toFixed(2),
      },
      {
        title: '状态',
        key: 'displayStatus',
        width: 120,
        render: (_: unknown, row: LeaseRow) => {
          const { status, color } = getLeaseDisplayStatus(row);
          return <Tag color={color}>{status}</Tag>;
        },
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        render: (_: unknown, row: LeaseRow) => {
          if (!canWrite) return null;
          
          const { status } = getLeaseDisplayStatus(row);
          const isUpdating = updatingStatus === row.id;

          // 待生效和生效中的租约可以终止
          if (status === '待生效' || status === '生效中') {
            return (
              <Button
                size="small"
                danger
                loading={isUpdating}
                onClick={() => handleTerminateLease(row.id)}
              >
                终止租约
              </Button>
            );
          }

          // 已终止的租约可以恢复
          if (status === '已终止') {
            return (
              <Button
                size="small"
                type="primary"
                loading={isUpdating}
                onClick={() => handleRestoreLease(row.id, row.startDate)}
              >
                恢复租约
              </Button>
            );
          }

          return <Typography.Text type="secondary">-</Typography.Text>;
        },
      },
    ],
    [canWrite, updatingStatus, orgId, qc],
  );

  const handleCreateSuccess = () => {
    // 成功消息已在 CreateLeaseModal 中显示
  };

  if (!orgId) {
    return (
      <Typography.Text type="secondary">请先选择组织</Typography.Text>
    );
  }

  return (
    <>
      <div className="page-wrapper">
        {canWrite && (
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建租约
            </Button>
          </div>
        )}
        <Spin spinning={leasesQuery.isLoading}>
          <Table<LeaseRow>
            rowKey="id"
            dataSource={leases}
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

      {orgId && (
        <CreateLeaseModal
          orgId={orgId}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </>
  );
}
