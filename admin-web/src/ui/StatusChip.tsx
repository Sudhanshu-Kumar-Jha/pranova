import React from 'react';
import { Box } from '@mui/material';
import { statusMeta, toneColors, PRIORITY, Tone } from '../design/tokens.js';

interface ChipBaseProps {
  tone: Tone;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  pulse?: boolean;
  title?: string;
}

/** Soft-tinted status pill with a leading dot. Colour is never the only signal — the label carries meaning. */
export const ToneChip: React.FC<ChipBaseProps> = ({ tone, children, size = 'md', pulse = false, title }) => {
  const t = toneColors[tone];
  return (
    <Box
      component="span"
      title={title}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: size === 'sm' ? 0.875 : 1,
        height: size === 'sm' ? 22 : 24,
        borderRadius: '6px',
        bgcolor: t.bg,
        color: t.fg,
        fontSize: size === 'sm' ? '0.72rem' : '0.75rem',
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        component="span"
        aria-hidden
        className={pulse ? 'pulse-emergency' : undefined}
        sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: t.fg, flexShrink: 0 }}
      />
      {children}
    </Box>
  );
};

export const StatusChip: React.FC<{ value?: string | null; size?: 'sm' | 'md' }> = ({ value, size }) => {
  const m = statusMeta(value);
  return (
    <ToneChip tone={m.tone} size={size}>
      {m.label}
    </ToneChip>
  );
};

/** "P1 Emergency" with the code set apart typographically; P1 pulses. */
export const PriorityChip: React.FC<{ value?: string | null; size?: 'sm' | 'md' }> = ({ value, size }) => {
  if (!value) return null;
  const p = PRIORITY[value] ?? { tone: 'neutral' as Tone, label: value };
  return (
    <ToneChip tone={p.tone} size={size} pulse={value === 'P1'}>
      <Box component="span" sx={{ fontWeight: 700 }}>{value}</Box>
      <Box component="span" sx={{ fontWeight: 500, opacity: 0.9 }}>{p.label}</Box>
    </ToneChip>
  );
};

export default StatusChip;
