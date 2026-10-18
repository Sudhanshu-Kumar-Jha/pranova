import React from 'react';
import { List, FunctionField, NumberField, SearchInput, SelectInput, TextField } from 'react-admin';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import { ListPagination } from '../../components/ListPagination.js';
import { ResponsiveDatagrid, RowEditButton } from '../../ui/ResponsiveDatagrid.js';
import { ToneChip } from '../../ui/StatusChip.js';
import { ListEmpty } from '../../ui/EmptyState.js';
import { PersonCell, facts } from '../../ui/Panel.js';
import { LocationLink } from '../../ui/LocationLink.js';
import { color } from '../../design/tokens.js';

const careManagerFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Search by name, employee code or zone" />,
  <SelectInput
    key="isAvailable"
    source="isAvailable"
    label="Availability"
    choices={[
      { id: 'true', name: 'On duty' },
      { id: 'false', name: 'Off duty' },
    ]}
  />,
];

const fullName = (r: any) => r.fullName || `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim();
const Duty: React.FC<{ on: boolean; size?: 'sm' | 'md' }> = ({ on, size }) => (
  <ToneChip tone={on ? 'success' : 'neutral'} size={size}>{on ? 'On duty' : 'Off duty'}</ToneChip>
);

export const CareManagerList: React.FC = () => (
  <List
    filters={careManagerFilters}
    sort={{ field: 'createdAt', order: 'DESC' }}
    perPage={25}
    pagination={<ListPagination />}
    empty={<ListEmpty icon={<BadgeOutlinedIcon />} title="No care managers yet" description="Add field care managers so cases and emergency alerts can be dispatched to them." />}
  >
    <ResponsiveDatagrid
      mobile={{
        primaryText: (r: any) => fullName(r),
        secondaryText: (r: any) => facts(r.employeeCode, r.assignedZone, r.currentLatitude != null ? 'GPS active' : 'No GPS'),
        tertiaryText: (r: any) => <Duty on={r.isAvailable} size="sm" />,
      }}
    >
      <FunctionField label="Care manager" sortable={false} render={(r: any) => <PersonCell name={fullName(r)} secondary={facts(r.employeeCode, r.phone)} />} />
      <TextField source="specialization" label="Specialization" emptyText="General coordination" sortable={false} />
      <TextField source="assignedZone" label="Zone" emptyText="Not assigned" sortable={false} />
      <NumberField source="assignedCasesCount" label="Active cases" sortable={false} />
      <FunctionField label="Availability" sortable={false} render={(r: any) => <Duty on={r.isAvailable} />} />
      <FunctionField
        label="Live location"
        sortable={false}
        render={(r: any) =>
          r.currentLatitude != null && r.currentLongitude != null ? (
            <LocationLink
              label={`Live GPS - ${fullName(r)}`}
              latitude={r.currentLatitude}
              longitude={r.currentLongitude}
            />
          ) : (
            <span style={{ color: color.subtle }}>No GPS fix</span>
          )
        }
      />
      <RowEditButton />
    </ResponsiveDatagrid>
  </List>
);
