import type { ColumnsType } from 'antd/es/table';
import { Card, Select, Table, message } from 'antd';
import { useMemo, useState } from 'react';
import type { Lease } from '../../../lib/api/types';
import { StatusTag } from '../../../components/StatusTag';
import { createDateRangeColumn, createMoneyColumn } from '../../../components/table/CommonColumns';
import { leasesApi, handleApiError } from '../../../lib/api/index';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useOrgId } from '../../../hooks/useOrgId';
import { useQueryClient } from '@tanstack/react-query';

interface LeaseTableProps {
  leases: Lease[];
  loading: boolean;
  canWrite: boolean;
}

export function LeaseTable({ leases, loading, canWrite }: LeaseTableProps) {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const handleStatusChange = async (leaseId: string, newStatus: Lease['status']) => {
    setUpdatingStatus(leaseId);
    try {
      await leasesApi.updateStatus(orgId!, leaseId, newStatus);
      message.success('状态已更新');
      await queryClient.invalidateQueries({ queryKey: queryKeys.leases.all(orgId!) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.apartments.all(orgId!) });
    } catch (error) {
      handleApiError(error, '状态更新失败');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const columns: ColumnsType<Lease> = useMemo(
    () => [
      { title: '公寓', dataIndex: ['room', 'apartment', 'name'] },
      { title: '房间', dataIndex: ['room', 'name'], width: 110 },
      { title: '租客', dataIndex: ['tenant', 'name'], width: 110 },
      createDateRangeColumn<Lease>('租期', 'startDate', 'endDate'),
      createMoneyColumn<Lease>('房租(元每月)', 'baseRentCents', { width: 140 }),
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        render: (v: Lease['status'], row: Lease) => {
          if (!canWrite) {
            return <StatusTag status={v} type="lease" />;
          }
          return (
            <Select
              value={v}
              size="small"
              loading={updatingStatus === row.id}
              onChange={(newStatus) => handleStatusChange(row.id, newStatus)}
              options={[
                { value: 'DRAFT', label: 'DRAFT' },
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'ENDED', label: 'ENDED' },
                { value: 'TERMINATED', label: 'TERMINATED' },
              ]}
              style={{ minWidth: 100 }}
            />
          );
        },
      },
    ],
    [canWrite, updatingStatus],
  );

  return (
    <Card loading={loading}>
      <Table<Lease> rowKey="id" dataSource={leases} columns={columns} pagination={{ pageSize: 10 }} />
    </Card>
  );
}
