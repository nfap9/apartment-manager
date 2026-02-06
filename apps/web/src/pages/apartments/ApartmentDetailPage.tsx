import { Space, Tabs, Typography, Button } from 'antd';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrgIdWithError } from '../../hooks/useOrgId';
import { useApartmentDetail } from './hooks/useApartmentDetail';
import {
  ApartmentInfoCard,
  RoomTable,
  RoomEditModal,
  PricingPlanModal,
  RoomFacilityModal,
  UpstreamForm,
  FeePricingModal,
  FeePricingCard,
  RoomImportModal,
} from './components';
import { apartmentsApi, handleApiError } from '../../lib/api/index';
import { queryKeys } from '../../lib/api/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import type { Room } from '../../lib/api/types';

export function ApartmentDetailPage() {
  const { apartmentId } = useParams<{ apartmentId: string }>();
  const [orgId, errorComponent] = useOrgIdWithError();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    apartment,
    upstream,
    feePricings,
    isLoading,
    upstreamLoading,
    feeLoading,
    canUpstreamRead,
    canUpstreamWrite,
    canApartmentWrite,
    canRoomWrite,
    canPricingManage,
  } = useApartmentDetail(apartmentId);

  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingRoom, setPricingRoom] = useState<Room | null>(null);
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [facilityRoom, setFacilityRoom] = useState<Room | null>(null);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [importUploading, setImportUploading] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateRooms, setDuplicateRooms] = useState<string[]>([]);

  if (errorComponent || !orgId || !apartmentId) {
    return errorComponent || <Typography.Text type="secondary">缺少 apartmentId</Typography.Text>;
  }

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
                    setEditRoomOpen(true);
  };

  const handleFacility = (room: Room) => {
    setFacilityRoom(room);
    setFacilityOpen(true);
  };

  const handlePricing = (room: Room) => {
    setPricingRoom(room);
    setPricingOpen(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await apartmentsApi.downloadImportTemplate(orgId, apartmentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'room_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      handleApiError(error, '下载失败');
    }
  };

  const handleImport = async (file: File): Promise<boolean> => {
    setImportUploading(true);
    try {
      await apartmentsApi.importRooms(orgId, apartmentId, file);
      await queryClient.invalidateQueries({ queryKey: queryKeys.apartments.detail(orgId, apartmentId) });
      return false;
    } catch (error: unknown) {
      const e = error as { response?: { status?: number; data?: { error?: { code?: string; duplicateRooms?: string[] } } } };
      if (e.response?.status === 409 && e.response?.data?.error?.code === 'DUPLICATE_ROOMS') {
        const duplicateRoomsList = e.response.data.error.duplicateRooms || [];
        setDuplicateRooms(duplicateRoomsList);
        setDuplicateModalOpen(true);
        setImportUploading(false);
        return false;
      }
      if (e.response?.data?.error?.code === 'IMPORT_CANCELLED') {
        setDuplicateModalOpen(false);
        setDuplicateRooms([]);
        setImportUploading(false);
        return false;
      }
      handleApiError(error, '导入失败');
      return false;
    } finally {
      setImportUploading(false);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.apartments.detail(orgId, apartmentId) });
  };

  return (
    <div className="page-wrapper">
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <ApartmentInfoCard
        apartment={apartment}
        loading={isLoading}
        canEdit={canApartmentWrite}
        onUpdate={handleRefresh}
      />

      <Tabs
        items={[
          {
            key: 'rooms',
            label: '房间',
            children: (
              <div>
                <div style={{ marginBottom: 16, textAlign: 'right' }}>
                  <Button
                    type="primary"
                    onClick={() => navigate(`/rooms?apartmentId=${apartmentId}`)}
                  >
                    查看房间管理
                  </Button>
                </div>
                <RoomTable
                  rooms={apartment?.rooms ?? []}
                  canEdit={canRoomWrite}
                  canPricingManage={canPricingManage}
                  onEdit={handleEditRoom}
                  onFacility={handleFacility}
                  onPricing={handlePricing}
                  onDownloadTemplate={handleDownloadTemplate}
                  onImport={handleImport}
                  importUploading={importUploading}
                />
              </div>
            ),
          },
          ...(canUpstreamRead
            ? [
                {
                  key: 'upstream',
                  label: '上游信息',
                  children: (
                    <UpstreamForm
                      apartmentId={apartmentId}
                      upstream={upstream}
                      loading={upstreamLoading}
                      canRead={canUpstreamRead}
                      canWrite={canUpstreamWrite}
                      onSuccess={handleRefresh}
                    />
                  ),
                },
              ]
            : []),
          {
            key: 'fees',
            label: '费用定价',
            children: (
              <FeePricingCard
                feePricings={feePricings}
                loading={feeLoading}
                canEdit={canApartmentWrite}
                onEdit={() => setFeeModalOpen(true)}
              />
            ),
          },
        ]}
      />

      <RoomEditModal
        open={editRoomOpen}
        room={editingRoom}
        apartmentId={apartmentId}
        onClose={() => {
          setEditRoomOpen(false);
          setEditingRoom(null);
        }}
        onSuccess={handleRefresh}
      />

      <PricingPlanModal
        open={pricingOpen}
        room={pricingRoom}
        onClose={() => {
          setPricingOpen(false);
          setPricingRoom(null);
        }}
        onSuccess={handleRefresh}
      />

      <RoomFacilityModal
        open={facilityOpen}
        room={facilityRoom}
        apartmentId={apartmentId}
        onClose={() => {
          setFacilityOpen(false);
          setFacilityRoom(null);
        }}
        onSuccess={handleRefresh}
      />

      <FeePricingModal
        open={feeModalOpen}
        apartmentId={apartmentId}
        feePricings={feePricings}
        onClose={() => setFeeModalOpen(false)}
        onSuccess={handleRefresh}
      />

      <RoomImportModal
        open={duplicateModalOpen}
        apartmentId={apartmentId}
        duplicateRooms={duplicateRooms}
        onClose={() => {
          setDuplicateModalOpen(false);
          setDuplicateRooms([]);
        }}
        onSuccess={handleRefresh}
      />
      </Space>
    </div>
  );
}
