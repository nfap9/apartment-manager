import { Button, Descriptions, Drawer, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { ApiErrorResponse } from '../../../lib/apiTypes';
import type { InvoiceItem, InvoiceRow } from '../types';

interface InvoiceDetailDrawerProps {
  orgId: string;
  invoiceId: string | null;
  open: boolean;
  onClose: () => void;
  invoice: InvoiceRow | null;
  isLoading: boolean;
  canManage: boolean;
  onReadingItemSelect: (item: InvoiceItem) => void;
  getItemColumns: (onReadingItemSelect?: (item: InvoiceItem) => void) => ColumnsType<InvoiceItem>;
}

export function InvoiceDetailDrawer({
  orgId,
  invoiceId,
  open,
  onClose,
  invoice,
  isLoading,
  canManage,
  onReadingItemSelect,
  getItemColumns,
}: InvoiceDetailDrawerProps) {
  const qc = useQueryClient();

  const handleConfirmInvoice = async () => {
    if (!invoiceId) return;
    try {
      await api.post(`/api/orgs/${orgId}/invoices/${invoiceId}/confirm`);
      message.success('账单已确认');
      await qc.invalidateQueries({ queryKey: ['invoice', orgId, invoiceId] });
      await qc.invalidateQueries({ queryKey: ['invoices', orgId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '确认失败');
    }
  };

  const handleExport = async () => {
    if (!invoiceId) return;
    try {
      const r = await api.get(`/api/orgs/${orgId}/invoices/${invoiceId}/export`, {
        responseType: 'blob',
      });
      const blob = new Blob([r.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '导出失败');
    }
  };

  const handleMarkPaid = async () => {
    if (!invoiceId) return;
    try {
      await api.post(`/api/orgs/${orgId}/invoices/${invoiceId}/mark-paid`);
      message.success('已标记为已支付');
      await qc.invalidateQueries({ queryKey: ['invoice', orgId, invoiceId] });
      await qc.invalidateQueries({ queryKey: ['invoices', orgId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '标记失败');
    }
  };

  return (
    <Drawer title="账单详情" open={open} onClose={onClose} size="large" destroyOnHidden>
      {isLoading ? <Typography.Text>加载中...</Typography.Text> : null}
      {invoice ? (
        <Space orientation="vertical" style={{ width: '100%' }} size={16}>
          <div style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 4 }}>
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
          </div>

          <div>
            <Typography.Title level={5} style={{ marginBottom: 12 }}>
              明细
            </Typography.Title>
            <Table<InvoiceItem>
              rowKey="id"
              dataSource={invoice.items}
              columns={getItemColumns(onReadingItemSelect)}
              pagination={false}
            />
          </div>

          {canManage && (
            <div>
              <Typography.Title level={5} style={{ marginBottom: 12 }}>
                操作
              </Typography.Title>
              <Space>
                {invoice.items.some((item) => item.mode === 'METERED' && item.status === 'PENDING_READING') ? (
                  <Button type="primary" onClick={handleConfirmInvoice}>
                    确认账单
                  </Button>
                ) : null}
                <Button onClick={handleExport}>导出Excel</Button>
                {invoice.status !== 'PAID' && invoice.status !== 'VOID' ? (
                  <Button type="primary" danger onClick={handleMarkPaid}>
                    标记已支付
                  </Button>
                ) : null}
              </Space>
            </div>
          )}
        </Space>
      ) : (
        <Typography.Text type="secondary">未找到账单</Typography.Text>
      )}
    </Drawer>
  );
}
