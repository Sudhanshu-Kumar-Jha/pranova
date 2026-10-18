/**
 * PRANOVA design tokens — the single source of truth for colour, type,
 * radius, elevation and status semantics. Components read from here (or from
 * the MUI theme built on it); never hard-code hex values in feature code.
 */

export const color = {
  // Neutrals — a cool, slightly green-leaning grey ("clinical linen")
  ink: '#13212F', // primary text
  inkSoft: '#3D4D5C', // strong secondary text
  muted: '#5C6C79', // secondary text
  subtle: '#8594A0', // tertiary / metadata
  canvas: '#F4F7F8', // app background
  surface: '#FFFFFF', // panels
  surfaceSunken: '#F8FAFB', // table headers, wells
  line: '#DCE4E6', // borders
  lineSoft: '#EAF0F1', // row dividers
  hover: '#F6F9F9', // hover tint for rows and interactive surfaces

  // Brand — surgical teal
  primary: '#0B6E6E',
  primaryHover: '#085959',
  primaryPressed: '#064848',
  primarySoft: '#E4F2F1',
  primaryLine: '#B9DCD9',

  // Semantic
  success: '#1E7F55',
  successSoft: '#E5F4EC',
  warning: '#A85A0B',
  warningSoft: '#FCF0E1',
  error: '#C03A2B',
  errorSoft: '#FBEAE7',
  info: '#2C5F9E',
  infoSoft: '#E8EFF8',
  neutral: '#5B6B78',
  neutralSoft: '#EEF2F4',
} as const;

export const darkColor = {
  ink: '#E7EEF1',
  inkSoft: '#C3CFD6',
  muted: '#9AAAB5',
  subtle: '#738591',
  canvas: '#0D161E',
  surface: '#131F29',
  surfaceSunken: '#172532',
  line: '#24343F',
  lineSoft: '#1C2B36',
  primary: '#4FB3AE',
  primaryHover: '#6CC4BF',
  primaryPressed: '#3E9D98',
  primarySoft: 'rgba(79, 179, 174, 0.14)',
  primaryLine: 'rgba(79, 179, 174, 0.35)',
} as const;

export const radius = {
  control: 6, // inputs, buttons, chips
  panel: 10, // cards, tables
  dialog: 14, // dialogs, sheets
  pill: 999,
} as const;

export const elevation = {
  // Panels sit flat on the canvas; only overlays float.
  overlay: '0 12px 32px -8px rgba(19, 33, 47, 0.18), 0 2px 6px rgba(19, 33, 47, 0.06)',
  menu: '0 8px 24px -6px rgba(19, 33, 47, 0.16), 0 1px 3px rgba(19, 33, 47, 0.06)',
  focus: `0 0 0 3px rgba(11, 110, 110, 0.28)`,
} as const;

export const font = {
  family: "'Public Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
} as const;

export const motion = {
  fast: '120ms',
  base: '180ms',
  ease: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

/* ------------------------------------------------------------------ */
/* Status semantics — one map for every lifecycle enum in the product. */
/* ------------------------------------------------------------------ */

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

export const toneColors: Record<Tone, { fg: string; bg: string }> = {
  success: { fg: color.success, bg: color.successSoft },
  warning: { fg: color.warning, bg: color.warningSoft },
  error: { fg: color.error, bg: color.errorSoft },
  info: { fg: color.info, bg: color.infoSoft },
  neutral: { fg: color.neutral, bg: color.neutralSoft },
  primary: { fg: color.primary, bg: color.primarySoft },
};

/** Maps any backend status value to a tone and a human label. */
const STATUS: Record<string, { tone: Tone; label: string }> = {
  // Generic / accounts / catalogue
  ACTIVE: { tone: 'success', label: 'Active' },
  INACTIVE: { tone: 'neutral', label: 'Inactive' },
  SUSPENDED: { tone: 'error', label: 'Suspended' },
  PAUSED: { tone: 'warning', label: 'Paused' },
  DEACTIVATED: { tone: 'neutral', label: 'Deactivated' },
  ON_LEAVE: { tone: 'warning', label: 'On leave' },

  // Appointments
  REQUESTED: { tone: 'neutral', label: 'Requested' },
  CONFIRMED: { tone: 'info', label: 'Confirmed' },
  IN_PROGRESS: { tone: 'warning', label: 'In progress' },
  COMPLETED: { tone: 'success', label: 'Completed' },
  CANCELLED: { tone: 'neutral', label: 'Cancelled' },
  NO_SHOW: { tone: 'error', label: 'No-show' },

  // Pharmacy orders
  PLACED: { tone: 'neutral', label: 'Placed' },
  PACKED: { tone: 'info', label: 'Packed' },
  OUT_FOR_DELIVERY: { tone: 'warning', label: 'Out for delivery' },
  DELIVERED: { tone: 'success', label: 'Delivered' },

  // Lab bookings
  BOOKED: { tone: 'neutral', label: 'Booked' },
  SAMPLE_COLLECTED: { tone: 'info', label: 'Sample collected' },
  PROCESSING: { tone: 'warning', label: 'Processing' },
  REPORT_READY: { tone: 'success', label: 'Report ready' },

  // Cases
  OPEN: { tone: 'warning', label: 'Open' },
  ASSIGNED: { tone: 'info', label: 'Assigned' },
  RESOLVED: { tone: 'success', label: 'Resolved' },

  // Payments
  PENDING: { tone: 'warning', label: 'Pending' },
  PAID: { tone: 'success', label: 'Paid' },
  FAILED: { tone: 'error', label: 'Failed' },
  REFUNDED: { tone: 'neutral', label: 'Refunded' },

  // Audit
  SUCCESS: { tone: 'success', label: 'Success' },
  FAILURE: { tone: 'error', label: 'Failure' },
};

export function statusMeta(value?: string | null): { tone: Tone; label: string } {
  if (!value) return { tone: 'neutral', label: '—' };
  return STATUS[value] ?? { tone: 'neutral', label: humanize(value) };
}

const ACRONYMS = new Set(['SOS', 'OTC', 'IP', 'ID', 'API', 'OTP', 'CM', 'URL']);

/** "OUT_FOR_DELIVERY" → "Out for delivery"; "SOS_BUTTON" → "SOS button". */
export function humanize(value?: string | null): string {
  if (!value) return '';
  const words = value.split(/[_\s]+/).filter(Boolean).map((w, i) => {
    if (ACRONYMS.has(w.toUpperCase())) return w.toUpperCase();
    const lower = w.toLowerCase();
    return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
  });
  return words.join(' ');
}

export const PRIORITY: Record<string, { tone: Tone; label: string }> = {
  P1: { tone: 'error', label: 'Emergency' },
  P2: { tone: 'warning', label: 'Urgent' },
  P3: { tone: 'info', label: 'Routine' },
};

/** plural(1, 'order') → "1 order"; plural(3, 'order') → "3 orders". */
export function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n} ${n === 1 ? singular : pluralForm ?? `${singular}s`}`;
}

/** Indian-rupee formatting with no decimals for whole amounts. */
export function formatINR(n?: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
}

export function formatDateTime(v?: string | Date | null): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function formatDate(v?: string | Date | null): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}
