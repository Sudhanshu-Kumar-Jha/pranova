import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Typography, Skeleton, Alert, Table, TableBody, TableCell, TableHead, TableRow,
  useMediaQuery, Theme, Link as MuiLink,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CrisisAlertOutlinedIcon from '@mui/icons-material/CrisisAlertOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import MedicationOutlinedIcon from '@mui/icons-material/MedicationOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import { apiClient } from '../providers/dataProvider.js';
import { color, formatINR, formatDateTime, humanize, statusMeta, toneColors, Tone, plural } from '../design/tokens.js';
import { Panel, PageHeader, PersonCell, facts } from '../ui/Panel.js';
import { StatusChip } from '../ui/StatusChip.js';
import { EmptyState } from '../ui/EmptyState.js';

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */

interface Overview {
  appointments: { total: number; today: number; list: any[] };
  orders: { total: number; inFulfilment: number; awaitingConfirmation: number; list: any[] };
  lab: { total: number; awaitingSample: number };
  cases: { activeP1: number; unassigned: number };
  requestedConsults: number;
  doctors: number;
  patients: number;
  specialties: number;
  medicines: number;
  providers: number;
  diagnosticTests: number;
  bookingValue: number;
  bookingValuePartial: boolean;
}

const ACTIVE_CASE = ['OPEN', 'ASSIGNED', 'IN_PROGRESS'];
const DONE_ORDER = ['DELIVERED', 'CANCELLED'];
const PIPELINE_ORDER = ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

async function count(path: string, filter?: Record<string, string>): Promise<number> {
  const res = await apiClient.get(path, { params: { perPage: 1, ...(filter ?? {}) } });
  return res.data?.meta?.total ?? 0;
}

async function list(path: string, params: Record<string, string | number> = {}) {
  const res = await apiClient.get(path, { params: { perPage: 100, ...params } });
  return { data: (res.data?.data ?? []) as any[], total: (res.data?.meta?.total ?? 0) as number };
}

async function loadOverview(): Promise<Overview> {
  const [
    appts,
    orders,
    labTotal,
    labBooked,
    p1Cases,
    openCases,
    requested,
    placed,
    doctors,
    patients,
    specialties,
    medicines,
    providers,
    diagnosticTests,
  ] = await Promise.all([
    list('/appointments', { sort: 'scheduledStart', order: 'DESC' }),
    list('/orders', { sort: 'placedAt', order: 'DESC' }),
    count('/lab-bookings'),
    count('/lab-bookings', { status: 'BOOKED' }),
    list('/cases', { priority: 'P1' }),
    count('/cases', { status: 'OPEN' }),
    count('/appointments', { status: 'REQUESTED' }),
    count('/orders', { status: 'PLACED' }),
    count('/doctors'),
    count('/patients'),
    count('/specialties'),
    count('/medicines'),
    count('/providers'),
    count('/diagnostic-tests'),
  ]);

  const today = new Date().toDateString();
  const bookingValue =
    orders.data.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + (o.totalAmount || 0), 0) +
    appts.data.filter((a) => a.status !== 'CANCELLED').reduce((s, a) => s + (a.fee || 0), 0);

  return {
    appointments: {
      total: appts.total,
      today: appts.data.filter((a) => new Date(a.scheduledStart).toDateString() === today).length,
      list: appts.data,
    },
    orders: {
      total: orders.total,
      inFulfilment: orders.data.filter((o) => !DONE_ORDER.includes(o.status)).length,
      awaitingConfirmation: placed,
      list: orders.data,
    },
    lab: { total: labTotal, awaitingSample: labBooked },
    cases: { activeP1: p1Cases.data.filter((c) => ACTIVE_CASE.includes(c.status)).length, unassigned: openCases },
    requestedConsults: requested,
    doctors,
    patients,
    specialties,
    medicines,
    providers,
    diagnosticTests,
    bookingValue,
    bookingValuePartial: appts.total > appts.data.length || orders.total > orders.data.length,
  };
}

const filterHref = (resource: string, filter: Record<string, string>) =>
  `/${resource}?filter=${encodeURIComponent(JSON.stringify(filter))}`;

