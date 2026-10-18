import React from 'react';
import {
  Datagrid, DatagridProps, SimpleList, SimpleListProps, useRecordContext, useResourceContext, useCreatePath,
} from 'react-admin';
import { IconButton, Tooltip, useMediaQuery, Theme, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

interface ResponsiveDatagridProps extends Omit<DatagridProps, 'children'> {
  /** Card-list rendering used below the md breakpoint. */
  mobile: SimpleListProps;
  children: React.ReactNode;
}

/**
 * Tables on desktop; a purpose-built card list on small screens instead of a
 * squeezed table. Bulk actions off by default (none of our resources use them).
 */
export const ResponsiveDatagrid: React.FC<ResponsiveDatagridProps> = ({ mobile, children, rowClick = 'show', ...rest }) => {
  const isSmall = useMediaQuery((t: Theme) => t.breakpoints.down('md'));
  if (isSmall) {
    return (
      <SimpleList
        linkType={typeof rowClick === 'string' ? (rowClick as 'show' | 'edit') : 'show'}
        rowSx={() => ({ borderBottom: '1px solid', borderColor: 'divider', py: 0.5 })}
        {...mobile}
      />
    );
  }
  return (
    <Datagrid rowClick={rowClick} bulkActionButtons={false} {...rest}>
      {children}
    </Datagrid>
  );
};

/** Icon-only edit action for table rows; doesn't trigger the row click. */
export const RowEditButton: React.FC = () => {
  const record = useRecordContext();
  const resource = useResourceContext();
  const createPath = useCreatePath();
  if (!record || !resource) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Tooltip title="Edit">
        <IconButton
          component={Link}
          to={createPath({ resource, type: 'edit', id: record.id })}
          aria-label="Edit"
          size="small"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default ResponsiveDatagrid;
