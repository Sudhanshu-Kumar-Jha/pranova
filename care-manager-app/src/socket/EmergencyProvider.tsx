import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { SOCKET_URL } from '../config';
import { ACCESS_KEY } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { notifyNow } from '../notifications';

/**
 * Broadcast by the backend when a P1 case is created (`src/socket/emergency.handler.ts`).
 * The event name is the server's: `admin:new_emergency`, emitted to every
 * connected client so field care managers see a dispatch the moment it lands.
 */
export interface EmergencyAlert {
  caseId: string;
  caseNumber: string;
  priority: string;
  status: string;
  title: string;
  description?: string;
  patientId?: string;
  patientName?: string;
  patientPhone?: string | null;
  patientBloodGroup?: string | null;
  incidentAddress?: string | null;
  incidentLatitude?: number | null;
  incidentLongitude?: number | null;
  timestamp: string;
}

export const EMERGENCY_EVENT = 'admin:new_emergency';

interface EmergencyContextValue {
  /** True once the socket handshake has completed. */
  connected: boolean;
  /** The most recent alert that has not been dismissed yet. */
  alert: EmergencyAlert | null;
  /** Alerts received this session, newest first (capped). */
  history: EmergencyAlert[];
  dismiss: () => void;
}

const MAX_HISTORY = 20;

const EmergencyContext = createContext<EmergencyContextValue>({
  connected: false,
  alert: null,
  history: [],
  dismiss: () => {},
});

/**
 * Keeps one Socket.IO connection for the whole signed-in session, reconnecting
 * with backoff. It is mounted inside the authenticated area only: an anonymous
 * device has no business receiving patient emergencies.
 */
export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();

  const [connected, setConnected] = useState(false);
  const [alert, setAlert] = useState<EmergencyAlert | null>(null);
  const [history, setHistory] = useState<EmergencyAlert[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const dismiss = useCallback(() => setAlert(null), []);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    let cancelled = false;
    let socket: Socket | null = null;

    (async () => {
      let token: string | null = null;
      try {
        token = await SecureStore.getItemAsync(ACCESS_KEY);
      } catch {
        /* the socket is still useful without it */
      }
      if (cancelled) return;

      socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 10_000,
        timeout: 10_000,
        auth: token ? { token } : undefined,
      });
      socketRef.current = socket;

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => setConnected(false));

      socket.on(EMERGENCY_EVENT, (payload: EmergencyAlert) => {
        if (!payload?.caseId) return;

        setHistory((prev) => {
          if (prev.some((a) => a.caseId === payload.caseId)) return prev;
          return [payload, ...prev].slice(0, MAX_HISTORY);
        });
        setAlert(payload);

        // A dispatch has to be felt, not just seen.
        Vibration.vibrate([0, 400, 200, 400]);
        void notifyNow(
          `${payload.priority ?? 'P1'} emergency · ${payload.caseNumber}`,
          payload.incidentAddress
            ? `${payload.title} — ${payload.incidentAddress}`
            : payload.title
        );

        // The case may be assigned to this care manager seconds later.
        void queryClient.invalidateQueries({ queryKey: ['cm-cases'] });
        void queryClient.invalidateQueries({ queryKey: ['cm-me'] });
      });

      // Section B.1: Real-time case:assigned listener for Care Manager
      socket.on('case:assigned', (payload: any) => {
        if (!payload?.caseId) return;
        console.log('[SOCKET] Care Manager received case:assigned:', payload);

        Vibration.vibrate([0, 300, 100, 300]);
        void notifyNow(
          `Case Assigned · ${payload.caseNumber}`,
          `You have been assigned to case "${payload.title}" (${payload.priority})`
        );

        void queryClient.invalidateQueries({ queryKey: ['cm-cases'] });
        void queryClient.invalidateQueries({ queryKey: ['cm-me'] });
      });
    })();

    return () => {
      cancelled = true;
      socket?.off(EMERGENCY_EVENT);
      socket?.off('case:assigned');
      socket?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, queryClient]);

  return (
    <EmergencyContext.Provider value={{ connected, alert, history, dismiss }}>
      {children}
    </EmergencyContext.Provider>
  );
};

export function useEmergency(): EmergencyContextValue {
  return useContext(EmergencyContext);
}
