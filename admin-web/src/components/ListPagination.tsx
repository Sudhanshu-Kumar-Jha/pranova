import React from 'react';
import { Pagination } from 'react-admin';

/**
 * Shared list pagination with consistent page-size options across every
 * resource. React-Admin disables the "next" control automatically when the
 * server-reported `total` (from our ApiResponse `meta.total`) is reached.
 */
export const ListPagination: React.FC = (props) => (
  <Pagination rowsPerPageOptions={[10, 25, 50, 100]} {...props} />
);

export default ListPagination;
