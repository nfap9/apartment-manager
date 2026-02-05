import React from 'react';
import { useAuthStore } from '../stores/auth';
import { Typography } from 'antd';

/**
 * 获取当前组织 ID 的 Hook
 * @returns 组织 ID，如果不存在则返回 null
 */
export function useOrgId(): string | null {
  return useAuthStore((s) => s.activeOrgId);
}

/**
 * 获取当前组织 ID 的 Hook（带验证）
 * 如果组织 ID 不存在，返回错误提示组件
 * @returns [orgId, errorComponent]
 */
export function useOrgIdWithError(): [string | null, React.ReactNode | null] {
  const orgId = useOrgId();

  if (!orgId) {
    return [null, React.createElement(Typography.Text, { type: 'secondary' }, '请先选择组织')];
  }

  return [orgId, null];
}
