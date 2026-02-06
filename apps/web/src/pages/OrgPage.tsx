import { Card, Tabs, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth';
import { usePermissionStore } from '../stores/permissions';
import { PageContainer } from '../components/PageContainer';
import { InviteTab, RolesAndPermissionsTab, MembersTab } from './org/components';
import { api } from '../lib/api';
import type { Role } from './org/types';

export function OrgPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const permissionKeys = usePermissionStore((s) => s.permissionKeys);

  const canInvite = permissionKeys.includes('org.invite');
  const canRoleManage = permissionKeys.includes('org.role.manage');
  const canMemberManage = permissionKeys.includes('org.member.manage');


  const permissionLabelByKey = useMemo(
    () => ({
      'org.manage': '组织管理',
      'org.invite': '邀请成员',
      'org.role.manage': '角色管理',
      'org.member.manage': '成员管理',
      'apartment.read': '查看公寓',
      'apartment.write': '编辑公寓',
      'apartment.upstream.read': '查看上游公寓',
      'apartment.upstream.write': '编辑上游公寓',
      'room.read': '查看房间',
      'room.write': '编辑房间',
      'room.pricing.manage': '房间定价管理',
      'tenant.read': '查看租客',
      'tenant.write': '编辑租客',
      'lease.read': '查看租约',
      'lease.write': '编辑租约',
      'billing.read': '查看账单',
      'billing.manage': '账单管理',
      'notification.read': '查看通知',
      'dashboard.read': '查看看板',
    }),
    [],
  );

  const [inviteResult, setInviteResult] = useState<{ code: string; maxUses?: number | null; usedCount: number; expiresAt?: string | null } | null>(null);

  // 获取角色列表用于成员管理
  const rolesQuery = useQuery({
    queryKey: ['org', 'roles', orgId],
    enabled: !!orgId && canMemberManage,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/roles`);
      return r.data as { roles: Role[] };
    },
  });

  const roles = rolesQuery.data?.roles ?? [];

  if (!orgId) {
    return (
      <PageContainer>
        <Typography.Text type="secondary">请先选择组织</Typography.Text>
      </PageContainer>
    );
  }

  return (
    <div className="page-wrapper">
      <PageContainer>
        <Card
          style={{
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          }}
        >
      <Tabs
        items={[
          ...(canInvite
            ? [
                {
                  key: 'invite',
                  label: '邀请',
                  children: <InviteTab orgId={orgId} inviteResult={inviteResult} onInviteResultChange={setInviteResult} />,
                },
              ]
            : []),
          ...(canRoleManage
            ? [
                {
                  key: 'roles',
                  label: '角色与权限',
                  children: <RolesAndPermissionsTab orgId={orgId} permissionLabelByKey={permissionLabelByKey} />,
                },
              ]
            : []),
          ...(canMemberManage
            ? [
                {
                  key: 'members',
                  label: '成员',
                  children: <MembersTab orgId={orgId} roles={roles} />,
                },
              ]
            : []),
        ]}
      />
        </Card>
      </PageContainer>
    </div>
  );
}

