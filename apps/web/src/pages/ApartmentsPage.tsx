import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import { Button, Card, Form, Input, InputNumber, Modal, Space, Table, Typography, message } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { ApiErrorResponse } from '../lib/apiTypes';
import { useAuthStore } from '../stores/auth';

type Apartment = {
  id: string;
  name: string;
  address: string;
  totalArea?: number | null;
  floor?: number | null;
  createdAt: string;
};

type ApartmentsResponse = {
  apartments: Apartment[];
};

export function ApartmentsPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<{ name: string; address: string; totalArea?: number; floor?: number }>();

  const query = useQuery({
    queryKey: ['apartments', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/apartments`);
      return r.data as ApartmentsResponse;
    },
  });

  const apartments = query.data?.apartments ?? [];

  const columns: ColumnsType<Apartment> = useMemo(
    () => [
      { title: '名称', dataIndex: 'name' },
      { title: '地址', dataIndex: 'address' },
      {
        title: '面积',
        dataIndex: 'totalArea',
        width: 100,
        render: (v: number | null | undefined) => (v == null ? '-' : `${v}`),
      },
      {
        title: '楼层',
        dataIndex: 'floor',
        width: 90,
        render: (v: number | null | undefined) => (v == null ? '-' : `${v}`),
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        render: (_: unknown, row) => (
          <Button size="small" onClick={() => navigate(`/apartments/${row.id}`)}>
            详情
          </Button>
        ),
      },
    ],
    [navigate],
  );

  const onCreate = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      await api.post(`/api/orgs/${orgId}/apartments`, values);
      message.success('已创建');
      setModalOpen(false);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ['apartments', orgId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '创建失败');
    } finally {
      setSaving(false);
    }
  };

  if (!orgId) return <Typography.Text type="secondary">请先选择组织</Typography.Text>;

  return (
    <>
      <Card
        title={
          <Space>
            <span>公寓</span>
            <Button size="small" type="primary" onClick={() => setModalOpen(true)}>
              新增公寓
            </Button>
          </Space>
        }
        loading={query.isLoading}
      >
        <Table<Apartment> rowKey="id" dataSource={apartments} columns={columns} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        open={modalOpen}
        title="新增公寓"
        onCancel={() => setModalOpen(false)}
        onOk={onCreate}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="地址" name="address" rules={[{ required: true, message: '请输入地址' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="总面积" name="totalArea">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="楼层" name="floor">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

