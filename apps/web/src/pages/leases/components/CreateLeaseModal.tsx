import { DatePicker, Divider, Form, Input, InputNumber, Modal, Select, Space } from 'antd';
import type { AxiosError } from 'axios';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Form as AntdForm } from 'antd';
import { api } from '../../../lib/api';
import type { ApiErrorResponse } from '../../../lib/apiTypes';
import { BillingCycleSelect } from '../../../components/forms/BillingCycleSelect';
import { RentIncreaseFields } from '../../../components/forms/RentIncreaseFields';
import { WaterFeeFields } from '../../../components/forms/WaterFeeFields';
import { ElectricityFeeFields } from '../../../components/forms/ElectricityFeeFields';
import { moneyInputFormItemProps } from '../../../components/forms/MoneyInput';
import { OtherChargesFields } from '../../signing/components/OtherChargesFields';
import type { Apartment, Room, Tenant } from '../types';

interface CreateLeaseModalProps {
  orgId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateLeaseModal({ orgId, open, onClose, onSuccess }: CreateLeaseModalProps) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);
  const [tenantQ, setTenantQ] = useState('');

  const apartmentsQuery = useQuery({
    queryKey: ['apartments', orgId],
    enabled: !!orgId && open,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/apartments`);
      return r.data as { apartments: Apartment[] };
    },
  });

  const tenantsQuery = useQuery({
    queryKey: ['tenants', orgId, tenantQ],
    enabled: !!orgId && open,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/tenants${tenantQ ? `?q=${encodeURIComponent(tenantQ)}` : ''}`);
      return r.data as { tenants: Tenant[] };
    },
  });

  const roomsQuery = useQuery({
    queryKey: ['roomsByApartment', orgId, selectedApartmentId],
    enabled: !!orgId && !!selectedApartmentId && open,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/apartments/${selectedApartmentId}/rooms`);
      return r.data as { rooms: Array<Room & { pricingPlans: unknown[] }> };
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
    waterMode?: 'FIXED' | 'METERED';
    waterFixedAmountCents?: number;
    waterUnitPriceCents?: number;
    waterUnitName?: string;
    electricityMode?: 'FIXED' | 'METERED';
    electricityFixedAmountCents?: number;
    electricityUnitPriceCents?: number;
    electricityUnitName?: string;
    charges?: Array<{
      name: string;
      feeType?: string;
      fixedAmountCents?: number;
    }>;
    notes?: string;
  }>();

  const apartments = apartmentsQuery.data?.apartments ?? [];
  const tenants = tenantsQuery.data?.tenants ?? [];
  const rooms = roomsQuery.data?.rooms ?? [];

  const handleClose = () => {
    form.resetFields();
    setSelectedApartmentId(null);
    setTenantQ('');
    onClose();
  };

  const onCreate = async () => {
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
          })),
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
      await qc.invalidateQueries({ queryKey: ['leases', orgId] });
      handleClose();
      onSuccess();
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="新建租约"
      onCancel={handleClose}
      onOk={onCreate}
      confirmLoading={saving}
      width={900}
      destroyOnHidden
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
            <BillingCycleSelect style={{ width: 180 }} placeholder="选择租赁方式" />
          </Form.Item>
          <Form.Item
            label="押金(元)"
            name="depositCents"
            {...moneyInputFormItemProps}
            style={{ marginBottom: 0 }}
          >
            <InputNumber min={0} precision={2} step={100} style={{ width: 150 }} placeholder="0" />
          </Form.Item>
          <AntdForm.Item noStyle shouldUpdate={(prev, curr) => prev.billingCycleMonths !== curr.billingCycleMonths}>
            {({ getFieldValue }) => {
              const billingCycle = getFieldValue('billingCycleMonths') ?? 1;
              const label =
                billingCycle === 1 ? '房租(元/月)' : billingCycle === 12 ? '房租(元/年)' : `房租(元/${billingCycle}个月)`;
              return (
                <Form.Item
                  label={label}
                  name="baseRentCents"
                  rules={[{ required: true, message: '请输入房租' }]}
                  {...moneyInputFormItemProps}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber min={0} precision={2} step={100} style={{ width: 150 }} placeholder="0" />
                </Form.Item>
              );
            }}
          </AntdForm.Item>
        </Space>

        <Divider style={{ margin: '16px 0' }}>租金递增设置</Divider>
        <RentIncreaseFields />

        <Divider style={{ margin: '16px 0' }}>水费设置</Divider>
        <WaterFeeFields />

        <Divider style={{ margin: '16px 0' }}>电费设置</Divider>
        <ElectricityFeeFields />

        <Divider style={{ margin: '16px 0' }}>其他费用</Divider>
        <OtherChargesFields />

        <Form.Item label="备注" name="notes" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={3} placeholder="选填备注信息" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
