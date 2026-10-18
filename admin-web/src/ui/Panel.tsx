import React from 'react';
import { Box, Typography, Avatar, Skeleton } from '@mui/material';
import { color } from '../design/tokens.js';

/* ------------------------------------------------------------------ */
/* Panel — a flat bordered surface with an optional header row.         */
/* ------------------------------------------------------------------ */
interface PanelProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
  sx?: object;
  headingLevel?: 'h2' | 'h3';
}

export const Panel: React.FC<PanelProps> = ({ title, description, action, children, padded = true, sx, headingLevel = 'h2' }) => (
  <Box
    component="section"
    aria-label={title}
    sx={{
      bgcolor: 'background.paper',
      border: `1px solid ${color.line}`,
      borderRadius: '10px',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      ...sx,
    }}
  >
    {(title || action) && (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          px: 2.5,
          pt: 2,
          pb: padded ? 0.5 : 1.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {title && <Typography variant="subtitle1" component={headingLevel}>{title}</Typography>}
          {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{description}</Typography>}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>
    )}
    <Box sx={{ px: padded ? 2.5 : 0, pb: padded ? 2.5 : 0, pt: title && padded ? 1.5 : 0, flex: 1, minWidth: 0 }}>
      {children}
    </Box>
  </Box>
);

/* ------------------------------------------------------------------ */
/* PageHeader — title, one-line description, actions. For custom pages. */
/* ------------------------------------------------------------------ */
export const PageHeader: React.FC<{ title: string; description?: React.ReactNode; actions?: React.ReactNode }> = ({ title, description, actions }) => (
  <Box
    component="header"
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 2,
      mb: 3,
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="h4" component="h1">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 680 }}>
          {description}
        </Typography>
      )}
    </Box>
    {actions && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>}
  </Box>
);

/* ------------------------------------------------------------------ */
/* DetailHeader — record title + status + key facts + actions.          */
/* ------------------------------------------------------------------ */
interface DetailHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: React.ReactNode;
  avatar?: React.ReactNode;
  actions?: React.ReactNode;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({ title, subtitle, status, avatar, actions }) => (
  <Box
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 2,
      px: { xs: 2, sm: 3 },
      py: 2.5,
      borderBottom: `1px solid ${color.lineSoft}`,
    }}
  >
    {avatar}
    <Box sx={{ flex: '1 1 260px', minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
        <Typography variant="h5" component="h1" sx={{ wordBreak: 'break-word' }}>{title}</Typography>
        {status}
      </Box>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {actions && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>}
  </Box>
);

/* ------------------------------------------------------------------ */
/* InfoGrid / InfoItem — aligned label/value pairs for detail screens.  */
/* ------------------------------------------------------------------ */
export const InfoGrid: React.FC<{ children: React.ReactNode; columns?: number }> = ({ children, columns = 3 }) => (
  <Box
    component="dl"
    sx={{
      m: 0,
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: `repeat(${columns}, minmax(0, 1fr))` },
      columnGap: 3,
      rowGap: 2.25,
    }}
  >
    {children}
  </Box>
);

export const InfoItem: React.FC<{ label: string; children?: React.ReactNode; full?: boolean }> = ({ label, children, full }) => (
  <Box sx={{ minWidth: 0, gridColumn: full ? '1 / -1' : undefined }}>
    <Typography component="dt" variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 500, mb: 0.375 }}>
      {label}
    </Typography>
    <Typography component="dd" variant="body2" sx={{ m: 0, color: 'text.primary', wordBreak: 'break-word' }}>
      {children === undefined || children === null || children === '' ? <Box component="span" sx={{ color: 'text.disabled' }}>Not provided</Box> : children}
    </Typography>
  </Box>
);

/* ------------------------------------------------------------------ */
/* PersonCell — avatar + name + supporting line (tables, lists).        */
/* ------------------------------------------------------------------ */
export const PersonCell: React.FC<{ name: string; secondary?: React.ReactNode; src?: string | null; tone?: string }> = ({ name, secondary, src, tone }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
    <Avatar
      src={src ?? undefined}
      alt=""
      sx={{ width: 32, height: 32, bgcolor: tone ?? color.primarySoft, color: color.primary, fontSize: '0.8125rem' }}
    >
      {initials(name)}
    </Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.35 }} noWrap>
        {name}
      </Typography>
      {secondary && (
        <Typography variant="caption" color="text.secondary" component="div" noWrap>
          {secondary}
        </Typography>
      )}
    </Box>
  </Box>
);

export function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.replace(/^Dr\.?\s+/i, '').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/* ------------------------------------------------------------------ */
/* Skeleton helpers — reserve layout while data loads (no jumping).    */
/* ------------------------------------------------------------------ */
export const SkeletonLines: React.FC<{ rows?: number; height?: number }> = ({ rows = 4, height = 18 }) => (
  <Box aria-busy="true" aria-label="Loading" sx={{ display: 'grid', gap: 1.25 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} variant="rounded" height={height} width={`${100 - (i % 3) * 14}%`} />
    ))}
  </Box>
);

/** Joins supporting facts with a comma; skips empty parts. */
export function facts(...parts: Array<string | number | null | undefined | false>): string {
  return parts.filter((p) => p !== null && p !== undefined && p !== false && p !== '').join(', ');
}
