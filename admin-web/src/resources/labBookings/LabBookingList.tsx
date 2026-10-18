import React from 'react';
import { List, FunctionField, SelectInput } from 'react-admin';
import { Typography } from '@mui/material';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import { ListPagination } from '../../components/ListPagination.js';
import { ResponsiveDatagrid } from '../../ui/ResponsiveDatagrid.js';
import { StatusChip } from '../../ui/StatusChip.js';
import { ListEmpty } from '../../ui/EmptyState.js';
import { facts } from '../../ui/Panel.js';
import { formatINR, formatDateTime } from '../../design/tokens.js';

const filters = [
  <SelectInput
    key="status"
    source="status"
    label="Status"
    alwaysOn
    choices={[
      { id: 'BOOKED', name: 'Booked' },
      { id: 'SAMPLE_COLLECTED', name: 'Sample collected' },
      { id: 'PROCESSING', name: 'Processing' },
      { id: 'REPORT_READY', name: 'Report ready' },
      { id: 'CANCELLED', name: 'Cancelled' },
    ]}
  />,
];

const collection = (t: string) => (t === 'HOME_COLLECTION' ? 'Home collection' : 'Lab visit');

export const LabBookingList: React.FC = () => (
  <List
    filters={filters}
    sort={{ field: 'scheduledDate', order: 'DESC' }}
    perPage={25}
    pagination={<ListPagination />}
    empty={<ListEmpty icon={<BiotechOutlinedIcon />} title="No lab bookings yet" description="Diagnostic tests booked in the patient app will appear here for collection and reporting." />}
  >
    <ResponsiveDatagrid
      mobile={{
        primaryText: (r: any) => r.test?.name ?? 'Diagnostic test',
        secondaryText: (r: any) => facts(collection(r.collectionType), formatDateTime(r.scheduledDate)),
        tertiaryText: (r: any) => <StatusChip value={r.status} size="sm" />,
      }}
    >
      <FunctionField
        label="Test"
        sortable={false}
        render={(r: any) => (
          <>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.test?.name}</Typography>
            <Typography variant="caption" color="text.secondary">{r.bookingNumber}</Typography>
          </>
        )}
      />
      <FunctionField label="Collection" sortable={false} render={(r: any) => <Typography variant="body2">{collection(r.collectionType)}</Typography>} />
      <FunctionField label="Scheduled" sortBy="scheduledDate" render={(r: any) => <Typography variant="body2" className="num">{formatDateTime(r.scheduledDate)}</Typography>} />
      <FunctionField
        label="Patient contact"
        sortable={false}
        render={(r: any) => (
          <>
            <Typography variant="body2">{r.phone}</Typography>
            <Typography variant="caption" color="text.secondary">{facts(r.city, r.pincode)}</Typography>
          </>
        )}
      />
      <FunctionField label="Amount" sortBy="amount" textAlign="right" render={(r: any) => <Typography variant="body2" className="num">{formatINR(r.amount)}</Typography>} />
      <FunctionField label="Status" sortBy="status" render={(r: any) => <StatusChip value={r.status} />} />
    </ResponsiveDatagrid>
  </List>
);
