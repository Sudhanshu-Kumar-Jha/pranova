import React, { useState, useEffect } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Link, Tooltip,
  IconButton, Alert, useMediaQuery, Theme, CircularProgress,
} from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DirectionsOutlinedIcon from '@mui/icons-material/DirectionsOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { color } from '../design/tokens.js';

export interface LocationValue {
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface LocationLinkProps extends LocationValue {
  /** Dialog heading, e.g. "Incident location". */
  label?: string;
  /** `link` shows the address as a clickable line; `button` shows a compact action. */
  variant?: 'link' | 'button';
  emptyText?: string;
}

const hasCoords = (v: LocationValue) =>
  typeof v.latitude === 'number' && typeof v.longitude === 'number' &&
  Number.isFinite(v.latitude) && Number.isFinite(v.longitude);

/** Street address as one clean, readable line without newlines or stray whitespace. */
export function addressLine(v: LocationValue): string {
  const cleanAddr = v.address ? v.address.replace(/[\r\n]+/g, ', ').replace(/\s+/g, ' ').trim() : '';
  return [cleanAddr, v.city?.trim(), v.pincode?.trim()].filter(Boolean).join(', ');
}

/** What the map should centre on: the address if we have one, else the pin. */
function mapQuery(v: LocationValue): string {
  const line = addressLine(v);
  if (line) return line;
  return hasCoords(v) ? `${v.latitude},${v.longitude}` : '';
}

function googleMapsUrl(v: LocationValue): string {
  const q = hasCoords(v) ? `${v.latitude},${v.longitude}` : mapQuery(v);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function directionsUrl(v: LocationValue): string {
  const q = hasCoords(v) ? `${v.latitude},${v.longitude}` : mapQuery(v);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

function osmUrl(v: LocationValue): string {
  if (hasCoords(v)) {
    return `https://www.openstreetmap.org/?mlat=${v.latitude}&mlon=${v.longitude}#map=17/${v.latitude}/${v.longitude}`;
  }
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(mapQuery(v))}`;
}

/** Embeddable OSM map with a marker. Needs coordinates; no API key, no SDK. */
function embedUrl(lat?: number | null, lon?: number | null): string | null {
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  const d = 0.005; // ~500 m around the pin
  const bbox = [lon - d, lat - d, lon + d, lat + d].map((n) => n.toFixed(6)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lon}`;
}

const geocodeReverseCache = new Map<string, string>();
const geocodeCoordsCache = new Map<string, { lat: number; lon: number }>();

/**
 * A location the user can actually look at: readable address up front, one
 * click to an embedded map. If no GPS pin was provided, forward-geocodes
 * the street address so the interactive map is always displayed.
 */
export const LocationLink: React.FC<LocationLinkProps> = ({
  label = 'Location', variant = 'link', emptyText, ...value
}) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedCoords, setResolvedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const fullScreen = useMediaQuery((t: Theme) => t.breakpoints.down('sm'));

  const line = addressLine(value);
  const coords = hasCoords(value);

  // 1. Reverse-geocode coordinates to address if only coords were provided
  useEffect(() => {
    if (line || !coords || value.latitude == null || value.longitude == null) return;
    const key = `${Number(value.latitude).toFixed(4)},${Number(value.longitude).toFixed(4)}`;
    if (geocodeReverseCache.has(key)) {
      setResolvedAddress(geocodeReverseCache.get(key)!);
      return;
    }
    let active = true;
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${value.latitude}&lon=${value.longitude}&zoom=16`, {
      headers: { 'Accept-Language': 'en' }
    })
      .then((res) => res.json())
      .then((data) => {
        if (!active || !data) return;
        const display = data.display_name?.split(',').slice(0, 3).join(',').trim() || data.name;
        if (display) {
          geocodeReverseCache.set(key, display);
          setResolvedAddress(display);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [line, coords, value.latitude, value.longitude]);

  // 2. Forward-geocode street address to coordinates if no GPS pin was recorded
  useEffect(() => {
    if (coords || !line) return;

    if (geocodeCoordsCache.has(line)) {
      setResolvedCoords(geocodeCoordsCache.get(line)!);
      return;
    }

    let active = true;
    setIsGeocoding(true);

    const cleanLine = line.replace(/[\r\n]+/g, ', ').replace(/\s+/g, ' ');
    const parts = cleanLine.split(',').map((s) => s.trim()).filter(Boolean);

    // Build progressive candidate queries: full address down to locality and pincode
    const candidates: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      candidates.push(parts.slice(i).join(', '));
    }
    if (value.pincode && value.city) {
      candidates.push(`${value.pincode}, ${value.city}, India`);
    }
    if (value.city) {
      candidates.push(`${value.city}, India`);
    }

    (async () => {
      for (const candidate of candidates) {
        if (!active) return;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(candidate)}&limit=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          if (active && Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
            const found = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
            geocodeCoordsCache.set(line, found);
            setResolvedCoords(found);
            setIsGeocoding(false);
            return;
          }
        } catch {
          // Continue to next candidate
        }
      }
      if (active) {
        setIsGeocoding(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [coords, line, value.city, value.pincode]);

  if (!line && !coords) {
    return <Box component="span" sx={{ color: 'text.disabled' }}>{emptyText ?? 'Not provided'}</Box>;
  }

  // Effective coordinates: either recorded GPS or forward-geocoded from street address
  const effectiveLat = coords ? (value.latitude as number) : resolvedCoords?.lat;
  const effectiveLon = coords ? (value.longitude as number) : resolvedCoords?.lon;
  const effectiveCoords = typeof effectiveLat === 'number' && typeof effectiveLon === 'number';
  const effectiveValue: LocationValue = {
    ...value,
    address: line,
    latitude: effectiveLat,
    longitude: effectiveLon,
  };

  const embed = embedUrl(effectiveLat, effectiveLon);

  // Clear place label for the trigger button
  const coordText = coords ? `GPS: ${Number(value.latitude).toFixed(4)}, ${Number(value.longitude).toFixed(4)}` : 'Location';
  const primary = line || (resolvedAddress ? `${resolvedAddress} (${Number(value.latitude).toFixed(4)}, ${Number(value.longitude).toFixed(4)})` : coordText);

  const copyCoords = async () => {
    if (!effectiveCoords) return;
    try {
      await navigator.clipboard.writeText(`${effectiveLat}, ${effectiveLon}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const trigger =
    variant === 'button' ? (
      <Button size="small" variant="outlined" startIcon={<PlaceOutlinedIcon />} onClick={() => setOpen(true)}>
        View on map
      </Button>
    ) : (
      <Box
        component="button"
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label}: ${primary}. View on map`}
        sx={{
          all: 'unset',
          display: 'inline-flex',
          alignItems: 'flex-start',
          gap: 0.75,
          cursor: 'pointer',
          color: 'primary.main',
          fontWeight: 500,
          borderRadius: '4px',
          '&:hover .pnv-loc-text': { textDecoration: 'underline' },
          '&:focus-visible': { outline: `2px solid ${color.primary}`, outlineOffset: 2 },
        }}
      >
        <PlaceOutlinedIcon aria-hidden sx={{ fontSize: 18, mt: '1px', flexShrink: 0 }} />
        <Box component="span" className="pnv-loc-text">{primary}</Box>
      </Box>
    );

  return (
    <>
      {trigger}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby="map-dialog-title"
      >
        <DialogTitle id="map-dialog-title">
          {label}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
            {primary}
          </Typography>
        </DialogTitle>

        <DialogContent>
          {embed ? (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: { xs: '4 / 3', sm: '16 / 9' },
                maxHeight: '52vh', // keep the whole dialog on screen on short laptops
                borderRadius: '10px',
                overflow: 'hidden',
                border: `1px solid ${color.line}`,
                bgcolor: color.surfaceSunken,
              }}
            >
              <Box
                component="iframe"
                title={`Map showing ${primary}`}
                src={embed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              />
            </Box>
          ) : isGeocoding ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                aspectRatio: { xs: '4 / 3', sm: '16 / 9' },
                maxHeight: '52vh',
                borderRadius: '10px',
                bgcolor: color.surfaceSunken,
                border: `1px solid ${color.line}`,
                gap: 1.5,
              }}
            >
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">
                Locating address on map...
              </Typography>
            </Box>
          ) : (
            <Alert severity="info">
              Locating street address. Open it in Google Maps or OpenStreetMap below to view directions.
            </Alert>
          )}

          {effectiveCoords && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                {coords ? 'GPS pin' : 'Resolved location'}
              </Typography>
              <Typography variant="caption" className="num" sx={{ color: 'text.primary', fontWeight: 600 }}>
                {effectiveLat?.toFixed(5)}, {effectiveLon?.toFixed(5)}
              </Typography>
              <Tooltip title={copied ? 'Copied' : 'Copy coordinates'}>
                <IconButton size="small" onClick={copyCoords} aria-label="Copy coordinates" sx={{ color: 'text.secondary' }}>
                  <ContentCopyOutlinedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              {copied && <Typography variant="caption" sx={{ color: color.success }}>Copied</Typography>}
            </Box>
          )}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
            <Link href={googleMapsUrl(effectiveValue)} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <OpenInNewIcon sx={{ fontSize: 15 }} /> Google Maps
            </Link>
            <Link href={osmUrl(effectiveValue)} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <OpenInNewIcon sx={{ fontSize: 15 }} /> OpenStreetMap
            </Link>
            <Link href={directionsUrl(effectiveValue)} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <DirectionsOutlinedIcon sx={{ fontSize: 16 }} /> Directions
            </Link>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)} color="inherit">Close</Button>
          <Button variant="contained" href={directionsUrl(effectiveValue)} target="_blank" rel="noopener noreferrer" startIcon={<DirectionsOutlinedIcon />}>
            Get directions
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LocationLink;
