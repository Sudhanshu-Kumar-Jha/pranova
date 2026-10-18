import { create } from 'zustand';

interface NetworkState {
  isOffline: boolean;
  errorMessage: string | null;
  setOffline: (offline: boolean, message?: string | null) => void;
  clearOffline: () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOffline: false,
  errorMessage: null,
  setOffline: (isOffline, errorMessage = 'Cannot reach PRANOVA healthcare server') =>
    set({ isOffline, errorMessage: isOffline ? errorMessage : null }),
  clearOffline: () => set({ isOffline: false, errorMessage: null }),
}));
