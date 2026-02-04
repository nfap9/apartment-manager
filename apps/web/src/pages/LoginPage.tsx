import { Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';

import { api } from '../lib/api';
import type { ApiErrorResponse, AuthLoginResponse, AuthMeResponse } from '../lib/apiTypes';
import { useAuthStore } from '../stores/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setMe = useAuthStore((s) => s.setMe);

  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const loginRes = await api.post('/api/auth/login', values);
      const accessToken = (loginRes.data as AuthLoginResponse).accessToken;
      setAccessToken(accessToken);

      const meRes = await api.get('/api/auth/me');
      setMe(meRes.data as AuthMeResponse);

      navigate('/dashboard', { replace: true });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <Card style={{ width: 420 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div>
            <Typography.Title level={3} style={{ marginBottom: 0 }}>
              登录
            </Typography.Title>
            <Typography.Text type="secondary">手机号 + 密码</Typography.Text>
          </div>

          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              label="手机号"
              name="phone"
              rules={[{ required: true, message: '请输入手机号' }]}
            >
              <Input placeholder="例如：13800000000" autoComplete="username" />
            </Form.Item>

            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" autoComplete="current-password" />
            </Form.Item>

            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form>

          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            示例管理员账号（seed）：13800000000 / admin123456
          </Typography.Paragraph>
        </Space>
      </Card>
    </div>
  );
}

