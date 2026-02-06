/**
 * 费用类型枚举
 */
export const FEE_TYPES = {
  WATER: 'WATER',
  ELECTRICITY: 'ELECTRICITY',
  MANAGEMENT: 'MANAGEMENT',
  INTERNET: 'INTERNET',
  GAS: 'GAS',
  OTHER: 'OTHER',
} as const;

export type FeeType = (typeof FEE_TYPES)[keyof typeof FEE_TYPES];

/**
 * 费用类型名称映射
 */
export const FEE_TYPE_NAMES: Record<FeeType, string> = {
  [FEE_TYPES.WATER]: '水费',
  [FEE_TYPES.ELECTRICITY]: '电费',
  [FEE_TYPES.MANAGEMENT]: '物业费',
  [FEE_TYPES.INTERNET]: '网费',
  [FEE_TYPES.GAS]: '燃气费',
  [FEE_TYPES.OTHER]: '其他费用',
};

/**
 * 费用类型选项（用于下拉选择）
 */
export const FEE_TYPE_OPTIONS = [
  { value: FEE_TYPES.WATER, label: '水费' },
  { value: FEE_TYPES.ELECTRICITY, label: '电费' },
  { value: FEE_TYPES.MANAGEMENT, label: '物业费' },
  { value: FEE_TYPES.INTERNET, label: '网费' },
  { value: FEE_TYPES.GAS, label: '燃气费' },
  { value: FEE_TYPES.OTHER, label: '其他费用' },
] as const;

/**
 * 结算时机枚举
 */
export const BILLING_TIMING = {
  PREPAID: 'PREPAID',
  POSTPAID: 'POSTPAID',
} as const;

export type BillingTiming = (typeof BILLING_TIMING)[keyof typeof BILLING_TIMING];

/**
 * 结算时机选项
 */
export const BILLING_TIMING_OPTIONS = [
  { value: BILLING_TIMING.PREPAID, label: '周期前' },
  { value: BILLING_TIMING.POSTPAID, label: '周期后' },
] as const;

/**
 * 计费模式枚举
 */
export const BILLING_MODE = {
  FIXED: 'FIXED',
  METERED: 'METERED',
} as const;

export type BillingMode = (typeof BILLING_MODE)[keyof typeof BILLING_MODE];

/**
 * 计费模式选项
 */
export const BILLING_MODE_OPTIONS = [
  { value: BILLING_MODE.FIXED, label: '固定计费' },
  { value: BILLING_MODE.METERED, label: '按用量计费' },
] as const;
