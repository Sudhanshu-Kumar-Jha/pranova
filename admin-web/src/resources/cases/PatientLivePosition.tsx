import React from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import MyLocationOutlinedIcon from '@mui/icons-material/MyLocationOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { apiClient } from '../../providers/dataProvider.js';
import { LocationLink } from '../../ui/LocationLink.js';
import { ToneChip } from '../../ui/StatusChip.js';
import { formatDateTime, color } from '../../design/tokens.js';

interface PatientLocationView {
  available: boolean;
  reason?: string;
  latitude?: number;
  longitude?: number;
  updatedAt?: string;
  ageMinutes?: number;
  freshness?: 'LIVE' | 'STALE';
  sharingExpiresAt?: string | null;
}

/** Cases where the patient's device is still expected to report a position. */
const ACTIVE_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS'];

/**
 * The position the patient's own device reported, which is what dispatch
 * should drive to. It is deliberately separate from the incident address and
 * from the patient's home address: either can be in a different city.
 *
 * The server only serves this while the case is active, so the panel explains
 * itself rather than showing an error once a case closes.
 */
export const PatientLivePosition: React.FC<{ caseId?: string; status?: string }> = ({
  caseId,
  status,
}) => {
  const [data, setData] = React.useState<PatientLocationView | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const isActive = Boolean(status && ACTIVE_STATUSES.includes(status));

  const load = React.useCallback(async () => {
    if (!caseId || !isActive) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/cases/${caseId}/patient-location`);
      setData(res.data?.data ?? null);
    } catch (err: any) {
      setData(null);
      setError(
        err?.response?.data?.message ||
          'The patient position could not be loaded. Try again in a moment.'
      );
    } finally {
      setLoading(false);
    }
  }, [caseId, isActive]);

  // Refresh while the case is open so a moving patient does not go stale on
  // screen; stops as soon as the case closes.
  React.useEffect(() => {
    if (!isActive) return;
    void load();
    const timer = setInterval(() => void load(), 45_000);
    return () => clearInterval(timer);
  }, [isActive, load]);

  if (!isActive) {
    return (
      <Typography variant="body2" sx={{ color: color.muted }}>
        Location sharing ended when this case closed. Only active cases share a patient position.
      </Typography>
    );
  }

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" sx={{ color: color.muted }}>
          Reading the patient's last reported position…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'grid', gap: 1.5, justifyItems: 'start' }}>
        <Typography variant="body2" sx={{ color: color.muted }}>
          {error}
        </Typography>
        <Button size="small" startIcon={<RefreshOutlinedIcon />} onClick={() => void load()}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!data?.available) {
    return (
      <Typography variant="body2" sx={{ color: color.muted }}>
        {data?.reason ||
          'The patient device has not reported a position yet. Call the patient to confirm where they are.'}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 1.25, justifyItems: 'start' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MyLocationOutlinedIcon sx={{ fontSize: 18, color: color.muted }} />
        <LocationLink
          label="Patient live position"
          latitude={data.latitude}
          longitude={data.longitude}
          emptyText="No position reported"
        />
        <ToneChip tone={data.freshness === 'LIVE' ? 'success' : 'warning'} size="sm">
          {data.freshness === 'LIVE' ? 'Live' : 'Last known'}
        </ToneChip>
      </Box>

      <Typography variant="caption" sx={{ color: color.muted }}>
        {data.ageMinutes === 0 ? 'Updated just now' : `Updated ${data.ageMinutes} min ago`}
        {data.updatedAt ? ` · ${formatDateTime(data.updatedAt)}` : ''}
        {data.sharingExpiresAt ? ` · sharing until ${formatDateTime(data.sharingExpiresAt)}` : ''}
      </Typography>

      <Button size="small" startIcon={<RefreshOutlinedIcon />} onClick={() => void load()}>
        Refresh
      </Button>
    </Box>
  );
};
