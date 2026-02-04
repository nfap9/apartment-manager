import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import {
  Button,
  Card,
  DatePicker,
  Divider,
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
import { Form as AntdForm } from 'antd';

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
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

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
    billingCycleMonths: number;
    depositCents?: number;
    baseRentCents: number;
    rentIncreaseType?: 'NONE' | 'FIXED' | 'PERCENT';
    rentIncreaseValue?: number;
    rentIncreaseIntervalMonths?: number;
    // 水费
    waterMode?: 'FIXED' | 'METERED';
    waterFixedAmountCents?: number;
    waterUnitPriceCents?: number;
    waterUnitName?: string;
    // 电费
    electricityMode?: 'FIXED' | 'METERED';
    electricityFixedAmountCents?: number;
    electricityUnitPriceCents?: number;
    electricityUnitName?: string;
    // 其他费用
    charges?: Array<{
      name: string;
      feeType?: string;
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
        title: '房租(元每月)',
        dataIndex: 'baseRentCents',
        width: 140,
        render: (v: number) => (v / 100).toFixed(2),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        render: (v: LeaseRow['status'], row: LeaseRow) => {
          const color = v === 'ACTIVE' ? 'green' : v === 'DRAFT' ? 'blue' : 'default';
          if (!canWrite) {
            return <Tag color={color}>{v}</Tag>;
          }
          return (
            <Select
              value={v}
              size="small"
              loading={updatingStatus === row.id}
              onChange={async (newStatus) => {
                setUpdatingStatus(row.id);
                try {
                  await api.put(`/api/orgs/${orgId}/leases/${row.id}`, { status: newStatus });
                  message.success('状态已更新');
                  await qc.invalidateQueries({ queryKey: ['leases', orgId] });
                  await qc.invalidateQueries({ queryKey: ['apartment', orgId] });
                } catch (err) {
                  const e = err as AxiosError<ApiErrorResponse>;
                  message.error(e.response?.data?.error?.message ?? '状态更新失败');
                } finally {
                  setUpdatingStatus(null);
                }
              }}
              options={[
                { value: 'DRAFT', label: 'DRAFT' },
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'ENDED', label: 'ENDED' },
                { value: 'TERMINATED', label: 'TERMINATED' },
              ]}
              style={{ minWidth: 100 }}
            />
          );
        },
      },
    ],
    [canWrite],
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
      
      // 构建费用列表，包括水费和电费
      const charges: Array<{
        name: string;
        feeType: string;
        mode: 'FIXED' | 'METERED';
        fixedAmountCents?: number | null;
        unitPriceCents?: number | null;
        unitName?: string | null;
        billingCycleMonths: number;
        isActive: boolean;
      }> = [];

      // 添加水费
      if (values.waterMode) {
        charges.push({
          name: '水费',
          feeType: 'WATER',
          mode: values.waterMode,
          fixedAmountCents: values.waterMode === 'FIXED' ? (values.waterFixedAmountCents ?? null) : null,
          unitPriceCents: values.waterMode === 'METERED' ? (values.waterUnitPriceCents ?? null) : null,
          unitName: values.waterMode === 'METERED' ? (values.waterUnitName ?? '吨') : null,
          billingCycleMonths: values.billingCycleMonths ?? 1,
          isActive: true,
        });
      }

      // 添加电费
      if (values.electricityMode) {
        charges.push({
          name: '电费',
          feeType: 'ELECTRICITY',
          mode: values.electricityMode,
          fixedAmountCents: values.electricityMode === 'FIXED' ? (values.electricityFixedAmountCents ?? null) : null,
          unitPriceCents: values.electricityMode === 'METERED' ? (values.electricityUnitPriceCents ?? null) : null,
          unitName: values.electricityMode === 'METERED' ? (values.electricityUnitName ?? '度') : null,
          billingCycleMonths: values.billingCycleMonths ?? 1,
          isActive: true,
        });
      }

      // 添加其他费用（只支持固定计费）
      if (values.charges) {
        charges.push(
          ...values.charges.map((c) => ({
            name: c.name,
            feeType: c.feeType ?? 'OTHER',
            mode: 'FIXED' as const,
            fixedAmountCents: c.fixedAmountCents ?? null,
            unitPriceCents: null,
            unitName: null,
            billingCycleMonths: values.billingCycleMonths ?? 1,
            isActive: true,
          }))
        );
      }

      const payload = {
        roomId: values.roomId,
        tenantId: values.tenantId,
        startDate: start.toDate(),
        endDate: end.toDate(),
        billingCycleMonths: values.billingCycleMonths ?? 1,
        depositCents: values.depositCents ?? 0,
        baseRentCents: values.baseRentCents,
        rentIncreaseType: values.rentIncreaseType ?? 'NONE',
        rentIncreaseValue: values.rentIncreaseValue ?? 0,
        rentIncreaseIntervalMonths: values.rentIncreaseIntervalMonths ?? 12,
        charges,
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
          style={{ marginTop: 8 }}
        >
          <Space wrap style={{ width: '100%', marginBottom: 16 }}>
            <Form.Item 
              label="公寓" 
              name="apartmentId" 
              rules={[{ required: true, message: '请选择公寓' }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                style={{ width: 260 }}
                placeholder="请选择公寓"
                options={apartments.map((a) => ({ value: a.id, label: a.name }))}
                loading={apartmentsQuery.isLoading}
              />
            </Form.Item>

            <Form.Item 
              label="房间" 
              name="roomId" 
              rules={[{ required: true, message: '请选择房间' }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                style={{ width: 260 }}
                placeholder="请选择房间"
                options={rooms.map((r) => ({ value: r.id, label: r.name }))}
                loading={roomsQuery.isLoading}
                disabled={!selectedApartmentId}
              />
            </Form.Item>

            <Form.Item 
              label="租客" 
              name="tenantId" 
              rules={[{ required: true, message: '请选择租客' }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                style={{ width: 260 }}
                placeholder="请搜索并选择租客"
                showSearch
                filterOption={false}
                onSearch={(v) => setTenantQ(v)}
                options={tenants.map((t) => ({ value: t.id, label: `${t.name}(${t.phone})` }))}
                loading={tenantsQuery.isLoading}
              />
            </Form.Item>
          </Space>

          <Space wrap style={{ width: '100%', marginBottom: 16 }}>
            <Form.Item 
              label="租期" 
              name="period" 
              rules={[{ required: true, message: '请选择租期' }]}
              style={{ marginBottom: 0 }}
            >
              <DatePicker.RangePicker style={{ width: 280 }} />
            </Form.Item>
            <Form.Item
              label="租赁方式"
              name="billingCycleMonths"
              rules={[{ required: true, message: '请选择租赁方式' }]}
              initialValue={1}
              style={{ marginBottom: 0 }}
            >
              <Select
                style={{ width: 180 }}
                placeholder="选择租赁方式"
                options={[
                  { value: 1, label: '按月租' },
                  { value: 3, label: '按季度租' },
                  { value: 6, label: '按半年租' },
                  { value: 12, label: '按年租' },
                ]}
              />
            </Form.Item>
            <Form.Item
              label="押金(元)"
              name="depositCents"
              getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
              normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
              style={{ marginBottom: 0 }}
            >
              <InputNumber min={0} precision={2} step={100} style={{ width: 150 }} placeholder="0" />
            </Form.Item>
            <AntdForm.Item noStyle shouldUpdate={(prev, curr) => prev.billingCycleMonths !== curr.billingCycleMonths}>
              {({ getFieldValue }) => {
                const billingCycle = getFieldValue('billingCycleMonths') ?? 1;
                const label = billingCycle === 1 ? '房租(元/月)' : billingCycle === 12 ? '房租(元/年)' : `房租(元/${billingCycle}个月)`;
                return (
                  <Form.Item
                    label={label}
                    name="baseRentCents"
                    rules={[{ required: true, message: '请输入房租' }]}
                    getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                    normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber min={0} precision={2} step={100} style={{ width: 150 }} placeholder="0" />
                  </Form.Item>
                );
              }}
            </AntdForm.Item>
          </Space>

          <Space wrap style={{ width: '100%', marginBottom: 16 }}>
            <Form.Item 
              label="租金递增类型" 
              name="rentIncreaseType" 
              initialValue="NONE"
              style={{ marginBottom: 0 }}
            >
              <Select
                style={{ width: 220 }}
                options={[
                  { value: 'NONE', label: '不递增' },
                  { value: 'FIXED', label: '固定递增(元)' },
                  { value: 'PERCENT', label: '百分比递增(%)' },
                ]}
              />
            </Form.Item>
            <AntdForm.Item noStyle shouldUpdate={(prev, curr) => prev.rentIncreaseType !== curr.rentIncreaseType}>
              {({ getFieldValue }) => {
                const increaseType = getFieldValue('rentIncreaseType');
                return (
                  <Form.Item
                    label="递增值"
                    name="rentIncreaseValue"
                    style={{ marginBottom: 0 }}
                    getValueProps={(value: number | null | undefined) => {
                      // 如果是百分比类型，直接显示；如果是固定递增，转换为元
                      if (increaseType === 'PERCENT') {
                        return { value: value == null ? value : value };
                      }
                      return { value: value == null ? value : value / 100 };
                    }}
                    normalize={(value: number | null) => {
                      if (increaseType === 'PERCENT') {
                        return value == null ? value : value;
                      }
                      return value == null ? value : Math.round(value * 100);
                    }}
                  >
                    <InputNumber min={0} precision={increaseType === 'PERCENT' ? 0 : 2} style={{ width: 120 }} placeholder="0" />
                  </Form.Item>
                );
              }}
            </AntdForm.Item>
            <Form.Item 
              label="递增周期(月)" 
              name="rentIncreaseIntervalMonths" 
              initialValue={12}
              style={{ marginBottom: 0 }}
            >
              <InputNumber min={1} style={{ width: 120 }} />
            </Form.Item>
          </Space>

          <Divider style={{ margin: '16px 0' }}>水费设置</Divider>
          <Space wrap style={{ width: '100%', marginBottom: 16 }}>
            <Form.Item 
              label="计费模式" 
              name="waterMode" 
              initialValue="FIXED"
              style={{ marginBottom: 0 }}
            >
              <Select
                style={{ width: 140 }}
                options={[
                  { value: 'FIXED', label: '固定计费' },
                  { value: 'METERED', label: '按用量计费' },
                ]}
              />
            </Form.Item>
            <AntdForm.Item noStyle shouldUpdate={(prev, curr) => prev.waterMode !== curr.waterMode || prev.billingCycleMonths !== curr.billingCycleMonths}>
              {({ getFieldValue }) => {
                const mode = getFieldValue('waterMode') ?? 'FIXED';
                const billingCycle = getFieldValue('billingCycleMonths') ?? 1;
                const cycleLabel = billingCycle === 1 ? '每月' : billingCycle === 12 ? '每年' : `每${billingCycle}个月`;
                if (mode === 'FIXED') {
                  return (
                    <Form.Item
                      label={`固定金额(元/${cycleLabel})`}
                      name="waterFixedAmountCents"
                      style={{ marginBottom: 0 }}
                      getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                      normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                    >
                      <InputNumber min={0} precision={2} step={0.01} style={{ width: 180 }} placeholder="0" />
                    </Form.Item>
                  );
                }
                return (
                  <>
                    <Form.Item
                      label="单价(元/吨)"
                      name="waterUnitPriceCents"
                      style={{ marginBottom: 0 }}
                      getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                      normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                    >
                      <InputNumber min={0} precision={2} step={0.01} style={{ width: 150 }} placeholder="0" />
                    </Form.Item>
                    <Form.Item 
                      label="单位" 
                      name="waterUnitName" 
                      initialValue="吨"
                      style={{ marginBottom: 0 }}
                    >
                      <Input style={{ width: 100 }} placeholder="吨" disabled />
                    </Form.Item>
                  </>
                );
              }}
            </AntdForm.Item>
          </Space>

          <Divider style={{ margin: '16px 0' }}>电费设置</Divider>
          <Space wrap style={{ width: '100%', marginBottom: 16 }}>
            <Form.Item 
              label="计费模式" 
              name="electricityMode" 
              initialValue="FIXED"
              style={{ marginBottom: 0 }}
            >
              <Select
                style={{ width: 140 }}
                options={[
                  { value: 'FIXED', label: '固定计费' },
                  { value: 'METERED', label: '按用量计费' },
                ]}
              />
            </Form.Item>
            <AntdForm.Item noStyle shouldUpdate={(prev, curr) => prev.electricityMode !== curr.electricityMode || prev.billingCycleMonths !== curr.billingCycleMonths}>
              {({ getFieldValue }) => {
                const mode = getFieldValue('electricityMode') ?? 'FIXED';
                const billingCycle = getFieldValue('billingCycleMonths') ?? 1;
                const cycleLabel = billingCycle === 1 ? '每月' : billingCycle === 12 ? '每年' : `每${billingCycle}个月`;
                if (mode === 'FIXED') {
                  return (
                    <Form.Item
                      label={`固定金额(元/${cycleLabel})`}
                      name="electricityFixedAmountCents"
                      style={{ marginBottom: 0 }}
                      getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                      normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                    >
                      <InputNumber min={0} precision={2} step={0.01} style={{ width: 180 }} placeholder="0" />
                    </Form.Item>
                  );
                }
                return (
                  <>
                    <Form.Item
                      label="单价(元/度)"
                      name="electricityUnitPriceCents"
                      style={{ marginBottom: 0 }}
                      getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                      normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                    >
                      <InputNumber min={0} precision={2} step={0.01} style={{ width: 150 }} placeholder="0" />
                    </Form.Item>
                    <Form.Item 
                      label="单位" 
                      name="electricityUnitName" 
                      initialValue="度"
                      style={{ marginBottom: 0 }}
                    >
                      <Input style={{ width: 100 }} placeholder="度" disabled />
                    </Form.Item>
                  </>
                );
              }}
            </AntdForm.Item>
          </Space>

          <Divider style={{ margin: '16px 0' }}>其他费用</Divider>
          <Form.Item label="其他费用" style={{ marginBottom: 16 }}>
            <Form.List name="charges">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {fields.map((f) => (
                    <Card key={f.key} size="small" style={{ marginBottom: 8 }}>
                      <Space wrap align="baseline">
                        <Form.Item
                          {...f}
                          label="名称"
                          name={[f.name, 'name']}
                          rules={[{ required: true, message: '必填' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input style={{ width: 160 }} placeholder="费用名称" />
                        </Form.Item>
                        <Form.Item
                          {...f}
                          label="费用类型"
                          name={[f.name, 'feeType']}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            style={{ width: 140 }}
                            allowClear
                            placeholder="选择类型"
                            options={[
                              { value: 'MANAGEMENT', label: '物业费' },
                              { value: 'INTERNET', label: '网费' },
                              { value: 'GAS', label: '燃气费' },
                              { value: 'OTHER', label: '其他费用' },
                            ]}
                          />
                        </Form.Item>
                        <AntdForm.Item noStyle shouldUpdate={(prev, curr) => prev.billingCycleMonths !== curr.billingCycleMonths}>
                          {({ getFieldValue }) => {
                            const billingCycle = getFieldValue('billingCycleMonths') ?? 1;
                            const cycleLabel = billingCycle === 1 ? '每月' : billingCycle === 12 ? '每年' : `每${billingCycle}个月`;
                            return (
                              <Form.Item
                                {...f}
                                label={`固定金额(元/${cycleLabel})`}
                                name={[f.name, 'fixedAmountCents']}
                                rules={[{ required: true, message: '必填' }]}
                                style={{ marginBottom: 0 }}
                                getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                                normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                              >
                                <InputNumber min={0} precision={2} step={0.01} style={{ width: 180 }} placeholder="0" />
                              </Form.Item>
                            );
                          }}
                        </AntdForm.Item>
                        <Form.Item label=" " colon={false} style={{ marginBottom: 0 }}>
                          <Button danger size="small" onClick={() => remove(f.name)}>
                            删除
                          </Button>
                        </Form.Item>
                      </Space>
                    </Card>
                  ))}
                  <Button type="dashed" onClick={() => add()} style={{ width: '100%' }}>
                    添加其他费用
                  </Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item label="备注" name="notes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={3} placeholder="选填备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

