import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { ApiErrorResponse } from '../lib/apiTypes';
import { useAuthStore } from '../stores/auth';
import { usePermissionStore } from '../stores/permissions';

type LeaseCharge = {
  id: string;
  name: string;
  mode: 'FIXED' | 'METERED';
  fixedAmountCents?: number | null;
  unitPriceCents?: number | null;
  unitName?: string | null;
  billingCycleMonths: number;
  isActive: boolean;
};

type LeaseRow = {
  id: string;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'TERMINATED';
  startDate: string;
  endDate: string;
  billingCycleMonths: number;
  depositCents: number;
  baseRentCents: number;
  rentIncreaseType: 'NONE' | 'FIXED' | 'PERCENT';
  rentIncreaseValue: number;
  rentIncreaseIntervalMonths: number;
  notes?: string | null;
  room: { id: string; name: string; apartment: { id: string; name: string } };
  tenant: { id: string; name: string; phone: string };
  charges: LeaseCharge[];
};

type LeasesResponse = { leases: LeaseRow[] };

type Apartment = { id: string; name: string; address: string };
type ApartmentsResponse = { apartments: Apartment[] };

type Room = { id: string; name: string };
type RoomsResponse = { rooms: Array<Room & { pricingPlans: unknown[] }> };

type Tenant = { id: string; name: string; phone: string };
type TenantsResponse = { tenants: Tenant[] };

