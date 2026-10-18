import React from 'react';
import { Show, useRecordContext } from 'react-admin';
import { Box, Link, Typography } from '@mui/material';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import { Panel, DetailHeader, InfoGrid, InfoItem, PersonCell, SkeletonLines, facts } from '../../ui/Panel.js';
import { StatusChip, ToneChip } from '../../ui/StatusChip.js';
import { StatusWorkflow } from '../../ui/StatusWorkflow.js';
import { formatINR, formatDateTime, humanize, color } from '../../design/tokens.js';

const FLOW: Record<string, string[]> = {
  REQUESTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const ACTIONS: Record<string, string> = {
  CONFIRMED: 'Confirm appointment',
  IN_PROGRESS: 'Start consultation',
  COMPLETED: 'Mark as completed',
  CANCELLED: 'Cancel appointment',
  NO_SHOW: 'Mark as no-show',
};

const AppointmentTitle: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? `Appointment ${r.appointmentNumber}` : 'Appointment'}</span>;
};

const Content: React.FC = () => {
  const r = useRecordContext();
  if (!r) return <Box sx={{ p: 3 }}><SkeletonLines rows={6} /></Box>;

  const p = r.patient?.patientProfile;
  const patientName = p ? `${p.firstName} ${p.lastName}` : r.patient?.phone ?? 'Unknown patient';
  const doctorName = `Dr. ${r.doctor?.firstName ?? ''} ${r.doctor?.lastName ?? ''}`.trim();
  const isTele = r.type === 'VIDEO' || r.type === 'AUDIO';

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${color.line}`, borderRadius: '10px', mb: 3 }}>
        <DetailHeader
          title={patientName}
          status={<StatusChip value={r.status} />}
          subtitle={facts(`${humanize(r.type)} consultation with ${doctorName}`, formatDateTime(r.scheduledStart))}
        />
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          <InfoGrid columns={4}>
            <InfoItem label="Appointment">{r.appointmentNumber}</InfoItem>
            <InfoItem label="Fee">{formatINR(r.fee)}</InfoItem>
            <InfoItem label="Payment"><StatusChip value={r.paymentStatus} size="sm" /></InfoItem>
            <InfoItem label="Booked">{formatDateTime(r.createdAt)}</InfoItem>
          </InfoGrid>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Panel title="Consultation">
            <InfoGrid columns={2}>
              <InfoItem label="Doctor">
                <PersonCell name={doctorName} secondary={r.doctor?.specialty?.name} src={r.doctor?.photoUrl} />
              </InfoItem>
              <InfoItem label="Patient">
                <PersonCell name={patientName} secondary={r.patient?.phone} />
              </InfoItem>
              <InfoItem label="Starts">{formatDateTime(r.scheduledStart)}</InfoItem>
              <InfoItem label="Ends">{formatDateTime(r.scheduledEnd)}</InfoItem>
            </InfoGrid>
          </Panel>

          <Panel title="Clinical notes">
            <InfoGrid columns={1}>
              <InfoItem label="Reason for visit" full>{r.reason}</InfoItem>
              <InfoItem label="Symptoms reported" full>{r.symptoms}</InfoItem>
              <InfoItem label="Prescription" full>
                {r.prescriptionNote ? <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>{r.prescriptionNote}</Box> : null}
              </InfoItem>
              {r.cancelReason && <InfoItem label="Cancellation reason" full>{r.cancelReason}</InfoItem>}
            </InfoGrid>
          </Panel>
        </Box>

        <Box sx={{ display: 'grid', gap: 3 }}>
          <StatusWorkflow
            endpoint={`/appointments/${r.id}/status`}
            current={r.status}
            flow={FLOW}
            actionLabels={ACTIONS}
            destructive={['CANCELLED', 'NO_SHOW']}
            entityName="appointment"
            extraField={{
              key: 'prescriptionNote',
              label: 'Prescription note',
              helper: 'Saved when the consultation is marked as completed.',
              appliesTo: 'COMPLETED',
              multiline: true,
            }}
          />

          <Panel title="Video consultation">
            {isTele && r.videoJoinUrl ? (
              <Box sx={{ display: 'grid', gap: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VideocamOutlinedIcon sx={{ fontSize: 20, color: 'primary.main' }} aria-hidden />
                  <ToneChip tone="primary">Room ready</ToneChip>
                </Box>
                <Link href={r.videoJoinUrl} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ wordBreak: 'break-all', fontWeight: 500 }}>
                  {r.videoJoinUrl}
                </Link>
                <Typography variant="caption" color="text.secondary">Opens in a new tab. Patients join from the app.</Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">This is an in-clinic visit, so there is no video room.</Typography>
            )}
          </Panel>
        </Box>
      </Box>
    </Box>
  );
};

export const AppointmentShow: React.FC = () => (
  <Show component="div" title={<AppointmentTitle />} actions={false}>
    <Content />
  </Show>
);
