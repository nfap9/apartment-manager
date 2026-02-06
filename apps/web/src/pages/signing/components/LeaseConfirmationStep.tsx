import { Alert, Descriptions, Space, Tag, Typography } from 'antd';
import type { FormInstance } from 'antd';
import type { Tenant, AvailableRoom, LeaseFormData } from '../types';

interface LeaseConfirmationStepProps {
  tenantMode: 'select' | 'create';
  selectedTenant: Tenant | null;
  newTenantForm: FormInstance<{ name: string; phone: string; idNumber?: string }>;
  selectedRoom: AvailableRoom | null;
  leaseForm: FormInstance<LeaseFormData & { charges?: Array<{ name: string; feeType?: string | null; fixedAmountCents?: number | null }> }>;
}

export function LeaseConfirmationStep({
  tenantMode,
  selectedTenant,
  newTenantForm,
  selectedRoom,
  leaseForm,
}: LeaseConfirmationStepProps) {
  return (
    <div>
      <Typography.Title level={5}>请确认以下签约信息</Typography.Title>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="租客" span={2}>
          {tenantMode === 'select' && selectedTenant
            ? `${selectedTenant.name} (${selectedTenant.phone})`
            : '新租客 - ' +
              (newTenantForm.getFieldValue('name') ?? '') +
              ' (' +
              (newTenantForm.getFieldValue('phone') ?? '') +
              ')'}
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

      {(leaseForm.getFieldValue('waterMode') ||
        leaseForm.getFieldValue('electricityMode') ||
        (leaseForm.getFieldValue('charges')?.length ?? 0) > 0) && (
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
            {leaseForm.getFieldValue('charges')?.map(
              (c: { name: string; fixedAmountCents?: number | null }, idx: number) => (
                <Tag key={idx}>
                  {c.name}: ¥{((c.fixedAmountCents ?? 0) / 100).toFixed(2)}
                </Tag>
              ),
            )}
          </Space>
        </>
      )}

      <Alert
        type="info"
        message='确认签约后，将创建租约并将房间状态更新为"已租出"'
        style={{ marginTop: 24 }}
      />
    </div>
  );
}
