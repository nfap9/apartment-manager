/**
 * 格式化工具函数
 */

/**
 * 格式化金额（分转元）
 * @param cents - 金额（分）
 * @param prefix - 前缀，默认为 '¥'
 * @returns 格式化后的金额字符串
 */
export function formatMoney(cents: number | null | undefined, prefix: string = '¥'): string {
  if (cents == null) return '-';
  return `${prefix}${(cents / 100).toFixed(2)}`;
}

/**
 * 格式化日期
 * @param date - 日期字符串或 Date 对象
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

/**
 * 格式化日期范围
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 格式化后的日期范围字符串
 */
export function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
): string {
  if (!startDate || !endDate) return '-';
  return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
}

/**
 * 格式化百分比
 * @param value - 百分比值（0-100）
 * @param decimals - 小数位数，默认为 2
 * @returns 格式化后的百分比字符串
 */
export function formatPercent(value: number | null | undefined, decimals: number = 2): string {
  if (value == null) return '-';
  return `${value.toFixed(decimals)}%`;
}
