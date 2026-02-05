import type { AxiosError } from 'axios';
import { Tabs, Card, Space, message, Modal, Form, Input, InputNumber, Switch, Typography } from 'antd';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { ApiErrorResponse } from '../lib/apiTypes';
import { useAuthStore } from '../stores/auth';
import { usePermissions } from '../hooks/usePermissions';
import { apartmentsApi, roomsApi } from '../lib/api/apartments';
import type { Apartment, Room } from '../lib/api/types';
import { RoomTable } from './apartments/components/RoomTable';
import { PageContainer } from '../components/PageContainer';

type ApartmentsResponse = {
  apartments: Apartment[];
};

type RoomsResponse = {
  rooms: Room[];
};

export function RoomsPage() {
  const orgId = useAuthStore((s) => s.activeOrgId);
  const qc = useQueryClient();
  const { hasPermission } = usePermissions();

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [facilityModalOpen, setFacilityModalOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);
  const [importUploading, setImportUploading] = useState(false);
  const [form] = Form.useForm<{
    name: string;
    layout?: string | null;
    area?: number | null;
    notes?: string | null;
    isActive: boolean;
    isRented: boolean;
  }>();

  const canEdit = hasPermission('room.write');
  const canPricingManage = hasPermission('room.pricing.manage');

  // 获取公寓列表
  const apartmentsQuery = useQuery({
    queryKey: ['apartments', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const r = await api.get(`/api/orgs/${orgId}/apartments`);
      return r.data as ApartmentsResponse;
    },
  });

  const apartments = apartmentsQuery.data?.apartments ?? [];

  // 当公寓列表加载完成且没有选中tab时，自动选中第一个
  useEffect(() => {
    if (apartments.length > 0 && !activeTab) {
      setActiveTab(apartments[0].id);
    }
  }, [apartments, activeTab]);

  // 获取当前选中公寓的房间列表
  const roomsQuery = useQuery({
    queryKey: ['rooms', orgId, activeTab],
    enabled: !!orgId && !!activeTab,
    queryFn: async () => {
      if (!activeTab) return { rooms: [] };
      const r = await apartmentsApi.getRooms(orgId!, activeTab);
      return r as RoomsResponse;
    },
  });

  const rooms = roomsQuery.data?.rooms ?? [];

  // 处理编辑房间
  const handleEdit = (room: Room) => {
    setSelectedRoom(room);
    form.setFieldsValue({
      name: room.name,
      layout: room.layout ?? null,
      area: room.area ?? null,
      notes: room.notes ?? null,
      isActive: room.isActive,
      isRented: room.isRented,
    });
    setEditModalOpen(true);
  };

  // 处理设施管理
  const handleFacility = (room: Room) => {
    setSelectedRoom(room);
    setFacilityModalOpen(true);
  };

  // 处理价格方案
  const handlePricing = (room: Room) => {
    setSelectedRoom(room);
    setPricingModalOpen(true);
  };

  // 保存房间编辑
  const handleSave = async () => {
    if (!orgId || !selectedRoom) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      await roomsApi.update(orgId, selectedRoom.id, values);
      message.success('已保存');
      setEditModalOpen(false);
      setSelectedRoom(null);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ['rooms', orgId, activeTab] });
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 下载导入模板
  const handleDownloadTemplate = async () => {
    if (!orgId || !activeTab) return;
    try {
      const blob = await apartmentsApi.downloadImportTemplate(orgId, activeTab);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'room_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      message.error('下载失败');
    }
  };

  // 导入房间
  const handleImport = async (file: File): Promise<boolean> => {
    if (!orgId || !activeTab) return false;
    setImportUploading(true);
    try {
      await apartmentsApi.importRooms(orgId, activeTab, file, 'skip');
      message.success('导入成功');
      await qc.invalidateQueries({ queryKey: ['rooms', orgId, activeTab] });
      await qc.invalidateQueries({ queryKey: ['apartments', orgId] });
      return false; // 阻止默认上传行为
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '导入失败');
      return false;
    } finally {
      setImportUploading(false);
    }
  };

  if (!orgId) {
    return (
      <PageContainer>
        <Typography.Text type="secondary">请先选择组织</Typography.Text>
      </PageContainer>
    );
  }

  // 构建Tab项（不包含children，因为表格在外部渲染）
  const tabItems = apartments.map((apartment) => {
    const totalRooms = apartment.totalRooms ?? 0;
    const vacantRooms = apartment.vacantRooms ?? 0;
    
    return {
      key: apartment.id,
      label: (
        <Space>
          <span>{apartment.name}</span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {vacantRooms}/{totalRooms}
          </Typography.Text>
        </Space>
      ),
    };
  });

  return (
    <>
      <PageContainer>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <Card 
            style={{ 
              flexShrink: 0, 
              marginBottom: 16,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            }}
            styles={{ body: { padding: '12px 16px' } }}
          >
          {apartmentsQuery.isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Typography.Text type="secondary">加载中...</Typography.Text>
            </div>
          ) : (
            <Tabs
              activeKey={activeTab ?? undefined}
              onChange={setActiveTab}
              items={tabItems}
            />
          )}
          </Card>
          
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {activeTab && (
              <RoomTable
                rooms={rooms}
                canEdit={canEdit}
                canPricingManage={canPricingManage}
                onEdit={handleEdit}
                onFacility={handleFacility}
                onPricing={handlePricing}
                onDownloadTemplate={handleDownloadTemplate}
                onImport={handleImport}
                importUploading={importUploading}
                showImportExport={false}
              />
            )}
          </div>
        </div>
      </PageContainer>

      {/* 编辑房间Modal */}
      <Modal
        open={editModalOpen}
        title="编辑房间"
        onCancel={() => {
          setEditModalOpen(false);
          setSelectedRoom(null);
          form.resetFields();
        }}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="房间名称"
            name="name"
            rules={[{ required: true, message: '请输入房间名称' }]}
          >
            <Input placeholder="请输入房间名称" />
          </Form.Item>
          <Form.Item label="户型" name="layout">
            <Input placeholder="选填，如：一室一厅" />
          </Form.Item>
          <Form.Item label="面积(㎡)" name="area">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="选填" />
          </Form.Item>
          <Form.Item label="备注" name="notes">
            <Input.TextArea rows={3} placeholder="选填" />
          </Form.Item>
          <Form.Item label="是否启用" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="是否已租出" name="isRented" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 设施管理Modal - 暂时留空，后续可以扩展 */}
      <Modal
        open={facilityModalOpen}
        title={`房间设施管理 - ${selectedRoom?.name}`}
        onCancel={() => {
          setFacilityModalOpen(false);
          setSelectedRoom(null);
        }}
        footer={null}
        width={800}
      >
        <Typography.Text type="secondary">设施管理功能待实现</Typography.Text>
      </Modal>

      {/* 价格方案Modal - 暂时留空，后续可以扩展 */}
      <Modal
        open={pricingModalOpen}
        title={`价格方案管理 - ${selectedRoom?.name}`}
        onCancel={() => {
          setPricingModalOpen(false);
          setSelectedRoom(null);
        }}
        footer={null}
        width={800}
      >
        <Typography.Text type="secondary">价格方案管理功能待实现</Typography.Text>
      </Modal>
    </>
  );
}
