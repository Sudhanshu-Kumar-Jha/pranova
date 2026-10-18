import React from 'react';
import { Show, EditButton, useRecordContext } from 'react-admin';
import { Avatar, Box, Typography } from '@mui/material';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import { Panel, DetailHeader, InfoGrid, InfoItem, SkeletonLines, initials, facts } from '../../ui/Panel.js';
import { StatusChip, ToneChip } from '../../ui/StatusChip.js';
import { EmptyState } from '../../ui/EmptyState.js';
import { formatINR, humanize, color } from '../../design/tokens.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DoctorTitle: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? `Dr. ${r.firstName} ${r.lastName}` : 'Doctor'}</span>;
};

const Availability: React.FC<{ slots: any[] }> = ({ slots }) => {
  if (!slots?.length) {
    return <EmptyState compact icon={<EventBusyOutlinedIcon />} title="No weekly hours set" description="Patients can't pick a time until availability is added for this doctor." />;
  }
  const byDay = DAYS.map((d, i) => ({ day: d, slots: slots.filter((s) => s.dayOfWeek === i) })).filter((d) => d.slots.length);
  return (
    <Box component="dl" sx={{ m: 0, display: 'grid', gap: 0 }}>
      {byDay.map((d, i) => (
        <Box
          key={d.day}
          sx={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', alignItems: 'center', gap: 2, py: 1.25, borderTop: i ? `1px solid ${color.lineSoft}` : 'none' }}
        >
          <Typography component="dt" variant="body2" sx={{ fontWeight: 600 }}>{d.day}</Typography>
          <Box component="dd" sx={{ m: 0, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {d.slots.map((s) => (
              <Box key={s.id} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" className="num">{s.startTime}–{s.endTime}</Typography>
                <ToneChip tone={s.type === 'IN_CLINIC' ? 'neutral' : 'primary'} size="sm">{humanize(s.type)}</ToneChip>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const Content: React.FC = () => {
  const r = useRecordContext();
  if (!r) return <Box sx={{ p: 3 }}><SkeletonLines rows={6} /></Box>;
  const name = `Dr. ${r.firstName} ${r.lastName}`;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${color.line}`, borderRadius: '10px', mb: 3 }}>
        <DetailHeader
          avatar={
            <Avatar src={r.photoUrl ?? undefined} alt="" sx={{ width: 56, height: 56, bgcolor: color.primarySoft, color: color.primary, fontSize: '1.1rem' }}>
              {initials(name)}
            </Avatar>
          }
          title={name}
          status={<StatusChip value={r.status} />}
          subtitle={facts(r.specialty?.name, r.qualifications, r.city)}
          actions={<EditButton variant="outlined" />}
        />
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          <InfoGrid columns={4}>
            <InfoItem label="Experience">{`${r.experienceYears} years`}</InfoItem>
            <InfoItem label="Rating">{r.rating ? `${Number(r.rating).toFixed(1)} of 5` : null}</InfoItem>
            <InfoItem label="Consultations completed">{String(r.totalConsultations ?? 0)}</InfoItem>
            <InfoItem label="Registration">{r.registrationNumber}</InfoItem>
          </InfoGrid>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Panel title="Weekly availability" description="When patients can book this doctor.">
            <Availability slots={r.slots ?? []} />
          </Panel>
          <Panel title="Profile">
            <InfoGrid columns={2}>
              <InfoItem label="About" full>{r.bio}</InfoItem>
              <InfoItem label="Languages">{r.languages}</InfoItem>
              <InfoItem label="Gender">{r.gender}</InfoItem>
              <InfoItem label="Clinic" full>{facts(r.provider?.name, r.clinicAddress)}</InfoItem>
            </InfoGrid>
          </Panel>
        </Box>

        <Panel title="Consultation fees">
          <InfoGrid columns={1}>
            <InfoItem label="Video">{r.isVideoEnabled ? formatINR(r.consultationFeeVideo) : 'Not offered'}</InfoItem>
            <InfoItem label="Audio call">{r.isAudioEnabled ? formatINR(r.consultationFeeAudio || r.consultationFeeVideo) : 'Not offered'}</InfoItem>
            <InfoItem label="In clinic">{formatINR(r.consultationFeeClinic)}</InfoItem>
          </InfoGrid>
        </Panel>
      </Box>
    </Box>
  );
};

export const DoctorShow: React.FC = () => (
  <Show component="div" title={<DoctorTitle />} actions={false}>
    <Content />
  </Show>
);
