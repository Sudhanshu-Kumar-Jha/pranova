import React from 'react';
import { Show, EditButton, useRecordContext } from 'react-admin';
import { Avatar, Box, Typography } from '@mui/material';
import { Panel, DetailHeader, InfoGrid, InfoItem, SkeletonLines, initials, facts } from '../../ui/Panel.js';
import { ToneChip } from '../../ui/StatusChip.js';
import { formatDateTime, color } from '../../design/tokens.js';
import { LocationLink } from '../../ui/LocationLink.js';

const name = (r: any) => r?.fullName || `${r?.firstName ?? ''} ${r?.lastName ?? ''}`.trim();

const CMTitle: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? name(r) : 'Care manager'}</span>;
};

const Content: React.FC = () => {
  const r = useRecordContext();
  if (!r) return <Box sx={{ p: 3 }}><SkeletonLines rows={6} /></Box>;
  const hasLocation = r.currentLatitude != null && r.currentLongitude != null;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${color.line}`, borderRadius: '10px', mb: 3 }}>
        <DetailHeader
          avatar={<Avatar alt="" sx={{ width: 56, height: 56, bgcolor: color.primarySoft, color: color.primary, fontSize: '1.1rem' }}>{initials(name(r))}</Avatar>}
          title={name(r)}
          status={<ToneChip tone={r.isAvailable ? 'success' : 'neutral'}>{r.isAvailable ? 'On duty' : 'Off duty'}</ToneChip>}
          subtitle={facts(r.employeeCode, r.specialization, r.assignedZone)}
          actions={<EditButton variant="outlined" />}
        />
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          <InfoGrid columns={4}>
            <InfoItem label="Phone">{r.phone}</InfoItem>
            <InfoItem label="Email">{r.email}</InfoItem>
            <InfoItem label="Licence">{r.licenseNumber}</InfoItem>
            <InfoItem label="Zone">{r.assignedZone}</InfoItem>
          </InfoGrid>
        </Box>
      </Box>

      <Panel title="Last known location" description="Reported by the Care Manager app when they update their availability.">
        {hasLocation ? (
          <InfoGrid columns={2}>
            <InfoItem label="Position">
              <LocationLink
                label={`Last known location - ${name(r)}`}
                latitude={r.currentLatitude}
                longitude={r.currentLongitude}
                emptyText="No location reported yet"
              />
            </InfoItem>
            <InfoItem label="Updated">{r.lastLocationUpdate ? formatDateTime(r.lastLocationUpdate) : null}</InfoItem>
          </InfoGrid>
        ) : (
          <Typography variant="body2" color="text.secondary">No location reported yet.</Typography>
        )}
      </Panel>
    </Box>
  );
};

export const CareManagerShow: React.FC = () => (
  <Show component="div" title={<CMTitle />} actions={false}>
    <Content />
  </Show>
);
