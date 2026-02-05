/**
 * 账单状态枚举
 */
export const INVOICE_STATUS = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PAID: 'PAID',
  VOID: 'VOID',
  OVERDUE: 'OVERDUE',
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

/**
 * 账单项目状态枚举
 */
export const INVOICE_ITEM_STATUS = {
  PENDING_READING: 'PENDING_READING',
  CONFIRMED: 'CONFIRMED',
} as const;

export type InvoiceItemStatus = (typeof INVOICE_ITEM_STATUS)[keyof typeof INVOICE_ITEM_STATUS];

/**
 * 账单项目类型枚举
 */
export const INVOICE_ITEM_KIND = {
  RENT: 'RENT',
  DEPOSIT: 'DEPOSIT',
  CHARGE: 'CHARGE',
} as const;

export type InvoiceItemKind = (typeof INVOICE_ITEM_KIND)[keyof typeof INVOICE_ITEM_KIND];
