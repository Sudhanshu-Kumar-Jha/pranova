import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Alert, useMediaQuery, Theme } from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { useNotify } from 'react-admin';
import { apiClient } from '../providers/dataProvider.js';

interface ExportCasesModalProps {
  open: boolean;
  onClose: () => void;
}

export const ExportCasesModal: React.FC<ExportCasesModalProps> = ({ open, onClose }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notify = useNotify();
  const fullScreen = useMediaQuery((t: Theme) => t.breakpoints.down('sm'));

  const handleExport = async () => {
    if (!reason || reason.trim().length < 3) {
      setError('Give a specific reason for this export (at least 3 characters).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/cases/export/excel', { reason: reason.trim() }, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PRANOVA_Cases_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      notify('Export downloaded. The reason was recorded in the audit log.', { type: 'success' });
      setReason('');
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'The export could not be generated. Try again.';
      setError(msg);
      notify(msg, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={fullScreen} aria-labelledby="export-title">
      <DialogTitle id="export-title">
        Export cases
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
          Downloads all cases as an Excel file.
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" icon={<ShieldOutlinedIcon fontSize="small" />} sx={{ mb: 2.5 }}>
          Case exports contain patient health information. Your reason is stored with this export in the audit log.
        </Alert>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          id="export-reason"
          autoFocus
          required
          label="Reason for export"
          placeholder="For example: Monthly quality review of response times"
          multiline
          minRows={3}
          value={reason}
          onChange={(e) => { setReason(e.target.value); if (error) setError(null); }}
          disabled={loading}
          fullWidth
          helperText="At least 3 characters."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading} color="inherit">Cancel</Button>
        <Button onClick={handleExport} variant="contained" disabled={loading || !reason.trim()}>
          {loading ? 'Preparing file…' : 'Download Excel file'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
