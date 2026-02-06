import { Card, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { ApiErrorResponse } from '../../../lib/apiTypes';
import type { Member, Role } from '../types';

interface MembersTabProps {
  orgId: string;
  roles: Role[];
}

export function MembersTab({ orgId, roles }: MembersTabProps) {
  const qc = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ['org', 'members', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/members`);
      return r.data as { members: Member[] };
    },
  });

  const members = membersQuery.data?.members ?? [];

  const memberColumns: ColumnsType<Member> = useMemo(
    () => [
      {
        title: '用户',
        key: 'user',
        render: (_: unknown, row) => `${row.user.displayName ?? '-'} (${row.user.phone})`,
      },
      {
        title: '角色',
        dataIndex: 'roles',
        render: (r: Member['roles']) => (r.length ? r.map((x) => <Tag key={x.id}>{x.name}</Tag>) : '-'),
      },
      {
        title: '分配角色',
        key: 'assign',
        render: (_: unknown, row) => (
          <Select
            mode="multiple"
            style={{ minWidth: 260 }}
            value={row.roles.map((r) => r.id)}
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
            onChange={async (ids) => {
              try {
                await api.put(`/api/orgs/${orgId}/members/${row.membershipId}/roles`, { roleIds: ids });
                message.success('已更新');
                await qc.invalidateQueries({ queryKey: ['org', 'members', orgId] });
              } catch (err) {
                const e = err as AxiosError<ApiErrorResponse>;
                message.error(e.response?.data?.error?.message ?? '更新失败');
              }
            }}
          />
        ),
      },
    ],
    [orgId, qc, roles],
  );

  return (
    <Card size="small" loading={membersQuery.isLoading}>
      <Table<Member>
        rowKey="membershipId"
        dataSource={members}
        columns={memberColumns}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
}
