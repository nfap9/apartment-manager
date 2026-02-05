import { usePermissionStore } from '../stores/permissions';

/**
 * 权限检查 Hook
 */
export function usePermissions() {
  const permissionKeys = usePermissionStore((s) => s.permissionKeys);

  /**
   * 检查是否有指定权限
   */
  const hasPermission = (permission: string): boolean => {
    return permissionKeys.includes(permission);
  };

  /**
   * 检查是否有任一权限
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((p) => permissionKeys.includes(p));
  };

  /**
   * 检查是否有所有权限
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((p) => permissionKeys.includes(p));
  };

  return {
    permissionKeys,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
