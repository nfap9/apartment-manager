import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  InputNumber,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { ApiErrorResponse } from '../lib/apiTypes';
import { StatusTag } from '../components/StatusTag';
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
  hasPendingReading?: boolean; // 是否有待确认的读数
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
  const [readingModalOpen, setReadingModalOpen] = useState(false);
  const [readingItem, setReadingItem] = useState<InvoiceItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const canManage = permissionKeys.includes('billing.manage');

  const listQuery = useQuery({
    queryKey: ['invoices', orgId, statusFilter],
    enabled: !!orgId,
    queryFn: async () => {
      // PENDING_READING 是前端计算的，不需要传递给后端
      const params = statusFilter && statusFilter !== 'PENDING_READING' ? `?status=${statusFilter}` : '';
      const r = await api.get(`/api/orgs/${orgId}/invoices${params}`);
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
        width: 120,
        render: (v: InvoiceRow['status'], record: InvoiceRow) => (
          <Space size={4}>
            <StatusTag status={v} type="invoice" />
            {record.hasPendingReading && (
              <Tag color="orange" size="small">
                待确认读数
              </Tag>
            )}
          </Space>
        ),
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
      { title: '项目', dataIndex: 'name', width: 120 },
      {
        title: '计费模式',
        dataIndex: 'mode',
        width: 100,
        render: (v: InvoiceItem['mode']) => {
          if (!v) return '-';
          return v === 'FIXED' ? <Tag>固定计费</Tag> : <Tag color="blue">按用量计费</Tag>;
        },
      },
      {
        title: '读数',
        key: 'reading',
        width: 150,
        render: (_: unknown, item: InvoiceItem) => {
          if (item.mode === 'METERED') {
            if (item.status === 'PENDING_READING') {
              return <Typography.Text type="warning">待记录读数</Typography.Text>;
            }
            if (item.meterStart != null && item.meterEnd != null) {
              return (
                <Typography.Text>
                  {item.meterStart.toFixed(2)} → {item.meterEnd.toFixed(2)} {item.unitName ?? ''}
                </Typography.Text>
              );
            }
          }
          return '-';
        },
      },
      {
        title: '用量',
        dataIndex: 'quantity',
        width: 100,
        render: (v: number | null | undefined, item: InvoiceItem) => {
          if (item.mode === 'METERED' && v != null) {
            return `${v.toFixed(2)} ${item.unitName ?? ''}`;
          }
          return '-';
        },
      },
      {
        title: '单价',
        key: 'unitPrice',
        width: 100,
        render: (_: unknown, item: InvoiceItem) => {
          if (item.mode === 'METERED' && item.unitPriceCents != null) {
            return `¥${(item.unitPriceCents / 100).toFixed(2)}/${item.unitName ?? '单位'}`;
          }
          return '-';
        },
      },
      {
        title: '金额',
        dataIndex: 'amountCents',
        width: 120,
        render: (v: number | null | undefined) => (v == null ? '-' : `¥${(v / 100).toFixed(2)}`),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (v: InvoiceItem['status']) =>
          v === 'PENDING_READING' ? <Tag color="orange">待记录读数</Tag> : <Tag color="green">已确认</Tag>,
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        render: (_: unknown, item: InvoiceItem) => {
          if (!canManage) return null;
          if (item.status !== 'PENDING_READING') return null;

          return (
            <Button
              size="small"
              type="primary"
              onClick={() => {
                setReadingItem(item);
                setReadingModalOpen(true);
              }}
            >
              录入读数
            </Button>
          );
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

  const statusTabs = [
    { key: '', label: '全部' },
    { key: 'PENDING_READING', label: '待确认读数' },
    { key: 'ISSUED', label: '已发出' },
    { key: 'PAID', label: '已支付' },
    { key: 'OVERDUE', label: '已逾期' },
    { key: 'DRAFT', label: '草稿' },
    { key: 'VOID', label: '已作废' },
  ];

  // 根据状态筛选过滤账单
  const filteredInvoices = useMemo(() => {
    if (!statusFilter) return invoices;
    if (statusFilter === 'PENDING_READING') {
      return invoices.filter((inv) => inv.hasPendingReading);
    }
    return invoices.filter((inv) => inv.status === statusFilter);
  }, [invoices, statusFilter]);

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
        <Tabs
          activeKey={statusFilter ?? ''}
          onChange={(key) => setStatusFilter(key === '' ? undefined : key)}
          items={statusTabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            children: (
              <Table<InvoiceRow>
                rowKey="id"
                dataSource={filteredInvoices}
                columns={invoiceColumns}
                pagination={{ pageSize: 10 }}
              />
            ),
          }))}
        />
      </Card>

      <Drawer
        title="账单详情"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size="large"
        destroyOnClose
      >
        {detailQuery.isLoading ? <Typography.Text>加载中...</Typography.Text> : null}
        {invoice ? (
          <Space orientation="vertical" style={{ width: '100%' }} size={16}>
            <Card size="small">
              <Space orientation="vertical" style={{ width: '100%' }}>
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

      {readingItem && activeInvoiceId && (
        <MeterReadingModal
          orgId={orgId!}
          invoiceId={activeInvoiceId}
          item={readingItem}
          invoice={invoice}
          open={readingModalOpen}
          onClose={() => {
            setReadingModalOpen(false);
            setReadingItem(null);
          }}
        />
      )}
    </>
  );
}

function MeterReadingModal(props: {
  orgId: string;
  invoiceId: string;
  item: InvoiceItem;
  invoice: InvoiceRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<{ meterStart?: number; meterEnd: number }>();

  const unitName = props.item.unitName ?? '度';
  const isWater = props.item.name.includes('水');
  const isElectricity = props.item.name.includes('电');
  const unitPrice = props.item.unitPriceCents ? props.item.unitPriceCents / 100 : 0;

  const onSubmit = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      await api.post(
        `/api/orgs/${props.orgId}/invoices/${props.invoiceId}/items/${props.item.id}/confirm-reading`,
        values,
      );

      message.success('已确认读数');
      await qc.invalidateQueries({ queryKey: ['invoice', props.orgId, props.invoiceId] });
      await qc.invalidateQueries({ queryKey: ['invoices', props.orgId] });
      props.onClose();
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '确认失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取上一个账期的读数作为参考
  const previousReading = props.item.meterStart ?? 0;

  return (
    <Modal
      open={props.open}
      title={`录入${props.item.name}读数`}
      onCancel={props.onClose}
      onOk={onSubmit}
      confirmLoading={loading}
      destroyOnHidden
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          meterStart: props.item.meterStart ?? undefined,
          meterEnd: undefined,
        }}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size={16}>
          {props.invoice && (
            <Card size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="账期">
                  {new Date(props.invoice.periodStart).toLocaleDateString()} ~{' '}
                  {new Date(props.invoice.periodEnd).toLocaleDateString()}
                </Descriptions.Item>
                <Descriptions.Item label="单价">
                  ¥{unitPrice.toFixed(2)}/{unitName}
                </Descriptions.Item>
                {previousReading > 0 && (
                  <Descriptions.Item label="上期止度">
                    <Typography.Text strong>{previousReading.toFixed(2)} {unitName}</Typography.Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          <Form.Item
            name="meterStart"
            label={isWater ? '水表起度' : isElectricity ? '电表起度' : '起度'}
            rules={[{ required: true, message: `请输入起度(${unitName})` }]}
            tooltip={previousReading > 0 ? `上期止度：${previousReading.toFixed(2)} ${unitName}` : undefined}
          >
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                min={0}
                precision={2}
                placeholder={`起度(${unitName})`}
                style={{ width: '100%' }}
              />
              <Button disabled style={{ pointerEvents: 'none' }}>
                {unitName}
              </Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item
            name="meterEnd"
            label={isWater ? '水表止度' : isElectricity ? '电表止度' : '止度'}
            rules={[
              { required: true, message: `请输入止度(${unitName})` },
              ({ getFieldValue }) => ({
                validator: (_, value) => {
                  const start = getFieldValue('meterStart');
                  if (value != null && start != null && value < start) {
                    return Promise.reject(new Error('止度不能小于起度'));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                min={0}
                precision={2}
                placeholder={`止度(${unitName})`}
                style={{ width: '100%' }}
              />
              <Button disabled style={{ pointerEvents: 'none' }}>
                {unitName}
              </Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item shouldUpdate noStyle>
            {({ getFieldsValue }) => {
              const { meterStart, meterEnd } = getFieldsValue(['meterStart', 'meterEnd']);
              const quantity =
                meterStart != null && meterEnd != null && meterEnd >= meterStart ? meterEnd - meterStart : null;
              const amount = quantity != null ? Math.round(quantity * unitPrice * 100) : null;

              if (quantity == null || amount == null) return null;

              return (
                <Card size="small" style={{ background: '#f5f5f5' }}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="用量">
                      <Typography.Text strong>{quantity.toFixed(2)} {unitName}</Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="金额">
                      <Typography.Text strong type="success">
                        ¥{(amount / 100).toFixed(2)}
                      </Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="计算方式">
                      {quantity.toFixed(2)} {unitName} × ¥{unitPrice.toFixed(2)}/{unitName} = ¥
                      {(amount / 100).toFixed(2)}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              );
            }}
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
}

