import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import {
  Button,
  Card,
  Drawer,
  Form,
  InputNumber,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { ApiErrorResponse } from '../lib/apiTypes';
import { useAuthStore } from '../stores/auth';
import { usePermissionStore } from '../stores/permissions';

type InvoiceItem = {
  id: string;
  name: string;
  kind: 'RENT' | 'DEPOSIT' | 'CHARGE';
  mode?: 'FIXED' | 'METERED' | null;
  status: 'PENDING_READING' | 'CONFIRMED';
  amountCents?: number | null;
  unitPriceCents?: number | null;
  unitName?: string | null;
  meterStart?: number | null;
  meterEnd?: number | null;
  quantity?: number | null;
};

type InvoiceRow = {
  id: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'OVERDUE';
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  totalAmountCents: number;
  lease: {
    room: { name: string; apartment: { name: string } };
    tenant: { name: string; phone: string };
  };
  items: InvoiceItem[];
};

type InvoicesResponse = {
  invoices: InvoiceRow[];
};

type InvoiceDetailResponse = {
  invoice: (InvoiceRow & { items: InvoiceItem[] }) | null;
};

export function InvoicesPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const permissionKeys = usePermissionStore((s) => s.permissionKeys);
  const qc = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  const canManage = permissionKeys.includes('billing.manage');

  const listQuery = useQuery({
    queryKey: ['invoices', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/invoices`);
      return r.data as InvoicesResponse;
    },
  });

  const detailQuery = useQuery({
    queryKey: ['invoice', orgId, activeInvoiceId],
    enabled: !!orgId && !!activeInvoiceId && drawerOpen,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/invoices/${activeInvoiceId}`);
      return r.data as InvoiceDetailResponse;
    },
  });

  const invoices = listQuery.data?.invoices ?? [];

  const invoiceColumns: ColumnsType<InvoiceRow> = useMemo(
    () => [
      { title: '公寓', dataIndex: ['lease', 'room', 'apartment', 'name'] },
      { title: '房间', dataIndex: ['lease', 'room', 'name'], width: 110 },
      { title: '租客', dataIndex: ['lease', 'tenant', 'name'], width: 110 },
      {
        title: '账期',
        key: 'period',
        render: (_: unknown, row) =>
          `${new Date(row.periodStart).toLocaleDateString()} ~ ${new Date(row.periodEnd).toLocaleDateString()}`,
      },
      {
        title: '金额',
        dataIndex: 'totalAmountCents',
        width: 120,
        render: (v: number) => `¥${(v / 100).toFixed(2)}`,
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 90,
        render: (v: InvoiceRow['status']) => {
          const color = v === 'ISSUED' ? 'blue' : v === 'PAID' ? 'green' : 'default';
          return <Tag color={color}>{v}</Tag>;
        },
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        render: (_: unknown, row) => (
          <Button
            size="small"
            onClick={() => {
              setActiveInvoiceId(row.id);
              setDrawerOpen(true);
            }}
          >
            详情
          </Button>
        ),
      },
    ],
    [],
  );

  const itemColumns: ColumnsType<InvoiceItem> = useMemo(
    () => [
      { title: '项目', dataIndex: 'name' },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        render: (v: InvoiceItem['status']) =>
          v === 'PENDING_READING' ? <Tag color="orange">待抄表</Tag> : <Tag color="green">已确认</Tag>,
      },
      {
        title: '金额',
        dataIndex: 'amountCents',
        width: 120,
        render: (v: number | null | undefined) => (v == null ? '-' : `¥${(v / 100).toFixed(2)}`),
      },
      {
        title: '操作',
        key: 'actions',
        width: 220,
        render: (_: unknown, item: InvoiceItem) => {
          if (!canManage) return null;
          if (item.status !== 'PENDING_READING') return null;

          return <ConfirmReadingInline orgId={orgId!} invoiceId={activeInvoiceId!} item={item} />;
        },
      },
    ],
    [activeInvoiceId, canManage, orgId],
  );

  const onRunBilling = async () => {
    if (!orgId) return;
    try {
      await api.post(`/api/orgs/${orgId}/billing/run`);
      message.success('已触发出账');
      await qc.invalidateQueries({ queryKey: ['invoices', orgId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '出账失败');
    }
  };

  if (!orgId) return <Typography.Text type="secondary">请先选择组织</Typography.Text>;

  const invoice = detailQuery.data?.invoice ?? null;

  return (
    <>
      <Card
        title={
          <Space>
            <span>账单</span>
            {canManage ? (
              <Button size="small" onClick={onRunBilling} loading={listQuery.isFetching}>
                运行出账
              </Button>
            ) : null}
          </Space>
        }
        loading={listQuery.isLoading}
      >
        <Table<InvoiceRow>
          rowKey="id"
          dataSource={invoices}
          columns={invoiceColumns}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Drawer
        title="账单详情"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={720}
        destroyOnClose
      >
        {detailQuery.isLoading ? <Typography.Text>加载中...</Typography.Text> : null}
        {invoice ? (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Typography.Text>
                  公寓/房间：{invoice.lease.room.apartment.name} / {invoice.lease.room.name}
                </Typography.Text>
                <Typography.Text>租客：{invoice.lease.tenant.name}</Typography.Text>
                <Typography.Text>
                  账期：
                  {new Date(invoice.periodStart).toLocaleDateString()} ~{' '}
                  {new Date(invoice.periodEnd).toLocaleDateString()}
                </Typography.Text>
                <Typography.Text strong>金额：¥{(invoice.totalAmountCents / 100).toFixed(2)}</Typography.Text>
              </Space>
            </Card>

            <Card size="small" title="明细">
              <Table<InvoiceItem>
                rowKey="id"
                dataSource={invoice.items}
                columns={itemColumns}
                pagination={false}
              />
            </Card>
          </Space>
        ) : (
          <Typography.Text type="secondary">未找到账单</Typography.Text>
        )}
      </Drawer>
    </>
  );
}

function ConfirmReadingInline(props: { orgId: string; invoiceId: string; item: InvoiceItem }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const [form] = Form.useForm<{ meterStart?: number; meterEnd: number }>();

  const onSubmit = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      await api.post(
        `/api/orgs/${props.orgId}/invoices/${props.invoiceId}/items/${props.item.id}/confirm-reading`,
        values,
      );

      message.success('已确认抄表');
      await qc.invalidateQueries({ queryKey: ['invoice', props.orgId, props.invoiceId] });
      await qc.invalidateQueries({ queryKey: ['invoices', props.orgId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '确认失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} layout="inline">
      <Form.Item name="meterStart" initialValue={props.item.meterStart ?? 0}>
        <InputNumber min={0} placeholder="起度" />
      </Form.Item>
      <Form.Item
        name="meterEnd"
        initialValue={props.item.meterEnd ?? undefined}
        rules={[{ required: true, message: '请输入止度' }]}
      >
        <InputNumber min={0} placeholder="止度" />
      </Form.Item>
      <Button size="small" type="primary" onClick={onSubmit} loading={loading}>
        确认
      </Button>
    </Form>
  );
}

