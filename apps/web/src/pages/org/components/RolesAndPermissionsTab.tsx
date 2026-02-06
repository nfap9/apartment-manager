import { Button, Card, Col, Form, Input, List, Modal, Row, Space, Tag, Typography, message } from 'antd';
import type { AxiosError } from 'axios';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { ApiErrorResponse } from '../../../lib/apiTypes';
import { PermissionTree } from './PermissionTree';
import type { Permission, Role } from '../types';

interface RolesAndPermissionsTabProps {
  orgId: string;
  permissionLabelByKey: Record<string, string>;
}

export function RolesAndPermissionsTab({ orgId, permissionLabelByKey }: RolesAndPermissionsTabProps) {
  const qc = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ['org', 'roles', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/roles`);
      return r.data as { roles: Role[] };
    },
  });

  const permissionsQuery = useQuery({
    queryKey: ['org', 'permissions', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/permissions`);
      return r.data as { permissions: Permission[] };
    },
  });

  const roles = rolesQuery.data?.roles ?? [];
  const permissions = permissionsQuery.data?.permissions ?? [];

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

  const loadRolePermissions = async (roleId: string) => {
    try {
      const r = await api.get(`/api/orgs/${orgId}/roles/${roleId}/permissions`);
      const data = r.data as { permissionKeys: string[] };
      setRolePermKeys(data.permissionKeys ?? []);
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '加载失败');
    }
  };

  const onCreateRole = async () => {
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
    if (!selectedRoleId) return;
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

  return (
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
              <PermissionTree
                permissions={permissions}
                selectedPermissionKeys={rolePermKeys}
                onPermissionKeysChange={setRolePermKeys}
                isAdminRole={isAdminRole}
                requiredPermissions={requiredPermissions}
                permissionLabelByKey={permissionLabelByKey}
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
        destroyOnHidden
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
          <Form.Item label="描述" name="description" style={{ marginBottom: 0 }}>
            <Input placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