/* ------------------------------------------------------------------ */
/* Pieces                                                               */
/* ------------------------------------------------------------------ */

const LedgerCell: React.FC<{ label: string; value: React.ReactNode; note: React.ReactNode; loading: boolean; onClick?: () => void }> = ({ label, value, note, loading, onClick }) => (
  <Box
    component={onClick ? 'button' : 'div'}
    type={onClick ? 'button' : undefined}
    onClick={onClick}
    sx={{
      all: 'unset',
      boxSizing: 'border-box',
      display: 'block',
      p: { xs: 2, md: 2.5 },
      cursor: onClick ? 'pointer' : 'default',
      transition: 'background-color 120ms',
      borderRadius: 0,
      '&:hover': onClick ? { bgcolor: color.hover } : undefined,
      '&:focus-visible': { outline: `2px solid ${color.primary}`, outlineOffset: -2 },
    }}
  >
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
    {loading ? (
      <Skeleton variant="text" width="60%" sx={{ fontSize: '2rem', mt: 0.5 }} />
    ) : (
      <Typography className="num" sx={{ fontSize: { xs: '1.6rem', md: '1.9rem' }, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2, mt: 0.75, color: 'text.primary' }}>
        {value}
      </Typography>
    )}
    <Typography variant="caption" component="div" sx={{ mt: 0.5, color: 'text.secondary', minHeight: 18 }}>
      {loading ? <Skeleton variant="text" width="70%" /> : note}
    </Typography>
  </Box>
);

const AttentionRow: React.FC<{
  icon: React.ReactNode; title: string; description: string; count: number; tone: Tone; loading: boolean; onOpen: () => void;
}> = ({ icon, title, description, count, tone, loading, onOpen }) => {
  const clear = !loading && count === 0;
  const t = toneColors[clear ? 'neutral' : tone];
  return (
    <Box
      component="button"
      type="button"
      onClick={onOpen}
      aria-label={`${title}: ${loading ? 'loading' : count}. Open list`}
      sx={{
        all: 'unset',
        boxSizing: 'border-box',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '36px minmax(0,1fr) auto 20px',
        alignItems: 'center',
        gap: 1.5,
        px: 2.5,
        py: 1.5,
        cursor: 'pointer',
        borderTop: `1px solid ${color.lineSoft}`,
        transition: 'background-color 120ms',
        '&:hover': { bgcolor: color.hover },
        '&:hover .pnv-chev': { color: color.inkSoft, transform: 'translateX(2px)' },
        '&:focus-visible': { outline: `2px solid ${color.primary}`, outlineOffset: -2 },
      }}
    >
      <Box aria-hidden sx={{ width: 36, height: 36, borderRadius: '8px', display: 'grid', placeItems: 'center', bgcolor: t.bg, color: t.fg, '& svg': { fontSize: 20 } }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{title}</Typography>
        <Typography variant="caption" color="text.secondary" component="div" noWrap>{description}</Typography>
      </Box>
      {loading ? (
        <Skeleton variant="rounded" width={34} height={24} />
      ) : clear ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>All clear</Typography>
      ) : (
        <Typography className="num" sx={{ fontWeight: 700, fontSize: '1.05rem', color: t.fg, minWidth: 24, textAlign: 'right' }}>{count}</Typography>
      )}
      <ChevronRightIcon className="pnv-chev" aria-hidden sx={{ fontSize: 20, color: color.subtle, transition: 'transform 120ms, color 120ms' }} />
    </Box>
  );
};

