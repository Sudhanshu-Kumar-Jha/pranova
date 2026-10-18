import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, Alert, Skeleton, Radio,
  useMediaQuery, Theme,
} from '@mui/material';
import { useDataProvider, useNotify, useRefresh } from 'react-admin';
import { apiClient } from '../../providers/dataProvider.js';
import { ToneChip } from '../../ui/StatusChip.js';
import { EmptyState } from '../../ui/EmptyState.js';
import { facts } from '../../ui/Panel.js';
import { color } from '../../design/tokens.js';

interface AssignCaseDialogProps {
  open: boolean;
  onClose: () => void;
  caseId: string;
  caseNumber: string;
  currentCareManagerId?: string | null;
}

const cmName = (cm: any) => cm.fullName || `${cm.firstName ?? ''} ${cm.lastName ?? ''}`.trim();

export const AssignCaseDialog: React.FC<AssignCaseDialogProps> = ({ open, onClose, caseId, caseNumber, currentCareManagerId }) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const fullScreen = useMediaQuery((t: Theme) => t.breakpoints.down('sm'));

  const [careManagers, setCareManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCMId, setSelectedCMId] = useState<string>(currentCareManagerId || '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSelectedCMId(currentCareManagerId || '');
    setNotes('');
    dataProvider
      .getList('care-managers', { pagination: { page: 1, perPage: 50 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} })
      .then(({ data }) => setCareManagers(data))
      .catch(() => setError('The care manager list could not be loaded. Close this dialog and try again.'))
      .finally(() => setLoading(false));
  }, [open, caseId, currentCareManagerId, dataProvider]);

  // Available people first, then alphabetical.
  const sorted = useMemo(
    () => [...careManagers].sort((a, b) => Number(!!b.isAvailable) - Number(!!a.isAvailable) || cmName(a).localeCompare(cmName(b))),
    [careManagers]
  );

  const handleConfirm = async () => {
    if (!selectedCMId) {
      setError('Choose a care manager to assign.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.patch(`/cases/${caseId}/assign`, { careManagerId: selectedCMId, notes: notes.trim() || undefined });
      const who = careManagers.find((c) => c.id === selectedCMId);
      notify(`Case ${caseNumber} assigned to ${who ? cmName(who) : 'the care manager'}`, { type: 'success' });
      refresh();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'The case could not be assigned. Try again.';
      setError(msg);
      notify(msg, { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={fullScreen} aria-labelledby="assign-title">
      <DialogTitle id="assign-title">
        {currentCareManagerId ? 'Reassign care manager' : 'Assign a care manager'}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
          Case {caseNumber}. It appears in their Care Manager app case list.
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'grid', gap: 1, mt: 1 }} aria-busy="true">
            {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={58} />)}
          </Box>
        ) : sorted.length === 0 ? (
          <EmptyState compact title="No care managers yet" description="Add a care manager first, then come back to assign this case." action={<Button href="#/care-managers/create" variant="outlined">Add care manager</Button>} />
        ) : (
          <Box
            role="radiogroup"
            aria-label="Care managers"
            // minmax(0,1fr): without it the implicit track grows to the widest no-wrap caption
            // and the list scrolls sideways, clipping the duty chips.
            sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 1, mt: 1, maxHeight: 340, overflowY: 'auto', overflowX: 'hidden', pr: 0.5 }}
          >
            {sorted.map((cm) => {
              const selected = selectedCMId === cm.id;
              return (
                <Box
                  key={cm.id}
                  component="label"
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 1.25, borderRadius: '8px', cursor: 'pointer',
                    border: `1px solid ${selected ? color.primary : color.line}`,
                    bgcolor: selected ? color.primarySoft : 'background.paper',
                    transition: 'border-color 120ms, background-color 120ms',
                    '&:hover': { borderColor: selected ? color.primary : color.subtle },
                  }}
                >
                  <Radio checked={selected} onChange={() => setSelectedCMId(cm.id)} value={cm.id} size="small" inputProps={{ 'aria-label': cmName(cm) }} sx={{ p: 0.5 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {cmName(cm)}{cm.id === currentCareManagerId ? ' (current)' : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="div" noWrap>
                      {facts(cm.employeeCode, cm.specialization, cm.assignedZone && `Zone ${cm.assignedZone}`, cm.currentLatitude != null ? '📍 GPS active' : null) || 'No details'}
                    </Typography>
                  </Box>
                  <Box sx={{ flexShrink: 0 }}>
                    <ToneChip tone={cm.isAvailable ? 'success' : 'neutral'} size="sm">{cm.isAvailable ? 'On duty' : 'Off duty'}</ToneChip>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        <TextField
          id="assign-notes"
          label="Instructions for the care manager (optional)"
          placeholder="For example: Patient needs oxygen support during transport."
          multiline
          minRows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          sx={{ mt: 2.5 }}
          disabled={submitting}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={submitting} color="inherit">Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={submitting || loading || !selectedCMId}>
          {submitting ? 'Assigning…' : currentCareManagerId ? 'Reassign' : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
