import React from 'react';
import { List, FunctionField, SelectInput } from 'react-admin';
import { Typography } from '@mui/material';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import { ListPagination } from '../../components/ListPagination.js';
import { ResponsiveDatagrid } from '../../ui/ResponsiveDatagrid.js';
import { StatusChip } from '../../ui/StatusChip.js';
import { ListEmpty } from '../../ui/EmptyState.js';
import { PersonCell, facts } from '../../ui/Panel.js';
import { formatINR, formatDateTime, humanize } from '../../design/tokens.js';

const filters = [
  <SelectInput
    key="status"
    source="status"
    label="Status"
    alwaysOn
    choices={[
      { id: 'REQUESTED', name: 'Requested' },
      { id: 'CONFIRMED', name: 'Confirmed' },
      { id: 'IN_PROGRESS', name: 'In progress' },
      { id: 'COMPLETED', name: 'Completed' },
      { id: 'CANCELLED', name: 'Cancelled' },
      { id: 'NO_SHOW', name: 'No-show' },
    ]}
  />,
  <SelectInput
    key="type"
    source="type"
    label="Consultation type"
    choices={[
      { id: 'VIDEO', name: 'Video' },
      { id: 'AUDIO', name: 'Audio' },
      { id: 'IN_CLINIC', name: 'In clinic' },
    ]}
  />,
];

const doctorName = (r: any) => `Dr. ${r.doctor?.firstName ?? ''} ${r.doctor?.lastName ?? ''}`.trim();
const patientName = (r: any) => {
  const p = r.patient?.patientProfile;
  return p ? `${p.firstName} ${p.lastName}` : r.patient?.phone ?? 'Unknown patient';
};

export const AppointmentList: React.FC = () => (
  <List
    filters={filters}
    sort={{ field: 'scheduledStart', order: 'DESC' }}
    perPage={25}
    pagination={<ListPagination />}
    empty={<ListEmpty icon={<EventAvailableOutlinedIcon />} title="No appointments yet" description="Appointments appear here as soon as patients book consultations in the app." />}
  >
    <ResponsiveDatagrid
      mobile={{
        primaryText: (r: any) => patientName(r),
        secondaryText: (r: any) => facts(doctorName(r), humanize(r.type), formatDateTime(r.scheduledStart)),
        tertiaryText: (r: any) => <StatusChip value={r.status} size="sm" />,
      }}
    >
      <FunctionField
        label="Patient"
        sortable={false}
        render={(r: any) => <PersonCell name={patientName(r)} secondary={r.appointmentNumber} />}
      />
      <FunctionField
        label="Doctor"
        sortable={false}
        render={(r: any) => (
          <>
            <Typography variant="body2">{doctorName(r)}</Typography>
            <Typography variant="caption" color="text.secondary">{r.doctor?.specialty?.name}</Typography>
          </>
        )}
      />
      <FunctionField label="Type" sortable={false} render={(r: any) => <Typography variant="body2">{humanize(r.type)}</Typography>} />
      <FunctionField label="Scheduled" sortBy="scheduledStart" render={(r: any) => <Typography variant="body2" className="num">{formatDateTime(r.scheduledStart)}</Typography>} />
      <FunctionField label="Fee" sortBy="fee" textAlign="right" render={(r: any) => <Typography variant="body2" className="num">{formatINR(r.fee)}</Typography>} />
      <FunctionField label="Status" sortBy="status" render={(r: any) => <StatusChip value={r.status} />} />
    </ResponsiveDatagrid>
  </List>
);
