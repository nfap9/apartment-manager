import {
  LogoutOutlined,
  DashboardOutlined,
  FileTextOutlined,
  HomeOutlined,
  UserOutlined,
  FileDoneOutlined,
  DollarOutlined,
  BellOutlined,
  TeamOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Select, Space, Typography, Button, Breadcrumb, Dropdown } from 'antd';
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
  const [collapsed, setCollapsed] = useState(false);

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
      { key: '/dashboard', label: '看板', perm: 'dashboard.read', icon: <DashboardOutlined /> },
      { key: '/signing', label: '签约', perm: 'lease.write', icon: <FileTextOutlined /> },
      { key: '/apartments', label: '公寓', perm: 'apartment.read', icon: <HomeOutlined /> },
      { key: '/rooms', label: '房间管理', perm: 'room.read', icon: <HomeOutlined /> },
      { key: '/tenants', label: '租客', perm: 'tenant.read', icon: <UserOutlined /> },
      { key: '/leases', label: '租约', perm: 'lease.read', icon: <FileDoneOutlined /> },
      { key: '/invoices', label: '账单', perm: 'billing.read', icon: <DollarOutlined /> },
      { key: '/notifications', label: '通知', perm: 'notification.read', icon: <BellOutlined /> },
      { key: '/org', label: '组织与权限', perm: 'org.role.manage', icon: <TeamOutlined /> },
    ];

    const can = (p: string) => permissionKeys.includes(p);
    return all.filter((it) => can(it.perm)).map(({ key, label, icon }) => ({ key, label, icon }));
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

  const menuClickHandler = (e: { key: string }) => {
    navigate(e.key);
  };

  // 根据当前路径生成面包屑
  const breadcrumbItems = useMemo(() => {
    const pathMap: Record<string, string> = {
      '/dashboard': '看板',
      '/signing': '签约',
      '/apartments': '公寓',
      '/rooms': '房间管理',
      '/tenants': '租客',
      '/leases': '租约',
      '/invoices': '账单',
      '/notifications': '通知',
      '/org': '组织与权限',
    };

    const items = [{ title: '首页' }];

    // 匹配路径
    if (location.pathname === '/') {
      return [{ title: '看板' }];
    }

    // 检查是否是详情页
    if (location.pathname.startsWith('/apartments/')) {
      const apartmentId = location.pathname.split('/')[2];
      if (apartmentId && apartmentId !== 'new') {
        items.push({ title: '公寓' });
        items.push({ title: '详情' });
        return items;
      }
    }

    // 查找匹配的路径
    for (const [path, label] of Object.entries(pathMap)) {
      if (location.pathname.startsWith(path)) {
        items.push({ title: label });
        break;
      }
    }

    return items;
  }, [location.pathname]);

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider
        width={220}
        collapsedWidth={80}
        collapsed={collapsed}
        theme="light"
        style={{
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          style={{
            height: 64,
            padding: collapsed ? '0 8px' : '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            marginBottom: 8,
          }}
        >
          {!collapsed && (
            <Typography.Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              公寓管理系统
            </Typography.Title>
          )}
          {collapsed && (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: 14,
              }}
            >
              公
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Menu
            mode="inline"
            items={menuItems}
            selectedKeys={selectedKeys}
            onClick={menuClickHandler}
            style={{ borderRight: 0 }}
          />
        </div>
        <div
          style={{
            padding: '8px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: collapsed ? 'center' : 'flex-end',
            flexShrink: 0,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: collapsed ? '100%' : 'auto' }}
          />
        </div>
      </Sider>

      <Layout style={{ minHeight: 0, overflow: 'hidden' }}>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <Space style={{ flex: 1, minWidth: 0 }} align="center">
            <Breadcrumb
              items={breadcrumbItems}
              style={{ margin: 0 }}
            />
          </Space>

          <Space align="center">
            <Select
              placeholder="选择组织"
              style={{ width: 150 }}
              options={orgOptions}
              value={activeOrgId ?? undefined}
              onChange={(v) => setActiveOrgId(v)}
              loading={loadingMe && organizations.length === 0}
              disabled={loadingMe || orgOptions.length === 0}
              size="middle"
            />
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'logout',
                    label: '退出登录',
                    icon: <LogoutOutlined />,
                    onClick: onLogout,
                  },
                ],
              }}
              placement="bottomRight"
            >
              <Button type="text" style={{ padding: '0 8px', height: 'auto' }}>
                <Space>
                  <UserOutlined />
                  <Typography.Text strong style={{ color: 'rgba(0, 0, 0, 0.85)' }}>
                    {user?.displayName ?? user?.phone ?? '未登录'}
                  </Typography.Text>
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            padding: 0,
            overflow: 'hidden',
            minHeight: 0,
            flex: 1,
            background: '#fff',
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

