import { BasePaginationQuery } from '../types/query.types.js';

/**
 * Server-side pagination & sort guards.
 *
 * These keep each request cheap and bounded so the API stays responsive when
 * many Patient-app and Admin clients query concurrently against the single
 * embedded database connection:
 *  - `perPage` is clamped to [1, MAX_PER_PAGE] (never load a whole table)
 *  - `page` is coerced to a safe positive integer
 *  - `sort` is validated against an allow-list (an arbitrary/invalid column
 *    would otherwise throw at the DB layer and waste a connection)
 */
export const MAX_PER_PAGE = 100;
export const DEFAULT_PER_PAGE = 10;

export interface Pagination {
  page: number;
  perPage: number;
  skip: number;
  take: number;
}

export function getPagination(query: BasePaginationQuery, defaultPerPage = DEFAULT_PER_PAGE): Pagination {
  const parsedPage = parseInt(String(query.page ?? '1'), 10);
  const parsedPerPage = parseInt(String(query.perPage ?? defaultPerPage), 10);

  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const rawPerPage = Number.isFinite(parsedPerPage) && parsedPerPage > 0 ? parsedPerPage : defaultPerPage;
  const perPage = Math.min(MAX_PER_PAGE, rawPerPage);

  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

export function getSort(
  query: BasePaginationQuery,
  allowedFields: string[],
  defaultField: string,
  defaultOrder: 'asc' | 'desc' = 'desc'
): { field: string; order: 'asc' | 'desc' } {
  const requested = typeof query.sort === 'string' ? query.sort : undefined;
  const field = requested && allowedFields.includes(requested) ? requested : defaultField;
  const order = String(query.order ?? defaultOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';
  return { field, order };
}
