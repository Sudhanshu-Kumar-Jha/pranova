import React from 'react';
import { Box, Typography } from '@mui/material';
import { CreateButton, useResourceDefinition } from 'react-admin';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { color } from '../design/tokens.js';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

/** A calm, directive empty state: what this is, why it's empty, what to do next. */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, compact }) => (
  <Box
    role="status"
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      py: compact ? 4 : 8,
      px: 3,
      gap: 1,
    }}
  >
    <Box
      aria-hidden
      sx={{
        width: 44,
        height: 44,
        borderRadius: '10px',
        display: 'grid',
        placeItems: 'center',
        bgcolor: color.primarySoft,
        color: color.primary,
        mb: 0.5,
        '& svg': { fontSize: 22 },
      }}
    >
      {icon ?? <InboxOutlinedIcon />}
    </Box>
    <Typography variant="subtitle1" component="h2">{title}</Typography>
    {description && (
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        {description}
      </Typography>
    )}
    {action && <Box sx={{ mt: 1.5 }}>{action}</Box>}
  </Box>
);

/**
 * Drop-in `empty` element for React-Admin <List>. Shows a create action only
 * when the resource actually has a create view.
 */
export const ListEmpty: React.FC<{ title: string; description: string; icon?: React.ReactNode }> = ({ title, description, icon }) => {
  const def = useResourceDefinition();
  return (
    <Box sx={{ border: `1px solid ${color.line}`, borderRadius: '10px', bgcolor: 'background.paper', mt: 1 }}>
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        action={def.hasCreate ? <CreateButton variant="contained" /> : undefined}
      />
    </Box>
  );
};

export default EmptyState;
