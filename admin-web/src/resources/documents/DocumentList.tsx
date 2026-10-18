import React from 'react';
import { List, FunctionField, SearchInput, SelectInput, useRecordContext } from 'react-admin';
import { Box, Typography, Button, Chip } from '@mui/material';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Link } from 'react-router-dom';
import { ListPagination } from '../../components/ListPagination.js';
import { ResponsiveDatagrid } from '../../ui/ResponsiveDatagrid.js';
import { ToneChip } from '../../ui/StatusChip.js';
import { EmptyState } from '../../ui/EmptyState.js';
import { facts } from '../../ui/Panel.js';
import { formatDateTime, humanize, color, Tone } from '../../design/tokens.js';

const documentFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Search by document title, patient or case ID" />,
  <SelectInput
    key="documentType"
    source="documentType"
    label="Document type"
    choices={[
      { id: 'PRESCRIPTION', name: 'Prescription' },
      { id: 'LAB_REPORT', name: 'Lab report' },
      { id: 'DISCHARGE_SUMMARY', name: 'Discharge summary' },
      { id: 'INSURANCE_POLICY', name: 'Insurance policy' },
      { id: 'VACCINATION_RECORD', name: 'Vaccination record' },
      { id: 'OTHER', name: 'Other' },
    ]}
  />,
];

const TYPE_TONE: Record<string, Tone> = {
  PRESCRIPTION: 'info',
  LAB_REPORT: 'primary',
  DISCHARGE_SUMMARY: 'warning',
  INSURANCE_POLICY: 'neutral',
  VACCINATION_RECORD: 'success',
  OTHER: 'neutral',
};

const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getAuthenticatedUrl = (url?: string) => {
  if (!url) return '';
  const token = localStorage.getItem('pranova_access_token');
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
};

const DocumentActionCell: React.FC = () => {
  const r = useRecordContext();
  if (!r) return null;

  const authenticatedUrl = getAuthenticatedUrl(r.fileUrl);

  return (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
      <Button
        component={Link}
        to={`/documents/${r.id}/show`}
        size="small"
        variant="outlined"
        color="primary"
        startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 16 }} />}
        onClick={(e) => e.stopPropagation()}
      >
        Audit & View
      </Button>
      {authenticatedUrl && (
        <Button
          component="a"
          href={authenticatedUrl}
          target="_blank"
          rel="noopener noreferrer"
          size="small"
          variant="text"
          color="primary"
          startIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={(e) => e.stopPropagation()}
        >
          File
        </Button>
      )}
    </Box>
  );
};

export const DocumentList: React.FC = () => {
  return (
    <List
      filters={documentFilters}
      sort={{ field: 'createdAt', order: 'DESC' }}
      perPage={25}
      pagination={<ListPagination />}
      exporter={false}
      empty={
        <Box sx={{ border: `1px solid ${color.line}`, borderRadius: '10px', bgcolor: 'background.paper', mt: 1 }}>
          <EmptyState
            icon={<FolderSharedOutlinedIcon />}
            title="No medical documents found"
            description="Clinical prescriptions, pathology reports and discharge records uploaded by patients appear here for compliance audit."
          />
        </Box>
      }
    >
      <ResponsiveDatagrid
        mobile={{
          primaryText: (r: any) => r.title,
          secondaryText: (r: any) => facts(r.patientName, r.caseNumber || 'No case linked'),
          tertiaryText: (r: any) => (
            <ToneChip tone={TYPE_TONE[r.documentType] || 'neutral'} size="sm">
              {humanize(r.documentType)}
            </ToneChip>
          ),
        }}
      >
        <FunctionField
          label="Document name"
          sortBy="title"
          render={(r: any) => (
            <Box sx={{ minWidth: 0, maxWidth: 320 }}>
              <Typography
                component={Link}
                to={`/documents/${r.id}/show`}
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                  display: 'inline-block',
                  maxWidth: '100%',
                }}
                noWrap
                title={r.title}
              >
                {r.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                {facts(r.mimeType || 'PDF', formatBytes(r.fileSize))}
              </Typography>
            </Box>
          )}
        />

        <FunctionField
          label="Patient"
          sortable={false}
          render={(r: any) => (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {r.patientName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {r.patientPhone || 'No phone'}
              </Typography>
            </Box>
          )}
        />

        <FunctionField
          label="Case reference"
          sortable={false}
          render={(r: any) =>
            r.caseNumber ? (
              <Box>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {r.caseNumber}
                </Typography>
                {r.caseTitle && (
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 180, display: 'block' }}>
                    {r.caseTitle}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Direct Upload
              </Typography>
            )
          }
        />

        <FunctionField
          label="Document type"
          sortBy="documentType"
          render={(r: any) => (
            <ToneChip tone={TYPE_TONE[r.documentType] || 'neutral'} size="sm">
              {humanize(r.documentType)}
            </ToneChip>
          )}
        />

        <FunctionField
          label="Access logs"
          sortable={false}
          render={(r: any) => (
            <Chip
              label={`${r.accessLogsCount ?? 0} views`}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                fontWeight: 600,
                bgcolor: color.surfaceSunken,
                border: `1px solid ${color.line}`,
              }}
            />
          )}
        />

        <FunctionField
          label="Uploaded"
          sortBy="createdAt"
          render={(r: any) => (
            <Typography variant="body2" className="num">
              {formatDateTime(r.createdAt)}
            </Typography>
          )}
        />

        <DocumentActionCell />
      </ResponsiveDatagrid>
    </List>
  );
};
