import React, { useState } from 'react';
import { useNotify, useRefresh, Confirm } from 'react-admin';
import { Box, Button, TextField, Typography } from '@mui/material';
import { apiClient } from '../providers/dataProvider.js';
import { statusMeta } from '../design/tokens.js';
import { Panel } from './Panel.js';

export interface WorkflowExtraField {
  key: string; // request body key, e.g. "prescriptionNote" / "reportUrl"
  label: string;
  helper?: string;
  appliesTo: string; // the target status that uses this field
  multiline?: boolean;
  type?: string;
}

interface StatusWorkflowProps {
  endpoint: string; // e.g. `/appointments/${id}/status`
  current: string;
  flow: Record<string, string[]>; // allowed next statuses per current status
  actionLabels: Record<string, string>; // verb label per target status
  destructive?: string[]; // statuses that need confirmation
  extraField?: WorkflowExtraField;
  entityName: string; // "appointment", "order"…
}

/**
 * Presents the next legal lifecycle steps for a record. The server remains the
 * authority on transitions; this only offers what the flow allows, confirms
 * irreversible moves, and reports the outcome clearly.
 */
export const StatusWorkflow: React.FC<StatusWorkflowProps> = ({
  endpoint, current, flow, actionLabels, destructive = [], extraField, entityName,
}) => {
  const notify = useNotify();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const [extra, setExtra] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  const options = flow[current] ?? [];
  const forward = options.filter((s) => !destructive.includes(s));
  const backward = options.filter((s) => destructive.includes(s));

  const apply = async (status: string) => {
    setBusy(true);
    try {
      const body: Record<string, string> = { status };
      if (extraField && status === extraField.appliesTo && extra.trim()) body[extraField.key] = extra.trim();
      await apiClient.patch(endpoint, body);
      notify(`${capitalize(entityName)} updated to “${statusMeta(status).label}”`, { type: 'success' });
      setExtra('');
      refresh();
    } catch (e: any) {
      notify(e?.response?.data?.message || `The ${entityName} could not be updated. Try again.`, { type: 'error' });
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  return (
    <Panel title="Next step" description={options.length ? `Currently “${statusMeta(current).label}”. Choose what happens next.` : undefined}>
      {options.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          This {entityName} is {statusMeta(current).label.toLowerCase()}. No further steps are available.
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {extraField && options.includes(extraField.appliesTo) && (
            <TextField
              id={`workflow-${extraField.key}`}
              label={extraField.label}
              helperText={extraField.helper}
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              multiline={extraField.multiline}
              minRows={extraField.multiline ? 3 : undefined}
              type={extraField.type}
              fullWidth
            />
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {forward.map((s, i) => (
              <Button key={s} variant={i === 0 ? 'contained' : 'outlined'} disabled={busy} onClick={() => apply(s)}>
                {actionLabels[s] ?? statusMeta(s).label}
              </Button>
            ))}
            {backward.map((s) => (
              <Button key={s} variant="text" color="error" disabled={busy} onClick={() => setConfirming(s)}>
                {actionLabels[s] ?? statusMeta(s).label}
              </Button>
            ))}
          </Box>
        </Box>
      )}

      <Confirm
        isOpen={!!confirming}
        loading={busy}
        title={confirming ? `${actionLabels[confirming] ?? statusMeta(confirming).label}?` : ''}
        content={`This can't be undone. The ${entityName} will be marked “${confirming ? statusMeta(confirming).label : ''}”.`}
        confirm={confirming ? actionLabels[confirming] ?? 'Confirm' : 'Confirm'}
        confirmColor="warning"
        cancel="Keep as is"
        onConfirm={() => confirming && apply(confirming)}
        onClose={() => setConfirming(null)}
      />
    </Panel>
  );
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default StatusWorkflow;
