import { Button, Modal, Typography } from 'antd';
import { useState } from 'react';
import { handleApiError } from '../../../lib/api/index';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useOrgId } from '../../../hooks/useOrgId';
import { useQueryClient } from '@tanstack/react-query';

interface RoomImportModalProps {
  open: boolean;
  apartmentId: string;
  duplicateRooms: string[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function RoomImportModal({
  open,
  apartmentId,
  duplicateRooms,
  onClose,
  onSuccess,
}: RoomImportModalProps) {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleImport = async (strategy: 'skip' | 'overwrite' | 'cancel') => {
    if (strategy === 'cancel') {
      onClose();
      return;
    }

    // Note: This component expects the file to be passed via props or context
    // For now, we'll need to handle this differently
    setLoading(true);
    try {
      // This needs to be implemented properly with file handling
      // await apartmentsApi.importRooms(orgId!, apartmentId, file, strategy);
      await queryClient.invalidateQueries({ queryKey: queryKeys.apartments.detail(orgId!, apartmentId) });
      onClose();
      onSuccess?.();
    } catch (error) {
      handleApiError(error, '导入失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="检测到重复房间"
      open={open}
      onCancel={() => handleImport('cancel')}
      footer={[
        <Button key="cancel" onClick={() => handleImport('cancel')}>
          取消上传
        </Button>,
        <Button key="skip" onClick={() => handleImport('skip')} loading={loading}>
          跳过已存在的房间
        </Button>,
        <Button key="overwrite" type="primary" onClick={() => handleImport('overwrite')} loading={loading}>
          覆盖已存在的房间
        </Button>,
      ]}
    >
      <Typography.Paragraph>以下房间名已存在，请选择处理方式：</Typography.Paragraph>
      <ul style={{ marginTop: 16, marginBottom: 0 }}>
        {duplicateRooms.map((roomName) => (
          <li key={roomName}>
            <Typography.Text strong>{roomName}</Typography.Text>
          </li>
        ))}
      </ul>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
        <strong>跳过</strong>：保留现有房间，不进行任何修改<br />
        <strong>覆盖</strong>：用导入数据替换现有房间的信息（包括设施）<br />
        <strong>取消</strong>：取消本次导入操作
      </Typography.Paragraph>
    </Modal>
  );
}
