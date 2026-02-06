import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import type { KpisResponse } from '../types';

interface OccupancyChartProps {
  data?: KpisResponse['kpis'];
}

export function OccupancyChart({ data }: OccupancyChartProps) {
  const chartOption = useMemo(() => {
    if (!data) return undefined;

    const vacant = Math.max(0, data.totalRoomCount - data.occupiedRoomCount);
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          data: [
            { value: data.occupiedRoomCount, name: '已出租' },
            { value: vacant, name: '空房' },
          ],
        },
      ],
    };
  }, [data]);

  if (!chartOption) return null;

  return (
    <ReactECharts
      option={chartOption}
      style={{ height: 280 }}
      opts={{ renderer: 'svg' }}
    />
  );
}
