import type { ReactNode } from 'react';
import { Breadcrumb } from 'antd';
import type { BreadcrumbItemType } from 'antd/es/breadcrumb/Breadcrumb';

export interface PageContainerProps {
  title?: ReactNode;
  breadcrumb?: BreadcrumbItemType[];
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * 统一的页面容器组件
 * 提供统一的页面标题、面包屑、操作按钮区域
 */
export function PageContainer({
  breadcrumb,
  extra,
  children,
  className = '',
}: PageContainerProps) {
  return (
    <div className={`page-container ${className}`}>
      {(breadcrumb || extra) && (
        <div className="page-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            {breadcrumb && breadcrumb.length > 0 && (
              <Breadcrumb
                items={breadcrumb}
                style={{ marginBottom: 12 }}
              />
            )}
          </div>
          {extra && (
            <div className="page-actions">
              {extra}
            </div>
          )}
        </div>
      )}
      <div style={{ minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}
