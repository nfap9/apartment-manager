import type { AxiosError } from 'axios';
import { Button, Form, Input, InputNumber, Modal, Space, Typography, Row, Col, message, Statistic, Empty, Spin } from 'antd';
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
      <div style={{ width: '100%', height: '100%', padding: 24, overflowY: 'auto', overflowX: 'hidden' }}>
        <Spin spinning={query.isLoading}>
          <Row gutter={[16, 16]} style={{ margin: 0 }}>
            {/* 新增公寓卡片 */}
            <Col xs={24} sm={12} md={8} lg={6} xl={6} xxl={4}>
              <div
                onClick={() => setModalOpen(true)}
                style={{
                  padding: 12,
                  border: '1px dashed #d9d9d9',
                  borderRadius: 8,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  minHeight: 180,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#1890ff';
                  e.currentTarget.style.backgroundColor = '#f0f7ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d9d9d9';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <PlusOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
                <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                  新增公寓
                </Typography.Text>
              </div>
            </Col>

            {/* 公寓卡片列表 */}
            {apartments.map((apartment) => (
              <Col key={apartment.id} xs={24} sm={12} md={8} lg={6} xl={6} xxl={4}>
                <div
                  onClick={() => navigate(`/apartments/${apartment.id}`)}
                  style={{
                    padding: 12,
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    minHeight: 180,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1890ff';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <Space size={8}>
                      <HomeOutlined style={{ fontSize: 16, color: '#1890ff' }} />
                      <Typography.Title level={5} style={{ margin: 0, fontSize: 16 }}>
                        {apartment.name}
                      </Typography.Title>
                    </Space>
                  </div>
                  
                  <Typography.Text 
                    type="secondary" 
                    ellipsis 
                    style={{ display: 'block', marginBottom: 8, fontSize: 12 }}
                  >
                    {apartment.address}
                  </Typography.Text>
                  
                  {/* 房间统计信息 */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f7ff 100%)',
                      borderRadius: 6,
                      padding: 10,
                      marginBottom: 8,
                    }}
                  >
                    <Row gutter={8}>
                      <Col span={12}>
                        <Statistic
                          title={<span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(0, 0, 0, 0.65)' }}>房间总数</span>}
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
                          title={<span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(0, 0, 0, 0.65)' }}>空房数</span>}
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
                    <Row gutter={8} style={{ marginTop: 'auto' }}>
                      {apartment.totalArea != null && (
                        <Col span={12}>
                          <Statistic
                            title={<span style={{ fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>面积</span>}
                            value={apartment.totalArea}
                            suffix="㎡"
                            valueStyle={{ fontSize: 14, fontWeight: 500 }}
                          />
                        </Col>
                      )}
                      {apartment.floor != null && (
                        <Col span={12}>
                          <Statistic
                            title={<span style={{ fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>楼层</span>}
                            value={apartment.floor}
                            suffix="层"
                            valueStyle={{ fontSize: 14, fontWeight: 500 }}
                          />
                        </Col>
                      )}
                    </Row>
                  )}
                </div>
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
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item 
            label="名称" 
            name="name" 
            rules={[{ required: true, message: '请输入名称' }]}
            style={{ marginBottom: 16 }}
          >
            <Input placeholder="请输入公寓名称" />
          </Form.Item>
          <Form.Item 
            label="地址" 
            name="address" 
            rules={[{ required: true, message: '请输入地址' }]}
            style={{ marginBottom: 16 }}
          >
            <Input placeholder="请输入公寓地址" />
          </Form.Item>
          <Form.Item 
            label="总面积(㎡)" 
            name="totalArea"
            style={{ marginBottom: 16 }}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="选填" />
          </Form.Item>
          <Form.Item 
            label="楼层" 
            name="floor"
            style={{ marginBottom: 0 }}
          >
            <InputNumber style={{ width: '100%' }} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

