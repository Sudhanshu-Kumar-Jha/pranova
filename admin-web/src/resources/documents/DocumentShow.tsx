import React, { useEffect, useState } from 'react';
import { Show, useRecordContext } from 'react-admin';
import { Box, Button, Typography, Alert, Paper, Chip, CircularProgress } from '@mui/material';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import HistoryToggleOffOutlinedIcon from '@mui/icons-material/HistoryToggleOffOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { Link } from 'react-router-dom';
import { Panel, DetailHeader, InfoGrid, InfoItem, SkeletonLines, facts } from '../../ui/Panel.js';
import { ToneChip } from '../../ui/StatusChip.js';
import { formatDateTime, humanize, color, Tone } from '../../design/tokens.js';
import { apiClient } from '../../providers/dataProvider.js';

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

const DocumentTitle: React.FC = () => {
  const r = useRecordContext();
  return <span>{r ? r.title : 'Medical Document'}</span>;
};

/**
 * Access Timeline fetching immutable DocumentAccessLog entries
 */
const DocumentAccessTimeline: React.FC<{ documentId: string }> = ({ documentId }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchLogs = async () => {
      try {
        setLoading(true);
        // Call backend /documents/:id/access-logs
        const res = await apiClient.get(`/documents/${documentId}/access-logs`);
        if (isMounted) {
          setLogs(res.data.data || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.message || 'Could not load document access logs');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (documentId) {
      void fetchLogs();
    }

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 3 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Loading immutable access history...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!logs.length) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No prior inspection logs recorded for this document.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {logs.map((log, index) => {
        const last = index === logs.length - 1;
        const roleTone: Tone =
          log.accessorRole === 'ADMIN'
            ? 'primary'
            : log.accessorRole === 'CARE_MANAGER'
            ? 'info'
            : log.accessorRole === 'PATIENT'
            ? 'success'
            : 'neutral';

        return (
          <Box
            component="li"
            key={log.id || index}
            sx={{
              display: 'grid',
              gridTemplateColumns: '20px minmax(0, 1fr)',
              columnGap: 1.5,
            }}
          >
            {/* Timeline Rail Dot */}
            <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }} aria-hidden>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  mt: 0.75,
                  bgcolor: index === 0 ? color.primary : color.line,
                  border: `2px solid ${index === 0 ? color.primarySoft : color.surface}`,
                  boxSizing: 'content-box',
                  zIndex: 1,
                }}
              />
              {!last && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 18,
                    bottom: 0,
                    width: '2px',
                    bgcolor: color.lineSoft,
                  }}
                />
              )}
            </Box>

            {/* Timeline Entry Body */}
            <Box sx={{ pb: last ? 0 : 2.5, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <ToneChip tone={roleTone} size="sm">
                  {humanize(log.accessorRole)}
                </ToneChip>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {log.accessorName}
                </Typography>
                <Chip
                  label={log.action}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.68rem',
                    fontFamily: 'monospace',
                    bgcolor: color.surfaceSunken,
                    border: `1px solid ${color.line}`,
                  }}
                />
              </Box>

              <Typography variant="caption" color="text.secondary" component="div" className="num" sx={{ mt: 0.5 }}>
                {facts(
                  formatDateTime(log.accessedAt),
                  log.accessorEmail,
                  log.ipAddress && `IP: ${log.ipAddress}`
                )}
              </Typography>

              {log.userAgent && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 0.5,
                    display: 'block',
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    wordBreak: 'break-all',
                  }}
                >
                  Client: {log.userAgent}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

const getAuthenticatedUrl = (url?: string) => {
  if (!url) return '';
  const token = localStorage.getItem('pranova_access_token');
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
};