const PipelineBars: React.FC<{ appointments: any[]; total: number; loading: boolean }> = ({ appointments, total, loading }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'grid', gap: 1.75, py: 1 }}>
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={32} />)}
      </Box>
    );
  }
  if (appointments.length === 0) {
    return <EmptyState compact icon={<EventAvailableOutlinedIcon />} title="No appointments yet" description="Bookings made in the patient app will appear here by status." />;
  }
  const counts: Record<string, number> = {};
  appointments.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
  const rows = PIPELINE_ORDER.map((s) => ({ status: s, n: counts[s] || 0 }));
  const max = Math.max(...rows.map((r) => r.n), 1);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.5, py: 0.5 }}>
        {rows.map((r) => {
          const m = statusMeta(r.status);
          const t = toneColors[m.tone];
          return (
            <Box component="li" key={r.status} sx={{ display: 'grid', gridTemplateColumns: '104px minmax(0,1fr) 28px', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem', fontWeight: 500 }}>{m.label}</Typography>
              <Box sx={{ height: 8, borderRadius: 999, bgcolor: color.lineSoft, overflow: 'hidden' }} aria-hidden>
                <Box sx={{ width: `${(r.n / max) * 100}%`, height: '100%', bgcolor: r.n > 0 ? t.fg : color.subtle, opacity: r.n > 0 ? 1 : 0.25, borderRadius: 999, transition: 'width 300ms cubic-bezier(0.2,0,0,1)' }} />
              </Box>
              <Typography className="num" variant="body2" sx={{ fontWeight: 600, textAlign: 'right', color: r.n > 0 ? 'text.primary' : 'text.disabled' }}>{r.n}</Typography>
            </Box>
          );
        })}
      </Box>
      {total > appointments.length && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5, mb: 0, fontSize: '0.75rem' }}>
          Based on the latest {appointments.length} of {total} appointments.
        </Typography>
      )}
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const isSmall = useMediaQuery((t: Theme) => t.breakpoints.down('md'));
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadOverview());
      setUpdatedAt(new Date());
    } catch (e: any) {
      setError(e?.response?.data?.message || 'The overview could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const d = data;
  const showSkeleton = loading && !d;
  const todayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  const networkMetrics = [
    { label: 'Doctors', value: d?.doctors, to: '/doctors', icon: <MedicalServicesOutlinedIcon sx={{ fontSize: 18 }} /> },
    { label: 'Patients', value: d?.patients, to: '/patients', icon: <PeopleAltOutlinedIcon sx={{ fontSize: 18 }} /> },
    { label: 'Specialties', value: d?.specialties, to: '/specialties', icon: <CategoryOutlinedIcon sx={{ fontSize: 18 }} /> },
    { label: 'Medicines', value: d?.medicines, to: '/medicines', icon: <MedicationOutlinedIcon sx={{ fontSize: 18 }} /> },
    { label: 'Lab tests', value: d?.diagnosticTests, to: '/diagnostic-tests', icon: <ScienceOutlinedIcon sx={{ fontSize: 18 }} /> },
    { label: 'Providers', value: d?.providers, to: '/providers', icon: <LocalHospitalOutlinedIcon sx={{ fontSize: 18 }} /> },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', pb: 8 }}>
      <PageHeader
        title="Overview"
        description={`${todayLabel}. Consultations, pharmacy, diagnostics and emergency coordination at a glance.`}
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {updatedAt && (
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                Updated {updatedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
              </Typography>
            )}
            <Button variant="outlined" size="small" onClick={load} disabled={loading} startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}>
              {loading && d ? 'Refreshing' : 'Refresh'}
            </Button>
          </Box>
        }
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={<Button color="inherit" size="small" onClick={load}>Try again</Button>}
        >
          {error} Check that the API is running, then try again.
        </Alert>
      )}

      {/* Ledger strip — one surface, four figures */}
      <Box
        component="section"
        aria-label="Key figures"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', lg: 'repeat(4, minmax(0,1fr))' },
          bgcolor: 'background.paper',
          border: `1px solid ${color.line}`,
          borderRadius: '10px',
          overflow: 'hidden',
          mb: 3,
          '& > *': { borderLeft: `1px solid ${color.lineSoft}`, borderTop: `1px solid ${color.lineSoft}` },
          '& > *:nth-of-type(-n+2)': { borderTop: 'none' },
          '& > *:nth-of-type(odd)': { borderLeft: 'none' },
          '@media (min-width: 1200px)': {
            '& > *': { borderTop: 'none', borderLeft: `1px solid ${color.lineSoft}` },
            '& > *:first-of-type': { borderLeft: 'none' },
          },
        }}
      >
        <LedgerCell
          label="Booking value"
          loading={showSkeleton}
          value={d ? formatINR(d.bookingValue) : ''}
          note={d ? (d.bookingValuePartial ? 'Consultations and pharmacy, latest 100 of each' : 'Consultation fees and pharmacy orders') : ''}
        />
        <LedgerCell
          label="Appointments"
          loading={showSkeleton}
          value={d?.appointments.total ?? ''}
          note={d ? (d.appointments.today ? `${d.appointments.today} scheduled today` : 'None scheduled today') : ''}
          onClick={() => navigate('/appointments')}
        />
        <LedgerCell
          label="Orders in fulfilment"
          loading={showSkeleton}
          value={d?.orders.inFulfilment ?? ''}
          note={d ? `${plural(d.orders.total, 'order')} in total` : ''}
          onClick={() => navigate(filterHref('orders', {}))}
        />
        <LedgerCell
          label="Lab bookings"
          loading={showSkeleton}
          value={d?.lab.total ?? ''}
          note={d ? (d.lab.awaitingSample ? `${d.lab.awaitingSample} awaiting sample collection` : 'No samples awaiting collection') : ''}
          onClick={() => navigate('/lab-bookings')}
        />
      </Box>

      {/* Command Center: 3 panels side-by-side on lg and xl, 1 column on tablet and mobile */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: '1fr',
            lg: 'repeat(3, minmax(0, 1fr))',
            xl: 'minmax(0, 4.2fr) minmax(0, 3.8fr) minmax(0, 4fr)',
          },
          gap: { xs: 2, md: 2.5, xl: 3 },
          mb: 3,
          alignItems: 'stretch',
        }}
      >
        <Panel title="Needs attention" description="Work waiting on the operations team." padded={false}>
          <Box sx={{ pb: 0.5 }}>
            <AttentionRow
              icon={<CrisisAlertOutlinedIcon />}
              title="Active P1 emergencies"
              description="SOS cases that are open, assigned or in progress"
              count={d?.cases.activeP1 ?? 0}
              tone="error"
              loading={showSkeleton}
              onOpen={() => navigate(filterHref('cases', { priority: 'P1' }))}
            />
            <AttentionRow
              icon={<AssignmentIndOutlinedIcon />}
              title="Cases without a care manager"
              description="Open cases that still need to be assigned"
              count={d?.cases.unassigned ?? 0}
              tone="warning"
              loading={showSkeleton}
              onOpen={() => navigate(filterHref('cases', { status: 'OPEN' }))}
            />
            <AttentionRow
              icon={<ReceiptLongOutlinedIcon />}
              title="Orders awaiting confirmation"
              description="Pharmacy orders placed but not yet confirmed"
              count={d?.orders.awaitingConfirmation ?? 0}
              tone="warning"
              loading={showSkeleton}
              onOpen={() => navigate(filterHref('orders', { status: 'PLACED' }))}
            />
            <AttentionRow
              icon={<BiotechOutlinedIcon />}
              title="Samples to collect"
              description="Lab bookings waiting for sample collection"
              count={d?.lab.awaitingSample ?? 0}
              tone="info"
              loading={showSkeleton}
              onOpen={() => navigate(filterHref('lab-bookings', { status: 'BOOKED' }))}
            />
            <AttentionRow
              icon={<EventAvailableOutlinedIcon />}
              title="Consultation requests"
              description="Appointments requested by patients, not yet confirmed"
              count={d?.requestedConsults ?? 0}
              tone="info"
              loading={showSkeleton}
              onOpen={() => navigate(filterHref('appointments', { status: 'REQUESTED' }))}
            />
          </Box>
        </Panel>

        <Panel title="Appointment pipeline" description="Where consultations currently stand.">
          <PipelineBars appointments={d?.appointments.list ?? []} total={d?.appointments.total ?? 0} loading={showSkeleton} />
        </Panel>

        <Panel
          title="Care network & catalog"
          description="Active platform infrastructure and inventory."
          sx={{
            gridColumn: { xs: 'auto', lg: 'span 2', xl: 'auto' },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(6, minmax(0, 1fr))',
                xl: 'repeat(2, minmax(0, 1fr))',
              },
              gap: 1.5,
              mt: 0.5,
            }}
          >
            {networkMetrics.map((s) => (
              <Box
                component="button"
                type="button"
                key={s.label}
                onClick={() => navigate(s.to)}
                sx={{
                  all: 'unset',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  p: { xs: 1.5, xl: 1.75 },
                  borderRadius: '8px',
                  bgcolor: 'background.paper',
                  border: `1px solid ${color.lineSoft}`,
                  cursor: 'pointer',
                  transition: 'all 140ms ease',
                  '&:hover': {
                    bgcolor: color.hover,
                    borderColor: color.line,
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  },
                  '&:focus-visible': { outline: `2px solid ${color.primary}`, outlineOffset: -2 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ color: color.primary, display: 'flex', alignItems: 'center' }}>{s.icon}</Box>
                  <ChevronRightIcon sx={{ fontSize: 16, color: color.subtle }} />
                </Box>
                <Box>
                  {showSkeleton ? (
                    <Skeleton variant="text" width={40} sx={{ fontSize: '1.45rem' }} />
                  ) : (
                    <Typography className="num" sx={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'text.primary', lineHeight: 1.2 }}>
                      {s.value ?? 0}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, mt: 0.25, display: 'block' }} noWrap>
                    {s.label}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Panel>
      </Box>

      <Panel
        title="Recent appointments"
        description="The latest consultations across the platform."
        padded={false}
        action={<Button size="small" onClick={() => navigate('/appointments')}>View all</Button>}
      >
        {showSkeleton ? (
          <Box sx={{ p: 2.5, display: 'grid', gap: 1.5 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={40} />)}
          </Box>
        ) : !d || d.appointments.list.length === 0 ? (
          <EmptyState compact icon={<EventAvailableOutlinedIcon />} title="No appointments yet" description="When patients book consultations, the most recent ones show up here." />
        ) : isSmall ? (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {d.appointments.list.slice(0, 6).map((a) => (
              <Box
                component="li"
                key={a.id}
                onClick={() => navigate(`/appointments/${a.id}/show`)}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, px: 2, py: 1.5, borderTop: `1px solid ${color.lineSoft}`, cursor: 'pointer' }}
              >
                <PersonCell
                  name={`Dr. ${a.doctor?.firstName ?? ''} ${a.doctor?.lastName ?? ''}`.trim()}
                  secondary={facts(humanize(a.type), formatDateTime(a.scheduledStart))}
                />
                <StatusChip value={a.status} size="sm" />
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label="Recent appointments" sx={{ tableLayout: { xs: 'auto', md: 'fixed' }, minWidth: 700 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '28%' }}>Doctor</TableCell>
                  <TableCell sx={{ width: '24%' }}>Patient</TableCell>
                  <TableCell sx={{ width: '14%' }}>Type</TableCell>
                  <TableCell sx={{ width: '18%' }}>Scheduled</TableCell>
                  <TableCell align="right" sx={{ width: '8%' }}>Fee</TableCell>
                  <TableCell sx={{ width: '8%', textAlign: 'center' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {d.appointments.list.slice(0, 6).map((a) => {
                  const patient = a.patient?.patientProfile;
                  return (
                    <TableRow
                      key={a.id}
                      hover
                      tabIndex={0}
                      onClick={() => navigate(`/appointments/${a.id}/show`)}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/appointments/${a.id}/show`); }}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <PersonCell
                          name={`Dr. ${a.doctor?.firstName ?? ''} ${a.doctor?.lastName ?? ''}`.trim()}
                          secondary={a.doctor?.specialty?.name}
                          src={a.doctor?.photoUrl}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{patient ? `${patient.firstName} ${patient.lastName}` : a.patient?.phone ?? '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{a.appointmentNumber}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2">{humanize(a.type)}</Typography></TableCell>
                      <TableCell><Typography variant="body2" className="num">{formatDateTime(a.scheduledStart)}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2" className="num">{formatINR(a.fee)}</Typography></TableCell>
                      <TableCell align="center"><StatusChip value={a.status} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Panel>
    </Box>
  );
};

export default Dashboard;
