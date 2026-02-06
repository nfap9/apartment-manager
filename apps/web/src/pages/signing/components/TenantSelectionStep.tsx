import { Alert, Form, Input, Radio, Table } from 'antd';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth';
import type { Tenant } from '../types';

interface TenantSelectionStepProps {
  tenantMode: 'select' | 'create';
  onTenantModeChange: (mode: 'select' | 'create') => void;
  selectedTenant: Tenant | null;
  onTenantSelect: (tenant: Tenant | null) => void;
  newTenantForm: ReturnType<typeof Form.useForm<{ name: string; phone: string; idNumber?: string }>>[0];
}

export function TenantSelectionStep({
  tenantMode,
  onTenantModeChange,
  selectedTenant,
  onTenantSelect,
  newTenantForm,
}: TenantSelectionStepProps) {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const [tenantQ, setTenantQ] = useState('');

  const tenantsQuery = useQuery({
    queryKey: ['tenants', orgId, tenantQ],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/tenants${tenantQ ? `?q=${encodeURIComponent(tenantQ)}` : ''}`);
      return r.data as { tenants: Tenant[] };
    },
  });

  const tenants = tenantsQuery.data?.tenants ?? [];

  return (
    <div>
      <Radio.Group
        value={tenantMode}
        onChange={(e) => {
          onTenantModeChange(e.target.value);
          if (e.target.value === 'select') {
            newTenantForm.resetFields();
          } else {
            onTenantSelect(null);
          }
        }}
        style={{ marginBottom: 16 }}
      >
        <Radio.Button value="select">选择已有租客</Radio.Button>
        <Radio.Button value="create">添加新租客</Radio.Button>
      </Radio.Group>

      {tenantMode === 'select' ? (
        <div>
          <Input.Search
            placeholder="搜索姓名/手机号"
            value={tenantQ}
            onChange={(e) => setTenantQ(e.target.value)}
            style={{ width: 300, marginBottom: 16 }}
            allowClear
          />
          <Table<Tenant>
            rowKey="id"
            dataSource={tenants}
            loading={tenantsQuery.isLoading}
            pagination={{ pageSize: 5 }}
            size="small"
            rowSelection={{
              type: 'radio',
              selectedRowKeys: selectedTenant ? [selectedTenant.id] : [],
              onChange: (_, rows) => onTenantSelect(rows[0] ?? null),
            }}
            columns={[
              { title: '姓名', dataIndex: 'name', width: 120 },
              { title: '手机号', dataIndex: 'phone', width: 140 },
              { title: '身份证号', dataIndex: 'idNumber', render: (v) => v ?? '-' },
            ]}
          />
          {selectedTenant && (
            <Alert
              type="success"
              message={`已选择租客: ${selectedTenant.name} (${selectedTenant.phone})`}
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      ) : (
        <Form form={newTenantForm} layout="vertical" style={{ maxWidth: 400 }}>
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
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^[0-9]+$/, message: '手机号格式不正确' },
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item label="身份证号" name="idNumber" style={{ marginBottom: 0 }}>
            <Input placeholder="选填" />
          </Form.Item>
        </Form>
      )}
    </div>
  );
}
