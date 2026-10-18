import React, { useState } from 'react';
import { List, FunctionField, SearchInput, SelectInput, TopToolbar, CreateButton, FilterButton, useRecordContext } from 'react-admin';
import { Box, Button, Typography } from '@mui/material';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import { AssignCaseDialog } from './AssignCaseDialog.js';
import { ExportCasesModal } from '../../components/ExportCasesModal.js';
import { ListPagination } from '../../components/ListPagination.js';
import { ResponsiveDatagrid } from '../../ui/ResponsiveDatagrid.js';
import { StatusChip, PriorityChip, ToneChip } from '../../ui/StatusChip.js';
import { ListEmpty } from '../../ui/EmptyState.js';
import { facts } from '../../ui/Panel.js';
import { formatDateTime, humanize } from '../../design/tokens.js';

const caseFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Search by case number, title or patient" />,
  <SelectInput
    key="priority"
    source="priority"
    label="Priority"
    choices={[
      { id: 'P1', name: 'P1 Emergency' },
      { id: 'P2', name: 'P2 Urgent' },
      { id: 'P3', name: 'P3 Routine' },
    ]}
  />,
  <SelectInput
    key="status"
    source="status"
    label="Status"
    choices={[
      { id: 'OPEN', name: 'Open' },
      { id: 'ASSIGNED', name: 'Assigned' },
      { id: 'IN_PROGRESS', name: 'In progress' },
      { id: 'COMPLETED_AWAITING_PAYMENT', name: 'Awaiting payment' },
      { id: 'PAID', name: 'Paid' },
      { id: 'RESOLVED', name: 'Resolved' },
      { id: 'CANCELLED', name: 'Cancelled' },
    ]}
  />,
];

const CaseListActions: React.FC<{ onOpenExport: () => void }> = ({ onOpenExport }) => (
  <TopToolbar>
    <FilterButton />
    <Button size="small" startIcon={<FileDownloadOutlinedIcon />} onClick={onOpenExport}>
      Export
    </Button>
    <CreateButton variant="contained" label="New case" />
  </TopToolbar>
);

const AssignActionCell: React.FC<{ onAssign: (record: any) => void }> = ({ onAssign }) => {
  const record = useRecordContext();
  if (!record) return null;
  const assigned = !!record.careManagerId;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Button
        size="small"
        variant={assigned ? 'text' : 'outlined'}
        color="primary"
        startIcon={<AssignmentIndOutlinedIcon />}
        onClick={(e) => {
          e.stopPropagation();
          onAssign(record);
        }}
      >
        {assigned ? 'Reassign' : 'Assign'}
      </Button>
    </Box>
  );
};

const CareManagerCell: React.FC<{ r: any }> = ({ r }) =>
  r.careManagerId ? (
    <Typography variant="body2">{r.careManagerName}</Typography>
  ) : (
    <ToneChip tone="warning" size="sm">Unassigned</ToneChip>
  );

export const CaseList: React.FC = () => {
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <>
      <List
        filters={caseFilters}
        actions={<CaseListActions onOpenExport={() => setExportOpen(true)} />}
        sort={{ field: 'createdAt', order: 'DESC' }}
        perPage={25}
        pagination={<ListPagination />}
        empty={<ListEmpty icon={<MonitorHeartOutlinedIcon />} title="No cases yet" description="Emergency SOS alerts and coordination requests create cases here. You can also open one manually." />}
      >
        <ResponsiveDatagrid
          mobile={{
            primaryText: (r: any) => r.title,
            secondaryText: (r: any) => facts(r.caseNumber, r.patientName, r.careManagerId ? r.careManagerName : 'Unassigned'),
            tertiaryText: (r: any) => (
              <Box sx={{ display: 'grid', justifyItems: 'end', gap: 0.5 }}>
                <PriorityChip value={r.priority} size="sm" />
                <StatusChip value={r.status} size="sm" />
              </Box>
            ),
          }}
        >
          <FunctionField label="Priority" sortBy="priority" render={(r: any) => <PriorityChip value={r.priority} />} />
          <FunctionField
            label="Case"
            sortBy="createdAt"
            render={(r: any) => (
              <Box sx={{ minWidth: 0, maxWidth: 320 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={r.title}>{r.title}</Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  {facts(r.caseNumber, humanize(r.triggerSource))}
                </Typography>
              </Box>
            )}
          />
          <FunctionField
            label="Patient"
            sortable={false}
            render={(r: any) => (
              <>
                <Typography variant="body2">{r.patientName}</Typography>
                <Typography variant="caption" color="text.secondary">{r.patientPhone}</Typography>
              </>
            )}
          />
          <FunctionField label="Care manager" sortable={false} render={(r: any) => <CareManagerCell r={r} />} />
          <FunctionField label="Status" sortBy="status" render={(r: any) => <StatusChip value={r.status} />} />
          <FunctionField
            label="Payment"
            sortable={false}
            render={(r: any) => {
              if (r.paymentStatus === 'PAID') {
                return (
                  <ToneChip tone="success" size="sm">
                    {r.paymentAmount ? `₹${r.paymentAmount} Paid` : 'Paid'}
                  </ToneChip>
                );
              }
              if (r.paymentStatus === 'PENDING' || r.status === 'COMPLETED_AWAITING_PAYMENT') {
                return (
                  <ToneChip tone="warning" size="sm">
                    {r.paymentAmount ? `₹${r.paymentAmount} Due` : 'Pending'}
                  </ToneChip>
                );
              }
              if (r.paymentStatus === 'FAILED') {
                return <ToneChip tone="error" size="sm">Failed</ToneChip>;
              }
              return <Typography variant="caption" color="text.secondary">—</Typography>;
            }}
          />
          <FunctionField label="Raised" sortBy="createdAt" render={(r: any) => <Typography variant="body2" className="num">{formatDateTime(r.createdAt)}</Typography>} />
          <AssignActionCell onAssign={(rec) => setSelectedCase(rec)} />
        </ResponsiveDatagrid>
      </List>

      {selectedCase && (
        <AssignCaseDialog
          open={Boolean(selectedCase)}
          onClose={() => setSelectedCase(null)}
          caseId={selectedCase.id}
          caseNumber={selectedCase.caseNumber}
          currentCareManagerId={selectedCase.careManagerId}
        />
      )}

      <ExportCasesModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </>
  );
};
