import React from 'react';
import { List, FunctionField, NumberField, SearchInput, TextField } from 'react-admin';
import { Typography } from '@mui/material';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import { ListPagination } from '../../components/ListPagination.js';
import { ResponsiveDatagrid, RowEditButton } from '../../ui/ResponsiveDatagrid.js';
import { ToneChip } from '../../ui/StatusChip.js';
import { ListEmpty } from '../../ui/EmptyState.js';
import { PersonCell, facts } from '../../ui/Panel.js';
import { formatDate } from '../../design/tokens.js';

const patientFilters = [<SearchInput key="q" source="q" alwaysOn placeholder="Search by name, phone or city" />];

const fullName = (r: any) => r.fullName || `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Patient';

export const PatientList: React.FC = () => (
  <List
    filters={patientFilters}
    sort={{ field: 'createdAt', order: 'DESC' }}
    perPage={25}
    pagination={<ListPagination />}
    empty={<ListEmpty icon={<PeopleAltOutlinedIcon />} title="No patients yet" description="Patients register themselves in the app, or you can add one here." />}
  >
    <ResponsiveDatagrid
      mobile={{
        primaryText: (r: any) => fullName(r),
        secondaryText: (r: any) => facts(r.phone, r.city),
        tertiaryText: (r: any) => (r.bloodGroup ? <ToneChip tone="neutral" size="sm">{r.bloodGroup}</ToneChip> : null),
      }}
    >
      <FunctionField label="Patient" sortBy="createdAt" render={(r: any) => <PersonCell name={fullName(r)} secondary={r.phone} />} />
      <TextField source="city" label="City" emptyText="—" sortable={false} />
      <FunctionField
        label="Blood group"
        sortable={false}
        render={(r: any) => (r.bloodGroup ? <ToneChip tone="neutral">{r.bloodGroup}</ToneChip> : <Typography variant="body2" color="text.secondary">—</Typography>)}
      />
      <NumberField source="casesCount" label="Cases" sortable={false} />
      <FunctionField label="Registered" sortBy="createdAt" render={(r: any) => <Typography variant="body2" className="num">{formatDate(r.createdAt)}</Typography>} />
      <RowEditButton />
    </ResponsiveDatagrid>
  </List>
);
