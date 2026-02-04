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
  Upload,
  message,
} from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { ApiErrorResponse } from '../lib/apiTypes';
import { useAuthStore } from '../stores/auth';
import { usePermissionStore } from '../stores/permissions';

type RoomFacility = {
  id: string;
  roomId: string;
  name: string;
  quantity: number;
  valueCents: number;
};

type Room = {
  id: string;
  apartmentId: string;
  name: string;
  layout?: string | null;
  area?: number | null;
  notes?: string | null;
  isActive: boolean;
  isRented: boolean;
  facilities?: RoomFacility[];
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
type FacilitiesResp = { facilities: RoomFacility[] };

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
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [facilityRoom, setFacilityRoom] = useState<Room | null>(null);
  const [importUploading, setImportUploading] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateRooms, setDuplicateRooms] = useState<string[]>([]);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  const [apartmentForm] = Form.useForm<{ name: string; address: string; totalArea?: number; floor?: number }>();
  const [roomForm] = Form.useForm<{
    name: string;
    layout?: string | null;
    area?: number | null;
    notes?: string | null;
    isActive?: boolean;
    isRented?: boolean;
  }>();

  const [upstreamForm] = Form.useForm<Partial<Upstream>>();
  const [feeForm] = Form.useForm<{ items: Array<Partial<FeePricing>> }>();
  const [facilityForm] = Form.useForm<{ facilities: Array<{ name: string; quantity: number; valueCents: number }> }>();

  const pricingPlansQuery = useQuery({
    queryKey: ['room', 'pricingPlans', orgId, pricingRoom?.id],
    enabled: !!orgId && !!pricingRoom?.id && pricingOpen,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/rooms/${pricingRoom!.id}/pricing-plans`);
      return r.data as PricingPlansResp;
    },
  });

  const facilitiesQuery = useQuery({
    queryKey: ['room', 'facilities', orgId, facilityRoom?.id],
    enabled: !!orgId && !!facilityRoom?.id && facilityOpen,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/rooms/${facilityRoom!.id}/facilities`);
      return r.data as FacilitiesResp;
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

  useEffect(() => {
    if (!facilityOpen) return;
    const facilities = facilitiesQuery.data?.facilities ?? [];
    facilityForm.setFieldsValue({
      facilities: facilities.map((f) => ({
        name: f.name,
        quantity: f.quantity,
        valueCents: f.valueCents,
      })),
    });
  }, [facilityForm, facilityOpen, facilitiesQuery.data?.facilities]);

  const roomColumns: ColumnsType<Room> = useMemo(
    () => [
      { title: '房间', dataIndex: 'name', width: 100 },
      { title: '户型', dataIndex: 'layout', width: 100 },
      { title: '面积', dataIndex: 'area', width: 80 },
      {
        title: '状态',
        dataIndex: 'isActive',
        width: 80,
        render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
      },
      {
        title: '出租',
        dataIndex: 'isRented',
        width: 80,
        render: (v: boolean, row) => {
          return v ? <Tag color="orange">已租</Tag> : <Tag color="blue">空闲</Tag>;
        },
      },
      {
        title: '设施',
        key: 'facilitiesCount',
        width: 80,
        render: (_: unknown, row) => (row.facilities?.length ?? 0) + '项',
      },
      {
        title: '备注',
        dataIndex: 'notes',
        width: 150,
        ellipsis: true,
        render: (v: string | null | undefined) => v || '-',
      },
      {
        title: '操作',
        key: 'actions',
        width: 280,
        render: (_: unknown, row) => (
          <Space>
            {canRoomWrite ? (
              <>
                <Button
                  size="small"
                  onClick={() => {
                    setEditingRoom(row);
                    roomForm.setFieldsValue({
                      name: row.name,
                      layout: row.layout ?? null,
                      area: row.area ?? null,
                      notes: row.notes ?? null,
                      isActive: row.isActive,
                      isRented: row.isRented,
                    });
                    setEditRoomOpen(true);
                  }}
                >
                  编辑
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setFacilityRoom(row);
                    setFacilityOpen(true);
                  }}
                >
                  设施
                </Button>
              </>
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

      const payload = {
        name: values.name,
        layout: values.layout,
        area: values.area,
        notes: values.notes,
        isActive: values.isActive,
        isRented: values.isRented,
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

  const onSaveFacilities = async () => {
    if (!orgId || !facilityRoom) return;
    try {
      const values = await facilityForm.validateFields();
      await api.put(`/api/orgs/${orgId}/rooms/${facilityRoom.id}/facilities`, values.facilities ?? []);
      message.success('已保存');
      setFacilityOpen(false);
      await qc.invalidateQueries({ queryKey: ['room', 'facilities', orgId, facilityRoom.id] });
      await qc.invalidateQueries({ queryKey: ['apartment', orgId, apartmentId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '保存失败');
    }
  };

  const downloadTemplate = async () => {
    if (!orgId || !apartmentId) return;
    try {
      const response = await api.get(
        `/api/orgs/${orgId}/apartments/${apartmentId}/rooms/import-template`,
        { 
          responseType: 'blob',
          validateStatus: (status) => status === 200,
        },
      );
      
      // 检查响应类型
      if (!(response.data instanceof Blob)) {
        throw new Error('响应格式错误：期望Blob类型');
      }
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'room_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('模板下载成功');
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      
      // 如果是blob响应但实际是JSON错误，尝试解析
      if (e.response?.data instanceof Blob) {
        try {
          const text = await (e.response.data as Blob).text();
          const json = JSON.parse(text);
          message.error(json.error?.message || '下载失败');
        } catch {
          message.error('下载失败：服务器返回了错误响应');
        }
      } else {
        message.error(e.response?.data?.error?.message ?? '下载失败');
      }
    }
  };

  const handleImport = async (file: File, duplicateStrategy?: 'skip' | 'overwrite' | 'cancel') => {
    if (!orgId || !apartmentId) return false;
    setImportUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = `/api/orgs/${orgId}/apartments/${apartmentId}/rooms/import${
        duplicateStrategy ? `?duplicateStrategy=${duplicateStrategy}` : ''
      }`;
      const response = await api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success((response.data as { message: string }).message || '导入成功');
      await qc.invalidateQueries({ queryKey: ['apartment', orgId, apartmentId] });
      setDuplicateModalOpen(false);
      setPendingImportFile(null);
      setDuplicateRooms([]);
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      // 如果是409错误（重复房间），显示对话框
      if (e.response?.status === 409 && e.response?.data?.error?.code === 'DUPLICATE_ROOMS') {
        const duplicateRoomsList = (e.response.data.error as { duplicateRooms?: string[] }).duplicateRooms || [];
        setDuplicateRooms(duplicateRoomsList);
        setPendingImportFile(file);
        setDuplicateModalOpen(true);
        setImportUploading(false);
        return false;
      }
      // 如果是取消导入的错误，不显示错误消息
      if (e.response?.data?.error?.code === 'IMPORT_CANCELLED') {
        setDuplicateModalOpen(false);
        setPendingImportFile(null);
        setDuplicateRooms([]);
        setImportUploading(false);
        return false;
      }
      message.error(e.response?.data?.error?.message ?? '导入失败');
    } finally {
      setImportUploading(false);
    }
    return false;
  };

  const handleDuplicateStrategy = (strategy: 'skip' | 'overwrite' | 'cancel') => {
    if (!pendingImportFile) return;
    if (strategy === 'cancel') {
      setDuplicateModalOpen(false);
      setPendingImportFile(null);
      setDuplicateRooms([]);
      return;
    }
    handleImport(pendingImportFile, strategy);
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
                    <Space>
                      <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
                        下载模板
                      </Button>
                      <Upload
                        accept=".xlsx,.xls"
                        showUploadList={false}
                        beforeUpload={handleImport}
                        disabled={importUploading}
                      >
                        <Button icon={<UploadOutlined />} loading={importUploading}>
                          批量导入
                        </Button>
                      </Upload>
                      <Button
                        type="primary"
                        onClick={() => {
                          setEditingRoom(null);
                          roomForm.resetFields();
                          roomForm.setFieldsValue({ isActive: true, isRented: false });
                          setEditRoomOpen(true);
                        }}
                      >
                        新增房间
                      </Button>
                    </Space>
                  ) : null
                }
              >
                <Table<Room>
                  rowKey="id"
                  dataSource={apartment?.rooms ?? []}
                  columns={roomColumns}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 900 }}
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
                          <Form.Item
                            label="转让费(元)"
                            name="transferFeeCents"
                            getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                            normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                          >
                            <InputNumber min={0} precision={2} step={0.01} />
                          </Form.Item>
                          <Form.Item
                            label="装修费押金(元)"
                            name="renovationDepositCents"
                            getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                            normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                          >
                            <InputNumber min={0} precision={2} step={0.01} />
                          </Form.Item>
                          <Form.Item
                            label="装修费(元)"
                            name="renovationFeeCents"
                            getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                            normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                          >
                            <InputNumber min={0} precision={2} step={0.01} />
                          </Form.Item>
                          <Form.Item
                            label="其他前期成本(元)"
                            name="upfrontOtherCents"
                            getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                            normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                          >
                            <InputNumber min={0} precision={2} step={0.01} />
                          </Form.Item>
                        </Space>

                        <Space wrap>
                          <Form.Item
                            label="上游押金(元)"
                            name="upstreamDepositCents"
                            getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                            normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                          >
                            <InputNumber min={0} precision={2} step={0.01} />
                          </Form.Item>
                          <Form.Item
                            label="上游月租(元每月)"
                            name="upstreamRentBaseCents"
                            getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                            normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                          >
                            <InputNumber min={0} precision={2} step={0.01} />
                          </Form.Item>
                          <Form.Item label="租金递增类型" name="upstreamRentIncreaseType">
                            <Input />
                          </Form.Item>
                          <Form.Item
                            noStyle
                            shouldUpdate={(prev, curr) => prev.upstreamRentIncreaseType !== curr.upstreamRentIncreaseType}
                          >
                            {({ getFieldValue }) => {
                              const increaseType = getFieldValue('upstreamRentIncreaseType');
                              return (
                                <Form.Item
                                  label="递增值"
                                  name="upstreamRentIncreaseValue"
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
                                  <InputNumber min={0} precision={increaseType === 'PERCENT' ? 0 : 2} />
                                </Form.Item>
                              );
                            }}
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
                      title: '固定金额(元)',
                      dataIndex: 'fixedAmountCents',
                      render: (v: number | null | undefined) => (v == null ? '-' : `¥${(v / 100).toFixed(2)}`),
                    },
                    {
                      title: '单价(元)',
                      dataIndex: 'unitPriceCents',
                      render: (v: number | null | undefined) => (v == null ? '-' : `¥${(v / 100).toFixed(2)}`),
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
            <Input placeholder="例如：一室一厅" />
          </Form.Item>
          <Form.Item label="面积(㎡)" name="area">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="notes">
            <Input.TextArea rows={3} placeholder="房间相关备注信息" />
          </Form.Item>
          <Space>
            <Form.Item label="启用" name="isActive" valuePropName="checked">
              <Checkbox />
            </Form.Item>
            <Form.Item label="已租出" name="isRented" valuePropName="checked">
              <Checkbox />
            </Form.Item>
          </Space>
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
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {fields.map((f) => (
                  <Space key={f.key} align="baseline" wrap style={{ width: '100%' }}>
                    <Form.Item
                      {...f}
                      label="周期(月)"
                      name={[f.name, 'durationMonths']}
                      rules={[{ required: true, message: '必填' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber min={1} style={{ width: 100 }} placeholder="1" />
                    </Form.Item>
                    <Form.Item
                      {...f}
                      label="租金(元/月)"
                      name={[f.name, 'rentCents']}
                      rules={[{ required: true, message: '必填' }]}
                      style={{ marginBottom: 0 }}
                      getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                      normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                    >
                      <InputNumber min={0} precision={2} step={100} style={{ width: 150 }} placeholder="0" />
                    </Form.Item>
                    <Form.Item
                      {...f}
                      label="押金(元)"
                      name={[f.name, 'depositCents']}
                      style={{ marginBottom: 0 }}
                      getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                      normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                    >
                      <InputNumber min={0} precision={2} step={100} style={{ width: 150 }} placeholder="0" />
                    </Form.Item>
                    <Button danger size="small" onClick={() => remove(f.name)}>
                      删除
                    </Button>
                  </Space>
                ))}
                <Button onClick={() => add()} type="dashed" style={{ width: '100%' }}>
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
        <Form form={feeForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {fields.map((f) => (
                  <Space key={f.key} align="baseline" wrap style={{ width: '100%' }}>
                    <Form.Item 
                      {...f} 
                      label="类型" 
                      name={[f.name, 'feeType']} 
                      rules={[{ required: true }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="WATER/ELECTRICITY/..." style={{ width: 160 }} />
                    </Form.Item>
                    <Form.Item 
                      {...f} 
                      label="模式" 
                      name={[f.name, 'mode']} 
                      rules={[{ required: true }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="FIXED/METERED" style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item
                      {...f}
                      label="固定金额(元)"
                      name={[f.name, 'fixedAmountCents']}
                      style={{ marginBottom: 0 }}
                      getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                      normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                    >
                      <InputNumber min={0} precision={2} step={0.01} style={{ width: 150 }} placeholder="0" />
                    </Form.Item>
                    <Form.Item
                      {...f}
                      label="单价(元)"
                      name={[f.name, 'unitPriceCents']}
                      style={{ marginBottom: 0 }}
                      getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                      normalize={(value: number | null) => (value == null ? value : Math.round(value * 100))}
                    >
                      <InputNumber min={0} precision={2} step={0.01} style={{ width: 150 }} placeholder="0" />
                    </Form.Item>
                    <Form.Item 
                      {...f} 
                      label="单位" 
                      name={[f.name, 'unitName']}
                      style={{ marginBottom: 0 }}
                    >
                      <Input style={{ width: 120 }} placeholder="单位名称" />
                    </Form.Item>
                    <Button danger size="small" onClick={() => remove(f.name)}>
                      删除
                    </Button>
                  </Space>
                ))}
                <Button onClick={() => add()} type="dashed" style={{ width: '100%' }}>
                  添加定价
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        open={facilityOpen}
        title={facilityRoom ? `房间设施 - ${facilityRoom.name}` : '房间设施'}
        onCancel={() => setFacilityOpen(false)}
        onOk={onSaveFacilities}
        destroyOnClose
        width={600}
      >
        <Form
          form={facilityForm}
          layout="vertical"
          style={{ marginTop: 8 }}
        >
          <Form.List name="facilities">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {fields.map((f) => (
                  <Space key={f.key} align="baseline" wrap style={{ width: '100%' }}>
                    <Form.Item
                      {...f}
                      label="设施名称"
                      name={[f.name, 'name']}
                      rules={[{ required: true, message: '请输入名称' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="空调/洗衣机/冰箱" style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item
                      {...f}
                      label="数量"
                      name={[f.name, 'quantity']}
                      rules={[{ required: true, message: '必填' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber min={1} style={{ width: 80 }} placeholder="1" />
                    </Form.Item>
                    <Form.Item
                      {...f}
                      label="价值(元)"
                      name={[f.name, 'valueCents']}
                      style={{ marginBottom: 0 }}
                      getValueProps={(value: number | null | undefined) => ({ value: value == null ? value : value / 100 })}
                      normalize={(value: number | null) => (value == null ? 0 : Math.round(value * 100))}
                    >
                      <InputNumber min={0} precision={2} style={{ width: 120 }} placeholder="0" />
                    </Form.Item>
                    <Button danger size="small" onClick={() => remove(f.name)}>
                      删除
                    </Button>
                  </Space>
                ))}
                <Button onClick={() => add({ name: '', quantity: 1, valueCents: 0 })} type="dashed" style={{ width: '100%' }}>
                  添加设施
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        title="检测到重复房间"
        open={duplicateModalOpen}
        onCancel={() => handleDuplicateStrategy('cancel')}
        footer={[
          <Button key="cancel" onClick={() => handleDuplicateStrategy('cancel')}>
            取消上传
          </Button>,
          <Button key="skip" onClick={() => handleDuplicateStrategy('skip')} loading={importUploading}>
            跳过已存在的房间
          </Button>,
          <Button key="overwrite" type="primary" onClick={() => handleDuplicateStrategy('overwrite')} loading={importUploading}>
            覆盖已存在的房间
          </Button>,
        ]}
      >
        <Typography.Paragraph>
          以下房间名已存在，请选择处理方式：
        </Typography.Paragraph>
        <ul style={{ marginTop: 16, marginBottom: 0 }}>
          {duplicateRooms.map((roomName) => (
            <li key={roomName}>
              <Typography.Text strong>{roomName}</Typography.Text>
            </li>
          ))}
        </ul>
        <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
          <strong>跳过</strong>：保留现有房间，不进行任何修改<br />
          <strong>覆盖</strong>：用导入数据替换现有房间的信息（包括设施）<br />
          <strong>取消</strong>：取消本次导入操作
        </Typography.Paragraph>
      </Modal>
    </Space>
  );
}
