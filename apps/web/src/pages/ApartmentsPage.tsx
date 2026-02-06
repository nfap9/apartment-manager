import type { AxiosError } from 'axios';
import { Form, Input, InputNumber, Modal, Space, Typography, Row, Col, message, Statistic, Spin, Card } from 'antd';
import { PlusOutlined, HomeOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { ApiErrorResponse } from '../lib/apiTypes';
import { useAuthStore } from '../stores/auth';
import type { Apartment } from '../lib/api/types';

type ApartmentsResponse = {
  apartments: Apartment[];
};

export function ApartmentsPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<{ name: string; address: string; totalArea?: number; floor?: number }>();

  const query = useQuery({
    queryKey: ['apartments', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/apartments`);
      return r.data as ApartmentsResponse;
    },
  });

  const apartments = query.data?.apartments ?? [];

  const onCreate = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      await api.post(`/api/orgs/${orgId}/apartments`, values);
      message.success('已创建');
      setModalOpen(false);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ['apartments', orgId] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '创建失败');
    } finally {
      setSaving(false);
    }
  };

  if (!orgId) {
    return (
      <Typography.Text type="secondary">请先选择组织</Typography.Text>
    );
  }

  return (
    <>
      <div className="w-full h-full p-6 overflow-y-auto overflow-x-hidden">
        <Spin spinning={query.isLoading}>
          <Row gutter={[16, 16]} className="m-0">
            {/* 新增公寓卡片 */}
            <Col xs={24} sm={12} md={8} lg={6} xl={6} xxl={4}>
              <Card
                onClick={() => setModalOpen(true)}
                className="h-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[180px] hover:border-primary hover:bg-blue-50"
                style={{ borderStyle: 'dashed' }}
                bodyStyle={{ 
                  padding: '12px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <PlusOutlined className="text-[32px] text-primary mb-2" />
                <Typography.Text type="secondary" className="text-sm">
                  新增公寓
                </Typography.Text>
              </Card>
            </Col>

            {/* 公寓卡片列表 */}
            {apartments.map((apartment) => (
              <Col key={apartment.id} xs={24} sm={12} md={8} lg={6} xl={6} xxl={4}>
                <Card
                  onClick={() => navigate(`/apartments/${apartment.id}`)}
                  className="h-full flex flex-col cursor-pointer transition-all duration-300 min-h-[180px] hover:border-primary hover:shadow-[0_2px_8px_rgba(24,144,255,0.15)]"
                  bodyStyle={{ 
                    padding: '12px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div className="mb-2">
                    <Space size={8}>
                      <HomeOutlined className="text-base text-primary" />
                      <Typography.Title level={5} className="m-0 text-base">
                        {apartment.name}
                      </Typography.Title>
                    </Space>
                  </div>
                  
                  <Typography.Text 
                    type="secondary" 
                    ellipsis 
                    className="block mb-2 text-xs"
                  >
                    {apartment.address}
                  </Typography.Text>
                  
                  {/* 房间统计信息 */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2.5 mb-2">
                    <Row gutter={8}>
                      <Col span={12}>
                        <Statistic
                          title={<span className="text-[11px] font-medium text-text-secondary">房间总数</span>}
                          value={apartment.totalRooms ?? 0}
                          valueStyle={{
                            fontSize: 22,
                            fontWeight: 600,
                            color: '#1890ff',
                          }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title={<span className="text-[11px] font-medium text-text-secondary">空房数</span>}
                          value={apartment.vacantRooms ?? 0}
                          valueStyle={{
                            fontSize: 22,
                            fontWeight: 600,
                            color: (apartment.vacantRooms ?? 0) > 0 ? '#52c41a' : '#ff4d4f',
                          }}
                        />
                      </Col>
                    </Row>
                  </div>

                  {/* 其他信息 */}
                  {(apartment.totalArea != null || apartment.floor != null) && (
                    <Row gutter={8} className="mt-auto">
                      {apartment.totalArea != null && (
                        <Col span={12}>
                          <Statistic
                            title={<span className="text-[11px] text-text-tertiary">面积</span>}
                            value={apartment.totalArea}
                            suffix="㎡"
                            valueStyle={{ fontSize: 14, fontWeight: 500 }}
                          />
                        </Col>
                      )}
                      {apartment.floor != null && (
                        <Col span={12}>
                          <Statistic
                            title={<span className="text-[11px] text-text-tertiary">楼层</span>}
                            value={apartment.floor}
                            suffix="层"
                            valueStyle={{ fontSize: 14, fontWeight: 500 }}
                          />
                        </Col>
                      )}
                    </Row>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </Spin>
      </div>

      <Modal
        open={modalOpen}
        title="新增公寓"
        onCancel={() => setModalOpen(false)}
        onOk={onCreate}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item 
            label="名称" 
            name="name" 
            rules={[{ required: true, message: '请输入名称' }]}
            className="mb-4"
          >
            <Input placeholder="请输入公寓名称" />
          </Form.Item>
          <Form.Item 
            label="地址" 
            name="address" 
            rules={[{ required: true, message: '请输入地址' }]}
            className="mb-4"
          >
            <Input placeholder="请输入公寓地址" />
          </Form.Item>
          <Form.Item 
            label="总面积(㎡)" 
            name="totalArea"
            className="mb-4"
          >
            <InputNumber min={0} className="w-full" placeholder="选填" />
          </Form.Item>
          <Form.Item 
            label="楼层" 
            name="floor"
            className="mb-0"
          >
            <InputNumber className="w-full" placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

