import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { ApiErrorResponse } from '../lib/apiTypes';
import { useAuthStore } from '../stores/auth';
import { usePermissionStore } from '../stores/permissions';

type Role = { id: string; name: string; description?: string | null; isSystem: boolean };
type RolesResp = { roles: Role[] };

type Permission = { id: string; key: string; description?: string | null };
type PermissionsResp = { permissions: Permission[] };

type RolePermResp = { permissionKeys: string[] };

type Member = {
  membershipId: string;
  user: { id: string; phone: string; displayName?: string | null };
  roles: Array<{ id: string; name: string }>;
};
type MembersResp = { members: Member[] };

type InviteResp = { invite: { code: string; maxUses?: number | null; usedCount: number; expiresAt?: string | null } };

export function OrgPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const permissionKeys = usePermissionStore((s) => s.permissionKeys);
  const qc = useQueryClient();

  const canInvite = permissionKeys.includes('org.invite');
  const canRoleManage = permissionKeys.includes('org.role.manage');
  const canMemberManage = permissionKeys.includes('org.member.manage');

  const rolesQuery = useQuery({
    queryKey: ['org', 'roles', orgId],
    enabled: !!orgId && canRoleManage,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/roles`);
      return r.data as RolesResp;
    },
  });

  const permissionsQuery = useQuery({
    queryKey: ['org', 'permissions', orgId],
    enabled: !!orgId && canRoleManage,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/permissions`);
      return r.data as PermissionsResp;
    },
  });

  const membersQuery = useQuery({
    queryKey: ['org', 'members', orgId],
    enabled: !!orgId && canMemberManage,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/members`);
      return r.data as MembersResp;
    },
  });

  const roles = rolesQuery.data?.roles ?? [];
  const permissions = permissionsQuery.data?.permissions ?? [];
  const members = membersQuery.data?.members ?? [];

  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [createRoleSaving, setCreateRoleSaving] = useState(false);
  const [createRoleForm] = Form.useForm<{ name: string; description?: string }>();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [rolePermKeys, setRolePermKeys] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResp['invite'] | null>(null);
  const [inviteForm] = Form.useForm<{ maxUses?: number; expiresInDays?: number }>();

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
              if (!orgId) return;
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

  const loadRolePermissions = async (roleId: string) => {
    if (!orgId) return;
    try {
      const r = await api.get(`/api/orgs/${orgId}/roles/${roleId}/permissions`);
      const data = r.data as RolePermResp;
      setRolePermKeys(data.permissionKeys ?? []);
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '加载失败');
    }
  };

  const onCreateRole = async () => {
    if (!orgId) return;
    setCreateRoleSaving(true);
    try {
      const values = await createRoleForm.validateFields();
      await api.post(`/api/orgs/${orgId}/roles`, values);
      message.success('已创建角色');
      setCreateRoleOpen(false);
      createRoleForm.resetFields();
      await qc.invalidateQueries({ queryKey: ['org', 'roles', orgId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '创建失败');
    } finally {
      setCreateRoleSaving(false);
    }
  };

  const onSaveRolePerms = async () => {
    if (!orgId || !selectedRoleId) return;
    setSavingPerms(true);
    try {
      await api.put(`/api/orgs/${orgId}/roles/${selectedRoleId}/permissions`, { permissionKeys: rolePermKeys });
      message.success('已保存权限');
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '保存失败');
    } finally {
      setSavingPerms(false);
    }
  };

  const onCreateInvite = async () => {
    if (!orgId) return;
    setInviteSaving(true);
    try {
      const values = await inviteForm.validateFields();
      const r = await api.post(`/api/orgs/${orgId}/invites`, values);
      const data = r.data as InviteResp;
      setInviteResult(data.invite);
      message.success('已生成邀请码');
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '生成失败');
    } finally {
      setInviteSaving(false);
    }
  };

  if (!orgId) return <Typography.Text type="secondary">请先选择组织</Typography.Text>;

  return (
    <Card title="组织与权限">
      <Tabs
        items={[
          ...(canInvite
            ? [
                {
                  key: 'invite',
                  label: '邀请',
                  children: (
                    <Space direction="vertical" style={{ width: '100%' }} size={16}>
                      <Button onClick={() => setInviteOpen(true)} type="primary">
                        生成邀请码
                      </Button>
                      {inviteResult ? (
                        <Card size="small">
                          <Typography.Paragraph style={{ marginBottom: 0 }}>
                            组织ID：<Typography.Text code>{orgId}</Typography.Text>
                          </Typography.Paragraph>
                          <Typography.Paragraph style={{ marginBottom: 0 }}>
                            邀请码：<Typography.Text code>{inviteResult.code}</Typography.Text>
                          </Typography.Paragraph>
                          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                            对方加入组织时调用：
                            <Typography.Text code>{`POST /api/orgs/${orgId}/invites/accept`}</Typography.Text>，body：
                            <Typography.Text code>{JSON.stringify({ code: inviteResult.code })}</Typography.Text>
                          </Typography.Paragraph>
                        </Card>
                      ) : (
                        <Typography.Text type="secondary">暂无邀请码</Typography.Text>
                      )}

                      <Modal
                        open={inviteOpen}
                        title="生成邀请码"
                        onCancel={() => setInviteOpen(false)}
                        onOk={onCreateInvite}
                        confirmLoading={inviteSaving}
                        destroyOnClose
                      >
                        <Form form={inviteForm} layout="vertical">
                          <Form.Item label="最大使用次数(可选)" name="maxUses">
                            <Input type="number" />
                          </Form.Item>
                          <Form.Item label="有效期(天，可选)" name="expiresInDays">
                            <Input type="number" />
                          </Form.Item>
                        </Form>
                      </Modal>
                    </Space>
                  ),
                },
              ]
            : []),
          ...(canRoleManage
            ? [
                {
                  key: 'roles',
                  label: '角色与权限',
                  children: (
                    <Space direction="vertical" style={{ width: '100%' }} size={16}>
                      <Space>
                        <Button type="primary" onClick={() => setCreateRoleOpen(true)}>
                          新建角色
                        </Button>
                        <Select
                          placeholder="选择角色"
                          style={{ width: 260 }}
                          options={roles.map((r) => ({ value: r.id, label: r.name }))}
                          value={selectedRoleId ?? undefined}
                          onChange={(v) => {
                            setSelectedRoleId(v);
                            void loadRolePermissions(v);
                          }}
                          loading={rolesQuery.isLoading}
                        />
                        <Button disabled={!selectedRoleId} onClick={onSaveRolePerms} loading={savingPerms}>
                          保存权限
                        </Button>
                      </Space>

                      <Card size="small" title="权限列表" loading={permissionsQuery.isLoading}>
                        <Checkbox.Group
                          style={{ width: '100%' }}
                          value={rolePermKeys}
                          onChange={(vals) => setRolePermKeys(vals as string[])}
                        >
                          <Space direction="vertical" style={{ width: '100%' }}>
                            {permissions.map((p) => (
                              <Checkbox key={p.key} value={p.key}>
                                <Typography.Text code>{p.key}</Typography.Text>
                              </Checkbox>
                            ))}
                          </Space>
                        </Checkbox.Group>
                      </Card>

                      <Modal
                        open={createRoleOpen}
                        title="新建角色"
                        onCancel={() => setCreateRoleOpen(false)}
                        onOk={onCreateRole}
                        confirmLoading={createRoleSaving}
                        destroyOnClose
                      >
                        <Form form={createRoleForm} layout="vertical">
                          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
                            <Input />
                          </Form.Item>
                          <Form.Item label="描述" name="description">
                            <Input />
                          </Form.Item>
                        </Form>
                      </Modal>
                    </Space>
                  ),
                },
              ]
            : []),
          ...(canMemberManage
            ? [
                {
                  key: 'members',
                  label: '成员',
                  children: (
                    <Card size="small" loading={membersQuery.isLoading}>
                      <Table<Member>
                        rowKey="membershipId"
                        dataSource={members}
                        columns={memberColumns}
                        pagination={{ pageSize: 10 }}
                      />
                    </Card>
                  ),
                },
              ]
            : []),
        ]}
      />
    </Card>
  );
}

