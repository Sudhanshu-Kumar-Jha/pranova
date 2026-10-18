import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/authStore';
import { queryClient } from '../queryClient';
import { ACCESS_KEY } from '../api/client';
import { SOCKET_URL } from '../config';

interface CaseStatusChangedPayload {
  caseId: string;
  caseNumber: string;
  oldStatus?: string;
  status: string;
  notes?: string;
  careManagerName?: string;
  updatedAt: string;
}

interface RealtimeContextValue {
  connected: boolean;
  lastStatusEvent: CaseStatusChangedPayload | null;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  connected: false,
  lastStatusEvent: null,
});

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [connected, setConnected] = useState(false);
  const [lastStatusEvent, setLastStatusEvent] = useState<CaseStatusChangedPayload | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    let cancelled = false;

    (async () => {
      let token: string | null = null;
      try {
        token = await SecureStore.getItemAsync(ACCESS_KEY);
      } catch {
        /* secure store unavailable */
      }

      if (cancelled || !token) return;

      const socket: Socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
        auth: { token },
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[SOCKET] Patient real-time socket connected:', socket.id);
        setConnected(true);
      });

      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => setConnected(false));

      // Section B.2: Real-time case status updates listener
      socket.on('case:status_changed', (payload: CaseStatusChangedPayload) => {
        console.log('[REALTIME] Patient received case:status_changed:', payload);
        setLastStatusEvent(payload);

        // Invalidate active queries to refresh UI in real time
        void queryClient.invalidateQueries({ queryKey: ['my-cases'] });
        void queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
        void queryClient.invalidateQueries({ queryKey: ['patient-profile'] });
      });
    })();

    return () => {
      cancelled = true;
      socketRef.current?.off('case:status_changed');
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated]);

  return (
    <RealtimeContext.Provider value={{ connected, lastStatusEvent }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext);
}
