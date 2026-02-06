/**
 * 房间设施类型定义
 * 按分组组织，常见类型在前
 */

export type FacilityType = 
  | '空调'
  | '洗衣机'
  | '冰箱'
  | '电视'
  | '热水器'
  | '微波炉'
  | '电磁炉'
  | '油烟机'
  | '床'
  | '沙发'
  | '桌子'
  | '椅子'
  | '衣柜'
  | '书桌'
  | '茶几'
  | '其他';

export interface FacilityTypeGroup {
  label: string;
  types: FacilityType[];
}

/**
 * 设施类型分组
 * 常见类型放在前面
 */
export const FACILITY_TYPE_GROUPS: FacilityTypeGroup[] = [
  {
    label: '家电类',
    types: [
      '空调',
      '洗衣机',
      '冰箱',
      '电视',
      '热水器',
      '微波炉',
      '电磁炉',
      '油烟机',
    ],
  },
  {
    label: '家具类',
    types: [
      '床',
      '沙发',
      '桌子',
      '椅子',
      '衣柜',
      '书桌',
      '茶几',
    ],
  },
  {
    label: '其他',
    types: ['其他'],
  },
];

/**
 * 所有设施类型列表（扁平化）
 */
export const ALL_FACILITY_TYPES: FacilityType[] = FACILITY_TYPE_GROUPS.flatMap(
  (group) => group.types,
);

/**
 * 验证是否为有效的设施类型
 */
export function isValidFacilityType(type: string): type is FacilityType {
  return ALL_FACILITY_TYPES.includes(type as FacilityType);
}
