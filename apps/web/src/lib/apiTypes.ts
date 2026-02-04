import type { AuthedUser, OrgSummary } from '../stores/auth';

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type AuthLoginResponse = {
  accessToken: string;
  user: AuthedUser;
};

export type AuthMeResponse = {
  user: AuthedUser;
  organizations: OrgSummary[];
};

export type AuthRefreshResponse = {
  accessToken: string;
};

export type OrgMeResponse = {
  organizationId: string;
  membershipId: string;
  permissionKeys: string[];
};

