import { client } from './client';

export interface LivePositionInput {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export interface LivePositionResult {
  currentLatitude: number | null;
  currentLongitude: number | null;
  lastLocationUpdate: string | null;
}

/**
 * Reports this device's position to the coordination server.
 *
 * It updates the patient's last known position only — never the registered
 * address or its delivery coordinates. The server exposes it to the response
 * team only while a case is open, so this is what makes an emergency dispatch
 * go to where the patient actually is rather than where they signed up.
 */
export async function pushLivePosition(input: LivePositionInput): Promise<LivePositionResult> {
  const res = await client.patch<{ data: LivePositionResult }>('/app/location', input);
  return res.data.data;
}
