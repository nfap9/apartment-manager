import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  List,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tree,
  Typography,
  message,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
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

  const getPermissionLabel = (perm: Permission) =>
    perm.description?.trim() || (permissionLabelByKey as Record<string, string>)[perm.key] || '未配置权限名称';

  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [createRoleSaving, setCreateRoleSaving] = useState(false);
  const [createRoleForm] = Form.useForm<{ name: string; description?: string }>();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [rolePermKeys, setRolePermKeys] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  // 获取当前选中的角色信息
  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) ?? null;
  }, [roles, selectedRoleId]);

  // 判断是否是管理员角色
  const isAdminRole = selectedRole?.name === 'Admin' && selectedRole?.isSystem;
  // 管理员角色必须保留的权限
  const requiredPermissions = ['org.manage', 'org.role.manage'];

  // 构建权限树结构
  const permissionTree = useMemo<DataNode[]>(() => {
    const moduleMap = new Map<string, { label: string; children: Permission[] }>();

    permissions.forEach((perm) => {
      const parts = perm.key.split('.');
      const moduleKey = parts[0]; // 获取模块名，如 'org', 'apartment', 'room' 等

      if (!moduleMap.has(moduleKey)) {
        const moduleLabels: Record<string, string> = {
          org: '组织管理',
          apartment: '公寓管理',
          room: '房间管理',
          tenant: '租客管理',
          lease: '租约管理',
          billing: '账单管理',
          notification: '通知管理',
          dashboard: '看板管理',
        };
        moduleMap.set(moduleKey, {
          label: moduleLabels[moduleKey] || moduleKey,
          children: [],
        });
      }

      moduleMap.get(moduleKey)!.children.push(perm);
    });

    return Array.from(moduleMap.entries()).map(([moduleKey, { label, children }]) => ({
      title: label,
      key: `module-${moduleKey}`,
      children: children.map((perm) => ({
        title: getPermissionLabel(perm),
        key: perm.key,
        isLeaf: true,
        // 如果是管理员角色且是必需权限，则禁用取消操作
        disabled: isAdminRole && requiredPermissions.includes(perm.key),
      })),
    }));
  }, [permissions, permissionLabelByKey, isAdminRole, requiredPermissions]);

  // 获取所有子节点的权限键
  const getChildrenKeys = (node: DataNode): string[] => {
    if (node.isLeaf) {
      return [node.key as string];
    }
    return node.children?.flatMap(getChildrenKeys) ?? [];
  };

  // 处理树节点勾选
  const onTreeCheck = (checkedKeys: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }) => {
    const checked = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
    const allCheckedKeys = new Set<string>();

    // 处理所有选中的节点
    checked.forEach((key) => {
      const keyStr = key as string;
      if (keyStr.startsWith('module-')) {
        // 如果是模块节点，添加所有子权限
        const moduleNode = permissionTree.find((n) => n.key === keyStr);
        if (moduleNode) {
          const childrenKeys = getChildrenKeys(moduleNode);
          childrenKeys.forEach((k) => allCheckedKeys.add(k));
        }
      } else {
        // 如果是权限节点，直接添加
        allCheckedKeys.add(keyStr);
      }
    });

    // 如果是管理员角色，强制保留必需权限
    if (isAdminRole) {
      requiredPermissions.forEach((perm) => allCheckedKeys.add(perm));
    }

    setRolePermKeys(Array.from(allCheckedKeys));
  };

  // 计算应该选中的树节点键（包括模块节点）
  const checkedTreeKeys = useMemo(() => {
    const checked = new Set<React.Key>();

    // 检查每个模块是否所有子权限都被选中
    permissionTree.forEach((moduleNode) => {
      const childrenKeys = getChildrenKeys(moduleNode);
      const allChildrenChecked = childrenKeys.every((k) => rolePermKeys.includes(k));

      if (allChildrenChecked && childrenKeys.length > 0) {
        // 所有子权限都被选中，选中模块节点
        checked.add(moduleNode.key);
      } else {
        // 部分选中或未选中，只添加被选中的子节点
        childrenKeys.forEach((k) => {
          if (rolePermKeys.includes(k)) {
            checked.add(k);
          }
        });
      }
    });

    return Array.from(checked);
  }, [rolePermKeys, permissionTree]);

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
                        <Form form={inviteForm} layout="vertical" style={{ marginTop: 16 }}>
                          <Form.Item 
                            label="最大使用次数(可选)" 
                            name="maxUses"
                            style={{ marginBottom: 16 }}
                          >
                            <Input type="number" placeholder="留空表示无限制" />
                          </Form.Item>
                          <Form.Item 
                            label="有效期(天，可选)" 
                            name="expiresInDays"
                            style={{ marginBottom: 0 }}
                          >
                            <Input type="number" placeholder="留空表示永不过期" />
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
                      <Button type="primary" onClick={() => setCreateRoleOpen(true)}>
                        新建角色
                      </Button>

                      <Row gutter={16}>
                        <Col span={8}>
                          <Card
                            title="角色列表"
                            size="small"
                            loading={rolesQuery.isLoading}
                            style={{ height: '600px', overflow: 'auto' }}
                          >
                            <List
                              dataSource={roles}
                              renderItem={(role) => (
                                <List.Item
                                  style={{
                                    cursor: 'pointer',
                                    backgroundColor: selectedRoleId === role.id ? '#e6f7ff' : 'transparent',
                                    padding: '12px',
                                    borderRadius: '4px',
                                    marginBottom: '8px',
                                  }}
                                  onClick={() => {
                                    setSelectedRoleId(role.id);
                                    void loadRolePermissions(role.id);
                                  }}
                                >
                                  <List.Item.Meta
                                    title={
                                      <Space>
                                        <Typography.Text strong>{role.name}</Typography.Text>
                                        {role.isSystem && <Tag color="blue">系统</Tag>}
                                      </Space>
                                    }
                                    description={role.description || '无描述'}
                                  />
                                </List.Item>
                              )}
                            />
                          </Card>
                        </Col>
                        <Col span={16}>
                          <Card
                            title={selectedRoleId ? '权限配置' : '请选择角色'}
                            size="small"
                            loading={permissionsQuery.isLoading}
                            extra={
                              selectedRoleId ? (
                                <Button type="primary" onClick={onSaveRolePerms} loading={savingPerms}>
                                  保存权限
                                </Button>
                              ) : null
                            }
                            style={{ height: '600px', overflow: 'auto' }}
                          >
                            {selectedRoleId ? (
                              <Tree
                                checkable
                                checkedKeys={checkedTreeKeys}
                                treeData={permissionTree}
                                onCheck={onTreeCheck}
                                style={{ width: '100%' }}
                              />
                            ) : (
                              <Typography.Text type="secondary">请从左侧选择一个角色来配置权限</Typography.Text>
                            )}
                          </Card>
                        </Col>
                      </Row>

                      <Modal
                        open={createRoleOpen}
                        title="新建角色"
                        onCancel={() => setCreateRoleOpen(false)}
                        onOk={onCreateRole}
                        confirmLoading={createRoleSaving}
                        destroyOnClose
                      >
                        <Form form={createRoleForm} layout="vertical" style={{ marginTop: 16 }}>
                          <Form.Item 
                            label="名称" 
                            name="name" 
                            rules={[{ required: true, message: '请输入名称' }]}
                            style={{ marginBottom: 16 }}
                          >
                            <Input placeholder="请输入角色名称" />
                          </Form.Item>
                          <Form.Item 
                            label="描述" 
                            name="description"
                            style={{ marginBottom: 0 }}
                          >
                            <Input placeholder="选填" />
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

