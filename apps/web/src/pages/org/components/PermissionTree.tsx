import { Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useMemo } from 'react';
import type { Permission } from '../types';

interface PermissionTreeProps {
  permissions: Permission[];
  selectedPermissionKeys: string[];
  onPermissionKeysChange: (keys: string[]) => void;
  isAdminRole: boolean;
  requiredPermissions: string[];
  permissionLabelByKey: Record<string, string>;
}

export function PermissionTree({
  permissions,
  selectedPermissionKeys,
  onPermissionKeysChange,
  isAdminRole,
  requiredPermissions,
  permissionLabelByKey,
}: PermissionTreeProps) {
  const getPermissionLabel = (perm: Permission) =>
    perm.description?.trim() || permissionLabelByKey[perm.key] || '未配置权限名称';

  // 构建权限树结构
  const permissionTree = useMemo<DataNode[]>(() => {
    const moduleMap = new Map<string, { label: string; children: Permission[] }>();

    permissions.forEach((perm) => {
      const parts = perm.key.split('.');
      const moduleKey = parts[0]; // 获取模块名，如 'org', 'apartment', 'room' 等

      if (!moduleMap.has(moduleKey)) {
        const moduleLabels: Record<string, string> = {
          org: '组织管理',
          apartment: '公寓管理',
          room: '房间管理',
          tenant: '租客管理',
          lease: '租约管理',
          billing: '账单管理',
          fee: '费用管理',
          notification: '通知管理',
          dashboard: '看板管理',
        };
        moduleMap.set(moduleKey, {
          label: moduleLabels[moduleKey] || moduleKey,
          children: [],
        });
      }

      moduleMap.get(moduleKey)!.children.push(perm);
    });

    return Array.from(moduleMap.entries()).map(([moduleKey, { label, children }]) => ({
      title: label,
      key: `module-${moduleKey}`,
      children: children.map((perm) => ({
        title: getPermissionLabel(perm),
        key: perm.key,
        isLeaf: true,
        // 如果是管理员角色且是必需权限，则禁用取消操作
        disabled: isAdminRole && requiredPermissions.includes(perm.key),
      })),
    }));
  }, [permissions, permissionLabelByKey, isAdminRole, requiredPermissions]);

  // 获取所有子节点的权限键
  const getChildrenKeys = (node: DataNode): string[] => {
    if (node.isLeaf) {
      return [node.key as string];
    }
    return node.children?.flatMap(getChildrenKeys) ?? [];
  };

  // 处理树节点勾选
  const onTreeCheck = (checkedKeys: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }) => {
    const checked = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
    const allCheckedKeys = new Set<string>();

    // 处理所有选中的节点
    checked.forEach((key) => {
      const keyStr = key as string;
      if (keyStr.startsWith('module-')) {
        // 如果是模块节点，添加所有子权限
        const moduleNode = permissionTree.find((n) => n.key === keyStr);
        if (moduleNode) {
          const childrenKeys = getChildrenKeys(moduleNode);
          childrenKeys.forEach((k) => allCheckedKeys.add(k));
        }
      } else {
        // 如果是权限节点，直接添加
        allCheckedKeys.add(keyStr);
      }
    });

    // 如果是管理员角色，强制保留必需权限
    if (isAdminRole) {
      requiredPermissions.forEach((perm) => allCheckedKeys.add(perm));
    }

    onPermissionKeysChange(Array.from(allCheckedKeys));
  };

  // 计算应该选中的树节点键（包括模块节点）
  const checkedTreeKeys = useMemo(() => {
    const checked = new Set<React.Key>();

    // 检查每个模块是否所有子权限都被选中
    permissionTree.forEach((moduleNode) => {
      const childrenKeys = getChildrenKeys(moduleNode);
      const allChildrenChecked = childrenKeys.every((k) => selectedPermissionKeys.includes(k));

      if (allChildrenChecked && childrenKeys.length > 0) {
        // 所有子权限都被选中，选中模块节点
        checked.add(moduleNode.key);
      } else {
        // 部分选中或未选中，只添加被选中的子节点
        childrenKeys.forEach((k) => {
          if (selectedPermissionKeys.includes(k)) {
            checked.add(k);
          }
        });
      }
    });

    return Array.from(checked);
  }, [selectedPermissionKeys, permissionTree]);

  return (
    <Tree
      checkable
      checkedKeys={checkedTreeKeys}
      treeData={permissionTree}
      onCheck={onTreeCheck}
      style={{ width: '100%' }}
    />
  );
}
