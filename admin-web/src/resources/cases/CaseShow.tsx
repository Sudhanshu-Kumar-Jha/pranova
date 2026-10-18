import React, { useState } from 'react';
import { Show, useRecordContext } from 'react-admin';
import { Box, Button, Typography } from '@mui/material';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import { AssignCaseDialog } from './AssignCaseDialog.js';
import { Panel, DetailHeader, InfoGrid, InfoItem, PersonCell, SkeletonLines, facts } from '../../ui/Panel.js';
import { StatusChip, PriorityChip, ToneChip } from '../../ui/StatusChip.js';
import { StatusWorkflow } from '../../ui/StatusWorkflow.js';
import { EmptyState } from '../../ui/EmptyState.js';
import { LocationLink } from '../../ui/LocationLink.js';
import { formatDateTime, humanize, color } from '../../design/tokens.js';

// Faithful to the original console: any unresolved case can be marked resolved.
const FLOW: Record<string, string[]> = {
  OPEN: ['RESOLVED'],
  ASSIGNED: ['RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  CANCELLED: ['RESOLVED'],
  RESOLVED: [],
};

const CaseTitle: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? `Case ${r.caseNumber}` : 'Case'}</span>;
};

/** Vertical timeline — the content is a true sequence of events. */
const Timeline: React.FC<{ events: any[] }> = ({ events }) => {
  if (!events?.length) {
    return <EmptyState compact icon={<TimelineOutlinedIcon />} title="No activity yet" description="Assignments, status changes and field updates will be listed here in order." />;
  }
  return (
    <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {events.map((ev, i) => {
        const last = i === events.length - 1;
        return (
          <Box component="li" key={ev.id ?? i} sx={{ display: 'grid', gridTemplateColumns: '20px minmax(0,1fr)', columnGap: 1.5 }}>
            <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }} aria-hidden>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', mt: 0.75, bgcolor: i === 0 ? color.primary : color.line, border: `2px solid ${i === 0 ? color.primarySoft : color.surface}`, boxSizing: 'content-box', zIndex: 1 }} />
              {!last && <Box sx={{ position: 'absolute', top: 18, bottom: 0, width: '2px', bgcolor: color.lineSoft }} />}
            </Box>
            <Box sx={{ pb: last ? 0 : 2.5, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{humanize(ev.action)}</Typography>
                {ev.newStatus && <StatusChip value={ev.newStatus} size="sm" />}
              </Box>
              <Typography variant="caption" color="text.secondary" component="div" className="num">
                {facts(formatDateTime(ev.createdAt), ev.actorName || (ev.actorRole ? humanize(ev.actorRole) : 'System'))}
              </Typography>
              {ev.notes && (
                <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary', whiteSpace: 'pre-wrap' }}>{ev.notes}</Typography>
              )}
              {ev.locationLatitude != null && ev.locationLongitude != null && (
                <Box sx={{ mt: 0.75, display: 'inline-flex', alignItems: 'center' }}>
                  <LocationLink
                    label={`GPS pin at update - ${humanize(ev.action)}`}
                    latitude={ev.locationLatitude}
                    longitude={ev.locationLongitude}
                  />
                </Box>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

const Content: React.FC = () => {
  const r = useRecordContext();
  const [assignOpen, setAssignOpen] = useState(false);
  if (!r) return <Box sx={{ p: 3 }}><SkeletonLines rows={6} /></Box>;
  const assigned = !!r.careManagerId;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${color.line}`, borderRadius: '10px', mb: 3 }}>
        <DetailHeader
          title={r.title}
          status={
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              <PriorityChip value={r.priority} />
              <StatusChip value={r.status} />
            </Box>
          }
          subtitle={facts(r.caseNumber, humanize(r.triggerSource), `raised ${formatDateTime(r.createdAt)}`)}
          actions={
            <Button variant={assigned ? 'outlined' : 'contained'} startIcon={<AssignmentIndOutlinedIcon />} onClick={() => setAssignOpen(true)}>
              {assigned ? 'Reassign care manager' : 'Assign care manager'}
            </Button>
          }
        />
        {r.description && (
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>Clinical notes</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', maxWidth: 820 }}>{r.description}</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Panel title="Patient">
            <InfoGrid columns={2}>
              <InfoItem label="Name">{r.patientName}</InfoItem>
              <InfoItem label="Phone">{r.patientPhone}</InfoItem>
              <InfoItem label="Blood group">{r.patientBloodGroup}</InfoItem>
              <InfoItem label="Emergency contact">{r.patientEmergencyContact}</InfoItem>
              <InfoItem label="Home address" full>{r.patientAddress}</InfoItem>
            </InfoGrid>
          </Panel>

          <Panel title="Location and facility">
            <InfoGrid columns={2}>
              <InfoItem label="Incident location" full>
                <LocationLink
                  label="Incident location"
                  address={r.incidentAddress}
                  latitude={r.incidentLatitude}
                  longitude={r.incidentLongitude}
                  emptyText="No location recorded"
                />
              </InfoItem>
              <InfoItem label="Facility">{r.providerName}</InfoItem>
              <InfoItem label="Facility phone">{r.providerPhone}</InfoItem>
            </InfoGrid>
          </Panel>

          <Panel title="Activity" description="Every change to this case, newest first. This history can't be edited.">
            <Timeline events={r.timeline ?? []} />
          </Panel>
        </Box>

        <Box sx={{ display: 'grid', gap: 3 }}>
          <Panel title="Care manager">
            {assigned ? (
              <Box sx={{ display: 'grid', gap: 2 }}>
                <PersonCell name={r.careManagerName} secondary={facts(r.careManagerCode, r.careManagerPhone)} />
                <InfoGrid columns={1}>
                  <InfoItem label="Duty status">
                    <ToneChip tone={r.careManagerIsAvailable ? 'success' : 'neutral'} size="sm">
                      {r.careManagerIsAvailable ? 'On duty' : 'Off duty'}
                    </ToneChip>
                  </InfoItem>
                  <InfoItem label="Assigned">{r.assignedAt ? formatDateTime(r.assignedAt) : null}</InfoItem>
                  {r.careManagerZone && <InfoItem label="Zone">{r.careManagerZone}</InfoItem>}
                  <InfoItem label="Live location" full>
                    <LocationLink
                      label={`Live GPS - ${r.careManagerName}`}
                      latitude={r.careManagerLatitude}
                      longitude={r.careManagerLongitude}
                      emptyText="No GPS location reported yet"
                    />
                  </InfoItem>
                  {r.careManagerLastLocationUpdate && (
                    <InfoItem label="Last GPS ping">{formatDateTime(r.careManagerLastLocationUpdate)}</InfoItem>
                  )}
                </InfoGrid>
                {r.careManagerPhone && (
                  <Button
                    variant="outlined"
                    size="small"
                    component="a"
                    href={`tel:${r.careManagerPhone}`}
                    startIcon={<PhoneOutlinedIcon sx={{ fontSize: 16 }} />}
                  >
                    Call care manager
                  </Button>
                )}
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  No one is assigned yet. Assign a care manager so they can respond in the field.
                </Typography>
                <Button variant="contained" size="small" startIcon={<AssignmentIndOutlinedIcon />} onClick={() => setAssignOpen(true)}>
                  Assign now
                </Button>
              </Box>
            )}
          </Panel>

          <Panel title="Billing & payment">
            {r.payments?.length ? (
              <Box sx={{ display: 'grid', gap: 2 }}>
                <InfoGrid columns={2}>
                  <InfoItem label="Status">
                    <ToneChip
                      tone={
                        r.paymentStatus === 'PAID'
                          ? 'success'
                          : r.paymentStatus === 'FAILED'
                          ? 'error'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {r.paymentStatus || 'PENDING'}
                    </ToneChip>
                  </InfoItem>
                  <InfoItem label="Amount">
                    <Typography variant="body2" sx={{ fontWeight: 700 }} className="num">
                      ₹{r.payments[0].amount} {r.payments[0].currency || 'INR'}
                    </Typography>
                  </InfoItem>
                  <InfoItem label="Gateway">{r.payments[0].gateway}</InfoItem>
                  <InfoItem label="Transaction ID">
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {r.payments[0].transactionId || 'Awaiting checkout'}
                    </Typography>
                  </InfoItem>
                  {r.payments[0].paidAt && (
                    <InfoItem label="Paid on" full>
                      {formatDateTime(r.payments[0].paidAt)}
                    </InfoItem>
                  )}
                </InfoGrid>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  No invoice or payment record has been generated for this case yet.
                </Typography>
              </Box>
            )}
          </Panel>

          <StatusWorkflow
            endpoint={`/cases/${r.id}/status`}
            current={r.status}
            flow={FLOW}
            actionLabels={{ RESOLVED: 'Mark as resolved' }}
            entityName="case"
            extraField={{ key: 'notes', label: 'Resolution notes', helper: 'Optional. Saved to the case activity.', appliesTo: 'RESOLVED', multiline: true }}
          />
        </Box>
      </Box>

      <AssignCaseDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        caseId={String(r.id)}
        caseNumber={r.caseNumber}
        currentCareManagerId={r.careManagerId}
      />
    </Box>
  );
};

export const CaseShow: React.FC = () => (
  <Show component="div" title={<CaseTitle />} actions={false}>
    <Content />
  </Show>
);
