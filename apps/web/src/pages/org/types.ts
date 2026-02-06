export type Role = {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
};

export type RolesResp = {
  roles: Role[];
};

export type Permission = {
  id: string;
  key: string;
  description?: string | null;
};

export type PermissionsResp = {
  permissions: Permission[];
};

export type RolePermResp = {
  permissionKeys: string[];
};

export type Member = {
  membershipId: string;
  user: { id: string; phone: string; displayName?: string | null };
  roles: Array<{ id: string; name: string }>;
};

export type MembersResp = {
  members: Member[];
};

export type InviteResp = {
  invite: {
    code: string;
    maxUses?: number | null;
    usedCount: number;
    expiresAt?: string | null;
  };
};
