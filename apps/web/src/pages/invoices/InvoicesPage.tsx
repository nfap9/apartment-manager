import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import { Button, Space, Spin, Table, Tabs, Tag, Typography, message } from 'antd';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';
import type { ApiErrorResponse } from '../../lib/apiTypes';
import { StatusTag } from '../../components/StatusTag';
import { useAuthStore } from '../../stores/auth';
import { usePermissionStore } from '../../stores/permissions';
import { PlayCircleOutlined } from '@ant-design/icons';
import { InvoiceDetailDrawer, MeterReadingModal } from './components';
import type { InvoiceItem, InvoiceRow } from './types';

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
      return r.data as { invoices: InvoiceRow[] };
    },
  });

  const detailQuery = useQuery({
    queryKey: ['invoice', orgId, activeInvoiceId],
    enabled: !!orgId && !!activeInvoiceId && drawerOpen,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/invoices/${activeInvoiceId}`);
      return r.data as { invoice: (InvoiceRow & { items: InvoiceItem[] }) | null };
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
        width: 140,
        render: (v: InvoiceRow['status'], record: InvoiceRow) => (
          <Space size={4} wrap>
            <StatusTag status={v} type="invoice" />
            {record.hasPendingReading && (
              <Tag color="orange">
                待确认读数
              </Tag>
            )}
            {v === 'OVERDUE' && (
              <Tag color="red">
                逾期
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

  const getItemColumns = (onReadingItemSelect?: (item: InvoiceItem) => void): ColumnsType<InvoiceItem> => [
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
              if (onReadingItemSelect) {
                onReadingItemSelect(item);
              }
            }}
          >
            录入读数
          </Button>
        );
      },
    },
  ];

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

  if (!orgId) {
    return (
      <Typography.Text type="secondary">请先选择组织</Typography.Text>
    );
  }

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

  // 计算逾期账单数量
  const overdueCount = invoices.filter((inv) => inv.status === 'OVERDUE').length;

  return (
    <>
      <div className="page-wrapper">
        {canManage && (
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={onRunBilling}
              loading={listQuery.isFetching}
            >
              运行出账
            </Button>
          </div>
        )}
        <Tabs
          activeKey={statusFilter ?? ''}
          onChange={(key) => setStatusFilter(key === '' ? undefined : key)}
          items={statusTabs.map((tab) => {
            let count = 0;
            if (tab.key === '') {
              count = invoices.length;
            } else if (tab.key === 'PENDING_READING') {
              count = invoices.filter((inv) => inv.hasPendingReading).length;
            } else if (tab.key === 'OVERDUE') {
              count = overdueCount;
            } else {
              count = invoices.filter((inv) => inv.status === tab.key).length;
            }

            return {
              key: tab.key,
              label: (
                <span>
                  {tab.label}
                  {count > 0 && (
                    <Tag
                      color={tab.key === 'OVERDUE' ? 'red' : tab.key === 'PENDING_READING' ? 'orange' : 'default'}
                      style={{ marginLeft: 8 }}
                    >
                      {count}
                    </Tag>
                  )}
                </span>
              ),
              children: (
                <div>
                  <Spin spinning={listQuery.isLoading}>
                    <Table<InvoiceRow>
                      rowKey="id"
                      dataSource={filteredInvoices}
                      columns={invoiceColumns}
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条`,
                      }}
                      scroll={{ x: 'max-content' }}
                      rowClassName={(record) => {
                        if (record.status === 'OVERDUE') {
                          return 'invoice-row-overdue';
                        }
                        return '';
                      }}
                    />
                  </Spin>
                </div>
              ),
            };
          })}
        />
      </div>

      {orgId && (
        <>
          <InvoiceDetailDrawer
            orgId={orgId}
            invoiceId={activeInvoiceId}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            invoice={invoice}
            isLoading={detailQuery.isLoading}
            canManage={canManage}
            onReadingItemSelect={(item) => {
              setReadingItem(item);
              setReadingModalOpen(true);
            }}
            getItemColumns={getItemColumns}
          />

          {readingItem && activeInvoiceId && (
            <MeterReadingModal
              orgId={orgId}
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
      )}
    </>
  );
}
