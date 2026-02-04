import { LogoutOutlined } from '@ant-design/icons';
import { Layout, Menu, Select, Space, Typography, Button } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { api } from '../lib/api';
import type { AuthMeResponse } from '../lib/apiTypes';
import { useAuthStore } from '../stores/auth';
import { usePermissionStore } from '../stores/permissions';

const { Header, Sider, Content } = Layout;

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const organizations = useAuthStore((s) => s.organizations);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const setMe = useAuthStore((s) => s.setMe);
  const setActiveOrgId = useAuthStore((s) => s.setActiveOrgId);
  const clear = useAuthStore((s) => s.clear);

  const permissionKeys = usePermissionStore((s) => s.permissionKeys);
  const setPermissionKeys = usePermissionStore((s) => s.setPermissionKeys);
  const clearPermissions = usePermissionStore((s) => s.clear);

  const [loadingMe, setLoadingMe] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    if (user && organizations.length) return;

    let cancelled = false;
    setLoadingMe(true);
    api
      .get('/api/auth/me')
      .then((r) => {
        if (cancelled) return;
        setMe(r.data as AuthMeResponse);
      })
      .catch(() => {
        if (cancelled) return;
        clear();
        clearPermissions();
        navigate('/login', { replace: true });
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingMe(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, clear, clearPermissions, navigate, organizations.length, setMe, user]);

  useEffect(() => {
    if (!accessToken || !activeOrgId) {
      setPermissionKeys([]);
      return;
    }

    let cancelled = false;
    api
      .get(`/api/orgs/${activeOrgId}/me`)
      .then((r) => {
        if (cancelled) return;
        const keys = (r.data as { permissionKeys: string[] }).permissionKeys ?? [];
        setPermissionKeys(keys);
      })
      .catch(() => {
        if (cancelled) return;
        setPermissionKeys([]);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, activeOrgId, setPermissionKeys]);

  const menuItems = useMemo(() => {
    const all = [
      { key: '/dashboard', label: '看板', perm: 'dashboard.read' },
      { key: '/signing', label: '✍️ 签约', perm: 'lease.write' },
      { key: '/apartments', label: '公寓', perm: 'apartment.read' },
      { key: '/tenants', label: '租客', perm: 'tenant.read' },
      { key: '/leases', label: '租约', perm: 'lease.read' },
      { key: '/invoices', label: '账单', perm: 'billing.read' },
      { key: '/notifications', label: '通知', perm: 'notification.read' },
      { key: '/org', label: '组织与权限', perm: 'org.role.manage' },
    ];

    const can = (p: string) => permissionKeys.includes(p);
    return all.filter((it) => can(it.perm)).map(({ key, label }) => ({ key, label }));
  }, [permissionKeys]);

  const selectedKeys = useMemo(() => {
    const match = menuItems.find((it) => location.pathname.startsWith(it.key));
    return match ? [match.key] : [];
  }, [location.pathname, menuItems]);

  const orgOptions = organizations.map((o) => ({
    value: o.organizationId,
    label: o.organizationName,
  }));

  const onLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      clear();
      clearPermissions();
      navigate('/login', { replace: true });
    }
  };

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider width={220} theme="light" style={{ overflow: 'auto' }}>
        <div style={{ padding: '16px 16px 8px' }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            公寓管理系统
          </Typography.Title>
        </div>
        <Menu
          mode="inline"
          items={menuItems}
          selectedKeys={selectedKeys}
          onClick={(e) => navigate(e.key)}
        />
      </Sider>

      <Layout style={{ minHeight: 0, overflow: 'hidden' }}>
        <Header style={{ background: '#fff', padding: '0 16px' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Select
                placeholder="选择组织"
                style={{ width: 260 }}
                options={orgOptions}
                value={activeOrgId ?? undefined}
                onChange={(v) => setActiveOrgId(v)}
                loading={loadingMe}
                disabled={loadingMe || orgOptions.length === 0}
              />
              {loadingMe ? <Typography.Text type="secondary">加载中...</Typography.Text> : null}
            </Space>

            <Space>
              <Typography.Text>
                {user?.displayName ?? user?.phone ?? '未登录'}
              </Typography.Text>
              <Button icon={<LogoutOutlined />} onClick={onLogout}>
                退出
              </Button>
            </Space>
          </Space>
        </Header>

        <Content style={{ padding: 16, overflow: 'auto', minHeight: 0 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

