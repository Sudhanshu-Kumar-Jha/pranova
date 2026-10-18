import React, { useEffect, useState } from 'react';
import { SOCKET_URL, API_URL } from '../config.js';
import { io, Socket } from 'socket.io-client';
import { useNotify, useRefresh } from 'react-admin';
import { Dialog, DialogContent, DialogActions, Button, Box, Typography, Link, useMediaQuery, Theme, CircularProgress } from '@mui/material';
import CrisisAlertOutlinedIcon from '@mui/icons-material/CrisisAlertOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { playEmergencyChime } from '../utils/sound.js';
import { color } from '../design/tokens.js';
import { InfoGrid, InfoItem } from '../ui/Panel.js';
import { LocationLink } from '../ui/LocationLink.js';

interface EmergencyData {
  caseId: string;
  caseNumber: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  incidentAddress?: string | null;
  /** How the pin was obtained: a live fix, a last-known one, or nothing. */
  locationSource?: 'LIVE' | 'LAST_KNOWN' | 'NONE';
  incidentLatitude?: number | null;
  incidentLongitude?: number | null;
  timestamp: string;
}

export const EmergencyAlertListener: React.FC = () => {
  const notify = useNotify();
  const refresh = useRefresh();
  const fullScreen = useMediaQuery((t: Theme) => t.breakpoints.down('sm'));
  const [activeEmergency, setActiveEmergency] = useState<EmergencyData | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const token = localStorage.getItem('pranova_access_token');
    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 2000,
      auth: { token: token || undefined },
    });

    socket.on('connect', () => {
      console.log('[SOCKET] Authenticated connection to PRANOVA real-time gateway:', socket.id);
      socket.emit('admin:join');
    });

    socket.on('admin:new_emergency', (data: EmergencyData) => {
      console.log('[REALTIME] New emergency alert received:', data);
      playEmergencyChime();
      setActiveEmergency(data);
      notify(`P1 emergency: ${data.caseNumber}, ${data.patientName}`, { type: 'warning', autoHideDuration: 15000 });
      refresh();
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`PRANOVA emergency: ${data.caseNumber}`, {
            body: `${data.patientName} raised an SOS at ${data.incidentAddress || 'their GPS location'}`,
          });
        } catch {
          /* notification blocked by the browser */
        }
      }
    });

    // Also listen for other admin acknowledgements to dismiss the dialog in multi-operator desks
    socket.on('admin:emergency_acknowledged', (payload: { caseId: string }) => {
      setActiveEmergency((prev) => (prev?.caseId === payload.caseId ? null : prev));
      refresh();
    });

    return () => {
      socket.disconnect();
    };
  }, [notify, refresh]);

  const handleAcknowledge = async (redirectToShow = false) => {
    if (!activeEmergency) return;
    setAcknowledging(true);
    try {
      const token = localStorage.getItem('pranova_access_token');
      const res = await fetch(`${API_URL}/cases/${activeEmergency.caseId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to acknowledge alert');
      }

      const caseId = activeEmergency.caseId;
      notify(`Case ${activeEmergency.caseNumber} emergency alert acknowledged`, { type: 'success' });
      setActiveEmergency(null);
      refresh();

      if (redirectToShow) {
        window.location.hash = `#/cases/${caseId}/show`;
      }
    } catch (err: any) {
      notify(err.message || 'Error recording acknowledgement', { type: 'error' });
    } finally {
      setAcknowledging(false);
    }
  };

  if (!activeEmergency) return null;
  const e = activeEmergency;
  const raised = new Date(e.timestamp);

  return (
    <Dialog
      open
      disableEscapeKeyDown
      onClose={undefined}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="sos-title"
      aria-describedby="sos-desc"
      role="alertdialog"
      PaperProps={{ sx: { border: `2px solid ${color.error}`, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.45)' } }}
    >
      <Box sx={{ bgcolor: color.error, color: '#fff', px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <CrisisAlertOutlinedIcon aria-hidden sx={{ fontSize: '1.75rem' }} />
          <Typography id="sos-title" component="h2" sx={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.02em' }}>
            CRITICAL P1 EMERGENCY SOS
          </Typography>
          <Box aria-hidden className="pulse-emergency" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#fff' }} />
        </Box>
        <Typography variant="body2" className="num" sx={{ opacity: 0.95, fontWeight: 700 }}>
          {Number.isNaN(raised.getTime()) ? '' : `Raised ${raised.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`}
        </Typography>
      </Box>

      <DialogContent sx={{ pt: 2.5 }}>
        <Typography variant="h6" component="p" sx={{ mb: 0.5, fontWeight: 700 }}>{e.title}</Typography>
        <Typography variant="body2" color="text.secondary" id="sos-desc">
          {e.caseNumber}{e.description ? `. ${e.description}` : ''}
        </Typography>

        <Box sx={{ mt: 2.5, p: 2, borderRadius: '10px', bgcolor: color.errorSoft, border: `1px solid ${color.line}` }}>
          <InfoGrid columns={2}>
            <InfoItem label="Patient Name">
              <Box component="span" sx={{ fontWeight: 700 }}>{e.patientName}</Box>
            </InfoItem>
            <InfoItem label="Clinical PHI">
              <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary' }}>Available in Case Record</Box>
            </InfoItem>
            <InfoItem label="Emergency Phone">
              {e.patientPhone ? <Link href={`tel:${e.patientPhone}`} sx={{ fontWeight: 700, color: color.error }}>{e.patientPhone}</Link> : 'Not on file'}
            </InfoItem>
            <InfoItem label="Incident Location" full>
              <LocationLink
                label="Incident location"
                variant="link"
                address={e.incidentAddress || undefined}
                latitude={e.incidentLatitude || undefined}
                longitude={e.incidentLongitude || undefined}
                emptyText="Location Unavailable (No GPS Fix)"
              />
              {/* A dispatcher has to know whether this pin came from the
                  patient's device just now or is older — the two are not
                  equally safe to drive to. */}
              {e.locationSource === 'LAST_KNOWN' && (
                <Box component="div" sx={{ mt: 0.5, fontSize: '0.75rem', color: color.warning, fontWeight: 600 }}>
                  Last known device position — not a fresh fix. Confirm with the patient.
                </Box>
              )}
              {e.locationSource === 'NONE' && (
                <Box component="div" sx={{ mt: 0.5, fontSize: '0.75rem', color: color.error, fontWeight: 600 }}>
                  The device sent no position. Call the patient — the registered address may be the wrong city.
                </Box>
              )}
            </InfoItem>
          </InfoGrid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        {/* Section B.4: Mandatory Forced Emergency Acknowledgement */}
        <Button
          variant="outlined"
          color="inherit"
          disabled={acknowledging}
          onClick={() => handleAcknowledge(false)}
          startIcon={acknowledging ? <CircularProgress size={16} /> : <CheckCircleOutlineIcon />}
          sx={{ fontWeight: 700 }}
        >
          Acknowledge Alert
        </Button>
        <Button
          variant="contained"
          color="error"
          autoFocus
          disabled={acknowledging}
          onClick={() => handleAcknowledge(true)}
          sx={{ fontWeight: 800, px: 3 }}
        >
          {acknowledging ? 'Recording...' : 'Acknowledge & Dispatch'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
