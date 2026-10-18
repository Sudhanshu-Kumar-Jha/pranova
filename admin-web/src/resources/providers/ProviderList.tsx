import React, { useState } from 'react';
import {
  List, FunctionField, NumberField, SearchInput, SelectInput, useUpdate, useNotify, useRefresh, useRecordContext, Confirm,
} from 'react-admin';
import { Box, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip, Typography } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import { ListPagination } from '../../components/ListPagination.js';
import { ResponsiveDatagrid, RowEditButton } from '../../ui/ResponsiveDatagrid.js';
import { StatusChip } from '../../ui/StatusChip.js';
import { ListEmpty } from '../../ui/EmptyState.js';
import { facts } from '../../ui/Panel.js';
import { color } from '../../design/tokens.js';

const TYPE_LABEL: Record<string, string> = {
  HOSPITAL: 'Hospital',
  LAB: 'Diagnostic lab',
  CLINIC: 'Specialty clinic',
  AMBULANCE: 'Ambulance service',
  PHARMACY: 'Pharmacy',
};

const providerFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Search by name, city or contact" />,
  <SelectInput key="type" source="type" label="Type" choices={Object.entries(TYPE_LABEL).map(([id, name]) => ({ id, name }))} />,
  <SelectInput
    key="status"
    source="status"
    label="Status"
    choices={[
      { id: 'ACTIVE', name: 'Active' },
      { id: 'PAUSED', name: 'Paused' },
      { id: 'DEACTIVATED', name: 'Deactivated' },
    ]}
  />,
];

type ProviderStatus = 'ACTIVE' | 'PAUSED' | 'DEACTIVATED';

const StatusMenu: React.FC = () => {
  const record = useRecordContext();
  const [update, { isPending }] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  if (!record) return null;

  const setStatus = (status: ProviderStatus) => {
    setAnchor(null);
    update(
      'providers',
      { id: record.id, data: { status }, previousData: record },
      {
        onSuccess: () => {
          notify(`${record.name} is now ${status.toLowerCase()}`, { type: 'success' });
          refresh();
          setConfirmDeactivate(false);
        },
        onError: (error: any) => {
          notify(`Status could not be changed: ${error.message}`, { type: 'error' });
          setConfirmDeactivate(false);
        },
      }
    );
  };

  const options: Array<{ status: ProviderStatus; label: string; icon: React.ReactNode }> = [
    { status: 'ACTIVE' as ProviderStatus, label: 'Activate', icon: <PlayCircleOutlineIcon fontSize="small" /> },
    { status: 'PAUSED' as ProviderStatus, label: 'Pause operations', icon: <PauseCircleOutlineIcon fontSize="small" /> },
    { status: 'DEACTIVATED' as ProviderStatus, label: 'Deactivate', icon: <BlockOutlinedIcon fontSize="small" /> },
  ].filter((o) => o.status !== record.status);

  return (
    <Box onClick={(e) => e.stopPropagation()}>
      <Tooltip title="Change status">
        <IconButton aria-label={`Change status of ${record.name}`} size="small" disabled={isPending} onClick={(e) => setAnchor(e.currentTarget)} sx={{ color: 'text.secondary' }}>
          <MoreHorizIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {options.map((o) => (
          <MenuItem
            key={o.status}
            onClick={() => (o.status === 'DEACTIVATED' ? (setAnchor(null), setConfirmDeactivate(true)) : setStatus(o.status))}
            sx={o.status === 'DEACTIVATED' ? { color: color.error } : undefined}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>{o.icon}</ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>{o.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
      <Confirm
        isOpen={confirmDeactivate}
        loading={isPending}
        title={`Deactivate ${record.name}?`}
        content="The provider will be marked as deactivated. You can reactivate it at any time from this menu."
        confirm="Deactivate"
        confirmColor="warning"
        cancel="Cancel"
        onConfirm={() => setStatus('DEACTIVATED')}
        onClose={() => setConfirmDeactivate(false)}
      />
    </Box>
  );
};

export const ProviderList: React.FC = () => (
  <List
    filters={providerFilters}
    sort={{ field: 'createdAt', order: 'DESC' }}
    perPage={25}
    pagination={<ListPagination />}
    empty={<ListEmpty icon={<LocalHospitalOutlinedIcon />} title="No providers yet" description="Add hospitals, labs, clinics and ambulance services so cases can be routed to them." />}
  >
    <ResponsiveDatagrid
      mobile={{
        primaryText: (r: any) => r.name,
        secondaryText: (r: any) => facts(TYPE_LABEL[r.type] ?? r.type, r.city),
        tertiaryText: (r: any) => <StatusChip value={r.status} size="sm" />,
      }}
    >
      <FunctionField
        label="Provider"
        sortBy="name"
        render={(r: any) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
            <Typography variant="caption" color="text.secondary" component="div">{facts(r.city, r.state)}</Typography>
          </Box>
        )}
      />
      <FunctionField label="Type" sortBy="type" render={(r: any) => <Typography variant="body2">{TYPE_LABEL[r.type] ?? r.type}</Typography>} />
      <FunctionField
        label="Contact"
        sortable={false}
        render={(r: any) => (
          <>
            <Typography variant="body2">{r.contactPerson || '—'}</Typography>
            <Typography variant="caption" color="text.secondary">{r.phone}</Typography>
          </>
        )}
      />
      <NumberField source="rating" label="Rating" options={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} />
      <FunctionField label="Status" sortBy="status" render={(r: any) => <StatusChip value={r.status} />} />
      <FunctionField
        label=""
        render={() => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
            <RowEditButton />
            <StatusMenu />
          </Box>
        )}
      />
    </ResponsiveDatagrid>
  </List>
);
