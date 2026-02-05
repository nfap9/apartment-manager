import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import { Button, Form, Input, Modal, Space, Table, Typography, message, Spin } from 'antd';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { ApiErrorResponse } from '../lib/apiTypes';
import { useAuthStore } from '../stores/auth';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';

type Tenant = {
  id: string;
  name: string;
  phone: string;
  idNumber?: string | null;
  createdAt: string;
};

type TenantsResponse = {
  tenants: Tenant[];
};

export function TenantsPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);

  const [form] = Form.useForm<{ name: string; phone: string; idNumber?: string | null }>();

  const query = useQuery({
    queryKey: ['tenants', orgId, q],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/tenants${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      return r.data as TenantsResponse;
    },
  });

  const tenants = query.data?.tenants ?? [];

  const columns: ColumnsType<Tenant> = useMemo(
    () => [
      { title: '姓名', dataIndex: 'name' },
      { title: '手机号', dataIndex: 'phone', width: 140 },
      { title: '身份证号', dataIndex: 'idNumber', width: 220 },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        render: (_: unknown, row) => (
          <Button
            size="small"
            onClick={() => {
              setEditing(row);
              form.setFieldsValue({ name: row.name, phone: row.phone, idNumber: row.idNumber ?? null });
              setModalOpen(true);
            }}
          >
            编辑
          </Button>
        ),
      },
    ],
    [form],
  );

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const onSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      if (editing) {
        await api.put(`/api/orgs/${orgId}/tenants/${editing.id}`, values);
      } else {
        await api.post(`/api/orgs/${orgId}/tenants`, values);
      }
      message.success('已保存');
      setModalOpen(false);
      await qc.invalidateQueries({ queryKey: ['tenants', orgId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!orgId) {
    return (
      <Typography.Text type="secondary">请先选择组织</Typography.Text>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div style={{ flexShrink: 0, marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Space>
            <Input.Search
              placeholder="搜索姓名/手机号"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onSearch={(v) => setQ(v)}
              style={{ width: 260 }}
              allowClear
              prefix={<SearchOutlined />}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增租客
            </Button>
          </Space>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Spin spinning={query.isLoading}>
            <Table<Tenant>
              rowKey="id"
              dataSource={tenants}
              columns={columns}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
              scroll={{ x: 'max-content' }}
            />
          </Spin>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? '编辑租客' : '新增租客'}
        onCancel={() => setModalOpen(false)}
        onOk={onSave}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item 
            label="姓名" 
            name="name" 
            rules={[{ required: true, message: '请输入姓名' }]}
            style={{ marginBottom: 16 }}
          >
            <Input placeholder="请输入租客姓名" />
          </Form.Item>
          <Form.Item 
            label="手机号" 
            name="phone" 
            rules={[{ required: true, message: '请输入手机号' }]}
            style={{ marginBottom: 16 }}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item 
            label="身份证号" 
            name="idNumber"
            style={{ marginBottom: 0 }}
          >
            <Input placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

