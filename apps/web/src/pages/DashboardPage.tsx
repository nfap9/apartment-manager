import { Typography, Segmented } from 'antd';
import { useState } from 'react';

import { ApartmentStatusTab } from './dashboard/components/ApartmentStatusTab';
import { DataAnalysisTab } from './dashboard/components/DataAnalysisTab';
import { useDashboardData } from './dashboard/hooks/useDashboardData';
import type { TabType } from './dashboard/types';

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('apartment-status');
  const {
    orgId,
    kpisQuery,
    vacantQuery,
    expiringQuery,
    rentStatusQuery,
  } = useDashboardData();

  if (!orgId) {
    return (
      <Typography.Text type="secondary">请先选择组织</Typography.Text>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="mb-6">
        <Segmented
          options={[
            { label: '公寓状态', value: 'apartment-status' },
            { label: '数据分析', value: 'data-analysis' },
          ]}
          value={activeTab}
          onChange={(value) => setActiveTab(value as TabType)}
          size="large"
          block
        />
      </div>
      {activeTab === 'apartment-status' ? (
        <ApartmentStatusTab
          kpis={kpisQuery.data?.kpis}
          kpisLoading={kpisQuery.isLoading}
          vacantData={vacantQuery.data}
          vacantLoading={vacantQuery.isLoading}
          expiringData={expiringQuery.data}
          expiringLoading={expiringQuery.isLoading}
          rentData={rentStatusQuery.data}
          rentLoading={rentStatusQuery.isLoading}
        />
      ) : (
        <DataAnalysisTab
          kpis={kpisQuery.data?.kpis}
          kpisLoading={kpisQuery.isLoading}
        />
      )}
    </div>
  );
}
