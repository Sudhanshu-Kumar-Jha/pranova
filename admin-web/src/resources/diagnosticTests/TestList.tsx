import React from 'react';
import { List, FunctionField, SearchInput, TextField } from 'react-admin';
import { Box, Typography } from '@mui/material';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import { ListPagination } from '../../components/ListPagination.js';
import { ResponsiveDatagrid } from '../../ui/ResponsiveDatagrid.js';
import { ToneChip } from '../../ui/StatusChip.js';
import { ListEmpty } from '../../ui/EmptyState.js';
import { facts } from '../../ui/Panel.js';
import { formatINR, color } from '../../design/tokens.js';

const filters = [<SearchInput key="q" source="q" alwaysOn placeholder="Search by test name, code or category" />];

const turnaround = (h: number) => (h < 24 ? `${h} hours` : h % 24 === 0 ? `${h / 24} day${h / 24 === 1 ? '' : 's'}` : `${h} hours`);

export const TestList: React.FC = () => (
  <List
    filters={filters}
    sort={{ field: 'name', order: 'ASC' }}
    perPage={25}
    pagination={<ListPagination />}
    empty={<ListEmpty icon={<ScienceOutlinedIcon />} title="No tests in the catalogue" description="Add diagnostic tests so patients can book home collection or lab visits." />}
  >
    <ResponsiveDatagrid
      rowClick="edit"
      mobile={{
        primaryText: (r: any) => r.name,
        secondaryText: (r: any) => facts(r.category, `Report in ${turnaround(r.reportTimeHours)}`),
        tertiaryText: (r: any) => formatINR(r.sellingPrice),
      }}
    >
      <FunctionField
        label="Test"
        sortBy="name"
        render={(r: any) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
            <Typography variant="caption" color="text.secondary" component="div">{facts(r.category, r.sampleType && `${r.sampleType} sample`)}</Typography>
          </Box>
        )}
      />
      <TextField source="code" label="Code" emptyText="—" sortable={false} />
      <FunctionField label="Preparation" sortable={false} render={(r: any) => <Typography variant="body2" color="text.secondary">{r.preparation || '—'}</Typography>} />
      <FunctionField label="Report in" sortBy="reportTimeHours" render={(r: any) => <Typography variant="body2" className="num">{turnaround(r.reportTimeHours)}</Typography>} />
      <FunctionField
        label="Collection"
        sortable={false}
        render={(r: any) => (r.homeCollectionAvailable ? <ToneChip tone="primary">Home or lab</ToneChip> : <ToneChip tone="neutral">Lab only</ToneChip>)}
      />
      <FunctionField
        label="Price"
        sortBy="sellingPrice"
        textAlign="right"
        render={(r: any) => (
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" className="num" sx={{ fontWeight: 600 }}>{formatINR(r.sellingPrice)}</Typography>
            {r.mrp > r.sellingPrice && (
              <Typography variant="caption" className="num" sx={{ color: color.subtle, textDecoration: 'line-through' }}>{formatINR(r.mrp)}</Typography>
            )}
          </Box>
        )}
      />
    </ResponsiveDatagrid>
  </List>
);
