import {
  CheckCircleOutlined,
  HomeOutlined,
  SolutionOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { AxiosError } from 'axios';
import { Button, Form, Result, Space, Steps, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { api } from '../../lib/api';
import type { ApiErrorResponse } from '../../lib/apiTypes';
import { useAuthStore } from '../../stores/auth';
import {
  TenantSelectionStep,
  RoomSelectionStep,
  LeaseConfigurationStep,
  LeaseConfirmationStep,
} from './components';
import type {
  Tenant,
  AvailableRoom,
  PricingPlan,
  ChargeItem,
  LeaseFormData,
} from './types';

export function SigningPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [tenantMode, setTenantMode] = useState<'select' | 'create'>('select');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [newTenantForm] = Form.useForm<{ name: string; phone: string; idNumber?: string }>();
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);
  const [leaseForm] = Form.useForm<
    LeaseFormData & {
      charges?: Array<{ name: string; feeType?: string | null; fixedAmountCents?: number | null }>;
    }
  >();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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

  // 处理房间选择
  const handleRoomSelect = (room: AvailableRoom) => {
    setSelectedRoom(room);
    if (room.pricingPlans.length > 0) {
      applyPricingPlan(room, room.pricingPlans[0]);
    } else {
      loadFeeTemplate(room.apartment.id);
    }
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


  if (!orgId) {
    return (
      <div className="page-wrapper">
        <Typography.Text type="secondary">请先选择组织</Typography.Text>
      </div>
    );
  }

  if (success) {
    return (
      <div className="page-wrapper">
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
      </div>
    );
  }

  const steps = [
    {
      title: '选择租客',
      icon: <UserOutlined />,
      content: (
        <TenantSelectionStep
          tenantMode={tenantMode}
          onTenantModeChange={setTenantMode}
          selectedTenant={selectedTenant}
          onTenantSelect={setSelectedTenant}
          newTenantForm={newTenantForm}
        />
      ),
    },
    {
      title: '选择房间',
      icon: <HomeOutlined />,
      content: (
        <RoomSelectionStep
          selectedRoom={selectedRoom}
          onRoomSelect={handleRoomSelect}
          onApplyPricingPlan={applyPricingPlan}
          onLoadFeeTemplate={loadFeeTemplate}
        />
      ),
    },
    {
      title: '配置租约',
      icon: <SolutionOutlined />,
      content: <LeaseConfigurationStep form={leaseForm} />,
    },
    {
      title: '确认签约',
      icon: <CheckCircleOutlined />,
      content: (
        <LeaseConfirmationStep
          tenantMode={tenantMode}
          selectedTenant={selectedTenant}
          newTenantForm={newTenantForm}
          selectedRoom={selectedRoom}
          leaseForm={leaseForm}
        />
      ),
    },
  ];

  return (
    <>
      <div className="page-wrapper">
        <Steps current={currentStep} items={steps.map((s) => ({ title: s.title, icon: s.icon }))} />

        <div style={{ marginTop: 24 }}>
          {steps[currentStep].content}
        </div>

        <div style={{ paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
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
        </div>
      </div>
    </>
  );
}
