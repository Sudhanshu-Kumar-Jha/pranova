import React from 'react';
import { Show, useRecordContext } from 'react-admin';
import { Box, Link, Typography } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { Panel, DetailHeader, InfoGrid, InfoItem, SkeletonLines, facts } from '../../ui/Panel.js';
import { StatusChip } from '../../ui/StatusChip.js';
import { StatusWorkflow } from '../../ui/StatusWorkflow.js';
import { formatINR, formatDateTime, color } from '../../design/tokens.js';
import { LocationLink } from '../../ui/LocationLink.js';

const FLOW: Record<string, string[]> = {
  BOOKED: ['SAMPLE_COLLECTED', 'CANCELLED'],
  SAMPLE_COLLECTED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['REPORT_READY', 'CANCELLED'],
  REPORT_READY: [],
  CANCELLED: [],
};

const ACTIONS: Record<string, string> = {
  SAMPLE_COLLECTED: 'Mark sample collected',
  PROCESSING: 'Start processing',
  REPORT_READY: 'Publish report',
  CANCELLED: 'Cancel booking',
};

const LabTitle: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? `Lab booking ${r.bookingNumber}` : 'Lab booking'}</span>;
};

const collection = (t: string) => (t === 'HOME_COLLECTION' ? 'Home collection' : 'Lab visit');

const Content: React.FC = () => {
  const r = useRecordContext();
  if (!r) return <Box sx={{ p: 3 }}><SkeletonLines rows={6} /></Box>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${color.line}`, borderRadius: '10px', mb: 3 }}>
        <DetailHeader
          title={r.test?.name ?? 'Diagnostic test'}
          status={<StatusChip value={r.status} />}
          subtitle={facts(r.bookingNumber, collection(r.collectionType), formatDateTime(r.scheduledDate))}
        />
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          <InfoGrid columns={4}>
            <InfoItem label="Amount">{formatINR(r.amount)}</InfoItem>
            <InfoItem label="Payment"><StatusChip value={r.paymentStatus} size="sm" /></InfoItem>
            <InfoItem label="Category">{r.test?.category}</InfoItem>
            <InfoItem label="Report turnaround">{r.test?.reportTimeHours ? `${r.test.reportTimeHours} hours` : null}</InfoItem>
          </InfoGrid>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Panel title="Sample collection">
            <InfoGrid columns={2}>
              <InfoItem label="Method">{collection(r.collectionType)}</InfoItem>
              <InfoItem label="Scheduled for">{formatDateTime(r.scheduledDate)}</InfoItem>
              <InfoItem label="Address" full>
                <LocationLink
                  label="Sample collection address"
                  address={r.address}
                  city={r.city}
                  pincode={r.pincode}
                  emptyText="No collection address recorded"
                />
              </InfoItem>
              <InfoItem label="Patient contact">{r.phone}</InfoItem>
            </InfoGrid>
          </Panel>

          <Panel title="Report">
            {r.reportUrl ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <DescriptionOutlinedIcon sx={{ color: 'primary.main' }} aria-hidden />
                <Link href={r.reportUrl} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ wordBreak: 'break-all', fontWeight: 500 }}>
                  Open report
                </Link>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                The report link is added when the booking is marked “Report ready”.
              </Typography>
            )}
          </Panel>
        </Box>

        <StatusWorkflow
          endpoint={`/lab-bookings/${r.id}/status`}
          current={r.status}
          flow={FLOW}
          actionLabels={ACTIONS}
          destructive={['CANCELLED']}
          entityName="lab booking"
          extraField={{
            key: 'reportUrl',
            label: 'Report link',
            helper: 'Paste the secure link to the report PDF so the patient can open it.',
            appliesTo: 'REPORT_READY',
            type: 'url',
          }}
        />
      </Box>
    </Box>
  );
};

export const LabBookingShow: React.FC = () => (
  <Show component="div" title={<LabTitle />} actions={false}>
    <Content />
  </Show>
);
