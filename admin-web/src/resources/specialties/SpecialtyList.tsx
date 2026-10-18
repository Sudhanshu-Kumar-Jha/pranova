import React from 'react';
import { List, FunctionField, NumberField, SearchInput } from 'react-admin';
import { Box, Typography } from '@mui/material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { ListPagination } from '../../components/ListPagination.js';
import { ResponsiveDatagrid } from '../../ui/ResponsiveDatagrid.js';
import { ToneChip } from '../../ui/StatusChip.js';
import { ListEmpty } from '../../ui/EmptyState.js';
import { plural } from '../../design/tokens.js';

const filters = [<SearchInput key="q" source="q" alwaysOn placeholder="Search specialties" />];

const Availability: React.FC<{ active: boolean }> = ({ active }) => (
  <ToneChip tone={active ? 'success' : 'neutral'}>{active ? 'Visible in app' : 'Hidden'}</ToneChip>
);

export const SpecialtyList: React.FC = () => (
  <List
    filters={filters}
    sort={{ field: 'name', order: 'ASC' }}
    perPage={25}
    pagination={<ListPagination />}
    empty={<ListEmpty icon={<CategoryOutlinedIcon />} title="No specialties yet" description="Specialties are how patients browse for doctors. Add the first one to get started." />}
  >
    <ResponsiveDatagrid
      rowClick="edit"
      mobile={{
        primaryText: (r: any) => r.name,
        secondaryText: (r: any) => plural(r.doctorsCount ?? 0, 'doctor'),
        tertiaryText: (r: any) => <Availability active={r.isActive} />,
      }}
    >
      <FunctionField
        label="Specialty"
        sortBy="name"
        render={(r: any) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
            <Typography variant="caption" color="text.secondary" component="div" noWrap sx={{ maxWidth: 520 }}>
              {r.description || 'No description'}
            </Typography>
          </Box>
        )}
      />
      <NumberField source="doctorsCount" label="Doctors" sortable={false} />
      <FunctionField label="Availability" render={(r: any) => <Availability active={r.isActive} />} />
    </ResponsiveDatagrid>
  </List>
);
