import { MD3LightTheme } from 'react-native-paper';

/**
 * PRANOVA field-operations palette. The primary colour is administrator-configured
 * (console -> Settings -> Primary colour) and arrives at runtime from `GET /cm/config`,
 * so everything here is derived from it rather than hard-coded per screen.
 *
 * Ported from `patient-app/src/theme.ts` on purpose: the two mobile clients must
 * stay structurally identical. Keep them in sync rather than diverging.
 */
export const BRAND_FALLBACK = '#0f766e';

/** Neutral scale and semantic colours that do not change with branding. */
export const palette = {
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  subtle: '#94a3b8',
  line: '#e2e8f0',
  hairline: '#f1f5f9',
  canvas: '#f8fafc',
  surface: '#ffffff',
  success: '#059669',
  successSoft: '#ecfdf5',
  warning: '#d97706',
  warningSoft: '#fffbeb',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  info: '#0284c7',
  infoSoft: '#eff6ff',
};

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Expands #abc, tolerates a missing #, and rejects anything else. */
export function normalizeHex(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!HEX.test(raw)) return null;
  const hex = raw.startsWith('#') ? raw.slice(1) : raw;
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  return `#${full.toLowerCase()}`;
}

function channels(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** WCAG relative luminance, used to decide what can sit on top of a colour. */
export function luminance(hex: string): number {
  const srgb = channels(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/** Black or white, whichever stays readable on the given background. */
export function onColor(hex: string): string {
  return luminance(hex) > 0.5 ? palette.ink : '#ffffff';
}

/** Mixes a colour toward white — used for soft chip and badge backgrounds. */
export function tint(hex: string, amount = 0.9): string {
  const [r, g, b] = channels(hex);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * A brand colour an admin can actually set to anything — including white —
 * still has to produce a usable button. If the configured colour has too
 * little contrast against the surface to read as an action, it is darkened
 * for interactive surfaces while staying recognisably the same hue.
 */
export function usableBrand(input?: string | null): string {
  const hex = normalizeHex(input) ?? BRAND_FALLBACK;
  if (luminance(hex) < 0.75) return hex;
  const [r, g, b] = channels(hex);
  const darken = (c: number) => Math.round(c * 0.45);
  return `#${[darken(r), darken(g), darken(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export type AppTheme = ReturnType<typeof buildTheme>;

export function buildTheme(brandInput?: string | null) {
  const primary = usableBrand(brandInput);
  return {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary,
      onPrimary: onColor(primary),
      primaryContainer: tint(primary, 0.88),
      onPrimaryContainer: palette.ink,
      secondary: palette.info,
      tertiary: palette.success,
      error: palette.danger,
      background: palette.canvas,
      surface: palette.surface,
      outline: palette.line,
      outlineVariant: palette.hairline,
    },
  };
}

/** Default theme for the first frame, before the API answers. */
export const theme = buildTheme(BRAND_FALLBACK);

/** CaseStatus -> colour. Terminal states read as settled, not alarming. */
export const CASE_STATUS_COLORS: Record<string, string> = {
  OPEN: palette.muted,
  ASSIGNED: palette.info,
  IN_PROGRESS: palette.warning,
  RESOLVED: palette.success,
  CANCELLED: palette.danger,
};

/** CasePriority -> colour. P1 is the emergency red and never re-themed. */
export const PRIORITY_COLORS: Record<string, string> = {
  P1: '#dc2626',
  P2: palette.warning,
  P3: palette.info,
};

export const PRIORITY_LABELS: Record<string, string> = {
  P1: 'P1 · Emergency',
  P2: 'P2 · Urgent',
  P3: 'P3 · Routine',
};

/** Turns ASSIGNED / SOS_BUTTON into "Assigned" / "Sos button". */
export function humanize(value?: string | null): string {
  if (!value) return '';
  const spaced = value.replace(/_/g, ' ').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** One place that formats timestamps, so no screen invents its own. */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Short "4m ago" / "2h ago" stamp for the case list and timeline. */
export function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}
