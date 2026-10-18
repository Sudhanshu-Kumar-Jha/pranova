import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { listMyCases, PatientCase } from '../api/cases';
import { pushLivePosition } from '../api/location';
import { getCurrentLocationDetails } from '../utils/location';

/** Cases where the response team still needs to know where the patient is. */
const ACTIVE_STATUSES: PatientCase['status'][] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS'];

/** How often a position is reported while a case is open and the app is in front. */
const ACTIVE_INTERVAL_MS = 60_000;

/** Floor between two reports, so a screen change cannot trigger a burst. */
const MIN_GAP_MS = 20_000;

interface LiveLocationContextValue {
  /** True while at least one case is open, i.e. while sharing is justified. */
  sharing: boolean;
  /** The open case driving the sharing, for the banner copy. */
  activeCase: PatientCase | null;
  /** When the last successful report went out. */
  lastReportedAt: Date | null;
  /** Set when the device refused or could not produce a fix. */
  problem: string | null;
  /** Report immediately — used right after an SOS. */
  reportNow: () => Promise<void>;
}

const LiveLocationContext = createContext<LiveLocationContextValue>({
  sharing: false,
  activeCase: null,
  lastReportedAt: null,
  problem: null,
  reportNow: async () => {},
});

/**
 * Reports the device's position while the patient has an open case.
 *
 * Deliberately *not* a background tracker: it runs only while the app is in the
 * foreground and only while a case is open, which is the window the patient's
 * consent covers. Outside that window nothing is sent, so the platform never
 * holds a location trail it has no reason to hold.
 */
export const LiveLocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [lastReportedAt, setLastReportedAt] = useState<Date | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const lastSentRef = useRef<number>(0);
  const inFlightRef = useRef(false);

  const casesQuery = useQuery({
    queryKey: ['my-cases', 'live-location'],
    queryFn: listMyCases,
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: isAuthenticated ? 60_000 : false,
  });

  const activeCase =
    casesQuery.data?.find((c) => ACTIVE_STATUSES.includes(c.status)) ?? null;
  const sharing = Boolean(activeCase);

  const report = useCallback(async () => {
    if (inFlightRef.current) return;
    if (Date.now() - lastSentRef.current < MIN_GAP_MS) return;

    inFlightRef.current = true;
    try {
      const outcome = await getCurrentLocationDetails();
      if (!outcome.success || !outcome.data) {
        setProblem(outcome.error || 'Your location could not be read from this device.');
        return;
      }

      await pushLivePosition({
        latitude: outcome.data.coords.latitude,
        longitude: outcome.data.coords.longitude,
      });

      lastSentRef.current = Date.now();
      setLastReportedAt(new Date());
      setProblem(null);
    } catch {
      // A failed report is not shown to the patient: the next tick retries, and
      // the SOS screen has its own, louder handling.
      setProblem(null);
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  // Report while a case is open and the app is in front.
  useEffect(() => {
    if (!isAuthenticated || !sharing) return;

    void report();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void report();
    }, ACTIVE_INTERVAL_MS);

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') void report();
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [isAuthenticated, sharing, report]);

  // Leaving the signed-in session clears local sharing state.
  useEffect(() => {
    if (!isAuthenticated) {
      setLastReportedAt(null);
      setProblem(null);
      lastSentRef.current = 0;
    }
  }, [isAuthenticated]);

  return (
    <LiveLocationContext.Provider
      value={{ sharing, activeCase, lastReportedAt, problem, reportNow: report }}
    >
      {children}
    </LiveLocationContext.Provider>
  );
};

export function useLiveLocation(): LiveLocationContextValue {
  return useContext(LiveLocationContext);
}
