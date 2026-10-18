import React from 'react';
import { Box, Typography } from '@mui/material';
import { color } from '../design/tokens.js';

interface FormSectionProps {
  title: string;
  description?: string;
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
  first?: boolean;
}

/**
 * Groups related fields. Desktop: label column on the left, fields on the
 * right (a settings-style rhythm that keeps long forms scannable).
 * Mobile: stacked. Fields share one baseline via a CSS grid.
 */
export const FormSection: React.FC<FormSectionProps> = ({ title, description, columns = 2, children, first }) => (
  <Box
    component="section"
    aria-label={title}
    className="pnv-form-section"
    sx={{
      width: '100%',
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '240px minmax(0, 1fr)' },
      columnGap: 4,
      rowGap: 1.5,
      py: 3,
      borderTop: first ? 'none' : `1px solid ${color.lineSoft}`,
    }}
  >
    <Box>
      <Typography variant="subtitle1" component="h2">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 260 }}>
          {description}
        </Typography>
      )}
    </Box>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: `repeat(${columns}, minmax(0, 1fr))` },
        columnGap: 2,
        rowGap: 2,
        alignItems: 'start',
        maxWidth: 760,
      }}
    >
      {children}
    </Box>
  </Box>
);

/** Spans the full width of a FormSection grid. */
export const FullWidth: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ gridColumn: '1 / -1' }}>{children}</Box>
);

/** Heading row shown at the top of a create/edit form. */
export const FormIntro: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
  <Box sx={{ width: '100%', pb: 1 }}>
    <Typography variant="h5" component="h1">{title}</Typography>
    {description && (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
        {description}
      </Typography>
    )}
  </Box>
);

export default FormSection;
