import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { ApiErrorResponse } from '../lib/apiTypes';
import { useAuthStore } from '../stores/auth';
import { usePermissionStore } from '../stores/permissions';

type Room = {
  id: string;
  apartmentId: string;
  name: string;
  layout?: string | null;
  area?: number | null;
  facilities?: Record<string, boolean> | null;
  isActive: boolean;
};

type Apartment = {
  id: string;
  name: string;
  address: string;
  totalArea?: number | null;
  floor?: number | null;
  rooms: Room[];
};

type ApartmentResp = { apartment: Apartment };

type Upstream = {
  apartmentId: string;
  transferFeeCents: number;
  renovationFeeCents: number;
  renovationDepositCents: number;
  upfrontOtherCents: number;
  upstreamDepositCents: number;
  upstreamRentBaseCents: number;
  upstreamRentIncreaseType: 'NONE' | 'FIXED' | 'PERCENT';
  upstreamRentIncreaseValue: number;
  upstreamRentIncreaseIntervalMonths: number;
  notes?: string | null;
};

type UpstreamResp = { upstream: Upstream | null };

type FeePricing = {
  id: string;
  feeType: 'WATER' | 'ELECTRICITY' | 'MANAGEMENT' | 'INTERNET' | 'GAS' | 'OTHER';
  mode: 'FIXED' | 'METERED';
  fixedAmountCents?: number | null;
  unitPriceCents?: number | null;
  unitName?: string | null;
};

type FeePricingResp = { feePricings: FeePricing[] };

type PricingPlan = { durationMonths: number; rentCents: number; depositCents: number };
type PricingPlansResp = { pricingPlans: PricingPlan[] };

