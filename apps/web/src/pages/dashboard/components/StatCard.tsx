import { Card, Spin, Statistic } from 'antd';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: ReactNode;
  value: number | string;
  suffix?: string;
  prefix?: ReactNode;
  loading?: boolean;
  precision?: number;
  extra?: ReactNode;
}

export function StatCard({
  title,
  value,
  suffix,
  prefix,
  loading = false,
  precision,
  extra,
}: StatCardProps) {
  return (
    <Card className="rounded-xl shadow-md">
      <Spin spinning={loading}>
        <Statistic
          title={<span className="text-sm text-text-secondary">{title}</span>}
          value={value}
          suffix={suffix}
          prefix={prefix}
          precision={precision}
        />
        {extra}
      </Spin>
    </Card>
  );
}
