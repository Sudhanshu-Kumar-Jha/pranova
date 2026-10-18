import React from 'react';
import { Show, EditButton, useRecordContext } from 'react-admin';
import { Avatar, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import { Panel, DetailHeader, InfoGrid, InfoItem, SkeletonLines, initials, facts } from '../../ui/Panel.js';
import { ToneChip, StatusChip, PriorityChip } from '../../ui/StatusChip.js';
import { EmptyState } from '../../ui/EmptyState.js';
import { formatDate, formatDateTime, color } from '../../design/tokens.js';
import { LocationLink } from '../../ui/LocationLink.js';

const RecentCases: React.FC<{ cases: any[] }> = ({ cases }) => {
  const navigate = useNavigate();
  if (!cases?.length) {
    return <EmptyState compact icon={<MonitorHeartOutlinedIcon />} title="No cases" description="SOS alerts and coordination requests for this patient will be listed here." />;
  }
  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {cases.map((c, i) => (
        <Box
          component="li"
          key={c.id}
          role="link"
          tabIndex={0}
          onClick={() => navigate(`/cases/${c.id}/show`)}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/cases/${c.id}/show`); }}
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 1.25, px: 1, mx: -1,
            borderTop: i ? `1px solid ${color.lineSoft}` : 'none', borderRadius: '6px', cursor: 'pointer',
            '&:hover': { bgcolor: color.hover }, '&:focus-visible': { outline: `2px solid ${color.primary}` },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{c.title}</Typography>
            <Typography variant="caption" color="text.secondary" className="num">{facts(c.caseNumber, formatDateTime(c.createdAt))}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
            <PriorityChip value={c.priority} size="sm" />
            <StatusChip value={c.status} size="sm" />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const name = (r: any) => r?.fullName || `${r?.firstName ?? ''} ${r?.lastName ?? ''}`.trim() || 'Patient';

const PatientTitle: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? name(r) : 'Patient'}</span>;
};

const age = (dob?: string | null) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a >= 0 ? a : null;
};

const Content: React.FC = () => {
  const r = useRecordContext();
  if (!r) return <Box sx={{ p: 3 }}><SkeletonLines rows={6} /></Box>;
  const years = age(r.dateOfBirth);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${color.line}`, borderRadius: '10px', mb: 3 }}>
        <DetailHeader
          avatar={<Avatar alt="" sx={{ width: 56, height: 56, bgcolor: color.primarySoft, color: color.primary, fontSize: '1.1rem' }}>{initials(name(r))}</Avatar>}
          title={name(r)}
          status={r.bloodGroup ? <ToneChip tone="neutral">Blood group {r.bloodGroup}</ToneChip> : undefined}
          subtitle={facts(r.phone, r.email, r.city)}
          actions={<EditButton variant="outlined" />}
        />
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          <InfoGrid columns={4}>
            <InfoItem label="Gender">{r.gender}</InfoItem>
            <InfoItem label="Date of birth">{r.dateOfBirth ? `${formatDate(r.dateOfBirth)}${years !== null ? ` (${years} years)` : ''}` : null}</InfoItem>
            <InfoItem label="Account"><StatusChip value={r.status} size="sm" /></InfoItem>
            <InfoItem label="Registered">{r.createdAt ? formatDate(r.createdAt) : null}</InfoItem>
          </InfoGrid>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 3 }}>
        <Panel title="Recent cases" description="The five most recent cases for this patient.">
          <RecentCases cases={r.recentCases ?? []} />
        </Panel>
        <Panel title="Address">
          <InfoGrid columns={3}>
            <InfoItem label="Home" full>
              <LocationLink
                label="Home address"
                address={r.primaryAddress}
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
        <Panel title="Emergency contact">
          <InfoGrid columns={1}>
            <InfoItem label="Name">{r.emergencyContactName}</InfoItem>
            <InfoItem label="Phone">{r.emergencyContactPhone}</InfoItem>
          </InfoGrid>
        </Panel>
      </Box>
    </Box>
  );
};

export const PatientShow: React.FC = () => (
  <Show component="div" title={<PatientTitle />} actions={false}>
    <Content />
  </Show>
);
