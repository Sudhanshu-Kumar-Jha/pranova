import React, { useState } from 'react';
import { Show, EditButton, useRecordContext, useUpdate, useNotify, useRefresh, Confirm } from 'react-admin';
import { Box, Button } from '@mui/material';
import { Panel, DetailHeader, InfoGrid, InfoItem, SkeletonLines, facts } from '../../ui/Panel.js';
import { StatusChip } from '../../ui/StatusChip.js';
import { color } from '../../design/tokens.js';
import { LocationLink } from '../../ui/LocationLink.js';

const TYPE_LABEL: Record<string, string> = {
  HOSPITAL: 'Hospital',
  LAB: 'Diagnostic lab',
  CLINIC: 'Specialty clinic',
  AMBULANCE: 'Ambulance service',
  PHARMACY: 'Pharmacy',
};

type ProviderStatus = 'ACTIVE' | 'PAUSED' | 'DEACTIVATED';

const ProviderTitle: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? r.name : 'Provider'}</span>;
};

const StatusActions: React.FC = () => {
  const record = useRecordContext();
  const [update, { isPending }] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (!record) return null;

  const setStatus = (status: ProviderStatus) => {
    update(
      'providers',
      { id: record.id, data: { status }, previousData: record },
      {
        onSuccess: () => {
          notify(`${record.name} is now ${status.toLowerCase()}`, { type: 'success' });
          refresh();
          setConfirmOpen(false);
        },
        onError: (error: any) => {
          notify(`Status could not be changed: ${error.message}`, { type: 'error' });
          setConfirmOpen(false);
        },
      }
    );
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {record.status !== 'ACTIVE' && (
        <Button variant="contained" disabled={isPending} onClick={() => setStatus('ACTIVE')}>Activate</Button>
      )}
      {record.status !== 'PAUSED' && (
        <Button variant="outlined" disabled={isPending} onClick={() => setStatus('PAUSED')}>Pause operations</Button>
      )}
      {record.status !== 'DEACTIVATED' && (
        <Button variant="text" color="error" disabled={isPending} onClick={() => setConfirmOpen(true)}>Deactivate</Button>
      )}
      <Confirm
        isOpen={confirmOpen}
        loading={isPending}
        title={`Deactivate ${record.name}?`}
        content="The provider will be marked as deactivated. You can reactivate it at any time."
        confirm="Deactivate"
        confirmColor="warning"
        cancel="Cancel"
        onConfirm={() => setStatus('DEACTIVATED')}
        onClose={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

const Content: React.FC = () => {
  const r = useRecordContext();
  if (!r) return <Box sx={{ p: 3 }}><SkeletonLines rows={6} /></Box>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${color.line}`, borderRadius: '10px', mb: 3 }}>
        <DetailHeader
          title={r.name}
          status={<StatusChip value={r.status} />}
          subtitle={facts(TYPE_LABEL[r.type] ?? r.type, r.city, r.state)}
          actions={<EditButton variant="outlined" />}
        />
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          <InfoGrid columns={4}>
            <InfoItem label="Rating">{r.rating != null ? `${Number(r.rating).toFixed(1)} of 5` : null}</InfoItem>
            <InfoItem label="Cases routed">{r.casesCount != null ? String(r.casesCount) : null}</InfoItem>
            <InfoItem label="Operating hours">{r.operatingHours}</InfoItem>
            <InfoItem label="Licence">{r.licenseNumber}</InfoItem>
          </InfoGrid>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Panel title="Contact">
            <InfoGrid columns={2}>
              <InfoItem label="Contact person">{r.contactPerson}</InfoItem>
              <InfoItem label="Phone">{r.phone}</InfoItem>
              <InfoItem label="Email">{r.email}</InfoItem>
            </InfoGrid>
          </Panel>
          <Panel title="Location">
            <InfoGrid columns={3}>
              <InfoItem label="Facility" full>
                <LocationLink
                  label="Facility location"
                  address={r.address}
                  city={r.city}
                  pincode={r.pincode}
                  latitude={r.latitude}
                  longitude={r.longitude}
                  emptyText="No address recorded"
                />
              </InfoItem>
              <InfoItem label="State">{r.state}</InfoItem>
            </InfoGrid>
          </Panel>
        </Box>
        <Panel title="Operational status" description="Pause a provider temporarily, or deactivate it when the partnership ends.">
          <StatusActions />
        </Panel>
      </Box>
    </Box>
  );
};

export const ProviderShow: React.FC = () => (
  <Show component="div" title={<ProviderTitle />} actions={false}>
    <Content />
  </Show>
);
