import {
  CheckCircleOutlined,
  HomeOutlined,
  SolutionOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { AxiosError } from 'axios';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Radio,
  Result,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { api } from '../lib/api';
import type { ApiErrorResponse } from '../lib/apiTypes';
import { useAuthStore } from '../stores/auth';
import { PageContainer } from '../components/PageContainer';

type PricingPlan = {
  id: string;
  durationMonths: number;
  rentCents: number;
  depositCents: number;
};

type RoomFacility = {
  id: string;
  name: string;
  quantity: number;
  valueCents: number;
};

type AvailableRoom = {
  id: string;
  name: string;
  layout: string | null;
  area: number | null;
  notes: string | null;
  apartment: { id: string; name: string; address: string };
  pricingPlans: PricingPlan[];
  facilities: RoomFacility[];
};

type Tenant = {
  id: string;
  name: string;
  phone: string;
  idNumber?: string | null;
};

type ChargeItem = {
  name: string;
  feeType?: string | null;
  mode: 'FIXED' | 'METERED';
  fixedAmountCents?: number | null;
  unitPriceCents?: number | null;
  unitName?: string | null;
  billingCycleMonths: number;
  isActive: boolean;
};

type LeaseFormData = {
  period: [dayjs.Dayjs, dayjs.Dayjs];
  billingCycleMonths: number;
  depositCents: number;
  baseRentCents: number;
  rentIncreaseType: 'NONE' | 'FIXED' | 'PERCENT';
  rentIncreaseValue: number;
  rentIncreaseIntervalMonths: number;
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
  notes?: string;
};

export function SigningPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [tenantMode, setTenantMode] = useState<'select' | 'create'>('select');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [newTenantForm] = Form.useForm<{ name: string; phone: string; idNumber?: string }>();
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);
  const [leaseForm] = Form.useForm<LeaseFormData & { charges?: Array<{ name: string; feeType?: string | null; fixedAmountCents?: number | null }> }>();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // 查询租客列表
  const [tenantQ, setTenantQ] = useState('');
  const tenantsQuery = useQuery({
    queryKey: ['tenants', orgId, tenantQ],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/tenants${tenantQ ? `?q=${encodeURIComponent(tenantQ)}` : ''}`);
      return r.data as { tenants: Tenant[] };
    },
  });

  // 查询可租房间列表
  const roomsQuery = useQuery({
    queryKey: ['signing-available-rooms', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/signing/available-rooms`);
      return r.data as { rooms: AvailableRoom[] };
    },
  });

  const tenants = tenantsQuery.data?.tenants ?? [];
  const availableRooms = roomsQuery.data?.rooms ?? [];

  // 加载公寓费用模板
  const loadFeeTemplate = async (apartmentId: string) => {
    try {
      const r = await api.get(`/api/orgs/${orgId}/signing/fee-templates/${apartmentId}`);
      const data = r.data as { charges: ChargeItem[] };
      // 分离水费、电费和其他费用
      const waterCharge = data.charges.find((c) => c.feeType === 'WATER');
      const electricityCharge = data.charges.find((c) => c.feeType === 'ELECTRICITY');
      const other = data.charges.filter((c) => c.feeType !== 'WATER' && c.feeType !== 'ELECTRICITY');
      
      if (waterCharge) {
        leaseForm.setFieldsValue({
          waterMode: waterCharge.mode,
          waterFixedAmountCents: waterCharge.fixedAmountCents ?? undefined,
          waterUnitPriceCents: waterCharge.unitPriceCents ?? undefined,
          waterUnitName: waterCharge.unitName ?? '吨',
        });
      }
      if (electricityCharge) {
        leaseForm.setFieldsValue({
          electricityMode: electricityCharge.mode,
          electricityFixedAmountCents: electricityCharge.fixedAmountCents ?? undefined,
          electricityUnitPriceCents: electricityCharge.unitPriceCents ?? undefined,
          electricityUnitName: electricityCharge.unitName ?? '度',
        });
      }
      // 将其他费用加载到 Form.List 中
      leaseForm.setFieldsValue({
        charges: other.map((c) => ({
          name: c.name,
          feeType: c.feeType ?? null,
          fixedAmountCents: c.fixedAmountCents ?? null,
        })),
      });
    } catch {
      // ignore
    }
  };

  // 选择房间时应用价格方案
  const applyPricingPlan = (room: AvailableRoom, plan: PricingPlan) => {
    const startDate = dayjs();
    const endDate = startDate.add(plan.durationMonths, 'month');
    leaseForm.setFieldsValue({
      period: [startDate, endDate],
      depositCents: plan.depositCents,
      baseRentCents: plan.rentCents,
      billingCycleMonths: 1,
      rentIncreaseType: 'NONE',
      rentIncreaseValue: 0,
      rentIncreaseIntervalMonths: 12,
      waterMode: 'FIXED',
      electricityMode: 'FIXED',
    });
    loadFeeTemplate(room.apartment.id);
  };

  // 步骤验证
  const validateStep = async (): Promise<boolean> => {
    if (currentStep === 0) {
      if (tenantMode === 'select') {
        if (!selectedTenant) {
          message.warning('请选择一个租客');
          return false;
        }
      } else {
        try {
          await newTenantForm.validateFields();
        } catch {
          return false;
        }
      }
    } else if (currentStep === 1) {
      if (!selectedRoom) {
        message.warning('请选择一个房间');
        return false;
      }
    } else if (currentStep === 2) {
      try {
        await leaseForm.validateFields();
      } catch {
        return false;
      }
    }
    return true;
  };

  const nextStep = async () => {
    const valid = await validateStep();
    if (valid) {
      setCurrentStep((s) => Math.min(s + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  // 提交签约
  const handleSubmit = async () => {
    if (!orgId || !selectedRoom) return;

    setSubmitting(true);
    try {
      const leaseValues = await leaseForm.validateFields();
      const [start, end] = leaseValues.period;

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
      if (leaseValues.waterMode) {
        charges.push({
          name: '水费',
          feeType: 'WATER',
          mode: leaseValues.waterMode,
          fixedAmountCents: leaseValues.waterMode === 'FIXED' ? (leaseValues.waterFixedAmountCents ?? null) : null,
          unitPriceCents: leaseValues.waterMode === 'METERED' ? (leaseValues.waterUnitPriceCents ?? null) : null,
          unitName: leaseValues.waterMode === 'METERED' ? (leaseValues.waterUnitName ?? '吨') : null,
          billingCycleMonths: leaseValues.billingCycleMonths ?? 1,
          isActive: true,
        });
      }

      // 添加电费
      if (leaseValues.electricityMode) {
        charges.push({
          name: '电费',
          feeType: 'ELECTRICITY',
          mode: leaseValues.electricityMode,
          fixedAmountCents: leaseValues.electricityMode === 'FIXED' ? (leaseValues.electricityFixedAmountCents ?? null) : null,
          unitPriceCents: leaseValues.electricityMode === 'METERED' ? (leaseValues.electricityUnitPriceCents ?? null) : null,
          unitName: leaseValues.electricityMode === 'METERED' ? (leaseValues.electricityUnitName ?? '度') : null,
          billingCycleMonths: leaseValues.billingCycleMonths ?? 1,
          isActive: true,
        });
      }

      // 添加其他费用（只支持固定计费）
      if (leaseValues.charges) {
        charges.push(
          ...leaseValues.charges.map((c) => ({
            name: c.name,
            feeType: c.feeType ?? 'OTHER',
            mode: 'FIXED' as const,
            fixedAmountCents: c.fixedAmountCents ?? null,
            unitPriceCents: null,
            unitName: null,
            billingCycleMonths: leaseValues.billingCycleMonths ?? 1,
            isActive: true,
          }))
        );
      }

      const payload: Record<string, unknown> = {
        roomId: selectedRoom.id,
        startDate: start.toDate(),
        endDate: end.toDate(),
        depositCents: leaseValues.depositCents ?? 0,
        baseRentCents: leaseValues.baseRentCents,
        billingCycleMonths: leaseValues.billingCycleMonths ?? 1,
        rentIncreaseType: leaseValues.rentIncreaseType ?? 'NONE',
        rentIncreaseValue: leaseValues.rentIncreaseValue ?? 0,
        rentIncreaseIntervalMonths: leaseValues.rentIncreaseIntervalMonths ?? 12,
        notes: leaseValues.notes ?? null,
        charges,
      };

      if (tenantMode === 'select' && selectedTenant) {
        payload.tenantId = selectedTenant.id;
      } else {
        const tenantValues = await newTenantForm.validateFields();
        payload.newTenant = {
          name: tenantValues.name,
          phone: tenantValues.phone,
          idNumber: tenantValues.idNumber ?? null,
        };
      }

      await api.post(`/api/orgs/${orgId}/signing`, payload);
      setSuccess(true);
      await qc.invalidateQueries({ queryKey: ['leases', orgId] });
      await qc.invalidateQueries({ queryKey: ['tenants', orgId] });
      await qc.invalidateQueries({ queryKey: ['signing-available-rooms', orgId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '签约失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 房间列表列配置
  const roomColumns: ColumnsType<AvailableRoom> = useMemo(
    () => [
      {
        title: '公寓',
        dataIndex: ['apartment', 'name'],
        width: 150,
      },
      {
        title: '房间',
        dataIndex: 'name',
        width: 100,
      },
      {
        title: '户型',
        dataIndex: 'layout',
        width: 100,
        render: (v: string | null) => v ?? '-',
      },
      {
        title: '面积',
        dataIndex: 'area',
        width: 80,
        render: (v: number | null) => (v ? `${v}㎡` : '-'),
      },
      {
        title: '价格方案',
        key: 'pricing',
        render: (_: unknown, room) => (
          <Space wrap size={4}>
            {room.pricingPlans.length === 0 ? (
              <Typography.Text type="secondary">无</Typography.Text>
            ) : (
              room.pricingPlans.map((p) => (
                <Tag key={p.id} color="blue">
                  {p.durationMonths}月 ¥{(p.rentCents / 100).toFixed(2)}/月
                </Tag>
              ))
            )}
          </Space>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 100,
        render: (_: unknown, room) => (
          <Button
            type={selectedRoom?.id === room.id ? 'primary' : 'default'}
            size="small"
            onClick={() => {
              setSelectedRoom(room);
              if (room.pricingPlans.length > 0) {
                applyPricingPlan(room, room.pricingPlans[0]);
              } else {
                loadFeeTemplate(room.apartment.id);
              }
            }}
          >
            {selectedRoom?.id === room.id ? '已选择' : '选择'}
          </Button>
        ),
      },
    ],
    [selectedRoom],
  );

  if (!orgId) {
    return (
      <PageContainer>
        <Typography.Text type="secondary">请先选择组织</Typography.Text>
      </PageContainer>
    );
  }

  if (success) {
    return (
      <PageContainer>
        <Card
          style={{
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          }}
        >
          <Result
            status="success"
            title="签约成功！"
            subTitle="租约已创建，房间状态已更新为已租出"
            extra={[
              <Button key="leases" type="primary" onClick={() => navigate('/leases')}>
                查看租约列表
              </Button>,
              <Button
                key="new"
                onClick={() => {
                  setSuccess(false);
                  setCurrentStep(0);
                  setSelectedTenant(null);
                  setSelectedRoom(null);
                  setTenantMode('select');
                  newTenantForm.resetFields();
                  leaseForm.resetFields();
                }}
              >
                继续签约
              </Button>,
            ]}
          />
        </Card>
      </PageContainer>
    );
  }

  const steps = [
    {
      title: '选择租客',
      icon: <UserOutlined />,
      content: (
        <div>
          <Radio.Group
            value={tenantMode}
            onChange={(e) => {
              setTenantMode(e.target.value);
              if (e.target.value === 'select') {
                newTenantForm.resetFields();
              } else {
                setSelectedTenant(null);
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
                  onChange: (_, rows) => setSelectedTenant(rows[0] ?? null),
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
              <Form.Item 
                label="身份证号" 
                name="idNumber"
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="选填" />
              </Form.Item>
            </Form>
          )}
        </div>
      ),
    },
    {
      title: '选择房间',
      icon: <HomeOutlined />,
      content: (
        <div>
          <Typography.Paragraph type="secondary">
            以下是当前可租的房间（未租出且已激活）
          </Typography.Paragraph>
          <Table<AvailableRoom>
            rowKey="id"
            dataSource={availableRooms}
            loading={roomsQuery.isLoading}
            columns={roomColumns}
            pagination={{ pageSize: 8 }}
            size="small"
          />
          {selectedRoom && (
            <Card size="small" style={{ marginTop: 16 }} title="已选房间详情">
              <Descriptions size="small" column={3}>
                <Descriptions.Item label="公寓">{selectedRoom.apartment.name}</Descriptions.Item>
                <Descriptions.Item label="房间">{selectedRoom.name}</Descriptions.Item>
                <Descriptions.Item label="户型">{selectedRoom.layout ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="面积">
                  {selectedRoom.area ? `${selectedRoom.area}㎡` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="地址" span={2}>
                  {selectedRoom.apartment.address}
                </Descriptions.Item>
              </Descriptions>
              {selectedRoom.facilities.length > 0 && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Typography.Text strong>房间设施：</Typography.Text>
                  <Space wrap style={{ marginTop: 8 }}>
                    {selectedRoom.facilities.map((f) => (
                      <Tag key={f.id}>
                        {f.name} x{f.quantity}
                      </Tag>
                    ))}
                  </Space>
                </>
              )}
              {selectedRoom.pricingPlans.length > 0 && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Typography.Text strong>快速选择价格方案：</Typography.Text>
                  <Space wrap style={{ marginTop: 8 }}>
                    {selectedRoom.pricingPlans.map((p) => (
                      <Button
                        key={p.id}
                        size="small"
                        onClick={() => applyPricingPlan(selectedRoom, p)}
                      >
                        {p.durationMonths}个月 - ¥{(p.rentCents / 100).toFixed(2)}/月 押金¥
                        {(p.depositCents / 100).toFixed(2)}
                      </Button>
                    ))}
                  </Space>
                </>
              )}
            </Card>
          )}
        </div>
      ),
    },
    {
      title: '配置租约',
      icon: <SolutionOutlined />,
      content: (
        <div>
          <Form
            form={leaseForm}
            layout="vertical"
            initialValues={{
              billingCycleMonths: 1,
              rentIncreaseType: 'NONE',
              rentIncreaseValue: 0,
              rentIncreaseIntervalMonths: 12,
            }}
            style={{ marginTop: 8 }}
          >
            <Space wrap style={{ width: '100%', marginBottom: 16 }} size="middle">
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
                  style={{ width: 150 }}
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
                label="押金（元）"
                name="depositCents"
                style={{ marginBottom: 0 }}
                getValueProps={(value: number | null | undefined) => ({
                  value: value == null ? value : value / 100,
                })}
                normalize={(value: number | null) =>
                  value == null ? value : Math.round(value * 100)
                }
              >
                <InputNumber min={0} precision={2} step={100} style={{ width: 150 }} placeholder="0" />
              </Form.Item>
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.billingCycleMonths !== curr.billingCycleMonths}
              >
                {({ getFieldValue }) => {
                  const billingCycle = getFieldValue('billingCycleMonths') ?? 1;
                  const label = billingCycle === 1 ? '月租金（元）' : billingCycle === 12 ? '年租金（元）' : `租金（元/${billingCycle}个月）`;
                  return (
                    <Form.Item
                      label={label}
                      name="baseRentCents"
                      rules={[{ required: true, message: '请输入租金' }]}
                      style={{ marginBottom: 0 }}
                      getValueProps={(value: number | null | undefined) => ({
                        value: value == null ? value : value / 100,
                      })}
                      normalize={(value: number | null) =>
                        value == null ? value : Math.round(value * 100)
                      }
                    >
                      <InputNumber min={0} precision={2} step={100} style={{ width: 150 }} placeholder="0" />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Space>

            <Divider style={{ margin: '16px 0' }}>租金递增设置</Divider>
            <Space wrap style={{ marginBottom: 16 }}>
              <Form.Item 
                label="递增类型" 
                name="rentIncreaseType"
                style={{ marginBottom: 0 }}
              >
                <Select
                  style={{ width: 160 }}
                  options={[
                    { value: 'NONE', label: '不递增' },
                    { value: 'FIXED', label: '固定金额递增(元)' },
                    { value: 'PERCENT', label: '百分比递增(%)' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.rentIncreaseType !== curr.rentIncreaseType}
              >
                {({ getFieldValue }) => {
                  const increaseType = getFieldValue('rentIncreaseType');
                  return (
                    <Form.Item
                      label="递增值"
                      name="rentIncreaseValue"
                      style={{ marginBottom: 0 }}
                      getValueProps={(value: number | null | undefined) => {
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
              </Form.Item>
              <Form.Item 
                label="递增周期（月）" 
                name="rentIncreaseIntervalMonths"
                style={{ marginBottom: 0 }}
              >
                <InputNumber min={1} max={60} style={{ width: 120 }} />
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
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.waterMode !== curr.waterMode || prev.billingCycleMonths !== curr.billingCycleMonths}
              >
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
              </Form.Item>
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
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.electricityMode !== curr.electricityMode || prev.billingCycleMonths !== curr.billingCycleMonths}
              >
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
              </Form.Item>
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
                          <Form.Item
                            noStyle
                            shouldUpdate={(prev, curr) => prev.billingCycleMonths !== curr.billingCycleMonths}
                          >
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
                          </Form.Item>
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

            <Divider style={{ margin: '16px 0' }}>备注</Divider>
            <Form.Item name="notes" style={{ marginBottom: 0 }}>
              <Input.TextArea rows={3} placeholder="选填备注信息" />
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      title: '确认签约',
      icon: <CheckCircleOutlined />,
      content: (
        <div>
          <Typography.Title level={5}>请确认以下签约信息</Typography.Title>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="租客" span={2}>
              {tenantMode === 'select' && selectedTenant
                ? `${selectedTenant.name} (${selectedTenant.phone})`
                : '新租客 - ' + (newTenantForm.getFieldValue('name') ?? '') + ' (' + (newTenantForm.getFieldValue('phone') ?? '') + ')'}
            </Descriptions.Item>
            <Descriptions.Item label="公寓">{selectedRoom?.apartment.name}</Descriptions.Item>
            <Descriptions.Item label="房间">{selectedRoom?.name}</Descriptions.Item>
            <Descriptions.Item label="地址" span={2}>
              {selectedRoom?.apartment.address}
            </Descriptions.Item>
            <Descriptions.Item label="租期">
              {leaseForm.getFieldValue('period')?.[0]?.format('YYYY-MM-DD')} ~{' '}
              {leaseForm.getFieldValue('period')?.[1]?.format('YYYY-MM-DD')}
            </Descriptions.Item>
            <Descriptions.Item label="月租金">
              ¥{((leaseForm.getFieldValue('baseRentCents') ?? 0) / 100).toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="押金">
              ¥{((leaseForm.getFieldValue('depositCents') ?? 0) / 100).toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="账单周期">
              {leaseForm.getFieldValue('billingCycleMonths') ?? 1} 个月
            </Descriptions.Item>
          </Descriptions>

          {(leaseForm.getFieldValue('waterMode') || leaseForm.getFieldValue('electricityMode') || (leaseForm.getFieldValue('charges')?.length ?? 0) > 0) && (
            <>
              <Typography.Title level={5} style={{ marginTop: 16 }}>
                费用项目
              </Typography.Title>
              <Space wrap>
                {leaseForm.getFieldValue('waterMode') && (
                  <Tag>
                    水费:{' '}
                    {leaseForm.getFieldValue('waterMode') === 'FIXED'
                      ? `¥${((leaseForm.getFieldValue('waterFixedAmountCents') ?? 0) / 100).toFixed(2)}`
                      : `¥${((leaseForm.getFieldValue('waterUnitPriceCents') ?? 0) / 100).toFixed(2)}/吨`}
                  </Tag>
                )}
                {leaseForm.getFieldValue('electricityMode') && (
                  <Tag>
                    电费:{' '}
                    {leaseForm.getFieldValue('electricityMode') === 'FIXED'
                      ? `¥${((leaseForm.getFieldValue('electricityFixedAmountCents') ?? 0) / 100).toFixed(2)}`
                      : `¥${((leaseForm.getFieldValue('electricityUnitPriceCents') ?? 0) / 100).toFixed(2)}/度`}
                  </Tag>
                )}
                {leaseForm.getFieldValue('charges')?.map((c: { name: string; fixedAmountCents?: number | null }, idx: number) => (
                  <Tag key={idx}>
                    {c.name}: ¥{((c.fixedAmountCents ?? 0) / 100).toFixed(2)}
                  </Tag>
                ))}
              </Space>
            </>
          )}

          <Alert
            type="info"
            message='确认签约后，将创建租约并将房间状态更新为"已租出"'
            style={{ marginTop: 24 }}
          />
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <Card
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
      >
      <Steps current={currentStep} items={steps.map((s) => ({ title: s.title, icon: s.icon }))} />

      <div style={{ marginTop: 24, minHeight: 400 }}>{steps[currentStep].content}</div>

      <Divider />

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button disabled={currentStep === 0} onClick={prevStep}>
          上一步
        </Button>
        <Space>
          <Button onClick={() => navigate('/leases')}>取消</Button>
          {currentStep < steps.length - 1 ? (
            <Button type="primary" onClick={nextStep}>
              下一步
            </Button>
          ) : (
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              确认签约
            </Button>
          )}
        </Space>
      </div>
      </Card>
    </PageContainer>
  );
}