export function ApartmentDetailPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const permissionKeys = usePermissionStore((s) => s.permissionKeys);
  const { apartmentId } = useParams<{ apartmentId: string }>();
  const qc = useQueryClient();

  const canUpstreamRead = permissionKeys.includes('apartment.upstream.read');
  const canUpstreamWrite = permissionKeys.includes('apartment.upstream.write');
  const canApartmentWrite = permissionKeys.includes('apartment.write');
  const canRoomWrite = permissionKeys.includes('room.write');
  const canPricingManage = permissionKeys.includes('room.pricing.manage');

  const apartmentQuery = useQuery({
    queryKey: ['apartment', orgId, apartmentId],
    enabled: !!orgId && !!apartmentId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/apartments/${apartmentId}`);
      return r.data as ApartmentResp;
    },
  });

  const upstreamQuery = useQuery({
    queryKey: ['apartment', 'upstream', orgId, apartmentId],
    enabled: !!orgId && !!apartmentId && canUpstreamRead,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/apartments/${apartmentId}/upstream`);
      return r.data as UpstreamResp;
    },
  });

  const feeQuery = useQuery({
    queryKey: ['apartment', 'fee', orgId, apartmentId],
    enabled: !!orgId && !!apartmentId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/apartments/${apartmentId}/fee-pricings`);
      return r.data as FeePricingResp;
    },
  });

  const apartment = apartmentQuery.data?.apartment ?? null;

  const [editApartmentOpen, setEditApartmentOpen] = useState(false);
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingRoom, setPricingRoom] = useState<Room | null>(null);
  const [feeModalOpen, setFeeModalOpen] = useState(false);

  const [apartmentForm] = Form.useForm<{ name: string; address: string; totalArea?: number; floor?: number }>();
  const [roomForm] = Form.useForm<{
    name: string;
    layout?: string | null;
    area?: number | null;
    isActive?: boolean;
    facilitiesJson?: string;
  }>();

  const [upstreamForm] = Form.useForm<Partial<Upstream>>();
  const [feeForm] = Form.useForm<{ items: Array<Partial<FeePricing>> }>();

  const pricingPlansQuery = useQuery({
    queryKey: ['room', 'pricingPlans', orgId, pricingRoom?.id],
    enabled: !!orgId && !!pricingRoom?.id && pricingOpen,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/rooms/${pricingRoom!.id}/pricing-plans`);
      return r.data as PricingPlansResp;
    },
  });

  const [pricingForm] = Form.useForm<{ plans: PricingPlan[] }>();

  useEffect(() => {
    if (canUpstreamRead) {
      const upstream = upstreamQuery.data?.upstream;
      if (upstream) upstreamForm.setFieldsValue(upstream);
      else upstreamForm.resetFields();
    }
  }, [canUpstreamRead, upstreamForm, upstreamQuery.data?.upstream]);

  useEffect(() => {
    if (!pricingOpen) return;
    pricingForm.setFieldsValue({ plans: pricingPlansQuery.data?.pricingPlans ?? [] });
  }, [pricingForm, pricingOpen, pricingPlansQuery.data?.pricingPlans]);

  const roomColumns: ColumnsType<Room> = useMemo(
    () => [
      { title: '房间', dataIndex: 'name' },
      { title: '户型', dataIndex: 'layout', width: 120 },
      { title: '面积', dataIndex: 'area', width: 90 },
      {
        title: '状态',
        dataIndex: 'isActive',
        width: 90,
        render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
      },
      {
        title: '操作',
        key: 'actions',
        width: 220,
        render: (_: unknown, row) => (
          <Space>
            {canRoomWrite ? (
              <Button
                size="small"
                onClick={() => {
                  setEditingRoom(row);
                  roomForm.setFieldsValue({
                    name: row.name,
                    layout: row.layout ?? null,
                    area: row.area ?? null,
                    isActive: row.isActive,
                    facilitiesJson: row.facilities ? JSON.stringify(row.facilities) : '',
                  });
                  setEditRoomOpen(true);
                }}
              >
                编辑
              </Button>
            ) : null}
            {canPricingManage ? (
              <Button
                size="small"
                onClick={() => {
                  setPricingRoom(row);
                  setPricingOpen(true);
                }}
              >
                价格方案
              </Button>
            ) : null}
          </Space>
        ),
      },
    ],
    [canPricingManage, canRoomWrite, roomForm],
  );

  const onSaveApartment = async () => {
    if (!orgId || !apartmentId) return;
    try {
      const values = await apartmentForm.validateFields();
      await api.put(`/api/orgs/${orgId}/apartments/${apartmentId}`, values);
      message.success('已保存');
      setEditApartmentOpen(false);
      await qc.invalidateQueries({ queryKey: ['apartment', orgId, apartmentId] });
      await qc.invalidateQueries({ queryKey: ['apartments', orgId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '保存失败');
    }
  };

  const onSaveRoom = async () => {
    if (!orgId || !apartmentId) return;
    try {
      const values = await roomForm.validateFields();
      const facilitiesJson = values.facilitiesJson;
      let facilities: Record<string, boolean> | null | undefined = undefined;

      if (facilitiesJson !== undefined) {
        const txt = facilitiesJson.trim();
        if (!txt) {
          facilities = null;
        } else {
          const parsed = JSON.parse(txt) as unknown;
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            message.error('设施字段必须是 JSON 对象，例如 {"洗衣机":true}');
            return;
          }
          const obj = parsed as Record<string, unknown>;
          for (const [k, v] of Object.entries(obj)) {
            if (typeof v !== 'boolean') {
              message.error(`设施 ${k} 的值必须是 boolean（true/false）`);
              return;
            }
          }
          facilities = obj as Record<string, boolean>;
        }
      }

      const payload = {
        name: values.name,
        layout: values.layout,
        area: values.area,
        isActive: values.isActive,
        facilities,
      };

      if (editingRoom) {
        await api.put(`/api/orgs/${orgId}/rooms/${editingRoom.id}`, payload);
      } else {
        await api.post(`/api/orgs/${orgId}/apartments/${apartmentId}/rooms`, payload);
      }
      message.success('已保存');
      setEditRoomOpen(false);
      setEditingRoom(null);
      await qc.invalidateQueries({ queryKey: ['apartment', orgId, apartmentId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '保存失败');
    }
  };

  const onSaveUpstream = async () => {
    if (!orgId || !apartmentId) return;
    try {
      const values = await upstreamForm.validateFields();
      await api.put(`/api/orgs/${orgId}/apartments/${apartmentId}/upstream`, values);
      message.success('已保存');
      await qc.invalidateQueries({ queryKey: ['apartment', 'upstream', orgId, apartmentId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '保存失败');
    }
  };

  const onSaveFee = async () => {
    if (!orgId || !apartmentId) return;
    try {
      const values = await feeForm.validateFields();
      await api.put(`/api/orgs/${orgId}/apartments/${apartmentId}/fee-pricings`, values.items ?? []);
      message.success('已保存');
      setFeeModalOpen(false);
      await qc.invalidateQueries({ queryKey: ['apartment', 'fee', orgId, apartmentId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '保存失败');
    }
  };

  const onSavePricingPlans = async () => {
    if (!orgId || !pricingRoom) return;
    try {
      const values = await pricingForm.validateFields();
      await api.put(`/api/orgs/${orgId}/rooms/${pricingRoom.id}/pricing-plans`, values.plans ?? []);
      message.success('已保存');
      setPricingOpen(false);
      await qc.invalidateQueries({ queryKey: ['room', 'pricingPlans', orgId, pricingRoom.id] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '保存失败');
    }
  };

  if (!orgId) return <Typography.Text type="secondary">请先选择组织</Typography.Text>;
  if (!apartmentId) return <Typography.Text type="secondary">缺少 apartmentId</Typography.Text>;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Card
        title={apartment ? `${apartment.name}（详情）` : '公寓详情'}
        loading={apartmentQuery.isLoading}
        extra={
          canApartmentWrite && apartment ? (
            <Button
              onClick={() => {
                apartmentForm.setFieldsValue({
                  name: apartment.name,
                  address: apartment.address,
                  totalArea: apartment.totalArea ?? undefined,
                  floor: apartment.floor ?? undefined,
                });
                setEditApartmentOpen(true);
              }}
            >
              编辑
            </Button>
          ) : null
        }
      >
        {apartment ? (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="地址">{apartment.address}</Descriptions.Item>
            <Descriptions.Item label="总面积">{apartment.totalArea ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="楼层">{apartment.floor ?? '-'}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Typography.Text type="secondary">未找到公寓</Typography.Text>
        )}
      </Card>

      <Tabs
        items={[
          {
            key: 'rooms',
            label: '房间',
            children: (
              <Card
                extra={
                  canRoomWrite ? (
                    <Button
                      type="primary"
                      onClick={() => {
                        setEditingRoom(null);
                        roomForm.resetFields();
                        setEditRoomOpen(true);
                      }}
                    >
                      新增房间
                    </Button>
                  ) : null
                }
              >
                <Table<Room>
                  rowKey="id"
                  dataSource={apartment?.rooms ?? []}
                  columns={roomColumns}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          ...(canUpstreamRead
            ? [
                {
                  key: 'upstream',
                  label: '上游信息',
                  children: (
                    <Card loading={upstreamQuery.isLoading}>
                      <Form
                        form={upstreamForm}
                        layout="vertical"
                        disabled={!canUpstreamWrite}
                        initialValues={upstreamQuery.data?.upstream ?? undefined}
                      >
                        <Space wrap>
                          <Form.Item label="转让费(分)" name="transferFeeCents">
                            <InputNumber min={0} />
                          </Form.Item>
                          <Form.Item label="装修费押金(分)" name="renovationDepositCents">
                            <InputNumber min={0} />
                          </Form.Item>
                          <Form.Item label="装修费(分)" name="renovationFeeCents">
                            <InputNumber min={0} />
                          </Form.Item>
                          <Form.Item label="其他前期成本(分)" name="upfrontOtherCents">
                            <InputNumber min={0} />
                          </Form.Item>
                        </Space>

                        <Space wrap>
                          <Form.Item label="上游押金(分)" name="upstreamDepositCents">
                            <InputNumber min={0} />
                          </Form.Item>
                          <Form.Item label="上游月租(分)" name="upstreamRentBaseCents">
                            <InputNumber min={0} />
                          </Form.Item>
                          <Form.Item label="租金递增类型" name="upstreamRentIncreaseType">
                            <Input />
                          </Form.Item>
                          <Form.Item label="递增值" name="upstreamRentIncreaseValue">
                            <InputNumber min={0} />
                          </Form.Item>
                          <Form.Item label="递增周期(月)" name="upstreamRentIncreaseIntervalMonths">
                            <InputNumber min={1} />
                          </Form.Item>
                        </Space>

                        <Form.Item label="备注" name="notes">
                          <Input.TextArea rows={3} />
                        </Form.Item>

                        {canUpstreamWrite ? (
                          <Button type="primary" onClick={onSaveUpstream}>
                            保存
                          </Button>
                        ) : (
                          <Typography.Text type="secondary">无权限编辑</Typography.Text>
                        )}
                      </Form>
                    </Card>
                  ),
                },
              ]
            : []),
          {
            key: 'fees',
            label: '费用定价',
            children: (
              <Card
                loading={feeQuery.isLoading}
                extra={
                  canApartmentWrite ? (
                    <Button
                      onClick={() => {
                        feeForm.setFieldsValue({ items: feeQuery.data?.feePricings ?? [] });
                        setFeeModalOpen(true);
                      }}
                    >
                      编辑
                    </Button>
                  ) : null
                }
              >
                <Table<FeePricing>
                  rowKey="id"
                  dataSource={feeQuery.data?.feePricings ?? []}
                  pagination={false}
                  columns={[
                    { title: '类型', dataIndex: 'feeType' },
                    { title: '模式', dataIndex: 'mode' },
                    {
                      title: '固定金额(分)',
                      dataIndex: 'fixedAmountCents',
                      render: (v: number | null | undefined) => (v == null ? '-' : v),
                    },
                    {
                      title: '单价(分)',
                      dataIndex: 'unitPriceCents',
                      render: (v: number | null | undefined) => (v == null ? '-' : v),
                    },
                    { title: '单位', dataIndex: 'unitName' },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        open={editApartmentOpen}
        title="编辑公寓"
        onCancel={() => setEditApartmentOpen(false)}
        onOk={onSaveApartment}
        destroyOnClose
      >
        <Form form={apartmentForm} layout="vertical">
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

      <Modal
        open={editRoomOpen}
        title={editingRoom ? '编辑房间' : '新增房间'}
        onCancel={() => setEditRoomOpen(false)}
        onOk={onSaveRoom}
        destroyOnClose
      >
        <Form form={roomForm} layout="vertical">
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="户型" name="layout">
            <Input />
          </Form.Item>
          <Form.Item label="面积" name="area">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="启用" name="isActive" valuePropName="checked">
            <Checkbox />
          </Form.Item>
          <Form.Item label={'设施(简单 JSON: {"洗衣机":true})'} name="facilitiesJson">
            <Input.TextArea rows={3} placeholder='{"洗衣机":true,"冰箱":false}' />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={pricingOpen}
        title={pricingRoom ? `价格方案 - ${pricingRoom.name}` : '价格方案'}
        onCancel={() => setPricingOpen(false)}
        onOk={onSavePricingPlans}
        destroyOnClose
      >
        <Form
          form={pricingForm}
          layout="vertical"
          initialValues={{ plans: pricingPlansQuery.data?.pricingPlans ?? [] }}
        >
          <Form.List name="plans">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((f) => (
                  <Space key={f.key} align="baseline">
                    <Form.Item
                      {...f}
                      label="周期(月)"
                      name={[f.name, 'durationMonths']}
                      rules={[{ required: true, message: '必填' }]}
                    >
                      <InputNumber min={1} />
                    </Form.Item>
                    <Form.Item
                      {...f}
                      label="租金(分)"
                      name={[f.name, 'rentCents']}
                      rules={[{ required: true, message: '必填' }]}
                    >
                      <InputNumber min={0} />
                    </Form.Item>
                    <Form.Item {...f} label="押金(分)" name={[f.name, 'depositCents']}>
                      <InputNumber min={0} />
                    </Form.Item>
                    <Button danger onClick={() => remove(f.name)}>
                      删除
                    </Button>
                  </Space>
                ))}
                <Button onClick={() => add()} type="dashed">
                  添加方案
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        open={feeModalOpen}
        title="编辑费用定价"
        onCancel={() => setFeeModalOpen(false)}
        onOk={onSaveFee}
        destroyOnClose
      >
        <Form form={feeForm} layout="vertical">
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((f) => (
                  <Space key={f.key} align="baseline" wrap>
                    <Form.Item {...f} label="类型" name={[f.name, 'feeType']} rules={[{ required: true }]}>
                      <Input placeholder="WATER/ELECTRICITY/..." style={{ width: 160 }} />
                    </Form.Item>
                    <Form.Item {...f} label="模式" name={[f.name, 'mode']} rules={[{ required: true }]}>
                      <Input placeholder="FIXED/METERED" style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item {...f} label="固定金额(分)" name={[f.name, 'fixedAmountCents']}>
                      <InputNumber min={0} />
                    </Form.Item>
                    <Form.Item {...f} label="单价(分)" name={[f.name, 'unitPriceCents']}>
                      <InputNumber min={0} />
                    </Form.Item>
                    <Form.Item {...f} label="单位" name={[f.name, 'unitName']}>
                      <Input style={{ width: 120 }} />
                    </Form.Item>
                    <Button danger onClick={() => remove(f.name)}>
                      删除
                    </Button>
                  </Space>
                ))}
                <Button onClick={() => add()} type="dashed">
                  添加定价
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Space>
  );
}

