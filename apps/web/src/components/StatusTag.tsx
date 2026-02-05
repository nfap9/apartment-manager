import { Tag, type TagProps } from 'antd';

export type LeaseStatus = 'DRAFT' | 'ACTIVE' | 'ENDED' | 'TERMINATED';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'OVERDUE';
export type InvoiceItemStatus = 'PENDING_READING' | 'CONFIRMED';
export type RoomStatus = 'active' | 'inactive' | 'rented' | 'vacant';

export interface StatusTagProps extends Omit<TagProps, 'color' | 'children'> {
  status: LeaseStatus | InvoiceStatus | InvoiceItemStatus | RoomStatus | boolean;
  type?: 'lease' | 'invoice' | 'invoiceItem' | 'room' | 'boolean';
}

/**
 * 统一的状态标签组件
 */
export function StatusTag({ status, type, ...props }: StatusTagProps) {
  const { color, text } = getStatusConfig(status, type);

  return (
    <Tag color={color} {...props}>
      {text}
    </Tag>
  );
}

function getStatusConfig(
  status: LeaseStatus | InvoiceStatus | InvoiceItemStatus | RoomStatus | boolean,
  type?: StatusTagProps['type'],
): { color: string; text: string } {
  // 布尔值状态（用于房间的启用/停用、已租/空闲）
  if (typeof status === 'boolean') {
    return status
      ? { color: 'green', text: '启用' }
      : { color: 'default', text: '停用' };
  }

  // 根据类型判断
  if (type === 'lease') {
    return getLeaseStatusConfig(status as LeaseStatus);
  }

  if (type === 'invoice') {
    return getInvoiceStatusConfig(status as InvoiceStatus);
  }

  if (type === 'invoiceItem') {
    return getInvoiceItemStatusConfig(status as InvoiceItemStatus);
  }

  if (type === 'room') {
    return getRoomStatusConfig(status as RoomStatus);
  }

  // 自动推断类型
  if (['DRAFT', 'ACTIVE', 'ENDED', 'TERMINATED'].includes(status)) {
    return getLeaseStatusConfig(status as LeaseStatus);
  }

  if (['DRAFT', 'ISSUED', 'PAID', 'VOID', 'OVERDUE'].includes(status)) {
    return getInvoiceStatusConfig(status as InvoiceStatus);
  }

  if (['PENDING_READING', 'CONFIRMED'].includes(status)) {
    return getInvoiceItemStatusConfig(status as InvoiceItemStatus);
  }

  return { color: 'default', text: String(status) };
}

function getLeaseStatusConfig(status: LeaseStatus): { color: string; text: string } {
  const configs: Record<LeaseStatus, { color: string; text: string }> = {
    DRAFT: { color: 'blue', text: 'DRAFT' },
    ACTIVE: { color: 'green', text: 'ACTIVE' },
    ENDED: { color: 'default', text: 'ENDED' },
    TERMINATED: { color: 'red', text: 'TERMINATED' },
  };
  return configs[status];
}

function getInvoiceStatusConfig(status: InvoiceStatus): { color: string; text: string } {
  const configs: Record<InvoiceStatus, { color: string; text: string }> = {
    DRAFT: { color: 'default', text: '草稿' },
    ISSUED: { color: 'blue', text: '已发出' },
    PAID: { color: 'green', text: '已支付' },
    VOID: { color: 'default', text: '已作废' },
    OVERDUE: { color: 'red', text: '已逾期' },
  };
  return configs[status];
}

function getInvoiceItemStatusConfig(status: InvoiceItemStatus): { color: string; text: string } {
  const configs: Record<InvoiceItemStatus, { color: string; text: string }> = {
    PENDING_READING: { color: 'orange', text: '待记录读数' },
    CONFIRMED: { color: 'green', text: '已确认' },
  };
  return configs[status];
}

function getRoomStatusConfig(status: RoomStatus): { color: string; text: string } {
  const configs: Record<RoomStatus, { color: string; text: string }> = {
    active: { color: 'green', text: '启用' },
    inactive: { color: 'default', text: '停用' },
    rented: { color: 'orange', text: '已租' },
    vacant: { color: 'blue', text: '空闲' },
  };
  return configs[status];
}
