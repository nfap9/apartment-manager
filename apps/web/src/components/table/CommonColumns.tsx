import type { ColumnsType } from 'antd/es/table';
import { StatusTag } from '../StatusTag';

/**
 * 创建日期范围列
 */
export function createDateRangeColumn<T extends Record<string, unknown>>(
  title: string,
  startKey: string,
  endKey: string,
  options?: { width?: number },
): ColumnsType<T>[0] {
  return {
    title,
    key: `${startKey}_${endKey}_range`,
    width: options?.width,
    render: (_: unknown, record: T) => {
      const start = record[startKey] as string | undefined;
      const end = record[endKey] as string | undefined;
      if (!start || !end) return '-';
      return `${new Date(start).toLocaleDateString()} ~ ${new Date(end).toLocaleDateString()}`;
    },
  };
}

/**
 * 创建日期列
 */
export function createDateColumn<T extends Record<string, unknown>>(
  title: string,
  dataIndex: string,
  options?: { width?: number },
): ColumnsType<T>[0] {
  return {
    title,
    dataIndex,
    width: options?.width,
    render: (value: string | null | undefined) => {
      if (!value) return '-';
      return new Date(value).toLocaleDateString();
    },
  };
}

/**
 * 创建金额列（分转元）
 */
export function createMoneyColumn<T extends Record<string, unknown>>(
  title: string,
  dataIndex: string,
  options?: { width?: number; prefix?: string },
): ColumnsType<T>[0] {
  return {
    title,
    dataIndex,
    width: options?.width,
    render: (value: number | null | undefined) => {
      if (value == null) return '-';
      const formatted = (value / 100).toFixed(2);
      return options?.prefix ? `${options.prefix}${formatted}` : `¥${formatted}`;
    },
  };
}

/**
 * 创建状态列
 */
export function createStatusColumn<T extends Record<string, unknown>>(
  title: string,
  dataIndex: string,
  type: 'lease' | 'invoice' | 'invoiceItem' | 'room' | 'boolean',
  options?: { width?: number },
): ColumnsType<T>[0] {
  return {
    title,
    dataIndex,
    width: options?.width,
    render: (value: unknown) => <StatusTag status={value as never} type={type} />,
  };
}

/**
 * 创建操作列
 */
export function createActionColumn<T extends Record<string, unknown>>(
  render: (record: T) => React.ReactNode,
  options?: { width?: number },
): ColumnsType<T>[0] {
  return {
    title: '操作',
    key: 'actions',
    width: options?.width ?? 120,
    render: (_: unknown, record: T) => render(record),
  };
}
