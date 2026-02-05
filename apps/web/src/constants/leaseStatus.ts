/**
 * 租约状态枚举
 */
export const LEASE_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
  TERMINATED: 'TERMINATED',
} as const;

export type LeaseStatus = (typeof LEASE_STATUS)[keyof typeof LEASE_STATUS];

/**
 * 租约状态选项
 */
export const LEASE_STATUS_OPTIONS = [
  { value: LEASE_STATUS.DRAFT, label: 'DRAFT' },
  { value: LEASE_STATUS.ACTIVE, label: 'ACTIVE' },
  { value: LEASE_STATUS.ENDED, label: 'ENDED' },
  { value: LEASE_STATUS.TERMINATED, label: 'TERMINATED' },
] as const;

/**
 * 租金递增类型枚举
 */
export const RENT_INCREASE_TYPE = {
  NONE: 'NONE',
  FIXED: 'FIXED',
  PERCENT: 'PERCENT',
} as const;

export type RentIncreaseType = (typeof RENT_INCREASE_TYPE)[keyof typeof RENT_INCREASE_TYPE];

/**
 * 租金递增类型选项
 */
export const RENT_INCREASE_TYPE_OPTIONS = [
  { value: RENT_INCREASE_TYPE.NONE, label: '不递增' },
  { value: RENT_INCREASE_TYPE.FIXED, label: '固定递增(元)' },
  { value: RENT_INCREASE_TYPE.PERCENT, label: '百分比递增(%)' },
] as const;
