/**
 * Pagination utility functions
 * Provides unified pagination handling and response formatting
 */

/**
 * Pagination query parameters interface
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

/**
 * Pagination response interface
 */
export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Create pagination response
 */
export function createPaginationResponse<T>(
  data: T[],
  total: number,
  page: number = 1,
  limit: number = 20
): PaginationResponse<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  total: number,
  page: number = 1,
  limit: number = 20
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Calculate offset
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  page?: number,
  limit?: number,
  maxLimit: number = 100
): { page: number; limit: number; errors: string[] } {
  const errors: string[] = [];
  let validPage = page || 1;
  let validLimit = limit || 20;

  // Validate page number
  if (validPage < 1) {
    errors.push('Page must be greater than 0');
    validPage = 1;
  }

  // Validate limit
  if (validLimit < 1) {
    errors.push('Limit must be greater than 0');
    validLimit = 20;
  }

  if (validLimit > maxLimit) {
    errors.push(`Limit cannot exceed ${maxLimit}`);
    validLimit = maxLimit;
  }

  return {
    page: validPage,
    limit: validLimit,
    errors,
  };
}

/**
 * Generate pagination links
 */
export interface PaginationLinks {
  first?: string;
  prev?: string;
  next?: string;
  last?: string;
}

export function generatePaginationLinks(
  baseUrl: string,
  meta: PaginationMeta,
  queryParams: Record<string, any> = {}
): PaginationLinks {
  const links: PaginationLinks = {};
  
  const buildUrl = (page: number): string => {
    const params = new URLSearchParams({
      ...queryParams,
      page: page.toString(),
      limit: meta.limit.toString(),
    });
    return `${baseUrl}?${params.toString()}`;
  };

  // First page link
  if (meta.page > 1) {
    links.first = buildUrl(1);
  }

  // Previous page link
  if (meta.hasPrev) {
    links.prev = buildUrl(meta.page - 1);
  }

  // Next page link
  if (meta.hasNext) {
    links.next = buildUrl(meta.page + 1);
  }

  // Last page link
  if (meta.page < meta.totalPages) {
    links.last = buildUrl(meta.totalPages);
  }

  return links;
}

/**
 * Array pagination utility
 */
export function paginateArray<T>(
  array: T[],
  page: number = 1,
  limit: number = 20
): PaginationResponse<T> {
  const offset = calculateOffset(page, limit);
  const data = array.slice(offset, offset + limit);
  
  return createPaginationResponse(data, array.length, page, limit);
}

/**
 * Pagination statistics
 */
export interface PaginationStats {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  startItem: number;
  endItem: number;
  itemsOnCurrentPage: number;
}

export function getPaginationStats(
  total: number,
  page: number,
  limit: number,
  actualItemCount?: number
): PaginationStats {
  const totalPages = Math.ceil(total / limit);
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);
  const itemsOnCurrentPage = actualItemCount !== undefined ? actualItemCount : Math.max(0, endItem - startItem + 1);

  return {
    totalItems: total,
    totalPages,
    currentPage: page,
    itemsPerPage: limit,
    startItem,
    endItem,
    itemsOnCurrentPage,
  };
}

/**
 * Pagination default configuration
 */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;