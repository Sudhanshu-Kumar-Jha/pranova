import React, { useState } from 'react';
import { List, FunctionField, SearchInput, useRecordContext, useRefresh, useNotify, Confirm } from 'react-admin';
import { Box, Button, Typography } from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import { apiClient } from '../../providers/dataProvider.js';
import { ListPagination } from '../../components/ListPagination.js';
import { ResponsiveDatagrid } from '../../ui/ResponsiveDatagrid.js';
import { StatusChip } from '../../ui/StatusChip.js';
import { ListEmpty } from '../../ui/EmptyState.js';
import { PersonCell } from '../../ui/Panel.js';
import { formatDate } from '../../design/tokens.js';

const filters = [<SearchInput key="q" source="q" alwaysOn placeholder="Search by name or email" />];

const fullName = (r: any) => [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email;

const AccessAction: React.FC = () => {
  const record = useRecordContext();
  const refresh = useRefresh();
  const notify = useNotify();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (!record) return null;

  const change = async (status: 'ACTIVE' | 'SUSPENDED') => {
    setBusy(true);
    try {
      await apiClient.patch(`/admins/${record.id}/status`, { status });
      notify(status === 'ACTIVE' ? `${fullName(record)} can sign in again` : `${fullName(record)} has been suspended`, { type: 'success' });
      refresh();
    } catch (e: any) {
      notify(e?.response?.data?.message || 'Access could not be changed. Try again.', { type: 'error' });
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
      {record.status === 'ACTIVE' ? (
        <Button size="small" color="error" disabled={busy} onClick={() => setConfirmOpen(true)}>Suspend</Button>
      ) : (
        <Button size="small" variant="outlined" color="primary" disabled={busy} onClick={() => change('ACTIVE')}>Restore access</Button>
      )}
      <Confirm
        isOpen={confirmOpen}
        loading={busy}
        title={`Suspend ${fullName(record)}?`}
        content="They lose access to the console immediately and can't sign in until access is restored."
        confirm="Suspend"
        confirmColor="warning"
        cancel="Cancel"
        onConfirm={() => change('SUSPENDED')}
        onClose={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

export const AdminList: React.FC = () => (
  <List
    filters={filters}
    sort={{ field: 'createdAt', order: 'DESC' }}
    perPage={25}
    pagination={<ListPagination />}
    empty={<ListEmpty icon={<AdminPanelSettingsOutlinedIcon />} title="No administrators" description="Invite colleagues so the operations team has their own accounts and audit history." />}
  >
    <ResponsiveDatagrid
      rowClick={false}
      mobile={{
        linkType: false,
        primaryText: (r: any) => fullName(r),
        secondaryText: (r: any) => r.email,
        tertiaryText: (r: any) => <StatusChip value={r.status} size="sm" />,
      }}
    >
      <FunctionField label="Administrator" sortBy="email" render={(r: any) => <PersonCell name={fullName(r)} secondary={r.email} />} />
      <FunctionField label="Department" sortable={false} render={(r: any) => <Typography variant="body2">{r.department || '—'}</Typography>} />
      <FunctionField label="Added" sortBy="createdAt" render={(r: any) => <Typography variant="body2" className="num">{formatDate(r.createdAt)}</Typography>} />
      <FunctionField label="Access" sortBy="status" render={(r: any) => <StatusChip value={r.status} />} />
      <AccessAction />
    </ResponsiveDatagrid>
  </List>
);
