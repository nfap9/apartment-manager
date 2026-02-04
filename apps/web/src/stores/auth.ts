import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuthedUser = {
  id: string;
  phone: string;
  displayName?: string | null;
};

export type OrgSummary = {
  membershipId: string;
  organizationId: string;
  organizationName: string;
};

type AuthState = {
  accessToken: string | null;
  user: AuthedUser | null;
  organizations: OrgSummary[];
  activeOrgId: string | null;

  setAccessToken: (token: string | null) => void;
  setMe: (input: { user: AuthedUser; organizations: OrgSummary[] }) => void;
  setActiveOrgId: (orgId: string | null) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      organizations: [],
      activeOrgId: null,

      setAccessToken: (token) => set({ accessToken: token }),
      setMe: ({ user, organizations }) => {
        const current = get().activeOrgId;
        const nextActive = current ?? organizations[0]?.organizationId ?? null;
        set({ user, organizations, activeOrgId: nextActive });
      },
      setActiveOrgId: (orgId) => set({ activeOrgId: orgId }),
      clear: () => set({ accessToken: null, user: null, organizations: [], activeOrgId: null }),
    }),
    {
      name: 'apartment_manager_auth',
      partialize: (s) => ({ accessToken: s.accessToken, activeOrgId: s.activeOrgId }),
    },
  ),
);

