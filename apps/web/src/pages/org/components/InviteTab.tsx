import { Button, Card, Form, Input, Modal, Space, Typography, message } from 'antd';
import type { AxiosError } from 'axios';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { ApiErrorResponse } from '../../../lib/apiTypes';
import type { InviteResp } from '../types';

interface InviteTabProps {
  orgId: string;
  inviteResult: InviteResp['invite'] | null;
  onInviteResultChange: (result: InviteResp['invite'] | null) => void;
}

export function InviteTab({ orgId, inviteResult, onInviteResultChange }: InviteTabProps) {
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteForm] = Form.useForm<{ maxUses?: number; expiresInDays?: number }>();

  const onCreateInvite = async () => {
    setInviteSaving(true);
    try {
      const values = await inviteForm.validateFields();
      const r = await api.post(`/api/orgs/${orgId}/invites`, values);
      const data = r.data as InviteResp;
      onInviteResultChange(data.invite);
      message.success('已生成邀请码');
      setInviteOpen(false);
      inviteForm.resetFields();
    } catch (err) {
      const e = err as AxiosError<ApiErrorResponse>;
      message.error(e.response?.data?.error?.message ?? '生成失败');
    } finally {
      setInviteSaving(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Button onClick={() => setInviteOpen(true)} type="primary">
        生成邀请码
      </Button>
      {inviteResult ? (
        <Card size="small">
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            组织ID：<Typography.Text code>{orgId}</Typography.Text>
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            邀请码：<Typography.Text code>{inviteResult.code}</Typography.Text>
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            对方加入组织时调用：
            <Typography.Text code>{`POST /api/orgs/${orgId}/invites/accept`}</Typography.Text>，body：
            <Typography.Text code>{JSON.stringify({ code: inviteResult.code })}</Typography.Text>
          </Typography.Paragraph>
        </Card>
      ) : (
        <Typography.Text type="secondary">暂无邀请码</Typography.Text>
      )}

      <Modal
        open={inviteOpen}
        title="生成邀请码"
        onCancel={() => setInviteOpen(false)}
        onOk={onCreateInvite}
        confirmLoading={inviteSaving}
        destroyOnHidden
      >
        <Form form={inviteForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="最大使用次数(可选)" name="maxUses" style={{ marginBottom: 16 }}>
            <Input type="number" placeholder="留空表示无限制" />
          </Form.Item>
          <Form.Item label="有效期(天，可选)" name="expiresInDays" style={{ marginBottom: 0 }}>
            <Input type="number" placeholder="留空表示永不过期" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
