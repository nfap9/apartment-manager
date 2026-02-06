import { Modal, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState, useEffect, useMemo, useCallback } from 'react';
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

  // 过滤掉已经添加的费用类型
  const availableFeeItems = useMemo(() => {
    return feeItems.filter((item) => !existingFeeTypes.includes(item.feeType));
  }, [feeItems, existingFeeTypes]);

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
    if (selectedRowKeys.length === 0) {
      onClose();
      return;
    }

    // 获取选中的费用项目
    const selectedFeeItems = feeItems.filter((item) => selectedRowKeys.includes(item.id));

    // 将选中的费用项目转换为 FeePricing 格式
    const newFeePricings: FeePricing[] = selectedFeeItems.map((feeItem) => {
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
        id: `temp-${Date.now()}-${Math.random()}`,
        feeType: feeItem.feeType,
        mode: feeItem.mode,
        fixedAmountCents: feeItem.defaultFixedAmountCents ?? null,
        unitPriceCents: feeItem.defaultUnitPriceCents ?? null,
        unitName: feeItem.defaultUnitName ?? null,
        billingTiming: feeItem.defaultBillingTiming ?? null,
        hasSpecs: feeItem.hasSpecs && selectedSpecsList.length > 0,
        notes: feeItem.notes ?? null,
        specs: selectedSpecsList.map((spec) => ({
          id: `temp-spec-${Date.now()}-${Math.random()}`,
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

    // 合并现有费用和新增费用
    const allFeePricings = [...feePricings, ...newFeePricings];

    // 处理并保存
    const items = allFeePricings.map((item) => {
      const { specs, ...rest } = item;
      const processedSpecs = specs?.map((spec: any) => {
        const { id, ...specData } = spec;
        return id ? { id, ...specData } : specData;
      });
      return {
        ...rest,
        specs: processedSpecs,
      };
    });

    updateMutation.mutate(items);
  };

  // 当 modal 打开时，重置选中状态
  useEffect(() => {
    if (open) {
      setSelectedRowKeys([]);
      setSelectedSpecs({});
    }
  }, [open]);

  // 当费用项目选择变化时，初始化规格选择状态
  useEffect(() => {
    const newSelectedSpecs: Record<string, string[]> = {};
    selectedRowKeys.forEach((feeItemId) => {
      const feeItem = feeItems.find((item) => item.id === feeItemId);
      if (feeItem?.hasSpecs && feeItem.specs && feeItem.specs.length > 0) {
        // 默认选中所有启用的规格
        const enabledSpecIds = feeItem.specs.filter((spec) => spec.isActive).map((spec) => spec.id);
        if (enabledSpecIds.length > 0) {
          newSelectedSpecs[feeItemId] = enabledSpecIds;
        }
      }
    });
    setSelectedSpecs((prev) => {
      // 只更新新增的费用项目，保留已选择的规格
      const updated = { ...prev };
      let hasChanges = false;
      selectedRowKeys.forEach((feeItemId) => {
        if (!prev[feeItemId]) {
          updated[feeItemId] = newSelectedSpecs[feeItemId] || [];
          hasChanges = true;
        }
      });
      // 移除未选中的费用项目的规格选择
      Object.keys(updated).forEach((feeItemId) => {
        if (!selectedRowKeys.includes(feeItemId)) {
          delete updated[feeItemId];
          hasChanges = true;
        }
      });
      // 如果没有任何变化，返回原对象避免触发重新渲染
      if (!hasChanges && JSON.stringify(prev) === JSON.stringify(updated)) {
        return prev;
      }
      return updated;
    });
  }, [selectedRowKeys, feeItems]);

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

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys as string[]);
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
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        请勾选要添加到当前公寓的费用项目：
      </Typography.Paragraph>
      {feeItemsLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Typography.Text type="secondary">加载中...</Typography.Text>
        </div>
      ) : availableFeeItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Typography.Text type="secondary">
            {feeItems.length === 0
              ? '暂无费用项目，请先在"费用管理"页面创建费用项目'
              : '所有费用项目已添加，或没有可用的费用项目'}
          </Typography.Text>
        </div>
      ) : (
        <Table<FeeItem>
          rowSelection={rowSelection}
          rowKey="id"
          dataSource={availableFeeItems}
          pagination={false}
          columns={columns}
          expandable={{
            expandedRowRender,
            rowExpandable: (record) => record.hasSpecs && (record.specs?.length ?? 0) > 0,
          }}
        />
      )}
    </Modal>
  );
}