const Content: React.FC = () => {
  const r = useRecordContext();
  if (!r) {
    return (
      <Box sx={{ p: 3 }}>
        <SkeletonLines rows={6} />
      </Box>
    );
  }

  const fileUrl = getAuthenticatedUrl(r.downloadUrl || r.fileUrl);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1.5, sm: 2 } }}>
      {/* Header Banner */}
      <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${color.line}`, borderRadius: '10px', mb: 3 }}>
        <DetailHeader
          title={r.title}
          status={
            <ToneChip tone={TYPE_TONE[r.documentType] || 'neutral'}>
              {humanize(r.documentType)}
            </ToneChip>
          }
          subtitle={facts(
            `Patient: ${r.patientName}`,
            `Uploaded ${formatDateTime(r.createdAt)}`,
            formatBytes(r.fileSize)
          )}
          actions={
            fileUrl ? (
              <Button
                variant="contained"
                color="primary"
                component="a"
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<OpenInNewOutlinedIcon />}
              >
                View / Download Document
              </Button>
            ) : undefined
          }
        />

        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          <Alert
            severity="info"
            icon={<SecurityOutlinedIcon fontSize="inherit" />}
            sx={{ bgcolor: color.primarySoft, color: color.primaryPressed, border: `1px solid ${color.primaryLine}` }}
          >
            <strong>Healthcare Compliance Notice (DPDP & HIPAA):</strong> Administrator oversight permits clinical inspection of this record. Opening or inspecting this document is permanently logged in the access history.
          </Alert>
        </Box>
      </Box>

      {/* Grid Layout */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.8fr) minmax(0, 1.2fr)' }, gap: 3, alignItems: 'start' }}>
        {/* Left Column: Metadata & Notes */}
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Panel title="Document details">
            <InfoGrid columns={2}>
              <InfoItem label="Title">{r.title}</InfoItem>
              <InfoItem label="Document type">{humanize(r.documentType)}</InfoItem>
              <InfoItem label="MIME format">{r.mimeType || 'application/pdf'}</InfoItem>
              <InfoItem label="File size">{formatBytes(r.fileSize)}</InfoItem>
              <InfoItem label="Storage link" full>
                {fileUrl ? (
                  <Button
                    size="small"
                    variant="text"
                    component="a"
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 14 }} />}
                    sx={{ textTransform: 'none', p: 0, minWidth: 0, justifyContent: 'flex-start' }}
                  >
                    Open secure file in new tab
                  </Button>
                ) : (
                  'No file URL available'
                )}
              </InfoItem>
              {r.notes && (
                <InfoItem label="Clinical notes" full>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                    {r.notes}
                  </Typography>
                </InfoItem>
              )}
            </InfoGrid>
          </Panel>

          <Panel title="Patient details">
            <InfoGrid columns={2}>
              <InfoItem label="Name">{r.patientName}</InfoItem>
              <InfoItem label="Phone">{r.patientPhone || '—'}</InfoItem>
              <InfoItem label="Email">{r.patientEmail || '—'}</InfoItem>
              <InfoItem label="Blood group">{r.patientBloodGroup || '—'}</InfoItem>
              {r.patientAddress && (
                <InfoItem label="Address" full>
                  {r.patientAddress}
                </InfoItem>
              )}
            </InfoGrid>
          </Panel>
        </Box>

        {/* Right Column: Linked Case & Access Timeline */}
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Panel title="Linked coordination case">
            {r.caseNumber ? (
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <InfoGrid columns={1}>
                  <InfoItem label="Case reference">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                      {r.caseNumber}
                    </Typography>
                  </InfoItem>
                  <InfoItem label="Case title">{r.caseTitle}</InfoItem>
                  <InfoItem label="Case status">{r.caseStatus ? humanize(r.caseStatus) : '—'}</InfoItem>
                </InfoGrid>
                {r.caseId && (
                  <Button
                    component={Link}
                    to={`/cases/${r.caseId}/show`}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 1 }}
                  >
                    View Case Dashboard
                  </Button>
                )}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                This document was uploaded directly to the patient's general health vault and is not bound to a single emergency case.
              </Typography>
            )}
          </Panel>

          <Panel
            title="Document access timeline"
            description="Immutable audit trail of every clinical access, download or inspection."
          >
            <DocumentAccessTimeline documentId={String(r.id)} />
          </Panel>
        </Box>
      </Box>
    </Box>
  );
};

export const DocumentShow: React.FC = () => (
  <Show component="div" title={<DocumentTitle />} actions={false}>
    <Content />
  </Show>
);
