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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div style={{ flexShrink: 0, marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            新增公寓
          </Button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Spin spinning={query.isLoading}>
            {apartments.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无公寓数据"
                style={{ padding: '60px 0' }}
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                  创建第一个公寓
                </Button>
              </Empty>
            ) : (
              <Row gutter={[24, 24]}>
                {apartments.map((apartment) => (
                  <Col key={apartment.id} xs={24} sm={12} lg={8} xl={6}>
                    <div
                      style={{
                        padding: 20,
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{ marginBottom: 16 }}>
                        <Space>
                          <HomeOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                          <Typography.Title level={5} style={{ margin: 0, fontSize: 18 }}>
                            {apartment.name}
                          </Typography.Title>
                        </Space>
                      </div>
                      
                      <Typography.Text type="secondary" ellipsis style={{ display: 'block', marginBottom: 16 }}>
                        {apartment.address}
                      </Typography.Text>
                      
                      {/* 突出显示房间统计信息 */}
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f7ff 100%)',
                          borderRadius: 8,
                          padding: 16,
                          marginBottom: 12,
                        }}
                      >
                        <Row gutter={16}>
                          <Col span={12}>
                            <Statistic
                              title={<span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(0, 0, 0, 0.65)' }}>房间总数</span>}
                              value={apartment.totalRooms ?? 0}
                              valueStyle={{
                                fontSize: 28,
                                fontWeight: 600,
                                color: '#1890ff',
                              }}
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic
                              title={<span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(0, 0, 0, 0.65)' }}>空房数</span>}
                              value={apartment.vacantRooms ?? 0}
                              valueStyle={{
                                fontSize: 28,
                                fontWeight: 600,
                                color: (apartment.vacantRooms ?? 0) > 0 ? '#52c41a' : '#ff4d4f',
                              }}
                            />
                          </Col>
                        </Row>
                      </div>

                      {/* 其他信息 */}
                      {(apartment.totalArea != null || apartment.floor != null) && (
                        <Row gutter={16} style={{ marginTop: 12 }}>
                          {apartment.totalArea != null && (
                            <Col span={12}>
                              <Statistic
                                title={<span style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)' }}>面积</span>}
                                value={apartment.totalArea}
                                suffix="㎡"
                                valueStyle={{ fontSize: 16, fontWeight: 500 }}
                              />
                            </Col>
                          )}
                          {apartment.floor != null && (
                            <Col span={12}>
                              <Statistic
                                title={<span style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)' }}>楼层</span>}
                                value={apartment.floor}
                                suffix="层"
                                valueStyle={{ fontSize: 16, fontWeight: 500 }}
                              />
                            </Col>
                          )}
                        </Row>
                      )}

                      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                        <Button
                          type="link"
                          onClick={() => navigate(`/apartments/${apartment.id}`)}
                          style={{ width: '100%' }}
                        >
                          查看详情
                        </Button>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </Spin>
        </div>
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

