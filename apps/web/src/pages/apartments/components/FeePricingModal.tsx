import { Modal, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FeePricing, FeeItem, FeeItemSpec } from '../../../lib/api/types';
import { useApiMutation } from '../../../hooks/useApiMutation';
import { apartmentsApi, feesApi } from '../../../lib/api/index';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useOrgId } from '../../../hooks/useOrgId';
import { FEE_TYPE_NAMES } from '../../../constants/feeTypes';
import { formatMoney } from '../../../utils/format';

interface FeePricingModalProps {
  open: boolean;
  apartmentId: string;
  feePricings: FeePricing[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function FeePricingModal({
  open,
  apartmentId,
  feePricings,
  onClose,
  onSuccess,
}: FeePricingModalProps) {
  const orgId = useOrgId();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  // 存储每个费用项目选中的规格ID：{ feeItemId: [specId1, specId2, ...] }
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string[]>>({});
  // 跟踪用户主动勾选的项目（用于区分是因为规格选中而自动勾选，还是用户主动勾选）
  const [userSelectedItems, setUserSelectedItems] = useState<Set<string>>(new Set());
  // 使用 ref 跟踪上一次的 selectedRowKeys，用于判断哪些项目是新增的
  const prevSelectedRowKeysRef = useRef<string[]>([]);
  // 使用 ref 跟踪上一次的 selectedSpecs，用于判断是否需要更新
  const prevSelectedSpecsRef = useRef<Record<string, string[]>>({});
  // 使用标志防止循环更新
  const isUpdatingFromSpecsRef = useRef(false);
  const isUpdatingFromKeysRef = useRef(false);

  // 加载费用项目列表
  const { data: feeItemsData, isLoading: feeItemsLoading } = useQuery({
    queryKey: ['feeItems', orgId],
    enabled: !!orgId && open,
    queryFn: async () => {
      if (!orgId) throw new Error('No orgId');
      return feesApi.getFeeItems(orgId);
    },
  });

  // 使用 useMemo 避免每次渲染创建新数组
  const feeItems = useMemo(() => {
    if (!feeItemsData?.feeItems) return [];
    return feeItemsData.feeItems.filter((item) => item.isActive);
  }, [feeItemsData]);

  const existingFeeTypes = useMemo(() => feePricings.map((fp) => fp.feeType), [feePricings]);

  const updateMutation = useApiMutation({
    mutationFn: (items: Array<Partial<FeePricing>>) =>
      apartmentsApi.updateFeePricings(orgId!, apartmentId, items),
    invalidateQueries: [queryKeys.apartments.feePricings(orgId!, apartmentId)],
    successMessage: '已添加',
    errorMessage: '添加失败',
    onSuccess: () => {
      onClose();
      onSuccess?.();
    },
  });

  const handleOk = async () => {
    // 检查是否有选中的费用项目或规格
    // 如果用户只选择了规格但没有勾选费用项目，需要从 selectedSpecs 中推断出费用项目
    const feeItemIdsFromSpecs = Object.keys(selectedSpecs).filter((feeItemId) => {
      const specIds = selectedSpecs[feeItemId];
      return specIds && specIds.length > 0;
    });
    
    // 合并选中的费用项目ID（从 rowSelection 和 selectedSpecs 中获取）
    const allSelectedFeeItemIds = Array.from(new Set([...selectedRowKeys, ...feeItemIdsFromSpecs]));
    
    if (allSelectedFeeItemIds.length === 0) {
      onClose();
      return;
    }

    // 获取选中的费用项目
    const selectedFeeItems = feeItems.filter((item) => allSelectedFeeItemIds.includes(item.id));

    // 将选中的费用项目转换为 FeePricing 格式
    // 后端会先删除所有现有的费用定价，然后根据此列表重新创建
    const finalFeePricings: FeePricing[] = selectedFeeItems.map((feeItem) => {
      // 如果费用项目有规格，只使用选中的规格
      let selectedSpecsList: FeeItemSpec[] = [];
      if (feeItem.hasSpecs && feeItem.specs && feeItem.specs.length > 0) {
        const selectedSpecIds = selectedSpecs[feeItem.id] || [];
        // 如果选择了规格，只使用选中的；如果没选择，使用所有启用的规格
        if (selectedSpecIds.length > 0) {
          selectedSpecsList = feeItem.specs.filter((spec) => selectedSpecIds.includes(spec.id));
        } else {
          // 默认使用所有启用的规格
          selectedSpecsList = feeItem.specs.filter((spec) => spec.isActive);
        }
      }

      return {
        feeType: feeItem.feeType,
        mode: feeItem.mode,
        fixedAmountCents: feeItem.defaultFixedAmountCents ?? null,
        unitPriceCents: feeItem.defaultUnitPriceCents ?? null,
        unitName: feeItem.defaultUnitName ?? null,
        billingTiming: feeItem.defaultBillingTiming ?? null,
        hasSpecs: feeItem.hasSpecs && selectedSpecsList.length > 0,
        notes: feeItem.notes ?? null,
        specs: selectedSpecsList.map((spec) => ({
          name: spec.name,
          description: spec.description ?? null,
          fixedAmountCents: spec.fixedAmountCents ?? null,
          unitPriceCents: spec.unitPriceCents ?? null,
          unitName: spec.unitName ?? null,
          isActive: spec.isActive,
          sortOrder: spec.sortOrder,
        })),
      };
    });

    // 处理并保存（后端会先删除所有现有的，然后重新创建，所以不需要保留 id）
    const items = finalFeePricings.map((item) => {
      const { specs, ...rest } = item;
      return {
        ...rest,
        specs: specs || [],
      };
    });

    updateMutation.mutate(items);
  };

  // 当 modal 打开时，回显已选择的项目和规格
  useEffect(() => {
    if (open && feeItems.length > 0) {
      const initialSelectedKeys: string[] = [];
      const initialSelectedSpecs: Record<string, string[]> = {};
      const initialUserSelected = new Set<string>();

      // 遍历已存在的费用定价，回显选中状态
      feePricings.forEach((feePricing) => {
        // 根据 feeType 找到对应的 FeeItem
        const feeItem = feeItems.find((item) => item.feeType === feePricing.feeType);
        if (!feeItem) return;

        initialSelectedKeys.push(feeItem.id);
        initialUserSelected.add(feeItem.id);

        // 如果费用项目有规格，回显已选择的规格
        if (feeItem.hasSpecs && feeItem.specs && feeItem.specs.length > 0 && feePricing.specs) {
          // 根据规格名称匹配 FeeItemSpec 的 ID
          const selectedSpecIds: string[] = [];
          feePricing.specs.forEach((pricingSpec) => {
            const matchedSpec = feeItem.specs?.find((itemSpec) => itemSpec.name === pricingSpec.name);
            if (matchedSpec && matchedSpec.isActive) {
              selectedSpecIds.push(matchedSpec.id);
            }
          });

          if (selectedSpecIds.length > 0) {
            initialSelectedSpecs[feeItem.id] = selectedSpecIds;
          } else {
            // 如果没有匹配的规格，默认选中所有启用的规格
            const enabledSpecIds = feeItem.specs.filter((spec) => spec.isActive).map((spec) => spec.id);
            if (enabledSpecIds.length > 0) {
              initialSelectedSpecs[feeItem.id] = enabledSpecIds;
            }
          }
        }
      });

      setSelectedRowKeys(initialSelectedKeys);
      setSelectedSpecs(initialSelectedSpecs);
      setUserSelectedItems(initialUserSelected);
      prevSelectedRowKeysRef.current = initialSelectedKeys;
      prevSelectedSpecsRef.current = initialSelectedSpecs;
      isUpdatingFromKeysRef.current = false;
      isUpdatingFromSpecsRef.current = false;
    } else if (open) {
      // 如果费用项目列表还没加载，先重置
      setSelectedRowKeys([]);
      setSelectedSpecs({});
      setUserSelectedItems(new Set());
      prevSelectedRowKeysRef.current = [];
      prevSelectedSpecsRef.current = {};
      isUpdatingFromKeysRef.current = false;
      isUpdatingFromSpecsRef.current = false;
    }
  }, [open, feeItems, feePricings]);

  // 当费用项目选择变化时，联动规格选择状态
  useEffect(() => {
    // 如果正在从规格更新项目，跳过此更新
    if (isUpdatingFromSpecsRef.current) {
      prevSelectedRowKeysRef.current = selectedRowKeys;
      return;
    }

    const prevSelectedSet = new Set(prevSelectedRowKeysRef.current);
    const currentSelectedSet = new Set(selectedRowKeys);

    // 检查是否有实际变化
    const hasActualChange = 
      prevSelectedSet.size !== currentSelectedSet.size ||
      Array.from(prevSelectedSet).some(key => !currentSelectedSet.has(key)) ||
      Array.from(currentSelectedSet).some(key => !prevSelectedSet.has(key));

    if (!hasActualChange) {
      prevSelectedRowKeysRef.current = selectedRowKeys;
      return;
    }

    isUpdatingFromKeysRef.current = true;

    setSelectedSpecs((prev) => {
      const updated = { ...prev };
      let hasChanges = false;

      // 处理新增选中的项目：自动勾选所有启用的规格
      selectedRowKeys.forEach((feeItemId) => {
        if (!prevSelectedSet.has(feeItemId)) {
          // 新增的项目，自动选中所有启用的规格
          const feeItem = feeItems.find((item) => item.id === feeItemId);
          if (feeItem?.hasSpecs && feeItem.specs && feeItem.specs.length > 0) {
            const enabledSpecIds = feeItem.specs.filter((spec) => spec.isActive).map((spec) => spec.id);
            if (enabledSpecIds.length > 0) {
              // 只有当规格选择与预期不同时才更新
              const currentSpecs = prev[feeItemId] || [];
              const currentSet = new Set(currentSpecs);
              const expectedSet = new Set(enabledSpecIds);
              if (currentSet.size !== expectedSet.size || 
                  !Array.from(currentSet).every(id => expectedSet.has(id))) {
                updated[feeItemId] = enabledSpecIds;
                hasChanges = true;
              }
            }
          }
        }
      });

      // 处理取消选中的项目：自动取消勾选所有规格
      prevSelectedSet.forEach((feeItemId) => {
        if (!currentSelectedSet.has(feeItemId)) {
          // 取消选中的项目，移除规格选择
          if (updated[feeItemId]) {
            delete updated[feeItemId];
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        prevSelectedSpecsRef.current = updated;
      }
      return hasChanges ? updated : prev;
    });

    // 更新 ref
    prevSelectedRowKeysRef.current = selectedRowKeys;
    isUpdatingFromKeysRef.current = false;
  }, [selectedRowKeys, feeItems]);

  // 当规格选择变化时，自动更新费用项目的选中状态（用于显示 indeterminate 或取消选中）
  useEffect(() => {
    // 如果正在从项目更新规格，跳过此更新
    if (isUpdatingFromKeysRef.current) {
      prevSelectedSpecsRef.current = selectedSpecs;
      return;
    }

    // 检查是否有实际变化
    const prevSpecs = prevSelectedSpecsRef.current;
    const prevSpecsKeys = Object.keys(prevSpecs).sort();
    const currentSpecsKeys = Object.keys(selectedSpecs).sort();
    const hasSpecsChange = 
      prevSpecsKeys.length !== currentSpecsKeys.length ||
      prevSpecsKeys.some(key => !selectedSpecs[key] || 
        JSON.stringify(prevSpecs[key]?.sort()) !== JSON.stringify(selectedSpecs[key]?.sort())) ||
      currentSpecsKeys.some(key => !prevSpecs[key]);

    if (!hasSpecsChange) {
      prevSelectedSpecsRef.current = selectedSpecs;
      return;
    }

    isUpdatingFromSpecsRef.current = true;

    setSelectedRowKeys((prev) => {
      const updated = new Set(prev);
      let hasChanges = false;

      // 遍历所有费用项目，检查规格选择状态
      feeItems.forEach((feeItem) => {
        if (feeItem.hasSpecs && feeItem.specs && feeItem.specs.length > 0) {
          const selectedSpecIds = selectedSpecs[feeItem.id] || [];
          const enabledSpecIds = feeItem.specs.filter((spec) => spec.isActive).map((spec) => spec.id);
          const isUserSelected = userSelectedItems.has(feeItem.id);
          const isCurrentlySelected = updated.has(feeItem.id);
          
          if (selectedSpecIds.length > 0) {
            // 有规格被选中
            if (selectedSpecIds.length === enabledSpecIds.length) {
              // 所有规格都被选中，如果项目不在选中列表中，添加它
              if (!isCurrentlySelected) {
                updated.add(feeItem.id);
                hasChanges = true;
              }
            } else {
              // 部分规格被选中，确保项目在选中列表中（用于显示 indeterminate）
              if (!isCurrentlySelected) {
                updated.add(feeItem.id);
                hasChanges = true;
              }
            }
          } else {
            // 所有规格都被取消选择
            if (!isUserSelected && isCurrentlySelected) {
              // 如果用户没有主动勾选项目，且项目当前是选中的，则取消选中项目
              updated.delete(feeItem.id);
              hasChanges = true;
            }
            // 如果用户主动勾选了项目，即使所有规格都被取消，项目仍然保持选中状态
          }
        }
      });

      if (hasChanges) {
        prevSelectedRowKeysRef.current = Array.from(updated);
      }
      return hasChanges ? Array.from(updated) : prev;
    });

    prevSelectedSpecsRef.current = selectedSpecs;
    isUpdatingFromSpecsRef.current = false;
  }, [selectedSpecs, feeItems, userSelectedItems]);

  const columns: ColumnsType<FeeItem> = [
    {
      title: '费用类型',
      dataIndex: 'feeType',
      render: (feeType: string) => FEE_TYPE_NAMES[feeType as keyof typeof FEE_TYPE_NAMES] || feeType,
    },
    { title: '名称', dataIndex: 'name' },
    {
      title: '计费方式',
      dataIndex: 'mode',
      render: (mode: string) => (mode === 'FIXED' ? '固定计费' : '按用量计费'),
    },
    {
      title: '默认价格',
      key: 'price',
      render: (_: any, record: FeeItem) => {
        if (record.hasSpecs && record.specs && record.specs.length > 0) {
          return <Tag color="purple">{record.specs.length} 个规格</Tag>;
        }
        if (record.mode === 'FIXED') {
          return record.defaultFixedAmountCents != null ? formatMoney(record.defaultFixedAmountCents) : '-';
        }
        return record.defaultUnitPriceCents != null
          ? `${formatMoney(record.defaultUnitPriceCents)}/${record.defaultUnitName || '单位'}`
          : '-';
      },
    },
  ];

  // 计算每个费用项目的 indeterminate 状态（部分规格被选中）
  const getIndeterminateState = useCallback((record: FeeItem) => {
    if (!record.hasSpecs || !record.specs || record.specs.length === 0) {
      return false;
    }
    const selectedSpecIds = selectedSpecs[record.id] || [];
    const enabledSpecIds = record.specs.filter((spec) => spec.isActive).map((spec) => spec.id);
    // 如果选中了规格，但选中的数量小于总启用数量，则为部分勾选状态
    return selectedSpecIds.length > 0 && selectedSpecIds.length < enabledSpecIds.length;
  }, [selectedSpecs]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      const newSelectedKeys = selectedKeys as string[];
      const prevSelectedSet = new Set(selectedRowKeys);
      const newSelectedSet = new Set(newSelectedKeys);

      // 更新用户主动勾选的项目
      setUserSelectedItems((prev) => {
        const updated = new Set(prev);
        // 新增选中的项目，标记为用户主动勾选
        newSelectedKeys.forEach((key) => {
          if (!prevSelectedSet.has(key)) {
            updated.add(key);
          }
        });
        // 取消选中的项目，如果原本是用户主动勾选的，移除标记
        selectedRowKeys.forEach((key) => {
          if (!newSelectedSet.has(key)) {
            updated.delete(key);
          }
        });
        return updated;
      });

      setSelectedRowKeys(newSelectedKeys);
    },
    getCheckboxProps: (record: FeeItem) => {
      const indeterminate = getIndeterminateState(record);
      return {
        indeterminate,
      };
    },
  };

  const expandedRowRender = useCallback((record: FeeItem) => {
    if (!record.hasSpecs || !record.specs || record.specs.length === 0) {
      return null;
    }

    const specRowSelection = {
      selectedRowKeys: selectedSpecs[record.id] || [],
      onChange: (selectedKeys: React.Key[]) => {
        setSelectedSpecs((prev) => ({
          ...prev,
          [record.id]: selectedKeys as string[],
        }));
      },
    };

    const specColumns = [
      {
        title: '规格名称',
        dataIndex: 'name',
      },
      {
        title: '描述',
        dataIndex: 'description',
        render: (desc: string | null | undefined) => desc || '-',
      },
      {
        title: '价格',
        key: 'price',
        render: (_: any, spec: any) => {
          if (record.mode === 'FIXED') {
            return spec.fixedAmountCents != null ? formatMoney(spec.fixedAmountCents) : '-';
          }
          return spec.unitPriceCents != null
            ? `${formatMoney(spec.unitPriceCents)}/${spec.unitName || '单位'}`
            : '-';
        },
      },
      {
        title: '状态',
        dataIndex: 'isActive',
        render: (active: boolean) => (active ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>),
      },
    ];

    return (
      <div style={{ padding: '8px 0' }}>
        <Typography.Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
          请选择要添加的规格（默认已选中所有启用的规格）：
        </Typography.Text>
        <Table
          rowSelection={specRowSelection}
          columns={specColumns}
          dataSource={record.specs}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </div>
    );
  }, [selectedSpecs]);

  return (
    <Modal
      open={open}
      title="添加费用项目"
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={updateMutation.isLoading}
      destroyOnClose
      width={800}
      okText="确定"
      cancelText="取消"
    >
      <style>
        {`
          .ant-table-tbody > tr.ant-table-row-selected > td {
            background: transparent !important;
          }
          .ant-table-tbody > tr.ant-table-row-selected:hover > td {
            background: #fafafa !important;
          }
        `}
      </style>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        请勾选要添加到当前公寓的费用项目：
      </Typography.Paragraph>
      {feeItemsLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Typography.Text type="secondary">加载中...</Typography.Text>
        </div>
      ) : feeItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Typography.Text type="secondary">
            暂无费用项目，请先在"费用管理"页面创建费用项目
          </Typography.Text>
        </div>
      ) : (
        <Table<FeeItem>
          rowSelection={rowSelection}
          rowKey="id"
          dataSource={feeItems}
          pagination={false}
          columns={columns}
          rowClassName={() => ''}
          expandable={{
            expandedRowRender,
            rowExpandable: (record) => record.hasSpecs && (record.specs?.length ?? 0) > 0,
          }}
        />
      )}
    </Modal>
  );
}
