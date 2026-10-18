import * as Location from 'expo-location';

export interface Coords {
  latitude: number;
  longitude: number;
}

export type PermissionOutcome = 'granted' | 'denied' | 'unavailable';

/**
 * Asks for foreground location once. The OS only shows its dialog the first
 * time; afterwards this resolves immediately from the stored decision, so it is
 * safe to call before every location read.
 */
export async function ensureLocationPermission(): Promise<PermissionOutcome> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.granted) return 'granted';
    if (!current.canAskAgain) return 'denied';

    const asked = await Location.requestForegroundPermissionsAsync();
    return asked.granted ? 'granted' : 'denied';
  } catch {
    // No location provider on this device/simulator.
    return 'unavailable';
  }
}

/**
 * Current position, or `null` when permission is refused or no fix can be had.
 * Callers treat null as "send the update without coordinates" — a status change
 * must never be blocked because GPS is unavailable in a basement.
 *
 * The last known fix is tried first: it is instant and usually accurate enough
 * for dispatch, which keeps the radio (and the battery) out of the hot path.
 */
export async function getCoords(options?: { forceFresh?: boolean }): Promise<Coords | null> {
  const permission = await ensureLocationPermission();
  if (permission !== 'granted') return null;

  try {
    if (!options?.forceFresh) {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
      if (last) {
        return { latitude: last.coords.latitude, longitude: last.coords.longitude };
      }
    }

    const fix = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: fix.coords.latitude, longitude: fix.coords.longitude };
  } catch {
    return null;
  }
}

/** Rounded pin for display next to a timeline entry. */
export function formatCoords(lat?: number | null, lng?: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
