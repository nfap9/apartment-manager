import type { AxiosError } from 'axios';
import {
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Typography,
  Row,
  Col,
  message,
  Spin,
  Card,
} from 'antd';
import { PlusOutlined, HomeOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';
import type { ApiErrorResponse } from '../../lib/apiTypes';
import { useAuthStore } from '../../stores/auth';
import type { Apartment } from '../../lib/api/types';

type ApartmentsResponse = {
  apartments: Apartment[];
};

export function ApartmentsPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<{
    name: string;
    address: string;
    totalArea?: number;
    floor?: number;
  }>();

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
    return <Typography.Text type="secondary">请先选择组织</Typography.Text>;
  }

  return (
    <>
      <div className="page-wrapper">
        <Spin spinning={query.isLoading}>
          <Row gutter={[16, 16]} className="m-0">
            {/* 新增公寓卡片 */}
            <Col xs={24} sm={12} md={8} lg={6} xl={6} xxl={4}>
              <Card
                onClick={() => setModalOpen(true)}
                className="h-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[180px] rounded-xl shadow-md"
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
                  className="rounded-xl shadow-md h-full cursor-pointer flex flex-col"
                  bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}
                >
                  <div className="mb-3">
                    <Space size={8}>
                      <HomeOutlined className="text-lg text-primary" />
                      <Typography.Title level={4} className="m-0 text-lg font-semibold">
                        {apartment.name}
                      </Typography.Title>
                    </Space>
                  </div>

                  <Typography.Text type="secondary" ellipsis className="block mb-4 text-xs">
                    {apartment.address}
                  </Typography.Text>

                  {/* 房间统计信息 */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 mb-3">
                    <div className="text-center">
                      <div className="text-[12px] font-medium text-text-secondary mb-1">
                        房间情况
                      </div>
                      <div className="text-2xl font-bold text-gray-800">
                        {apartment.vacantRooms ?? 0}
                        <span className="text-lg text-gray-500 mx-1">/</span>
                        {apartment.totalRooms ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* 其他信息 */}
                  {(apartment.totalArea != null || apartment.floor != null) && (
                    <Row gutter={8} className="mb-3">
                      {apartment.totalArea != null && (
                        <Col span={12}>
                          <div className="text-center">
                            <div className="text-[10px] text-text-tertiary mb-1">面积</div>
                            <div className="text-sm font-medium">
                              {apartment.totalArea}㎡
                            </div>
                          </div>
                        </Col>
                      )}
                      {apartment.floor != null && (
                        <Col span={12}>
                          <div className="text-center">
                            <div className="text-[10px] text-text-tertiary mb-1">楼层</div>
                            <div className="text-sm font-medium">
                              {apartment.floor}层
                            </div>
                          </div>
                        </Col>
                      )}
                    </Row>
                  )}

                  {/* 查看房间按钮 */}
                  <Button
                    type="primary"
                    size="small"
                    block
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/rooms?apartmentId=${apartment.id}`);
                    }}
                    className="mt-auto"
                  >
                    查看房间
                  </Button>
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
          <Form.Item label="总面积(㎡)" name="totalArea" className="mb-4">
            <InputNumber min={0} className="w-full" placeholder="选填" />
          </Form.Item>
          <Form.Item label="楼层" name="floor" className="mb-0">
            <InputNumber className="w-full" placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