export function LeasesPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const permissionKeys = usePermissionStore((s) => s.permissionKeys);
  const qc = useQueryClient();

  const canWrite = permissionKeys.includes('lease.write');

  const leasesQuery = useQuery({
    queryKey: ['leases', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/leases`);
      return r.data as LeasesResponse;
    },
  });

  const apartmentsQuery = useQuery({
    queryKey: ['apartments', orgId],
    enabled: !!orgId && canWrite,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/apartments`);
      return r.data as ApartmentsResponse;
    },
  });

  const [tenantQ, setTenantQ] = useState('');
  const tenantsQuery = useQuery({
    queryKey: ['tenants', orgId, tenantQ],
    enabled: !!orgId && canWrite,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/tenants${tenantQ ? `?q=${encodeURIComponent(tenantQ)}` : ''}`);
      return r.data as TenantsResponse;
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);

  const roomsQuery = useQuery({
    queryKey: ['roomsByApartment', orgId, selectedApartmentId],
    enabled: !!orgId && !!selectedApartmentId && createOpen,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/apartments/${selectedApartmentId}/rooms`);
      return r.data as RoomsResponse;
    },
  });

  const [form] = Form.useForm<{
    apartmentId: string;
    roomId: string;
    tenantId: string;
    period: [dayjs.Dayjs, dayjs.Dayjs];
    depositCents?: number;
    baseRentCents: number;
    rentIncreaseType?: 'NONE' | 'FIXED' | 'PERCENT';
    rentIncreaseValue?: number;
    rentIncreaseIntervalMonths?: number;
    charges?: Array<{
      name: string;
      mode: 'FIXED' | 'METERED';
      fixedAmountCents?: number;
      unitPriceCents?: number;
      unitName?: string;
      billingCycleMonths?: number;
    }>;
    notes?: string;
  }>();

  const leases = leasesQuery.data?.leases ?? [];
  const apartments = apartmentsQuery.data?.apartments ?? [];
  const tenants = tenantsQuery.data?.tenants ?? [];
  const rooms = roomsQuery.data?.rooms ?? [];

  const columns: ColumnsType<LeaseRow> = useMemo(
    () => [
      { title: '公寓', dataIndex: ['room', 'apartment', 'name'] },
      { title: '房间', dataIndex: ['room', 'name'], width: 110 },
      { title: '租客', dataIndex: ['tenant', 'name'], width: 110 },
      {
        title: '租期',
        key: 'period',
        render: (_: unknown, row) =>
          `${new Date(row.startDate).toLocaleDateString()} ~ ${new Date(row.endDate).toLocaleDateString()}`,
      },
      {
        title: '房租(分/月)',
        dataIndex: 'baseRentCents',
        width: 120,
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        render: (v: LeaseRow['status']) => {
          const color = v === 'ACTIVE' ? 'green' : v === 'DRAFT' ? 'blue' : 'default';
          return <Tag color={color}>{v}</Tag>;
        },
      },
    ],
    [],
  );

  const openCreate = () => {
    form.resetFields();
    setSelectedApartmentId(null);
    setTenantQ('');
    setCreateOpen(true);
  };

  const onCreate = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      const [start, end] = values.period;
      const payload = {
        roomId: values.roomId,
        tenantId: values.tenantId,
        startDate: start.toDate(),
        endDate: end.toDate(),
        depositCents: values.depositCents ?? 0,
        baseRentCents: values.baseRentCents,
        rentIncreaseType: values.rentIncreaseType ?? 'NONE',
        rentIncreaseValue: values.rentIncreaseValue ?? 0,
        rentIncreaseIntervalMonths: values.rentIncreaseIntervalMonths ?? 12,
        charges: (values.charges ?? []).map((c) => ({
          name: c.name,
          mode: c.mode,
          fixedAmountCents: c.fixedAmountCents ?? null,
          unitPriceCents: c.unitPriceCents ?? null,
          unitName: c.unitName ?? null,
          billingCycleMonths: c.billingCycleMonths ?? 1,
          isActive: true,
        })),
        notes: values.notes ?? null,
      };

      await api.post(`/api/orgs/${orgId}/leases`, payload);
      message.success('已创建租约');
      setCreateOpen(false);
      await qc.invalidateQueries({ queryKey: ['leases', orgId] });
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
            <span>租约</span>
            {canWrite ? (
              <Button size="small" type="primary" onClick={openCreate}>
                新建租约
              </Button>
            ) : null}
          </Space>
        }
        loading={leasesQuery.isLoading}
      >
        <Table<LeaseRow> rowKey="id" dataSource={leases} columns={columns} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        open={createOpen}
        title="新建租约"
        onCancel={() => setCreateOpen(false)}
        onOk={onCreate}
        confirmLoading={saving}
        width={900}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changed) => {
            if (changed.apartmentId) setSelectedApartmentId(changed.apartmentId);
          }}
        >
          <Space wrap style={{ width: '100%' }}>
            <Form.Item label="公寓" name="apartmentId" rules={[{ required: true, message: '请选择公寓' }]}>
              <Select
                style={{ width: 260 }}
                options={apartments.map((a) => ({ value: a.id, label: a.name }))}
                loading={apartmentsQuery.isLoading}
              />
            </Form.Item>

            <Form.Item label="房间" name="roomId" rules={[{ required: true, message: '请选择房间' }]}>
              <Select
                style={{ width: 260 }}
                options={rooms.map((r) => ({ value: r.id, label: r.name }))}
                loading={roomsQuery.isLoading}
                disabled={!selectedApartmentId}
              />
            </Form.Item>

            <Form.Item label="租客" name="tenantId" rules={[{ required: true, message: '请选择租客' }]}>
              <Select
                style={{ width: 260 }}
                showSearch
                filterOption={false}
                onSearch={(v) => setTenantQ(v)}
                options={tenants.map((t) => ({ value: t.id, label: `${t.name}(${t.phone})` }))}
                loading={tenantsQuery.isLoading}
              />
            </Form.Item>
          </Space>

          <Space wrap style={{ width: '100%' }}>
            <Form.Item label="租期" name="period" rules={[{ required: true, message: '请选择租期' }]}>
              <DatePicker.RangePicker />
            </Form.Item>
            <Form.Item label="押金(分)" name="depositCents">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item label="房租(分/月)" name="baseRentCents" rules={[{ required: true, message: '请输入房租' }]}>
              <InputNumber min={0} />
            </Form.Item>
          </Space>

          <Space wrap style={{ width: '100%' }}>
            <Form.Item label="租金递增类型" name="rentIncreaseType" initialValue="NONE">
              <Select
                style={{ width: 220 }}
                options={[
                  { value: 'NONE', label: '不递增' },
                  { value: 'FIXED', label: '固定递增(分)' },
                  { value: 'PERCENT', label: '百分比递增(%)' },
                ]}
              />
            </Form.Item>
            <Form.Item label="递增值" name="rentIncreaseValue">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item label="递增周期(月)" name="rentIncreaseIntervalMonths" initialValue={12}>
              <InputNumber min={1} />
            </Form.Item>
          </Space>

          <Form.Item label="杂费">
            <Form.List name="charges">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fields.map((f) => (
                    <Card key={f.key} size="small">
                      <Space wrap>
                        <Form.Item
                          {...f}
                          label="名称"
                          name={[f.name, 'name']}
                          rules={[{ required: true, message: '必填' }]}
                        >
                          <Input style={{ width: 160 }} />
                        </Form.Item>
                        <Form.Item
                          {...f}
                          label="模式"
                          name={[f.name, 'mode']}
                          rules={[{ required: true, message: '必填' }]}
                        >
                          <Select
                            style={{ width: 140 }}
                            options={[
                              { value: 'FIXED', label: '固定' },
                              { value: 'METERED', label: '抄表' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item {...f} label="固定金额(分)" name={[f.name, 'fixedAmountCents']}>
                          <InputNumber min={0} />
                        </Form.Item>
                        <Form.Item {...f} label="单价(分)" name={[f.name, 'unitPriceCents']}>
                          <InputNumber min={0} />
                        </Form.Item>
                        <Form.Item {...f} label="单位" name={[f.name, 'unitName']}>
                          <Input style={{ width: 100 }} />
                        </Form.Item>
                        <Form.Item {...f} label="周期(月)" name={[f.name, 'billingCycleMonths']} initialValue={1}>
                          <InputNumber min={1} max={24} />
                        </Form.Item>
                        <Button danger onClick={() => remove(f.name)}>
                          删除
                        </Button>
                      </Space>
                    </Card>
                  ))}
                  <Button type="dashed" onClick={() => add()} style={{ width: '100%' }}>
                    添加杂费
                  </Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item label="备注" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

