import { create } from 'zustand';

type PermissionState = {
  permissionKeys: string[];
  setPermissionKeys: (keys: string[]) => void;
  clear: () => void;
};

export const usePermissionStore = create<PermissionState>((set) => ({
  permissionKeys: [],
  setPermissionKeys: (keys) => set({ permissionKeys: keys }),
  clear: () => set({ permissionKeys: [] }),
}));

