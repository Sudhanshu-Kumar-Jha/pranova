import * as Location from 'expo-location';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface ResolvedLocation {
  coords: LocationCoordinates;
  primaryAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  formattedAddress: string;
}

export interface LocationOutcome {
  success: boolean;
  data?: ResolvedLocation;
  error?: string;
}

/**
 * Ensures foreground location permissions are granted by device/OS.
 */
export async function ensureLocationPermission(): Promise<boolean> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;

    const requested = await Location.requestForegroundPermissionsAsync();
    return requested.granted;
  } catch (err) {
    console.warn('[Location] Failed checking location permissions:', err);
    return false;
  }
}

/**
 * Fetches current device GPS coordinates and reverse-geocodes into a human-readable street address.
 */
export async function getCurrentLocationDetails(options?: {
  timeoutMs?: number;
}): Promise<LocationOutcome> {
  const hasPermission = await ensureLocationPermission();
  if (!hasPermission) {
    return {
      success: false,
      error: 'Location permission was denied. Please allow location access in your device settings.',
    };
  }

  try {
    // 1. Try to get quick last-known position or fresh position
    let coords: LocationCoordinates | null = null;

    try {
      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 20_000 });
      if (lastKnown?.coords) {
        coords = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
      }
    } catch {
      // Continue to fresh position fetch
    }

    if (!coords) {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    }

    if (!coords) {
      return {
        success: false,
        error: 'Unable to determine GPS location from device sensors.',
      };
    }

    // 2. Perform reverse-geocoding into street address, city, state, postal code
    let primaryAddress: string | undefined;
    let city: string | undefined;
    let state: string | undefined;
    let pincode: string | undefined;
    let formattedAddress = `GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;

    try {
      const geocoded = await Location.reverseGeocodeAsync(coords);
      if (geocoded && geocoded.length > 0) {
        const place = geocoded[0];

        const streetParts = [
          place.streetNumber,
          place.street || place.name,
        ].filter(Boolean);

        const streetLine = streetParts.join(' ').trim();
        city = place.city || place.subregion || place.district || undefined;
        state = place.region || undefined;
        pincode = place.postalCode ? place.postalCode.replace(/\D/g, '') : undefined;

        if (place.formattedAddress) {
          formattedAddress = place.formattedAddress;
          primaryAddress = streetLine || place.formattedAddress;
        } else {
          const parts = [
            streetLine,
            place.district && place.district !== city ? place.district : null,
            city,
            state,
            pincode,
          ].filter(Boolean);

          if (parts.length > 0) {
            formattedAddress = parts.join(', ');
            primaryAddress = streetLine || parts[0] || formattedAddress;
          }
        }
      }
    } catch (geoErr) {
      console.warn('[Location] Reverse-geocoding warning:', geoErr);
    }

    return {
      success: true,
      data: {
        coords,
        primaryAddress: primaryAddress || formattedAddress,
        city,
        state,
        pincode,
        formattedAddress,
      },
    };
  } catch (err: any) {
    console.error('[Location] Error fetching current location:', err);
    return {
      success: false,
      error: err?.message || 'Could not acquire GPS position.',
    };
  }
}
